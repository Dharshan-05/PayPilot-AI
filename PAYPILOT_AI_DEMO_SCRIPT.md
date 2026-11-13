# PAYPILOT AI — HACKATHON DEMO VIDEO SCRIPT & TELEPROMPTER
**Target Duration:** 2 minutes 15 seconds – 2 minutes 45 seconds  
**Live URL:** `http://localhost:5173`  
**Presenter:** Dharshan  

---

## 🎬 Pre-Recording Checklist (30 Seconds Before Hitting Record)

1. [x] **Backend Active:** `http://localhost:3000/api/health` returns `200 healthy`.
2. [x] **Frontend Active:** `http://localhost:5173` open in browser.
3. [x] **Browser Setup:**
   - Fullscreen mode (`F11` or maximize without bookmarks bar).
   - Zoom level set to **90% or 100%** (ensure all dashboard cards fit nicely).
   - Close all private tabs, chat notifications, Slack, Discord, and email popups.
4. [x] **Zero Exposure Rule:**
   - Never open `.env`, terminal windows, API keys, or PayPal client secret.
5. [x] **Copy This Ready Prompt to Clipboard (Optional backup):**
   ```text
   I want to buy the Anker Soundcore Space Q45 Headphones
   ```

---

## ⏱️ Step-by-Step Teleprompter & Action Guide

```
┌─────────────┬───────────────────────────┬────────────────────────────────────────────────────────┐
│ TIMECODE    │ SCREEN / URL              │ MOUSE / ACTION                                         │
├─────────────┼───────────────────────────┼────────────────────────────────────────────────────────┤
│ 0:00 - 0:15 │ Main Dashboard (`#/`)     │ Slow, smooth mouse sweep across hero & summary cards   │
│ 0:15 - 0:40 │ Main Dashboard (`#/`)     │ Hover/click Spending Overview, Transactions, Analytics │
│ 0:40 - 1:05 │ AI Shopping (`#/ai-shop`) │ Click prompt / show AI analysis & recommendations      │
│ 1:05 - 1:45 │ Checkout (`#/checkout`)   │ Authorize with PayPal Sandbox, show captured status    │
│ 1:45 - 2:10 │ Receipts / Intelligence   │ View SQLite receipt & FraudGuard transaction feed      │
│ 2:10 - 2:30 │ Architecture / UI Screen  │ Keep dashboard visible; explain server boundaries      │
│ 2:30 - 2:45 │ Main Dashboard Final      │ End on clean dashboard, hold 2-3 sec, stop recording   │
└─────────────┴───────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### [0:00 – 0:15] — INTRODUCTION
- **Screen:** PayPilot AI Main Dashboard (`http://localhost:5173/#/`)
- **Action:** Move the mouse slowly and smoothly across the hero banner, balance, and primary cards.
- **Speak (Confidence & Clarity):**
  > *"Hi, I'm Dharshan, and this is PayPilot AI, an agentic AI commerce copilot powered by PayPal.*
  >
  > *I built PayPilot AI to go beyond simply processing payments. It uses AI to understand transactions, identify risks, generate business insights, and help automate commerce operations."*

---

### [0:15 – 0:40] — DASHBOARD OVERVIEW
- **Screen:** Main Dashboard (`http://localhost:5173/#/`)
- **Action:** 
  1. Hover over the **Spending Overview** timeframe toggle (Week / Month / Year).
  2. Point to the **Recent Transactions** ledger showing real SQLite records.
  3. Briefly hover over **FraudGuard** security status badge and **Active Agents** card.
- **Speak:**
  > *"This is the PayPilot AI dashboard. It brings payment activity, transaction intelligence, analytics, AI insights, and commerce operations into one place.*
  >
  > *Instead of forcing a business owner to manually interpret every transaction, PayPilot AI creates an intelligent layer around the payment lifecycle."*

---

### [0:40 – 1:05] — AGENTIC AI & INTELLIGENCE
- **Screen:** Click **AI Shopping** on the sidebar or hero quick actions (`#/ai-shopping`)
- **Action:**
  1. Click one of the quick prompts or submit:
     > `I want to buy the Anker Soundcore Space Q45 Headphones`
  2. The AI assistant responds with real catalog comparison and creates a server-authoritative **Proposal #PROP-...** for `$89.99`.
  3. **Pause 2–3 seconds** with your mouse hovering on the proposal badge so the judges see the AI didn't execute an unauthorized payment.
