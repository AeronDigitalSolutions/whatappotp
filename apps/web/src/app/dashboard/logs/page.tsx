"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import Loader from "@/components/Loader";

interface AttemptItem {
  id: string;
  successful: boolean;
  createdAt: string;
  ipAddress?: string;
}

interface OtpLogItem {
  id: string;
  phone: string;
  channel: string;
  status: "verified" | "sent" | "failed" | "expired" | "queued";
  purpose: string;
  reference: string | null;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  cost: number;
  attemptsHistory: AttemptItem[];
}

export default function LogsPage() {
  const { showError, showSuccess } = useModal();
  const [logs, setLogs] = useState<OtpLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OtpLogItem | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  const loadLogs = async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const url = new URL(`${getApiUrl()}/v1/otp/logs/${projectId}`);
      if (filterStatus !== "ALL") {
        url.searchParams.set("status", filterStatus);
      }
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || "Failed to fetch logs");
      }
    } catch (e: any) {
      setError(e.message || "Failed to connect to API server");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [projectId, filterStatus]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, projectId, filterStatus]);

  const handleResendOtp = async (requestId: string) => {
    setResending(true);
    setResendMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/otp/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendMessage("Fresh OTP code dispatched successfully!");
        loadLogs(true);
      } else {
        showError(data.error || "Failed to resend OTP", "Resend Failed");
      }
    } catch (e: any) {
      showError(e.message || "Network error", "Network Error");
    } finally {
      setResending(false);
    }
  };

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.phone.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q) ||
      log.purpose.toLowerCase().includes(q)
    );
  });

  // Calculate Metrics
  const totalDispatches = logs.length;
  const verifiedCount = logs.filter((l) => l.status === "verified").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const successRate = totalDispatches > 0 ? Math.round((verifiedCount / totalDispatches) * 100) : 0;
  const totalCost = logs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Verified
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Delivered
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Failed
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OTP Delivery Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit trail of every WhatsApp OTP dispatched, verified, and audited.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Live Sync (5s)</span>
            {autoRefresh && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
          </label>

          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Logs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Requests</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalDispatches}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched all-time</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Verification Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{successRate}%</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">{verifiedCount} successfully verified</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Failed Dispatches</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{failedCount}</div>
          <div className="text-[11px] text-red-500/80 mt-0.5">Automatically refunded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Cost Deducted</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{totalCost.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">₹0.50 per sent OTP</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "VERIFIED", "SENT", "FAILED", "EXPIRED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === status
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone, request ID, purpose..."
            className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader scale={0.95} color="#0f172a" />
            <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fetching real-time logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Delivery Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? "No logs matching your search term." : "Send your first OTP through API Keys or the Sandbox to view real-time logs here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-xs">Status</th>
                  <th className="px-5 py-3 font-semibold text-xs">Phone Number</th>
                  <th className="px-5 py-3 font-semibold text-xs">Purpose</th>
                  <th className="px-5 py-3 font-semibold text-xs">Channel</th>
                  <th className="px-5 py-3 font-semibold text-xs">Attempts</th>
                  <th className="px-5 py-3 font-semibold text-xs">Timestamp</th>
                  <th className="px-5 py-3 font-semibold text-xs text-right">Cost</th>
                  <th className="px-5 py-3 font-semibold text-xs text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-slate-900">{log.phone}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {log.purpose}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="capitalize">{log.channel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`font-semibold ${log.attempts > 0 ? "text-slate-900" : "text-slate-400"}`}>
                        {log.attempts}
                      </span>
                      <span className="text-slate-400">/{log.maxAttempts}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-right text-slate-900">
                      {log.cost > 0 ? `₹${log.cost.toFixed(2)}` : <span className="text-slate-400">₹0.00</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setResendMessage(null);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">OTP Audit Details</h3>
                <p className="text-xs text-slate-500">Request ID: <span className="font-mono text-slate-800">{selectedLog.id}</span></p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Recipient Phone</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedLog.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Dispatched Time</span>
                <span className="text-slate-800">{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Expires At</span>
                <span className="text-slate-800">{new Date(selectedLog.expiresAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cost Deducted</span>
                <span className="font-bold text-slate-900">₹{selectedLog.cost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Attempts Made</span>
                <span className="font-bold text-slate-900">{selectedLog.attempts} of {selectedLog.maxAttempts}</span>
              </div>
            </div>

            {/* Verification History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Verification Attempt Trail ({selectedLog.attemptsHistory?.length || 0})
              </h4>
              {selectedLog.attemptsHistory && selectedLog.attemptsHistory.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedLog.attemptsHistory.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                        att.successful
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1">
                        {att.successful ? "✓ Verified Successfully" : "✗ Incorrect Code"}
                      </span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>IP: {att.ipAddress || "127.0.0.1"}</span>
                        <span>•</span>
                        <span>{new Date(att.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No verification attempts logged yet for this OTP.</p>
              )}
            </div>

            {resendMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                {resendMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedLog.status !== "verified" ? (
                <button
                  type="button"
                  disabled={resending}
                  onClick={() => handleResendOtp(selectedLog.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend New OTP"}
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ OTP Already Verified
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
