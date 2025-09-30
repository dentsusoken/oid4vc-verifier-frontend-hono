#!/bin/bash

# Set AWS production environment credentials
set_aws_prod_credentials() {
    export AWS_ACCESS_KEY_ID="$AWS_PROD_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_PROD_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$AWS_PROD_REGION"
    export AWS_ENDPOINT_URL=
}

# Cleanup process (delete SAM stack)
cleanup() {
    echo "Cleaning up SAM stack..."
    sam delete --no-prompts
}

# Build process
build() {
    echo "Building SAM application..."
    sam build
}

# Deploy process
deploy() {
    echo "Deploying SAM application..."
    sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
}

# Set Localstack credentials
set_localstack_credentials() {
    export AWS_ACCESS_KEY_ID="$LOCALSTACK_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$LOCALSTACK_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$LOCALSTACK_REGION"
    export AWS_ENDPOINT_URL="$LOCALSTACK_ENDPOINT_URL"
}

# Main process
main() {
    set_aws_prod_credentials
    # Check arguments
    if [ "$1" = "--clean" ]; then
        cleanup || {
            echo "Error: Cleanup failed"
            set_localstack_credentials
            exit 1
        }
    fi
    
    # Build and deploy
    build || {
        echo "Error: Build failed"
        set_localstack_credentials
        exit 1
    }
    
    deploy || {
        echo "Error: Deploy failed"
        set_localstack_credentials
        exit 1
    }
    
    # Switch to Localstack credentials
    set_localstack_credentials
}

# Execute script
main "$@"
