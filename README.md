# PayPal AI Hackathon — Governed Autonomous Agentic Commerce

**AI recommends. Server validates. Policy authorizes. Database verifies price & inventory. Human confirms. PayPal executes.**

An end-to-end governed agentic commerce platform that separates **AI shopping intelligence** from **financial execution authority** — enabling natural-language product discovery, server-authoritative checkout proposals, prompt-injection defense, and auditable payment capture without ever letting an LLM or browser client control money, prices, or credentials.

---

## 🎯 Problem Statement

Modern AI shopping assistants create severe fintech trust and security risks when connected directly to payment rails:

1. **Prompt Injection & Price Tampering:** Attackers trick LLMs into changing item prices to `$0.01`, bypassing approval, or exfiltrating server API keys.
2. **Unauthorized Autonomous Spend:** Giving AI agents direct permission to create or capture PayPal orders leads to silent, unapproved charges and hallucinated SKUs.
3. **Opaque Capabilities & Unbounded Context:** Agents without typed API context guess invalid parameters or attempt privileged operations without audit trails.

---

## 💡 Solution Overview

This repository (`D:\PROJECT\PAYPAL`) pairs a tactile, high-craft **React 18 + Vite 5.4** dashboard (`client/`) with a **Next.js 16 + Prisma 6 + SQLite** financial control plane (`server/`):

- **Strict Financial Authority Boundary:** AI agents can search products and *propose* purchases (`PENDING_CONFIRMATION`), but are strictly blocked (`403 FORBIDDEN_AI_ACTION` / `403 FORBIDDEN_OPERATION`) from confirming proposals or invoking `paypal.createOrder` / `paypal.capturePayment`.
- **Database-Authoritative Pricing & Inventory:** Product prices, currencies (`USD`, `EUR`, `GBP`, `CAD`, `AUD`), stock counts, and totals (`<= $1,000.00`) are resolved solely from Prisma SQLite records — client payloads and AI outputs are treated as untrusted.
- **Same-Origin Proxy Isolation:** The Vite frontend communicates exclusively over same-origin `/api/*` requests; server secrets (`PAYPAL_CLIENT_SECRET`, `AI_API_KEY`, `ELASTICSEARCH_API_KEY`, `APIMATIC_API_KEY`, `DATABASE_URL`) never enter browser bundles.

---

## ⭐ Key Innovations

- **5-Gate Governed Commerce Pipeline:** Discovery -> Authoritative Proposal -> Human Confirmation Gate -> PayPal Orders v2 State Machine -> Persisted Transaction & FraudGuard Audit Trail.
- **APIMatic-Modeled Agent Capability Registry:** 9 typed tool operations across `READ_ONLY`, `LOW_RISK_WRITE`, and `HIGH_RISK_FINANCIAL` risk tiers with explicit `Human Gate` enforcement.
- **Hybrid Lexical + Semantic Search Engine:** Combines BM25 token matching, domain synonyms, typo tolerance, and 64-dimensional L2 unit vector cosine similarity (`0.5 * Lexical + 0.5 * Semantic`), ready for Elasticsearch or deterministic local fallback.
- **Defense-in-Depth Hardening:** 1 MB JSON payload ceiling (`413`), path/stack redaction, prompt-injection shield (`POLICY_BLOCKED`), prototype pollution filtering, atomic inventory reservation, and live HTTP sliding-window rate limiting (`429 RATE_LIMIT_EXCEEDED`).

---

## 🏗️ System Architecture

```text
+-----------------------------------------------------------------------------------+
|                        CLIENT APPLICATION (client/ :5173)                         |
|   React 18 • TypeScript 5.6 • Vite 5.4 • Tailwind CSS • 19 HashRouter Views       |
|   Home • Send Money • AI Shopping • Product Discovery • Checkout • Transactions   |
|   Product Details • FraudGuard (Live Audit) • AI Agents (APIMatic Capabilities)   |
+-----------------------------------------+-----------------------------------------+
                                          | Same-origin proxy (/api/* -> :3000)
                                          v
+-----------------------------------------------------------------------------------+
|                     CONTROL PLANE & API SERVER (server/ :3000)                    |
|                Next.js 16.4 App Router • 24 REST API Route Handlers               |
+-----------------------------------------------------------------------------------+
|  SECURITY & POLICY LAYER                                                          |
|  • enforceRateLimit (429: 120/min general, 35/min sensitive AI/financial)         |
|  • safeParseJson (1 MB limit) • Prompt Injection Guard • Redacted Error Envelope  |
+-------------------+-------------------------+-------------------------+-----------+
                    |                         |                         |
                    v                         v                         v
+-------------------------+   +-----------------------------+   +-------------------+
| PRODUCT INTELLIGENCE &  |   | APIMATIC AGENT CONTEXT &    |   | COMMERCE & PAYPAL |
| SEMANTIC SEARCH         |   | COMMERCE COPILOT            |   | EXECUTION ENGINE  |
| • Hybrid Lexical+Vector |   | • 9 Typed Tool Capabilities |   | • Proposal Gate   |
| • Multi-factor Ranking  |   | • Caller Policy Enforcement |   | • Human Confirm   |
| • Comparison Engine     |   | • Budget & Guardrail Snap.  |   | • Orders v2 Flow  |
| • Elastic / Mock Adapter|   | • AI Audit Trail Logger     |   | • Mock / Sandbox  |
+------------+------------+   +--------------+--------------+   +---------+---------+
             |                               |                            |
             +-------------------------------+----------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------+
|                   AUTHORITATIVE PERSISTENCE (Prisma 6 + SQLite)                   |
|   server/prisma/dev.db: User • Product • CommerceProposal • PaymentOrder          |
|                         AIAuditLog • WebhookEvent                                 |
+-----------------------------------------------------------------------------------+
```

