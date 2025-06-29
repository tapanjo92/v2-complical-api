#!/bin/bash

# Deploy all stacks with proper tagging
set -e

echo "🏷️  Deploying CompliCal with resource tagging..."
echo ""

ENVIRONMENT="${ENVIRONMENT:-test}"
echo "Environment: $ENVIRONMENT"
echo "Tag: name=complical-${ENVIRONMENT}"
echo ""

# Deploy all stacks (tags will be applied automatically by CDK)
echo "📦 Deploying all stacks with tags..."
npm run cdk -- deploy --all --require-approval never

# Tag any existing resources that might have been missed
echo ""
echo "🔍 Tagging any existing resources..."
./scripts/tag-existing-resources.sh

echo ""
echo "✅ Deployment complete with tagging!"
echo ""
echo "🏷️  All resources are now tagged with:"
echo "   - name: complical-${ENVIRONMENT}"
echo "   - environment: ${ENVIRONMENT}"
echo "   - project: complical"
echo "   - managed-by: cdk"
echo "   - owner: complical-team"