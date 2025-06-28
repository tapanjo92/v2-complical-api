#!/bin/bash
cd /home/ubuntu/v2-complical-api/frontend
npm run build
cd ../infrastructure
npx cdk deploy CompliCal-Frontend-test --require-approval never