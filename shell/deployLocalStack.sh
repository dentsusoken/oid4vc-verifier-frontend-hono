#!/bin/bash


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
    # Switch to Localstack credentials
    set_localstack_credentials
    
    cleanup || {
        echo "Error: Cleanup failed"
        set_localstack_credentials
        exit 1
    }
    
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
}

# Execute script
main
