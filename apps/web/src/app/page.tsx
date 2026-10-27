"use client";

import React, { useState } from "react";
import Link from "next/link";
import PlanAdvisorModal, { PlanModalStage } from "@/components/PlanAdvisorModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const [showOfferBar, setShowOfferBar] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "node" | "python">("curl");
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planModalStage, setPlanModalStage] = useState<PlanModalStage>("TRIAL_VS_BASIC");

  const openPlanModal = (stage: PlanModalStage = "TRIAL_VS_BASIC") => {
    setPlanModalStage(stage);
    setPlanModalOpen(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const codeSnippets = {
    curl: `curl -X POST https://api.digitalbeings.in/v1/messages/send \\
  -H "Authorization: Bearer db_live_sec_789412a8" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "auth_otp_v1",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "body",
          "parameters": [{ "type": "text", "text": "489201" }]
        },
        {
          "type": "button",
          "sub_type": "url",
          "index": "0",
          "parameters": [{ "type": "text", "text": "489201" }]
        }
      ]
    }
  }'`,
    node: `import { DigitalBeingsClient } from "@digitalbeings/sdk";

const client = new DigitalBeingsClient({
  apiKey: process.env.DIGITALBEINGS_API_KEY
});

const response = await client.messages.send({
  to: "+919876543210",
  type: "template",
  template: {
    name: "auth_otp_v1",
    language: "en_US",
    parameters: {
      code: "489201"
    }
  }
});

console.log("OTP Dispatched:", response.messageId);`,
    python: `from digitalbeings import DigitalBeings

client = DigitalBeings(api_key="db_live_sec_789412a8")

response = client.messages.send(
    to="+919876543210",
    type="template",
    template={
        "name": "auth_otp_v1",
        "language": "en_US",
        "parameters": {
            "code": "489201"
        }
    }
)

print(f"OTP Delivered in {response.latency_ms}ms! ID: {response.message_id}")`
  };

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-black overflow-x-clip w-full relative transition-colors duration-200">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {showOfferBar && (
        <div className="bg-slate-900 dark:bg-[#0c1424] text-white text-xs sm:text-sm font-medium py-2.5 px-4 flex items-center justify-between relative z-40 w-full border-b border-slate-800 dark:border-white/10">
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center max-w-7xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              NEW
            </span>
            <span className="text-slate-200">
              Start your 30-Day WhatsApp Platform Trial for just{" "}
              <strong className="text-white font-extrabold underline decoration-emerald-400">
                ₹500 + GST
              </strong>
            </span>
            <button
              onClick={() => openPlanModal("TRIAL_VS_BASIC")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-full text-xs transition cursor-pointer"
            >
              Start 30-Day Trial ➔
            </button>
          </div>
          <button
            onClick={() => setShowOfferBar(false)}
            className="text-slate-400 hover:text-white text-sm ml-2 shrink-0 p-1 cursor-pointer"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. STICKY HEADER (APPLE STUDIO NAVIGATION) */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.08] transition-colors duration-200 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative">
              <img
                src="/icon.png"
                alt="Digital Beings"
                className="w-10 h-10 rounded-xl object-contain shadow-xs shrink-0"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#070b14]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                Digital<span className="text-emerald-600 dark:text-emerald-400">Beings</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                Secure • Connect • Grow
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Link href="#capabilities" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Capabilities
            </Link>
            <Link href="#inbox" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Team Inbox
            </Link>
            <Link href="#broadcast" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Broadcasts
            </Link>
            <Link href="#ecommerce" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              E-Commerce
            </Link>
            <Link href="#developer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Developer API
            </Link>
            <Link href="#pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              Pricing
            </Link>
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-1.5 transition"
            >
              Sign In
            </Link>
            <button
              onClick={() => openPlanModal("TRIAL_VS_BASIC")}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start Trial (₹500)</span>
              <span>➔</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-200"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#070b14] border-b border-slate-200 dark:border-white/10 px-6 py-6 space-y-4">
            <Link
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              Capabilities
            </Link>
            <Link
              href="#inbox"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              Team Inbox
            </Link>
            <Link
              href="#broadcast"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              Broadcasts
            </Link>
            <Link
              href="#ecommerce"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              E-Commerce
            </Link>
            <Link
              href="#developer"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              Developer API
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-slate-800 dark:text-slate-200"
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openPlanModal("TRIAL_VS_BASIC");
                }}
                className="w-full py-3 text-center bg-emerald-600 text-white font-bold rounded-xl"
              >
                Start 30-Day Trial (₹500 + GST)
              </button>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 font-bold border border-slate-300 dark:border-white/20 rounded-xl text-slate-800 dark:text-slate-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          SECTION 1: HERO (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section className="bg-white dark:bg-[#030712] text-slate-900 dark:text-white pt-20 pb-28 md:pt-28 md:pb-36 relative transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Official Meta Cloud API • Enterprise WhatsApp Platform</span>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] max-w-4xl mx-auto mb-6">
            Grow Your Business With the Power of WhatsApp.
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-normal leading-relaxed mb-10">
            Collaborate on a unified 2-Way Live Team Inbox, deploy 24/7 AI auto-reply bots, recover abandoned carts on Shopify, and broadcast official Meta campaigns. Flat plans from ₹1,000 + GST/mo or start a{" "}
            <strong className="font-extrabold text-slate-900 dark:text-white underline decoration-emerald-500">
              30-Day Trial for ₹500 + GST
            </strong>.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={() => openPlanModal("TRIAL_VS_BASIC")}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start 30-Day Trial (₹500 + GST)</span>
              <span>➔</span>
            </button>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-2xl border border-slate-200 dark:border-white/10 transition flex items-center justify-center gap-2"
            >
              <span>Explore Dashboard Demo</span>
              <span>➔</span>
            </Link>
          </div>

          {/* Micro trust indicators */}
          <div className="flex items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 flex-wrap mb-16">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-emerald-600 font-bold">✓</span> 30-Day Full Platform Access (₹500 + GST)
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-emerald-600 font-bold">✓</span> Official Meta Tech Partner
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-emerald-600 font-bold">✓</span> Instant 2-Minute Setup
            </span>
          </div>

          {/* HERO VISUAL SHOWCASE STAGE */}
          <div className="relative max-w-5xl mx-auto">
            {/* Top Metric Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-3.5 shadow-sm border border-slate-200/90 dark:border-white/10 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg font-bold">
                  🛒
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Shopify Recovery
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">+28% Checkouts</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-3.5 shadow-sm border border-slate-200/90 dark:border-white/10 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg font-bold">
                  💬
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Live 2-Way Inbox
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">Meta 24h Care Window</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-3.5 shadow-sm border border-slate-200/90 dark:border-white/10 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg font-bold">
                  ⚡
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    24/7 AI Chatbot
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">&lt;1s Auto-Replies</span>
                </div>
              </div>
            </div>

            {/* Main Stage Frame */}
            <div className="rounded-3xl bg-[#f5f5f7] dark:bg-[#0B101D] p-5 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Left Card: Meta Ads Click to WhatsApp */}
                <div className="bg-white dark:bg-[#070b14] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg font-bold">
                      🌸
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">flora.luxe</span>
                        <span className="text-blue-500 text-xs font-bold">●</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sponsored · Instagram &amp; Facebook
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 h-44 flex items-center justify-center p-4">
                    <div className="text-center space-y-1.5">
                      <span className="text-3xl block">✨ 🧴</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-base block">
                        Luxe Summer Eau De Parfum
                      </span>
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-extrabold uppercase bg-rose-100 dark:bg-rose-500/20 px-3 py-1 rounded-full inline-block">
                        Flat 20% OFF · Code: LUXE20
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Click to chat on WhatsApp
                    </span>
                    <button className="px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 hover:bg-emerald-600 transition">
                      <span>Send Message</span>
                      <span>💬</span>
                    </button>
                  </div>
                </div>

                {/* Right Card: WhatsApp Chat Mockup */}
                <div className="bg-[#0c1412] rounded-2xl p-4 shadow-sm border border-white/10 space-y-3 relative overflow-hidden">
                  <div className="bg-[#075e54] text-white -m-4 p-3.5 mb-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      FL
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs leading-none">Flora Luxe Official ✓</h4>
                      <span className="text-[10px] text-emerald-200">Official Business Account</span>
                    </div>
                  </div>

                  <div className="max-w-[85%] ml-auto bg-[#005c4b] rounded-xl rounded-tr-xs p-3 text-xs text-emerald-50 shadow-xs space-y-1">
                    <div className="text-[10px] text-emerald-200 border-l-2 border-emerald-300 pl-2 mb-1 bg-black/20 p-1 rounded">
                      Ad · Enjoy 20% OFF. Use LUXE20
                    </div>
                    <p>Is this available?</p>
                    <span className="text-[9px] text-emerald-300/70 block text-right">1:14 PM ✓✓</span>
                  </div>

                  <div className="max-w-[88%] mr-auto bg-[#1f2c34] rounded-xl rounded-tl-xs p-3 text-xs text-slate-200 shadow-xs space-y-2 border border-white/5">
                    <p>
                      Hey Nisha! 🌸 The summer drop is live till midnight. Here is your personalized promo link:
                    </p>
                    <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                      <span className="font-mono font-bold text-white">
                        ₹1,425{" "}
                        <span className="line-through text-slate-500 font-normal text-[10px]">₹3,050</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Save 53%
                      </span>
                    </div>
                    <div className="pt-1 flex flex-col gap-1.5">
                      <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold text-[11px] transition">
                        ⚡ Claim Offer &amp; Checkout
                      </button>
                      <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-semibold text-[10px] transition border border-white/10">
                        💬 Speak to Live Agent
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 block text-right">1:14 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: SOCIAL PROOF (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section className="bg-[#f5f5f7] dark:bg-[#080d1a] border-y border-slate-200/80 dark:border-white/[0.08] py-16 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Trusted by Founders &amp; Enterprise Growth Teams
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
            Powering mission-critical WhatsApp communication for 210,000+ businesses across 68+ countries.
          </p>

          {/* Client Logos Grid */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-center justify-center">
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-extrabold text-slate-800 dark:text-slate-200 tracking-wider text-sm flex items-center justify-center">
              clove:) <span className="text-[10px] text-amber-500 ml-1">dental</span>
            </div>
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-extrabold text-blue-600 dark:text-blue-400 tracking-tight text-base flex items-center justify-center">
              digio
            </div>
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide text-sm flex items-center justify-center">
              turtlemint🌱
            </div>
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-black text-sky-600 dark:text-sky-400 tracking-wider text-sm flex items-center justify-center">
              HARMAN
            </div>
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-extrabold text-purple-600 dark:text-purple-400 tracking-tight text-sm flex items-center justify-center">
              EATFIT 🥗
            </div>
            <div className="p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs font-bold text-slate-800 dark:text-slate-200 tracking-wider text-xs flex items-center justify-center">
              BRIGADE 🏢
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: CAPABILITIES BENTO GRID (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section id="capabilities" className="bg-white dark:bg-[#030712] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
              Full Suite Capabilities
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything You Need to Scale on WhatsApp.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
              A single platform replacing fragmented tools, unofficial scrapers, and unlinked phone numbers.
            </p>
          </div>

          {/* Apple Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {/* Bento Card 1: 2-Column Anchor */}
            <div className="lg:col-span-2 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Shared Team Collaboration
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Unified 2-Way Live Team Inbox
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                  Multiple agents resolve customer conversations from one verified business number. Includes automatic ticket assignment, canned response shortcuts, and built-in Meta 24-hour customer care compliance.
                </p>
              </div>

              <div className="bg-white dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-white/10">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Live Team Thread #1042</span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                    Assigned: Aryan G.
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <p className="bg-slate-50 dark:bg-white/[0.04] p-2 rounded-lg">
                    Customer: "Can you confirm if order #4912 has shipped?"
                  </p>
                  <p className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 p-2 rounded-lg border-l-2 border-emerald-500">
                    Agent (Snippet): "Yes Rohan! Your parcel left our warehouse at 11 AM via BlueDart."
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 2: 24/7 AI Chatbot */}
            <div className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Automated Intelligence
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  24/7 AI Chatbots &amp; Flows
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Provide instant responses to product FAQs, return requests, and order lookups with sub-second latency. No per-bot rental charges.
                </p>
              </div>
              <div className="bg-white dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Bot Response Time</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">0.42s</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[94%]"></div>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Abandoned Cart Webhooks */}
            <div className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  E-Commerce Revenue
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Shopify &amp; WooCommerce Recovery
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Automatically trigger dynamic WhatsApp messages when shoppers abandon checkout. Recover up to 28% of dropped carts with 1-click links.
                </p>
              </div>
              <div className="bg-white dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Recovery Rate</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">+28.4%</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg font-bold text-[11px]">
                  Shopify App Ready
                </span>
              </div>
            </div>

            {/* Bento Card 4: Limitless Broadcasts */}
            <div className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Official Marketing
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Limitless Broadcast Marketing
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Upload Excel or CSV contact lists, map variable placeholders, and send promotional campaigns with zero risk of phone number blocking.
                </p>
              </div>
              <div className="bg-white dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Delivery SLA</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">99.8%</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-[11px]">
                  Official Meta Route
                </span>
              </div>
            </div>

            {/* Bento Card 5: High-Speed OTP API */}
            <div className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-8 sm:p-10 border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Developer Engine
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Instant WhatsApp OTP API
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Deliver authentication passcodes and login verification in under 2.4 seconds globally at a flat rate of ₹0.20 + GST per delivered OTP.
                </p>
              </div>
              <div className="bg-white dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Global Latency</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">&lt; 2.4s</span>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-lg font-bold text-[11px]">
                  ₹0.20 + GST / OTP
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: BROADCAST MARKETING (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section id="broadcast" className="bg-[#f5f5f7] dark:bg-[#080d1a] border-y border-slate-200/80 dark:border-white/[0.08] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
                Official Broadcast Studio
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Broadcast Without Fear of Account Bans.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Send rich marketing campaigns directly through the official Meta WhatsApp Cloud API. Say goodbye to illegal scraping tools that get your business numbers banned.
              </p>

              <div className="space-y-5 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0F172A] text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-white/10 shadow-2xs font-bold">
                    📢
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      8+ Interactive Message Categories
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                      Send rich media carousels, discount coupons, clickable CTA buttons, and quick-reply pills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-white/10 shadow-2xs font-bold">
                    📊
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      Excel &amp; CSV Smart Column Mapper
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                      Drag and drop any spreadsheet. Our parser maps name, code, or amount variables automatically with instant live phone preview.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0F172A] text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-white/10 shadow-2xs font-bold">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      Real-Time Webhook Telemetry
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                      Monitor message delivery states (Sent, Delivered, Read, Failed) in real time with automated retry logic.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard/campaigns"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs hover:opacity-90 transition"
                >
                  <span>Explore Campaign Studio</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* Right Card: High-Fidelity Campaign Preview */}
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Summer Festival Campaign #421
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                  Status: Approved
                </span>
              </div>

              <div className="bg-[#efeae2] dark:bg-[#111b21] p-4 rounded-2xl space-y-3">
                <div className="bg-white dark:bg-[#202c33] rounded-xl p-3 shadow-xs space-y-2 max-w-[85%] text-slate-900 dark:text-slate-100 text-xs">
                  <p className="font-semibold">
                    Hey <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rohan</span>! 🎉
                  </p>
                  <p>
                    Your VIP flash offer is now live. Use your personalized code{" "}
                    <span className="font-mono bg-slate-100 dark:bg-black/30 px-1 py-0.5 rounded font-bold">
                      SUMMER50
                    </span>{" "}
                    for flat 50% discount.
                  </p>
                  <div className="pt-1">
                    <button className="w-full py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px]">
                      Claim Discount ➔
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 bg-[#f5f5f7] dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                    Sent
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">12,500</span>
                </div>
                <div className="p-2.5 bg-[#f5f5f7] dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                    Delivered
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">99.8%</span>
                </div>
                <div className="p-2.5 bg-[#f5f5f7] dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                    Read Rate
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">84.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: UNIFIED TEAM INBOX (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section id="inbox" className="bg-white dark:bg-[#030712] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
              Live Team Collaboration
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              One Official Number. Unlimited Agents.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Eliminate physical SIM-card handovers. Empower your customer service, sales, and operations teams to resolve chats collaboratively from any browser.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 3 Pillars */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">👥</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Multi-Agent Seat Delegation
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Route incoming chats to specific team members or departments automatically based on customer intent.
                </p>
              </div>

              <div className="p-5 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⏳</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Meta 24h Care Window Intelligence
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Real-time countdown shows exactly how much time remains to send freeform responses, preventing unexpected template rejections.
                </p>
              </div>

              <div className="p-5 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚡</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    1-Click Canned Snippets
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Reply in seconds using pre-saved snippets for return policies, bank transfers, and order tracking links.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard/inbox"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <span>Explore Live Inbox Demo</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* Right: Modern 3-Pane Team Inbox Mockup */}
            <div className="lg:col-span-7 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Shared Team Inbox • +91 80004 88200
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                  3 Agents Active
                </span>
              </div>

              <div className="grid grid-cols-12 gap-3">
                {/* Conversation List (5 cols) */}
                <div className="col-span-5 bg-white dark:bg-[#070b14] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border-l-4 border-emerald-500 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-slate-900 dark:text-white">Rohan Mehta</span>
                      <span className="text-[9px] text-slate-400">1:18 PM</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate mt-0.5">Where is order #8921?</p>
                    <span className="text-[8px] font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1 py-0.5 rounded inline-block mt-1">
                      OPEN
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-white/[0.04] rounded-xl text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Ananya Gupta</span>
                      <span className="text-[9px] text-slate-400">12:45 PM</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Need size exchange</p>
                    <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded inline-block mt-1">
                      WAITING
                    </span>
                  </div>
                </div>

                {/* Active Chat Thread (7 cols) */}
                <div className="col-span-7 bg-white dark:bg-[#070b14] rounded-2xl p-3 border border-slate-200/80 dark:border-white/10 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/10">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Rohan Mehta</span>
                      <span className="text-[10px] text-slate-400">Order #8921 • Bangalore</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">23h 48m left</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-100 dark:bg-white/[0.06] p-2 rounded-xl max-w-[85%] text-slate-800 dark:text-slate-200">
                      Hi, I placed an order yesterday. When will it arrive?
                    </div>
                    <div className="bg-emerald-600 text-white p-2 rounded-xl max-w-[85%] ml-auto">
                      Hi Rohan! Your package is in transit via BlueDart (AWB: BL8921). Estimated delivery is tomorrow before 5 PM!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 6: E-COMMERCE & CART RECOVERY (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section id="ecommerce" className="bg-[#f5f5f7] dark:bg-[#080d1a] border-y border-slate-200/80 dark:border-white/[0.08] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/25">
              Automated Checkouts
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Turn Lost Carts Into 28% More Revenue.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect your Shopify or WooCommerce store in 2 minutes. When customers abandon their cart, our engine dispatches instant WhatsApp notifications with pre-filled discount checkout buttons.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                STEP 01
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Cart Abandoned
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Shopper leaves their cart on your online store without completing the checkout payment.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                STEP 02
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Automated Message
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Within 15 minutes, an official WhatsApp alert is dispatched with item pictures and exclusive coupon code.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                STEP 03
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                1-Click Checkout
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Shopper taps "Complete Purchase" inside WhatsApp. Cart is reloaded instantly with discount applied.
              </p>
            </div>

            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                STEP 04
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Order Confirmed
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Order confirmation and COD verification messages are automatically triggered with tracking link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 7: META GREEN TICK (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section className="bg-white dark:bg-[#030712] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
                Official Business Account
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Stand Out With the Official Meta Green Tick.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Build instant trust and authority. An Official Business Account (OBA) displays your verified brand name instead of an unknown phone number, even if users haven't saved your contact.
              </p>

              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Displays brand name with verified green badge automatically</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>45% higher open rate and user response engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Free application filing guidance included with Professional Plan</span>
                </div>
              </div>
            </div>

            {/* Before vs After Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 space-y-3 text-center">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                  Without Green Tick
                </span>
                <div className="w-14 h-14 rounded-full bg-slate-300 dark:bg-white/10 mx-auto flex items-center justify-center text-xl text-slate-600">
                  👤
                </div>
                <div>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white block">
                    +91 98765 43210
                  </span>
                  <span className="text-[10px] text-slate-500">Unsaved contact number</span>
                </div>
                <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-[10px] text-red-700 dark:text-red-300 rounded-xl">
                  Low response rate, potential spam reporting
                </div>
              </div>

              <div className="bg-emerald-50/50 dark:bg-[#0c1f19] rounded-3xl p-6 border-2 border-emerald-500 dark:border-emerald-400 space-y-3 text-center">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                  With Official Green Tick
                </span>
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center text-xl font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                    Digital Beings <span className="text-emerald-600 font-bold">✓</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Official Business Account
                  </span>
                </div>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-[10px] text-emerald-900 dark:text-emerald-200 rounded-xl font-medium">
                  Instant trust, zero spam flags, 45% higher CTR
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 8: DEVELOPER API & CODE CONSOLE (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section id="developer" className="bg-[#f5f5f7] dark:bg-[#080d1a] border-y border-slate-200/80 dark:border-white/[0.08] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/25">
              Built for Developers
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              A Modern REST API You'll Love.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Integrate WhatsApp OTP, utility alerts, and automated notifications into your backend stack in minutes.
            </p>
          </div>

          {/* Interactive Code Console */}
          <div className="max-w-5xl mx-auto bg-slate-950 text-slate-200 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="text-xs font-mono text-slate-400 ml-2">POST /v1/messages/send</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                  {(["curl", "node", "python"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveCodeTab(tab)}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${
                        activeCodeTab === tab
                          ? "bg-emerald-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition cursor-pointer"
                >
                  {copiedCode ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-6 overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
              <pre>{codeSnippets[activeCodeTab]}</pre>
            </div>

            {/* Simulated Response */}
            <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Response: 200 OK</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">wamid.HBgMOTE5ODc2NTQzMjEw...</span>
              </div>
              <span className="text-emerald-400 font-bold">Latency: 214ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 9: PROVEN METRICS & SOCIAL PROOF (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section className="bg-white dark:bg-[#030712] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
              Battle-Tested Performance
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Built for High-Throughput Scale.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
              Numbers that speak for our infrastructure stability and delivery reliability.
            </p>
          </div>

          {/* 4 Metric Callout Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-8 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">₹0.20</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                OTP Auth Fuel (+GST)
              </span>
            </div>

            <div className="p-8 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">&lt; 2.4s</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Global OTP Latency
              </span>
            </div>

            <div className="p-8 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">+28%</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Shopify Cart Recovery
              </span>
            </div>

            <div className="p-8 bg-[#f5f5f7] dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400">99.8%</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Official Delivery SLA
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 10: TRANSPARENT PRICING (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section id="pricing" className="bg-[#f5f5f7] dark:bg-[#080d1a] border-y border-slate-200/80 dark:border-white/[0.08] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
              Honest Platform Plans
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Predictable Flat Plans. Wholesale Message Rates.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              No hidden telecom markups, no lock-ins. Flat monthly dashboard subscription + transparent prepaid message fuel wallet.
            </p>
          </div>

          {/* PER-MESSAGE FUEL BAR */}
          <div className="bg-white dark:bg-[#0B101D] rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-2xs max-w-4xl mx-auto">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 text-center">
              Direct Meta Message Fuel Rates (Prepaid Wallet · Instant GST Tax Invoice)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-white/10">
              <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                  Authentication (OTP)
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹0.20 <sub className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">+ GST</sub>{" "}
                  <span className="text-xs font-semibold text-slate-400">/ delivered</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  One-time login passwords, zero-delay Meta priority
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                  Utility Messages
                </span>
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                  ₹0.18 <sub className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase">+ GST</sub>{" "}
                  <span className="text-xs font-semibold text-slate-400">/ delivered</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Order confirmations, payment receipts &amp; shipping alerts
                </p>
              </div>
              <div className="pt-2 sm:pt-0 sm:px-4 space-y-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                  Marketing Broadcasts
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹1.15 <sub className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">+ GST</sub>{" "}
                  <span className="text-xs font-semibold text-slate-400">/ delivered</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Promotional campaigns, product launches &amp; offers
                </p>
              </div>
            </div>
          </div>

          {/* 4 PRICING TIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
            {/* Tier 1: Starter Trial */}
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-7 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Starter Trial
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    One-Time Only
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₹500</span>
                  <sub className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">+ GST</sub>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ 30 days</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 text-[11px] font-bold">
                  ⚡ 30 Days Full Platform Access
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  1 Owner account for 30 days. Perfect for developers &amp; testing OTP API integration.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="text-emerald-600">✓</span> 1 User (Owner profile)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP API Setup
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Utility &amp; Order Messages
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Campaign Studio &amp; Templates
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> REST API &amp; Webhooks
                  </div>
                </div>
              </div>
              <button
                onClick={() => openPlanModal("TRIAL_VS_BASIC")}
                className="w-full text-center py-3 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition block cursor-pointer"
              >
                Start 30-Day Trial (₹500 + GST)
              </button>
            </div>

            {/* Tier 2: Basic Business */}
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-7 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Basic Plan
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    Growth
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₹1,000</span>
                  <sub className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">+ GST</sub>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  🎁 Includes ₹50 Free Wallet Balance
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  For growing businesses needing WhatsApp OTP, utility receipts, and team inbox collaboration.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="text-emerald-600">✓</span> 1 Owner + 3 Support Seats (4 total)
                  </div>
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="text-emerald-600 font-bold">✓</span> ₹50 Starter Fuel Included (~250 OTPs)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP API Integration
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Shared Team Inbox &amp; Routing
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Template Approval Dashboard
                  </div>
                </div>
              </div>
              <button
                onClick={() => openPlanModal("BASIC_VS_PRO")}
                className="w-full text-center py-3 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition block cursor-pointer"
              >
                Get Basic Plan (₹1,000 + GST) ➔
              </button>
            </div>

            {/* Tier 3: Professional (Most Popular) */}
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-7 border-2 border-emerald-500 dark:border-emerald-400 shadow-md flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3 right-6 bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Professional
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    Scaling
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">₹2,500</span>
                  <sub className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">+ GST</sub>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                  🎁 Includes ₹100 Free Wallet Balance
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  For brands scaling e-commerce automations, AI support assistants, and intelligent funnel logic.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="text-emerald-600">✓</span> 1 Owner + 5 Support Seats (6 total)
                  </div>
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="text-emerald-600 font-bold">✓</span> ₹100 Starter Fuel Included (~500 OTPs)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Shopify &amp; WooCommerce API
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 24/7 AI Assistant &amp; Smart Auto-Replies
                  </div>
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="text-emerald-600 font-bold">✓</span> Meta Green Tick (OBA) Filing Support
                  </div>
                </div>
              </div>
              <button
                onClick={() => openPlanModal("PRO_VS_CUSTOM")}
                className="w-full text-center py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition block cursor-pointer"
              >
                Upgrade to Professional ➔
              </button>
            </div>

            {/* Tier 4: Enterprise Custom */}
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-7 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Enterprise
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    Custom
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">Custom</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  For high-throughput enterprises, banking, large e-commerce &amp; omnichannel contact centers.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <span className="text-emerald-600">✓</span> Unlimited Seats &amp; Custom Roles
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 50+ Messages / Sec Throttle Speed
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Custom CRM &amp; ERP Direct Integrations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 99.99% Uptime SLA Guarantee
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 24/7 Dedicated Account Manager
                  </div>
                </div>
              </div>
              <button
                onClick={() => openPlanModal("ENTERPRISE")}
                className="w-full text-center py-3 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-xs text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition block cursor-pointer"
              >
                Enquire Enterprise ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 11: FAQS (CANVAS A: PURE WHITE)
          ======================================================== */}
      <section className="bg-white dark:bg-[#030712] py-24 sm:py-32 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/25">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Everything you need to know about our WhatsApp Cloud Platform.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I need a new phone number to connect to Meta WhatsApp Cloud API?",
                a: "You can use an existing phone number or register a fresh one. If using an existing number, it must be disconnected from the standard WhatsApp/WhatsApp Business mobile app so Meta can bind it directly to the official Cloud API."
              },
              {
                q: "Can I use one single phone number for OTPs, Marketing, and Utility?",
                a: "Yes! Our platform supports multi-service assignment. You can assign OTP, Marketing & Promo, and Order Update Utility all to one single registered number, or divide them across distinct numbers using our Numbers & Routing studio."
              },
              {
                q: "How does the Excel Audience column auto-mapping work?",
                a: "When you drag and drop any .xlsx, .xls, or .csv spreadsheet, our client-side parser automatically detects contact numbers and recipient names. You can then map any template variable like {{1}}, {{2}} to any column in your spreadsheet with real-time row-by-row live phone preview."
              },
              {
                q: "Are broadcast messages officially approved and risk-free?",
                a: "Yes. All message templates are submitted and approved directly by Meta through our built-in Template Studio. Broadcasting via official Meta Cloud APIs ensures your phone numbers never get banned, unlike unofficial scraping tools."
              },
              {
                q: "How fast are OTP codes delivered?",
                a: "Our OTP engine dispatches through official Meta priority routes with average delivery latency under 2.4 seconds globally."
              },
              {
                q: "How does the 30-day trial work?",
                a: "For just ₹500 + GST, you get complete 30-day platform access for 1 user (owner account). This includes official WhatsApp OTP API setup, order & utility updates, template approval dashboard, and campaign broadcast studio. After 30 days, you can choose to continue with our Basic (₹1,000 + GST/mo) or Professional (₹2,500 + GST/mo) plan."
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#f5f5f7] dark:bg-[#0B101D] rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-2xs"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-lg shrink-0 ml-4">
                    {openFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-white/10 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 12: PRE-FOOTER CTA STAGE (CANVAS B: APPLE NEUTRAL)
          ======================================================== */}
      <section className="bg-[#f5f5f7] dark:bg-[#080d1a] border-t border-slate-200/80 dark:border-white/[0.08] py-20 sm:py-28 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-950 dark:bg-[#0B101D] text-white p-10 sm:p-16 border border-slate-800 dark:border-white/10 shadow-xl text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to 5X Your Revenue With WhatsApp?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Join 210,000+ businesses automating broadcasts, OTPs, and customer support with official Meta Cloud APIs.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openPlanModal("TRIAL_VS_BASIC")}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start 30-Day Trial (₹500 + GST)</span>
                <span>➔</span>
              </button>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl border border-white/20 transition"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 13: GLOBAL FOOTER (CANVAS A: PURE WHITE)
          ======================================================== */}
      <footer className="bg-white dark:bg-[#030712] border-t border-slate-200/80 dark:border-white/[0.08] py-16 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/icon.png"
                  alt="Digital Beings"
                  className="w-9 h-9 rounded-xl object-contain shadow-xs shrink-0"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#030712]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                  Digital<span className="text-emerald-600 dark:text-emerald-400">Beings</span>
                </span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Secure • Connect • Grow
                </span>
              </div>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              Official Meta Tech Partner powering broadcast marketing, customer support, and instant OTP authentication over WhatsApp Cloud API.
            </p>
            <div className="pt-1 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Meta Cloud API Systems Operational (99.98% Uptime)
            </div>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Product</h5>
            <ul className="space-y-2">
              <li><Link href="#broadcast" className="hover:text-emerald-600 dark:hover:text-white transition">Broadcast Campaigns</Link></li>
              <li><Link href="#developer" className="hover:text-emerald-600 dark:hover:text-white transition">WhatsApp OTP API</Link></li>
              <li><Link href="#capabilities" className="hover:text-emerald-600 dark:hover:text-white transition">Click to WhatsApp Ads</Link></li>
              <li><Link href="#inbox" className="hover:text-emerald-600 dark:hover:text-white transition">Shared Team Inbox</Link></li>
              <li><Link href="#ecommerce" className="hover:text-emerald-600 dark:hover:text-white transition">E-Commerce Recovery</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Resources</h5>
            <ul className="space-y-2">
              <li><Link href="/dashboard/setup" className="hover:text-emerald-600 dark:hover:text-white transition">Meta Setup Guide</Link></li>
              <li><Link href="/dashboard/templates" className="hover:text-emerald-600 dark:hover:text-white transition">Template Studio</Link></li>
              <li><Link href="/dashboard/campaigns" className="hover:text-emerald-600 dark:hover:text-white transition">Campaign Manager</Link></li>
              <li><Link href="/dashboard/numbers" className="hover:text-emerald-600 dark:hover:text-white transition">Numbers &amp; Routing</Link></li>
              <li><Link href="/dashboard/wallet" className="hover:text-emerald-600 dark:hover:text-white transition">Pricing &amp; Fuel Wallet</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Legal &amp; Trust</h5>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-emerald-600 dark:hover:text-white transition">Terms of Service</Link></li>
              <li><span className="text-slate-400 dark:text-slate-500">SOC-2 Type II Certified</span></li>
              <li><span className="text-slate-400 dark:text-slate-500">GDPR Compliant</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 mt-10 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© 2026 Digital Beings (Aeron Digital Solutions). All rights reserved. Meta and WhatsApp are registered trademarks of Meta Platforms, Inc.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-300 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-800 dark:hover:text-slate-300 transition">Terms</Link>
            <Link href="/login" className="hover:text-slate-800 dark:hover:text-slate-300 transition">Portal Login</Link>
          </div>
        </div>
      </footer>

      {/* 14. FLOATING WHATSAPP CHAT BUTTON (NO JITTER / NO PING ANIMATION) */}
      <a
        href="https://wa.me/?text=Hello%20I%20want%20to%20learn%20more%20about%20WhatsApp%20Cloud%20SaaS"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full flex items-center justify-center shadow-lg transition-transform cursor-pointer"
        aria-label="Chat on WhatsApp"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
      </a>

      {/* 15. INTERACTIVE PLAN ADVISOR & COMPARISON MODAL */}
      <PlanAdvisorModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        initialStage={planModalStage}
      />
    </div>
  );
}
