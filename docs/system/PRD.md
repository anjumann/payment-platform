# Product Requirements Document (PRD)

## Multi-Tenant Payment Platform

---

## 1. Executive Summary

### 1.1 Product Vision

Build a scalable, secure multi-tenant payment platform serving multiple financial institutions with complete data isolation, customizable payment workflows, white-label capabilities, and comprehensive resource tracking.

### 1.2 Key Objectives

- Enable multiple tenants (banks, financial institutions) to operate independently on shared infrastructure
- Ensure complete data isolation between tenants
- Provide tier-based resource limits and API rate limiting
- Support multi-channel tenant identification (subdomain, header, JWT)

---

## 2. Technical Stack

| Layer       | Technology                  | Purpose                            |
| :---------- | :-------------------------- | :--------------------------------- |
| Backend     | NestJS 10, TypeScript       | RESTful API, business logic        |
| Database    | MongoDB + Mongoose ODM      | Document storage, tenant data      |
| Cache/Queue | Redis + BullMQ              | Caching, rate limiting, job queues |
| Frontend    | Next.js 14, React 18, MUI 5 | Tenant dashboard, payment UI       |
| Testing     | Vitest                      | Unit and integration testing       |

---

## 3. Tenant Tier System

### 3.1 Tier Definitions

| Tier             | Max Users | Transactions/Month | API Rate Limit | Features                             |
| :--------------- | :-------- | :----------------- | :------------- | :----------------------------------- |
| **Starter**      | 10        | 1,000              | 60/min         | Basic payments                       |
| **Professional** | 100       | 50,000             | 300/min        | + Bulk payments, Analytics           |
| **Enterprise**   | Unlimited | Unlimited          | 1000/min       | + Custom workflows, White-label, API |

### 3.2 Tenant Access Methods

1. **Subdomain**: `{tenant-slug}.financeops.com`
2. **Custom Domain**: `payments.theirbank.com`
3. **API Header**: `X-Tenant-ID` for API clients
4. **JWT Claims**: Extracted from authenticated tokens

---

## 4. Core Components

### 4.1 Task A: Tenant Context & Resolution

#### 4.1.1 Tenant Resolution Priority

1. JWT claims (highest priority - authenticated)
2. X-Tenant-ID header (API integrations)
3. Subdomain extraction (web access)

#### 4.1.2 Tenant Schema

```typescript
interface Tenant {
  _id: string;
  slug: string; // 'bank1' for bank1.financeops.com
  name: string; // 'First National Bank'
  tier: "starter" | "professional" | "enterprise";
  domains: string[]; // Custom domains
  settings: TenantSettings;
  limits: TenantLimits;
  isActive: boolean;
}
```

#### 4.1.3 Key Features

- AsyncLocalStorage for request-scoped tenant context
- Redis caching (5-minute TTL) for tenant lookups
- Handle `www.` prefix and port numbers in subdomain extraction
- Graceful handling of invalid/missing tenants

---

### 4.2 Task B: Data Isolation Layer

#### 4.2.1 Isolation Strategy

- **Shared Database Model**: All tenants share database with `tenantId` field
- **Automatic Injection**: `tenantId` auto-injected on all writes
- **Automatic Filtering**: `tenantId` filter auto-applied on all reads

#### 4.2.2 Security Measures

- Block attempts to override `tenantId` in query filters
- Protect MongoDB aggregation pipelines with `$lookup`
- Soft delete support with `deletedAt` timestamp
- Admin bypass decorator for cross-tenant operations

#### 4.2.3 Repository Pattern

```typescript
// Developer writes:           // System executes:
repository.find({              repository.find({
  status: 'active'               tenantId: 'current-tenant',
})                               status: 'active',
                                 deletedAt: null
                               })
```

---

### 4.3 Task C: Rate Limiting & Usage Tracking

#### 4.3.1 Rate Limiting Algorithm

**Sliding Window Log** using Redis Sorted Sets

- Fair to all requests
- No boundary issues between windows
- Precise rate limiting
- Atomic operations with Lua scripts

#### 4.3.2 Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642089600
Retry-After: 30 (when limited)
```

#### 4.3.3 Usage Tracking Structure

```
Hash Key: usage:{tenantId}:2024-01
├── api_calls: 15234
├── transactions: 892
├── storage_bytes: 104857600
└── bandwidth_bytes: 52428800

TTL: 90 days (for billing reconciliation)
```

---

## 5. API Endpoints

### 5.1 Tenant Management

| Method | Endpoint               | Description              |
| :----- | :--------------------- | :----------------------- |
| GET    | `/api/tenants/current` | Get current tenant info  |
| GET    | `/api/tenants/:id`     | Get tenant by ID (admin) |

### 5.2 Payments

| Method | Endpoint            | Description          |
| :----- | :------------------ | :------------------- |
| POST   | `/api/payments`     | Create new payment   |
| GET    | `/api/payments`     | List tenant payments |
| GET    | `/api/payments/:id` | Get payment details  |

### 5.3 Usage & Analytics

| Method | Endpoint             | Description       |
| :----- | :------------------- | :---------------- |
| GET    | `/api/usage/summary` | Get usage summary |
| GET    | `/api/usage/history` | Get usage history |

---

## 6. Frontend Requirements

### 6.1 Pages

1. **Login Page**: Tenant-aware authentication
2. **Dashboard**: Payment overview, quick actions
3. **Payments**: Create/view payments, transaction history
4. **Settings**: Tenant configuration (Enterprise)
5. **Analytics**: Usage statistics (Professional+)

### 6.2 Theming

- Tenant-specific branding (Enterprise tier)
- White-label support with custom colors/logos
- Responsive design with MUI 5

---

## 7. Security Requirements

### 7.1 Data Protection

- Tenant data isolation at repository level
- Request-scoped tenant context (no leakage)
- Audit logging for sensitive operations

### 7.2 Authentication

- JWT-based authentication
- Tenant ID embedded in token claims
- Session management

### 7.3 Authorization

- Role-based access control (RBAC)
- Tenant-specific permissions
- Super admin bypass for maintenance

---

## 8. Non-Functional Requirements

### 8.1 Performance

- API response time < 200ms (95th percentile)
- Support 1000+ concurrent tenants
- Redis caching for frequently accessed data

### 8.2 Scalability

- Horizontal scaling with stateless services
- Database sharding strategy for large tenants
- Connection pooling per tenant

### 8.3 Reliability

- 99.9% uptime target
- Graceful degradation under load
- Comprehensive error handling

---

## 9. Success Metrics

| Metric              | Target                  |
| :------------------ | :---------------------- |
| API Response Time   | < 200ms                 |
| Rate Limit Accuracy | 99.99%                  |
| Data Isolation      | Zero cross-tenant leaks |
| Test Coverage       | > 80%                   |

---

## 10. Out of Scope (v1)

- Payment gateway integrations
- Real-time webhooks
- Mobile applications
- Multi-region deployment
