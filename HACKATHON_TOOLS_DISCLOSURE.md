# PayPal AI Hackathon — Sponsor Tools & Technology Disclosure

This document provides a strict, evidence-based disclosure of third-party tools, sponsor technologies, and platform integrations in accordance with hackathon evaluation guidelines.

---

## 1. Summary of Tools

### ACTUALLY USED & CLAIMABLE

| Tool / Technology | Category | Implementation & Evidence in Repository | Runtime Verified? | Can Claim Hackathon Prize? |
|---|---|---|---|---|
| **PayPal Developer Platform (Sandbox API & Orders v2)** | Primary Payment Rail | Complete Orders v2 integration (`createOrder`, `captureOrder`, `getOrder`), client credentials OAuth2, idempotency (`PayPal-Request-Id`), webhook verification pipeline, and financial state machine in `server/src/server/paypal/*`. Supports real Sandbox with deterministic mock fallback. | **YES** (100% test & local runtime pass; real Sandbox credential verification blocked on user keys) | **YES (Primary Challenge Prize)** |
| **Postman** | API Quality & Testing | Production Postman collection (`PAYPAL-AI-HACKATHON.postman_collection.json`, 15 folders, 24 routes) and secret-free environment (`PAYPAL-AI-HACKATHON.local.postman_environment.json`) in `server/postman/`. | **YES** (Collection covers all routes, status codes, schemas, and error cases) | **YES (Postman Sponsor Prize)** |
| **AG Grid** | Enterprise Data Presentation | `ag-grid-community` (^36.3.0) and `ag-grid-react` (^36.3.0) installed and used in `server/src/components/ProductCatalogGrid.tsx` with sorting, column contracts, status badges, and custom renderers. (Note: Client app uses Argon-inspired `DataTable.tsx` to preserve approved frozen UI). | **YES** (Imported, compiled in Next.js backend, and verified via `tests/phase8-ui-ag-grid.test.ts`) | **YES (AG Grid Sponsor Prize)** |

---

### MODELED / ARCHITECTURAL INSPIRATION (NOT DIRECT CLOUD SPONSOR SDK)

| Tool / Technology | Nature of Use | Reality & Evidence in Repository | Can Claim Sponsor Prize? |
|---|---|---|---|
| **APIMatic** | Capability Modeling & Schema Specification | `APIMaticProvider` in `server/src/server/agent-context/providers/apimatic-provider.ts` models 9 strongly-typed capabilities across `READ_ONLY`, `LOW_RISK_WRITE`, and `HIGH_RISK_FINANCIAL` risk tiers. Cloud endpoint polling is implemented, but local development operates via `MockAPIContextProvider` because no remote APIMatic API key is configured. | **NO (Honest Disclosure: Architectural Inspiration Only)** |
| **Elasticsearch** | Search Provider Abstraction | Official `@elastic/elasticsearch` client (^9.5.1) is installed and implemented in `server/src/server/commerce/search/elastic-provider.ts` with 64-dim dense vector mappings. Because no remote cluster is connected, the engine executes via `MockSearchProvider` (deterministic BM25 + cosine similarity). | **NO (Honest Disclosure: Abstraction Implemented, Cloud Unconnected)** |

---

### NOT USED (EXPLICITLY DISCLOSED)

The following sponsor tools were mentioned in generic hackathon prompts or partner shelves but are **NOT USED** in this repository. We explicitly refrain from claiming prizes for them:

| Tool | Status | Explanation |
|---|---|---|
| **Render** | **NOT USED** | Application runs on local developer workstations (Vite on port 5173, Next.js on port 3000); not deployed to Render. |
| **Channel3** | **NOT USED** | Product catalog intelligence is implemented using custom SQLite/Prisma schemas and internal heuristic ranking engines, not Channel3 SDK. |
| **Bryntum** | **NOT USED** | No Gantt or scheduling components required for this commerce platform. |
| **Kernel** | **NOT USED** | No Kernel SDKs or kernel-level isolation technologies used. |
| **Astropods** | **NOT USED** | No Astropods services or packages utilized. |

---

## 2. Integrity Declaration

This project prioritizes engineering transparency over inflated claims. Sponsor prize submissions are restricted strictly to **PayPal Developer Platform**, **Postman**, and **AG Grid**, where verifiable code and runtime tests exist in this codebase.
