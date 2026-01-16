# Multi-Tenant Payment Platform - Frontend

A modern React dashboard for the multi-tenant payment platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: MUI 5 (Material UI)
- **Language**: TypeScript

## Features

- 🎨 **Tenant-aware theming** - Dynamic colors based on tenant settings
- 📱 **Responsive design** - Works on desktop and mobile
- 💳 **Payment management** - Create, view, and track payments
- 📊 **Analytics dashboard** - Usage statistics and trends
- ⚙️ **Settings page** - Tenant configuration

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set environment variables**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

3. **Run development server**:

   ```bash
   npm run dev
   ```

4. **Open in browser**:
   ```
   http://localhost:3001
   ```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx         # Dashboard
│   ├── payments/        # Payments management
│   ├── analytics/       # Usage analytics
│   └── settings/        # Tenant settings
├── components/          # Reusable components
│   ├── ThemeProvider    # MUI theme with tenant colors
│   └── DashboardLayout  # Sidebar navigation
└── lib/                 # Utilities
    ├── tenant-context   # Tenant detection & context
    └── api              # API client
```

## Tenant Detection

The frontend detects tenant via:

1. **Subdomain**: `bank1.localhost:3001` → tenant `bank1`
2. **Development fallback**: Uses default tenant ID in headers

## License

MIT
