"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Bot,
  Scale,
  Activity,
  Menu,
  X,
  Lock,
  LayoutGrid,
} from "lucide-react";

export type ActiveNavTab = "catalog" | "copilot" | "compare" | "orders" | "audit" | "all";

interface HeaderProps {
  activeTab?: ActiveNavTab;
  onTabChange?: (tab: ActiveNavTab) => void;
  comparisonCount?: number;
}

export function Header({
  activeTab = "all",
  onTabChange,
  comparisonCount = 0,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveNavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "all", label: "Full Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "catalog", label: "Product Catalog (AG Grid)", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "copilot", label: "AI Commerce Copilot", icon: <Bot className="w-4 h-4" /> },
    {
      id: "compare",
      label: "Comparison",
      icon: <Scale className="w-4 h-4" />,
      badge: comparisonCount > 0 ? comparisonCount : undefined,
    },
    { id: "orders", label: "Orders & Checkout", icon: <CreditCard className="w-4 h-4" /> },
    { id: "audit", label: "Security & Policy", icon: <Activity className="w-4 h-4" /> },
  ];

  const handleNavClick = (tabId: ActiveNavTab) => {
    if (onTabChange) onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003087] to-[#001C64] flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-900/20 tracking-tighter">
              <span className="text-white">P</span>
              <span className="text-[#FFC439] -ml-1">P</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-[#001C64] tracking-tight text-lg">
                  PayPal <span className="text-[#0079C1]">AI Commerce</span>
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#003087] border border-blue-200">
                  Phase 8
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 font-medium">
                Governed Agentic Commerce • AG Grid • PayPal Sandbox
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  activeTab === item.id
                    ? "bg-[#003087] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                aria-current={activeTab === item.id ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      activeTab === item.id ? "bg-[#FFC439] text-slate-900" : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Status Badges & Mobile Toggle */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SANDBOX</span>
            </div>

            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>POLICY GUARD</span>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${
                activeTab === item.id
                  ? "bg-[#003087] text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC439] text-slate-900">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="inline-flex items-center text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> Sandbox Verified
            </span>
            <span className="inline-flex items-center text-indigo-700 font-semibold">
              <Lock className="w-3.5 h-3.5 mr-1" /> Financial Invariant Active
            </span>
          </div>
        </div>
      )}
    </header>
  );
}