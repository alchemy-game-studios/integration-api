# API Integration Service
A NestJS implementation if an API integration service. Provides a pass-through API for retreiving data from external APIs.

Currently supports
- Github pull requests counts from a given repository.

`/github/pull-requests/count?owner=${owner}&repo=${repo}`
Returns a count of pull requests for the given repository. Uses an efficient method using pagination metadata to derive the count.

```json
{
  count: 12345
}
```
Query parameters:
- owner: the owner of the repository | eg. lodash
- repo: the repository | eg. lodash

`/github/pull-requests/count/search?${owner}&${repo}`
Returns a count of pull requests for the given repository. Uses the Github search API to get the count.

```json
{
  count: 12345
}
```
Query parameters:
- owner: the owner of the repository | eg. lodash
- repo: the repository | eg. lodash


`/github/pull-requests/count/concurrent?${owner}&${repo}`
Returns a count of pull requests for the given repository. Uses a semi-concurrent paginated method to retreive the count.

```json
{
  count: 12345
}
```
Query parameters:
- owner: the owner of the repository | eg. lodash
- repo: the repository | eg. lodash


### API Call Examples

```bash
curl -X GET "http://localhost:3000/github/pull-requests/count?owner=lodash&repo=lodash" \
     -H "Accept: application/json"

curl -X GET "http://localhost:3000/github/pull-requests/count/concurrent?owner=lodash&repo=lodash" \
     -H "Accept: application/json"

```
# Summary of Application Features
- Simple NestJS implementation with dependency injection.
- Basic input validation.
- Multiple methods for retreiving the count from Github. See `github.connector.ts` for more information and implementations.
  - A slightly cheating method by deriving the value from the Github paging metadata after a single call.
  - Using the Github search API.
  - A semi-concurrent method that uses the paging metadata to call all page endpoints needed to get the count.
- Github API rate limit handling.
- Basic error handling.
- Dockerized environment.
- `npm run` helpers for local development and deployment.

# Run Application Locally
You can run this application locally in Docker, or directly on your machine using NestJS. There are `npm` scripts provided to streamline this process if you have `npm` installed.

After your environment is initilized, be sure to add your API Keys to `/env/.env.development` to authenticate the integrations.
- Get a Github API key: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Using Docker
### Environment setup
Environment variables are required for each application stage. An example file is included in the repository.

Run this command to create development environment files:

```bash
cp ./env/.env.example ./env/.env.development && cp ./env/.env.example ./env/.env.test
```

### Build and Run Container
Make sure you have Docker running on your machine, and then use these commands to build and start the application container:
```bash
docker build --build-arg NODE_ENV=development -t api-integration-aservice:latest .
```
```bash
docker run -p 3000:3000 -t api-integration-aservice-api:latest
```
Or if you have `npm` installed:
```bash
npm run docker:bootstrap
```

## Run Application Locally with NestJS
You will want to install `node` for development. 
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```
```bash
nvm install node
```
Then, simply run this command to set up and start the application locally:
```bash
npm run bootstrap && npm run start-local
```

# Application development

## Compile and run the project

```bash
# setup
npm run bootstrap

# development
npm run start-local

# watch mode
npm run start-debug

# Build and compile project and run compiled app locally
npm run build
npm run start
```

## Run tests

```bash
# unit tests
npm run test

# test coverage
npm run test:cov
```

## Code Standardization
```bash
# Linting
npm run lint

# Prettier formatting
npm run format
```
