import { Injectable } from '@nestjs/common';
import { GithubMetadataDTO } from '../dto/github-metadata-dto';
import { GithubResultDTO } from '../dto/github-result-dto';
import { GithubConnector } from './github.connector';

/*
 * Connector for Github Pull Request calls.
 */
@Injectable()
export class GithubConnectorPullRequests {
  constructor(private readonly githubConnector: GithubConnector) {}

  readonly pullRequestPath: string = 'pulls';
  readonly resultsPerPage: number = 100;

  /*
   * Concurrent calls are not recommended by Github, but we can call pages with delay to avoid waiting.
   *
   * We assume number of pages will not get overly large for the timeout function queue. If this assumption isn't correct,
   * we can add a call queue and only have X calls running at a time.
   */
  async getPullRequestCountConcurrent(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const url: string = this.githubConnector.fullPath(githubMetadataDto, this.pullRequestPath);
    const startPage: number = 1;

    // Store all page results here
    let callResults: any[] = [];

    // Get first page to determine full number of pages
    const resultContainer: GithubResultDTO = await this.getPage(url, startPage);
    callResults.push(resultContainer);

    // We can get all the remaining pages in a controlled async way.
    const startConcurrentPage: number = startPage + 1;
    const lastPage: number = parseInt(resultContainer?.links?.last?.page);

    if (!isNaN(lastPage) && lastPage !== startPage) {
      const concurrentResults = await this.getPages(url, startConcurrentPage, lastPage);
      callResults = callResults.concat(concurrentResults);
    }

    return this.getGithubCountResult(callResults);
  }


  /*
   * We can derive the count of Pull Requests by looking at the `links.last` result from Github, with 1 item
   * per page, and `links.last.page` is the count we're looking for.
   */
  async getPullRequestCountFromMetadata(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const pullRequestParams: any = {
      state: 'all',
      per_page: 1,
      page: 1,
    };

    const pageResult = await this.githubConnector.getGithubResultsFromUrl(
      this.githubConnector.fullPath(githubMetadataDto, this.pullRequestPath),
      pullRequestParams
    );

    const countResult = new GithubResultDTO();
    countResult.count = parseInt(pageResult.links?.last?.page);

    return countResult;
  }

  /*
   * We can get a count of pull requests using the Github search API. Some downsides to using this endpoint:
   * 1) The search api runs off of cached data, so it isn't the most current.
   * 2) The search api has a much stricter rate limit.
   * 3) Returns more data than we need.
   *
   * But we do get the result in one call.
   */
  async getPullRequestCountFromSearch(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const searchResult = await this.githubConnector.getGithubResultsFromUrl(
      this.githubConnector.searchPath('issues') +
        `?q=repo:${githubMetadataDto.owner}/${githubMetadataDto.repo}+is:pull-request`
    );

    const countResult = new GithubResultDTO();
    countResult.count = searchResult?.result?.data?.total_count;

    return countResult;
  }

  /*
   * Gets a single page of results.
   */
  async getPage(url: string, pageNumber: number): Promise<GithubResultDTO> {
    const pullRequestParams: any = {
      state: 'all',
      per_page: this.resultsPerPage,
      page: pageNumber,
    };

    return await this.githubConnector.getGithubResultsFromUrl(url, pullRequestParams);
  }

  /*
   * Gets multiple pages of results.
   */
  async getPages(url: string, startPage: number, endPage: number): Promise<any> {
    // Make the rest of the calls and wait for all of them to return
    const params = {
      state: 'all',
      per_page: this.resultsPerPage,
    };
    return await Promise.all(this.githubConnector.callConcurrent(url, startPage, endPage, params));
  }

  /*
   * Simple helper for creating the final count from page results.
   */
  getGithubCountResult(callResults: GithubResultDTO[]): GithubResultDTO {
    const resultContainer = new GithubResultDTO();
    let resultCount = 0;

    for (const promiseResult of callResults) {
      resultCount += promiseResult.result?.data?.length;
    }
    resultContainer.count = resultCount;

    return resultContainer;
  }
}