---

## ✨ Implemented Features

| Area | Implemented Capabilities | Execution Mode |
| :--- | :--- | :--- |
| **Home Dashboard (`#/`)** | Real balance calculation, live FraudGuard status indicator, SQLite recent transactions feed, interactive charts & category navigation | **LIVE (DB + API)** |
| **AI Shopping Assistant (`#/ai-shopping`)** | Conversational product discovery with budget extraction, proposal creation (`#PROP-...`), prompt-injection rejection (`POLICY_BLOCKED`), quick-prompt chips | **LIVE Proposal Flow (`AI_PROVIDER=mock`)** |
| **Product Discovery & Details (`#/discovery`, `#/product/:id`)** | Live catalog loading, hybrid semantic search, category/badge filters, deep-link lookup with graceful 404 Not Found state | **LIVE (DB + Mock Search)** |
| **Checkout (`#/checkout`)** | Authoritative order & proposal review, server-verified total calculation, PayPal Balance / Sandbox order creation & capture | **LIVE State Machine (Mock/Sandbox PayPal)** |
| **Send Money (`#/send-money`)** | P2P recipient transfer creating & capturing a real persisted `PaymentOrder` with amount validation (`> 0`, `<= $1,000`) | **LIVE State Machine (Mock/Sandbox PayPal)** |
| **Transactions & Receipt (`#/transactions`, `#/transactions/:id`)** | Full persisted history from SQLite; deep-linked detail receipts surviving full browser page reloads | **LIVE (DB + API)** |
| **FraudGuard (`#/fraudguard`)** | Live security telemetry from `/api/audit/ai` & `/api/health` + interactive live system scan (`99 / 100`) | **LIVE Audit Feed** |
| **AI Agents (`#/agents`)** | Displays live `9 APIMatic Capabilities (mock_fallback)` and `Human Gate` enforcement on financial operations | **LIVE Registry (`MockAPIContextProvider`)** |
| **Secondary Wallet Views** | `Request Money`, `Add Money`, `Rewards`, `Analytics`, `Notifications`, `Profile`, `Settings` | **LOCAL / DEMO STATE** |

---

## 🤖 AI & Agentic Commerce Architecture

1. **Intent & Budget Extraction (`/api/ai/intent`, `/api/agent/chat`):** Parses category, product keywords, and explicit budget constraints (ignoring hardware model numbers such as `K2` or `3S`).
2. **Product Intelligence & Semantic Search (`/api/products/search`, `/recommend`, `/compare`, `/similar`):** Ranks live SQLite products using weighted lexical + 64-d vector similarity and multi-factor scoring (`0.25 Relevance + 0.25 Features + 0.20 Budget + 0.15 UseCase + 0.10 Availability + 0.05 Preference`).
3. **APIMatic Capability Modeling (`/api/agent/context`, `/api/agent/capabilities`, `/api/agent/tools/*`):** Exposes 9 capabilities with strict risk classifications (`READ_ONLY`, `LOW_RISK_WRITE`, `HIGH_RISK_FINANCIAL`). High-risk operations carry `requiresConfirmation: true` (`Human Gate`).
4. **Proposal Lifecycle (`/api/commerce/proposals`):** AI drafts proposals locked to SQLite prices in `PENDING_CONFIRMATION`. Only a human caller with `userConfirmed: true` can confirm them (`POST /api/commerce/proposals/[proposalId]/confirm`).

---

## 💳 PayPal Payment Integration Architecture

- **Finite State Machine:** `CREATED -> APPROVED -> CAPTURE_PENDING -> CAPTURED -> REFUNDED` enforced server-side.
- **Two-Step Order & Capture:** `POST /api/orders` generates an idempotent order (`PayPal-Request-Id` / internal reference `ORD-...` + PayPal order ID), and `POST /api/orders/[orderId]/capture` finalizes payment settlement in SQLite.
- **Dual-Key Lookup:** `GET /api/orders/[orderId]` resolves both internal references and external PayPal order IDs cleanly.
- **Webhook Verification & Deduplication:** `POST /api/webhooks/paypal` tracks event IDs in `WebhookEvent` to prevent duplicate state transitions.

> **Transparency Note:** In the local workspace configuration (`server/.env`), `PAYPAL_CLIENT_ID` uses a sandbox placeholder, so `payPalService` deterministically executes through the built-in Mock/Sandbox adapter while preserving identical REST contracts, validation rules, and SQLite state transitions. Supplying live PayPal Sandbox/Live credentials switches the transport cleanly without frontend changes.

