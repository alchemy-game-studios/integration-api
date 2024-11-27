# API Integration Service
A NestJS implementation

# Run Application Locally
You can run this application locally in Docker, or directly on your machine using NestJS. There are `npm` scripts provided to streamline this process if you have `npm` installed.

## Using Docker
### Environment setup
Environment variables are required for each application stage. An example file is included in the repository. No values should be changed (yet), as there are no secrets handled by the application currently.

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

# Summary of Application Features

# Production Checklist
Some ideas for what would be needed to make this production ready. Exact implementations will depend on the service environment and architecture, but this list can serve as a guide.

- Security
  - Authentication (token or OAuth)
  - Authorization (JWT)
  - IP Allowlisting (if internally used service)
  - Secrets configuration integration
- Logging, Visibility, & Alerting
- CI/CD tooling integration
- Caching
  - HTTP Caching
  - Redis
- API rate limiting
- API versioning
- Terraform for provisioning
  - Depends on the service architecture and environment, but some ideas:
    - CPU & Memory Autoscaling
    - Service replication & load balancing
    - Automatic server restarts
- Real database (depends on current architecture)
  - Replicas & backups
  - `docker-compose.yml`
- More testing
  - Input validation tests
  - Performance tests (via k6)
  - Smoke tests (run as part of CI/CD)
- Feature flagging
  - The service is pretty small now, so this may not be needed. In the future, feature flagging could be useful for controlled deployments, especially for large coordinated changes, controlled rollouts, and experimentation.
- Full documentation with runbooks

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

# e2e tests
npm run test:e2e

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
