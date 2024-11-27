import { IsDefined, IsInt, IsNotEmpty, IsString, Min, validate } from 'class-validator';

export class GithubMetadataDTO {
  @IsDefined()
  @IsString()
  owner: string;

  @IsDefined()
  @IsString()
  repo: string;

  constructor(params: any) {
    this.owner = params.owner;
    this.repo = params.repo;
  }
}
