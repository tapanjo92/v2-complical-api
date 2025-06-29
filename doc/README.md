# CompliCal Documentation

## Core Documentation

- 📚 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- 💾 [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Data loading and management
- 📊 [DATA_COVERAGE_REPORT.md](./DATA_COVERAGE_REPORT.md) - Current data coverage status

## Data Coverage by Region

- 🇦🇺 [Australia](./au/) - Australian compliance deadlines documentation
- 🇳🇿 [New Zealand](./nz/) - New Zealand compliance deadlines documentation

## Testing Documentation

- 🧪 [Testing Guide](./test/) - API testing, browser testing, and Playwright guides

## Quick Reference

### Deploy Everything
```bash
cd /home/ubuntu/v2-complical-api/infrastructure
npm run cdk -- deploy --all --require-approval never
```

### Load Data
```bash
cd /home/ubuntu/v2-complical-api/infrastructure
export TABLE_NAME=complical-deadlines-test
npm run load-data
```

### Verify Deployment
```bash
# Check health
curl https://your-api-url/test/health

# Test API with key
curl -H "x-api-key: YOUR_KEY" https://your-api-url/test/v1/deadlines?country=AU
```