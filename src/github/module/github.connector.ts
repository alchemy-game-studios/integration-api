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
const parse = require('parse-link-header');

@Injectable()
export class GithubConnector {
  readonly basePath: string = 'https://api.github.com';

  readonly badGitHubResultException = new UnprocessableEntityException('Github api returned invalid result.');
  readonly tooManyRetriesException = new NotAcceptableException('Exceeded too many retries for Github rate limit.');

  readonly resultsPerPage: number = 100;
  readonly retryLimit: number = 5;
  readonly githubRateLimitResponses: number[] = [403, 429];

  // 1 second recommended by Github to avoid rate limit.
  // Practically we can have no delay for this use case and rely on rate limit handling.
  readonly secondsBetweenRequests: number = 0;

  /*
   * Gets a single page of results.
   */
  async getPage(url: string, pageNumber: number, params: any): Promise<GithubResultDTO> {
    params.page = pageNumber;
    params.per_page = this.resultsPerPage;

    return await this.getGithubResultsFromUrl(url, params);
  }

  /*
   * Gets multiple pages of results.
   */
  async getPages(url: string, startPage: number, endPage: number, params: any): Promise<any> {
    // Make the rest of the calls and wait for all of them to return
    params.per_page = this.resultsPerPage;

    return await Promise.all(this.callConcurrent(url, startPage, endPage, params));
  }

  /*
   * Make concurrent calls for a range of pages. The calls will be spaced by `this.secondsBetweenRequests`.
   * Returns an array of promises to wait for.
   */
  callConcurrent(url: string, startPage: number, lastPage: number, pageParams: any): Promise<any>[] {
    const promises: Promise<any>[] = [];
    let waitTime = 0;

    for (let i = startPage; i <= lastPage; i++) {
      // Collect result promises to wait for all of them
      promises.push(
        new Promise<any>(async (resolve, reject) => {
          setTimeout(() => {
            pageParams.page = i;

            this.getGithubResultsFromUrl(url, pageParams).then(resolve).catch(reject);
          }, waitTime);
        })
      );
      waitTime += this.secondsBetweenRequests * 1000;
    }
    return promises;
  }

  /*
   * Make a call to Github, check for errors, wrap results, and account for retries.
   */
  async getGithubResultsFromUrl(url: string, params: any = null): Promise<GithubResultDTO> {
    const githubResult: GithubResultDTO = new GithubResultDTO();

    const result = await this.callWithRetries(async () => {
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

    const config: any = {
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
   * Make an aribrary Github API call, and check response headers to see if the call failed and can be recovered via retry.
   * Retry up to ${retryLimit} times, waiting the given amount of time from the Github API. Resolve the promise
   * when we receive a valid result, otherwise reject with an error if retries is exceeded.
   */
  async callWithRetries(toCall: () => Promise<any>, retries: number = 0): Promise<any> {
    let result: any;

    return new Promise(async (resolve, reject) => {
      if (retries > this.retryLimit) {
        reject(this.tooManyRetriesException);
      }

      // Make API Call
      try {
        result = await toCall();
      } catch (e) {
        reject(e);
      }

      if (!result) {
        reject(this.badGitHubResultException);

        // Check for rate limit and perform retries if needed
      } else if (this.githubRateLimitResponses.includes(result.status)) {
        console.warn('Github rate limited response received.');

        const retrySeconds: number = parseInt(result.headers['retry-after']);
        if (isNaN(retrySeconds)) {
          reject(this.badGitHubResultException);
        }

        this.retryCall(toCall, retrySeconds, retries, resolve, reject);
      } else {
        // If no retries needed, return the result.
        resolve(result);
      }
    });
  }

  /*
   * Helper for retrying calls that failed and could be recovered.
   */
  retryCall(toCall, retrySeconds, currentRetries, resolve, reject) {
    const retryAfterMillis: number = Math.max(retrySeconds, this.secondsBetweenRequests) * 1000;

    console.warn(`Retrying after ${retrySeconds} seconds.`);

    setTimeout(async () => {
      try {
        const result = await this.callWithRetries(toCall, currentRetries + 1);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, retryAfterMillis);
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
