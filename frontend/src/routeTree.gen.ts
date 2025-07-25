/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from '@tanstack/react-router'

import { Route as rootRouteImport } from './routes/__root'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as LoginRouteImport } from './routes/login'
import { Route as DocsRouteImport } from './routes/docs'
import { Route as AuthRouteImport } from './routes/_auth'
import { Route as IndexRouteImport } from './routes/index'
import { Route as DocsIndexRouteImport } from './routes/docs.index'
import { Route as DocsWebhooksRouteImport } from './routes/docs.webhooks'
import { Route as DocsQuickstartRouteImport } from './routes/docs.quickstart'
import { Route as DocsOverviewRouteImport } from './routes/docs.overview'
import { Route as DocsErrorsRouteImport } from './routes/docs.errors'
import { Route as DocsBestPracticesRouteImport } from './routes/docs.best-practices'
import { Route as DocsAuthenticationRouteImport } from './routes/docs.authentication'
import { Route as DocsApiReferenceRouteImport } from './routes/docs.api-reference'
import { Route as DocsApiGlobalRouteImport } from './routes/docs.api-global'
import { Route as AuthDashboardRouteImport } from './routes/_auth.dashboard'
import { Route as AuthDashboardIndexRouteImport } from './routes/_auth.dashboard.index'
import { Route as AuthDashboardWebhooksRouteImport } from './routes/_auth.dashboard.webhooks'
import { Route as AuthDashboardApiKeysRouteImport } from './routes/_auth.dashboard.api-keys'
import { Route as AuthDashboardAccountRouteImport } from './routes/_auth.dashboard.account'

const TermsLazyRouteImport = createFileRoute('/terms')()
const PrivacyLazyRouteImport = createFileRoute('/privacy')()
const PricingLazyRouteImport = createFileRoute('/pricing')()

