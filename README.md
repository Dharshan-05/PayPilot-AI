# PayPilot AI — Governed Autonomous Agentic Commerce with Persistent PostgreSQL

**AI recommends. Server validates. Policy authorizes. Database verifies price & inventory. Human confirms. PayPal executes.**

An end-to-end governed agentic commerce platform that separates **AI shopping intelligence** from **financial execution authority** — enabling natural-language product discovery, server-authoritative checkout proposals, prompt-injection defense, and auditable payment capture backed by a **production-ready PostgreSQL database** via **Prisma ORM**. Never letting an LLM or browser client control money, prices, or credentials.

---

## 🎯 Problem Statement

Modern AI shopping assistants create severe fintech trust and security risks when connected directly to payment rails:

1. **Prompt Injection & Price Tampering:** Attackers trick LLMs into changing item prices to `$0.01`, bypassing approval, or exfiltrating server API keys.
2. **Unauthorized Autonomous Spend:** Giving AI agents direct permission to create or capture PayPal orders leads to silent, unapproved charges and hallucinated SKUs.
3. **Non-Persistent / Fragile In-Memory State:** Ephemeral SQLite or in-memory arrays cannot withstand production restarts, multi-instance concurrency, or audit compliance.
4. **Floating-Point Drift:** Using IEEE-754 floating-point numbers (`Float`) for transactions causes penny drift and reconciliation failures.

---

## 💡 Solution Overview

This repository (`D:\PROJECT\PAYPAL`) pairs a tactile, high-craft **React 18 + Vite 5.4** dashboard (`client/`) with a **Next.js 16 + Prisma 6 + PostgreSQL** financial control plane (`server/`):

- **Complete Persistent PostgreSQL Architecture:** Migrated from SQLite to a normalized PostgreSQL database using Prisma ORM with 21 robust models (15 core normalized models + 6 preserved commerce models).
- **Zero Floating-Point Financial Precision:** Every financial amount (`price`, `totalAmount`, `unitAmount`, `amount`, `totalSpent`, `value`) is strictly mapped to PostgreSQL `Decimal(12, 2)` via `Prisma.Decimal`.
- **Atomic Multi-Table Transaction Consistency:** Order creation and payment capture execute inside `prisma.$transaction`, synchronizing `PaymentOrder`, normalized `Order`, `Payment`, `Transaction`, `Customer` spend statistics, and compliance `AuditLog` records with complete rollback safety.
- **Strict Financial Authority Boundary:** AI agents can search products and *propose* purchases (`PENDING_CONFIRMATION`), but are strictly blocked (`403 FORBIDDEN_AI_ACTION` / `403 FORBIDDEN_OPERATION`) from confirming proposals or invoking `paypal.createOrder` / `paypal.capturePayment`.
- **Same-Origin Proxy Isolation:** The Vite frontend communicates exclusively over same-origin `/api/*` requests; server secrets (`PAYPAL_CLIENT_SECRET`, `DATABASE_URL`) never enter browser bundles.
- **Vercel Multi-Service Ready:** Unified deployment configuration (`vercel.json`) coordinating the Vite client and Next.js backend with internal service bindings and rewrite rules.

---

## 🏗️ System Architecture & Entity Relationships

### Component Architecture

