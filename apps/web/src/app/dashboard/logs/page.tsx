"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useSubscription } from "@/context/SubscriptionContext";
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
  const { isDemo, triggerPaywall } = useSubscription();

  // Core state
  const [logs, setLogs] = useState<OtpLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPurpose, setFilterPurpose] = useState<string>("ALL");
  const [filterDateRange, setFilterDateRange] = useState<string>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // UI state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OtpLogItem | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportMenu]);

  // Load logs from API with server-side query filters
  const loadLogs = async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const url = new URL(`${getApiUrl()}/v1/otp/logs/${projectId}`);
      if (filterStatus !== "ALL") {
        url.searchParams.set("status", filterStatus);
      }
      if (filterPurpose !== "ALL") {
        url.searchParams.set("purpose", filterPurpose);
      }
      if (filterDateRange === "CUSTOM") {
        if (customStartDate) url.searchParams.set("startDate", customStartDate + "T00:00:00.000Z");
        if (customEndDate) url.searchParams.set("endDate", customEndDate + "T23:59:59.999Z");
      } else if (filterDateRange === "TODAY") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        url.searchParams.set("startDate", start);
      } else if (filterDateRange === "YESTERDAY") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1).toISOString();
        url.searchParams.set("startDate", start);
        url.searchParams.set("endDate", end);
      } else if (filterDateRange === "7DAYS") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        url.searchParams.set("startDate", start);
      } else if (filterDateRange === "30DAYS") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
        url.searchParams.set("startDate", start);
      } else if (filterDateRange === "THIS_MONTH") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        url.searchParams.set("startDate", start);
      }

      url.searchParams.set("limit", "500");

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
  }, [projectId, filterStatus, filterPurpose, filterDateRange, customStartDate, customEndDate]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, projectId, filterStatus, filterPurpose, filterDateRange, customStartDate, customEndDate]);

  const handleResendOtp = async (requestId: string) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To resend and dispatch live OTP messages to user handsets, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
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

  // Instant reactive client-side filtering on logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Status Filter
      if (filterStatus !== "ALL") {
        const targetStatus = filterStatus === "SENT" ? "sent" : filterStatus.toLowerCase();
        if (log.status.toLowerCase() !== targetStatus) return false;
      }

      // 2. Purpose Filter
      if (filterPurpose !== "ALL") {
        const p = (log.purpose || "AUTHENTICATION").toUpperCase();
        if (p !== filterPurpose.toUpperCase()) return false;
      }

      // 3. Date Filter
      if (filterDateRange !== "ALL") {
        const logTime = new Date(log.createdAt).getTime();
        const now = new Date();

        if (filterDateRange === "TODAY") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (logTime < startOfToday) return false;
        } else if (filterDateRange === "YESTERDAY") {
          const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
          const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;
          if (logTime < startOfYesterday || logTime > endOfYesterday) return false;
        } else if (filterDateRange === "7DAYS") {
          const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
          if (logTime < sevenDaysAgo) return false;
        } else if (filterDateRange === "30DAYS") {
          const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
          if (logTime < thirtyDaysAgo) return false;
        } else if (filterDateRange === "THIS_MONTH") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          if (logTime < startOfMonth) return false;
        } else if (filterDateRange === "CUSTOM") {
          if (customStartDate) {
            const start = new Date(customStartDate + "T00:00:00").getTime();
            if (logTime < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate + "T23:59:59").getTime();
            if (logTime > end) return false;
          }
        }
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          log.phone.toLowerCase().includes(q) ||
          log.id.toLowerCase().includes(q) ||
          (log.purpose || "AUTHENTICATION").toLowerCase().includes(q) ||
          (log.reference || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, filterStatus, filterPurpose, filterDateRange, customStartDate, customEndDate, searchQuery]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setFilterStatus("ALL");
    setFilterPurpose("ALL");
    setFilterDateRange("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
  };

  const isFiltered =
    filterStatus !== "ALL" ||
    filterPurpose !== "ALL" ||
    filterDateRange !== "ALL" ||
    !!customStartDate ||
    !!customEndDate ||
    !!searchQuery.trim();

  // Dynamic KPI Metrics based on filtered data
  const totalFilteredCount = filteredLogs.length;
  const verifiedCount = filteredLogs.filter((l) => l.status === "verified").length;
  const failedCount = filteredLogs.filter((l) => l.status === "failed").length;
  const successRate = totalFilteredCount > 0 ? Math.round((verifiedCount / totalFilteredCount) * 100) : 0;
  const totalCost = filteredLogs.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  // Status Badge UI
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Verified
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Delivered
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-rose-500/20 text-red-800 dark:text-rose-300 border border-red-200 dark:border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Failed
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {status}
          </span>
        );
    }
  };

  // Purpose Badge UI with dedicated color palettes & icons
  const getPurposeBadge = (purpose: string) => {
    const p = (purpose || "AUTHENTICATION").toUpperCase();
    switch (p) {
      case "AUTHENTICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 font-mono">
            <span>🔐</span>
            AUTHENTICATION
          </span>
        );
      case "UTILITY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-mono">
            <span>⚡</span>
            UTILITY
          </span>
        );
      case "MARKETING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-mono">
            <span>📢</span>
            MARKETING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-mono">
            <span>📋</span>
            {p}
          </span>
        );
    }
  };

  // ---------------- EXPORT LOGIC ----------------
  // 1. Export as Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      showError("No log records available to export for the current filter.", "Export Failed");
      return;
    }

    try {
      setExportingType("Excel");
      const rows = filteredLogs.map((log, index) => ({
        "Sr No": index + 1,
        "Request ID": log.id,
        "Phone Number": log.phone,
        "Purpose": (log.purpose || "AUTHENTICATION").toUpperCase(),
        "Status": log.status.toUpperCase(),
        "Channel": log.channel,
        "Attempts Made": log.attempts,
        "Max Allowed": log.maxAttempts,
        "Dispatched At": new Date(log.createdAt).toLocaleString(),
        "Expires At": new Date(log.expiresAt).toLocaleString(),
        "Cost (INR)": Number((log.cost || 0).toFixed(2)),
        "Reference": log.reference || "N/A"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 38 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 22 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
      const filename = `whatsapp_audit_logs_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename, { bookType: "xlsx" });
      showSuccess(`Exported ${filteredLogs.length} audit records to Excel (${filename})`, "Export Complete");
    } catch (err: any) {
      showError(err.message || "Failed to generate Excel workbook", "Export Error");
    } finally {
      setExportingType(null);
    }
  };

  // 2. Export as CSV (.csv)
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showError("No log records available to export for the current filter.", "Export Failed");
      return;
    }

    try {
      setExportingType("CSV");
      const rows = filteredLogs.map((log, index) => ({
        "Sr No": index + 1,
        "Request ID": log.id,
        "Phone Number": log.phone,
        "Purpose": (log.purpose || "AUTHENTICATION").toUpperCase(),
        "Status": log.status.toUpperCase(),
        "Channel": log.channel,
        "Attempts Made": log.attempts,
        "Max Allowed": log.maxAttempts,
        "Dispatched At": new Date(log.createdAt).toLocaleString(),
        "Expires At": new Date(log.expiresAt).toLocaleString(),
        "Cost (INR)": (log.cost || 0).toFixed(2),
        "Reference": log.reference || "N/A"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
      const filename = `whatsapp_audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      XLSX.writeFile(wb, filename, { bookType: "csv" });
      showSuccess(`Exported ${filteredLogs.length} audit records to CSV (${filename})`, "Export Complete");
    } catch (err: any) {
      showError(err.message || "Failed to generate CSV export", "Export Error");
    } finally {
      setExportingType(null);
    }
  };

  // 3. Export as Executive PDF Report (.pdf)
  const handleExportPDF = async () => {
    if (filteredLogs.length === 0) {
      showError("No log records available to export for the current filter.", "Export Failed");
      return;
    }

    try {
      setExportingType("PDF");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      // Brand Header Top Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 65, "F");

      // Brand Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("DIGITAL BEINGS - WHATSAPP AUDIT & DISPATCH REPORT", 36, 32);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Official Meta WhatsApp Cloud API Telemetry & Verification Audit Trails", 36, 48);

      // Metadata Bar
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      const dateStr = new Date().toLocaleString();
      doc.text(`Generated: ${dateStr}`, 36, 82);
      doc.text(`Purpose Filter: ${filterPurpose}`, 230, 82);
      doc.text(`Status Filter: ${filterStatus}`, 380, 82);
      doc.text(`Date Range: ${filterDateRange}`, 510, 82);

      // Summary KPIs Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(36, 92, doc.internal.pageSize.getWidth() - 72, 30, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Records: ${totalFilteredCount}`, 48, 111);
      doc.text(`Verification Rate: ${successRate}% (${verifiedCount} verified)`, 190, 111);
      doc.text(`Failed Dispatches: ${failedCount}`, 380, 111);
      doc.text(`Total Deducted: INR ${totalCost.toFixed(2)}`, 540, 111);

      // Table Rows
      const tableBody = filteredLogs.map((log, index) => [
        String(index + 1),
        log.phone,
        (log.purpose || "AUTHENTICATION").toUpperCase(),
        log.status.toUpperCase(),
        log.channel,
        `${log.attempts}/${log.maxAttempts}`,
        new Date(log.createdAt).toLocaleString(),
        log.cost > 0 ? `INR ${log.cost.toFixed(2)}` : "INR 0.00",
        log.id.substring(0, 14) + "..."
      ]);

      autoTable(doc, {
        startY: 132,
        head: [["#", "Phone Number", "Purpose", "Status", "Channel", "Attempts", "Dispatched At", "Cost", "Request ID"]],
        body: tableBody,
        theme: "striped",
        headStyles: {
          fillColor: [21, 67, 54], // Digital Beings green #154336
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
          halign: "left"
        },
        styles: {
          fontSize: 8,
          cellPadding: 5,
          valign: "middle"
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data: any) => {
          const pageCount = (doc.internal as any).getNumberOfPages
            ? (doc.internal as any).getNumberOfPages()
            : doc.internal.pages.length - 1;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} • Digital Beings Cloud Suite • Confidential Audit Record`,
            36,
            doc.internal.pageSize.getHeight() - 20
          );
        }
      });

      const filename = `whatsapp_audit_report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      showSuccess(`Exported ${filteredLogs.length} audit records to PDF (${filename})`, "Export Complete");
    } catch (err: any) {
      showError(err.message || "Failed to generate PDF report", "Export Error");
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Control Bar with Records Summary & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 text-base shrink-0 font-bold">
            📋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {totalFilteredCount.toLocaleString()} {isFiltered ? `Filtered Records (${logs.length} Total)` : "Total Dispatch Records"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400">Real-time audit log of WhatsApp OTP delivery & verification telemetry</p>
          </div>
        </div>

        {/* Right Controls: Export Dropdown + Live Sync + Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Menu Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={filteredLogs.length === 0 || !!exportingType}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingType ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>{exportingType ? `Exporting ${exportingType}...` : "Export Audits"}</span>
              <svg className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.08] mb-1">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Export Active Logs & Audits</p>
                  <p className="text-[10px] text-slate-400">Includes {filteredLogs.length} active filtered records</p>
                </div>

                {/* Excel Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportExcel();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.06] text-left transition group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold shrink-0">
                    📊
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition">
                      Excel Spreadsheet (.xlsx)
                    </div>
                    <div className="text-[10px] text-slate-400">Workbook with structured columns & widths</div>
                  </div>
                </button>

                {/* CSV Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportCSV();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.06] text-left transition group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                    📄
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition">
                      CSV Document (.csv)
                    </div>
                    <div className="text-[10px] text-slate-400">Standard comma-separated data format</div>
                  </div>
                </button>

                {/* PDF Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportPDF();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.06] text-left transition group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 text-sm font-bold shrink-0">
                    📑
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition">
                      Executive PDF Report (.pdf)
                    </div>
                    <div className="text-[10px] text-slate-400">Formatted printable report with KPI headers</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs">
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
            className="px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPI Cards reflecting current active filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs shrink-0 font-bold">
              📨
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Total Requests</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-950 dark:text-white">{totalFilteredCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-700 dark:text-slate-400 font-medium mt-0.5">
            {isFiltered ? `Filtered view (${logs.length} all-time)` : "Dispatched all-time"}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs shrink-0 font-bold">
              ✓
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Verification Rate</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-950 dark:text-white">{successRate}%</div>
          <div className="text-[11px] text-slate-700 dark:text-slate-400 font-medium mt-0.5">{verifiedCount.toLocaleString()} successfully verified</div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xs shrink-0 font-bold">
              ✕
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Failed Dispatches</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-rose-600">{failedCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-700 dark:text-slate-400 font-medium mt-0.5">Automatically refunded</div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs shrink-0 font-bold">
              💳
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Total Deducted</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-950 dark:text-white">₹{totalCost.toFixed(2)}</div>
          <div className="text-[11px] text-slate-700 dark:text-slate-400 font-medium mt-0.5">₹0.25 per sent OTP (India)</div>
        </div>
      </div>

      {/* Advanced Filter, Purpose Dropdown, Date Range & Search Bar */}
      <div className="bg-white dark:bg-[#0B101D]/80 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left group: Status Pills + Purpose Filter + Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
              {(["ALL", "VERIFIED", "SENT", "FAILED", "EXPIRED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterStatus === status
                      ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
                  }`}
                >
                  {status === "SENT" ? "DELIVERED" : status}
                </button>
              ))}
            </div>

            {/* Purpose Filter Dropdown */}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 pointer-events-none text-slate-400 text-xs">🎯</span>
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs appearance-none"
              >
                <option value="ALL">All Purposes</option>
                <option value="AUTHENTICATION">Authentication (OTP)</option>
                <option value="UTILITY">Utility (Updates & Alerts)</option>
                <option value="MARKETING">Marketing (Campaigns)</option>
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative flex items-center">
              <span className="absolute left-2.5 pointer-events-none text-slate-400 text-xs">📅</span>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs appearance-none"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="30DAYS">Last 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
              <svg className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Reset Filters CTA if any filter active */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <span>✕</span>
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Right group: Search Input */}
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone, ID, purpose..."
              className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker Sub-row (active when filterDateRange === 'CUSTOM') */}
        {filterDateRange === "CUSTOM" && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-auto text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setCustomStartDate(today);
                  setCustomEndDate(today);
                }}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setCustomStartDate(d.toISOString().split("T")[0]);
                  setCustomEndDate(new Date().toISOString().split("T")[0]);
                }}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setCustomStartDate(d.toISOString().split("T")[0]);
                  setCustomEndDate(new Date().toISOString().split("T")[0]);
                }}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              >
                Clear Dates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader scale={0.95} color="#0f172a" />
            <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fetching real-time logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-10 h-10 bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-300 border border-transparent dark:border-white/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Delivery Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isFiltered
                ? "No logs match your selected status, purpose, or date range filters. Try resetting your filters."
                : "Send your first message or OTP through the Live Gateway or API to view real-time logs here."}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-[#070b14] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.08]">
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
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-slate-700 dark:text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{log.phone}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {getPurposeBadge(log.purpose)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="capitalize">{log.channel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className={`font-semibold ${log.attempts > 0 ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                        {log.attempts}
                      </span>
                      <span className="text-slate-400">/{log.maxAttempts}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-right text-slate-900 dark:text-slate-100">
                      {log.cost > 0 ? `₹${log.cost.toFixed(2)}` : <span className="text-slate-400">₹0.00</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setResendMessage(null);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
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
          <div className="bg-white dark:bg-[#0B101D] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">WhatsApp Audit Trail Details</h3>
                <p className="text-xs text-slate-500">Request ID: <span className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.id}</span></p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-[#070b14] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08]">
              <div>
                <span className="text-slate-500 block">Recipient Phone</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedLog.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Message Purpose</span>
                <div className="mt-0.5">{getPurposeBadge(selectedLog.purpose)}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Channel</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedLog.channel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dispatched Time</span>
                <span className="text-slate-800 dark:text-slate-200">{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Expires At</span>
                <span className="text-slate-800 dark:text-slate-200">{new Date(selectedLog.expiresAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cost Deducted</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{selectedLog.cost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Attempts Made</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedLog.attempts} of {selectedLog.maxAttempts}</span>
              </div>
            </div>

            {/* Verification History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Verification Attempt Trail ({selectedLog.attemptsHistory?.length || 0})
              </h4>
              {selectedLog.attemptsHistory && selectedLog.attemptsHistory.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedLog.attemptsHistory.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                        att.successful
                          ? "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                          : "bg-red-50 dark:bg-rose-950/25 border-red-200 dark:border-rose-500/30 text-red-800 dark:text-rose-300"
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
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg font-medium">
                {resendMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
              {selectedLog.status !== "verified" ? (
                <button
                  type="button"
                  disabled={resending}
                  onClick={() => handleResendOtp(selectedLog.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg cursor-pointer"
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
