# OID4VC Verifier Frontend (Hono)

A Hono-based implementation of the OID4VC Verifier Frontend.

## Table of Contents

- [Setup](#setup)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [AWS Setup](#aws-setup)
- [LocalStack Deployment](#localstack-deployment)
- [AWS Deployment](#aws-deployment)

## Setup

### Prerequisites

#### Clone Repository

```bash
git clone https://github.com/dentsusoken/oid4vc-verifier-frontend-hono
cd oid4vc-verifier-frontend-hono
```

#### Install Dependencies

```bash
npm install
```

### Cloudflare Setup

#### Create .dev.vars

Create a `.dev.vars` file in the project root:

```bash
API_BASE_URL="ENDPOINT_URL"
INIT_TRANSACTION_PATH="ENDPOINT_INIT_TRANSACTION_PATH"
GET_WALLET_RESPONSE_PATH="ENDPOINT_GET_WALLET_RESPONSE_PATH"
WALLET_URL="eudi-openid4vp://verifier-backend.eudiw.dev"
PUBLIC_URL="http://localhost:8787"
```

## Local Development

### Run Locally

```bash
npm run dev
```

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

## AWS Setup

This section describes the setup procedure for the oid4vc-verifier-frontend-hono application in an AWS Lambda environment.

### Prerequisites

- Docker installed
- VSCode Dev Container available

### Setup Steps

#### Environment Variables Configuration

Copy the `.env.template` file to create a `.env` file and configure your AWS credentials.

```bash
cp .env.template .env
```

Set the following information in the `.env` file:

```bash
# AWS credentials
AWS_PROD_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_PROD_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_PROD_REGION=YOUR_AWS_REGION
AWS_ECR_REPOSITORY=YOUR_ECR_REPOSITORY

# LocalStack configuration (for local development)
LOCALSTACK_ACCESS_KEY_ID=test
LOCALSTACK_SECRET_ACCESS_KEY=test
LOCALSTACK_ENDPOINT_URL=http://localstack:4566
LOCALSTACK_REGION=ap-northeast-1
LOCALSTACK_ECR_REPOSITORY=
```

#### VSCode Dev Container Startup

Start the Dev Container in VSCode:

1. Open the project in VSCode
2. Open the command palette (Ctrl+Shift+P)
3. Select "Dev Containers: Reopen in Container"
4. Wait for the container to start

## LocalStack Deployment

When using LocalStack as a local development environment:

```bash
# Deploy to LocalStack
./shell/deployLocalStack.sh
```

After deployment, configure appropriate secret information in SecretsManager.

## AWS Deployment

When deploying to AWS production environment:

```bash
# Deploy to AWS production environment
./shell/deployAws.sh
```

For initial deployment or when cleanup is needed:

```bash
# Deploy with cleanup
./shell/deployAws.sh --clean
```

After deployment, configure appropriate secret information in AWS SecretsManager.

### Deploy Script Details

#### deployLocalStack.sh

Script for deploying to LocalStack environment:

- Cleanup of SAM stack
- Build SAM application
- Deploy to LocalStack

#### deployAws.sh

Script for deploying to AWS production environment:

- `--clean` option for deployment with cleanup
- Cleanup of SAM stack
- Build SAM application
- Deploy to AWS production environment