```text
+-----------------------------------------------------------------------------------+
|                        CLIENT APPLICATION (client/ :5173)                         |
|   React 18 • TypeScript 5.6 • Vite 5.4 • Tailwind CSS • 19 HashRouter Views       |
|   Home • Send Money • AI Shopping • Product Discovery • Checkout • Transactions   |
|   Product Details • FraudGuard (Live Audit) • AI Agents (APIMatic Capabilities)   |
|   Live Dashboard Hydration via /api/dashboard/stats & /api/transactions           |
+-----------------------------------------+-----------------------------------------+
                                          | Same-origin proxy (/api/* -> :3000)
                                          v
+-----------------------------------------------------------------------------------+
|                     CONTROL PLANE & API SERVER (server/ :3000)                    |
|             Next.js 16.4 App Router • 31 REST API Route Handlers                  |
+-----------------------------------------------------------------------------------+
|  SECURITY, RATE-LIMITING & POLICY GATE                                            |
|  • enforceRateLimit (429: 120/min general, 35/min sensitive AI/financial)         |
|  • safeParseJson (1 MB limit) • Prompt Injection Guard • Redacted Error Envelope  |
|  • Financial Gate: AI Proposes, Human Authorizes (403 on AI financial execution)  |
+-------------------+-------------------------+-------------------------+-----------+
                    |                         |                         |
                    v                         v                         v
+-------------------------+   +-----------------------------+   +-------------------+
| PRODUCT INTELLIGENCE &  |   | APIMATIC AGENT CONTEXT &    |   | COMMERCE & PAYPAL |
| SEMANTIC SEARCH         |   | COMMERCE COPILOT            |   | EXECUTION ENGINE  |
| • Hybrid Lexical+Vector |   | • 9 Typed Tool Capabilities |   | • Atomic Txns     |
| • Multi-factor Ranking  |   | • Caller Policy Enforcement |   | • Idempotency     |
| • Comparison Engine     |   | • Budget & Guardrail Snap.  |   | • Orders v2 Flow  |
| • Elastic / Mock Adapter|   | • AI Audit Trail Logger     |   | • Sandbox / Mock  |
+------------+------------+   +--------------+--------------+   +---------+---------+
             |                               |                            |
             +-------------------------------+----------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------+
|            MODULAR REPOSITORY LAYER (server/src/server/db/repositories/)          |
|  Customer • Product • Order • Payment • Transaction • Risk • AI Insight           |
|  AI Recommendation • Agent • Notification • Metric • Setting • Dashboard          |
+-----------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------+
|               PERSISTENT DATABASE: PostgreSQL 17 + Prisma ORM 6.19                |
|   21 Tables • Foreign Keys • Cascade/Restrict Rules • Composite & B-Tree Indexes  |
|   Exact Decimal(12, 2) Monetary Columns • JSON Auditing • Realistic Demo Seed     |
+-----------------------------------------------------------------------------------+
```

### Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ AuditLog : "creates"
    Customer ||--o{ Order : "places"
    Customer ||--o{ Payment : "initiates"
    Customer ||--o{ Transaction : "owns"
    Order ||--o{ Payment : "has"
    Payment ||--o{ Transaction : "generates"
    Transaction ||--o{ RiskAssessment : "evaluated by"
    Transaction ||--o{ AIInsight : "produces"
    Agent ||--o{ AgentRun : "executes"
    Product ||--o{ CommerceProposal : "included in"
    PaymentOrder ||--o| CommerceProposal : "fulfills"

    User {
        string id PK
        string email UK
        string name
        string role
        string status
        datetime createdAt
        datetime updatedAt
    }

    Customer {
        string id PK
        string externalId UK
        string name
        string email UK
        string phone
        string country
        string status
        decimal totalSpent
        int transactionCount
        datetime createdAt
        datetime updatedAt
    }

    Product {
        string id PK
        string sku UK
        string externalId
        string name
        string description
        string category
        decimal price
        string currency
        int inventory
        boolean isAvailable
        datetime createdAt
        datetime updatedAt
    }

    Order {
        string id PK
        string orderNumber UK
        string customerId FK
        string status
        decimal amount
        string currency
        string paypalOrderId
        datetime createdAt
        datetime updatedAt
    }

    Payment {
        string id PK
        string orderId FK
        string customerId FK
        string paypalOrderId
        string paypalCaptureId
        string status
        decimal amount
        string currency
        string paymentMethod
        string payerEmail
        datetime capturedAt
        datetime createdAt
        datetime updatedAt
    }

    Transaction {
        string id PK
        string paymentId FK
        string customerId FK
        string paypalOrderId
        string paypalCaptureId
        string type
        string status
        decimal amount
        string currency
        decimal riskScore
        string riskLevel
        string description
        datetime transactionDate
        datetime createdAt
        datetime updatedAt
    }

    RiskAssessment {
        string id PK
        string transactionId FK
        decimal score
        string level
        string reasons
        string model
        decimal confidence
        datetime createdAt
    }

    AIInsight {
        string id PK
        string transactionId FK
        string type
        string title
        string summary
        string severity
        decimal confidence
        string recommendation
        string status
        datetime createdAt
        datetime updatedAt
    }

    AIRecommendation {
        string id PK
        string type
        string title
        string description
        string priority
        decimal confidence
        string expectedImpact
        string status
        datetime createdAt
        datetime updatedAt
    }

    Agent {
        string id PK
        string name
        string type
        string description
        string status
        datetime lastRunAt
        datetime createdAt
        datetime updatedAt
    }

    AgentRun {
        string id PK
        string agentId FK
        string status
        string input
        string output
        datetime startedAt
        datetime completedAt
        string error
        datetime createdAt
    }

    Notification {
        string id PK
        string type
        string title
        string message
        string severity
        boolean read
        datetime createdAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entity
        string entityId
        string details
        string ipAddress
        datetime createdAt
    }

    BusinessMetric {
        string id PK
        string metric
        decimal value
        decimal previousValue
        decimal changePercent
        string period
        datetime recordedAt
    }

    ApplicationSetting {
        string id PK
        string key UK
        string value
        string description
        datetime updatedAt
    }

    PaymentOrder {
        string id PK
        string paypalOrderId UK
        string internalReference UK
        decimal amount
        string currency
        string status
        string paypalCaptureId
        datetime createdAt
        datetime updatedAt
    }

    CommerceProposal {
        string id PK
        string proposalNumber UK
        string productId FK
        int quantity
        decimal unitAmount
        decimal totalAmount
        string currency
        string status
        string paymentOrderId FK
        datetime expiresAt
        datetime confirmedAt
    }
```

---

## 🗄️ Database Models & Schema Design

The complete schema contains **21 PostgreSQL models** defined in `server/prisma/schema.prisma`:

### Core Normalized Models (Phase 2 & 3)
1. **`User`**: Administrators and staff with role-based access control (`role`, `status`).
2. **`Customer`**: Merchant clients tracking lifetime spending (`totalSpent`), frequency (`transactionCount`), and geographical risk (`country`).
3. **`Product`**: Commercial catalog items with SKU, categories, inventory quantities, and authoritative pricing (`Decimal(12, 2)`).
4. **`Order`**: Commercial purchases mapped to customers and external PayPal orders.
5. **`Payment`**: Individual payment attempts tracking capture identifiers (`paypalCaptureId`), payment method, and payer details.
6. **`Transaction`**: Immutable financial ledger entries recording risk classification, metadata, and status.
7. **`RiskAssessment`**: Quantitative transaction fraud evaluations (`score`, `level`, `confidence`, `reasons`).
8. **`AIInsight`**: Actionable real-time intelligence generated by autonomous oversight agents.
9. **`AIRecommendation`**: Strategic business optimizations ranked by priority and expected impact.
10. **`Agent`**: Autonomous agent profiles (`FraudGuard Sentinel`, `Semantic Commerce Agent`, `Reconciliation Bot`, etc.).
11. **`AgentRun`**: Historical execution telemetry recording inputs, outputs, duration, and error diagnostics.
12. **`Notification`**: System and transaction alerts for operators with severity levels.
13. **`AuditLog`**: Compliance tracking for user and administrative operations.
14. **`BusinessMetric`**: Financial time-series KPI tracking (Revenue, Conversion, Fraud Blocked Rate, AOV).
15. **`ApplicationSetting`**: System configuration key-value store.

### Preserved Specialized Models
16. **`PaymentOrder`**: PayPal Orders v2 finite state machine execution record.
17. **`CommerceProposal`**: Server-governed proposals with 15-minute TTL preventing AI price tampering.
18. **`CommerceConversation`**: Multi-turn customer shopping session tracking.
19. **`CommerceMessage`**: Turn-by-turn conversational history with metadata.
20. **`AIAuditLog`**: APIMatic agent context tool call governance logs.
21. **`WebhookEvent`**: Idempotent PayPal webhook ingestion tracker.

---

## ⚡ Modular Repository Layer

All database queries are decoupled through a modular repository architecture under `server/src/server/db/repositories/`:

- `customerRepository`: Customer lookup, lifetime spend increments, top customers ranking.
- `productRepository`: Catalog retrieval, SKU lookup, atomic inventory increment/decrement.
- `orderRepository`: Order lifecycle, customer order history, status updates.
- `paymentRepository`: Payment execution recording, capture tracking.
- `transactionRepository`: Paginated ledger queries, customer transaction aggregation.
- `riskRepository`: Risk assessment attachment and high-risk threshold filtering.
- `insightRepository`: AI insight management, severity filtering, resolution state tracking.
- `recommendationRepository`: Strategic recommendations with priority sorting.
- `agentRepository`: Agent health, last run timestamps, and execution history recording.
- `notificationRepository`: Real-time notification creation, unread count aggregation, mark-as-read.
- `metricRepository`: Business KPI recording and time-period comparison.
- `settingRepository`: Typed application configuration retrieval and caching.
- `dashboardRepository`: Consolidated executive KPIs (Total Revenue, 24h Transactions, Average Risk, Active Agents).

---

## 🌐 Complete REST API Endpoints

The server exposes 31 API routes including 10 persistent database-backed endpoints:

| Endpoint | Method | Purpose | Response Highlights |
| :--- | :--- | :--- | :--- |
| `/api/dashboard/stats` | `GET` | High-level executive metrics | `totalRevenue`, `transactionCount`, `activeAgents`, `unreadNotifications` |
| `/api/transactions` | `GET` | Paginated transaction ledger | `results: Transaction[]`, `pagination: { page, limit, total }` |
| `/api/transactions/[id]` | `GET` | Transaction detail with risk | Includes joined `RiskAssessment`, `Payment`, `Customer` |
| `/api/customers` | `GET` | Customer list with spending | `results: Customer[]`, top spenders |
| `/api/risk/assessments` | `GET` | Fraud & anomaly records | `results: RiskAssessment[]`, high-risk flags |
| `/api/ai/insights` | `GET` | AI-generated operational alerts | Severity-ranked insights with recommendations |
| `/api/ai/recommendations` | `GET` | Strategic business opportunities | Priority-ranked recommendations with expected impact |
| `/api/agents` | `GET` | Autonomous agent registry & runs | Active agents with status and latest run details |
| `/api/notifications` | `GET` | System and payment alerts | Notifications with `unreadCount` |
| `/api/metrics` | `GET` | Time-series business KPIs | Revenue, conversion, fraud blocked %, AOV |
| `/api/orders` | `POST` | Create PayPal order | Atomic transaction creating `PaymentOrder`, `Order`, `Payment`, `Transaction` |
| `/api/orders/[id]/capture`| `POST` | Capture approved PayPal order | Atomic settlement, customer spend update, inventory deduction |
| `/api/commerce/proposals` | `POST` | Create governed proposal | Price locked to PostgreSQL catalog; 15-minute TTL |
| `/api/products/search` | `GET` | Hybrid semantic search | Lexical + 64-d vector similarity with database price verification |

---

## 💳 PayPal Integration & Multi-Table Transactional Consistency

The PayPal integration maintains strict two-step execution and complete atomic consistency:

```mermaid
sequenceDiagram
    autonumber
    actor User as Human Buyer
    participant Client as Frontend (React)
    participant API as Server (Next.js)
    participant DB as PostgreSQL (Prisma $transaction)
    participant PP as PayPal Rails (Sandbox)

    User->>Client: Clicks "Pay with PayPal"
    Client->>API: POST /api/orders (amount, currency, proposalId)
    API->>PP: POST /v2/checkout/orders (Idempotent Request)
    PP-->>API: 201 Created (paypalOrderId, approvalLink)
    API->>DB: Atomic prisma.$transaction
    Note over DB: Creates PaymentOrder (CREATED)<br/>Creates Order (PENDING)<br/>Creates Payment (PENDING)<br/>Creates Transaction (PENDING)
    DB-->>API: Transaction Committed
    API-->>Client: 200 OK (approvalUrl)
    Client->>PP: Redirects Buyer to Approve Payment
    User->>PP: Authorizes Payment in PayPal Modal
    PP-->>Client: Returns with Approval Token
    Client->>API: POST /api/orders/{orderId}/capture
    API->>PP: POST /v2/checkout/orders/{orderId}/capture
    PP-->>API: 201 Captured (captureId, COMPLETED)
    API->>DB: Atomic prisma.$transaction
    Note over DB: Updates PaymentOrder to CAPTURED<br/>Updates Order to COMPLETED<br/>Updates Payment to COMPLETED<br/>Updates Transaction to COMPLETED<br/>Increments Customer totalSpent & txCount<br/>Decrements Product Inventory<br/>Fulfills CommerceProposal (COMPLETED)<br/>Writes compliance AuditLog
    DB-->>API: Transaction Committed
    API-->>Client: 200 OK (Payment Settled)
```

---

## 🧪 Comprehensive Automated Test Suite

The test suite validates the entire architecture with **44 test files and 304 test cases passing with 100% success rate**:

```bash
cd server
npm test
```

### Verified Test Categories
- **Phase 11 Database Suite (`tests/phase11-postgres-database.test.ts`):** 20 comprehensive verifications covering PostgreSQL connectivity, all 15 models, CRUD operations, atomic PayPal order creation, atomic capture settlement, idempotency / duplicate capture protection, risk assessment attachments, AI insight persistence, recommendation retrieval, agent run history, dashboard KPI aggregation, transactional rollback safety on failure, environment validation, zero credential leakage, and live API endpoints.
- **Phase 1–3 Financial Core:** Exact precision math (`validateMoney`), negative amount rejection, currency validation, PayPal state machine transitions, idempotency deduplication.
- **Phase 4–5 Product Intelligence & Search:** Grounded catalog search, multi-factor ranking, side-by-side comparison matrix, typo tolerance, domain synonyms, 64-dimensional vector similarity.
- **Phase 6 Agent Context Engine:** APIMatic capability registry (9 operations), tool execution policy, human gate authorization checks.
- **Phase 7 End-to-End Commerce:** Complete chat -> intent -> proposal -> confirmation -> PayPal sandbox -> capture -> status inquiry lifecycle.
- **Phase 8 AG Grid UI Contracts:** Authoritative catalog presentation, sorting, filtering, and modal contract verification.
- **Phase 9 Security & Hardening:** Payload limits (`413 PayloadTooLargeError`), malformed JSON protection (`400`), rate-limiting (`429 RATE_LIMIT_EXCEEDED`), prompt injection defense (`POLICY_BLOCKED`), error sanitization, zero credential leakage.
- **Phase 10 PayPal Provider Mode:** Mode switching (`mock`, `sandbox`, `auto`), OAuth2 access token caching, credential normalization.

---

## 🚀 Getting Started & Execution Instructions

### Prerequisites
- Node.js 20+ and npm 10+
- PostgreSQL 14+ (Local installation or hosted service such as Supabase, Neon, or Railway)

### 1. Configure Environment Variables

In `server/.env`:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paypilot_dev?schema=public"

# PayPal Sandbox Configuration
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_PROVIDER="auto"
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id_here"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret_here"
PAYPAL_WEBHOOK_ID="sandbox_webhook_id_placeholder"

# Security Limits
MAX_TRANSACTION_AMOUNT=1000.00
ALLOWED_CURRENCIES=USD,EUR,GBP,CAD,AUD
```

### 2. Initialize Database & Seed Demo Data

```bash
cd D:\PROJECT\PAYPAL\server

# 1. Generate Prisma Client
npx prisma generate

# 2. Run Database Migrations
npx prisma migrate dev --name init_paypilot_postgres

# 3. Seed Realistic Demo Data
npx prisma db seed
```

The seed script populates:
- **2 Users** (System Admin, Compliance Auditor)
- **16 Customers** with realistic contact info and spend histories
- **22 Products** across 6 categories (Keyboards, Audio, Accessories, Monitors, Wearables, Laptops)
- **35 Orders, Payments, Transactions, and PaymentOrders**
- **17 Risk Assessments** with realistic fraud scores and flags
- **12 AI Insights** and **9 Strategic AI Recommendations**
- **6 Agents** and **18 Historical Agent Runs**
- **12 Operator Notifications**, **10 Compliance Audit Logs**, and **10 Business Metrics**
- **8 Application Settings**

### 3. Run the Applications

Start both services locally:

```bash
# Terminal 1 — Backend Server (Next.js 16)
cd D:\PROJECT\PAYPAL\server
npm run dev

# Terminal 2 — Frontend Client (Vite + React)
cd D:\PROJECT\PAYPAL\client
npm run dev
```

Open **`http://localhost:5173`** to access PayPilot AI. The Vite client automatically proxies all `/api/*` traffic to `http://localhost:3000`.

### 4. Build & Verify Both Services

```bash
# Build Client (Vite)
cd D:\PROJECT\PAYPAL\client
npm run build

# Build Server (Next.js + Prisma)
cd D:\PROJECT\PAYPAL\server
npm run typecheck
npm run build

# Run Full Test Suite
npm test
```

---

## ☁️ Vercel Multi-Service Deployment (`vercel.json`)

The project is configured for Vercel multi-service deployment with shared routing and internal service bindings:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "client": {
      "root": "client",
      "framework": "vite"
    },
    "server": {
      "root": "server",
      "framework": "nextjs"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "server"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "client"
      }
    }
  ]
}
```

- **Client Service:** Built with Vite, serving the single-page application.
- **Server Service:** Built with Next.js, hosting the App Router API handlers and Prisma ORM client connecting to PostgreSQL via pooled `DATABASE_URL`.
- **Top-Level Rewrites:** Route `/api/*` to the `server` backend, and all other routes `/(.*)` to the `client` frontend under a single unified domain.

---

## 🛡️ Security & Integrity Principles

1. **AI Never Owns Money:** AI agents generate proposals; only authenticated human users can trigger payment authorizations.
2. **Server-Authoritative Pricing:** Product prices are retrieved strictly from the PostgreSQL database, immune to client manipulation.
3. **Zero Leaked Secrets:** Database connection strings and PayPal API secrets remain strictly backend-only.
4. **Idempotent Operations:** Unique order references and webhook event IDs prevent duplicate charges or repeated processing.
5. **Defense-in-Depth:** Sliding-window rate limiting, request size limits, and sanitizing error responses safeguard system availability.
