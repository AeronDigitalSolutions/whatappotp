"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

interface OfficeUser {
  id: string;
  email: string;
  name?: string;
  isEmployee?: boolean;
  role?: string;
}

export default function OfficeDashboardPage() {
  const [user, setUser] = useState<OfficeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "IN_PROGRESS" | "META_PENDING" | "ACTIVE">("ALL");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        router.push("/login");
        return;
      }
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        router.push("/login");
        return;
      } finally {
        setLoading(false);
      }
    }
  }, [router]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("projectId");
      localStorage.removeItem("organizationId");
      localStorage.removeItem("db_preview_role");
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#030712] text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            Loading Office Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#04060c] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. TOP OFFICE NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Office Identity */}
        <div className="flex items-center gap-3">
          <Link href="/office" className="flex items-center gap-2.5">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-9 h-9 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-slate-900 dark:text-white">
                Digital<span className="text-emerald-600 dark:text-emerald-400">Beings</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Office Console
              </span>
            </div>
          </Link>

          <span className="hidden sm:inline-block h-5 w-px bg-slate-200 dark:bg-white/10 mx-1" />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Backend Sales &amp; Assisted Onboarding
          </span>
        </div>

        {/* Right: Employee Profile & Theme Switcher */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{user?.email || "emp@digitalbeings.com"}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded">
              Office Desk
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:border-red-200 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* 2. MAIN OFFICE WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30 mb-2">
              <span>🏢 Digital Beings Office Operations Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Assisted Client Onboarding &amp; SaaS Sales Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Register clients, provision dedicated Meta WhatsApp Cloud API credentials, and manage custom B2B activations directly from the backend.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => alert("Assisted onboarding workflow initial setup. Next step will open custom client registration wizard.")}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>+ Start Assisted Onboarding</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* 3. OPERATIONAL PIPELINE METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Assigned Clients
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              0
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Total B2B accounts created</span>
          </div>

          <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Meta WABA Approvals
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              0
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Pending WhatsApp verification</span>
          </div>

          <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Live Client Workspaces
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              0
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Active sending OTPs &amp; campaigns</span>
          </div>

          <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Direct Sales Volume
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              ₹0.00
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Prepaid fuel &amp; subscriptions</span>
          </div>
        </div>

        {/* 4. CLIENT ONBOARDING STAGE (BLANK SLATE READY FOR CUSTOM FLOW) */}
        <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
          {/* Action & Filter Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                All Clients (0)
              </button>
              <button
                onClick={() => setActiveTab("IN_PROGRESS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "IN_PROGRESS"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                Draft Onboarding
              </button>
              <button
                onClick={() => setActiveTab("META_PENDING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "META_PENDING"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                Pending Meta Token
              </button>
              <button
                onClick={() => setActiveTab("ACTIVE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "ACTIVE"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                Live &amp; Transacting
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Clean Blank Canvas Stage */}
          <div className="p-12 sm:p-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-xs">
              💼
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Office Client Pipeline Ready
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                No clients are currently undergoing assisted onboarding. Start a new client record to provision WhatsApp Cloud credentials and setup custom pricing from backend.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => alert("Assisted onboarding workflow initial setup. Next step will open custom client registration wizard.")}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                + Register First Client
              </button>
            </div>
          </div>
        </div>

        {/* 5. ONBOARDING PROCESS ROADMAP (FOR OFFICE DESK CLARITY) */}
        <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Office Assisted Onboarding Protocol
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standard operating procedure for registering clients and linking Meta Cloud WABA credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#070b14] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">STAGE 01</span>
                <span className="text-xs">📋</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Business Registration</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Input client's legal entity name, GSTIN, primary phone, and authorized representative email.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#070b14] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">STAGE 02</span>
                <span className="text-xs">🔑</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">WABA &amp; Token Linkage</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect client's Meta Business Manager ID, WABA ID, and permanent System User Access Token.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#070b14] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">STAGE 03</span>
                <span className="text-xs">💳</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Plan &amp; Fuel Provisioning</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Assign client plan tier (Trial, Basic, Pro) and allocate initial prepaid message wallet balance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#070b14] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">STAGE 04</span>
                <span className="text-xs">🚀</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Credentials Handoff</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Generate secure login password for client and dispatch automated onboarding welcome kit.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
