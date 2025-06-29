#!/bin/bash

echo "🚀 Deploying CompliCal usage tracking fix..."
echo "============================================"

# Deploy API stack with updated Lambda
echo "📦 Deploying API stack with fixed usage processor..."
cd /home/ubuntu/v2-complical-api/infrastructure
npm run cdk -- deploy CompliCal-API-test --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 To test the usage tracking:"
echo "1. Make an API call:"
echo "   curl -X GET 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU' -H 'x-api-key: YOUR_KEY'"
echo ""
echo "2. Wait 1-2 minutes for async processing"
echo ""
echo "3. Check the API key usage count:"
echo "   aws dynamodb get-item --table-name complical-api-keys-test --key '{\"id\":{\"S\":\"YOUR_KEY_ID\"}}' --region ap-south-1 --query 'Item.[usageCount.N, lastUsed.S]'"
echo ""
echo "4. Check Lambda logs for processing:"
echo "   aws logs tail /aws/lambda/CompliCal-API-test-ProcessUsageLogsFunctionCFD66A1-daXNOFIoK5D9 --since 5m --region ap-south-1"