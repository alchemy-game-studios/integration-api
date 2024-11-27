import { Module, MiddlewareConsumer } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { ConfigModule } from '@nestjs/config';
import { GithubConnector } from './github.connector';
import { middleware } from 'express-openapi-validator';

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
  ],
  controllers: [GithubController],
  providers: [GithubService, GithubConnector],
})
export class GithubModule {
  // Adds a middleware for validating the OpenAPI spec.
  configure(consumer: MiddlewareConsumer) {
    middleware({
      apiSpec: `api.yml`,
      validateRequests: true,
      validateResponses: false,
    }).forEach((value) => consumer.apply(value).forRoutes(GithubController));
  }
}
