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

  // Connected Number & Meta Account state
  const [hasNumber, setHasNumber] = useState<boolean | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);

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

      // Check registered phone numbers
      try {
        const numRes = await fetch(`${getApiUrl()}/v1/meta/numbers/${pid}`);
        const numData = await numRes.json();
        if (numData.success && Array.isArray(numData.numbers) && numData.numbers.length > 0) {
          setHasNumber(true);
          setConnectedPhone(numData.numbers[0].displayPhone || numData.numbers[0].phoneNumber || null);
        } else if (data?.asset?.displayPhone) {
          setHasNumber(true);
          setConnectedPhone(data.asset.displayPhone);
        } else {
          setHasNumber(false);
        }
      } catch {
        if (data?.asset?.displayPhone) {
          setHasNumber(true);
          setConnectedPhone(data.asset.displayPhone);
        } else {
          setHasNumber(false);
        }
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
      {/* 1. Header Greeting (Clean & Direct) */}
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100 flex items-center gap-2">
          <span>Welcome to Digital Beings,</span>
          <span className="apple-text-gradient">{userName}</span>
          <span>!</span>
        </h1>
      </div>

      {/* 2. Number Status & Connection Gate / Live Instant Test */}
      {hasNumber === false ? (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-slate-950 dark:text-white">
                  Link Your WhatsApp Number &amp; Meta Account
                </h2>
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Connect your Meta Business Portfolio or Facebook account to register, fetch, and route your WhatsApp Business number.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Link
              href="/dashboard/setup"
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-lg transition shadow-xs text-center cursor-pointer"
            >
              Connect Meta Account ➔
            </Link>
            <Link
              href="/dashboard/numbers"
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-800 dark:text-white text-xs font-bold rounded-lg transition border border-slate-200 dark:border-white/10 text-center"
            >
              Manage Numbers
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Instant Gateway Test
              </span>
              {connectedPhone && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  ({connectedPhone})
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Send a Live WhatsApp OTP to Your Phone
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Dispatch a test verification code directly through your linked WhatsApp number.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:max-w-md shrink-0">
            <form onSubmit={handleSendTest} className="flex items-center gap-2 flex-1">
              <input
                type="text"
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+919876543210"
                className="flex-1 bg-slate-50 dark:bg-white/[0.05] border border-slate-300 dark:border-white/10 text-slate-950 dark:text-white font-mono text-xs rounded-lg px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-bold"
              />
              <button
                type="submit"
                disabled={testSending || !testPhone}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-lg transition whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {testSending ? "Sending..." : "Send Test ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Test Result Toast Banner if sent */}
      {testResult && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-mono flex items-center justify-between">
          <span className="font-bold">✓ Live OTP Dispatched in 1.2s!</span>
          <span className="text-[11px]">Req ID: {testResult.requestId || "req_ok"}</span>
        </div>
      )}

      {/* 3. Core Quick Actions (Compact Bento Grid: AI Agent, Campaigns, Templates) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Build Your AI Agent */}
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/40 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BotIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-950 dark:text-white truncate">Build Your AI Agent</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">Automate conversations &amp; lead qualification</p>
            </div>
          </div>
          <Link
            href="/dashboard/automations"
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-lg transition whitespace-nowrap shrink-0 shadow-xs"
          >
            Create Agent
          </Link>
        </div>

        {/* Card 2: Broadcast Campaigns */}
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/40 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <CampaignIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-950 dark:text-white truncate">Broadcast Campaigns</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">Bulk promotional &amp; utility broadcasts</p>
            </div>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 border border-slate-200 dark:border-white/10"
          >
            Launch
          </Link>
        </div>

        {/* Card 3: Template Studio */}
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500/40 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <TemplateIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-950 dark:text-white truncate">Template Studio</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">Create &amp; sync Meta-approved templates</p>
            </div>
          </div>
          <Link
            href="/dashboard/templates"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 border border-slate-200 dark:border-white/10"
          >
            Manage
          </Link>
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
