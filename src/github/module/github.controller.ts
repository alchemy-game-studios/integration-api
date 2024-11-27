import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { GithubService } from './github.service';
import { Param, Body } from '@nestjs/common';
import { GithubMetadataDTO } from '../dto/github-metadata';


@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('pull-request/count/:url')
  async getPullRequestCount(@Param() githubMetadataDto: GithubMetadataDTO): Promise<GithubMetadataDTO> {
    return null;
  }

}
