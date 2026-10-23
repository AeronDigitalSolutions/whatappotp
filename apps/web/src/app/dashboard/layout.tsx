"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PermissionProvider, usePermissions } from "@/context/PermissionContext";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { getApiUrl } from "@/lib/api";
import ActivationPaywallModal from "@/components/ActivationPaywallModal";

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
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);

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
                setSubscriptionData(data.subscription);
                if (!data.subscription.isActivated) {
                  if (typeof window !== "undefined") {
                    const params = new URLSearchParams(window.location.search);
                    if (params.get("activate") === "true" || localStorage.getItem("pendingPlan")) {
                      setShowActivateModal(true);
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
      return "flex items-center justify-between px-3.5 py-2.5 bg-[#f0fdf4] text-[#154336] font-bold border border-[#bbf7d0] rounded-xl text-[13.5px] shadow-2xs border-l-4 border-l-[#154336] transition-all duration-150";
    }
    return "flex items-center justify-between px-3.5 py-2.5 text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 rounded-xl text-[13.5px] font-semibold transition-all duration-150 group";
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
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar with Interakt-Grade Navigation */}
      <aside className="w-[272px] bg-white border-r border-slate-200/90 hidden md:flex flex-col shrink-0 h-screen sticky top-0 shadow-2xs z-20">
        <div className="h-16 flex items-center px-5 border-b border-slate-200/90 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-8 h-8 rounded-xl object-contain shadow-2xs shrink-0 group-hover:scale-105 transition"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base tracking-tight text-slate-900 leading-tight">
                Digital<span className="text-[#154336]">Beings</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Secure • Connect • Grow
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto">

          {/* Section 1: Core Messaging */}
          {showConversationsSection && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider pb-1">
                Conversations &amp; Engagement
              </p>
              <Link href="/dashboard" className={navLinkClass("/dashboard")}>
                <div className="flex items-center gap-3 min-w-0">
                  <DashboardIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                  <span className="truncate">Overview</span>
                </div>
              </Link>
              {hasAccess("inbox") && (
                <Link href="/dashboard/inbox" className={navLinkClass("/dashboard/inbox")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <InboxIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/inbox" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Live Chat Inbox</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold">2-Way</span>
                </Link>
              )}
              {hasAccess("automations") && (
                <Link href="/dashboard/automations" className={navLinkClass("/dashboard/automations")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <BotIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/automations" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Chatbot Automations</span>
                  </div>
                  <span className="text-[10px] bg-[#7c3aed] text-white px-2 py-0.5 rounded-full font-extrabold shadow-2xs">New</span>
                </Link>
              )}
              {hasAccess("ecommerce") && (
                <Link href="/dashboard/ecommerce" className={navLinkClass("/dashboard/ecommerce")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <ShoppingBagIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/ecommerce" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">E-Commerce Recipes</span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold">Shopify</span>
                </Link>
              )}
              {hasAccess("campaigns") && (
                <Link href="/dashboard/campaigns" className={navLinkClass("/dashboard/campaigns")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CampaignIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/campaigns" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Broadcast Campaigns</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Bulk</span>
                </Link>
              )}
              {hasAccess("templates") && (
                <Link href="/dashboard/templates" className={navLinkClass("/dashboard/templates")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TemplateIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/templates" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Template Studio</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 2: Numbers & Compliance */}
          {showVerificationSection && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider pb-1">
                WhatsApp &amp; Verification
              </p>
              {hasAccess("numbers") && (
                <Link href="/dashboard/numbers" className={navLinkClass("/dashboard/numbers")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <PhoneRoutingIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/numbers" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Numbers &amp; Routing</span>
                  </div>
                </Link>
              )}
              {hasAccess("green-tick") && (
                <Link href="/dashboard/green-tick" className={navLinkClass("/dashboard/green-tick")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheckIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/green-tick" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">WhatsApp Verification</span>
                  </div>
                </Link>
              )}
              {hasAccess("logs") && (
                <Link href="/dashboard/logs" className={navLinkClass("/dashboard/logs")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <AuditLogsIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/logs" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Logs &amp; Audits</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 3: Wallet & Billing */}
          {showBillingSection && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider pb-1">
                Wallet &amp; Developers
              </p>
              {hasAccess("wallet") && (
                <Link href="/dashboard/wallet" className={navLinkClass("/dashboard/wallet")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <WalletIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/wallet" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Wallet &amp; Billing</span>
                  </div>
                </Link>
              )}
              {hasAccess("pricing_admin") && (
                <Link href="/dashboard/pricing-admin" className={navLinkClass("/dashboard/pricing-admin")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <PricingAdminIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/pricing-admin" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Pricing &amp; Safety Admin</span>
                  </div>
                </Link>
              )}
              {hasAccess("api_keys") && (
                <Link href="/dashboard/api-keys" className={navLinkClass("/dashboard/api-keys")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <KeyIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/api-keys" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">API Keys</span>
                  </div>
                </Link>
              )}
              {hasAccess("settings") && (
                <Link href="/dashboard/settings" className={navLinkClass("/dashboard/settings")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <SettingsIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/settings" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Settings</span>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Section 4: Administration & Team Roles */}
          {showAdminSection && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-wider pb-1">
                Team &amp; Governance
              </p>
              {hasAccess("team") && (
                <Link href="/dashboard/team" className={navLinkClass("/dashboard/team")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/team" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Team &amp; Custom Roles</span>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200/80 px-2 py-0.5 rounded-full font-bold">RBAC</span>
                </Link>
              )}
              {hasAccess("super_admin") && (
                <Link href="/dashboard/super-admin" className={navLinkClass("/dashboard/super-admin")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <SuperAdminIcon className={`w-4 h-4 shrink-0 ${pathname === "/dashboard/super-admin" ? "text-[#154336]" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <span className="truncate">Platform Super Admin</span>
                  </div>
                  <span className="text-[10px] bg-[#154336] text-white px-2 py-0.5 rounded-full font-bold">Master</span>
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Current Active Role Footer Tag */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
              <ShieldCheckIcon className="w-4 h-4 text-[#154336]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Active Workspace Role</span>
              <span className="text-xs font-bold text-slate-900 truncate">{activeRoleDef.badge}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f4f6f8]">
        {/* Interakt-Inspired Header */}
        <header className="bg-white border-b border-slate-200/90 flex items-center px-4 sm:px-8 py-3.5 justify-between shrink-0 shadow-2xs z-30 min-h-[4.5rem]">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {currentModuleTitle}
            </h1>
            {currentModuleSubtitle && (
              <p className="text-[12.5px] text-slate-500 font-medium mt-0.5 hidden sm:block">
                {currentModuleSubtitle}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Interakt-Style Plan / Wallet Status Pill */}
            <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/80 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold text-emerald-950 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-extrabold text-slate-900">₹{walletBalance}</span>
                <span className="text-slate-500 hidden md:inline">Prepaid Balance</span>
              </span>
              <Link
                href="/dashboard/wallet"
                className="px-3 py-1 bg-[#154336] hover:bg-[#0e3026] text-white text-[11px] font-bold rounded-full transition shadow-xs cursor-pointer"
              >
                Top-up
              </Link>
            </div>

            {/* Notification Bell */}
            <Link
              href="/dashboard/logs"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer relative"
              title="Audit Logs & Activity"
            >
              <BellIcon className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
            </Link>

            {/* Settings Icon */}
            <Link
              href="/dashboard/settings"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              title="Workspace Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </Link>

            {/* Interakt-Style User Avatar Circle */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
              <div
                className="w-9 h-9 rounded-full bg-[#154336] text-white font-black text-xs flex items-center justify-center shadow-xs select-none"
                title={userName}
              >
                {userName.slice(0, 2).toUpperCase() || "WP"}
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-600 text-xs font-bold transition hidden sm:inline cursor-pointer"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Persistent Demo Mode Banner */}
        {subscriptionData && !subscriptionData.isActivated && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <div>
                <span className="font-extrabold text-amber-900 mr-1.5">🔒 Demo Preview Mode:</span>
                <span className="text-amber-800">
                  You are exploring the dashboard in demo mode. Activate the 30-Day Starter Trial (₹500) or Basic Plan (₹1,000) to enable live WhatsApp messaging and APIs.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowActivateModal(true)}
              className="px-3.5 py-1.5 bg-[#154336] hover:bg-[#0f3127] text-white font-extrabold rounded-lg text-xs shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Activate Workspace (From ₹500) ➔</span>
            </button>
          </div>
        )}

        {/* Dynamic Route Protection Gate */}
        <main className="flex-1 p-4 sm:p-8 overflow-auto">
          {!isCurrentPathAllowed ? (
            <div className="max-w-xl mx-auto mt-12 bg-white rounded-3xl border border-rose-200 p-8 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto border border-rose-100">
                🛡️
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Access Restricted by Role Policy
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Your assigned role (<strong>{activeRoleDef.badge}</strong>) does not have permission to view or manage this module. Please contact your workspace administrator to request access.
              </p>

              <div className="pt-2 flex items-center justify-center">
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 bg-[#154336] hover:bg-[#0e3026] text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Return to Overview
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>

        {/* Activation Paywall Modal for Demo Mode */}
        <ActivationPaywallModal
          isOpen={showActivateModal}
          onClose={() => setShowActivateModal(false)}
          organizationId={orgId}
          userName={userName}
          userEmail={userEmail}
          onActivationSuccess={() => {
            setShowActivateModal(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem("pendingPlan");
            }
            window.location.reload();
          }}
        />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewModeProvider>
      <PermissionProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </PermissionProvider>
    </ViewModeProvider>
  );
}
