"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionCheckout, PLAN_CONFIGS } from "@/lib/razorpay";

export type PlanModalStage = "TRIAL_VS_BASIC" | "BASIC_VS_PRO" | "PRO_VS_CUSTOM" | "ENTERPRISE";

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
      setStage(initialStage === "ENTERPRISE" ? "PRO_VS_CUSTOM" : initialStage);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoadingPlan(null);
    }
  }, [isOpen, initialStage]);

  if (!isOpen) return null;

  // Standardize active comparison stage: "ENTERPRISE" maps to "PRO_VS_CUSTOM"
  const activeStage: "TRIAL_VS_BASIC" | "BASIC_VS_PRO" | "PRO_VS_CUSTOM" =
    stage === "ENTERPRISE" ? "PRO_VS_CUSTOM" : stage;

  const handleSelectPlan = async (planId: "TRIAL" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE") => {
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
              {activeStage === "TRIAL_VS_BASIC" && "Starter Trial (₹500 + GST) vs. Basic Business (₹1,000 + GST)"}
              {activeStage === "BASIC_VS_PRO" && "Basic Plan (₹1,000 + GST) vs. Professional Scale (₹2,500 + GST)"}
              {activeStage === "PRO_VS_CUSTOM" && "Professional Scale (₹2,500 + GST) vs. Custom Enterprise"}
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
                activeStage === "TRIAL_VS_BASIC"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>1</span>
              <span>Trial (₹500) vs. Basic (₹1,000)</span>
            </button>
            <span className="text-slate-300">➔</span>
            <button
              onClick={() => setStage("BASIC_VS_PRO")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeStage === "BASIC_VS_PRO"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>2</span>
              <span>Basic (₹1,000) vs. Pro (₹2,500)</span>
            </button>
            <span className="text-slate-300">➔</span>
            <button
              onClick={() => setStage("PRO_VS_CUSTOM")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeStage === "PRO_VS_CUSTOM"
                  ? "bg-[#154336] text-white shadow-xs"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>3</span>
              <span>Pro (₹2,500) vs. Custom</span>
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
          {activeStage === "TRIAL_VS_BASIC" && (
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
                {/* LEFT CARD: Starter Trial (Confirm & Pay ₹500) */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition shadow-xs space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Starter Trial</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">One-Time Only</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹500</span>
                        <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-500 font-semibold">/ 30 days total</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">One-time introductory evaluation (+ 18% GST). First-time users only.</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-black border border-slate-200">
                        <span>⚡ 30 Days Full Platform Access</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 User Only (Owner Profile)
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-emerald-600 font-bold">✓</span> Pay-as-you-go message fuel (₹0 wallet bonus)
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
                        <span>✕</span> Meta OBA Green Tick is ₹999 + GST add-on
                      </div>
                    </div>
                  </div>

                  {/* Left Button -> Confirms and Opens Razorpay for ₹500 */}
                  <button
                    onClick={() => handleSelectPlan("TRIAL")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingPlan === "TRIAL" ? (
                      <span>Opening Razorpay...</span>
                    ) : (
                      <>
                        <span>Start 30-Day Trial (₹500 + GST)</span>
                        <span>➔</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT CARD: Basic Business (Upgrade & Advance to Stage 2) */}
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
                        <span>🎁 Includes ₹50 Free Wallet Balance (~250 OTPs)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-100/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                      <span className="font-extrabold block">🎁 What You Gain Over the ₹500 + GST Trial:</span>
                      <p className="text-[11px] leading-relaxed">
                        • <strong>3 Extra Support Profiles Included</strong> (1 Owner + 3 Support = 4 Total Seats, saving ₹1,500/mo).<br />
                        • <strong>₹50 Free Wallet Balance</strong> included directly in your wallet balance.<br />
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
                        <span className="text-emerald-600 font-black">✓</span> ₹50 Starter Wallet Balance Included (~250 OTPs)
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

                  {/* Right Button -> Shifts to Stage 2 (₹1,000 on left, ₹2,500 on right) */}
                  <button
                    onClick={() => setStage("BASIC_VS_PRO")}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#154336] hover:bg-[#0f3127] text-white font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Select ₹1,000 &amp; Compare with ₹2,500</span>
                    <span className="group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
                </div>
              </div>

              {/* Bottom Navigation Link to Step 2 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-600">
                  Looking for Shopify cart recovery, 24/7 AI auto-reply bots, or Green Tick filing support?
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
          {activeStage === "BASIC_VS_PRO" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Need E-Commerce Cart Recovery, AI Bots &amp; Green Tick Filing Support?
                </h4>
                <p className="text-xs text-slate-500">
                  Step up to Professional for automated Shopify cart recovery, intelligent conversational bots, and Meta Green Tick filing support.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* LEFT CARD: Basic Business (Confirm & Pay ₹1,000) */}
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
                      <p className="text-xs text-slate-500 mt-1">Best for standard WhatsApp support, OTP API and live team inbox.</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] font-black border border-emerald-300">
                        <span>🎁 Includes ₹50 Free Wallet Balance (~250 OTPs)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 Owner + 3 Support Seats (4 Total)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="text-emerald-600 font-black">✓</span> ₹50 Starter Wallet Balance Included (~250 OTPs)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP &amp; Utility Receipts
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> 2-Way Live Team Inbox &amp; Routing
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
                        <span>✕</span> Meta OBA Green Tick is ₹999 + GST add-on
                      </div>
                    </div>
                  </div>

                  {/* Left Button -> Confirms and Opens Razorpay for ₹1,000 */}
                  <button
                    onClick={() => handleSelectPlan("BASIC")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingPlan === "BASIC" ? (
                      <span>Opening Razorpay...</span>
                    ) : (
                      <>
                        <span>Confirm &amp; Pay Basic Plan (₹1,000 + GST)</span>
                        <span>➔</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT CARD: Professional Scale (Upgrade & Advance to Stage 3) */}
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
                        <span>🎁 Includes ₹100 Free Wallet Balance (~500 OTPs)</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-900/60 rounded-xl border border-emerald-700/80 text-xs text-emerald-100 space-y-1">
                      <span className="font-extrabold text-white block">🚀 Everything in Basic, plus:</span>
                      <p className="text-[11px] leading-relaxed">
                        • <strong>6 Seats Included</strong> (1 Owner + 5 Support Profiles).<br />
                        • <strong>₹100 Free Wallet Balance</strong> included for instant broadcasts and OTPs.<br />
                        • <strong>Shopify &amp; WooCommerce Recipes</strong> (Cart recovery &amp; COD confirmation).<br />
                        • <strong>24/7 AI Chatbot Assistant</strong> with interactive buttons.<br />
                        • <strong>Complex Logic Campaigns</strong> (Read-Not-Replied follow-ups).<br />
                        • <strong>Official Green Tick (OBA) Filing Support Included</strong> (Subject to Meta approval criteria, saves ₹999 + GST!).
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-emerald-50">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="text-emerald-400 font-black">✓</span> 1 Owner + 5 Support Seats (6 Total)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <span className="text-emerald-400 font-black">✓</span> Pre-loaded ₹100 Starter Wallet Fuel (~500 OTPs)
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
                        <span className="text-emerald-400 font-bold">✓</span> Meta Official Green Tick (OBA) Filing Support Included (Subject to Meta criteria)
                      </div>
                    </div>
                  </div>

                  {/* Right Button -> Shifts to Stage 3 (₹2,500 on left, Custom on right) */}
                  <button
                    onClick={() => setStage("PRO_VS_CUSTOM")}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <span>Select ₹2,500 &amp; Compare with Custom</span>
                    <span className="group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
                </div>
              </div>

              {/* Navigation Back / Next Links */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => setStage("TRIAL_VS_BASIC")}
                  className="text-slate-600 font-bold hover:text-slate-900 cursor-pointer flex items-center gap-1.5"
                >
                  <span>⬅</span>
                  <span>Back to Starter Trial (₹500 + GST)</span>
                </button>
                <button
                  onClick={() => setStage("PRO_VS_CUSTOM")}
                  className="text-emerald-700 font-extrabold hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Sending &gt; 100,000 msgs/month? View Custom Enterprise ➔
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STAGE 3: PROFESSIONAL (₹2,500) VS CUSTOM ENTERPRISE       */}
          {/* ========================================================== */}
          {activeStage === "PRO_VS_CUSTOM" && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  Professional Scale vs. Custom High-Throughput Enterprise
                </h4>
                <p className="text-xs text-slate-500">
                  Choose Professional for turnkey automations &amp; team collaboration, or Custom Enterprise for dedicated infrastructure exceeding 100,000+ messages per month.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* LEFT CARD: Professional (Confirm & Pay ₹2,500) */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition shadow-xs space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Professional Plan</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">6 Seats</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">₹2,500</span>
                        <sub className="text-xs font-black text-slate-500 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-500 font-semibold">/ month</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Turnkey automations for scaling brands &amp; e-commerce businesses.</p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] font-black border border-emerald-300">
                        <span>🎁 Includes ₹100 Free Wallet Balance (~500 OTPs)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="text-emerald-600 font-black">✓</span> 1 Owner + 5 Support Seats (6 Seats Total)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="text-emerald-600 font-black">✓</span> ₹100 Starter Wallet Balance Included (~500 OTPs)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Extra seats available at ₹500 + GST/month each
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Shopify &amp; WooCommerce Cart Recovery Recipes
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> 24/7 AI Chatbot Assistant &amp; Auto-Replies
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Complex Funnel Logic (Read-Not-Replied)
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="text-emerald-600 font-bold">✓</span> Meta Official Green Tick (OBA) Filing Support Included
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span> Priority Meta API Throughput Queuing
                      </div>
                    </div>
                  </div>

                  {/* Left Button -> Confirms and Opens Razorpay for ₹2,500 */}
                  <button
                    onClick={() => handleSelectPlan("PROFESSIONAL")}
                    disabled={loadingPlan !== null}
                    className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black text-xs transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingPlan === "PROFESSIONAL" ? (
                      <span>Opening Razorpay...</span>
                    ) : (
                      <>
                        <span>Confirm &amp; Pay Professional (₹2,500 + GST)</span>
                        <span>➔</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT CARD: Custom Enterprise (Goes to Payment Option) */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-xl relative border-2 border-emerald-400 space-y-5">
                  <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-400 to-[#25D366] text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                    ⚡ HIGH-VOLUME DEDICATED
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Enterprise Architecture</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-emerald-200 border border-slate-700">Custom Volume</span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-white">Custom</span>
                        <sub className="text-xs font-black text-emerald-300 bottom-0 uppercase tracking-tight">+ GST</sub>
                        <span className="text-xs text-slate-400 font-semibold">/ tailored volume</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Engineered for banks, large enterprises, and high-frequency OTP workloads exceeding 100,000+ messages per month.
                      </p>
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 text-[11px] font-black border border-slate-700">
                        <span>🏢 Dedicated WABA Infrastructure &amp; 99.99% SLA</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 text-xs text-slate-200 space-y-1">
                      <span className="font-extrabold text-white block">⚡ Enterprise Exclusive Architecture:</span>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        • <strong>50+ Messages / Second Dedicated Throttle Speed</strong> (Zero queue latency).<br />
                        • <strong>Unlimited Team Seats &amp; Custom Roles</strong> with SSO &amp; audit trails.<br />
                        • <strong>Custom CRM, ERP &amp; Webhook Direct Integrations</strong>.<br />
                        • <strong>Financial-grade 99.99% Deliverability SLA Guarantee</strong>.<br />
                        • <strong>24/7 Dedicated Technical Account Manager</strong> &amp; priority phone hotline.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="text-emerald-400 font-black">✓</span> Unlimited Staff Profiles &amp; Department Routing
                      </div>
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <span className="text-emerald-400 font-black">✓</span> Includes ₹250 Starter Fuel + Tailored Wholesale Per-Message Rates
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> Direct Meta Tier Escalation &amp; Highest API Priority
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> Official Green Tick (OBA) Filing Support Included
                      </div>
                    </div>
                  </div>

                  {/* Right Button -> Goes to Payment Option (Enterprise Custom Setup & Razorpay / Direct Hotline) */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSelectPlan("ENTERPRISE")}
                      disabled={loadingPlan !== null}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingPlan === "ENTERPRISE" ? (
                        <span>Opening Razorpay...</span>
                      ) : (
                        <>
                          <span>Proceed to Enterprise Custom Payment (₹5,000 + GST)</span>
                          <span>➔</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                      <a
                        href="https://wa.me/?text=Hello%20Digital%20Beings%2C%20I%20am%20interested%20in%20a%20Custom%20Enterprise%20WhatsApp%20API%20plan%20for%20high%20throughput"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg border border-white/20 transition text-center"
                      >
                        Chat on WhatsApp
                      </a>
                      <a
                        href="mailto:support@digitalbeings.in?subject=Enterprise%20WhatsApp%20API%20Inquiry"
                        className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg border border-white/20 transition text-center"
                      >
                        Email Enterprise Sales
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Back / Next Links */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => setStage("BASIC_VS_PRO")}
                  className="text-slate-600 font-bold hover:text-slate-900 cursor-pointer flex items-center gap-1.5"
                >
                  <span>⬅</span>
                  <span>Back to Basic (₹1,000) vs. Professional (₹2,500)</span>
                </button>
                <button
                  onClick={() => setStage("TRIAL_VS_BASIC")}
                  className="text-slate-500 font-semibold hover:text-slate-800 cursor-pointer"
                >
                  Start Over from Starter Trial (₹500 + GST) ↺
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
