"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionCheckout, PLAN_CONFIGS } from "@/lib/razorpay";

export type PlanModalStage = "TRIAL_VS_BASIC" | "BASIC_VS_PRO" | "ENTERPRISE";

interface PlanAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStage?: PlanModalStage;
}

export default function PlanAdvisorModal({
  isOpen,
  onClose,
  initialStage = "TRIAL_VS_BASIC"
}: PlanAdvisorModalProps) {
  const [stage, setStage] = useState<PlanModalStage>(initialStage);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setStage(initialStage);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoadingPlan(null);
    }
  }, [isOpen, initialStage]);

  if (!isOpen) return null;

  const handleSelectPlan = async (planId: "TRIAL" | "BASIC" | "PROFESSIONAL") => {
    setErrorMessage(null);
    setLoadingPlan(planId);

    try {
      const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;

      // If user is already logged in, launch Razorpay immediately
      if (userJson && orgId) {
        const user = JSON.parse(userJson);
        await startSubscriptionCheckout({
          planId,
          organizationId: orgId,
          userName: user.name,
          userEmail: user.email,
          onSuccess: (res) => {
            setLoadingPlan(null);
            setSuccessMessage(`Payment successful! Your ${planId} workspace plan is now active.`);
            setTimeout(() => {
              onClose();
              router.push("/dashboard");
              window.location.reload();
            }, 1800);
          },
          onError: (err) => {
            setLoadingPlan(null);
            setErrorMessage(err);
          },
          onDismiss: () => {
            setLoadingPlan(null);
          }
        });
      } else {
        // Not logged in -> remember intended plan and route to signup
        if (typeof window !== "undefined") {
          localStorage.setItem("pendingPlan", planId);
        }
        onClose();
        router.push(`/signup?plan=${planId}`);
      }
    } catch (e: any) {
      setLoadingPlan(null);
      setErrorMessage(e.message || "Unable to proceed to payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl my-auto overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#154336] text-white p-5 sm:p-6 flex items-center justify-between relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              <span>⚡ Interactive Plan Comparison</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              {stage === "TRIAL_VS_BASIC" && "Starter Trial (₹500 + GST) vs. Basic Business (₹1,000 + GST)"}
              {stage === "BASIC_VS_PRO" && "Basic Plan (₹1,000 + GST) vs. Professional Scale (₹2,500 + GST)"}
              {stage === "ENTERPRISE" && "Custom High-Throughput Enterprise Architecture"}
            </h3>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5">
              Transparent Meta Cloud API platform · Direct Razorpay checkout with GST invoice
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition shrink-0 ml-3"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Step Navigation Pill Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 overflow-x-auto gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStage("TRIAL_VS_BASIC")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                stage === "TRIAL_VS_BASIC"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>1</span>
              <span>Trial vs. Basic</span>
            </button>
            <span className="text-slate-300">➔</span>
            <button
              onClick={() => setStage("BASIC_VS_PRO")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                stage === "BASIC_VS_PRO"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>2</span>
              <span>Basic vs. Professional</span>
            </button>
            <span className="text-slate-300">➔</span>
            <button
              onClick={() => setStage("ENTERPRISE")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                stage === "ENTERPRISE"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>3</span>
              <span>Enterprise Custom</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Official Meta Cloud Partner
          </span>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}
        {successMessage && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {/* ========================================================== */}
          {/* STAGE 1: TRIAL (₹500) VS BASIC (₹1,000)                   */}
          {/* ========================================================== */}
          {stage === "TRIAL_VS_BASIC" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Are you testing alone or collaborating with a team?
                </h4>
                <p className="text-xs text-slate-500">
                  Choose the 30-day Starter Trial to test OTP APIs solo, or choose Basic Business to equip your team with a shared live inbox and template dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* Option 1: Starter Trial */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition shadow-xs space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Starter Trial</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">1 Month</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹500</span>
                        <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-500 font-semibold">/ 30 days total</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">One-time payment (+ 18% GST). Perfect for solo developers.</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                        <span>🎁 Includes ₹100 Free Starter OTP Fuel (~500 OTPs)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 User Only (Owner Profile)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="text-emerald-600 font-black">✓</span> ₹100 Pre-loaded Fuel (No 2nd payment to start!)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP API Integration &amp; REST Keys
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Utility Order Updates &amp; Receipts
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Basic Campaign Broadcast Studio
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> 30 Days Full Production Testing Window
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>✕</span> No multi-agent team seats
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>✕</span> OBA Green Tick is ₹999 + GST add-on
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan("TRIAL")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 px-4 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {loadingPlan === "TRIAL" ? "Opening Razorpay..." : "Start 30-Day Trial (₹500 + GST) ➔"}
                  </button>
                </div>

                {/* Option 2: Basic Business (Highlighted) */}
                <div className="bg-gradient-to-b from-emerald-50/60 via-white to-white rounded-2xl border-2 border-[#154336] p-6 flex flex-col justify-between shadow-md relative space-y-5">
                  <div className="absolute -top-3 right-6 bg-[#00c853] text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                    🌟 RECOMMENDED VALUE
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Basic Business Plan</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">4 Seats Included</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹1,000</span>
                        <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-500 font-semibold">/ month</span>
                      </div>
                      <p className="text-xs text-emerald-800 font-semibold mt-1">
                        Only ₹500 + GST more gets you 3 extra team seats &amp; ongoing monthly stability!
                      </p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] font-black border border-emerald-300">
                        <span>🎁 Includes ₹200 Free Starter Fuel (~1,000 OTPs)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-100/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                      <span className="font-extrabold block">🎁 What You Gain Over the ₹500 + GST Trial:</span>
                      <p className="text-[11px] leading-relaxed">
                        • <strong>3 Extra Support Profiles Included</strong> (1 Owner + 3 Support = 4 Total Seats, saving ₹1,500/mo).<br />
                        • <strong>₹200 Pre-loaded Fuel Credit</strong> included directly in your wallet balance.<br />
                        • <strong>2-Way Live Team Inbox</strong>: Multiple staff reply from one official WhatsApp number.<br />
                        • <strong>Meta Template Approval Studio</strong> with real-time status sync.<br />
                        • <strong>Uninterrupted Month-to-Month Continuity</strong>: Never worry about a 30-day cutoff.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 Owner + 3 Support Seats (4 Seats Total)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="text-emerald-600 font-black">✓</span> Pre-loaded ₹200 Starter Wallet Fuel
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Extra seats available at ₹500 + GST/month each
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Live Chat Inbox &amp; Agent Routing
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Priority WhatsApp OTP &amp; Notification API
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Meta Template Approval Dashboard
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan("BASIC")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#154336] hover:bg-[#0f3127] text-white font-black text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loadingPlan === "BASIC" ? "Opening Razorpay..." : "Choose Basic Business Plan (₹1,000 + GST/mo) ➔"}
                  </button>
                </div>
              </div>

              {/* Bottom Navigation Link to Step 2 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-600">
                  Looking for Shopify cart recovery, 24/7 AI auto-reply bots, or free Official Green Tick?
                </span>
                <button
                  onClick={() => setStage("BASIC_VS_PRO")}
                  className="text-emerald-700 font-extrabold hover:text-emerald-800 hover:underline cursor-pointer shrink-0"
                >
                  Compare with Professional Plan (₹2,500 + GST) ➔
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STAGE 2: BASIC (₹1,000) VS PROFESSIONAL (₹2,500)          */}
          {/* ========================================================== */}
          {stage === "BASIC_VS_PRO" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Need E-Commerce Cart Recovery, AI Bots &amp; Green Tick?
                </h4>
                <p className="text-xs text-slate-500">
                  Step up to Professional for automated Shopify cart recovery, intelligent conversational bots, and free Meta Green Tick verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* Option 1: Basic Business */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition shadow-xs space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Basic Plan</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">4 Seats</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹1,000</span>
                        <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-500 font-semibold">/ month</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Best for standard WhatsApp support and notifications.</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 Owner + 3 Support Seats (4 Total)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP &amp; Utility Receipts
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> 2-Way Live Team Inbox
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Template Approval Dashboard
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>✕</span> E-Commerce API (Shopify/WooCommerce) not included
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>✕</span> AI Chatbot auto-replies not included
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>✕</span> OBA Green Tick is ₹999 + GST add-on
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan("BASIC")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 px-4 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {loadingPlan === "BASIC" ? "Opening Razorpay..." : "Select Basic Plan (₹1,000 + GST/mo) ➔"}
                  </button>
                </div>

                {/* Option 2: Professional Scale (Featured) */}
                <div className="bg-[#154336] text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl relative border-2 border-emerald-400 space-y-5">
                  <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-400 to-[#25D366] text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                    MOST POPULAR FOR SCALE
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Professional Plan</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700">6 Seats</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-white">₹2,500</span>
                        <sub className="text-xs font-black text-emerald-300 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-emerald-200 font-semibold">/ month</span>
                      </div>
                      <p className="text-xs text-emerald-200 mt-1">
                        Turnkey automations for scaling brands &amp; e-commerce businesses.
                      </p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-[11px] font-black shadow-xs">
                        <span>🎁 Includes ₹500 Free Starter Fuel (~2,500 OTPs)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-900/60 rounded-xl border border-emerald-700/80 text-xs text-emerald-100 space-y-1">
                      <span className="font-extrabold text-white block">🚀 Everything in Basic, plus:</span>
                      <p className="text-[11px] leading-relaxed">
                        • <strong>6 Seats Included</strong> (1 Owner + 5 Support Profiles).<br />
                        • <strong>₹500 Pre-loaded Fuel Credit</strong> for instant broadcasts and OTPs.<br />
                        • <strong>Shopify &amp; WooCommerce Recipes</strong> (Cart recovery &amp; COD confirmation).<br />
                        • <strong>24/7 AI Chatbot Assistant</strong> with interactive buttons.<br />
                        • <strong>Complex Logic Campaigns</strong> (Read-Not-Replied follow-ups).<br />
                        • <strong>FREE Official Green Tick (OBA) Filing</strong> (Saves ₹999 + GST!).
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-emerald-50">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="text-emerald-400 font-black">✓</span> 1 Owner + 5 Support Seats (6 Total)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <span className="text-emerald-400 font-black">✓</span> Pre-loaded ₹500 Starter Wallet Fuel
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> E-Commerce API (Shopify, WooCommerce, Custom)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> 24/7 AI Chatbot Automations
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> Complex Funnel Logic (Read-Not-Replied)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <span className="text-emerald-400 font-bold">✓</span> FREE Meta Official Green Tick Verification
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan("PROFESSIONAL")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loadingPlan === "PROFESSIONAL" ? "Opening Razorpay..." : "Select Professional Plan (₹2,500 + GST/mo) ➔"}
                  </button>
                </div>
              </div>

              {/* Navigation Back / Next Links */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => setStage("TRIAL_VS_BASIC")}
                  className="text-slate-600 font-bold hover:text-slate-900 cursor-pointer"
                >
                  ⬅ Back to Starter vs. Basic
                </button>
                <button
                  onClick={() => setStage("ENTERPRISE")}
                  className="text-emerald-700 font-extrabold hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Sending &gt; 100,000 msgs/month? View Custom Enterprise ➔
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STAGE 3: ENTERPRISE CUSTOM TIER                           */}
          {/* ========================================================== */}
          {stage === "ENTERPRISE" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Custom High-Throughput Enterprise Architecture
                </h4>
                <p className="text-xs text-slate-500">
                  Engineered for banks, large enterprises, and high-frequency OTP workloads exceeding 100,000+ messages per month.
                </p>
              </div>

              <div className="bg-slate-900 text-white rounded-3xl p-7 sm:p-8 space-y-6 border border-slate-800 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-800/80 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-400 block text-sm">⚡ 50+ Messages / Second</span>
                    <p className="text-slate-300">Dedicated WABA Tier acceleration with zero API queue latency.</p>
                  </div>
                  <div className="p-4 bg-slate-800/80 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-400 block text-sm">👥 Unlimited Seats &amp; Roles</span>
                    <p className="text-slate-300">Enterprise SSO, audit logs, and custom access permissions.</p>
                  </div>
                  <div className="p-4 bg-slate-800/80 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-400 block text-sm">🛡️ 99.99% Uptime SLA</span>
                    <p className="text-slate-300">Financial-grade deliverability SLA backed by official Meta direct routing.</p>
                  </div>
                  <div className="p-4 bg-slate-800/80 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-400 block text-sm">👨‍💼 Dedicated Account Manager</span>
                    <p className="text-slate-300">24/7 priority hotline, technical onboarding &amp; custom webhooks.</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="mailto:support@digitalbeings.in?subject=Enterprise%20WhatsApp%20API%20Inquiry"
                    className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition text-center"
                  >
                    Contact Enterprise Sales ➔
                  </a>
                  <a
                    href="https://wa.me/?text=Hello%20I%20am%20interested%20in%20Digital%20Beings%20Enterprise%20WhatsApp%20API"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition text-center"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setStage("TRIAL_VS_BASIC")}
                  className="text-xs text-slate-500 font-bold hover:text-slate-900 cursor-pointer"
                >
                  ⬅ Back to Standard Plans (₹500 + GST / ₹1,000 + GST / ₹2,500 + GST)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
