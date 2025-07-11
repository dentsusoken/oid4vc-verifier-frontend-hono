# OID4VC Verifier Frontend (Hono)

A verifier frontend application for OpenID for Verifiable Credentials (OID4VC).
Built with the Hono framework and runs on both Cloudflare Workers and AWS Lambda environments.

## Supported Environments

- **Cloudflare Workers**: Cloudflare's edge computing environment
- **AWS Lambda**: AWS serverless execution environment

## Environment Configuration

### Cloudflare Workers Environment

#### Required Environment Variables

Configure the following environment variables in `wrangler.toml` or the Cloudflare dashboard:

| Variable Name              | Description                         | Example                        |
| -------------------------- | ----------------------------------- | ------------------------------ |
| `API_BASE_URL`             | Backend API base URL                | `https://api.example.com`      |
| `INIT_TRANSACTION_PATH`    | Transaction initialization API path | `/api/v1/init-transaction`     |
| `GET_WALLET_RESPONSE_PATH` | Wallet response retrieval API path  | `/api/v1/wallet-response`      |
| `WALLET_URL`               | Wallet application URL              | `wallet://example`             |
| `PUBLIC_URL`               | Frontend public URL                 | `https://verifier.example.com` |

#### Required Bindings

##### KV Namespace
```toml
[[kv_namespaces]]
binding = "PRESENTATION_ID_KV"
id = "your-kv-namespace-id"
```

Used for storing presentation IDs and session information.

##### Service Binding (Optional)
```toml
[[services]]
binding = "BACKEND"
service = "your-backend-service-name"
```

Configure this to enable Worker-to-Worker communication with the backend service.

#### Deployment

```bash
# Development environment
npm run dev

# Production environment
npm run deploy
```

### AWS Lambda Environment

#### Required Environment Variables

Configure the following as Lambda function environment variables:

| Variable Name               | Description                           | Example                                          |
| --------------------------- | ------------------------------------- | ------------------------------------------------ |
| `AWS_REGION`                | AWS region                            | `us-east-1`, `ap-northeast-1`                    |
| `SECRETS_MANAGER_SECRET_ID` | AWS Secrets Manager secret identifier | `verifier-frontend-config`                       |
| `SECRETS_MANAGER_ENDPOINT`  | Secrets Manager endpoint (optional)   | `https://secretsmanager.us-east-1.amazonaws.com` |

#### AWS Secrets Manager Configuration

Create a secret in AWS Secrets Manager with the following JSON format:

```json
{
  "API_BASE_URL": "https://api.example.com",
  "INIT_TRANSACTION_PATH": "/api/v1/init-transaction",
  "GET_WALLET_RESPONSE_PATH": "/api/v1/wallet-response",
  "WALLET_URL": "https://wallet.example.com",
  "PUBLIC_URL": "https://verifier.example.com",
  "DYNAMODB_ENDPOINT": "https://dynamodb.us-east-1.amazonaws.com",
  "DYNAMODB_TABLE": "verifier-frontend-sessions"
}
```

#### Required AWS Resources

##### DynamoDB Table
- **Table Name**: Name specified in `DYNAMODB_TABLE`
- **Purpose**: Session information storage
- **Partition Key**: Configure according to application requirements

##### IAM Permissions
The Lambda execution role requires the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:region:account:secret:secret-name"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/table-name"
    }
  ]
}
```

#### CDK Deployment

When deploying with AWS CDK:

```bash
# Install dependencies
npm install

# CDK bootstrap (first time only)
npx cdk bootstrap

# Deploy
npx cdk deploy
```

## Architecture

### Dependency Injection (DI)

The application performs dependency injection according to each environment:

- **Configuration**: Environment variable management
- **PortsOut**: Access to external resources (session, HTTP communication, etc.)
- **PortsIn**: Application entry points

### Session Management

- **Cloudflare**: Uses KV Namespace
- **AWS Lambda**: Uses DynamoDB

### HTTP Communication

- **Cloudflare**: Worker-to-Worker communication via Service Binding (when configured), or standard fetch API
- **AWS Lambda**: Standard fetch API

## Development

### Local Development

```bash
# Install dependencies
npm install

# Development in Cloudflare Workers environment
npm run dev

# Run tests
npm run test

# Build
npm run build
```

### Environment Switching

The application automatically detects the runtime environment and selects the appropriate implementation.

## Troubleshooting

### Cloudflare Workers

- Verify that KV Namespace is correctly created
- Verify that environment variables are configured in `wrangler.toml` or dashboard
- Verify that Service Binding is correctly configured if required

### AWS Lambda

- Verify that Secrets Manager access permissions are configured
- Verify that DynamoDB table is created with appropriate permissions
- Verify that Lambda function environment variables are correctly configured
