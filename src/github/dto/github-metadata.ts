import { IsInt, Min } from 'class-validator';

export class GithubMetadataDTO {
  
  @IsString()
  resource: string;

  @IsInt()
  @Min(0)
  count: number;
}