- **Speak:**
  > *"The core of PayPilot AI is the agentic intelligence layer.*
  >
  > *The system can analyze transaction activity, identify unusual or potentially risky patterns, interpret payment behavior, and turn raw transaction information into actionable business insights.*
  >
  > *Instead of just showing data, the goal is to help answer the next question: what should the business do with this information?"*

---

### [1:05 – 1:45] — REAL PAYPAL PAYMENT & CAPTURE FLOW
- **Screen:** Click **`Review & Confirm Checkout`** (or go to `#/checkout`)
- **Action:**
  1. Show the checkout screen: product details ($89.99), shipping address, and funding method.
  2. Click **`Authorize & Pay with PayPal ($89.99)`**.
  3. Wait for the server-authoritative PayPal Orders v2 creation and capture to finish (takes ~1-2 seconds).
  4. The green success checkmark appears!
  5. Show the resulting details: **Order ID**, **Capture ID**, **Status: COMPLETED**.
- **Speak:**
  > *"Now I'll demonstrate the PayPal integration.*
  >
  > *PayPilot AI connects to the PayPal Sandbox environment through a secure backend integration. Sensitive PayPal credentials remain on the server and are never exposed to the browser.*
  >
  > *Here I am creating a real PayPal Sandbox order.*
  >
  > *After the payment is approved, PayPilot AI captures the order through the backend and receives the resulting payment status."*

---

### [1:45 – 2:10] — PAYMENT → TRANSACTION INTELLIGENCE
- **Screen:** Click **`View Receipt Details`** (navigates to `#/transactions/:id`) or return to **FraudGuard** (`#/fraudguard`)
- **Action:**
  1. Show the digital receipt rendered directly from SQLite (`GET /api/orders/:id`).
  2. Point to the exact amount parity ($89.99), PayPal transaction code, and timestamp.
  3. Briefly open **FraudGuard** (`#/fraudguard`) to show the transaction security monitoring and live AI audit event log.
- **Speak:**
  > *"This is where PayPilot AI goes beyond a traditional payment integration.*
  >
  > *The payment becomes part of the application's transaction intelligence layer, allowing the system to analyze activity and generate useful business information instead of treating the payment as an isolated event."*

---

### [2:10 – 2:30] — SECURITY & FINANCIAL ARCHITECTURE
- **Screen:** Keep the clean application UI visible on screen (e.g. FraudGuard or Main Dashboard). Do NOT open code or terminal.
- **Action:** Gently scroll or highlight the security status indicators.
- **Speak:**
  > *"The architecture separates the frontend from the secure payment backend. PayPal authentication, order creation, and capture are handled server-side, while the client receives only the information required by the application.*
  >
  > *I also implemented validation, idempotent capture handling, error handling, and secret-scrubbing checks."*

---

### [2:30 – 2:45] — FINAL CLOSE & PITCH
- **Screen:** Navigate back to the **Main Dashboard** (`#/`).
- **Action:** Let the full dashboard rest on screen. Keep the mouse steady.
- **Speak:**
  > *"PayPilot AI transforms payments from simple transactions into intelligent business signals.*
  >
  > *By combining PayPal's payment infrastructure with agentic AI, I built a system designed to help businesses understand what is happening, identify risks, automate workflows, and make smarter decisions.*
  >
  > *This is PayPilot AI."*
- **Action:** Hold screen silent for 2–3 seconds. **STOP RECORDING.**

---

## 💡 Quick Tips for a Flawless One-Take

1. **Pacing:** Don't rush! 2:15 to 2:45 is plenty of time. Speaking at a steady, measured pace sounds much more authoritative and professional.
2. **Smooth Cursor:** Move the cursor deliberately. Don't shake or circle the mouse rapidly.
3. **If a button takes 1 second to respond:** Keep talking calmly—never apologize or say "oops".
4. **Resolution:** 1080p (1920x1080) at 60fps or 30fps is the sweet spot.
