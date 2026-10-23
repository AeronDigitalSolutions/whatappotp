"use client";

import React, { useState } from "react";
import { startSubscriptionCheckout, PLAN_CONFIGS } from "@/lib/razorpay";

interface ActivationPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  defaultPlan?: "TRIAL" | "BASIC" | "PROFESSIONAL";
  organizationId: string;
  userName?: string;
  userEmail?: string;
  onActivationSuccess?: () => void;
}

export default function ActivationPaywallModal({
  isOpen,
  onClose,
  title = "Activate Workspace for Live Operations",
  subtitle = "You are currently in Demo Preview Mode. Choose a plan to unlock live WhatsApp Cloud APIs, production OTPs, and broadcast campaigns immediately.",
  defaultPlan = "TRIAL",
  organizationId,
  userName,
  userEmail,
  onActivationSuccess
}: ActivationPaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayPlan = async (planId: "TRIAL" | "BASIC" | "PROFESSIONAL") => {
    setLoadingPlan(planId);
    setErrorMessage(null);

    try {
      await startSubscriptionCheckout({
        planId,
        organizationId,
        userName,
        userEmail,
        onSuccess: () => {
          setLoadingPlan(null);
          if (onActivationSuccess) {
            onActivationSuccess();
          } else {
            onClose();
            window.location.reload();
          }
        },
        onError: (err) => {
          setLoadingPlan(null);
          setErrorMessage(err);
        },
        onDismiss: () => {
          setLoadingPlan(null);
        }
      });
    } catch (e: any) {
      setLoadingPlan(null);
      setErrorMessage(e.message || "Failed to initiate payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl my-auto overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#154336] text-white p-5 sm:p-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider mb-1.5">
              <span>🔒 Demo Mode Action Locked</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h3>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5 max-w-xl">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition shrink-0 ml-3"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Plan Cards */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Starter Trial */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition space-y-4">
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Starter Trial</span>
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">₹500</span>
                  <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                  <span className="text-[10px] text-slate-500 font-semibold">/ 30 days</span>
                </div>
                <span className="text-[11px] text-slate-500 block">30 Days Platform Access</span>
                <span className="mt-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  🎁 Incl. ₹100 Free Fuel (~500 OTPs)
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/80">
                <li className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="text-emerald-600">✓</span> 1 User (Owner profile)
                </li>
                <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="text-emerald-600">✓</span> ₹100 Pre-loaded Fuel
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> WhatsApp OTP API Keys
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Utility Order Updates
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Basic Campaign Studio
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePayPlan("TRIAL")}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 rounded-xl border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "TRIAL" ? "Opening Razorpay..." : "Activate Trial (₹500 + GST) ➔"}
            </button>
          </div>

          {/* Card 2: Basic Business (Highlighted) */}
          <div className="bg-gradient-to-b from-emerald-50/60 via-white to-white rounded-2xl border-2 border-[#154336] p-5 flex flex-col justify-between shadow-md relative space-y-4">
            <div className="absolute -top-3 right-4 bg-[#00c853] text-slate-950 font-black text-[9px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              BEST VALUE
            </div>
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Basic Business</span>
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">₹1,000</span>
                  <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                  <span className="text-[10px] text-slate-500 font-semibold">/ month</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-semibold block">4 Seats Included (1+3)</span>
                <span className="mt-1 text-[10px] font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                  🎁 Incl. ₹200 Free Fuel (~1,000 OTPs)
                </span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-emerald-200">
                <li className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="text-emerald-600">✓</span> 1 Owner + 3 Support Seats
                </li>
                <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="text-emerald-600">✓</span> ₹200 Pre-loaded Fuel
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> 2-Way Live Team Inbox
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Template Approval Studio
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Ongoing Monthly Continuity
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePayPlan("BASIC")}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 rounded-xl bg-[#154336] hover:bg-[#0f3127] text-white font-black text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "BASIC" ? "Opening Razorpay..." : "Activate Basic (₹1,000 + GST) ➔"}
            </button>
          </div>

          {/* Card 3: Professional */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition space-y-4">
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Professional</span>
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">₹2,500</span>
                  <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                  <span className="text-[10px] text-slate-500 font-semibold">/ month</span>
                </div>
                <span className="text-[11px] text-slate-500 block">6 Seats + Shopify + AI</span>
                <span className="mt-1 text-[10px] font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                  🎁 Incl. ₹500 Free Fuel + Free OBA
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/80">
                <li className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="text-emerald-600">✓</span> 1 Owner + 5 Support Seats
                </li>
                <li className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="text-emerald-600">✓</span> ₹500 Pre-loaded Fuel
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Shopify/Woo Webhooks
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> 24/7 AI Chatbot Assistant
                </li>
                <li className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="text-emerald-600">✓</span> FREE Green Tick Filing (Save ₹999 + GST)
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePayPlan("PROFESSIONAL")}
              disabled={loadingPlan !== null}
              className="w-full py-2.5 rounded-xl border-2 border-[#154336] text-[#154336] hover:bg-[#154336] hover:text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === "PROFESSIONAL" ? "Opening Razorpay..." : "Activate Pro (₹2,500 + GST) ➔"}
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Payment is processed securely by Razorpay with instant GST tax invoice generation.
        </div>
      </div>
    </div>
  );
}
