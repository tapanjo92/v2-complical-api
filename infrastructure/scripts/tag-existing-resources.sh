#!/bin/bash

# Script to tag all existing CompliCal resources
set -e

ENVIRONMENT="${ENVIRONMENT:-test}"
TAG_KEY="name"
TAG_VALUE="complical-${ENVIRONMENT}"
REGION="ap-south-1"

echo "🏷️  Tagging all CompliCal resources with ${TAG_KEY}:${TAG_VALUE}"
echo ""

# Function to tag resources
tag_resources() {
    local service=$1
    local resource_type=$2
    local query=$3
    
    echo "Tagging ${resource_type}..."
    
    # Get resource ARNs
    RESOURCES=$(aws $service $query --region $REGION --output json | jq -r '.[][]' 2>/dev/null || echo "")
    
    if [ -z "$RESOURCES" ]; then
        echo "  No ${resource_type} found"
        return
    fi
    
    # Tag each resource
    echo "$RESOURCES" | while read -r arn; do
        if [ ! -z "$arn" ]; then
            echo "  Tagging: ${arn##*/}"
            aws resourcegroupstaggingapi tag-resources \
                --resource-arn-list "$arn" \
                --tags "${TAG_KEY}=${TAG_VALUE}" \
                --region $REGION 2>/dev/null || echo "    Failed to tag ${arn##*/}"
        fi
    done
}

# Tag Lambda functions
echo "🔧 Tagging Lambda functions..."
aws lambda list-functions --region $REGION --output json | \
    jq -r '.Functions[] | select(.FunctionName | contains("complical")) | .FunctionArn' | \
    while read -r arn; do
        if [ ! -z "$arn" ]; then
            echo "  Tagging: ${arn##*/}"
            aws lambda tag-resource --resource "$arn" --tags "${TAG_KEY}=${TAG_VALUE}" --region $REGION
        fi
    done

# Tag DynamoDB tables
echo ""
echo "📊 Tagging DynamoDB tables..."
aws dynamodb list-tables --region $REGION --output json | \
    jq -r '.TableNames[] | select(. | contains("complical"))' | \
    while read -r table; do
        if [ ! -z "$table" ]; then
            echo "  Tagging: $table"
            TABLE_ARN=$(aws dynamodb describe-table --table-name "$table" --region $REGION --output json | jq -r '.Table.TableArn')
            aws dynamodb tag-resource --resource-arn "$TABLE_ARN" --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" --region $REGION
        fi
    done

# Tag API Gateway REST APIs
echo ""
echo "🌐 Tagging API Gateway REST APIs..."
aws apigateway get-rest-apis --region $REGION --output json | \
    jq -r '.items[] | select(.name | contains("complical")) | .id' | \
    while read -r api_id; do
        if [ ! -z "$api_id" ]; then
            API_NAME=$(aws apigateway get-rest-api --rest-api-id "$api_id" --region $REGION --output json | jq -r '.name')
            echo "  Tagging: $API_NAME"
            API_ARN="arn:aws:apigateway:${REGION}::/restapis/${api_id}"
            aws apigateway tag-resource --resource-arn "$API_ARN" --tags "${TAG_KEY}=${TAG_VALUE}" --region $REGION
        fi
    done

# Tag Cognito User Pools
echo ""
echo "🔐 Tagging Cognito User Pools..."
aws cognito-idp list-user-pools --max-results 50 --region $REGION --output json | \
    jq -r '.UserPools[] | select(.Name | contains("complical")) | .Id' | \
    while read -r pool_id; do
        if [ ! -z "$pool_id" ]; then
            echo "  Tagging: $pool_id"
            POOL_ARN="arn:aws:cognito-idp:${REGION}:$(aws sts get-caller-identity --query Account --output text):userpool/${pool_id}"
            aws cognito-idp tag-resource --resource-arn "$POOL_ARN" --tags "${TAG_KEY}=${TAG_VALUE}" --region $REGION
        fi
    done

# Tag S3 buckets
echo ""
echo "🪣 Tagging S3 buckets..."
aws s3api list-buckets --output json | \
    jq -r '.Buckets[] | select(.Name | contains("complical")) | .Name' | \
    while read -r bucket; do
        if [ ! -z "$bucket" ]; then
            echo "  Tagging: $bucket"
            aws s3api put-bucket-tagging --bucket "$bucket" \
                --tagging "TagSet=[{Key=${TAG_KEY},Value=${TAG_VALUE}}]" --region $REGION 2>/dev/null || \
                echo "    Note: Bucket might be in different region"
        fi
    done

# Tag CloudFront distributions
echo ""
echo "☁️  Tagging CloudFront distributions..."
aws cloudfront list-distributions --output json | \
    jq -r '.DistributionList.Items[] | select(.Comment | contains("complical")) | .ARN' | \
    while read -r arn; do
        if [ ! -z "$arn" ]; then
            echo "  Tagging: ${arn##*/}"
            aws cloudfront tag-resource --resource "$arn" --tags "Items=[{Key=${TAG_KEY},Value=${TAG_VALUE}}]"
        fi
    done

# Tag SNS topics
echo ""
echo "📢 Tagging SNS topics..."
aws sns list-topics --region $REGION --output json | \
    jq -r '.Topics[] | select(.TopicArn | contains("complical")) | .TopicArn' | \
    while read -r arn; do
        if [ ! -z "$arn" ]; then
            echo "  Tagging: ${arn##*/}"
            aws sns tag-resource --resource-arn "$arn" --tags "Key=${TAG_KEY},Value=${TAG_VALUE}" --region $REGION
        fi
    done

echo ""
echo "✅ Tagging complete!"
echo ""
echo "📝 Note: Some resources might have failed to tag due to:"
echo "   - Different regions"
echo "   - Permission issues"
echo "   - Resources not supporting tagging API"
echo ""
echo "🔄 For new resources, CDK will automatically apply tags during deployment."