import { NestFactory } from '@nestjs/core';
import { GithubModule } from './github/module/github.module';
import { ValidationPipe } from '@nestjs/common';

/*
 * The main function of the application to start and listen for traffic.
 * Pipes and filters are defined below for validation and exception handling.
 */
async function bootstrap() {
  const app = await NestFactory.create(GithubModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    })
  );

  await app.listen(process.env.APP_PORT);
}
bootstrap();
