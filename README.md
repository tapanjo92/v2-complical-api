# V2 CompliCal API

Complete rewrite of CompliCal with modern architecture and enhanced security.

## Project Structure

```
v2-complical-api/
├── frontend/          # React SPA with Vite
│   ├── src/          # Source code
│   ├── dist/         # Build output
│   └── README.md     # Frontend documentation
├── infrastructure/    # AWS CDK deployment
│   ├── lib/          # CDK stacks
│   └── deploy.sh     # Deployment script
└── README.md         # This file
```

## Features

### Frontend
- ⚛️ React 18 with TypeScript
- ⚡ Vite for fast development
- 🎨 Tailwind CSS + Radix UI
- 🔐 Secure authentication with httpOnly cookies
- 📊 Dashboard with API key management
- 🚀 Optimized for CloudFront deployment

### Infrastructure
- ☁️ AWS CDK v2 with TypeScript
- 🌐 CloudFront CDN with security headers
- 🪣 S3 static hosting
- 🔒 Origin Access Identity for security
- 📝 CloudFront access logs

## Quick Start

### Deploy Frontend

```bash
cd infrastructure
./deploy.sh
```

This will:
1. Build the React frontend
2. Deploy S3 bucket and CloudFront distribution
3. Output the CloudFront URL

### Local Development

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│  CloudFront  │────▶│ S3 Bucket  │
└─────────────┘     └──────────────┘     └────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────────────┘
```

## Security Features

- 🔒 HTTPS-only with TLS 1.2+
- 🛡️ Security headers (HSTS, CSP, X-Frame-Options)
- 🚫 No direct S3 access (OAI protected)
- 🍪 httpOnly cookies for authentication
- 🔑 SHA-256 hashed API keys

## Documentation

- [Frontend README](./frontend/README.md) - Frontend development guide
- [Infrastructure README](./infrastructure/README.md) - Deployment guide

## Environment Variables

Create `.env` in the frontend directory:

```env
VITE_API_URL=https://your-api-url.amazonaws.com/stage
VITE_SENTRY_DSN=your-sentry-dsn (optional)
VITE_ENVIRONMENT=production
```

## Deployment Outputs

After deployment, you'll get:
- CloudFront URL: `https://dxxxxxxxxx.cloudfront.net`
- S3 Bucket Name: `v2-complical-frontend-dev-{account-id}`
- Distribution ID: For cache invalidation

## Next Steps

1. Deploy the frontend infrastructure
2. Update the API URL in frontend `.env`
3. Set up custom domain (optional)
4. Configure monitoring (optional)

## License

Copyright 2025 CompliCal. All rights reserved.