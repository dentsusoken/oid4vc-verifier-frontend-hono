#!/bin/bash

# LocalStackのエンドポイントを設定
export AWS_ENDPOINT_URL="http://localstack:4566"

# デバッグ情報
echo "Current directory: $(pwd)"
echo "Listing zip files:"
ls -la *.zip

# DynamoDBテーブルの作成
echo "Creating DynamoDB table: $DYNAMODB_TABLE"
awslocal dynamodb create-table \
    --table-name "$DYNAMODB_TABLE" \
    --attribute-definitions \
        AttributeName=key,AttributeType=S \
    --key-schema \
        AttributeName=key,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5

if [ $? -ne 0 ]; then
    echo "Failed to create DynamoDB table"
    exit 1
fi

echo "DynamoDB table created successfully"

# Lambda関数の作成
awslocal lambda create-function \
    --function-name my-function \
    --runtime nodejs20.x \
    --handler index.handler \
    --zip-file fileb://lambda.zip \
    --role arn:aws:iam::000000000000:role/lambda-role \
    --environment "Variables={DYNAMODB_TABLE=$DYNAMODB_TABLE,API_BASE_URL_VERIFIER_FRONTEND=$API_BASE_URL_VERIFIER_FRONTEND,API_VERSION=$API_VERSION,API_KEY=$API_KEY,ACCESS_TOKEN=$ACCESS_TOKEN,AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY,DYNAMODB_ENDPOINT=$DYNAMODB_ENDPOINT,AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION}"

# エラーチェック
if [ $? -ne 0 ]; then
    echo "Failed to create Lambda function"
    exit 1
fi

# API Gatewayの作成
API_ID=$(awslocal apigateway create-rest-api \
    --name "my-api" \
    --query "id" \
    --output text)

if [ -z "$API_ID" ]; then
    echo "Failed to create API Gateway"
    exit 1
fi

echo "Created API Gateway with ID: $API_ID"

ROOT_RESOURCE_ID=$(awslocal apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query "items[0].id" \
    --output text)

# プロキシ統合のための{proxy+}リソースを作成
PROXY_RESOURCE_ID=$(awslocal apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "{proxy+}" \
    --query "id" \
    --output text)

# プロキシリソースにANYメソッドを設定
awslocal apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method ANY \
    --authorization-type NONE

# Lambda関数との統合
awslocal apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:my-function/invocations

# ルートパスにもANYメソッドを設定
awslocal apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$ROOT_RESOURCE_ID" \
    --http-method ANY \
    --authorization-type NONE

# ルートパスのLambda関数との統合
awslocal apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$ROOT_RESOURCE_ID" \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:000000000000:function:my-function/invocations

# APIのデプロイ
awslocal apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name dev

echo "Setup completed. API Gateway endpoint: http://localhost:4566/restapis/$API_ID/dev/_user_request_/" 