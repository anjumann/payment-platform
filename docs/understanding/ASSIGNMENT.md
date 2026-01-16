# Senior Software Engineer Assessment: Multi-Tenant Payment Platform

## Problem Statement

Design and implement core components of a **multi-tenant payment platform** that serves multiple financial institutions.

Each tenant requires:

- Complete data isolation
- Customizable payment workflows
- White-label capabilities
- Resource limits and usage tracking

## Tech Stack

| Layer            | Technology                  |
| :--------------- | :-------------------------- |
| **Backend**      | NestJS 10, TypeScript       |
| **Database**     | MongoDB with Mongoose ODM   |
| **Cache/Queue**  | Redis, BullMQ               |
| **Frontend**     | Next.js 14, React 18, MUI 5 |
| **Architecture** | Nx Monorepo (Optional)      |
| **Testing**      | Vitest                      |

---

# Part 1: Implementation

## Domain Context

You are building for these tenant tiers:

| Tier             | Max Users | Transactions/Month | API Rate Limit | Features                                    |
| :--------------- | :-------- | :----------------- | :------------- | :------------------------------------------ |
| **Starter**      | 10        | 1,000              | 60/min         | Basic payments                              |
| **Professional** | 100       | 50,000             | 300/min        | + Bulk payments, Analytics                  |
| **Enterprise**   | Unlimited | Unlimited          | 1000/min       | + Custom workflows, White-label, API access |

Tenants access the platform via:

- Subdomain: `{tenant-slug}.financeops.com`
- Custom domain: `payments.theirbank.com`
- API: Using `X-Tenant-ID` header or JWT claims

## Task A: Tenant Context & Resolution

Build the core tenant resolution and context system for NestJS.

### Requirements

1.  **Tenant Resolution** — Resolve tenant from incoming requests via:
    - Subdomain extraction (`bank1.financeops.com` → tenant `bank1`)
    - `X-Tenant-ID` header for API clients
    - JWT claim extraction for authenticated requests
    - Define clear priority when multiple identifiers are present
2.  **Tenant Context** — Request-scoped storage:
    - Store resolved tenant for the request duration
    - Provide type-safe access throughout the application
    - Handle missing/invalid tenant appropriately
3.  **Middleware Integration**
    - Wire into the NestJS request lifecycle

### Considerations

- How do you handle `www.` prefix or port numbers in subdomain extraction?
- What caching strategy makes sense for tenant lookups?
- How do you prevent tenant context from leaking between requests?

## Task B: Data Isolation Layer

Implement data isolation that works with MongoDB and Mongoose.

### Requirements

1.  **Tenant-Aware Data Access** — Enforce isolation at the repository/service layer:
    - Automatically inject `tenantId` on all write operations
    - Automatically filter by `tenantId` on all read operations
    - Support both shared database and isolated database strategies
2.  **Query Safety** — Prevent cross-tenant data access:
    - What happens if someone passes `{ tenantId: 'other-tenant' }` in a query filter?
    - How do you handle MongoDB aggregation pipelines with `$lookup`?

### Considerations

- How do you make this transparent to developers using the repository?
- What's your approach for operations that legitimately need cross-tenant access (admin, analytics)?
- How do you handle soft deletes in a multi-tenant context?

## Task C: Rate Limiting & Usage Tracking

Implement tenant-aware rate limiting and usage tracking using Redis.

### Requirements

1.  **Rate Limiting** — Enforce per-tenant API limits:
    - Implement distributed rate limiting using Redis
    - Respect each tenant's configured `apiRateLimit`
    - Return standard rate limit headers
2.  **Usage Tracking** — Track tenant resource consumption:
    - Track API calls per tenant per month
    - Track transaction counts against monthly limits
    - Provide usage summary for billing purposes

### Considerations

- Which rate limiting algorithm will you use and why?
- How do you ensure atomicity in a distributed environment?
- What Redis data structures are appropriate for monthly usage aggregation?
- How do you handle the boundary between months?

---

# Part 2: Architecture Discussion

Be prepared to discuss your implementation and broader architectural questions.

## Data Architecture

- How would you handle a tenant that outgrows the shared database?
- Explain your approach to tenant-specific backups and restore
- How would you implement cross-tenant analytics without compromising isolation?

## Scaling Considerations

- What happens when one tenant consumes disproportionate resources?
- How would you handle 1000+ tenants on the platform?
- Describe your approach to database connection pooling per tenant

## Security Deep-Dive

- How do you prevent tenant data leaks at the application layer?
- Walk through your audit logging strategy
- How would you handle tenant-specific encryption keys?

## Real-World Scenarios

- **Scenario A:** A large bank wants to migrate 5 million payment records from their legacy system. How do you architect this migration without affecting other tenants?
- **Scenario B:** One enterprise tenant is using 70% of system resources during their peak hours (9 AM – 11 AM EST). How do you handle this fairly?
- **Scenario C:** A tenant discovers that one of their users might have accessed another user's data within the same tenant. How do you investigate this?

## Submission Guidelines

1.  Focus on working code over complete coverage
2.  Include comments explaining key design decisions
3.  Write code you would be comfortable shipping to production
4.  If time-constrained, explain what you would add given more time
