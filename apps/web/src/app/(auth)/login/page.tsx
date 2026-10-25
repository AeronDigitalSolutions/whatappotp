"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import SocialAuthButtons from "@/components/SocialAuthButtons";

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

      if (data.user?.isSuperAdmin) {
        localStorage.setItem("db_preview_role", "SUPER_ADMIN");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-block mb-3 group">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-12 h-12 rounded-2xl object-contain shadow-xs group-hover:scale-105 transition mx-auto"
            />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-slate-500 mt-1 text-xs">Sign in to your <b>Digital Beings</b> workspace</p>
        </div>

        {selectedPlan && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🎁</span>
              <div>
                <span className="font-extrabold block">
                  {selectedPlan === "TRIAL" && "Starter Trial (₹500 / 30 Days)"}
                  {selectedPlan === "BASIC" && "Basic Business Plan (₹1,000 / month)"}
                  {selectedPlan === "PROFESSIONAL" && "Professional Plan (₹2,500 / month)"}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Workspace activation will continue right after sign in
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-extrabold rounded text-[10px]">
              SELECTED
            </span>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">{error}</div>}

        {/* Social Logins (Google & Meta) */}
        <SocialAuthButtons onError={setError} onLoading={setLoading} loading={loading} />

        {/* Standard Email / Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#154336] hover:bg-[#0f3127] text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-sm shadow-sm cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in to Dashboard"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Don't have an account? <Link href={`/signup${selectedPlan ? `?plan=${selectedPlan}` : ''}`} className="text-blue-600 hover:text-blue-700 font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
