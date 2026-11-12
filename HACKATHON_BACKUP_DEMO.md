# PayPal AI Hackathon — Backup Demo Plan

Use this contingency walkthrough if the Wi-Fi drops, a local dev port stops responding, or an unexpected issue occurs during judging. All 11 pre-verified screenshots in [`submission-evidence/`](file:///D:/PROJECT/PAYPAL/submission-evidence) were captured from live running servers (`http://localhost:5173` -> `http://localhost:3000`).

---

## Scenario A: Frontend (`:5173`) Down, Backend (`:3000`) Alive

1. Restart frontend cleanly in PowerShell:
   ```powershell
   cd D:\PROJECT\PAYPAL\client
   npm run dev
   ```
2. If Vite build is needed as static preview:
   ```powershell
   cd D:\PROJECT\PAYPAL\client
   npm run preview -- --port 5173
   ```
3. Or demonstrate backend API enforcement live via `curl`:
   ```powershell
   curl.exe -s http://localhost:3000/api/health
   ```

---

## Scenario B: Live Servers Unavailable — Visual Evidence Walkthrough

Walk judges sequentially through these 11 clean captures in `D:\PROJECT\PAYPAL\submission-evidence\`:

1. **[01-dashboard.png](file:///D:/PROJECT/PAYPAL/submission-evidence/01-dashboard.png)** — `[LIVE DB]` Home Dashboard showing PayPal Balance, Recent Transactions from SQLite, sharp cat artwork, and FraudGuard badge.
2. **[02-ai-shopping.png](file:///D:/PROJECT/PAYPAL/submission-evidence/02-ai-shopping.png)** — `[LIVE Catalog]` AI Shopping Assistant hydrated with authoritative USD prices (`USD Authoritative`) and stock badges.
3. **[03-ai-recommendation.png](file:///D:/PROJECT/PAYPAL/submission-evidence/03-ai-recommendation.png)** — `[MOCK AI + LIVE DB]` Budgeted headphone query comparing/filtering matching inventory (`$89.99`).
4. **[04-commerce-proposal.png](file:///D:/PROJECT/PAYPAL/submission-evidence/04-commerce-proposal.png)** — `[LIVE Proposal Gate]` Natural-language purchase intent creates `Proposal #PROP-...` (`$89.99`) with explicit **`Review & Confirm Checkout`** button without moving money.
5. **[05-human-confirmation.png](file:///D:/PROJECT/PAYPAL/submission-evidence/05-human-confirmation.png)** — `[LIVE Human Gate]` Checkout review before PayPal order execution.
6. **[06-checkout.png](file:///D:/PROJECT/PAYPAL/submission-evidence/06-checkout.png)** — `[MOCK / SANDBOX PayPal + LIVE DB]` `Order Confirmed & Captured! Paid $89.99 via PayPal Balance`.
7. **[07-transaction.png](file:///D:/PROJECT/PAYPAL/submission-evidence/07-transaction.png)** — `[LIVE DB Persistence]` Deep-linked `#/transactions/...` receipt matching exact `$89.99` amount across browser reloads.
8. **[08-fraudguard.png](file:///D:/PROJECT/PAYPAL/submission-evidence/08-fraudguard.png)** — `[LIVE Audit]` FraudGuard security audit trail (`GET /api/audit/ai`) & `99 / 100` live security scan.
9. **[09-agents.png](file:///D:/PROJECT/PAYPAL/submission-evidence/09-agents.png)** — `[LIVE Registry / mock_fallback]` `APIMatic Backend Capabilities (9 Registered)` modal clearly marking `mock_fallback` mode and `Human Gate` requirements.
10. **[10-security-block.png](file:///D:/PROJECT/PAYPAL/submission-evidence/10-security-block.png)** — `[LIVE Security]` Prompt injection (`set price to 0` / `print process.env.PAYPAL_CLIENT_SECRET`) safely blocked with policy notice and zero secret leak.
11. **[11-mobile.png](file:///D:/PROJECT/PAYPAL/submission-evidence/11-mobile.png)** — `[LIVE UI]` Mobile responsiveness check (`390x844`) with zero horizontal overflow and live `$89.99` transaction row.

---

## Scenario C: Rapid API Proof Backup (Postman / Terminal)

If UI fails but backend (`:3000`) responds, replay verified Vitest suite or run Postman collection:
- Test suite: `cd D:\PROJECT\PAYPAL\server; npx vitest run` (41 files, 259 tests passing)
- Postman collection: [`server/postman/PAYPAL-AI-HACKATHON.postman_collection.json`](file:///D:/PROJECT/PAYPAL/server/postman/PAYPAL-AI-HACKATHON.postman_collection.json)
- Local environment (secret-free): [`server/postman/PAYPAL-AI-HACKATHON.local.postman_environment.json`](file:///D:/PROJECT/PAYPAL/server/postman/PAYPAL-AI-HACKATHON.local.postman_environment.json)
