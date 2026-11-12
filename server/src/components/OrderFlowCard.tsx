"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
  XCircle,
  ShieldCheck,
  Search,
  Lock,
  Clock,
  Receipt,
  Check,
} from "lucide-react";

export type PaymentUxState =
  | "idle"
  | "creating_order"
  | "waiting_approval"
  | "capturing"
  | "payment_successful"
  | "payment_failed"
  | "payment_cancelled"
  | "payment_pending"
  | "network_error";

interface OrderFlowCardProps {
  draftOrder?: {
    amount: number;
    currency: string;
    description: string;
    paypalOrderId?: string;
    internalReference?: string;
    approvalUrl?: string;
  } | null;
  onOrderCompleted?: () => void;
}

export function OrderFlowCard({ draftOrder, onOrderCompleted }: OrderFlowCardProps) {
  const [activeTab, setActiveTab] = useState<"checkout" | "status">("checkout");

  // Form Fields
  const [amount, setAmount] = useState<number>(draftOrder?.amount || 49.99);
  const [currency, setCurrency] = useState<string>(draftOrder?.currency || "USD");
  const [description, setDescription] = useState<string>(
    draftOrder?.description || "Developer Pro License"
  );
  const [customerEmail, setCustomerEmail] = useState<string>("buyer@sandbox.example.com");

  const [uxState, setUxState] = useState<PaymentUxState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [capturedResult, setCapturedResult] = useState<any | null>(null);

  // Status Lookup State
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Sync when draftOrder changes from AI Assistant or Commerce Agent panel
  useEffect(() => {
    if (draftOrder) {
      setAmount(draftOrder.amount);
      setCurrency(draftOrder.currency);
      setDescription(draftOrder.description);
      if (draftOrder.paypalOrderId) {
        setCreatedOrder({
          id: draftOrder.paypalOrderId,
          internalReference: draftOrder.internalReference,
          approvalLink:
            draftOrder.approvalUrl ||
            `https://www.sandbox.paypal.com/checkoutnow?token=${draftOrder.paypalOrderId}`,
          amount: {
            value: Number(draftOrder.amount).toFixed(2),
            currencyCode: draftOrder.currency,
          },
          status: "CREATED",
        });
        setUxState("waiting_approval");
      } else {
        setCreatedOrder(null);
        setUxState("idle");
      }
      setCapturedResult(null);
      setErrorMessage(null);
      setActiveTab("checkout");
    }
  }, [draftOrder]);

  const handleCreateOrder = async () => {
    if (amount <= 0 || amount > 1000) {
      setErrorMessage("Amount must be between $0.01 and $1,000.00.");
      setUxState("payment_failed");
      return;
    }

    setUxState("creating_order");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          description,
          customerEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create order on payment gateway.");
      }

      setCreatedOrder(data.data);
      setUxState("waiting_approval");
    } catch (err: any) {
      const isNet = err.message?.includes("fetch") || err.message?.includes("network");
      setUxState(isNet ? "network_error" : "payment_failed");
      setErrorMessage(err.message || "An error occurred while creating order.");
    }
  };

  const handleCaptureOrder = async () => {
    if (!createdOrder?.id) return;

    setUxState("capturing");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to capture payment.");
      }

      const captureStatus = data.data?.status;
      if (captureStatus === "COMPLETED") {
        setCapturedResult(data.data);
        setUxState("payment_successful");
        if (onOrderCompleted) onOrderCompleted();
      } else if (captureStatus === "PENDING") {
        setCapturedResult(data.data);
        setUxState("payment_pending");
      } else {
        setErrorMessage(`Capture returned status: ${captureStatus}`);
        setUxState("payment_failed");
      }
    } catch (err: any) {
      const isNet = err.message?.includes("fetch") || err.message?.includes("network");
      setUxState(isNet ? "network_error" : "payment_failed");
      setErrorMessage(err.message || "An error occurred during payment capture.");
    }
  };

  const handleReset = () => {
    setUxState("idle");
    setCreatedOrder(null);
    setCapturedResult(null);
    setErrorMessage(null);
  };

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(`/api/orders/${query}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Order '${query}' not found.`);
      }
      setLookupResult(json.data);
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  // Steps for Stepper
  const steps = [
    { id: 1, label: "Review", done: !!createdOrder },
    { id: 2, label: "Authorize", done: !!createdOrder },
    { id: 3, label: "Approval", done: uxState === "capturing" || uxState === "payment_successful" },
    { id: 4, label: "Capture", done: uxState === "payment_successful" },
    { id: 5, label: "Settled", done: uxState === "payment_successful" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003087] to-[#001C64] flex items-center justify-center text-[#FFC439] font-extrabold shadow-sm">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-[#001C64] text-base tracking-tight">
              PayPal Checkout & Orders
            </h2>
            <p className="text-xs text-slate-500">
              Server-authoritative Sandbox orders, capture & idempotency rails
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("checkout")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "checkout"
                ? "bg-white text-[#001C64] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Checkout Flow
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "status"
                ? "bg-white text-[#001C64] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Order Lookup
          </button>
        </div>
      </div>

      {/* Stepper Progress (Only in Checkout Tab) */}
      {activeTab === "checkout" && (
        <div className="px-2 py-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-0" />
            {steps.map((st) => (
              <div key={st.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    st.done
                      ? "bg-emerald-600 text-white"
                      : "bg-white border-2 border-slate-300 text-slate-500"
                  }`}
                >
                  {st.done ? <Check className="w-3.5 h-3.5" /> : st.id}
                </div>
                <span className="text-[10px] font-semibold text-slate-600 mt-1">
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: CHECKOUT LIFECYCLE */}
      {activeTab === "checkout" && (
        <div className="space-y-4 flex-1">
          {/* Order Details Form when IDLE */}
          {uxState === "idle" && (
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Governed Sandbox Execution:</strong> To trigger checkout from the AI Copilot or Catalog, click <em>"Buy"</em> on any product to create a proposal, then confirm here.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Amount & Currency
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Customer Email (Sandbox)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Transaction Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateOrder}
                className="w-full py-3 px-4 bg-[#FFC439] hover:bg-[#F2BA36] text-[#001C64] rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20 transition-all"
              >
                <span className="font-black text-sm">PayPal</span>
                <span>Initialize Sandbox Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CREATING ORDER LOADER */}
          {uxState === "creating_order" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Connecting to PayPal Sandbox Rails...</p>
              <p className="text-[11px] text-slate-500">Creating v2/checkout order with idempotency token</p>
            </div>
          )}

          {/* WAITING APPROVAL & CAPTURE READY */}
          {uxState === "waiting_approval" && createdOrder && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-extrabold text-[#001C64] uppercase tracking-wider">
                  Order Initialized on PayPal
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-[#003087]">
                  {createdOrder.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Authorized Amount:</span>
                  <span className="font-extrabold text-[#001C64] text-sm">
                    ${createdOrder.amount?.value} {createdOrder.amount?.currencyCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Internal Reference:</span>
                  <span className="font-mono font-semibold text-slate-700 text-[11px]">
                    {createdOrder.internalReference || "N/A"}
                  </span>
                </div>
              </div>

              {/* Approval Link */}
              {createdOrder.approvalLink && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                    <span>Buyer Sandbox Authorization</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    In live environments, the buyer completes approval in PayPal checkout. In this sandbox environment, approval is pre-granted or simulated.
                  </p>
                </div>
              )}

              {/* Server-Side Capture CTA */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCaptureOrder}
                  className="flex-1 py-3 px-4 bg-[#003087] hover:bg-[#001C64] text-white rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 shadow-md shadow-blue-900/20 transition-all"
                >
                  <Lock className="w-3.5 h-3.5 text-[#FFC439]" />
                  <span>Execute Server-Side Payment Capture</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* CAPTURING LOADER */}
          {uxState === "capturing" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Capturing Funds via PayPal API...</p>
              <p className="text-[11px] text-slate-500">Executing server-authoritative capture and updating SQLite database</p>
            </div>
          )}

          {/* PAYMENT SUCCESSFUL */}
          {uxState === "payment_successful" && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-900 text-base">Payment Captured Successfully!</h3>
                  <p className="text-xs text-emerald-700">PayPal transaction completed and verified in database.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">PayPal Order ID:</span>
                  <span className="font-mono font-bold text-slate-900">{createdOrder?.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Capture ID:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {capturedResult?.captureId || "MOCK-CAP-CONFIRMED"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Captured Amount:</span>
                  <span className="font-extrabold text-emerald-800 text-sm">
                    ${createdOrder?.amount?.value} {createdOrder?.amount?.currencyCode}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Internal Reference:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {createdOrder?.internalReference || "N/A"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Start New Transaction
              </button>
            </div>
          )}

          {/* PAYMENT FAILED */}
          {uxState === "payment_failed" && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <h4 className="font-bold text-sm">Payment or Order Initialization Failed</h4>
              </div>
              <p className="text-xs text-rose-700 bg-white p-3 rounded-lg border border-rose-200">
                {errorMessage || "An unexpected error occurred while communicating with the payment rails."}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE ORDER STATUS LOOKUP */}
      {activeTab === "status" && (
        <div className="space-y-4 flex-1">
          <form onSubmit={handleLookupOrder} className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Query Order or Payment Record
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Enter ORD-PROP-XXXX or PayPal Order ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading || !lookupQuery.trim()}
                className="px-4 py-2 bg-[#003087] hover:bg-[#001C64] text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
              >
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
              </button>
            </div>
          </form>

          {lookupError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <span className="font-bold">Lookup Error:</span> {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-600">Database Record</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    lookupResult.status === "CAPTURED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-blue-100 text-blue-800 border border-blue-300"
                  }`}
                >
                  {lookupResult.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Reference:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    {lookupResult.internalReference}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Amount:</span>
                  <span className="font-extrabold text-[#003087] text-sm">
                    ${lookupResult.amount?.toFixed(2)} {lookupResult.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PayPal Order ID:</span>
                  <span className="font-mono text-slate-700 text-[11px]">{lookupResult.paypalOrderId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Created:</span>
                  <span className="text-slate-600 text-[11px]">
                    {new Date(lookupResult.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}