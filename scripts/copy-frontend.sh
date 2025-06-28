#!/bin/bash

# Copy frontend application from original project
echo "Copying frontend application..."

# Create frontend directory
mkdir -p frontend

# Copy entire frontend application
cp -r /home/ubuntu/CompliCal/packages/frontend/* frontend/

echo "Frontend application copied successfully!"
echo "To deploy the frontend:"
echo "1. Build the frontend: cd frontend && npm install && npm run build"
echo "2. Deploy to S3: aws s3 sync frontend/out s3://\$FRONTEND_BUCKET_NAME --delete"
echo "3. Invalidate CloudFront: aws cloudfront create-invalidation --distribution-id \$DISTRIBUTION_ID --paths '/*'"