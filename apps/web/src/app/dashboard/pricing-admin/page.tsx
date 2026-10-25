"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

interface PricingRate {
  id: string;
  country: string;
  isoCode: string;
  countryDialCode: string;
  category: string;
  basePrice: number | string;
  providerCost: number | string;
  providerCurrency: string;
  providerCostInr: number | string;
  fxRate: number | string;
  fxBufferPercent: number | string;
  infraCostInr: number | string;
  totalCostInr: number | string;
  minMarginPercent: number | string;
  actualMarginPercent: number | string;
  marginInr: number | string;
  status: string;
  lossRiskStatus: string;
  version: number;
  rateCardVersion: string;
  updatedAt: string;
}

// Defensive number formatters
const formatCurrency = (val: number | string | undefined | null, decimals = 2): string => {
  if (val === undefined || val === null || val === "") return "0.00";
  const num = Number(val);
  return isNaN(num) ? "0.00" : num.toFixed(decimals);
};

const formatPercent = (val: number | string | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || val === "") return "0.0";
  const num = Number(val);
  return isNaN(num) ? "0.0" : num.toFixed(decimals);
};

export default function PricingAdminPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [taxConfig, setTaxConfig] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Edit Rate Modal State
  const [editingRate, setEditingRate] = useState<PricingRate | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editProviderCost, setEditProviderCost] = useState<number>(0);
  const [editInfraCost, setEditInfraCost] = useState<number>(0.01);
  const [editMinMargin, setEditMinMargin] = useState<number>(15);
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [auditReason, setAuditReason] = useState<string>("");

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustOrgId, setAdjustOrgId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/admin/pricing-rates`);
      const data = await res.json();
      if (data && data.success) {
        setRates(Array.isArray(data.rates) ? data.rates : []);
        setTaxConfig(data.taxConfig || null);
        setExchangeRate(data.exchangeRate || null);
      }
    } catch (err: any) {
      console.error("Failed to load admin pricing rates", err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Pricing & Margin Safety Admin | Digital Beings";
    loadData();
  }, [loadData]);

  const handleEditRate = (rate: PricingRate) => {
    setEditingRate(rate);
    setEditPrice(Number(rate.basePrice) || 0);
    setEditProviderCost(Number(rate.providerCost) || 0);
    setEditInfraCost(Number(rate.infraCostInr) || 0.01);
    setEditMinMargin(Number(rate.minMarginPercent) || 15);
    setEditStatus(rate.status || "ACTIVE");
    setAuditReason("");
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditReason || auditReason.trim().length < 5) {
      return showWarning("A clear audit reason (at least 5 characters) is mandatory for financial pricing changes.", "Audit Reason Required");
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/admin/pricing-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRate?.id,
          country: editingRate?.country,
          isoCode: editingRate?.isoCode,
          countryDialCode: editingRate?.countryDialCode,
          category: editingRate?.category,
          basePrice: editPrice,
          providerCost: editProviderCost,
          providerCurrency: editingRate?.providerCurrency,
          fxRate: editingRate?.fxRate,
          fxBufferPercent: editingRate?.fxBufferPercent,
          infraCostInr: editInfraCost,
          minMarginPercent: editMinMargin,
          status: editStatus,
          reason: auditReason,
          actor: "cfo@digitalbeings.in"
        })
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(`Rate updated to version ${data.rate?.version || 2} with status ${data.rate?.lossRiskStatus || "SAFE"}.`, "Rate Saved");
        setEditingRate(null);
        loadData();
      } else {
        showError(data.error || "Failed to update rate", "Update Blocked");
      }
    } catch (err: any) {
      showError(err.message, "Network Error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (rate: PricingRate) => {
    const newStatus = rate.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const reason = prompt(`Enter mandatory audit reason for changing route status to ${newStatus}:`);
    if (!reason || reason.trim().length < 5) {
      return showWarning("Audit reason is mandatory for status change.", "Action Aborted");
    }

    try {
      const res = await fetch(`${getApiUrl()}/v1/admin/pricing-rates/${rate.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason, actor: "admin@digitalbeings.in" })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Route status changed to ${newStatus}.`, "Status Updated");
        loadData();
      } else {
        showError(data.error || "Failed to change status", "Error");
      }
    } catch (err: any) {
      showError(err.message, "Network Error");
    }
  };

  const handleRunReconciliation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/admin/reconciliation`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showSuccess(
          `Reconciliation completed successfully!\n\nStale Reservations Released: ${data.staleReservationsReleased || 0}\nTotal Dispatches Audited: ${data.totalDispatches || 0}\nActive Routes Monitored: ${data.activeRatesCount || 0}`,
          "Reconciliation Complete"
        );
        loadData();
      } else {
        showError(data.error || "Reconciliation failed", "Error");
      }
    } catch (err: any) {
      showError(err.message, "Network Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason || adjustReason.trim().length < 5) {
      return showWarning("Audit reason is required for balance adjustment.", "Reason Required");
    }

    try {
      const res = await fetch(`${getApiUrl()}/v1/admin/wallet/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: adjustOrgId,
          amount: Number(adjustAmount),
          reason: adjustReason,
          adminEmail: "admin@digitalbeings.in"
        })
      });
      const data = await res.json();
      if (data.success) {
        const bal = formatCurrency(data.newBalance, 2);
        showSuccess(`Compensating ledger entry created. New wallet balance: ₹${bal}`, "Adjustment Recorded");
        setShowAdjustModal(false);
        setAdjustOrgId("");
        setAdjustAmount(0);
        setAdjustReason("");
      } else {
        showError(data.error || "Adjustment failed", "Error");
      }
    } catch (err: any) {
      showError(err.message, "Network Error");
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Pricing & Safety Engine...</p>
      </div>
    );
  }

  const activeRoutesCount = rates.filter(r => r.status === "ACTIVE").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 text-base shrink-0 font-bold">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {activeRoutesCount} Active Rate Route{activeRoutesCount !== 1 ? "s" : ""} Monitored
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400">Wholesale Meta Cloud API rates, FX risk buffer & double-entry margin guard</p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs cursor-pointer"
            >
              <span>⚖️</span> Manual Adjustment
            </button>
            <button
              onClick={handleRunReconciliation}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span> Run Reconciliation
            </button>
          </div>
        </div>

      {/* Global Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tax Config */}
        <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] p-6 rounded-3xl shadow-2xs backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tax Treatment</span>
            <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">GST Standard</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatPercent(taxConfig?.taxRatePercent || 18, 0)}% GST
          </div>
          <p className="text-xs text-slate-500 mt-1">
            CGST {formatPercent(taxConfig?.cgstPercent || 9, 0)}% + SGST {formatPercent(taxConfig?.sgstPercent || 9, 0)}% (Intra-state) / IGST {formatPercent(taxConfig?.igstPercent || 18, 0)}% (Inter-state)
          </p>
          <div className="pt-3 mt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Supplier GSTIN: {taxConfig?.supplierGstin || "27AABCU9603R1ZM"}
          </div>
        </div>

        {/* FX Source */}
        <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] p-6 rounded-3xl shadow-2xs backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">USD/INR Exchange Rate</span>
            <span className="bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">RBI Ref + Buffer</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            ₹{formatCurrency(exchangeRate?.effectiveRate || 88.66, 2)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Base: ₹{formatCurrency(exchangeRate?.baseRate || 86.50, 2)} with {formatPercent(exchangeRate?.bufferPercent || 2.5, 1)}% FX volatility buffer
          </p>
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.08] text-[10px] text-slate-400 font-mono">
            Source: {exchangeRate?.source || "RBI_REFERENCE_AUDITED"}
          </div>
        </div>

        {/* Route Stats */}
        <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] p-6 rounded-3xl shadow-2xs backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Messaging Routes</span>
            <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Margin Guard Active</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeRoutesCount} <span className="text-sm font-normal text-slate-400">/ {rates.length} total</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Minimum Margin Policy: 15.0%. Routes below threshold are blocked automatically.
          </p>
          <div className="pt-3 mt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Rate Card: meta_v2026_q4
          </div>
        </div>
      </div>

      {/* Master Rates Table */}
      <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Configured Messaging Routes & Rates</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database rates used by the message evaluation engine for OTP, Utility, and Marketing dispatches.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Meta Cost</th>
                <th className="py-3 px-3">Total Cost (INR)</th>
                <th className="py-3 px-3">Retail Price</th>
                <th className="py-3 px-3">Margin %</th>
                <th className="py-3 px-3">Loss-Risk Status</th>
                <th className="py-3 px-3">Route Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    No pricing routes configured in database.
                  </td>
                </tr>
              ) : (
                rates.map((r) => {
                  const actualMargin = Number(r.actualMarginPercent) || 0;
                  const minMargin = Number(r.minMarginPercent) || 15;
                  const isSafeMargin = actualMargin >= minMargin;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-4 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {r.country} <span className="text-xs font-mono text-slate-400">({r.isoCode})</span>
                      </td>
                      <td className="py-4 px-3 font-semibold text-slate-700 text-xs">
                        {r.category === "AUTHENTICATION" ? "🔐 OTP" :
                         r.category === "UTILITY" ? "⚡ Utility" :
                         "📢 Marketing"}
                      </td>
                      <td className="py-4 px-3 font-mono text-xs text-slate-600">
                        {r.providerCurrency === "USD" ? `$${formatCurrency(r.providerCost, 4)}` : `₹${formatCurrency(r.providerCost, 4)}`}
                      </td>
                      <td className="py-4 px-3 font-mono text-xs text-slate-600">
                        ₹{formatCurrency(r.totalCostInr, 4)}
                      </td>
                      <td className="py-4 px-3 font-mono font-black text-slate-900 text-base">
                        ₹{formatCurrency(r.basePrice, 2)}
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-xs">
                        <span className={isSafeMargin ? "text-emerald-600" : "text-red-600"}>
                          {formatPercent(r.actualMarginPercent, 1)}%
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.lossRiskStatus === "SAFE"
                            ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-red-50 dark:bg-rose-500/20 text-red-700 dark:text-rose-300 border border-red-200 dark:border-rose-500/30"
                        }`}>
                          {r.lossRiskStatus === "SAFE" ? "SAFE" : "UNSAFE_BLOCKED"}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "ACTIVE"
                            ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            r.status === "ACTIVE"
                              ? "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/30"
                              : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/30"
                          }`}
                        >
                          {r.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleEditRate(r)}
                          className="px-2.5 py-1 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Edit Rate */}
      {editingRate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Route Pricing</h3>
                <p className="text-xs text-slate-500 font-bold">{editingRate.country} ({editingRate.category})</p>
              </div>
              <button onClick={() => setEditingRate(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Retail Price (₹ Excl. GST)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Meta Cost ({editingRate.providerCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editProviderCost}
                    onChange={(e) => setEditProviderCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Infra / Route Cost (₹)</label>
                  <input
                    type="number"
                    step="0.005"
                    value={editInfraCost}
                    onChange={(e) => setEditInfraCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Safe Margin %</label>
                  <input
                    type="number"
                    step="1"
                    value={editMinMargin}
                    onChange={(e) => setEditMinMargin(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Route Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-emerald-500"
                >
                  <option value="ACTIVE">ACTIVE (Dispatches Allowed)</option>
                  <option value="SUSPENDED">SUSPENDED (Dispatches Blocked)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mandatory Audit Reason (Min 5 chars)
                </label>
                <textarea
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="e.g. Meta Q4 rate card revision verified with finance"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Save Rate & Audit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manual Balance Adjustment */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Compensating Ledger Adjustment</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleRecordAdjustment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Organization ID</label>
                <input
                  type="text"
                  value={adjustOrgId}
                  onChange={(e) => setAdjustOrgId(e.target.value)}
                  placeholder="Enter organizationId"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="Positive to credit (+), Negative to debit (-)"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-emerald-500"
                  required
                />
                <span className="text-[11px] text-slate-400">Use positive value for credit, negative for debit.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mandatory Audit Reason</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Compensating credit for verified downstream carrier latency"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Record Compensating Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
