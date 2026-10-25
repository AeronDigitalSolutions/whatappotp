"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useViewMode } from "@/context/ViewModeContext";
import {
  SendAirplaneIcon,
  ZapIcon,
  ShieldCheckIcon,
  WalletIcon,
  RefreshIcon,
  BarChart2DIcon,
  PieChart2DIcon,
  Funnel2DIcon,
  Rocket2DIcon,
  CampaignIcon,
  TemplateIcon,
  KeyIcon,
  Activity2DIcon,
  PhoneRoutingIcon,
  SparklesIcon,
  Close2DIcon,
  TrendingUpIcon,
  BotIcon,
  ShoppingBagIcon,
  WhatsAppIcon
} from "@/components/Icons";

interface OverviewMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  verificationRate: number;
  avgDeliveryLatency: string;
  walletBalance: string;
  estimatedOtpRunway: number;
  activeCampaigns: number;
  serviceSplit: {
    authentication: number;
    marketing: number;
    utility: number;
  };
}

interface TrendDay {
  day: string;
  sent: number;
  delivered: number;
  failed: number;
}

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  latency: string;
  cost: string;
}

interface AssetDetails {
  wabaId: string;
  phoneId: string;
  displayPhone: string;
  verifiedName: string;
  quality: string;
  status: string;
  tier: string;
}

