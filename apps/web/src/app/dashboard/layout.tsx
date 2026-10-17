"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const titles: Record<string, string> = {
      "/dashboard": "Mission Control Overview | Digital Beings",
      "/dashboard/setup": "Setup Guide | Digital Beings",
      "/dashboard/numbers": "Numbers & Routing | Digital Beings",
      "/dashboard/green-tick": "Green Tick Verification | Digital Beings",
      "/dashboard/templates": "Template Studio | Digital Beings",
      "/dashboard/campaigns": "Broadcast Campaigns | Digital Beings",
      "/dashboard/wallet": "Wallet & Billing | Digital Beings",
      "/dashboard/logs": "OTP Logs & Audits | Digital Beings",
      "/dashboard/api-keys": "API Keys | Digital Beings",
      "/dashboard/settings": "Settings | Digital Beings",
    };
    document.title = titles[pathname] || "Digital Beings - WhatsApp Cloud Platform";

    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
    } else {
      const user = JSON.parse(userJson);
      setUserName(user.name || "User");
      setAuthChecked(true);
    }
  }, [pathname, router]);

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const navLinkClass = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "block px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm transition";
    }
    return "block px-4 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-sm transition";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0 group-hover:scale-105 transition"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                Digital<span className="text-emerald-600">Beings</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                Secure • Connect • Grow
              </span>
            </div>
          </Link>
        </div>
        <nav className="p-4 space-y-1.5 text-sm">
          <Link href="/dashboard/setup" className="block px-4 py-2 text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 mb-3 transition">
            🚀 Setup Guide
          </Link>
          <Link href="/dashboard" className={navLinkClass("/dashboard")}>
            📊 Overview
          </Link>
          <Link href="/dashboard/numbers" className={navLinkClass("/dashboard/numbers")}>
            📱 Numbers & Routing
          </Link>
          <Link href="/dashboard/green-tick" className={navLinkClass("/dashboard/green-tick")}>
            ✅ Green Tick (OBA)
          </Link>
          <Link href="/dashboard/templates" className={navLinkClass("/dashboard/templates")}>
            📄 Template Studio
          </Link>
          <Link href="/dashboard/campaigns" className={navLinkClass("/dashboard/campaigns")}>
            📣 Broadcast Campaigns
          </Link>
          <Link href="/dashboard/wallet" className={navLinkClass("/dashboard/wallet")}>
            💳 Wallet & Billing
          </Link>
          <Link href="/dashboard/logs" className={navLinkClass("/dashboard/logs")}>
            📋 OTP Logs
          </Link>
          <Link href="/dashboard/api-keys" className={navLinkClass("/dashboard/api-keys")}>
            🔑 API Keys
          </Link>
          <Link href="/dashboard/settings" className={navLinkClass("/dashboard/settings")}>
            ⚙️ Settings
          </Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded">Workspace</span>
            <h2 className="font-semibold text-slate-800">Production Project</h2>
          </div>
          <div className="text-sm flex items-center space-x-4">
            <span className="text-slate-600 font-medium flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                {userName.charAt(0).toUpperCase()}
              </span>
              {userName}
            </span>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium text-xs border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
