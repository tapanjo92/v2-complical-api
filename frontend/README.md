# CompliCal V2 Frontend

Modern React SPA built with Vite, TypeScript, and Tailwind CSS for the CompliCal compliance deadline API.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing fast development
- **TanStack Router** for type-safe routing
- **TanStack Query** for server state management
- **Zustand** for client state
- **Tailwind CSS** + **Radix UI** for styling
- **React Hook Form** + **Zod** for forms
- **Sentry** for APM (optional)

## Features

- 🔐 Secure authentication with httpOnly cookies
- 🔑 API key management dashboard
- 📊 Usage analytics and monitoring
- 🎨 Beautiful, responsive UI
- ⚡ Code splitting and lazy loading
- 🗜️ Pre-compressed assets (gzip + brotli)
- 🚀 Optimized for S3/CloudFront deployment

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (buttons, cards, etc.)
│   └── ...          # Feature components
├── hooks/           # Custom React hooks
├── lib/             # Core utilities
│   ├── api-client.ts    # Axios API client
│   ├── auth-store.ts    # Zustand auth store
│   └── utils.ts         # Helper functions
├── routes/          # TanStack Router pages
│   ├── _auth.tsx        # Protected route layout
│   ├── index.tsx        # Homepage
│   └── ...              # Other pages
└── styles/          # Global styles
```

## Key Features

### Authentication
- Cookie-based auth with CSRF protection
- Automatic token refresh
- Protected routes with auth guards

### API Integration
- Type-safe API client with Axios
- Request/response interceptors
- Automatic retry logic
- Rate limit handling

### State Management
- Zustand for auth state with persistence
- TanStack Query for server state
- Optimistic updates for better UX

### Performance
- Code splitting by route
- Manual chunks for vendor libraries
- Pre-compressed assets (gzip + brotli)
- Lazy loading for non-critical routes

## Deployment

The build output is optimized for static hosting on S3 + CloudFront:

1. Build the project:
```bash
npm run build
```

2. Upload `dist/` contents to S3 bucket

3. Configure CloudFront:
   - Enable compression
   - Set error pages to redirect to index.html
   - Configure cache behaviors

## Environment Variables

- `VITE_API_URL`: Backend API URL
- `VITE_SENTRY_DSN`: Sentry DSN for error tracking (optional)
- `VITE_ENVIRONMENT`: Environment name (development/production)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript compiler
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier