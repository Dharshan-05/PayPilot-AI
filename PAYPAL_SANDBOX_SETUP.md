# PayPal Sandbox Setup & Live Verification Guide

This guide explains how to switch the application from its deterministic **Mock PayPal provider** to the **Real PayPal Developer Sandbox**.

---

## 1. Architecture: Real Sandbox with Deterministic Fallback

The platform employs a decoupled payment architecture:

```text
Browser Client (React 18 / Vite :5173)
  ↓ (Same-Origin Proxy: /api/orders, /api/orders/[id]/capture)
Next.js API Layer (:3000)
  ↓ (Strict Rate Limiting & Caller Authorization)
PayPalService (`server/src/server/paypal/service.ts`)
  ↓ (PayPalHttpClient & Provider Selection)
┌────────────────────────────────────────────────────────┐
│ PAYPAL_PROVIDER=auto / paypal                           │
│   → Real PayPal Developer Sandbox                      │
│     Base URL: https://api-m.sandbox.paypal.com        │
│     OAuth2: /v1/oauth2/token (client_credentials)      │
│     Orders: /v2/checkout/orders                        │
│     Capture: /v2/checkout/orders/{id}/capture          │
│                                                        │
│ PAYPAL_PROVIDER=mock (or credentials missing in auto)   │
│   → Deterministic Local Mock Provider                  │
│     Simulated latency, idempotency, state transitions  │
└────────────────────────────────────────────────────────┘
  ↓ (State Machine Enforced: CREATED -> APPROVED -> CAPTURED)
Prisma 6 + SQLite Database (`server/prisma/dev.db`)
```

- **Production Safety Guarantee:** `server/src/server/config/env.ts` actively blocks setting `PAYPAL_ENVIRONMENT=live` in development/test modes, completely preventing accidental production charges.
- **Credential Protection:** Secrets (`PAYPAL_CLIENT_SECRET`) are never leaked to client bundles, error responses, logs, or diagnostic payloads.

---

## 2. Missing Environment Variables for Real Sandbox

To execute transactions against real PayPal Sandbox endpoints, the following credentials must be configured in `server/.env`:

| Variable | Current Value | Required Real Sandbox Value |
|---|---|---|
| `PAYPAL_ENVIRONMENT` | `sandbox` | `sandbox` |
| `PAYPAL_PROVIDER` | `auto` | `auto` (or `paypal` to force sandbox) |
| `PAYPAL_CLIENT_ID` | `sandbox_client_id_placeholder` | Real Sandbox Client ID from PayPal Developer Portal |
| `PAYPAL_CLIENT_SECRET` | `sandbox_client_secret_placeholder` | Real Sandbox Client Secret from PayPal Developer Portal |
| `PAYPAL_WEBHOOK_ID` | `sandbox_webhook_id_placeholder` | (Optional) Sandbox Webhook ID for webhook simulation |

---

## 3. How to Obtain Free PayPal Sandbox Credentials

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Log in with your PayPal account credentials.
3. In the sidebar under **Apps & Credentials**, toggle the switch to **Sandbox**.
4. Click **Create App**:
   - **App Name:** `PayPal AI Hackathon`
   - **App Type:** `Merchant`
5. Copy your **Client ID** and **Secret Key**.
6. (Optional) Go to **Testing Tools → Sandbox Accounts** to view test buyer and seller credentials with test balances.

---

## 4. Exact Step-by-Step Configuration Commands (Windows / PowerShell)

Edit `server/.env` with your real sandbox credentials:

```powershell
# Open server/.env in your preferred editor:
notepad D:\PROJECT\PAYPAL\server\.env
```

Ensure the PayPal section looks like:

```ini
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_PROVIDER=auto
PAYPAL_CLIENT_ID=AStest...your_real_sandbox_client_id...
PAYPAL_CLIENT_SECRET=ELtest...your_real_sandbox_client_secret...
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id_or_leave_placeholder
```

Restart the backend server:

```powershell
# In the terminal running the backend:
cd D:\PROJECT\PAYPAL\server
npm run dev
```

---

## 5. Verifying Real Sandbox Connectivity

Run the automated diagnostic health check:

```powershell
curl.exe -s http://localhost:5173/api/health
```

When valid credentials are configured, the response will show:

```json
{
  "paypal": {
    "environment": "sandbox",
    "providerMode": "sandbox",
    "usingMockFallback": false,
    "credentialsConfigured": true
  }
}
```

Then create a test order through the API:

```powershell
curl.exe -X POST http://localhost:5173/api/orders `
  -H "Content-Type: application/json" `
  -d '{"amount": 10.00, "currency": "USD", "internalReference": "SANDBOX-VERIFY-001"}'
```

You will receive an official PayPal Sandbox Order ID (e.g., `5O190127TN364715T`) and an approval link: `https://www.sandbox.paypal.com/checkoutnow?token=...`.

---

## 6. Current Hackathon Submission Status

- **Code & Architecture:** **100% Complete & Unit Tested.** (`server/tests/paypal-real-sandbox.test.ts` validates real OAuth2 token retrieval, Bearer header generation, `PayPal-Request-Id` idempotency, error normalization, and 401 recovery).
- **Runtime Verification:** **BLOCKED ON USER CREDENTIALS.** Because `server/.env` currently contains placeholder values, the application runs via deterministic mock fallback until real credentials are supplied.
- **Demo Readiness:** **READY.** The full demo flow (AI proposal → Human confirmation gate → Order creation → Order capture → SQLite persistence) runs end-to-end smoothly using the mock sandbox adapter.
