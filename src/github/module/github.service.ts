import { Injectable } from '@nestjs/common';
import { GithubMetadataDTO } from '../dto/github-metadata-dto';
import { GithubResultDTO } from '../dto/github-result-dto';
import { GithubConnectorPullRequests } from './github.connector.pull-requests';

@Injectable()
export class GithubService {
  constructor(private readonly githubConnector: GithubConnectorPullRequests) {}

  async getGithubPullRequestCount(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    return await this.githubConnector.getPullRequestCountFromMetadata(githubMetadataDto);
  }

  async getGithubPullRequestCountFromSearch(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    return await this.githubConnector.getPullRequestCountFromSearch(githubMetadataDto);
  }

  async getGithubPullRequestCountConcurrent(githubMetadataDto: GithubMetadataDTO): Promise<GithubResultDTO> {
    return await this.githubConnector.getPullRequestCountConcurrent(githubMetadataDto);
  }
}