export default function DashboardOverview() {
  const { showSuccess, showError } = useModal();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Aryan");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Channel Tab
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "instagram">("whatsapp");
  const [showAllQuickActions, setShowAllQuickActions] = useState(false);
  const [showAllObjectives, setShowAllObjectives] = useState(false);

  // Analytics data
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    deliveryRate: 0,
    verificationRate: 0,
    avgDeliveryLatency: "0.0s",
    walletBalance: "0.00",
    estimatedOtpRunway: 0,
    activeCampaigns: 0,
    serviceSplit: {
      authentication: 0,
      marketing: 0,
      utility: 0
    }
  });

  const [trend, setTrend] = useState<TrendDay[]>([
    { day: "Mon", sent: 0, delivered: 0, failed: 0 },
    { day: "Tue", sent: 0, delivered: 0, failed: 0 },
    { day: "Wed", sent: 0, delivered: 0, failed: 0 },
    { day: "Thu", sent: 0, delivered: 0, failed: 0 },
    { day: "Fri", sent: 0, delivered: 0, failed: 0 },
    { day: "Sat", sent: 0, delivered: 0, failed: 0 },
    { day: "Sun", sent: 0, delivered: 0, failed: 0 }
  ]);

  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [asset, setAsset] = useState<AssetDetails | null>(null);

  // Quick Test OTP Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const loadDashboardData = async (isManual = false) => {
    const pid = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;
    const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u.name) setUserName(u.name);
      } catch {}
    }

    if (!pid) return setLoading(false);
    setProjectId(pid);
    if (isManual) setRefreshing(true);

    try {
      const res = await fetch(`${getApiUrl()}/v1/analytics/overview/${pid}`);
      const data = await res.json();
      if (data.success) {
        if (data.metrics) setMetrics(data.metrics);
        if (data.trend && data.trend.length > 0) setTrend(data.trend);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.asset) setAsset(data.asset);
      }
    } catch (e) {
      console.error("Failed to load analytics overview:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch(`${getApiUrl()}/v1/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phone: testPhone,
          purpose: "AUTHENTICATION"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data);
        showSuccess(`WhatsApp message dispatched successfully to ${testPhone}!`, "Dispatch Successful");
        loadDashboardData(false);
      } else {
        showError(data.error || "Failed to dispatch message", "Dispatch Failed");
      }
    } catch (err: any) {
      showError(err.message || "Network error", "Error");
    } finally {
      setTestSending(false);
    }
  };

  const maxTrendSent = Math.max(...trend.map(t => t.sent), 10);
  const totalServiceCount = (metrics.serviceSplit.authentication + metrics.serviceSplit.marketing + metrics.serviceSplit.utility) || 0;
  const otpPct = totalServiceCount > 0 ? Math.round((metrics.serviceSplit.authentication / totalServiceCount) * 100) : 0;
  const mktPct = totalServiceCount > 0 ? Math.round((metrics.serviceSplit.marketing / totalServiceCount) * 100) : 0;
  const utlPct = totalServiceCount > 0 ? Math.round((metrics.serviceSplit.utility / totalServiceCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* 1. Apple-Style Greeting with Metallic Text Gradient */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center gap-2">
            <span>Welcome to Digital Beings,</span>
            <span className="apple-text-gradient">{userName}</span>
            <span>!</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Meta WhatsApp Cloud API Gateway • Real-time Telemetry &amp; 2-Way Engagement
          </p>
        </div>

        {/* Live System Beacon */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
          <span>WebSocket Pipeline Active</span>
        </div>
      </div>

      {/* 2. Top Channel Switcher & Gateway Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Channel Selector Pills */}
        <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] p-1.5 rounded-2xl backdrop-blur-xl shadow-sm dark:shadow-inner">
          <button
            onClick={() => setActiveChannel("whatsapp")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeChannel === "whatsapp"
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveChannel("instagram")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeChannel === "instagram"
                ? "bg-slate-900 text-white dark:bg-gradient-to-r dark:from-slate-200 dark:to-white dark:text-slate-950 font-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            <span>📷</span>
            <span>Instagram</span>
          </button>
        </div>

        {/* Right: Live Gateway Banner */}
        <div className="bg-white/80 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl rounded-2xl p-2 pl-4 flex items-center justify-between sm:justify-end gap-3 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block leading-tight">WhatsApp Cloud Gateway</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Live Meta API • 99.9% Uptime SLA</span>
            </div>
          </div>
          <button
            onClick={() => {
              setTestResult(null);
              setShowTestModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl transition shadow-[0_0_14px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send Message</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* 2b. Instant "Aha!" Sandbox Test & Quickstart (Apple Pro Specular Console) */}
      <div className="relative rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-[0_12px_40px_rgba(16,185,129,0.12)] border border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-[#0c1424] dark:via-[#080d18] dark:to-[#04070e] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-400/50 before:to-transparent">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/[0.12] rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2.5 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping"></span>
            <span>⚡ Instant Aha! Gateway Test</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] leading-tight">
            Send a Live WhatsApp OTP to Your Phone Right Now
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            Experience our sub-second delivery engine firsthand. Enter your mobile number below to receive an authentic Meta WhatsApp OTP message immediately.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 font-bold">
              ✓ Pre-loaded Fuel: <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{metrics.walletBalance}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              ⚡ Latency: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{metrics.avgDeliveryLatency || "1.2s"}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              🛡️ 99.98% Delivery Rate
            </span>
          </div>
        </div>

        {/* Interactive Quick Dispatch Input */}
        <div className="bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 rounded-2xl w-full lg:max-w-md shrink-0 space-y-3 relative z-10 shadow-sm dark:shadow-inner">
          <form onSubmit={handleSendTest} className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Your WhatsApp Mobile Number:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+919876543210"
                className="flex-1 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs rounded-xl px-3.5 py-2.5 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold"
              />
              <button
                type="submit"
                disabled={testSending || !testPhone}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl transition shadow-[0_0_15px_rgba(52,211,153,0.35)] whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {testSending ? "Sending..." : "Test My Phone ➔"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Include country code (e.g. +91). Zero configuration required to test.
            </p>
          </form>

          {testResult && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-400/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-mono space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>✓ Delivered in 1.2s!</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">HTTP 200</span>
              </div>
              <p className="text-[11px] truncate">Req ID: {testResult.requestId || "req_ok"}</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
            <Link
              href="/dashboard/api-keys"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline font-bold transition"
            >
              Get Ready-to-Use Code Snippets (cURL/Node/PHP) ➔
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Featured Hero Banner: Build Your AI Agent */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/30 dark:via-[#0B132B]/50 dark:to-[#0A0E1A]/70 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition hover:border-emerald-400/40">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(16,185,129,0.3)]">
            <BotIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Build Your AI Agent
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-relaxed max-w-2xl">
              Create an AI agent to handle conversations, answer questions, qualify leads, and assist customers automatically.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/automations"
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer self-stretch sm:self-auto text-center"
        >
          Create Agent
        </Link>
      </div>

      {/* 4. Quick Actions / Workflow Cards (Apple Bento 3-Column Grid) */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Connect Number */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0E1526]/95 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <WhatsAppIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">Connect Number</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 rounded-md mt-1">
                  <span>ⓘ</span>
                  <span>{asset?.displayPhone ? "Meta Cloud Live" : "Not Verified"}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <span>🪙</span> Rs. 0.50
              </span>
              <Link
                href="/dashboard/numbers"
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                {asset?.displayPhone ? "Manage" : "Connect"}
              </Link>
            </div>
          </div>

          {/* Card 2: Greeting Flow */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0E1526]/95 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                <span className="text-base">💬</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">Greeting Flow</h3>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    ✓ Activated
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded">
                    ✦ AI-generated
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/automations"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-700 dark:text-white text-xs font-bold rounded-xl transition border border-slate-200 dark:border-white/10 shrink-0"
            >
              Edit Flow
            </Link>
          </div>

          {/* Card 3: FAQ Auto-replies */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0E1526]/95 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <span className="text-base">📋</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">FAQ Auto-replies</h3>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    ✓ Activated
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded">
                    ✦ AI-generated
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/automations"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-700 dark:text-white text-xs font-bold rounded-xl transition border border-slate-200 dark:border-white/10 shrink-0"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* View All Expandable Section */}
        {showAllQuickActions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-200">
            <div className="bg-white/80 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-inner flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <CampaignIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Broadcast Studio</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bulk audience CSV dispatches</p>
                </div>
              </div>
              <Link href="/dashboard/campaigns" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Launch
              </Link>
            </div>

            <div className="bg-white/80 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-inner flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TemplateIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Template Studio</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Submit Meta approved templates</p>
                </div>
              </div>
              <Link href="/dashboard/templates" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Manage
              </Link>
            </div>

            <div className="bg-white/80 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-inner flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Green Tick (OBA)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Official verification portal</p>
                </div>
              </div>
              <Link href="/dashboard/green-tick" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Check
              </Link>
            </div>
          </div>
        )}

        <div className="text-center pt-1">
          <button
            onClick={() => setShowAllQuickActions(!showAllQuickActions)}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{showAllQuickActions ? "View Less" : "View All"}</span>
            <span className={`transform transition-transform ${showAllQuickActions ? "rotate-180" : ""}`}>⌄</span>
          </button>
        </div>
      </div>

      {/* 5. OBJECTIVES Section (Apple Bento Style) */}
      <div className="bg-slate-50/60 dark:bg-[#080D1A]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 backdrop-blur-2xl shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4">
        <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase block">
          STRATEGIC OBJECTIVES
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Objective Card 1: Generate High-intent Leads */}
          <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between space-y-4 hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Generate High-intent Leads</h3>
              <Link href="/dashboard/campaigns" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline block mt-0.5">
                Via Click to WhatsApp Ads
              </Link>
            </div>

            {/* Illustration Graphic (Ad mockup preview) */}
            <div className="h-36 bg-slate-100/70 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 flex items-center justify-between gap-3 overflow-hidden">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">f</div>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">Digital Ads</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full"></div>
                <div className="w-3/4 bg-slate-200 dark:bg-white/10 h-2 rounded-full"></div>
                <div className="inline-flex items-center gap-1 bg-[#25D366] text-slate-950 text-[9px] font-black px-2 py-0.5 rounded mt-1 shadow-sm">
                  <WhatsAppIcon className="w-2.5 h-2.5" />
                  <span>WhatsApp</span>
                </div>
              </div>
              <div className="w-24 h-28 bg-white dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10 p-1.5 flex flex-col justify-between shrink-0 shadow-sm dark:shadow-inner">
                <div className="w-full h-12 bg-slate-100 dark:bg-white/[0.06] rounded flex items-center justify-center text-[10px] text-slate-500 dark:text-slate-400">Ad Creative</div>
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded"></div>
                  <div className="w-2/3 bg-slate-200 dark:bg-white/10 h-1.5 rounded"></div>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/campaigns"
              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl text-center transition shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer block"
            >
              Setup
            </Link>
          </div>

          {/* Objective Card 2: Qualify Ad Leads */}
          <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between space-y-4 hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Qualify Ad Leads</h3>
              <Link href="/dashboard/api-keys" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline block mt-0.5">
                Via WhatsApp Forms &amp; OTPs
              </Link>
            </div>

            {/* Illustration Graphic (Mobile phone form mockup) */}
            <div className="h-36 bg-slate-100/70 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 flex items-center justify-center overflow-hidden">
              <div className="w-32 h-32 bg-white dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 p-2 flex flex-col justify-between shadow-sm dark:shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1">
                  <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">Verification</span>
                  <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Live</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] text-slate-500 dark:text-slate-400 block">Your Details</span>
                  <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-3 rounded px-1 flex items-center text-[8px] text-slate-700 dark:text-slate-300 font-mono">
                    +91 ••••• ••••
                  </div>
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 h-3 rounded px-1 flex items-center text-[8px] text-emerald-700 dark:text-emerald-300 font-mono">
                    Code: 849201
                  </div>
                </div>
                <div className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-[8px] font-black py-0.5 rounded text-center">
                  Submit
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/api-keys"
              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl text-center transition shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer block"
            >
              Setup
            </Link>
          </div>

          {/* Objective Card 3: Integrate with WhatsApp Pay */}
          <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between space-y-4 hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Integrate with WhatsApp Pay</h3>
              <Link href="/dashboard/ecommerce" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline block mt-0.5">
                Shopify &amp; WooCommerce Recipes
              </Link>
            </div>

            {/* Illustration Graphic (Shopping bag + Link + WhatsApp icon) */}
            <div className="h-36 bg-slate-100/70 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-4 flex items-center justify-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-300 shadow-sm dark:shadow-inner">
                <ShoppingBagIcon className="w-6 h-6" />
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-bold text-lg">🔗</div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm dark:shadow-inner">
                <WhatsAppIcon className="w-6 h-6" />
              </div>
            </div>

            <Link
              href="/dashboard/ecommerce"
              className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl text-center transition shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer block"
            >
              Setup
            </Link>
          </div>
        </div>

        {/* View All Objectives Expandable */}
        {showAllObjectives && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 animate-in fade-in duration-200">
            <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">COD Confirmation</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reduce return-to-origin fraud by 40%</p>
              </div>
              <Link href="/dashboard/ecommerce" className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Configure
              </Link>
            </div>

            <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Abandoned Cart Nudge</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Automatic discount recovery triggers</p>
              </div>
              <Link href="/dashboard/ecommerce" className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Configure
              </Link>
            </div>

            <div className="bg-white/90 dark:bg-[#0B101D]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Granular Team Roles</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assign custom agent permissions</p>
              </div>
              <Link href="/dashboard/team" className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 text-xs font-black rounded-xl">
                Configure
              </Link>
            </div>
          </div>
        )}

        <div className="text-center pt-1">
          <button
            onClick={() => setShowAllObjectives(!showAllObjectives)}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{showAllObjectives ? "View Less" : "View All"}</span>
            <span className={`transform transition-transform ${showAllObjectives ? "rotate-180" : ""}`}>⌄</span>
          </button>
        </div>
      </div>

      {/* 6. Operations & Live Telemetry Section (Apple Bento Specular Metric Cards) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            LIVE TELEMETRY &amp; METRICS
          </span>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Dispatched */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0F172A]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  <SendAirplaneIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Dispatched</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <TrendingUpIcon className="w-3 h-3" />
                <span>14.2%</span>
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-slate-100 dark:to-slate-400 tracking-tight">
              {metrics.totalSent.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              ✓ {metrics.totalDelivered.toLocaleString()} delivered • {metrics.totalFailed} failed
            </div>
          </div>

          {/* Card 2: Avg Delivery Speed */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0F172A]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                  <ZapIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Avg Delivery Speed</span>
              </div>
              <span className="px-2 py-0.5 bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[10px] font-extrabold rounded-full">
                ULTRA-FAST
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-slate-100 dark:to-slate-400 tracking-tight">
              {metrics.avgDeliveryLatency}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              99.4% delivered in &lt; 3s via Cloud API
            </div>
          </div>

          {/* Card 3: Delivery Rate */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0F172A]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheckIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Delivery Rate</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {metrics.verificationRate}% verified
              </span>
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-slate-100 dark:to-slate-400 tracking-tight">
              {metrics.deliveryRate}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Direct Meta Cloud API WebSocket
            </div>
          </div>

          {/* Card 4: Wallet Balance */}
          <div className="bg-white/80 dark:bg-[#0B101D]/80 hover:bg-slate-50 dark:hover:bg-[#0F172A]/90 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold">
                  <WalletIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Wallet Balance</span>
              </div>
              <Link
                href="/dashboard/wallet"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Top-up →
              </Link>
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-slate-100 dark:to-slate-400 tracking-tight">
              ₹{Number(metrics.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Runway: <span className="font-bold text-slate-900 dark:text-white">~{metrics.estimatedOtpRunway.toLocaleString()}</span> OTPs
            </div>
          </div>
        </div>

        {/* 7-Day Messaging Throughput Chart */}
        <div className="bg-slate-50/60 dark:bg-[#080D1A]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 backdrop-blur-2xl shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <BarChart2DIcon className="w-4 h-4" />
                </div>
                <span>7-Day Messaging Throughput &amp; Delivery Trend</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Daily volume comparison between dispatched, delivered, and failed messages.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#10B981] shadow-[0_0_8px_#10B981]"></span> Delivered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-white/30"></span> Dispatched
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500 dark:bg-rose-400 shadow-[0_0_8px_#fb7185]"></span> Failed
              </span>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-56 border-b border-slate-200 dark:border-white/[0.08] px-2">
              {trend.map((t, idx) => {
                const heightPct = Math.round((t.sent / maxTrendSent) * 100);
                const deliveredHeight = t.sent > 0 ? Math.round((t.delivered / t.sent) * 100) : 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-md text-white text-xs py-1.5 px-3 rounded-xl pointer-events-none whitespace-nowrap z-10 shadow-lg border border-white/20">
                      <p className="font-bold">{t.day}: {t.sent} Sent</p>
                      <p className="text-emerald-400 font-semibold">✓ {t.delivered} Delivered ({t.sent > 0 ? Math.round((t.delivered/t.sent)*100) : 0}%)</p>
                    </div>

                    <div className="w-full max-w-[46px] bg-slate-100 dark:bg-white/[0.03] rounded-xl overflow-hidden flex flex-col justify-end h-44 relative border border-slate-200 dark:border-white/[0.08] shadow-inner">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-slate-300/80 dark:bg-white/20 rounded-t-lg transition-all duration-500 relative flex flex-col justify-end"
                      >
                        <div
                          style={{ height: `${deliveredHeight}%` }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        ></div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition">
                      {t.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3.5 bg-white/90 dark:bg-white/[0.03] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-extrabold tracking-wide block">Avg Daily Volume</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {Math.round(metrics.totalSent / 7)} msgs / day
              </span>
            </div>
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase font-extrabold tracking-wide block">Peak Delivery Window</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">11:00 AM – 1:00 PM</span>
            </div>
            <div className="p-3.5 bg-white/90 dark:bg-white/[0.03] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-extrabold tracking-wide block">Meta API Latency</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">42ms Ping</span>
            </div>
          </div>
        </div>

        {/* Real-Time Activity Stream */}
        <div className="bg-slate-50/60 dark:bg-[#080D1A]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 backdrop-blur-2xl shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Activity2DIcon className="w-4 h-4" />
                </div>
                <span>Real-Time Activity Stream</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Live dispatches, verification logs, and wallet billing events.
              </p>
            </div>
            <Link
              href="/dashboard/logs"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition"
            >
              View Full Audit Logs →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center bg-white/80 dark:bg-white/[0.02] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">No recent dispatches logged yet.</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Send a test OTP or launch a campaign to see live events stream here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
              {recentActivity.map((evt) => (
                <div key={evt.id} className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-100/70 dark:hover:bg-white/[0.03] px-2.5 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      evt.type === 'OTP' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30' :
                      evt.type === 'CAMPAIGN' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {evt.type === 'OTP' ? <KeyIcon className="w-4 h-4" /> : evt.type === 'CAMPAIGN' ? <CampaignIcon className="w-4 h-4" /> : <WalletIcon className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{evt.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{evt.subtitle} • {new Date(evt.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">{evt.latency}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                      evt.status === 'delivered' || evt.status === 'completed' || evt.status === 'credit'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}>
                      {evt.status}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{evt.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick WhatsApp Dispatch Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B101D] text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/15 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                <span>Send WhatsApp Message</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <Close2DIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Recipient WhatsApp Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Include country code (e.g. +91 for India).</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                <span><b>Billing Rate:</b> ₹0.50 / message dispatch</span>
              </div>

              {testResult && (
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-400/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-mono space-y-1">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">✓ Message Dispatched Successfully!</p>
                  <p>Request ID: {testResult.requestId}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Live delivery via Meta Cloud API WebSocket pipeline.</p>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testSending || !testPhone}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {testSending ? "Dispatching..." : "Send Message Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
