import Link from "next/link";
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="font-bold text-lg text-slate-800">OTP SaaS</span>
        </div>
        <nav className="p-4 space-y-2 text-sm">
          <Link href="/dashboard/setup" className="block px-4 py-2 text-whatsapp font-bold bg-green-50 rounded-md border border-green-100">🚀 Setup Guide</Link>
          <Link href="/dashboard" className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-md font-medium">Overview</Link>
          <Link href="/dashboard/logs" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-md">OTP Logs</Link>
          <Link href="/dashboard/api-keys" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-md">API Keys</Link>
          <Link href="/dashboard/settings" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Settings</Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between">
          <h2 className="font-semibold text-slate-700">Test Project</h2>
          <div className="text-sm text-slate-500">Demo User</div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
