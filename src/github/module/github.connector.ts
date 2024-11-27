import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import axios, { HttpStatusCode } from 'axios';
import { GithubMetadataDTO } from '../dto/github-metadata-dto';
import { GithubResultDTO } from '../dto/github-result-dto';
import { isEmpty } from 'class-validator';
var parse = require('parse-link-header');

@Injectable()
export class GithubConnector {
  readonly basePath: string = 'https://api.github.com';
  readonly pullRequestPath: string = 'pulls';

  readonly badGitHubResultException = new UnprocessableEntityException('Github api returned invalid result.');
  readonly tooManyRetriesException = new NotAcceptableException('Exceeded too many retries for Github rate limit.');

  readonly retryLimit: number = 5;
  readonly githubRateLimitResponses: number[] = [403, 429];
  readonly resultsPerPage: number = 100;

  // 1 second recommended by Github to avoid rate limit.
  // Practically we can have no delay for this use case and rely on rate limit handling.
  readonly secondsBetweenRequests: number = 0;

  /*
   * Concurrent calls are not recommended by Github, but we can call pages with delay to avoid waiting.
   *
   * We assume number of pages will not get overly large for the timeout function queue. If this assumption isn't correct,
   * we can add a call queue and only have X calls running at a time.
   */
  async getPullRequestCountConcurrent(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    const url: string = this.fullPath(githubMetadataDto, this.pullRequestPath);

    // Store all page results here
    let callResults: any[] = [];

    // Get first page to determine full number of pages
    let pullRequestParams: any = {
      state: 'all',
      per_page: this.resultsPerPage,
      page: 1,
    };
    let resultContainer: GithubResultDTO = await this.getGithubResultsFromUrl(url, pullRequestParams);
    callResults.push(resultContainer);

    // We can get all the remaining pages in a controlled async way.
    const startConcurrentPage: number = 2;
    const lastPage: number = parseInt(resultContainer?.links?.last?.page);

    if (!isNaN(lastPage) && lastPage !== 1) {
      // Make the rest of the calls and wait for all of them to return
      const concurrentResults = await Promise.all(this.callConcurrent(url, startConcurrentPage, lastPage));
      callResults = callResults.concat(concurrentResults);
    }

    return this.getGithubCountResult(callResults);
  }

  /*
   * Make concurrent calls for a range of pages. The calls will be spaced by `this.secondsBetweenRequests`.
   * Returns an array of promises to wait for.
   */
  callConcurrent(url: string, startPage: number, lastPage: number): Promise<any>[] {
    const promises: Promise<any>[] = [];
    let waitTime = 0;

    for (let i = startPage; i <= lastPage; i++) {
      waitTime += this.secondsBetweenRequests * 1000;

      // Collect result promises to wait for all of them
      promises.push(
        new Promise<any>(async (resolve, reject) => {
          setTimeout(() => {
            let pageParams: any = {
              state: 'all',
              per_page: this.resultsPerPage,
              page: i,
            };

            this.getGithubResultsFromUrl(url, pageParams).then(resolve).catch(reject);
          }, waitTime);
        })
      );
    }
    return promises;
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

  /*
   * We can derive the count of Pull Requests by looking at the `links.last` result from Github, with 1 item
   * per page, and `links.last.page` is the count we're looking for.
   */
  async getPullRequestCountFromMetadata(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    let pullRequestParams: any = {
      state: 'all',
      per_page: 1,
      page: 1,
    };

    const pageResult = await this.getGithubResultsFromUrl(
      this.fullPath(githubMetadataDto, this.pullRequestPath),
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
    const searchResult = await this.getGithubResultsFromUrl(
      this.searchPath('issues') + `?q=repo:${githubMetadataDto.owner}/${githubMetadataDto.repo}+is:pull-request`
    );

    const countResult = new GithubResultDTO();
    countResult.count = searchResult?.result?.data?.total_count;

    return countResult;
  }

  /*
   * Make a call to Github, check for errors, wrap results, and account for rate limiting.
   */
  async getGithubResultsFromUrl(url: string, params: any = null): Promise<GithubResultDTO> {
    const githubResult: GithubResultDTO = new GithubResultDTO();

    const result = await this.rateLimitedCallWithRetries(async () => {
      return await this.makeGithubCall(url, params);
    });

    if (result && result.status == HttpStatusCode.Ok) {
      // Process result
      githubResult.result = result;

      // Parse link headers for getting page info
      if (result.headers?.link) {
        githubResult.links = parse(result.headers.link);
      }

      return githubResult;
    } else {
      throw new UnprocessableEntityException('Github api returned invalid result.', result);
    }
  }

  /*
   * Perform an immediate call to the Github API.
   */
  async makeGithubCall(url: string, params: any = null): Promise<any> {
    console.log(`Making call to Github: ${url} ${JSON.stringify(params)}`);

    const token = process.env.GITHUB_API_KEY;

    if (isEmpty(token)) {
      throw new InternalServerErrorException('GITHUB_API_KEY not found in environment.');
    }

    let config: any = {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    };

    if (params) {
      config.params = params;
    }

    let result = null;

    try {
      result = await axios.get(url, config);
    } catch (e) {
      throw new BadRequestException(`Call to Github failed with status ${e.status}`);
    }

    return result;
  }

  /*
   * Make an aribrary Github API call, and check response headers to see if the call failed due to a rate limit.
   * Retry up to ${retryLimit} times, waiting the given amount of time from the Github API. Resolve the promise
   * when we receive a valid result, otherwise reject with an error if retries is exceeded.
   */
  async rateLimitedCallWithRetries(toCall: () => Promise<any>, retries: number = 0): Promise<any> {
    let result: any;

    return new Promise(async (resolve, reject) => {
      if (retries > this.retryLimit) {
        reject(this.tooManyRetriesException);
      }

      try {
        result = await toCall();
      } catch (e) {
        reject(e);
      }

      if (!result) {
        reject(this.badGitHubResultException);
      } else if (this.githubRateLimitResponses.includes(result.status)) {
        console.warn('Github rate limited response received.');

        let retrySeconds: number = parseInt(result.headers['retry-after']);

        if (isNaN(retrySeconds)) {
          reject(this.badGitHubResultException);
        }

        let retryAfterMillis: number = Math.max(retrySeconds, this.secondsBetweenRequests) * 1000;

        console.warn(`Retrying after ${retrySeconds} seconds.`);

        setTimeout(async () => {
          try {
            result = await this.rateLimitedCallWithRetries(toCall, retries + 1);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        }, retryAfterMillis);
      } else {
        resolve(result);
      }
    });
  }

  /*
   * Helper to create a valid Github API path
   */
  fullPath(githubMetadataDto: GithubMetadataDTO, path: string): string {
    return `${this.basePath}/repos/${githubMetadataDto.owner}/${githubMetadataDto.repo}/${path}`;
  }

  searchPath(searchPath: string): string {
    return `${this.basePath}/search/${searchPath}`;
  }
}
