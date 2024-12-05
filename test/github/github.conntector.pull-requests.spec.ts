import { Test, TestingModule } from '@nestjs/testing';
import { ExampleFactory } from './examples/example-factory';
import { GithubController } from 'src/github/module/github.controller';
import { GithubService } from 'src/github/module/github.service';
import { GithubConnector } from 'src/github/module/github.connector';
import { HttpStatusCode } from 'axios';
import { GithubMetadataDTO } from 'src/github/dto/github-metadata-dto';
import { GithubConnectorPullRequests } from 'src/github/module/github.connector.pull-requests';

describe('GithubConnector', () => {
  let githubConnector: GithubConnector;
  let githubConnectorPullRequests: GithubConnectorPullRequests;
  let exampleFactory: ExampleFactory;
  let githubMetadataDto: GithubMetadataDTO;

  const mockApiCallResponse = (resolveValue: any) => {
    githubConnector.makeGithubCall = jest.fn().mockResolvedValue(resolveValue);
  };

  const mockApiCallResponses = (resolveValues: any[]) => {
    let mockFunction: jest.Mock = jest.fn();

    for (const resolveValue of resolveValues) {
      mockFunction = mockFunction.mockResolvedValueOnce(resolveValue);
    }

    githubConnector.makeGithubCall = mockFunction;
  };

  const mockApiRateLimit = (resolveValues: any[], numRateLimits: number = 1) => {
    let mockFunction: jest.Mock = jest.fn();

    for (let i = 0; i < numRateLimits; i++) {
      mockFunction.mockImplementationOnce(() => {
        return {
          status: 403,
          headers: {
            'retry-after': '0',
          },
        };
      });
    }

    for (const resolveValue of resolveValues) {
      mockFunction = mockFunction.mockResolvedValueOnce(resolveValue);
    }

    githubConnector.makeGithubCall = mockFunction;
  };

  const numResults: number = 15;
  const numResultsPerPage: number = 15;
  const numPages: number = 15;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [GithubService, GithubConnector, GithubConnectorPullRequests],
    }).compile();

    githubConnector = moduleFixture.get(GithubConnector);
    githubConnectorPullRequests = moduleFixture.get(GithubConnectorPullRequests);
    exampleFactory = new ExampleFactory();
    githubMetadataDto = new GithubMetadataDTO({ owner: 'foo', repo: 'bar' });
  });

  describe('pull request counts - derived', () => {
    it('should return a correct response', async () => {
      const expectedCount = 20;

      const mockReturn = exampleFactory.githubDerivedResult(expectedCount);

      mockApiCallResponse(mockReturn);

      const result = await githubConnectorPullRequests.getPullRequestCountFromMetadata(githubMetadataDto);
      expect(result.count).toBe(expectedCount);
    });
  });

  describe('pull request counts - search', () => {
    it('should return a correct response', async () => {
      const expectedCount = 20;

      const mockReturn = exampleFactory.githubSearchResult(expectedCount);

      mockApiCallResponse(mockReturn);

      const result = await githubConnectorPullRequests.getPullRequestCountFromSearch(githubMetadataDto);
      expect(result.count).toBe(expectedCount);
    });
  });

  describe('pull request counts - concurrent', () => {
    it('should return a non-paginated response', async () => {
      const mockReturn = exampleFactory.githubNonPaginatedResult(HttpStatusCode.Ok, numResults);

      mockApiCallResponse(mockReturn);

      const result = await githubConnectorPullRequests.getPullRequestCountConcurrent(githubMetadataDto);
      expect(result.count).toBe(numResults);
    });

    it(`should return a paginated response`, async () => {
      const mockReturns = exampleFactory.githubPaginatedResultSet(numPages, numResultsPerPage);

      mockApiCallResponses(mockReturns);

      const result = await githubConnectorPullRequests.getPullRequestCountConcurrent(githubMetadataDto);
      expect(result.count).toBe(numResultsPerPage * numPages);
    });

    it(`should return a rate limted response`, async () => {
      const mockReturns = exampleFactory.githubPaginatedResultSet(numPages, numResultsPerPage);

      mockApiRateLimit(mockReturns, githubConnector.retryLimit);

      const result = await githubConnectorPullRequests.getPullRequestCountConcurrent(githubMetadataDto);
      expect(result.count).toBe(numResultsPerPage * numPages);
    });

    it(`should error if it exceeds retries`, async () => {
      const mockReturns = exampleFactory.githubPaginatedResultSet(numPages, numResultsPerPage);

      mockApiRateLimit(mockReturns, githubConnector.retryLimit + 1);

      try {
        await githubConnectorPullRequests.getPullRequestCountConcurrent(githubMetadataDto);
        fail();
      } catch (e: any) {
        expect(e).toBeDefined();
      }
    });
  });
});
