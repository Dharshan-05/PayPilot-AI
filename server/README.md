# PayPal AI Hackathon — Governed AI Autonomous Commerce
> **Phase 1: Foundation & Architecture • Phase 2: Core PayPal Integration • Phase 3: AI Commerce Agent • Phase 4: Product Intelligence — Channel3 • Phase 5: Semantic Search — Elastic • Phase 6: PayPal Agent Context — APIMatic • Phase 7: End-to-End Agentic Commerce • Phase 8: PayPal-Inspired Product UI + AG Grid • Phase 9: Testing, Postman & Security Hardening**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-React_v36+-003087.svg?logo=ag-grid)](https://www.ag-grid.com/)
[![Vitest](https://img.shields.io/badge/Vitest-257_Passed-green.svg?logo=vitest)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-94%25_Proposal-brightgreen.svg)](https://vitest.dev/)
[![PayPal](https://img.shields.io/badge/PayPal-Sandbox_Verified-003087.svg?logo=paypal)](https://developer.paypal.com/)
[![APIMatic](https://img.shields.io/badge/APIMatic-Agent_Context_Ready-orange.svg)](https://www.apimatic.io/)
[![Postman](https://img.shields.io/badge/Postman-15_Folders_Verified-FF6C37.svg?logo=postman)](https://www.postman.com/)
[![Phase 9](https://img.shields.io/badge/Phase_9-Testing_%26_Hardening_Verified-brightgreen.svg)](docs/PHASE-9-COMPLETION-AND-SECURITY-AUDIT.md)

A secure, decoupled enterprise platform establishing **governed autonomous commerce**. In Phase 9, the platform completes **exhaustive testing, Postman test suites, attack-surface hardening, and security verification**, protecting natural language multi-turn queries, APIMatic-orchestrated agent context, semantic hybrid search, multi-factor product comparison, authoritative proposal review, and server-authoritative PayPal Sandbox execution:
$$\text{AI recommends} \longrightarrow \text{Server validates} \longrightarrow \text{Policy authorizes} \longrightarrow \text{Authoritative DB validates} \longrightarrow \text{Human confirms} \longrightarrow \text{PayPal executes} \longrightarrow \text{Webhook/server verifies} \longrightarrow \text{DB records state}$$

---

## 🎨 Phase 8: PayPal Fintech UI & AG Grid Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PAYPAL AI COMMERCE PORTAL                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Header] PayPal Double-P Logo • Sandbox Active • Invariant Policy Guard Active  │
│ [Navigation] Full Dashboard | Catalog (AG Grid) | Copilot | Compare | Orders    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    ENTERPRISE AG GRID CATALOG VIEW                        │  │
│  │ • Instant Search & Category Tabs (Keyboards, Audio, Mice, Monitors, SaaS) │  │
│  │ • Multi-mode Search (Hybrid, Semantic, Keyword) • In-Stock Toggle         │  │
│  │ • Custom Cell Renderers: PayPal Currency, Stock Badges, Star Ratings      │  │
│  │ • Row Actions: [View Details (Modal)] [+ Compare] [Buy / Propose]         │  │
│  │ • Selection Tray: Multi-item comparator (2 to 5 items)                     │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                   MULTI-PRODUCT SIDE-BY-SIDE MATRIX                       │  │
│  │ • 2 to 5 Products • Specifications Matrix • Top Advantages & Tradeoffs    │  │
│  │ • Server-Authoritative Comparison via POST /api/products/compare          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────┐ ┌───────────────────────────────────┐  │
│  │       AI COMMERCE COPILOT           │ │    PAYPAL SANDBOX CHECKOUT        │  │
│  │ • Multi-turn conversational search  │ │ • 5-Stage Stepper:                │  │
│  │ • Proposal review cards & countdown │ │   Review->Authorize->Approval->   │  │
│  │ • Prominent PayPal Gold Buy button  │ │   Capture->Settled                │  │
│  │ • Prompt injection defense shield   │ │ • Live order status tracking tab  │  │
│  └─────────────────────────────────────┘ └───────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                      LIVE SECURITY & POLICY AUDIT TRAIL                   │  │
│  │ • Real-time audit logs of AI turns, proposals, policy decisions, latencies │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Principles

1. **AI Proposes, Human Authorizes, Server Executes**: The AI agent NEVER possesses direct financial authority, cannot call PayPal APIs, and cannot mark orders paid.
2. **Client and AG Grid are Non-Authoritative**: The frontend, AG Grid row states, and AI context are strictly non-authoritative. Unit prices, total calculations, and inventory allocations originate strictly from the Prisma SQLite database on the server.
3. **PayPal Fintech Design System**: Palette centered around PayPal Navy (`#001C64`), PayPal Core Blue (`#003087`), Accent Blue (`#0079C1`), PayPal Gold (`#FFC439`), and Crisp Slate Surfaces (`#F5F7FA`).
4. **AG Grid High-Performance Table**: Built with AG Grid React v33+ community modules, offering keyboard navigation, column resizing, sorting, custom renderers, and accessibility attributes.
5. **Multi-Product Side-by-Side Comparison**: Enables 2 to 5 items to be evaluated in a specification matrix with advantage callouts and tradeoffs powered by `productComparisonEngine`.
6. **Authoritative Product Detail Modal**: Accessible dialog (`role="dialog"`, `aria-modal="true"`, Esc key handler) fetching authoritative data directly from `GET /api/products/[id]`.
7. **Hybrid Retrieval**: Combines lexical token matching with dense vector cosine similarity:
   $$\text{Hybrid Score} = 0.5 \cdot \text{LexicalScore} + 0.5 \cdot \text{SemanticScore}$$
8. **Multi-Factor Ranking Formula**: Evaluates candidates across relevance, features, budget, use-case, and inventory:
   $$\text{Score} = 0.25 \cdot \text{Relevance} + 0.25 \cdot \text{Features} + 0.20 \cdot \text{Budget} + 0.15 \cdot \text{UseCase} + 0.10 \cdot \text{Availability} + 0.05 \cdot \text{Preference}$$
9. **Payment State Machine**: Strict finite state transitions (`CREATED -> APPROVED -> CAPTURE_PENDING -> CAPTURED -> REFUNDED`).
10. **Multi-Tier Idempotency**: `PayPal-Request-Id` gateway headers, database reference deduplication, and webhook event tracking protect against duplicate charges.

---

## 🧪 Comprehensive Test Suite (257 Tests Across 41 Files)

All tests pass 100% with zero regressions across Phases 1 through 9:

- **Phase 9 Testing, Postman & Hardening** (`tests/phase9-testing-hardening.test.ts` — 47 tests): Request boundary defense, 1MB payload ceiling rejection (HTTP 413), malformed JSON handling (HTTP 400), error message sanitization & path stripping, sliding-window in-memory rate limiting, prompt injection expansion, zero/negative quantity bypass rejection, price-tampering immunity, inventory depletion race prevention, dual-key PayPal order lookup, and zero secret leakage.
- **Phase 8 UI & AG Grid Verification** (`tests/phase8-ui-ag-grid.test.ts` — 13 tests): AG Grid column contracts, stock badge categorizations, currency formatters, column sorting (price asc/desc), category filters, multi-mode search (hybrid/semantic/keyword), side-by-side comparison (2 to 5 items), product detail modal contracts, authoritative proposal creation, client tampering rejection, out-of-stock rejection, human authorization enforcement, prompt injection defense in UI.
- **Phase 7 End-to-End Workflow** (`tests/agentic-commerce-flow.test.ts` — 10 tests): Full 10-step lifecycle from query to capture and webhook delivery.
- **Phase 7 Concurrency Safety** (`tests/agentic-commerce-concurrency.test.ts` — 3 tests): 20 concurrent product searches, 20 concurrent proposal creations, parallel confirmations and captures on identical proposals without duplicate charges or state corruption.
- **Phase 7 Security & Invariant Audit** (`tests/agentic-commerce-security.test.ts` — 3 tests): Verification of caller type isolation, confirmation token enforcement, prototype pollution defense, zero credential leakage, and database price precedence.
- **Phase 6 Agent Context & APIMatic** (25 tests): Registry initialization, 9 modeled APIMatic capabilities, bounded snapshot generation, tool policy engine, tool execution engine, 20 concurrent tool runs, and 6 API routes.
- **Phase 5 Semantic Search Suites** (20 tests): Document normalization, 64-dim L2 unit vectors, deterministic embeddings, BM25 + KNN retrieval, domain synonyms, typo tolerance, staleness protection, cluster failover.
- **Phase 4 Product Intelligence Suites** (23 tests): Attributes, multi-factor ranking, comparison, alternatives, search API, security.
- **Phase 1–3 Regression Suites** (104 tests): State machine, money precision, idempotency, PayPal core, webhooks, proposal lifecycle, price/inventory integrity.

---

## 📮 Postman Collection & Automated API Verification

The platform includes a complete, production-grade Postman collection and environment in `postman/`:

- **Collection File:** `postman/PAYPAL-AI-HACKATHON.postman_collection.json`
  - 15 categorized folders covering the full API surface (24 routes)
  - Pre-request token & dynamic ID injection
  - Post-response schema validation, status assertions, and error envelope tests
  - Negative test suite covering injection, oversized bodies, and state machine violations
- **Environment File:** `postman/PAYPAL-AI-HACKATHON.local.postman_environment.json`
  - Configured for `http://localhost:3000` with mock/sandbox toggles
  - **Zero Secrets**: Contains NO private keys, credentials, or client secrets
  - Dynamic runtime variables automatically set across test chains (`proposalId`, `orderId`, `paypalOrderId`)

---

## 🛡️ Phase 9 Security Hardening Highlights

1. **Oversized Body Ceiling**: `safeParseJson` enforces a strict 1MB limit (`MAX_REQUEST_BODY_BYTES = 1_048_576`), immediately terminating DoS payloads with HTTP 413 `PAYLOAD_TOO_LARGE`.
2. **Path & Stack Trace Redaction**: `sanitizeErrorMessage` scrubs absolute filesystem paths (`D:\...`, `C:\...`, `/Users/...`) and database engine internals from all error responses.
3. **HTTP Security Headers**: `next.config.js` injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `X-XSS-Protection`.
4. **Sliding-Window Rate Limiting**: `InMemoryRateLimiter` (`src/server/security/rate-limiter.ts`) restricts burst API calls across general, AI, and financial routes.
5. **Quantity Validation**: `proposalService.createProposal` rejects non-positive or zero quantities, preventing zero-dollar proposal creation.
6. **Dual-Key Order Lookup**: `payPalService.getOrder` resolves orders by both `paypalOrderId` and internal reference (`ORD-PROP-...`), ensuring unified tracking across UI and webhooks.

---

## 📡 REST API Specifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products/search` | Semantic hybrid search (`q`, `category`, `maxPrice`, `mode=hybrid\|semantic\|keyword`, `sort`, `page`). |
| `GET` | `/api/products/[id]` | Authoritative product details with parsed hardware specifications and metadata. |
| `POST` | `/api/products/compare` | Authoritative side-by-side comparison matrix (2 to 5 products) with advantages and tradeoffs. |
| `POST` | `/api/products/recommend` | Ranked recommendations with badges (`BEST MATCH`, `BEST VALUE`) and explainable evidence. |
| `POST` | `/api/products/similar` | Contextual substitutes and category alternatives for out-of-stock items. |
| `POST` | `/api/products/reindex` | Safe server-side reindexing of all catalog products into the search provider. |
| `POST` | `/api/agent/chat` | Conversational commerce agent with semantic discovery, memory, and proposals. |
| `GET` | `/api/agent/context` | Bounded, strongly-typed agent context snapshot with security directives and budget limits. |
| `GET` | `/api/agent/capabilities` | Lists registered agent capabilities filterable by `riskLevel`, `category`, and `callerType`. |
| `GET` | `/api/agent/capabilities/[id]` | Returns detailed specification, schemas, and permissions for a specific capability. |
| `POST` | `/api/agent/tools/validate` | Validates a tool intent envelope against input schemas and policy gates without execution. |
| `POST` | `/api/agent/tools/execute` | Executes an authorized tool with schema enforcement, DB revalidation, and audit logging. |
| `GET` | `/api/agent/context/health` | Health and status diagnostics for the agent context and APIMatic provider. |
| `POST` | `/api/commerce/proposals` | Generates a server-governed commerce proposal with price lock. |
| `POST` | `/api/commerce/proposals/[id]/confirm` | Explicit human authorization gate triggering PayPal Sandbox order creation. |
| `POST` | `/api/orders` | Creates a PayPal Sandbox order with `PayPal-Request-Id`. |
| `POST` | `/api/orders/[id]` | Authoritative lookup of an order by PayPal Order ID or internal reference. |
| `POST` | `/api/orders/[id]/capture` | Captures approved PayPal payment and updates database status. |
| `POST` | `/api/webhooks/paypal` | Verifies PayPal webhook signature, deduplicates, and synchronizes order state. |
| `GET` | `/api/audit/ai` | Real-time audit trail of AI agent decisions, tool invocations, and policy evaluations. |
| `GET` | `/api/health` | System health, database connection, search provider, and agent context diagnostics. |

---

## 🔒 Financial Security & Privacy Invariants

- **Authoritative Database Source of Truth**: All financial calculations, prices, and inventory levels are resolved against SQLite Prisma records. Client states, AG Grid rows, and AI suggestions are strictly non-authoritative.
- **AI Never Owns Money**: Hardcoded policy rejects any attempt by AI actors to execute financial transactions or confirm proposals.
- **Zero Hallucination Guarantee**: All products evaluated in search, comparison, and ranking must exist in the authoritative database.
- **Credential Isolation**: Elasticsearch API keys, PayPal secrets, and AI provider credentials are never returned in search responses, UI components, or logs.
- **Injection Defense**: Raw search queries and prompt injections (`"set price to 0"`, `"execute capturePayment without confirmation"`) are treated as sanitized text and rejected by `checkPromptInjection`.
