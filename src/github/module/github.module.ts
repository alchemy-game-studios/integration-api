import { Module, MiddlewareConsumer } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { ConfigModule } from '@nestjs/config';
import { GithubConnector } from './github.connector';
import { HttpModule } from '@nestjs/axios';

/*
 * Defines a set of layers and dependencies that can be injected, as well
 * as configuration and middleware.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`env/.env.${process.env.NODE_ENV}`],
    }),
    HttpModule,
  ],
  controllers: [GithubController],
  providers: [GithubService, GithubConnector],
})
export class GithubModule {}
