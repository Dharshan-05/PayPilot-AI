"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Terminal } from "lucide-react";

interface AuditLogEntry {
  id: string;
  requestId: string;
  operation: string;
  provider: string;
  model: string;
  status: string;
  latencyMs?: number;
  promptSummary?: string;
  responseSummary?: string;
  createdAt: string;
}

export function SecurityAuditFeed({ refreshSignal }: { refreshSignal?: number }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/ai?limit=10");
      const data = await res.json();
      if (res.ok && data.data) {
        setLogs(data.data);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshSignal]);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-md flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base">Live Security & AI Audit Trail</h2>
            <p className="text-xs text-slate-400">Zero secrets leaked • Request ID correlation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          title="Refresh audit feed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-72 pr-1 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-slate-500 py-6 text-center italic">
            No audit records yet. Submit an AI query or create an order above to generate logs.
          </div>
        ) : (
          logs.map((log) => {
            const isSuccess = log.status === "SUCCESS";
            const isBlocked = log.status === "REJECTED_BY_POLICY" || log.status === "BLOCKED_INJECTION";
            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 flex flex-col space-y-1"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()} • {log.provider} ({log.model})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                      isSuccess
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isBlocked
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <div className="text-slate-300 font-semibold truncate">
                  [{log.operation}] {log.promptSummary || "No prompt summary"}
                </div>
                <div className="text-slate-400 text-[11px] truncate">
                  ↳ {log.responseSummary || "N/A"}
                  {log.latencyMs ? ` (${log.latencyMs}ms)` : ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