---

## 🛡️ Security Model & Verified Defenses

- **Zero Client Secrets:** Client bundle and source scans (`client/src/**`, `client/dist/**`) verify zero matches for `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`, `APIMATIC_SECRET`, or `DATABASE_URL`.
- **Caller & Gate Isolation:** Submitting `{ callerType: "ai_agent" }` to proposal confirmation or `{ operation: "paypal.capturePayment" }` to `/api/agent/tools/execute` returns HTTP `403`.
- **Prompt Injection Defense:** Payloads attempting instruction overrides, `$0` price overrides, gate bypasses, or `.env` exfiltration return `POLICY_BLOCKED` and create an `AIAuditLog` entry without generating a proposal.
- **HTTP Rate Limiting (`429 RATE_LIMIT_EXCEEDED`):** Sliding-window `enforceRateLimit` middleware protects general endpoints (120 req/min) and sensitive AI/financial endpoints (35 req/min) with `Retry-After` and `X-RateLimit-*` headers.
- **Payload & Error Hardening:** Requests exceeding `1,048,576` bytes fail with HTTP `413`; malformed JSON fails with HTTP `400`; error envelopes scrub stack traces and host filesystem paths.

---

## 🧪 Automated Test Suite Verification

- **Backend Automated Suite (`cd server && npx vitest run`):** **41 / 41 test files passed (259 / 259 tests passing)** covering Phases 1–9:
  - Phase 1–3 financial invariants, precision math, idempotency, PayPal state machine, webhooks
  - Phase 4–5 product intelligence ranking, comparisons, 64-dim vector similarity & hybrid search
  - Phase 6 APIMatic agent context, 9 capabilities, tool policy & concurrent tool execution
  - Phase 7 end-to-end commerce flow, concurrency locks, and security isolation
  - Phase 8 AG Grid catalog contracts & authoritative checkout flows
  - Phase 9 request limits (`413`), malformed JSON (`400`), error sanitization, HTTP route rate limiting (`429`), and prompt injection expansion

---

## 🚀 Quick Start (Local Demo Setup)

Requires Node.js 20+ and npm.

### 1. Start Backend (`server/` on `http://localhost:3000`)

```bash
cd D:\PROJECT\PAYPAL\server
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Start Frontend (`client/` on `http://localhost:5173`)

```bash
cd D:\PROJECT\PAYPAL\client
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser. Vite automatically proxies `/api/*` to `http://localhost:3000`.

### 3. Verify Health & Run Tests

```bash
curl http://localhost:5173/api/health
cd D:\PROJECT\PAYPAL\server && npx vitest run
```

---

## 🎬 Demo & Submission Documentation

- **[HACKATHON_DEMO_SCRIPT.md](file:///D:/PROJECT/PAYPAL/HACKATHON_DEMO_SCRIPT.md)** — Timed 3-minute live demo script distinguishing `[LIVE]`, `[MOCK / SANDBOX]`, and `[DEMO STATE]`
- **[HACKATHON_BACKUP_DEMO.md](file:///D:/PROJECT/PAYPAL/HACKATHON_BACKUP_DEMO.md)** — Offline screenshot & API fallback plan using `submission-evidence/`
- **[DEMO_CHECKLIST.md](file:///D:/PROJECT/PAYPAL/DEMO_CHECKLIST.md)** — Exact pre-demo verification steps & operator guardrails
- **[FINAL_HACKATHON_SUBMISSION_REPORT.md](file:///D:/PROJECT/PAYPAL/FINAL_HACKATHON_SUBMISSION_REPORT.md)** — Complete engineering, security, QA & judging readiness audit

---

## ⚠️ Explicit Limitations & Scope Transparency

1. **External Providers Run in Local Mock / Sandbox Fallback Mode:** `server/.env` configures placeholder credentials for PayPal (`PAYPAL_CLIENT_ID=sandbox_client_id_placeholder`), AI (`AI_PROVIDER=mock`), Search (`SEARCH_PROVIDER=mock`), and APIMatic (`APIMATIC_ENABLED=false`). All external gateways run deterministically offline without live third-party network calls.
2. **Client-Only Secondary Dashboard Tabs:** `Request Money`, `Add Money`, `Rewards`, `Analytics`, `Notifications`, `Profile`, `Settings`, and login session management currently operate in controlled client-side demo state (no backing database tables yet).
3. **In-Memory Rate Limiter Scope:** The active HTTP `429` rate limiter is process-local (`globalThis` memory store) rather than distributed Redis, suitable for single-node demos and ready for Redis replacement in production.

---

## 🗺️ Future Roadmap

- Connect live PayPal Sandbox / Production OAuth credentials and signed PayPal webhook verification in staging
- Enable live Gemini (`AI_PROVIDER=gemini`), Elasticsearch Cloud (`SEARCH_PROVIDER=elastic`), and APIMatic portal sync (`APIMATIC_ENABLED=true`)
- Back `Request Money`, `Add Money`, `Rewards`, `Analytics`, and `Notifications` with Prisma tables and REST endpoints
- Add multi-user OAuth/JWT authentication and Redis-backed distributed rate limiting
