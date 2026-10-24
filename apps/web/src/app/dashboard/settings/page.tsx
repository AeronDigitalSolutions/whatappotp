"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useSubscription } from "@/context/SubscriptionContext";
import TokenUpdateModal from "@/components/TokenUpdateModal";

export default function SettingsPage() {
  const { showSuccess, showError } = useModal();
  const { isDemo, triggerPaywall } = useSubscription();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);

  // OTP config states
  const [otpLength, setOtpLength] = useState<number>(6);
  const [expiry, setExpiry] = useState<number>(300);
  const [maxAttempts, setMaxAttempts] = useState<number>(5);

  const fetchProject = async (pid: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/project/${pid}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pid = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;
    if (pid) {
      setProjectId(pid);
      fetchProject(pid);
    } else {
      setLoading(false);
    }
  }, []);

  const handleSaveSettings = () => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To save custom workspace settings and OTP configuration, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    showSuccess("OTP settings updated successfully.", "Settings Saved");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 text-base shrink-0 font-bold">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Workspace Configuration & Meta Credentials
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400">Meta WhatsApp Cloud API credentials, permanent tokens & OTP policy</p>
          </div>
        </div>

        {/* Right: Mode Toggle + Action Buttons */}
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowTokenModal(true)}
            className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔑</span> Update Access Token
          </button>
        </div>
      </div>

      {/* 1. Meta WhatsApp Cloud API Credentials */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Cloud API Connection Telemetry</h2>
          <p className="text-[11px] text-slate-400">Live token validity, Meta WABA ID, and primary WhatsApp sender phone ID</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Token Status
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${project?.metaAccessToken ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
              <span className="text-sm font-extrabold text-slate-900">
                {project?.metaAccessToken ? "Token Connected" : "Not Connected"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {project?.metaAccessToken
                ? "Token is saved in your project."
                : "No Meta access token configured."}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              WhatsApp Business Account (WABA)
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 truncate">
              {project?.metaWabaId || "2107898293422238"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Primary Meta Business Account</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Default Phone Number ID
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 truncate">
              {project?.metaPhoneId || "1406142089245094"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Meta registered phone ID</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <span className="text-lg">💡</span>
          <div>
            <p className="font-bold">Permanent Token Recommendation</p>
            <p className="mt-0.5 leading-relaxed text-blue-800">
              Temporary access tokens expire every 1–2 hours. To keep your OTP service and broadcast campaigns online 24/7 without interruption, use the "Update Access Token" button to paste a <strong>Permanent System User Token (Never Expires)</strong> from Meta Business Settings.
            </p>
          </div>
        </div>
      </div>

      {/* 2. OTP Delivery Rules */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-lg font-bold text-slate-900">OTP Rules & Parameters</h2>
          <p className="text-xs text-slate-500">Default security parameters for generated OTP codes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              OTP Code Length
            </label>
            <select
              value={otpLength}
              onChange={(e) => setOtpLength(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 p-3 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value={4}>4 digits (Fastest)</option>
              <option value={6}>6 digits (Standard Enterprise)</option>
              <option value={8}>8 digits (High Security)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Code Expiry (Seconds)
            </label>
            <input
              type="number"
              value={expiry}
              onChange={(e) => setExpiry(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 p-3 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Default 300 seconds (5 minutes).</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Max Verification Attempts
            </label>
            <input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 p-3 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Lock code after failed tries.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-xs transition"
          >
            Save OTP Rules
          </button>
        </div>
      </div>

      {/* Token Modal */}
      <TokenUpdateModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSuccess={() => {
          if (projectId) fetchProject(projectId);
        }}
        projectId={projectId || ""}
      />
    </div>
  );
}
