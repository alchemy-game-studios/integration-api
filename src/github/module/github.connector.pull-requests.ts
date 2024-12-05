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
  readonly defaultPullRequestState: string = 'all';
  readonly useCache: boolean = true;

  // Simple cache. Use external service like Redis with eviction strategy.
  cacheRecords: any = [];

  /*
   * Concurrent calls are not recommended by Github, but we can call pages with delay to avoid waiting.
   */
  async getPullRequestCountConcurrent(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const cacheRecord = this.getCacheRecord(githubMetadataDto);

    const url: string = this.githubConnector.fullPath(githubMetadataDto, this.pullRequestPath);
    const baseParams: any = {
      state: this.defaultPullRequestState,
    };

    let startPage: number = 1;
    let finalResults: GithubResultDTO;
    let count = 0;
    // Store all page results here.
    let callResults: any[] = [];

    // Update cursor if we have a cached version to minimize calls
    if (this.useCache && cacheRecord?.lastPage > 0) {
      startPage = cacheRecord.lastPage;
      // Reset count to not include the last page to ensure we update the count correctly later.
      count = cacheRecord.recordCount - cacheRecord.numRecordsInPage;
    }

    // Get first API result to get current state information
    let firstResults: GithubResultDTO = await this.githubConnector.getPage(url, startPage, baseParams);

    // If cache is current, return cached results
    if (this.useCache && cacheRecord) {
       // Link rels are not always present, so check multiple places to get the number of pages
      const numPages = firstResults.links.last
      ? parseInt(firstResults.links.last.page)
      : parseInt(firstResults.links.prev.page) + 1;

      if (this.cacheCheck(firstResults, numPages, cacheRecord)) {
        console.log('Cached result was returned.');
        finalResults = new GithubResultDTO();
        finalResults.count = cacheRecord?.recordCount;

        return finalResults;

      // If there are less pages in current state vs the cache, 
      // we need to reset cursor and pull the first page because some pages were deleted since last time.
      } else if (cacheRecord.lastPage > numPages) {
        startPage = 1;
        firstResults = await this.githubConnector.getPage(url, startPage, baseParams);
      }
    }

    // We can get all the remaining pages in a controlled async way.
    callResults.push(firstResults);
    
    const startConcurrentPage: number = startPage + 1;
    const lastPage: number = parseInt(firstResults?.links?.last?.page);

    if (!isNaN(lastPage) && lastPage !== startPage) {
      const concurrentResults = await this.githubConnector.getPages(url, startConcurrentPage, lastPage, baseParams);
      callResults = callResults.concat(concurrentResults);
    }

    finalResults = this.getGithubCountResult(callResults);
    finalResults.count += count;

    if (this.useCache) {
      this.updateCache(githubMetadataDto, callResults, finalResults.count);
    }

    return finalResults;
  }

  /*
   * We can derive the count of Pull Requests by looking at the `links.last` result from Github, with 1 item
   * per page, and `links.last.page` is the count we're looking for.
   */
  async getPullRequestCountFromMetadata(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const url: string = this.githubConnector.fullPath(githubMetadataDto, this.pullRequestPath);

    const pullRequestParams: any = {
      state: this.defaultPullRequestState,
      per_page: 1,
      page: 1,
    };

    const pageResult = await this.githubConnector.getGithubResultsFromUrl(url, pullRequestParams);
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
    const pullRequestSearchQuery = `?q=repo:${githubMetadataDto.owner}/${githubMetadataDto.repo}+is:pull-request`;

    const searchResult = await this.githubConnector.getGithubResultsFromUrl(
      this.githubConnector.searchPath('issues') + pullRequestSearchQuery
    );

    const countResult = new GithubResultDTO();
    countResult.count = searchResult?.result?.data?.total_count;

    return countResult;
  }

  /*
  * Check if we have a cache value that is current.
  */
  cacheCheck(firstResults: GithubResultDTO, numPages: number, cacheRecord: any): boolean {
    return this.useCache &&
    numPages == cacheRecord.lastPage &&
    firstResults.result.data.length == cacheRecord.numRecordsInPage;
  }

  /*
  * Update the cache values for the given Github metadata, or lazy-load if it is new. 
  */
  updateCache(githubMetadataDto: GithubMetadataDTO, finalResults: GithubResultDTO[], count: number) {
    // Record without a last link it the last page
    const lastPageReference = finalResults.find((x) => x.links.last);
    let cacheRecord = this.getCacheRecord(githubMetadataDto);

    if (!cacheRecord) {
      cacheRecord = {
        owner: githubMetadataDto.owner,
        repo: githubMetadataDto.repo,
        lastPage: -1,
        numRecordsInPage: -1,
        recordCount: -1,
      };

      this.cacheRecords.push(cacheRecord);
    }

    if (lastPageReference) {
      const prevPageNumber: number = parseInt(lastPageReference.links.last.page);

      if (!isNaN(prevPageNumber)) {
        cacheRecord.lastPage = prevPageNumber;
      }

      const lastPage = finalResults.find((x) => !x.links.last || x.links.last.pageNumber == x.links.last.page);

      cacheRecord.numRecordsInPage = lastPage.result.data.length;
      cacheRecord.recordCount = count;
    }
  }

  /*
  * Return the cache record for the associated Github metadata
  */
  getCacheRecord(githubMetadataDto: GithubMetadataDTO) {
    return this.cacheRecords.find((x) => x.owner == githubMetadataDto.owner && x.repo == githubMetadataDto.repo);
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
