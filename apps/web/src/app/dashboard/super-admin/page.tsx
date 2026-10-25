"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";

interface PlatformStats {
  totalBusinesses: number;
  totalUsers: number;
  totalWalletReserves: number;
  totalMessagesDispatched: number;
}

interface BusinessEntry {
  id: string;
  name: string;
  createdAt: string;
  walletBalance: number;
  projectCount: number;
  phoneCount: number;
  memberCount: number;
  ownerEmail: string | null;
  ownerName: string | null;
}

interface UserEntry {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean | number;
  createdAt: string;
  organizationId: string | null;
  organizationName: string | null;
  membershipRole: string | null;
  customRoleName: string | null;
  rolePermissions: string | string[] | null;
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessEntry[]>([]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"businesses" | "users">("businesses");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessEntry | null>(null);

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const [statsRes, bizRes, usersRes] = await Promise.all([
        fetch(`${getApiUrl()}/v1/super-admin/stats`),
        fetch(`${getApiUrl()}/v1/super-admin/businesses`),
        fetch(`${getApiUrl()}/v1/super-admin/users`)
      ]);

      const [statsData, bizData, usersData] = await Promise.all([
        statsRes.json(),
        bizRes.json(),
        usersRes.json()
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (bizData.success) setBusinesses(bizData.businesses || []);
      if (usersData.success) setUsers(usersData.users || []);
    } catch (err) {
      console.error("Error fetching super admin console data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const filteredBusinesses = businesses.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
      (b.ownerName && b.ownerName.toLowerCase().includes(q)) ||
      b.id.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(q)) ||
      (u.customRoleName && u.customRoleName.toLowerCase().includes(q))
    );
  });

  const parsePerms = (perms: string | string[] | null): string[] => {
    if (!perms) return [];
    if (Array.isArray(perms)) return perms;
    try {
      return JSON.parse(perms);
    } catch {
      return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 text-base shrink-0 font-bold">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {stats ? stats.totalBusinesses.toLocaleString() : "--"} Active Tenant{stats?.totalBusinesses !== 1 ? "s" : ""} • Platform Console
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400">Cross-tenant multi-business oversight, global ledger totals & master governance</p>
          </div>
        </div>

        {/* Right: Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchPlatformData}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className={`text-sm ${loading ? "animate-spin" : ""}`}>🔄</span>
            <span>Refresh Console</span>
          </button>
        </div>
      </div>

      {/* Platform Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs shrink-0 font-bold">
              🏢
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Registered Businesses</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats ? stats.totalBusinesses.toLocaleString() : "--"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active business tenants</div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs shrink-0 font-bold">
              👥
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Platform Users</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats ? stats.totalUsers.toLocaleString() : "--"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Owners, admins & staff</div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs shrink-0 font-bold">
              💳
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Wallet Reserves</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-emerald-600">
            ₹{stats ? Number(stats.totalWalletReserves || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total platform float</div>
        </div>

        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs shrink-0 font-bold">
              🚀
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispatched Messages</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats ? stats.totalMessagesDispatched.toLocaleString() : "--"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lifetime verified dispatches</div>
        </div>
      </div>

      {/* Main Tabbed Directory Card */}
      <div className="bg-white dark:bg-[#0B101D]/80 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs overflow-hidden backdrop-blur-xl">
        {/* Navigation Tabs & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] border border-transparent dark:border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("businesses")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "businesses"
                  ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🏢 Registered Businesses ({businesses.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "users"
                  ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              👥 Platform Users & Roles ({users.length})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder={activeTab === "businesses" ? "Search businesses or owners..." : "Search users, emails, or roles..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-[#070b14] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Tab 1: Businesses Directory */}
        {activeTab === "businesses" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/[0.08] text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Business / Company</th>
                  <th className="p-4">Owner Contact</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-center">Phones</th>
                  <th className="p-4 text-center">Team Members</th>
                  <th className="p-4 text-right">Wallet Balance</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No businesses found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {b.id.slice(0, 12)}...</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{b.ownerName || "Primary Owner"}</div>
                        <div className="text-[11px] text-slate-500">{b.ownerEmail || "N/A"}</div>
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(b.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          📱 {b.phoneCount}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          👥 {b.memberCount}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-extrabold text-emerald-600 text-sm">
                          ₹{Number(b.walletBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedBusiness(b)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-transparent dark:border-white/10 rounded-lg text-xs font-semibold transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Users & Powers Directory */}
        {activeTab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/[0.08] text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Platform Tier</th>
                  <th className="p-4">Assigned Business</th>
                  <th className="p-4">Company Role</th>
                  <th className="p-4">Assigned Module Powers</th>
                  <th className="p-4">Joined Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No platform users found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const perms = parsePerms(u.rolePermissions);
                    const isSuper = Boolean(u.isSuperAdmin);

                    return (
                      <tr key={u.id + (u.organizationId || "")} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{u.name || "User"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        </td>
                        <td className="p-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                              👑 Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              Standard User
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {u.organizationName ? (
                            <span className="font-semibold text-slate-800">{u.organizationName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {u.customRoleName || (u.membershipRole === "owner" ? "Owner" : "Member")}
                            </span>
                            {u.membershipRole === "owner" && (
                              <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 border border-transparent dark:border-emerald-500/30 px-1 rounded">
                                Owner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {isSuper ? (
                            <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              👑 All Modules Unrestricted
                            </span>
                          ) : perms.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {perms.map((p) => (
                                <span
                                  key={p}
                                  className="text-[9px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Default Member Powers</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Business Details Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏢</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{selectedBusiness.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedBusiness.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBusiness(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Owner Name</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBusiness.ownerName || "N/A"}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Owner Email</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{selectedBusiness.ownerEmail || "N/A"}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Wallet Reserves</div>
                <div className="font-extrabold text-emerald-600 mt-0.5 text-sm">
                  ₹{Number(selectedBusiness.walletBalance || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Registered On</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {new Date(selectedBusiness.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">WhatsApp Phone Count</div>
                <div className="font-bold text-slate-800 mt-0.5">{selectedBusiness.phoneCount} Numbers</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.08]">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Team Members</div>
                <div className="font-bold text-slate-800 mt-0.5">{selectedBusiness.memberCount} Users</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
