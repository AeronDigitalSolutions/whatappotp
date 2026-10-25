"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PermissionProvider, usePermissions } from "@/context/PermissionContext";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { SubscriptionProvider, useSubscription } from "@/context/SubscriptionContext";
import { getApiUrl } from "@/lib/api";

import {
  DashboardIcon,
  InboxIcon,
  BotIcon,
  ShoppingBagIcon,
  CampaignIcon,
  TemplateIcon,
  PhoneRoutingIcon,
  ShieldCheckIcon,
  AuditLogsIcon,
  WalletIcon,
  PricingAdminIcon,
  KeyIcon,
  SettingsIcon,
  TeamIcon,
  SuperAdminIcon,
  BellIcon
} from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";

const MODULE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/setup": "Setup Guide",
  "/dashboard/inbox": "Live Chat Inbox",
  "/dashboard/automations": "Chatbot Automations",
  "/dashboard/ecommerce": "E-Commerce Recipes",
  "/dashboard/campaigns": "Broadcast Campaigns",
  "/dashboard/templates": "Template Studio",
  "/dashboard/numbers": "Numbers & Routing",
  "/dashboard/green-tick": "WhatsApp Verification",
  "/dashboard/wallet": "Wallet & Billing",
  "/dashboard/pricing-admin": "Pricing & Safety Admin",
  "/dashboard/logs": "Logs & Audits",
  "/dashboard/api-keys": "API Keys",
  "/dashboard/settings": "Settings",
  "/dashboard/team": "Team & Custom Roles",
  "/dashboard/super-admin": "Platform Super Admin",
};