const TermsLazyRoute = TermsLazyRouteImport.update({
  id: '/terms',
  path: '/terms',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/terms.lazy').then((d) => d.Route))
const PrivacyLazyRoute = PrivacyLazyRouteImport.update({
  id: '/privacy',
  path: '/privacy',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/privacy.lazy').then((d) => d.Route))
const PricingLazyRoute = PricingLazyRouteImport.update({
  id: '/pricing',
  path: '/pricing',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/pricing.lazy').then((d) => d.Route))
const RegisterRoute = RegisterRouteImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const DocsRoute = DocsRouteImport.update({
  id: '/docs',
  path: '/docs',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthRoute = AuthRouteImport.update({
  id: '/_auth',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const DocsIndexRoute = DocsIndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => DocsRoute,
} as any)
const DocsWebhooksRoute = DocsWebhooksRouteImport.update({
  id: '/webhooks',
  path: '/webhooks',
  getParentRoute: () => DocsRoute,
} as any)
const DocsQuickstartRoute = DocsQuickstartRouteImport.update({
  id: '/quickstart',
  path: '/quickstart',
  getParentRoute: () => DocsRoute,
} as any)
const DocsOverviewRoute = DocsOverviewRouteImport.update({
  id: '/overview',
  path: '/overview',
  getParentRoute: () => DocsRoute,
} as any)
const DocsErrorsRoute = DocsErrorsRouteImport.update({
  id: '/errors',
  path: '/errors',
  getParentRoute: () => DocsRoute,
} as any)
const DocsBestPracticesRoute = DocsBestPracticesRouteImport.update({
  id: '/best-practices',
  path: '/best-practices',
  getParentRoute: () => DocsRoute,
} as any)
const DocsAuthenticationRoute = DocsAuthenticationRouteImport.update({
  id: '/authentication',
  path: '/authentication',
  getParentRoute: () => DocsRoute,
} as any)
const DocsApiReferenceRoute = DocsApiReferenceRouteImport.update({
  id: '/api-reference',
  path: '/api-reference',
  getParentRoute: () => DocsRoute,
} as any)
const DocsApiGlobalRoute = DocsApiGlobalRouteImport.update({
  id: '/api-global',
  path: '/api-global',
  getParentRoute: () => DocsRoute,
} as any)
const AuthDashboardRoute = AuthDashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => AuthRoute,
} as any)
const AuthDashboardIndexRoute = AuthDashboardIndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AuthDashboardRoute,
} as any)
const AuthDashboardWebhooksRoute = AuthDashboardWebhooksRouteImport.update({
  id: '/webhooks',
  path: '/webhooks',
  getParentRoute: () => AuthDashboardRoute,
} as any)
const AuthDashboardApiKeysRoute = AuthDashboardApiKeysRouteImport.update({
  id: '/api-keys',
  path: '/api-keys',
  getParentRoute: () => AuthDashboardRoute,
} as any)
const AuthDashboardAccountRoute = AuthDashboardAccountRouteImport.update({
  id: '/account',
  path: '/account',
  getParentRoute: () => AuthDashboardRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/docs': typeof DocsRouteWithChildren
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/pricing': typeof PricingLazyRoute
  '/privacy': typeof PrivacyLazyRoute
  '/terms': typeof TermsLazyRoute
  '/dashboard': typeof AuthDashboardRouteWithChildren
  '/docs/api-global': typeof DocsApiGlobalRoute
  '/docs/api-reference': typeof DocsApiReferenceRoute
  '/docs/authentication': typeof DocsAuthenticationRoute
  '/docs/best-practices': typeof DocsBestPracticesRoute
  '/docs/errors': typeof DocsErrorsRoute
  '/docs/overview': typeof DocsOverviewRoute
  '/docs/quickstart': typeof DocsQuickstartRoute
  '/docs/webhooks': typeof DocsWebhooksRoute
  '/docs/': typeof DocsIndexRoute
  '/dashboard/account': typeof AuthDashboardAccountRoute
  '/dashboard/api-keys': typeof AuthDashboardApiKeysRoute
  '/dashboard/webhooks': typeof AuthDashboardWebhooksRoute
  '/dashboard/': typeof AuthDashboardIndexRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/pricing': typeof PricingLazyRoute
  '/privacy': typeof PrivacyLazyRoute
  '/terms': typeof TermsLazyRoute
  '/docs/api-global': typeof DocsApiGlobalRoute
  '/docs/api-reference': typeof DocsApiReferenceRoute
  '/docs/authentication': typeof DocsAuthenticationRoute
  '/docs/best-practices': typeof DocsBestPracticesRoute
  '/docs/errors': typeof DocsErrorsRoute
  '/docs/overview': typeof DocsOverviewRoute
  '/docs/quickstart': typeof DocsQuickstartRoute
  '/docs/webhooks': typeof DocsWebhooksRoute
  '/docs': typeof DocsIndexRoute
  '/dashboard/account': typeof AuthDashboardAccountRoute
  '/dashboard/api-keys': typeof AuthDashboardApiKeysRoute
  '/dashboard/webhooks': typeof AuthDashboardWebhooksRoute
  '/dashboard': typeof AuthDashboardIndexRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_auth': typeof AuthRouteWithChildren
  '/docs': typeof DocsRouteWithChildren
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/pricing': typeof PricingLazyRoute
  '/privacy': typeof PrivacyLazyRoute
  '/terms': typeof TermsLazyRoute
  '/_auth/dashboard': typeof AuthDashboardRouteWithChildren
  '/docs/api-global': typeof DocsApiGlobalRoute
  '/docs/api-reference': typeof DocsApiReferenceRoute
  '/docs/authentication': typeof DocsAuthenticationRoute
  '/docs/best-practices': typeof DocsBestPracticesRoute
  '/docs/errors': typeof DocsErrorsRoute
  '/docs/overview': typeof DocsOverviewRoute
  '/docs/quickstart': typeof DocsQuickstartRoute
  '/docs/webhooks': typeof DocsWebhooksRoute
  '/docs/': typeof DocsIndexRoute
  '/_auth/dashboard/account': typeof AuthDashboardAccountRoute
  '/_auth/dashboard/api-keys': typeof AuthDashboardApiKeysRoute
  '/_auth/dashboard/webhooks': typeof AuthDashboardWebhooksRoute
  '/_auth/dashboard/': typeof AuthDashboardIndexRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/docs'
    | '/login'
    | '/register'
    | '/pricing'
    | '/privacy'
    | '/terms'
    | '/dashboard'
    | '/docs/api-global'
    | '/docs/api-reference'
    | '/docs/authentication'
    | '/docs/best-practices'
    | '/docs/errors'
    | '/docs/overview'
    | '/docs/quickstart'
    | '/docs/webhooks'
    | '/docs/'
    | '/dashboard/account'
    | '/dashboard/api-keys'
    | '/dashboard/webhooks'
    | '/dashboard/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/login'
    | '/register'
    | '/pricing'
    | '/privacy'
    | '/terms'
    | '/docs/api-global'
    | '/docs/api-reference'
    | '/docs/authentication'
    | '/docs/best-practices'
    | '/docs/errors'
    | '/docs/overview'
    | '/docs/quickstart'
    | '/docs/webhooks'
    | '/docs'
    | '/dashboard/account'
    | '/dashboard/api-keys'
    | '/dashboard/webhooks'
    | '/dashboard'
  id:
    | '__root__'
    | '/'
    | '/_auth'
    | '/docs'
    | '/login'
    | '/register'
    | '/pricing'
    | '/privacy'
    | '/terms'
    | '/_auth/dashboard'
    | '/docs/api-global'
    | '/docs/api-reference'
    | '/docs/authentication'
    | '/docs/best-practices'
    | '/docs/errors'
    | '/docs/overview'
    | '/docs/quickstart'
    | '/docs/webhooks'
    | '/docs/'
    | '/_auth/dashboard/account'
    | '/_auth/dashboard/api-keys'
    | '/_auth/dashboard/webhooks'
    | '/_auth/dashboard/'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthRoute: typeof AuthRouteWithChildren
  DocsRoute: typeof DocsRouteWithChildren
  LoginRoute: typeof LoginRoute
  RegisterRoute: typeof RegisterRoute
  PricingLazyRoute: typeof PricingLazyRoute
  PrivacyLazyRoute: typeof PrivacyLazyRoute
  TermsLazyRoute: typeof TermsLazyRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/terms': {
      id: '/terms'
      path: '/terms'
      fullPath: '/terms'
      preLoaderRoute: typeof TermsLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/privacy': {
      id: '/privacy'
      path: '/privacy'
      fullPath: '/privacy'
      preLoaderRoute: typeof PrivacyLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/pricing': {
      id: '/pricing'
      path: '/pricing'
      fullPath: '/pricing'
      preLoaderRoute: typeof PricingLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/docs': {
      id: '/docs'
      path: '/docs'
      fullPath: '/docs'
      preLoaderRoute: typeof DocsRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_auth': {
      id: '/_auth'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/docs/': {
      id: '/docs/'
      path: '/'
      fullPath: '/docs/'
      preLoaderRoute: typeof DocsIndexRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/webhooks': {
      id: '/docs/webhooks'
      path: '/webhooks'
      fullPath: '/docs/webhooks'
      preLoaderRoute: typeof DocsWebhooksRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/quickstart': {
      id: '/docs/quickstart'
      path: '/quickstart'
      fullPath: '/docs/quickstart'
      preLoaderRoute: typeof DocsQuickstartRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/overview': {
      id: '/docs/overview'
      path: '/overview'
      fullPath: '/docs/overview'
      preLoaderRoute: typeof DocsOverviewRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/errors': {
      id: '/docs/errors'
      path: '/errors'
      fullPath: '/docs/errors'
      preLoaderRoute: typeof DocsErrorsRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/best-practices': {
      id: '/docs/best-practices'
      path: '/best-practices'
      fullPath: '/docs/best-practices'
      preLoaderRoute: typeof DocsBestPracticesRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/authentication': {
      id: '/docs/authentication'
      path: '/authentication'
      fullPath: '/docs/authentication'
      preLoaderRoute: typeof DocsAuthenticationRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/api-reference': {
      id: '/docs/api-reference'
      path: '/api-reference'
      fullPath: '/docs/api-reference'
      preLoaderRoute: typeof DocsApiReferenceRouteImport
      parentRoute: typeof DocsRoute
    }
    '/docs/api-global': {
      id: '/docs/api-global'
      path: '/api-global'
      fullPath: '/docs/api-global'
      preLoaderRoute: typeof DocsApiGlobalRouteImport
      parentRoute: typeof DocsRoute
    }
    '/_auth/dashboard': {
      id: '/_auth/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof AuthDashboardRouteImport
      parentRoute: typeof AuthRoute
    }
    '/_auth/dashboard/': {
      id: '/_auth/dashboard/'
      path: '/'
      fullPath: '/dashboard/'
      preLoaderRoute: typeof AuthDashboardIndexRouteImport
      parentRoute: typeof AuthDashboardRoute
    }
    '/_auth/dashboard/webhooks': {
      id: '/_auth/dashboard/webhooks'
      path: '/webhooks'
      fullPath: '/dashboard/webhooks'
      preLoaderRoute: typeof AuthDashboardWebhooksRouteImport
      parentRoute: typeof AuthDashboardRoute
    }
    '/_auth/dashboard/api-keys': {
      id: '/_auth/dashboard/api-keys'
      path: '/api-keys'
      fullPath: '/dashboard/api-keys'
      preLoaderRoute: typeof AuthDashboardApiKeysRouteImport
      parentRoute: typeof AuthDashboardRoute
    }
    '/_auth/dashboard/account': {
      id: '/_auth/dashboard/account'
      path: '/account'
      fullPath: '/dashboard/account'
      preLoaderRoute: typeof AuthDashboardAccountRouteImport
      parentRoute: typeof AuthDashboardRoute
    }
  }
}

interface AuthDashboardRouteChildren {
  AuthDashboardAccountRoute: typeof AuthDashboardAccountRoute
  AuthDashboardApiKeysRoute: typeof AuthDashboardApiKeysRoute
  AuthDashboardWebhooksRoute: typeof AuthDashboardWebhooksRoute
  AuthDashboardIndexRoute: typeof AuthDashboardIndexRoute
}

const AuthDashboardRouteChildren: AuthDashboardRouteChildren = {
  AuthDashboardAccountRoute: AuthDashboardAccountRoute,
  AuthDashboardApiKeysRoute: AuthDashboardApiKeysRoute,
  AuthDashboardWebhooksRoute: AuthDashboardWebhooksRoute,
  AuthDashboardIndexRoute: AuthDashboardIndexRoute,
}

const AuthDashboardRouteWithChildren = AuthDashboardRoute._addFileChildren(
  AuthDashboardRouteChildren,
)

interface AuthRouteChildren {
  AuthDashboardRoute: typeof AuthDashboardRouteWithChildren
}

const AuthRouteChildren: AuthRouteChildren = {
  AuthDashboardRoute: AuthDashboardRouteWithChildren,
}

const AuthRouteWithChildren = AuthRoute._addFileChildren(AuthRouteChildren)

interface DocsRouteChildren {
  DocsApiGlobalRoute: typeof DocsApiGlobalRoute
  DocsApiReferenceRoute: typeof DocsApiReferenceRoute
  DocsAuthenticationRoute: typeof DocsAuthenticationRoute
  DocsBestPracticesRoute: typeof DocsBestPracticesRoute
  DocsErrorsRoute: typeof DocsErrorsRoute
  DocsOverviewRoute: typeof DocsOverviewRoute
  DocsQuickstartRoute: typeof DocsQuickstartRoute
  DocsWebhooksRoute: typeof DocsWebhooksRoute
  DocsIndexRoute: typeof DocsIndexRoute
}

const DocsRouteChildren: DocsRouteChildren = {
  DocsApiGlobalRoute: DocsApiGlobalRoute,
  DocsApiReferenceRoute: DocsApiReferenceRoute,
  DocsAuthenticationRoute: DocsAuthenticationRoute,
  DocsBestPracticesRoute: DocsBestPracticesRoute,
  DocsErrorsRoute: DocsErrorsRoute,
  DocsOverviewRoute: DocsOverviewRoute,
  DocsQuickstartRoute: DocsQuickstartRoute,
  DocsWebhooksRoute: DocsWebhooksRoute,
  DocsIndexRoute: DocsIndexRoute,
}

const DocsRouteWithChildren = DocsRoute._addFileChildren(DocsRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthRoute: AuthRouteWithChildren,
  DocsRoute: DocsRouteWithChildren,
  LoginRoute: LoginRoute,
  RegisterRoute: RegisterRoute,
  PricingLazyRoute: PricingLazyRoute,
  PrivacyLazyRoute: PrivacyLazyRoute,
  TermsLazyRoute: TermsLazyRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
