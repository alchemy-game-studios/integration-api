import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubMetadataDTO } from '../dto/github-metadata-dto';
import { GithubResultDTO } from '../dto/github-result-dto';
import { validate, ValidationError } from 'class-validator';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('pull-requests/count/')
  async getPullRequestCount(@Query() params: any): Promise<GithubResultDTO> {
    const metadataDto: GithubMetadataDTO = new GithubMetadataDTO(params);

    await this.validateInput(metadataDto);

    return await this.githubService.getGithubPullRequestCount(metadataDto);
  }

  @Get('pull-requests/count/search')
  async getPullRequestCountFromSearch(@Query() params: any): Promise<GithubResultDTO> {
    const metadataDto: GithubMetadataDTO = new GithubMetadataDTO(params);

    await this.validateInput(metadataDto);

    return await this.githubService.getGithubPullRequestCountFromSearch(metadataDto);
  }

  @Get('pull-requests/count/concurrent')
  async getPullRequestCountConcurrent(@Query() params: any): Promise<GithubResultDTO> {
    const metadataDto: GithubMetadataDTO = new GithubMetadataDTO(params);

    await this.validateInput(metadataDto);

    return await this.githubService.getGithubPullRequestCountConcurrent(metadataDto);
  }

  async validateInput(input: any): Promise<void> {
    const errors: ValidationError[] = await validate(input);

    if (errors.length > 0) {
      let errorMessage: string = '';

      for (const error of errors) {
        errorMessage += error.toString();
      }

      throw new BadRequestException(errorMessage);
    }
  }
}
