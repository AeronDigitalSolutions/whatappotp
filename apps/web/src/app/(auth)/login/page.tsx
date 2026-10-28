"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get("plan") || localStorage.getItem("pendingPlan");
      if (plan && (plan === "TRIAL" || plan === "BASIC" || plan === "PROFESSIONAL")) {
        setSelectedPlan(plan);
        localStorage.setItem("pendingPlan", plan);
      }
    }
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${getApiUrl()}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Login failed");

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("projectId", data.projectId);
      localStorage.setItem("organizationId", data.organizationId);

      const isOfficeStaff = Boolean(
        data.user?.isEmployee ||
        data.user?.officeRole ||
        data.user?.role === "EMPLOYEE" ||
        data.user?.role === "OFFICE_ADMIN" ||
        data.user?.role === "OFFICE_MANAGER" ||
        data.user?.email === "admin@digitalbeings.in" ||
        data.user?.email === "emp@digitalbeings.in" ||
        data.user?.email === "emp@digitalbeings.com"
      );

      if (data.user?.isSuperAdmin || data.user?.role === "OFFICE_ADMIN" || data.user?.email === "admin@digitalbeings.in") {
        localStorage.setItem("db_preview_role", "SUPER_ADMIN");
      } else if (isOfficeStaff) {
        localStorage.setItem("db_preview_role", "EMPLOYEE");
      }

      if (isOfficeStaff) {
        router.push("/office");
        return;
      }

      if (selectedPlan) {
        localStorage.setItem("pendingPlan", selectedPlan);
        router.push("/dashboard?activate=true");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd] dark:bg-[#030712] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative">
      {/* Floating Theme Switcher */}
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-[#0B101D] rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200/90 dark:border-white/10 p-8 sm:p-10 space-y-6 transition-colors duration-300">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-block mb-3 group">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-12 h-12 rounded-2xl object-contain shadow-xs group-hover:scale-105 transition mx-auto"
            />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">
            Sign in to your <b className="text-slate-900 dark:text-slate-200">Digital Beings</b> workspace
          </p>
        </div>

        {selectedPlan && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎁</span>
              <div>
                <span className="font-extrabold block text-emerald-900 dark:text-emerald-100">
                  {selectedPlan === "TRIAL" && "Starter Trial (₹500 / 30 Days)"}
                  {selectedPlan === "BASIC" && "Basic Business Plan (₹1,000 / month)"}
                  {selectedPlan === "PROFESSIONAL" && "Professional Plan (₹2,500 / month)"}
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Workspace activation will continue right after sign in
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold rounded text-[10px] tracking-wide">
              SELECTED
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-3.5 rounded-xl text-sm border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        {/* Social Logins (Google & Meta) */}
        <SocialAuthButtons onError={setError} onLoading={setLoading} loading={loading} />

        {/* Standard Email / Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
              placeholder="admin@digitalbeings.in"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm shadow-md hover:shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : "Sign in to Dashboard"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <Link
            href={`/signup${selectedPlan ? `?plan=${selectedPlan}` : ''}`}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
