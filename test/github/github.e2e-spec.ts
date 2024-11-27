import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ExampleFactory } from './examples/example-factory';

describe('GithubController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GithubModule],
      providers: [],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: true,
      })
    );

    await app.init();
  });

  describe('/github/pull-request/count (GET)', () => {
    it('should return a 200', async () => {
      
    });

    it(`should return a 500 if Github connection fails`, async () => {
     
  });

});
