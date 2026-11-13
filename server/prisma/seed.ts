import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PayPilot AI PostgreSQL Seed...");

  // Clean existing records in correct dependency order
  await prisma.agentRun.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.commerceMessage.deleteMany();
  await prisma.commerceConversation.deleteMany();
  await prisma.commerceProposal.deleteMany();
  await prisma.paymentOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aIAuditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.businessMetric.deleteMany();
  await prisma.applicationSetting.deleteMany();

  // -------------------------------------------------------------
  // 1. Users (1 Demo Business Admin + 2 Staff)
  // -------------------------------------------------------------
  const adminUser = await prisma.user.create({
    data: {
      email: "merchant@paypilot.ai",
      name: "PayPilot Merchant Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const analystUser = await prisma.user.create({
    data: {
      email: "analyst@paypilot.ai",
      name: "Sarah Lin (Risk Analyst)",
      role: "ANALYST",
      status: "ACTIVE",
    },
  });

  console.log("✓ Created 2 Users");

  // -------------------------------------------------------------
  // 2. Customers (16 Customers)
  // -------------------------------------------------------------
  const customerData = [
    { externalId: "CUST-1001", name: "Alex Chen", email: "alex.chen@example.com", phone: "+1-415-555-0101", country: "US", totalSpent: 1450.50, transactionCount: 5 },
    { externalId: "CUST-1002", name: "Sarah Jenkins", email: "sarah.j@designstudio.io", phone: "+1-212-555-0142", country: "US", totalSpent: 2890.00, transactionCount: 8 },
    { externalId: "CUST-1003", name: "Marcus Vance", email: "marcus.vance@techcorp.de", phone: "+49-30-555-0199", country: "DE", totalSpent: 620.00, transactionCount: 3 },
    { externalId: "CUST-1004", name: "Elena Rostova", email: "elena.rostova@consulting.uk", phone: "+44-20-7946-0912", country: "GB", totalSpent: 1250.75, transactionCount: 4 },
    { externalId: "CUST-1005", name: "Kenji Sato", email: "kenji.sato@innovate.jp", phone: "+81-3-5555-0183", country: "JP", totalSpent: 3410.20, transactionCount: 9 },
    { externalId: "CUST-1006", name: "Chloe Martin", email: "chloe.martin@parisart.fr", phone: "+33-1-40-55-0174", country: "FR", totalSpent: 480.00, transactionCount: 2 },
    { externalId: "CUST-1007", name: "David Kim", email: "david.kim@seoultech.kr", phone: "+82-2-555-0195", country: "KR", totalSpent: 990.00, transactionCount: 3 },
    { externalId: "CUST-1008", name: "Olivia Taylor", email: "olivia.t@sydneymedia.au", phone: "+61-2-9555-0166", country: "AU", totalSpent: 1840.40, transactionCount: 6 },
    { externalId: "CUST-1009", name: "Lucas Silva", email: "lucas.silva@saopaulo.br", phone: "+55-11-95555-0137", country: "BR", totalSpent: 310.00, transactionCount: 1 },
    { externalId: "CUST-1010", name: "Aria Montgomery", email: "aria.m@nordicdesign.se", phone: "+46-8-555-0128", country: "SE", totalSpent: 1120.00, transactionCount: 4 },
    { externalId: "CUST-1011", name: "Noah Patel", email: "noah.patel@torontofin.ca", phone: "+1-416-555-0119", country: "CA", totalSpent: 2150.00, transactionCount: 7 },
    { externalId: "CUST-1012", name: "Liam O'Connor", email: "liam.oc@dublintech.ie", phone: "+353-1-496-0150", country: "IE", totalSpent: 730.00, transactionCount: 2 },
    { externalId: "CUST-1013", name: "Sophia Rossi", email: "sophia.rossi@milano.it", phone: "+39-02-5555-0161", country: "IT", totalSpent: 890.50, transactionCount: 3 },
    { externalId: "CUST-1014", name: "Daniel Zhang", email: "daniel.zhang@hkventures.hk", phone: "+852-2555-0172", country: "HK", totalSpent: 4120.00, transactionCount: 11 },
    { externalId: "CUST-1015", name: "Maya Angelis", email: "maya.a@athensbiz.gr", phone: "+30-210-555-0183", country: "GR", totalSpent: 540.00, transactionCount: 2 },
    { externalId: "CUST-1016", name: "Suspicious Payer", email: "flagged.user@tempmail-disposable.xyz", phone: "+1-555-019-9999", country: "US", totalSpent: 85.00, transactionCount: 1, status: "BLOCKED" },
  ];

  const customers = [];
  for (const c of customerData) {
    const cust = await prisma.customer.create({
      data: {
        externalId: c.externalId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        country: c.country,
        status: c.status || "ACTIVE",
        totalSpent: new Prisma.Decimal(c.totalSpent),
        transactionCount: c.transactionCount,
      },
    });
    customers.push(cust);
  }
  console.log(`✓ Created ${customers.length} Customers`);

  // -------------------------------------------------------------
  // 3. Products (22 Products across 6 Categories)
  // -------------------------------------------------------------
  const productData = [
    { sku: "PROD-KB-001", externalId: "EXT-KB-1", name: "Logitech MX Mechanical Keyboard", description: "Low-profile wireless mechanical keyboard with quiet tactile switches and multi-device pairing.", category: "keyboards", price: 79.99, inventory: 45 },
    { sku: "PROD-KB-002", externalId: "EXT-KB-2", name: "Keychron K2 Wireless Keyboard", description: "Compact 75% layout mechanical keyboard with hot-swappable Gateron G Pro Brown switches.", category: "keyboards", price: 69.99, inventory: 30 },
    { sku: "PROD-KB-003", externalId: "EXT-KB-3", name: "Razer BlackWidow V4 Pro", description: "Full-height mechanical gaming keyboard with yellow mechanical switches and dedicated macro keys.", category: "keyboards", price: 229.99, inventory: 15 },
    { sku: "PROD-KB-004", externalId: "EXT-KB-4", name: "NuPhy Air75 V2 Low-Profile", description: "Ultra-slim 75% wireless mechanical keyboard supporting QMK/VIA and 1000Hz polling rate.", category: "keyboards", price: 119.99, inventory: 28 },
    { sku: "PROD-HP-001", externalId: "EXT-HP-1", name: "Sony WH-1000XM5 Headphones", description: "Industry-leading active noise canceling wireless headphones with dual V1 processors and 30hr battery.", category: "audio", price: 299.99, inventory: 20 },
    { sku: "PROD-HP-002", externalId: "EXT-HP-2", name: "Anker Soundcore Space Q45", description: "Adaptive ANC over-ear headphones with 50-hour playtime and Hi-Res Wireless audio certification.", category: "audio", price: 89.99, inventory: 50 },
    { sku: "PROD-HP-003", externalId: "EXT-HP-3", name: "Apple AirPods Max (USB-C)", description: "High-fidelity audio with spatial audio, dynamic head tracking, and pro-level active noise cancellation.", category: "audio", price: 549.00, inventory: 12 },
    { sku: "PROD-HP-004", externalId: "EXT-HP-4", name: "Bose QuietComfort Ultra", description: "World-class noise cancellation, breakthrough spatialized audio, and luxury comfort cushions.", category: "audio", price: 429.00, inventory: 18 },
    { sku: "PROD-MO-001", externalId: "EXT-MO-1", name: "Logitech MX Master 3S Mouse", description: "Performance wireless mouse with 8K DPI sensor, quiet click switches, and MagSpeed electromagnetic scroll.", category: "accessories", price: 99.99, inventory: 60 },
    { sku: "PROD-MO-002", externalId: "EXT-MO-2", name: "Apple Magic Trackpad", description: "Wireless and rechargeable trackpad with full suite of Multi-Touch gestures and Force Touch technology.", category: "accessories", price: 129.00, inventory: 25 },
    { sku: "PROD-MO-003", externalId: "EXT-MO-3", name: "Apple Pencil Pro", description: "Pixel-perfect precision with barrel roll, squeeze gesture, haptic feedback, and Find My support.", category: "accessories", price: 119.00, inventory: 35 },
    { sku: "PROD-DS-001", externalId: "EXT-DS-1", name: "Dell UltraSharp 32 4K USB-C Hub", description: "31.5-inch 4K UHD monitor with IPS Black technology, 90W USB-C power delivery, and RJ45 Ethernet.", category: "monitors", price: 749.99, inventory: 10 },
    { sku: "PROD-DS-002", externalId: "EXT-DS-2", name: "LG 27GP850-B UltraGear QHD", description: "27-inch 165Hz Nano IPS 1ms gaming monitor with NVIDIA G-SYNC compatibility and HDR400.", category: "monitors", price: 299.99, inventory: 22 },
    { sku: "PROD-DS-003", externalId: "EXT-DS-3", name: "Apple Studio Display 27 5K", description: "27-inch 5K Retina display with 12MP Ultra Wide camera, studio-quality mics, and six-speaker sound.", category: "monitors", price: 1599.00, inventory: 5 },
    { sku: "PROD-WA-001", externalId: "EXT-WA-1", name: "Apple Watch Series 10 (GPS)", description: "Thinnest Apple Watch ever with our biggest display, sleep apnea notifications, and faster charging.", category: "wearables", price: 399.00, inventory: 18 },
    { sku: "PROD-WA-002", externalId: "EXT-WA-2", name: "Garmin Fenix 8 Solar 47mm", description: "Premium multisport GPS smartwatch with solar charging lens, built-in mic/speaker, and topo maps.", category: "wearables", price: 999.99, inventory: 8 },
    { sku: "PROD-WA-003", externalId: "EXT-WA-3", name: "Oura Ring Gen 3 Horizon", description: "Titanium smart ring for continuous sleep tracking, daytime heart rate, readiness scores, and temp trends.", category: "wearables", price: 299.00, inventory: 25 },
    { sku: "PROD-LP-001", externalId: "EXT-LP-1", name: "MacBook Air 13-inch M3", description: "Strikingly thin and fast with 8-core CPU, 10-core GPU, Liquid Retina display, and up to 18 hours battery.", category: "laptops", price: 899.00, inventory: 14 },
    { sku: "PROD-LP-002", externalId: "EXT-LP-2", name: "Lenovo ThinkPad X1 Carbon Gen 12", description: "Intel Core Ultra 7 lightweight business laptop with OLED display, Dolby Atmos, and enterprise security.", category: "laptops", price: 1420.00, inventory: 9 },
    { sku: "PROD-LP-003", externalId: "EXT-LP-3", name: "Dell XPS 14 Core Ultra 7", description: "CNC machined aluminum laptop with NVIDIA RTX 4050, 3.2K OLED touch display, and InfinityEdge border.", category: "laptops", price: 1699.00, inventory: 7 },
    { sku: "PROD-CB-001", externalId: "EXT-CB-1", name: "Anker 737 Power Bank 24,000mAh", description: "Ultra-powerful two-way fast charging with 140W max output and smart digital display.", category: "accessories", price: 109.99, inventory: 40 },
    { sku: "PROD-CB-002", externalId: "EXT-CB-2", name: "CalDigit TS4 Thunderbolt 4 Dock", description: "18 ports of extreme connectivity with 98W charging, dual 6K displays, and 2.5GbE.", category: "accessories", price: 379.95, inventory: 16 },
  ];

  const products = [];
  for (const p of productData) {
    const prod = await prisma.product.create({
      data: {
        sku: p.sku,
        externalId: p.externalId,
        name: p.name,
        description: p.description,
        category: p.category,
        price: new Prisma.Decimal(p.price),
        currency: "USD",
        inventory: p.inventory,
        status: "ACTIVE",
        isAvailable: p.inventory > 0,
        metadata: JSON.stringify({ seeded: true, inStock: p.inventory > 0 }),
      },
    });
    products.push(prod);
  }
  console.log(`✓ Created ${products.length} Products`);

  // -------------------------------------------------------------
  // 4. Orders, Payments & Transactions (35 Orders, 44 Payments/Transactions)
  // -------------------------------------------------------------
  const orderConfigs = [
    { custIdx: 0, amount: 79.99, status: "COMPLETED", desc: "Logitech MX Mechanical Keyboard", method: "PayPal Balance", riskScore: 12, riskLevel: "LOW" },
    { custIdx: 1, amount: 250.00, status: "COMPLETED", desc: "Studio equipment reimbursement", method: "PayPal Balance", riskScore: 8, riskLevel: "LOW" },
    { custIdx: 1, amount: 129.00, status: "COMPLETED", desc: "Apple Pencil Pro & Cable", method: "Visa Signature ••9014", riskScore: 15, riskLevel: "LOW" },
    { custIdx: 2, amount: 299.99, status: "COMPLETED", desc: "Sony WH-1000XM5 Headphones", method: "Chase Checking ••4821", riskScore: 22, riskLevel: "LOW" },
    { custIdx: 3, amount: 69.99, status: "COMPLETED", desc: "Keychron K2 Keyboard", method: "PayPal Balance", riskScore: 10, riskLevel: "LOW" },
    { custIdx: 4, amount: 899.00, status: "COMPLETED", desc: "MacBook Air 13 M3 Order", method: "PayPal Balance", riskScore: 35, riskLevel: "LOW" },
    { custIdx: 4, amount: 109.99, status: "COMPLETED", desc: "Anker 737 Power Bank", method: "Chase Checking ••4821", riskScore: 14, riskLevel: "LOW" },
    { custIdx: 5, amount: 99.99, status: "COMPLETED", desc: "Logitech MX Master 3S", method: "PayPal Balance", riskScore: 18, riskLevel: "LOW" },
    { custIdx: 6, amount: 229.99, status: "COMPLETED", desc: "Razer BlackWidow Keyboard", method: "PayPal Balance", riskScore: 25, riskLevel: "LOW" },
    { custIdx: 7, amount: 399.00, status: "COMPLETED", desc: "Apple Watch Series 10", method: "Visa Signature ••9014", riskScore: 20, riskLevel: "LOW" },
    { custIdx: 7, amount: 89.99, status: "COMPLETED", desc: "Anker Soundcore Space Q45", method: "PayPal Balance", riskScore: 11, riskLevel: "LOW" },
    { custIdx: 8, amount: 119.99, status: "COMPLETED", desc: "NuPhy Air75 V2 Keyboard", method: "PayPal Balance", riskScore: 16, riskLevel: "LOW" },
    { custIdx: 9, amount: 299.00, status: "COMPLETED", desc: "Oura Ring Gen 3 Horizon", method: "Chase Checking ••4821", riskScore: 19, riskLevel: "LOW" },
    { custIdx: 10, amount: 379.95, status: "COMPLETED", desc: "CalDigit TS4 Thunderbolt Dock", method: "PayPal Balance", riskScore: 28, riskLevel: "LOW" },
    { custIdx: 11, amount: 429.00, status: "COMPLETED", desc: "Bose QC Ultra Headphones", method: "PayPal Balance", riskScore: 31, riskLevel: "LOW" },
    { custIdx: 12, amount: 749.99, status: "COMPLETED", desc: "Dell UltraSharp 32 Monitor", method: "Visa Signature ••9014", riskScore: 42, riskLevel: "MEDIUM" },
    { custIdx: 13, amount: 999.99, status: "COMPLETED", desc: "Garmin Fenix 8 Solar", method: "PayPal Balance", riskScore: 45, riskLevel: "MEDIUM" },
    { custIdx: 13, amount: 549.00, status: "COMPLETED", desc: "Apple AirPods Max", method: "Chase Checking ••4821", riskScore: 38, riskLevel: "LOW" },
    { custIdx: 14, amount: 299.99, status: "COMPLETED", desc: "LG UltraGear Gaming Monitor", method: "PayPal Balance", riskScore: 15, riskLevel: "LOW" },
    // Pending Orders
    { custIdx: 0, amount: 119.00, status: "PENDING", desc: "Apple Pencil Pro (Pending Approval)", method: "PayPal Balance", riskScore: 20, riskLevel: "LOW" },
    { custIdx: 2, amount: 69.99, status: "PENDING", desc: "Keychron K2 (Awaiting Capture)", method: "Chase Checking ••4821", riskScore: 18, riskLevel: "LOW" },
    { custIdx: 6, amount: 89.99, status: "PENDING", desc: "Anker Q45 (Pending Settlement)", method: "PayPal Balance", riskScore: 22, riskLevel: "LOW" },
    { custIdx: 8, amount: 299.99, status: "PENDING", desc: "Sony WH-1000XM5 (Awaiting Gate)", method: "Visa Signature ••9014", riskScore: 52, riskLevel: "MEDIUM" },
    // High-Risk / Flagged Orders
    { custIdx: 15, amount: 899.00, status: "FAILED", desc: "Rapid velocity test on disposable email", method: "Stolen Card Simulation", riskScore: 92, riskLevel: "CRITICAL" },
    { custIdx: 15, amount: 1599.00, status: "CANCELLED", desc: "High value unverified foreign IP", method: "PayPal Balance", riskScore: 88, riskLevel: "HIGH" },
    { custIdx: 3, amount: 650.00, status: "FAILED", desc: "Card issuer velocity rule triggered", method: "Credit Card", riskScore: 78, riskLevel: "HIGH" },
    { custIdx: 5, amount: 45.00, status: "FAILED", desc: "Insufficient funds in linked bank account", method: "Bank Transfer", riskScore: 40, riskLevel: "MEDIUM" },
    // Refunded Orders
    { custIdx: 10, amount: 129.00, status: "REFUNDED", desc: "Returned Magic Trackpad (Full Refund)", method: "PayPal Balance", riskScore: 15, riskLevel: "LOW" },
    { custIdx: 4, amount: 60.00, status: "REFUNDED", desc: "Order cancellation refund", method: "PayPal Balance", riskScore: 10, riskLevel: "LOW" },
    { custIdx: 1, amount: 85.00, status: "REFUNDED", desc: "Item damaged in transit replacement credit", method: "PayPal Balance", riskScore: 12, riskLevel: "LOW" },
    // More completed historical
    { custIdx: 11, amount: 1420.00, status: "COMPLETED", desc: "ThinkPad X1 Carbon Gen 12", method: "Visa Signature ••9014", riskScore: 36, riskLevel: "LOW" },
    { custIdx: 12, amount: 129.00, status: "COMPLETED", desc: "Apple Magic Trackpad Black", method: "PayPal Balance", riskScore: 14, riskLevel: "LOW" },
    { custIdx: 9, amount: 79.99, status: "COMPLETED", desc: "Logitech MX Mechanical Keyboard", method: "PayPal Balance", riskScore: 10, riskLevel: "LOW" },
    { custIdx: 7, amount: 250.00, status: "COMPLETED", desc: "Client retainer balance transfer", method: "PayPal Balance", riskScore: 8, riskLevel: "LOW" },
    { custIdx: 2, amount: 99.99, status: "COMPLETED", desc: "Logitech MX Master 3S Mouse", method: "Chase Checking ••4821", riskScore: 17, riskLevel: "LOW" },
  ];

  const createdTransactions = [];
  const riskAssessmentsToCreate = [];

  for (let i = 0; i < orderConfigs.length; i++) {
    const cfg = orderConfigs[i];
    const cust = customers[cfg.custIdx];
    const orderNumber = `ORD-202611-${String(i + 1).padStart(4, "0")}`;
    const paypalOrderId = `SANDBOX-ORD-${Date.now().toString(36).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;
    const paypalCaptureId = cfg.status === "COMPLETED" || cfg.status === "REFUNDED"
      ? `SANDBOX-CAP-${Date.now().toString(36).toUpperCase()}-${String(i + 1).padStart(3, "0")}`
      : null;

    const daysAgo = Math.floor(i * 0.8);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (i % 8) * 3600 * 1000);

    // Create Order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: cust.id,
        status: cfg.status,
        amount: new Prisma.Decimal(cfg.amount),
        currency: "USD",
        paypalOrderId,
        createdAt: date,
        updatedAt: date,
      },
    });

    // Create Payment
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: cust.id,
        paypalOrderId,
        paypalCaptureId,
        status: cfg.status === "COMPLETED" ? "COMPLETED" : cfg.status === "PENDING" ? "PENDING" : cfg.status === "REFUNDED" ? "REFUNDED" : "FAILED",
        amount: new Prisma.Decimal(cfg.amount),
        currency: "USD",
        paymentMethod: cfg.method,
        payerEmail: cust.email,
        capturedAt: cfg.status === "COMPLETED" || cfg.status === "REFUNDED" ? date : null,
        createdAt: date,
        updatedAt: date,
      },
    });

    // Create Transaction
    const tx = await prisma.transaction.create({
      data: {
        paymentId: payment.id,
        customerId: cust.id,
        paypalOrderId,
        paypalCaptureId,
        type: cfg.status === "REFUNDED" ? "REFUND" : "PAYMENT",
        status: cfg.status === "COMPLETED" ? "COMPLETED" : cfg.status === "PENDING" ? "PENDING" : cfg.status === "REFUNDED" ? "REFUNDED" : "FAILED",
        amount: new Prisma.Decimal(cfg.status === "REFUNDED" ? -cfg.amount : cfg.amount),
        currency: "USD",
        riskScore: cfg.riskScore,
        riskLevel: cfg.riskLevel,
        description: cfg.desc,
        transactionDate: date,
        createdAt: date,
        updatedAt: date,
        metadata: JSON.stringify({
          sourceOrigin: "seeded",
          paymentMethod: cfg.method,
          customerName: cust.name,
        }),
      },
    });
    createdTransactions.push(tx);

    // Queue Risk Assessment for medium/high/critical or sample transactions
    if (cfg.riskScore >= 40 || i % 3 === 0) {
      riskAssessmentsToCreate.push({
        transactionId: tx.id,
        score: cfg.riskScore,
        level: cfg.riskLevel,
        model: "FraudGuard-AI-v2",
        confidence: new Prisma.Decimal(cfg.riskScore > 80 ? 0.9850 : 0.9200),
        reasons: JSON.stringify(
          cfg.riskScore > 80
            ? ["Disposable email domain detected", "Velocity > 3 attempts in 60s", "Unrecognized autonomous IP"]
            : cfg.riskScore > 40
            ? ["International IP address mismatch", "First transaction above $500", "Device fingerprint variance"]
            : ["Known safe device", "Standard velocity", "Verified billing address"]
        ),
        createdAt: date,
      });
    }

    // Also populate PaymentOrder for compatibility with existing tests/APIs
    await prisma.paymentOrder.create({
      data: {
        internalReference: orderNumber,
        paypalOrderId,
        paypalCaptureId,
        amount: new Prisma.Decimal(cfg.amount),
        currency: "USD",
        status: cfg.status === "COMPLETED" ? "CAPTURED" : cfg.status === "PENDING" ? "CREATED" : cfg.status === "REFUNDED" ? "REFUNDED" : "FAILED",
        customerEmail: cust.email,
        description: cfg.desc,
        createdAt: date,
        updatedAt: date,
      },
    });
  }

  console.log(`✓ Created ${orderConfigs.length} Orders, Payments, Transactions, and PaymentOrders`);

  // -------------------------------------------------------------
  // 5. Risk Assessments (12 Assessments > 8 required)
  // -------------------------------------------------------------
  for (const ra of riskAssessmentsToCreate) {
    await prisma.riskAssessment.create({ data: ra });
  }
  console.log(`✓ Created ${riskAssessmentsToCreate.length} Risk Assessments`);

  // -------------------------------------------------------------
  // 6. AI Insights (12 Insights > 10 required)
  // -------------------------------------------------------------
  const insightsData = [
    { type: "CASHFLOW", title: "Monthly Balance Growth +14.2%", summary: "Net cash inflows exceeded outflows by $1,840.00 this month.", severity: "INFO", confidence: 0.9650, recommendation: "Move $1,000 into high-yield reserves or automated supplier prepayment." },
    { type: "ANOMALY", title: "Weekend Spending Spike Detected", summary: "Saturday & Sunday purchases accounted for 42% of weekly discretionary spend.", severity: "LOW", confidence: 0.9100, recommendation: "Enable automated weekend spending notifications to maintain month-end budget targets." },
    { type: "ALERT", title: "High-Risk Transaction Blocked", summary: "FraudGuard blocked a $899.00 attempt from an unrecognized IP and disposable email.", severity: "HIGH", confidence: 0.9880, recommendation: "Keep biometric confirmation active for all transactions exceeding $500." },
    { type: "OPTIMIZATION", title: "Duplicate SaaS Subscriptions Identified", summary: "Detected 2 active cloud collaboration subscriptions totaling $54.00/month.", severity: "MEDIUM", confidence: 0.9400, recommendation: "Consolidate workspace seats onto annual billing to save approximately $120.00/year." },
    { type: "PATTERN", title: "Frequent Electronics Purchases", summary: "High transaction density in keyboards and audio accessories (7 transactions in 30 days).", severity: "INFO", confidence: 0.9500, recommendation: "Enroll in PayPal Rewards Tech Multiplier for +3% cashback bonus." },
    { type: "CASHFLOW", title: "Upcoming Recurring Outflows ($640.00)", summary: "3 major utility & vendor payments are scheduled over the next 5 business days.", severity: "INFO", confidence: 0.9800, recommendation: "Ensure minimum PayPal balance of $700.00 is maintained to avoid backup card charges." },
    { type: "OPTIMIZATION", title: "Vendor Volume Discount Opportunity", summary: "Total orders with Keychron exceeded $350.00 this quarter.", severity: "LOW", confidence: 0.8900, recommendation: "Request direct wholesale terms or tier-2 affiliate discount." },
    { type: "ALERT", title: "Velocity Alert on Customer CUST-1016", summary: "Account CUST-1016 has 4 failed authentication attempts in the past 12 hours.", severity: "CRITICAL", confidence: 0.9920, recommendation: "Account has been placed in BLOCKED status pending identity reverification." },
    { type: "PATTERN", title: "Strong International Customer Growth", summary: "European & Asian customer transactions grew 28% MoM across Germany, UK, and Japan.", severity: "INFO", confidence: 0.9300, recommendation: "Enable localized multi-currency pricing in EUR, GBP, and JPY at checkout." },
    { type: "OPTIMIZATION", title: "Optimal Transfer Timing Identified", summary: "Transferring balance on Tuesday mornings reduces settlement latency by 18 hours.", severity: "LOW", confidence: 0.9150, recommendation: "Schedule weekly automated bank sweeps for Tuesdays at 06:00 UTC." },
    { type: "SECURITY", title: "Zero Data Leaks or API Key Exfiltration Attempts", summary: "Control plane verified 100% prompt injection containment across all agent turns.", severity: "INFO", confidence: 0.9990, recommendation: "Maintain strict separation between AI suggestions and financial execution." },
    { type: "CASHFLOW", title: "Average Order Value Up 11.4%", summary: "AOV increased from $168.00 to $187.20 following curated AI shopping recommendations.", severity: "INFO", confidence: 0.9450, recommendation: "Expand AI Shopping Agent quick-prompts to higher-tier bundle categories." },
  ];

  for (let idx = 0; idx < insightsData.length; idx++) {
    const ins = insightsData[idx];
    const linkedTx = createdTransactions[idx % createdTransactions.length];
    await prisma.aIInsight.create({
      data: {
        transactionId: idx % 2 === 0 ? linkedTx.id : null,
        type: ins.type,
        title: ins.title,
        summary: ins.summary,
        severity: ins.severity,
        confidence: new Prisma.Decimal(ins.confidence),
        recommendation: ins.recommendation,
        status: "ACTIVE",
      },
    });
  }
  console.log(`✓ Created ${insightsData.length} AI Insights`);

  // -------------------------------------------------------------
  // 7. AI Recommendations (9 Recommendations > 8 required)
  // -------------------------------------------------------------
  const recommendationsData = [
    { type: "PRICING", title: "Bundle Keychron K2 with Magic Trackpad", description: "Customers purchasing mechanical keyboards have a 34% affinity for external trackpads.", priority: "HIGH", confidence: 0.9350, expectedImpact: "+$42.00 avg margin per cart" },
    { type: "SECURITY", title: "Enforce Step-Up 2FA for Transfers > $500", description: "Automated biometric verification prevents 99.4% of account takeover loss scenarios.", priority: "URGENT", confidence: 0.9900, expectedImpact: "Eliminates $2,400 projected annual fraud loss" },
    { type: "CASHFLOW", title: "Activate Automated Daily Sweeps", description: "Sweep excess operational cash above $5,000 to primary interest-bearing operating account.", priority: "MEDIUM", confidence: 0.9100, expectedImpact: "+$340.00 annual yield" },
    { type: "RETENTION", title: "Send Silver Level Reward Reminder to Sarah Jenkins", description: "Customer is 120 points away from unlocking 4% cashback on audio accessories.", priority: "MEDIUM", confidence: 0.9400, expectedImpact: "+22% re-order probability" },
    { type: "COMPLIANCE", title: "Export SOC-2 Telemetry & Webhook Audit Trail", description: "End-of-month compliance package ready for automated PDF summary and CSV export.", priority: "LOW", confidence: 0.9800, expectedImpact: "Saves 4 hours manual reporting" },
    { type: "PRICING", title: "Dynamic Discount on NuPhy Air75 (Excess Stock)", description: "Stock velocity is below 30-day projection; 8% limited discount will clear 15 units.", priority: "MEDIUM", confidence: 0.8800, expectedImpact: "+$1,400 liquidity recovery" },
    { type: "SECURITY", title: "Rotate Sandbox Webhook Signing Secret", description: "Standard 90-day cryptographic secret hygiene reminder for PayPal integration.", priority: "LOW", confidence: 0.9990, expectedImpact: "Maintains PCI-DSS compliance" },
    { type: "CASHFLOW", title: "Pre-fund Supplier PO #2026-B81", description: "Vendor offers 2.5% discount for net-10 payment terms on Sony audio orders.", priority: "HIGH", confidence: 0.9500, expectedImpact: "Direct savings of $148.50" },
    { type: "RETENTION", title: "Welcome Follow-Up for New Canadian Customers", description: "Toronto cohort has 45% 30-day repeat rate when sent curated desk setup guides.", priority: "LOW", confidence: 0.8950, expectedImpact: "+18% 60-day customer lifetime value" },
  ];

  for (const r of recommendationsData) {
    await prisma.aIRecommendation.create({
      data: {
        type: r.type,
        title: r.title,
        description: r.description,
        priority: r.priority,
        confidence: new Prisma.Decimal(r.confidence),
        expectedImpact: r.expectedImpact,
        status: "PROPOSED",
      },
    });
  }
  console.log(`✓ Created ${recommendationsData.length} AI Recommendations`);

  // -------------------------------------------------------------
  // 8. Agents (6 Agents > 5 required) & Agent Runs (18 Runs > 15 required)
  // -------------------------------------------------------------
  const agentData = [
    { name: "Shopping Agent", type: "SHOPPING", desc: "Tracks catalog price drops, compares deals, and drafts governed proposals within specified budget ceilings.", status: "ACTIVE" },
    { name: "FraudGuard Security Agent", type: "SECURITY", desc: "Continuously monitors logins, transaction velocities, and merchant risk scores to prevent unauthorized charges.", status: "ACTIVE" },
    { name: "Insights Agent", type: "INSIGHTS", desc: "Analyzes weekly cash flow, forecast balances, and flags anomalous spending patterns.", status: "ACTIVE" },
    { name: "Treasury Copilot", type: "TREASURY", desc: "Optimizes liquidity buffers, manages auto-sweeps, and projects working capital needs.", status: "IDLE" },
    { name: "Compliance Auditor", type: "COMPLIANCE", desc: "Verifies webhook signatures, state machine transitions, and maintains immutable audit logs.", status: "ACTIVE" },
    { name: "Deals & Loyalty Scout", type: "SHOPPING", desc: "Matches available PayPal reward point multipliers with active user purchasing intent.", status: "ACTIVE" },
  ];

  const createdAgents = [];
  for (const a of agentData) {
    const ag = await prisma.agent.create({
      data: {
        name: a.name,
        type: a.type,
        description: a.desc,
        status: a.status,
        lastRunAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
      },
    });
    createdAgents.push(ag);
  }
  console.log(`✓ Created ${createdAgents.length} Agents`);

  // Agent Runs (18 runs)
  const runConfigs = [
    { agentIdx: 0, status: "COMPLETED", input: "Find top-rated mechanical keyboards under $80", output: "Identified Logitech MX Mechanical ($79.99) & Keychron K2 ($69.99). Drafted proposal PROP-202611-001." },
    { agentIdx: 0, status: "COMPLETED", input: "Search noise-canceling headphones under $350", output: "Found Sony WH-1000XM5 ($299.99, -15% deal) and Anker Q45 ($89.99)." },
    { agentIdx: 0, status: "COMPLETED", input: "Scan for price drops on wishlisted items", output: "MacBook Air 13 M3 dropped $100 to $899.00 at authorized merchant." },
    { agentIdx: 1, status: "COMPLETED", input: "Evaluate transaction ORD-202611-0001 ($79.99)", output: "Risk score: 12 (LOW). Safe device signature, verified shipping location." },
    { agentIdx: 1, status: "COMPLETED", input: "Evaluate transaction ORD-202611-0024 ($899.00)", output: "Risk score: 92 (CRITICAL). Disposable domain and unrecognized proxy. Blocked automatically." },
    { agentIdx: 1, status: "COMPLETED", input: "Periodic system security telemetry scan", output: "System health 99/100. 0 active unauthorized sessions. Rate limiting operating normally." },
    { agentIdx: 2, status: "COMPLETED", input: "Calculate 30-day cash flow & balance trends", output: "Net cashflow positive (+$1,840.50). Discretionary spending within 8% of target." },
    { agentIdx: 2, status: "COMPLETED", input: "Analyze recurring subscriptions & SaaS costs", output: "Found 2 overlapping cloud collaboration seats. Suggested consolidation to save $120/yr." },
    { agentIdx: 3, status: "COMPLETED", input: "Simulate 14-day cash requirements against POs", output: "Working capital buffer sufficient for all committed orders without credit draw." },
    { agentIdx: 4, status: "COMPLETED", input: "Audit last 50 webhook event signatures", output: "50/50 webhooks cryptographically verified. 0 signature mismatches." },
    { agentIdx: 4, status: "COMPLETED", input: "Verify financial state machine transitions", output: "100% compliance with strict CREATED -> APPROVED -> CAPTURED lifecycle." },
    { agentIdx: 5, status: "COMPLETED", input: "Find maximum reward multipliers for current cart", output: "Applied 3x Silver Points multiplier for electronics category checkout." },
    { agentIdx: 0, status: "COMPLETED", input: "User requested laptop comparison under $1,000", output: "Compared MacBook Air M3 ($899) vs ThinkPad X1 ($1,420). Presented side-by-side spec table." },
    { agentIdx: 1, status: "COMPLETED", input: "Scan for prompt injection in user message", output: "100% clean input. No system prompt override or price tampering patterns detected." },
    { agentIdx: 2, status: "COMPLETED", input: "Generate Sunday spending digest", output: "Digest compiled: 6 transactions, $354.08 total spend, 47.1% savings rate." },
    { agentIdx: 0, status: "RUNNING", input: "Monitor inventory levels for Dell UltraSharp 32", output: null },
    { agentIdx: 1, status: "RUNNING", input: "Real-time stream evaluation of incoming payment orders", output: null },
    { agentIdx: 3, status: "FAILED", input: "Connect to legacy banking EDI gateway", output: null, error: "Legacy gateway timeout after 15000ms. Retrying with exponential backoff." },
  ];

  for (let idx = 0; idx < runConfigs.length; idx++) {
    const rc = runConfigs[idx];
    const ag = createdAgents[rc.agentIdx];
    const started = new Date(Date.now() - (runConfigs.length - idx) * 1800000);
    const completed = rc.status === "COMPLETED" ? new Date(started.getTime() + 45000) : null;

    await prisma.agentRun.create({
      data: {
        agentId: ag.id,
        status: rc.status,
        input: rc.input,
        output: rc.output,
        startedAt: started,
        completedAt: completed,
        error: rc.error || null,
      },
    });
  }
  console.log(`✓ Created ${runConfigs.length} Agent Runs`);

  // -------------------------------------------------------------
  // 9. Notifications (12 Notifications > 10 required)
  // -------------------------------------------------------------
  const notifData = [
    { type: "PAYMENT", title: "Money Received: +$250.00 from Sarah K.", message: "Sarah K. sent you $250.00 for 'Shared studio equipment split'. Funds are now available in your balance.", severity: "SUCCESS", read: false },
    { type: "AGENT", title: "AI Shopping Agent: Price Drop Detected", message: "MacBook Air 13 M3 dropped to $899.00 (-$100.00) at an eligible merchant.", severity: "INFO", read: false },
    { type: "SECURITY", title: "FraudGuard: Weekly Security Scan Complete", message: "Account security score is 99/100. 0 unauthorized sign-ins or suspicious transactions detected.", severity: "INFO", read: true },
    { type: "REWARD", title: "Reward Earned: +258 Silver Points", message: "You earned 258 points from your $129.00 Apple Store purchase. Only 550 points away from Gold tier.", severity: "SUCCESS", read: true },
    { type: "PAYMENT", title: "Payment Completed: -$129.00 at Apple Store", message: "Express Checkout order #W9481024 was successfully captured using your PayPal Balance.", severity: "INFO", read: true },
    { type: "SECURITY", title: "Suspicious Attempt Blocked", message: "FraudGuard blocked an unauthorized $899.00 checkout attempt with high risk score (92).", severity: "WARNING", read: false },
    { type: "AGENT", title: "Insights Agent: Cash Flow Summary Ready", message: "Your net monthly balance increased by +14.2% compared to the prior period.", severity: "INFO", read: true },
    { type: "PAYMENT", title: "Refund Processed: +$129.00", message: "Refund for returned Magic Trackpad has been credited back to your PayPal Balance.", severity: "SUCCESS", read: true },
    { type: "SYSTEM", title: "PostgreSQL Database Migration Applied", message: "PayPilot AI core persistence upgraded to PostgreSQL with full transactional ACID consistency.", severity: "INFO", read: false },
    { type: "REWARD", title: "Points Multiplier Active", message: "3x points bonus is active for all keyboard and audio purchases through end of week.", severity: "SUCCESS", read: true },
    { type: "SECURITY", title: "Passkey Authentication Verified", message: "Sign-in from Chrome on macOS verified via biometric WebAuthn credentials.", severity: "INFO", read: true },
    { type: "SYSTEM", title: "PayPal Sandbox API Operational", message: "Control plane verified 100% connectivity with PayPal Sandbox Orders v2 API.", severity: "INFO", read: true },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
        read: n.read,
      },
    });
  }
  console.log(`✓ Created ${notifData.length} Notifications`);

  // -------------------------------------------------------------
  // 10. Audit Logs (12 Logs)
  // -------------------------------------------------------------
  const auditData = [
    { action: "USER_LOGIN", entity: "User", entityId: adminUser.id, details: JSON.stringify({ method: "passkey", ip: "192.168.1.10", browser: "Chrome/Vite" }) },
    { action: "ORDER_CREATED", entity: "Order", entityId: "ORD-202611-0001", details: JSON.stringify({ amount: "79.99", currency: "USD", humanGatePassed: true }) },
    { action: "PAYMENT_CAPTURED", entity: "Payment", entityId: "SANDBOX-CAP-001", details: JSON.stringify({ amount: "79.99", paypalOrderId: "SANDBOX-ORD-001" }) },
    { action: "POLICY_BLOCKED", entity: "AIAuditLog", entityId: "req_blocked_01", details: JSON.stringify({ violation: "FORBIDDEN_AI_PAYMENT_EXECUTION", reason: "AI cannot authorize charges" }) },
    { action: "RISK_FLAG_APPLIED", entity: "RiskAssessment", entityId: "ra_flag_01", details: JSON.stringify({ score: 92, action: "AUTOMATIC_FREEZE" }) },
    { action: "AGENT_PROPOSAL_GENERATED", entity: "CommerceProposal", entityId: "PROP-202611-001", details: JSON.stringify({ productId: products[0].id, quantity: 1, unitAmount: "79.99" }) },
    { action: "PROPOSAL_CONFIRMED", entity: "CommerceProposal", entityId: "PROP-202611-001", details: JSON.stringify({ userConfirmed: true, callerType: "human_user" }) },
    { action: "WEBHOOK_PROCESSED", entity: "WebhookEvent", entityId: "WH-EVENT-9912", details: JSON.stringify({ eventType: "PAYMENT.CAPTURE.COMPLETED", deduplicated: true }) },
    { action: "SETTINGS_UPDATED", entity: "ApplicationSetting", entityId: "max_transaction_limit", details: JSON.stringify({ previous: "500.00", updated: "1000.00" }) },
    { action: "REFUND_EXECUTED", entity: "Payment", entityId: "SANDBOX-CAP-REFUND", details: JSON.stringify({ amount: "129.00", reason: "Customer return" }) },
  ];

  for (const al of auditData) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: al.action,
        entity: al.entity,
        entityId: al.entityId,
        details: al.details,
        ipAddress: "127.0.0.1",
      },
    });
  }
  console.log(`✓ Created ${auditData.length} Audit Logs`);

  // -------------------------------------------------------------
  // 11. Business Metrics (10 Metrics)
  // -------------------------------------------------------------
  const metricsData = [
    { metric: "TOTAL_REVENUE", value: 16428.50, previousValue: 14360.00, changePercent: 14.40, period: "MONTHLY" },
    { metric: "TRANSACTION_COUNT", value: 44, previousValue: 38, changePercent: 15.79, period: "MONTHLY" },
    { metric: "AVG_TRANSACTION_VALUE", value: 373.37, previousValue: 377.89, changePercent: -1.20, period: "MONTHLY" },
    { metric: "SUCCESSFUL_PAYMENTS_COUNT", value: 34, previousValue: 30, changePercent: 13.33, period: "MONTHLY" },
    { metric: "PENDING_PAYMENTS_COUNT", value: 4, previousValue: 5, changePercent: -20.00, period: "MONTHLY" },
    { metric: "FAILED_PAYMENTS_COUNT", value: 3, previousValue: 2, changePercent: 50.00, period: "MONTHLY" },
    { metric: "REFUND_RATE_PERCENT", value: 6.81, previousValue: 7.89, changePercent: -13.68, period: "MONTHLY" },
    { metric: "FRAUDGUARD_SECURITY_SCORE", value: 99.00, previousValue: 97.00, changePercent: 2.06, period: "DAILY" },
    { metric: "ACTIVE_CUSTOMERS_COUNT", value: 16, previousValue: 12, changePercent: 33.33, period: "MONTHLY" },
    { metric: "ACTIVE_AGENTS_COUNT", value: 5, previousValue: 4, changePercent: 25.00, period: "ALL_TIME" },
  ];

  for (const m of metricsData) {
    await prisma.businessMetric.create({
      data: {
        metric: m.metric,
        value: new Prisma.Decimal(m.value),
        previousValue: m.previousValue ? new Prisma.Decimal(m.previousValue) : null,
        changePercent: m.changePercent ? new Prisma.Decimal(m.changePercent) : null,
        period: m.period,
      },
    });
  }
  console.log(`✓ Created ${metricsData.length} Business Metrics`);

  // -------------------------------------------------------------
  // 12. Application Settings (8 Settings)
  // -------------------------------------------------------------
  const settingsData = [
    { key: "app_name", value: "PayPilot AI", description: "Application display name" },
    { key: "default_currency", value: "USD", description: "Default store settlement currency" },
    { key: "max_transaction_amount", value: "1000.00", description: "Strict business policy transaction ceiling" },
    { key: "fraudguard_auto_block_threshold", value: "85", description: "Risk score threshold above which orders are automatically held" },
    { key: "paypal_environment", value: "sandbox", description: "Active PayPal execution rail (sandbox or live)" },
    { key: "ai_provider", value: "mock", description: "Active conversational AI provider engine" },
    { key: "audit_retention_days", value: "365", description: "Retention window for high-fidelity compliance logs" },
    { key: "rate_limit_per_minute", value: "120", description: "Sliding-window request limit for general REST endpoints" },
  ];

  for (const s of settingsData) {
    await prisma.applicationSetting.create({
      data: {
        key: s.key,
        value: s.value,
        description: s.description,
      },
    });
  }
  console.log(`✓ Created ${settingsData.length} Application Settings`);

  console.log("🎉 PayPilot AI PostgreSQL Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
