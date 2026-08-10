#!/bin/bash

# Jenkins Setup Script
# This script helps configure Jenkins for Metro Opticals deployment

set -e

echo "================================"
echo "Jenkins Setup for Metro Opticals"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Jenkins is running
if ! curl -s http://localhost:8080 > /dev/null; then
    print_error "Jenkins is not running on localhost:8080"
    echo "Please start Jenkins and try again"
    exit 1
fi

print_status "Jenkins is running"

# Install required plugins
echo ""
echo "Installing required Jenkins plugins..."
echo ""

PLUGINS=(
    "docker-workflow"
    "docker-plugin"
    "git"
    "ssh-agent"
    "pipeline-stage-view"
    "blueocean"
    "slack"
    "email-ext"
    "credentials-binding"
)

for plugin in "${PLUGINS[@]}"; do
    echo "Installing: $plugin"
    java -jar jenkins-cli.jar -s http://localhost:8080/ install-plugin $plugin || print_warning "Failed to install $plugin"
done

print_status "Plugins installation completed"

# Create credentials
echo ""
echo "================================================"
echo "Credential Setup Instructions"
echo "================================================"
echo ""
echo "Please create the following credentials in Jenkins:"
echo ""
echo "1. Docker Hub Credentials"
echo "   - ID: dockerhub-credentials"
echo "   - Type: Username with password"
echo "   - URL: http://localhost:8080/credentials/store/system/domain/_/newCredentials"
echo ""

echo "2. GitHub Credentials"
echo "   - ID: github-credentials"
echo "   - Type: Username with password (or SSH key)"
echo "   - URL: http://localhost:8080/credentials/store/system/domain/_/newCredentials"
echo ""

echo "3. Environment File"
echo "   - ID: metroopticals-env-file"
echo "   - Type: Secret file"
echo "   - File: Upload .env.jenkins"
echo "   - URL: http://localhost:8080/credentials/store/system/domain/_/newCredentials"
echo ""

echo "4. SSH Deploy Credentials"
echo "   - ID: ssh-deploy-credentials"
echo "   - Type: SSH Username with private key"
echo "   - URL: http://localhost:8080/credentials/store/system/domain/_/newCredentials"
echo ""

# Create pipeline job
echo "================================================"
echo "Pipeline Job Setup"
echo "================================================"
echo ""
echo "Create a new Pipeline job:"
echo "1. Go to: http://localhost:8080/view/all/newJob"
echo "2. Enter name: metroopticals-pipeline"
echo "3. Select: Pipeline"
echo "4. Click OK"
echo ""
echo "Configure the pipeline:"
echo "1. Definition: Pipeline script from SCM"
echo "2. SCM: Git"
echo "3. Repository URL: https://github.com/Darts-Ecommerce/metroopticals.git"
echo "4. Credentials: Select github-credentials"
echo "5. Branch: */main"
echo "6. Script Path: Jenkinsfile"
echo "7. Save"
echo ""

print_status "Setup instructions displayed"
echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