const MODULE_SUBTITLES: Record<string, string> = {
  "/dashboard/templates": "Create, manage and send WhatsApp message templates for your business.",
  "/dashboard": "Real-time metrics, live delivery rates and engagement tracking.",
  "/dashboard/campaigns": "Create, schedule, and analyze bulk WhatsApp broadcast marketing campaigns.",
  "/dashboard/inbox": "Unified omnichannel 2-way live chat with customers across registered numbers.",
  "/dashboard/automations": "Intelligent automated workflows and keyword response rules.",
  "/dashboard/ecommerce": "Shopify and WooCommerce automated order and abandoned cart triggers.",
  "/dashboard/numbers": "Manage Meta WhatsApp Business Accounts, phone numbers, and webhooks.",
  "/dashboard/green-tick": "Official Meta green tick verification application and compliance.",
  "/dashboard/wallet": "Prepaid credits, usage analytics, auto-recharge and invoices.",
  "/dashboard/pricing-admin": "Meta conversation rates, platform margins, and safety controls.",
  "/dashboard/logs": "Detailed audit trails and message delivery logs.",
  "/dashboard/api-keys": "API credentials, webhook secrets, and developer keys.",
  "/dashboard/settings": "Workspace configuration, profile, and team settings.",
  "/dashboard/team": "Granular Role-Based Access Control and team permissions.",
  "/dashboard/super-admin": "Platform governance and cross-workspace administration.",
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentModuleTitle = MODULE_TITLES[pathname] || "Dashboard";
  const currentModuleSubtitle = MODULE_SUBTITLES[pathname] || "";
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState("Aryan");
  const [userEmail, setUserEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.00");
  const { isActivated, isDemo, triggerPaywall, subscription: contextSub } = useSubscription();

  const { activeRole, activeRoleDef, hasAccess, canAccessPath, setActiveRole } = usePermissions();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/dashboard": "Mission Control Overview | Digital Beings",
      "/dashboard/setup": "Setup Guide | Digital Beings",
      "/dashboard/inbox": "Live Chat Shared Inbox | Digital Beings",
      "/dashboard/automations": "Chatbot & Conversational Automations | Digital Beings",
      "/dashboard/ecommerce": "E-Commerce WhatsApp Triggers | Digital Beings",
      "/dashboard/campaigns": "Broadcast Campaigns | Digital Beings",
      "/dashboard/templates": "Template Studio | Digital Beings",
      "/dashboard/numbers": "Numbers & Routing | Digital Beings",
      "/dashboard/green-tick": "WhatsApp Business Verification | Digital Beings",
      "/dashboard/wallet": "Wallet & Billing | Digital Beings",
      "/dashboard/pricing-admin": "Pricing & Safety Admin | Digital Beings",
      "/dashboard/logs": "OTP Logs & Audits | Digital Beings",
      "/dashboard/api-keys": "API Keys | Digital Beings",
      "/dashboard/settings": "Settings | Digital Beings",
      "/dashboard/team": "Team & Role Manager | Digital Beings",
      "/dashboard/super-admin": "Super Admin Platform Console | Digital Beings",
    };
    document.title = titles[pathname] || "Digital Beings - WhatsApp Cloud Platform";

    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
    } else {
      try {
        const user = JSON.parse(userJson);
        setUserName(user.name || "Aryan");
        setUserEmail(user.email || "");
        const currentOrgId = localStorage.getItem("organizationId") || user.organizationId;
        setOrgId(currentOrgId || "");
        if (currentOrgId) {
          fetch(`${getApiUrl()}/v1/wallet/${currentOrgId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.wallet) {
                setWalletBalance(Number(data.wallet.availableBalance || data.wallet.balance || 0).toFixed(2));
              }
              if (data.success && data.subscription) {
                if (!data.subscription.isActivated) {
                  if (typeof window !== "undefined") {
                    const params = new URLSearchParams(window.location.search);
                    if (params.get("activate") === "true" || localStorage.getItem("pendingPlan")) {
                      triggerPaywall();
                    }
                  }
                }
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        setUserName("Aryan");
      }
      setAuthChecked(true);
    }
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#154336] border-t-transparent rounded-full animate-spin"></div>
          Authenticating workspace...
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const navLinkClass = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "relative flex items-center justify-between px-3.5 py-2.5 bg-emerald-500/15 dark:bg-gradient-to-r dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent text-emerald-900 dark:text-slate-100 font-bold border border-emerald-500/30 rounded-xl text-[13.5px] shadow-[0_0_20px_rgba(16,185,129,0.14)] ring-1 ring-emerald-500/20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]";
    }
    return "relative flex items-center justify-between px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] hover:border-slate-200/80 dark:hover:border-white/[0.08] border border-transparent rounded-xl text-[13.5px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group";
  };

  const isCurrentPathAllowed = canAccessPath(pathname);

  // Group visibility checks
  const showConversationsSection =
    hasAccess("inbox") ||
    hasAccess("automations") ||
    hasAccess("ecommerce") ||
    hasAccess("campaigns") ||
    hasAccess("templates");

  const showVerificationSection =
    hasAccess("numbers") ||
    hasAccess("green-tick") ||
    hasAccess("logs");

  const showBillingSection =
    hasAccess("wallet") ||
    hasAccess("pricing_admin") ||
    hasAccess("api_keys") ||
    hasAccess("settings");

  const showAdminSection =
    hasAccess("team") ||
    hasAccess("super_admin");

  return (
    <div className="min-h-screen bg-[#fbfbfd] dark:bg-[#04060c] flex text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar with Apple VisionOS/macOS-Grade Frosted Glass Navigation */}
      <aside className="w-[276px] bg-white/90 dark:bg-[#070b14]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/[0.08] hidden md:flex flex-col shrink-0 h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.6)] z-20 text-slate-700 dark:text-slate-200 transition-colors duration-300">
        <div className="h-16 flex items-center px-5 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/icon.png"
                alt="Digital Beings"
                className="w-8 h-8 rounded-xl object-contain shadow-md shrink-0 group-hover:scale-105 transition duration-300"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#070b14] shadow-[0_0_8px_#10b981]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                Digital<span className="apple-emerald-gradient">Beings</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                Secure • Connect • Grow
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto">

          {/* Section 1: Core Messaging */}
          {showConversationsSection && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-1 flex items-center gap-2">
                <span>Conversations &amp; Engagement</span>
              </p>
              <Link href="/dashboard" className={navLinkClass("/dashboard")}>
                <div className="flex items-center gap-3 min-w-0">
                  <DashboardIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                  <span className="truncate">Overview</span>
                </div>
                {pathname === "/dashboard" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                )}
              </Link>
              {hasAccess("inbox") && (
                <Link href="/dashboard/inbox" className={navLinkClass("/dashboard/inbox")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <InboxIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/inbox" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Live Chat Inbox</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">2-Way</span>
                </Link>
              )}
              {hasAccess("automations") && (
                <Link href="/dashboard/automations" className={navLinkClass("/dashboard/automations")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <BotIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/automations" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Chatbot Automations</span>
                  </div>
                  <span className="text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-0.5 rounded-full font-extrabold shadow-[0_0_10px_rgba(168,85,247,0.4)]">New</span>
                </Link>
              )}
              {hasAccess("ecommerce") && (
                <Link href="/dashboard/ecommerce" className={navLinkClass("/dashboard/ecommerce")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <ShoppingBagIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/ecommerce" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">E-Commerce Recipes</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]">Shopify</span>
                </Link>
              )}
              {hasAccess("campaigns") && (
                <Link href="/dashboard/campaigns" className={navLinkClass("/dashboard/campaigns")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CampaignIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/campaigns" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Broadcast Campaigns</span>
                  </div>
                  <span className="text-[10px] bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-bold">Bulk</span>
                </Link>
              )}
              {hasAccess("templates") && (
                <Link href="/dashboard/templates" className={navLinkClass("/dashboard/templates")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TemplateIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/templates" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Template Studio</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 2: Numbers & Compliance */}
          {showVerificationSection && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 flex items-center gap-2">
                <span>WhatsApp &amp; Verification</span>
              </p>
              {hasAccess("numbers") && (
                <Link href="/dashboard/numbers" className={navLinkClass("/dashboard/numbers")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <PhoneRoutingIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/numbers" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Numbers &amp; Routing</span>
                  </div>
                </Link>
              )}
              {hasAccess("green-tick") && (
                <Link href="/dashboard/green-tick" className={navLinkClass("/dashboard/green-tick")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheckIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/green-tick" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">WhatsApp Verification</span>
                  </div>
                </Link>
              )}
              {hasAccess("logs") && (
                <Link href="/dashboard/logs" className={navLinkClass("/dashboard/logs")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <AuditLogsIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/logs" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Logs &amp; Audits</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 3: Wallet & Billing */}
          {showBillingSection && (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 flex items-center gap-2">
                <span>Wallet &amp; Developers</span>
              </p>
              {hasAccess("wallet") && (
                <Link href="/dashboard/wallet" className={navLinkClass("/dashboard/wallet")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <WalletIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/wallet" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Wallet &amp; Billing</span>
                  </div>
                </Link>
              )}
              {hasAccess("pricing_admin") && (
                <Link href="/dashboard/pricing-admin" className={navLinkClass("/dashboard/pricing-admin")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <PricingAdminIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/pricing-admin" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Pricing &amp; Safety Admin</span>
                  </div>
                </Link>
              )}
              {hasAccess("api_keys") && (
                <Link href="/dashboard/api-keys" className={navLinkClass("/dashboard/api-keys")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <KeyIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/api-keys" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">API Keys</span>
                  </div>
                </Link>
              )}
              {hasAccess("settings") && (
                <Link href="/dashboard/settings" className={navLinkClass("/dashboard/settings")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <SettingsIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/settings" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Settings</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 4: Administration & Team Roles */}
          {showAdminSection && (
            <div className="space-y-1 pt-2 border-t border-white/[0.08]">
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 flex items-center gap-2">
                <span>Team &amp; Governance</span>
              </p>
              {hasAccess("team") && (
                <Link href="/dashboard/team" className={navLinkClass("/dashboard/team")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/team" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Team &amp; Custom Roles</span>
                  </div>
                  <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">RBAC</span>
                </Link>
              )}
              {hasAccess("super_admin") && (
                <Link href="/dashboard/super-admin" className={navLinkClass("/dashboard/super-admin")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <SuperAdminIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/super-admin" ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                    <span className="truncate">Platform Super Admin</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(52,211,153,0.3)]">Master</span>
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Current Active Role Footer Tag */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">Active Workspace Role</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeRoleDef.badge}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#fbfbfd] dark:bg-[#04060c] text-slate-900 dark:text-slate-100 relative transition-colors duration-300">
        {/* Ambient Spotlights */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-emerald-500/[0.05] dark:bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none -z-0" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[300px] bg-blue-500/[0.04] dark:bg-blue-500/[0.03] rounded-full blur-[140px] pointer-events-none -z-0" />

        {/* Apple Frosted Glass Header */}
        <header className="bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.08] flex items-center px-4 sm:px-8 py-3.5 justify-between shrink-0 shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] z-30 min-h-[4.5rem] transition-colors duration-300">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center gap-2 transition-colors">
              <span>{currentModuleTitle}</span>
            </h1>
            {currentModuleSubtitle && (
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400/90 font-medium mt-0.5 hidden sm:block">
                {currentModuleSubtitle}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Meta Live Status Capsule */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
              <span>Meta Cloud API Live • 99.99%</span>
            </div>

            {/* Apple-Style Theme Toggle */}
            <ThemeToggle />

            {/* Apple-Style Prepaid Balance Pill */}
            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.1] hover:border-emerald-500/40 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs dark:shadow-inner backdrop-blur-md transition-all">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-extrabold text-slate-900 dark:text-white">₹{walletBalance}</span>
                <span className="text-slate-500 dark:text-slate-400 hidden md:inline">Balance</span>
              </span>
              <Link
                href="/dashboard/wallet"
                className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-[11px] font-black rounded-full transition shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                Top-up
              </Link>
            </div>

            {/* Notification Bell */}
            <Link
              href="/dashboard/logs"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/[0.2] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-xs dark:shadow-inner cursor-pointer relative"
              title="Audit Logs & Activity"
            >
              <BellIcon className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
            </Link>

            {/* Settings Icon */}
            <Link
              href="/dashboard/settings"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/[0.2] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-xs dark:shadow-inner cursor-pointer"
              title="Workspace Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </Link>

            {/* User Avatar Circle */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/[0.1]">
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.3)] select-none border border-white/20"
                title={userName}
              >
                {userName.slice(0, 2).toUpperCase() || "WP"}
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-bold transition hidden sm:inline cursor-pointer"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Apple-grade Frosted Demo Mode Banner */}
        {isDemo && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-transparent border-b border-amber-500/30 backdrop-blur-xl px-5 py-2.5 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(245,158,11,0.1)] shrink-0 z-20">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse shrink-0" />
              <div>
                <span className="font-extrabold text-amber-300 mr-1.5">🔒 Demo Preview Mode:</span>
                <span className="text-amber-100/90">
                  You are exploring the dashboard in demo mode. Activate the 30-Day Starter Trial (₹500 + GST) or Basic Plan (₹1,000 + GST) to enable live WhatsApp messaging and APIs.
                </span>
              </div>
            </div>
            <button
              onClick={() => triggerPaywall()}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs shadow-[0_0_14px_rgba(245,158,11,0.3)] transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Activate Workspace (From ₹500 + GST) ➔</span>
            </button>
          </div>
        )}

        {/* Dynamic Route Protection Gate */}
        <main className="flex-1 p-4 sm:p-8 overflow-auto relative z-10">
          {!isCurrentPathAllowed ? (
            <div className="max-w-xl mx-auto mt-12 bg-[#0a0f1d]/90 backdrop-blur-xl rounded-3xl border border-rose-500/30 p-8 shadow-[0_8px_32px_rgba(244,63,94,0.15)] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/20">
                🛡️
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Access Restricted by Role Policy
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Your assigned role (<strong>{activeRoleDef.badge}</strong>) does not have permission to view or manage this module. Please contact your workspace administrator to request access.
              </p>

              <div className="pt-2 flex items-center justify-center">
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  Return to Overview
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewModeProvider>
      <PermissionProvider>
        <SubscriptionProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SubscriptionProvider>
      </PermissionProvider>
    </ViewModeProvider>
  );
}
