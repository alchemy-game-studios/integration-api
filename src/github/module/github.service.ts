import { Injectable } from '@nestjs/common';
import { GithubMetadataDTO } from '../dto/github-metadata';
import { GithubConnector } from './github.connector';

@Injectable()
export class GithubService {
  constructor(
    private readonly githubConnector: GithubConnector,
  ) {}

  async getGithubPullRequestCount(githubMetadataDto: GithubMetadataDTO): Promise<GithubMetadataDTO> {
    return null;
  }
}
