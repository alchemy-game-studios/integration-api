import { Injectable } from '@nestjs/common';
import { GithubMetadataDTO } from '../dto/github-metadata-dto';
import { GithubConnector } from './github.connector';
import { GithubResultDTO } from '../dto/github-result-dto';

@Injectable()
export class GithubService {
  constructor(private readonly githubConnector: GithubConnector) {}

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
