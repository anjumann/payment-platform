# Multi-Tenant Payment Platform - Nx Monorepo

A secure, scalable multi-tenant payment platform built with NestJS and Next.js in an Nx monorepo.

## Project Structure

```
payment-platform/
├── apps/
│   ├── api/                 # NestJS Backend (port 3000)
│   └── web/                 # Next.js Frontend (port 3001)
├── libs/
│   └── shared-types/        # Shared TypeScript types
├── nx.json                  # Nx configuration
└── package.json             # Root package.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure (MongoDB + Redis)
npm run docker:up

# Seed the database
npm run seed

# Start all apps
npm run start:all

# Or start individually
npm run start:api   # Backend at http://localhost:3000
npm run start:web   # Frontend at http://localhost:3001
```

## Available Commands

| Command               | Description             |
| :-------------------- | :---------------------- |
| `npm run start:api`   | Start API in watch mode |
| `npm run start:web`   | Start Web in dev mode   |
| `npm run start:all`   | Start all apps          |
| `npm run build:all`   | Build all apps          |
| `npm run lint:all`    | Lint all apps           |
| `npm run docker:up`   | Start MongoDB + Redis   |
| `npm run docker:down` | Stop Docker services    |

## Nx Commands

```bash
# View project graph
npx nx graph

# Run target on specific project
npx nx serve api
npx nx build web

# Run target on all projects
npx nx run-many --target=build --all

# Run affected projects only
npx nx affected --target=build
```

## Apps

### API (`apps/api`)

NestJS backend with:

- Tenant resolution & context
- Data isolation layer
- Rate limiting & usage tracking
- Payment CRUD operations

### Web (`apps/web`)

Next.js frontend with:

- Tailwind CSS + shadcn/ui
- Tenant-aware theming
- Dashboard, Payments, Analytics

## Libraries

### shared-types (`libs/shared-types`)

Shared TypeScript types for:

- Tenant, Payment, Usage interfaces
- Enums (status, methods, currencies)
- API response types

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nx Monorepo                           │
├─────────────────────────────────────────────────────────┤
│  apps/web (Next.js)    ←──→    apps/api (NestJS)        │
│         ↓                            ↓                   │
│    libs/shared-types  ←────→  libs/shared-types          │
└─────────────────────────────────────────────────────────┘
```
