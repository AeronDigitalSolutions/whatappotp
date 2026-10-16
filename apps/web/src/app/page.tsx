"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [showOfferBar, setShowOfferBar] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "node" | "python">("curl");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP ANNOUNCEMENT BANNER (MATCHING ALL SCREENSHOTS) */}
      {showOfferBar && (
        <div className="bg-[#00c853] text-white text-xs sm:text-sm font-semibold py-2.5 px-4 sticky top-0 z-50 shadow-xs flex items-center justify-between transition-all">
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center">
            <span>Get ₹3050 worth for just ₹1425 with Exclusive Launch Offer 🎉</span>
            <Link
              href="/signup"
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-3 py-1 rounded-full text-xs shadow-xs transition"
            >
              Check Offer Now ➔
            </Link>
          </div>
          <button
            onClick={() => setShowOfferBar(false)}
            className="text-white/80 hover:text-white text-base ml-2 shrink-0 p-1"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. NAVIGATION BAR (MATCHING AISENSY NAVBAR) */}
      <header className="sticky top-[39px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-150 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#25D366] flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight text-slate-900 leading-none">
                OTP<span className="text-emerald-500">SaaS</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                WhatsApp Cloud Suite
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <Link href="#pricing" className="hover:text-emerald-600 transition">
              Pricing
            </Link>
            <Link href="#features" className="hover:text-emerald-600 transition flex items-center gap-1">
              Product <span className="text-xs text-slate-400">▾</span>
            </Link>
            <Link href="#advanced-features" className="hover:text-emerald-600 transition flex items-center gap-1">
              Features <span className="text-xs text-slate-400">▾</span>
            </Link>
            <Link href="#solutions" className="hover:text-emerald-600 transition flex items-center gap-1">
              Industries <span className="text-xs text-slate-400">▾</span>
            </Link>
            <Link href="#testimonials" className="hover:text-emerald-600 transition flex items-center gap-1">
              Resources <span className="text-xs text-slate-400">▾</span>
            </Link>
            <Link href="#developer" className="hover:text-emerald-600 transition flex items-center gap-1">
              Integrations <span className="text-xs text-slate-400">▾</span>
            </Link>
            <Link href="/dashboard" className="hover:text-emerald-600 transition">
              Partner
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer text-xs font-bold uppercase">
              <span>🌐</span> Eng ▾
            </div>
          </nav>

          {/* Right Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-2.5 text-sm font-extrabold text-white bg-[#00c853] hover:bg-[#00b248] rounded-xl shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 transition flex items-center gap-1.5"
            >
              <span>Start for FREE</span>
              <span>➔</span>
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold text-slate-900 hover:text-emerald-600 border border-slate-300 hover:border-slate-400 rounded-xl transition shadow-2xs flex items-center gap-1"
            >
              <span>Login</span>
              <span>➔</span>
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-6 py-4 space-y-3">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-bold text-slate-700">
              Product &amp; Features
            </Link>
            <Link href="#broadcast" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-bold text-slate-700">
              Broadcast Campaigns
            </Link>
            <Link href="#advanced-features" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-bold text-slate-700">
              Advanced Conversion Features
            </Link>
            <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-bold text-slate-700">
              Testimonials &amp; Reviews
            </Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-bold text-slate-700">
              Pricing Plans
            </Link>
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/signup" className="w-full text-center py-2.5 font-bold bg-[#00c853] text-white rounded-xl shadow-xs">
                Start for FREE ➔
              </Link>
              <Link href="/login" className="w-full text-center py-2.5 font-bold border border-slate-300 rounded-xl">
                Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION (IMAGE 1 & 2 STYLE) */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32 bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-emerald-300/20 to-purple-300/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs sm:text-sm font-bold shadow-2xs mb-8">
            <span>✨</span>
            <span>AI-Powered WhatsApp Marketing Platform</span>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            <span className="text-[#00c853] block">5X Your Revenue</span>
            with the Power of WhatsApp
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 leading-relaxed font-normal mb-10">
            Broadcast, Automate, Engage, Sell - do everything with the AI-powered WhatsApp Marketing &amp; Engagement Platform. Powered by Official WhatsApp APIs ⚡
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 text-base font-extrabold text-white bg-[#00c853] hover:bg-[#00b248] rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition flex items-center justify-center gap-2"
            >
              <span>Start 14-Day FREE Trial</span>
              <span>➔</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 text-base font-extrabold text-slate-900 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-xl shadow-xs hover:-translate-y-0.5 transition flex items-center justify-center gap-2"
            >
              <span>Join Live Demo</span>
              <span>➔</span>
            </Link>
          </div>

          {/* Micro trust indicators */}
          <div className="flex items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-slate-500 flex-wrap mb-16">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="text-emerald-500">✓</span> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="text-emerald-500">✓</span> Official Meta Tech Partner
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="text-emerald-500">✓</span> Instant 2-Minute Setup
            </span>
          </div>

          {/* 4. HERO VISUAL SHOWCASE STAGE (IMAGE 1 & 2 MOCKUPS) */}
          <div className="relative max-w-5xl mx-auto pt-6">
            {/* Floating Metric Badges */}
            <div className="absolute -top-4 left-4 sm:left-12 z-20 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-black">
                $
              </div>
              <div className="text-left">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">ROI Health</span>
                <span className="text-lg font-black text-slate-900 leading-none">10X ROAS</span>
              </div>
            </div>

            <div className="absolute top-8 right-4 sm:right-16 z-20 bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                ✓✓
              </div>
              <div className="text-left">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Meta Inbox</span>
                <span className="text-lg font-black text-slate-900 leading-none">92% Read Rate</span>
              </div>
            </div>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white rounded-full px-6 py-3 shadow-2xl border border-slate-100 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-wide">Order Placed &amp; Dispatched</span>
            </div>

            {/* Main Mockup Graphic Wrapper */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-50/80 to-slate-100/60 p-4 sm:p-8 border border-slate-200/80 shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Left Card: Click to WhatsApp Ad Card */}
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 text-left space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center text-lg">
                      🌸
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">flora.luxe</span>
                        <span className="text-blue-500 text-xs font-bold">●</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Sponsored · Instagram &amp; Facebook</span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-gradient-to-tr from-pink-100 via-rose-50 to-amber-50 h-44 flex items-center justify-center relative p-4">
                    <div className="text-center space-y-1">
                      <span className="text-3xl block">✨ 🧴</span>
                      <span className="font-black text-slate-800 text-base block">Luxe Summer Eau De Parfum</span>
                      <span className="text-xs text-rose-600 font-extrabold uppercase bg-white/80 px-3 py-1 rounded-full inline-block">
                        Flat 20% OFF · Code: LUXE20
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 font-medium">Click to chat on WhatsApp</span>
                    <button className="px-4 py-2 bg-[#25D366] text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 hover:bg-emerald-600 transition">
                      <span>Send Message</span>
                      <span>💬</span>
                    </button>
                  </div>
                </div>

                {/* Right Card: Real WhatsApp Chat Mockup */}
                <div className="bg-[#efeae2] rounded-2xl p-4 shadow-lg border border-slate-300/80 text-left space-y-3 relative overflow-hidden">
                  <div className="bg-[#075e54] text-white -m-4 p-3.5 mb-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      FL
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs leading-none">Flora Luxe Official ✓</h4>
                      <span className="text-[10px] text-emerald-200">Official Business Account</span>
                    </div>
                  </div>

                  <div className="max-w-[85%] ml-auto bg-[#dcf8c6] rounded-xl rounded-tr-xs p-3 text-xs text-slate-800 shadow-2xs space-y-1">
                    <div className="text-[10px] text-slate-500 border-l-2 border-emerald-500 pl-2 mb-1 bg-white/40 p-1 rounded">
                      Ad · Enjoy 20% OFF. Use LUXE20
                    </div>
                    <p>Is this available?</p>
                    <span className="text-[9px] text-slate-400 block text-right">1:14 PM ✓✓</span>
                  </div>

                  <div className="max-w-[88%] mr-auto bg-white rounded-xl rounded-tl-xs p-3 text-xs text-slate-800 shadow-2xs space-y-2">
                    <p>
                      Hey Nisha! 🌸 The summer drop is live till midnight. Here is your personalized promo link:
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">₹1,425 <span className="line-through text-slate-400 font-normal text-[10px]">₹3,050</span></span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Save 53%</span>
                    </div>
                    <div className="pt-1 flex flex-col gap-1.5">
                      <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition">
                        ⚡ Claim Offer &amp; Checkout
                      </button>
                      <button className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[10px] transition">
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

      {/* 5. SOCIAL PROOF / CLIENT TRUST BANNER (IMAGE 2) */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Founders &amp; Marketers Love us
          </h3>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Trusted by 210,000+ Businesses across 68+ Countries
          </p>

          {/* Client Logos Grid */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 items-center justify-center opacity-75 grayscale hover:grayscale-0 transition-all">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-black text-slate-700 tracking-wider text-sm flex items-center justify-center">
              clove:) <span className="text-[10px] text-amber-600 ml-1">dental</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-extrabold text-blue-600 tracking-tight text-base flex items-center justify-center">
              digio
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-bold text-emerald-700 tracking-wide text-sm flex items-center justify-center">
              turtlemint🌱
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-black text-sky-800 tracking-wider text-sm flex items-center justify-center">
              HARMAN
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-extrabold text-purple-600 tracking-tight text-sm flex items-center justify-center">
              EATFIT 🥗
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs font-bold text-slate-900 tracking-wider text-xs flex items-center justify-center">
              BRIGADE 🏢
            </div>
          </div>
        </div>
      </section>

      {/* 6. FEATURE SPOTLIGHT 1: BROADCAST MARKETING (IMAGE 3) */}
      <section id="broadcast" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Text */}
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Broadcast Marketing Messages on WhatsApp (Officially)
            </h2>
            <p className="text-lg text-slate-600">
              Enjoy a Limitless Broadcasting experience on WhatsApp
            </p>

            <div className="space-y-5 pt-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0 border border-rose-100">
                  📢
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">8+ Powerful Messaging Categories</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Send Promotions, Offers, Coupon codes, Carousels and More- Risk-Free!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center text-xl shrink-0 border border-pink-100">
                  💌
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">Add CTAs. Drive 3x Conversions</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Turn conversations into conversions with eye-catching CTA and Quick Reply buttons
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 border border-blue-100">
                  💬
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">Schedule your WhatsApp messages</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Streamline your work, Schedule Broadcasts 2 months ahead of time
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#00c853] hover:bg-[#00b248] text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-500/25 transition"
              >
                <span>Start for FREE</span>
                <span>➔</span>
              </Link>
            </div>
          </div>

          {/* Right Phone Visual Mockup (Image 3 Style) */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-3xl transform rotate-2 -z-10" />

            <div className="w-full max-w-sm bg-slate-900 rounded-[45px] p-4 shadow-2xl border-4 border-slate-800">
              <div className="w-28 h-5 bg-black rounded-full mx-auto mb-4" />

              <div className="bg-[#efeae2] rounded-[32px] p-4 space-y-4 min-h-[460px] flex flex-col justify-between">
                <div className="bg-[#075e54] text-white -m-4 p-4 rounded-t-[32px] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                    🎧
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs">Headway Inc. ✓</h5>
                    <span className="text-[10px] text-emerald-200">Verified WhatsApp Business</span>
                  </div>
                </div>

                <div className="space-y-3 pt-6">
                  <div className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-2xs space-y-2.5">
                    <div className="rounded-xl bg-slate-100 h-28 flex items-center justify-center text-4xl">
                      🎧
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      Your Order <strong className="text-slate-900">Rockway 450 Headphones</strong> will be delivered by <strong>21st January, Tuesday</strong>.
                    </p>
                    <span className="text-[9px] text-slate-400 block text-right">3:35 PM</span>
                  </div>

                  <div className="bg-[#dcf8c6] rounded-xl rounded-tr-xs p-2.5 max-w-[70%] ml-auto text-xs text-slate-900 shadow-2xs">
                    <p>Thank You! 🙏</p>
                    <span className="text-[9px] text-slate-400 block text-right">3:36 PM ✓✓</span>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-slate-200 text-center text-[11px] font-bold text-emerald-800">
                  ⚡ 99.8% Official Delivery
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FEATURES GRID (IMAGES 4 & 5 STYLE) */}
      <section id="features" className="py-24 bg-slate-50/60 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Packed with Powerful WhatsApp Marketing Features
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Launches latest WhatsApp API and AI Features at Blazing fast speed ⚡
            </p>
          </div>

          {/* FEATURE 1: RUN AI POWERED ADS (IMAGE 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="space-y-5">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Run AI powered Ads that Click to WhatsApp
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">
                Run Ads on Facebook &amp; Instagram that land on WhatsApp. 5X Your lead generations &amp; 2-3X Conversions Instantly!
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Run Ads from our platform, get quality leads with AI &amp; conversions API, smartly segregate your leads and build Chatbot Flows to automate everything!
              </p>
              <div className="pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#00c853] hover:bg-[#00b248] text-white font-bold text-sm rounded-xl shadow-xs transition"
                >
                  <span>Explore</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  🎓
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-900 text-sm block">Hind University ✓</span>
                  <span className="text-[11px] text-slate-400">Sponsored Ad · MBA, MS, MTech Programs</span>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full">
                  Send Message
                </span>
              </div>

              <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="bg-white p-3 rounded-lg shadow-2xs space-y-2">
                  <p>Hi Diksha 👋 Fill this form to proceed</p>
                  <button className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs">
                    Fill Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 2: BUILD WHATSAPP FORMS (IMAGE 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="order-2 lg:order-1 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex justify-center">
              <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-md border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-bold text-slate-900 text-xs">Get early access to our Black Friday deals</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded">Form</span>
                </div>
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Let us know which category you're interested in?</span>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-slate-700">
                    <input type="checkbox" defaultChecked className="accent-emerald-600" />
                    <span>Mobile phones</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-slate-700">
                    <input type="checkbox" defaultChecked className="accent-emerald-600" />
                    <span>Televisions</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-slate-700">
                    <input type="checkbox" className="accent-emerald-600" />
                    <span>Home audio</span>
                  </label>
                </div>
                <button className="w-full py-2.5 bg-[#00c853] text-white font-bold text-xs rounded-xl shadow-xs">
                  Continue ➔
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-5">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Build WhatsApp Forms
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">
                Capture Leads &amp; collect useful information <strong>Directly in WhatsApp Chats</strong> with WhatsApp Forms.
              </p>
              <p className="text-slate-500 text-sm leading-relaxed">
                From feedback to gathering user insights, collect it all on WhatsApp.
              </p>
              <div className="pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#00c853] hover:bg-[#00b248] text-white font-bold text-sm rounded-xl shadow-xs transition"
                >
                  <span>Explore</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>
          </div>

          {/* FEATURE 3: COLLECT PAYMENTS ON WHATSAPP (IMAGE 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="space-y-5">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Collect Payments on WhatsApp
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">
                Collect Payments now on WhatsApp seamlessly with WhatsApp Pay and other modes of payment (Razorpay, Payu etc) and grow your revenue.
              </p>
              <div className="pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#00c853] hover:bg-[#00b248] text-white font-bold text-sm rounded-xl shadow-xs transition"
                >
                  <span>Explore</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
              <div className="bg-[#efeae2] p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-700">Sounds great! Let me create an order</span>
                    <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded">✓✓</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
                      🎧
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-900 text-sm">Rockway 450</h6>
                      <span className="text-xs text-slate-500">Quantity 1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600">Total</span>
                    <span className="text-lg font-black text-slate-900">₹890.00</span>
                  </div>
                  <button className="w-full py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg">
                    View Details
                  </button>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-2xs flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">₹890.00</span>
                  <span className="text-emerald-600 font-semibold text-[10px]">Sent to You · Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NEW: ADVANCED FEATURES THAT DRIVE CONVERSIONS (USER UPLOADED IMAGE 1 & 2) */}
      <section id="advanced-features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Advanced Features that Drive Conversions
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            3X Your revenues using our WhatsApp Marketing &amp; Automation Platform
          </p>
        </div>

        {/* 2x2 Grid of High-Performance Conversion Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CARD 1: Multiple Human Live Chat (Image 1 Left) */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900">
                Multiple Human Live Chat
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Have multiple team members to drive Live Chat Support on the Same WhatsApp Business Number.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Filter Chats according to tags, campaigns and attributes for Smart Agent Chat Routing.
              </p>
            </div>

            {/* Live Chat Mockup Frame */}
            <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 overflow-hidden">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-slate-900">Arvind Bajaj · Active</span>
                  </div>
                  <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">
                    Republic_Day_Sale
                  </span>
                </div>
                <div className="flex gap-3 text-[11px]">
                  <div className="w-1/3 border-r border-slate-100 pr-2 space-y-1 text-slate-500">
                    <div className="font-bold text-slate-800">Team Inbox</div>
                    <div className="bg-emerald-50 text-emerald-800 p-1 rounded text-[10px] font-semibold">● Dr. Hussain</div>
                    <div className="p-1 text-[10px]">● Manisha</div>
                    <div className="p-1 text-[10px]">● Yash Batra</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-[#efeae2] p-2 rounded-lg text-[10px] text-slate-800">
                      Hi, kindly complete payment to confirm your order.
                    </div>
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between font-bold text-xs text-emerald-900">
                      <span>Headway 225 Earphones</span>
                      <span>₹1,500.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Real-Time Analytics (Image 1 Right) */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900">
                Real-Time Analytics
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track your campaign results in real-time.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Monitor Read, Replied &amp; Clicked rates for each campaign and retarget smartly for higher conversions!
              </p>
            </div>

            {/* Real-time Analytics Mockup Frame */}
            <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100 overflow-hidden space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">← REPUBLIC DAY SALE</span>
                  <span className="text-[10px] text-slate-400">Sent on 23rd January</span>
                </div>
                {/* Funnel chips */}
                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="font-black block text-slate-900">100%</span>
                    <span className="text-[8px] text-slate-400">Overview</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="font-black block text-emerald-600">97%</span>
                    <span className="text-[8px] text-slate-400">Delivered</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="font-black block text-blue-600">93%</span>
                    <span className="text-[8px] text-slate-400">Read</span>
                  </div>
                  <div className="p-1.5 bg-purple-50 rounded border border-purple-200">
                    <span className="font-black block text-purple-700">45%</span>
                    <span className="text-[8px] text-purple-600">Clicked</span>
                  </div>
                </div>
                {/* Wave Area Graph */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                    <span>Audience (per day)</span>
                    <span className="text-purple-600 bg-purple-100 px-1.5 rounded">CLICKED PEAK</span>
                  </div>
                  <div className="h-16 w-full bg-gradient-to-t from-purple-100/60 via-purple-50/40 to-transparent rounded-lg flex items-end justify-between px-2 pb-1 border-b border-purple-200">
                    <span className="text-[9px] text-slate-400">23 Jan</span>
                    <div className="w-8 h-10 bg-purple-500/40 rounded-t" />
                    <div className="w-8 h-14 bg-purple-600 rounded-t" />
                    <div className="w-8 h-8 bg-purple-400/40 rounded-t" />
                    <span className="text-[9px] text-slate-400">31 Jan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Build no-code Chatbot in minutes (Image 2 Left) */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900">
                Build no-code Chatbot in minutes
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Build your Own Chatbot Flows your Way! Easy-to-use Chatbot &amp; Catalog Flow builder to build your conversational journeys
              </p>
            </div>

            {/* Chatbot flow builder canvas mockup */}
            <div className="bg-sky-50/60 rounded-2xl p-4 border border-sky-100 overflow-hidden">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-900">Visual Flow Studio ➔ Urban Studioz</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">Live</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1 w-24">
                    <span className="text-[9px] font-bold text-emerald-600 block">Flow Start</span>
                    <span className="text-[10px] text-slate-700">Keyword: "Help"</span>
                  </div>
                  <span className="text-slate-300">⇢</span>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1 flex-1">
                    <span className="text-[9px] font-bold text-emerald-800 block">Media + Buttons</span>
                    <span className="text-[10px] text-emerald-900 font-semibold">[📦 Track Order] [💬 Agent]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: Import & Broadcast Instantly (Image 2 Right) */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900">
                Import &amp; Broadcast Instantly
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Simply Import all your Contacts and Broadcast approved messages Instantly.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                See real-time analytics on the platform for delivered, read rates and more
              </p>
            </div>

            {/* Contacts Table mockup */}
            <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-100 overflow-hidden">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Contacts Manager</span>
                  <div className="flex gap-1.5">
                    <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-1 rounded">Import Excel ▾</span>
                    <span className="bg-[#00c853] text-white text-[9px] font-bold px-2.5 py-1 rounded">Broadcast ➔</span>
                  </div>
                </div>
                <div className="border border-slate-100 rounded-lg overflow-hidden text-[10px]">
                  <div className="bg-slate-50 p-1.5 font-bold text-slate-600 grid grid-cols-3">
                    <span>Name</span>
                    <span>Mobile</span>
                    <span>Tag</span>
                  </div>
                  <div className="p-1.5 border-t border-slate-100 grid grid-cols-3 text-slate-700">
                    <span>Aryan Gautam</span>
                    <span>+91 98765...</span>
                    <span className="text-emerald-600 font-bold">VVIP Lead</span>
                  </div>
                  <div className="p-1.5 border-t border-slate-100 grid grid-cols-3 text-slate-700">
                    <span>Nisha Sharma</span>
                    <span>+91 94120...</span>
                    <span className="text-purple-600 font-bold">Cart Dropped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRUST CHECKLIST STRIP (IMAGE 2 BOTTOM) */}
        <div className="pt-6 pb-2 border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-extrabold text-slate-700">
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="text-emerald-500">✓</span> Free Onboarding
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="text-emerald-500">✓</span> Zero Setup fee
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="text-emerald-500">✓</span> Free Website Widget
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="text-emerald-500">✓</span> Free QR &amp; Link
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="text-emerald-500">✓</span> Free Green Tick Verification
          </span>
        </div>
      </section>

      {/* 9. NEW: #1 WHATSAPP MARKETING PLATFORM (USER UPLOADED IMAGE 3) */}
      <section id="testimonials" className="py-24 bg-gradient-to-b from-slate-50 to-white border-t border-slate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              #1 WhatsApp Marketing &amp; Engagement Platform for startups &amp; growing businesses
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Recognized and loved by over 210,000+ businesses worldwide
            </p>
          </div>

          {/* G2 Badges Ribbon / Carousel Representation (Image 3) */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 opacity-90">
            {[
              "User Love Us",
              "High Performer",
              "High Performer Asia",
              "High Performer India",
              "High Performer Small Business",
              "Momentum Leader",
              "High Performer Asia Pacific"
            ].map((badge, bIdx) => (
              <div
                key={bIdx}
                className="bg-white border-2 border-red-500/20 rounded-xl px-3 py-2 text-center shadow-xs flex flex-col items-center justify-center min-w-[110px]"
              >
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block">SPRING 2026</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5 leading-tight">{badge}</span>
                <span className="text-[10px] text-amber-500 font-bold">★★★★★</span>
              </div>
            ))}
          </div>

          {/* 3 Real Testimonial Cards (Image 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            {/* Card 1: Priyal Ostwal */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between hover:-translate-y-1 transition">
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-300 mx-auto flex items-center justify-center text-3xl font-bold text-emerald-800 shadow-sm">
                  👩‍💼
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">Priyal Ostwal</h4>
                  <p className="text-xs text-slate-500 font-semibold">Marketing Manager, PhysicsWallah</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Our team has experienced exceptional professionalism, reliability and a true commitment to customer satisfaction. Delivery rates on campaigns have consistently exceeded 97%."
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-center text-[11px] font-bold text-emerald-600">
                ✓ Verified Customer Review
              </div>
            </div>

            {/* Card 2: Akash Jain */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between hover:-translate-y-1 transition">
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-full bg-orange-100 border-4 border-orange-300 mx-auto flex items-center justify-center text-3xl font-bold text-orange-800 shadow-sm">
                  👨‍💼
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">Akash Jain</h4>
                  <p className="text-xs text-slate-500 font-semibold">Business Executive, Cosco</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Helped us increase our customer engagement significantly. Our customer engagement increased from <strong className="text-emerald-600">35% to 90%</strong> with the Smart Retargeting feature."
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-center text-[11px] font-bold text-orange-600">
                ✓ Verified Customer Review
              </div>
            </div>

            {/* Card 3: Achina Mayya */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between hover:-translate-y-1 transition">
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-full bg-purple-100 border-4 border-purple-300 mx-auto flex items-center justify-center text-3xl font-bold text-purple-800 shadow-sm">
                  👩‍💻
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-slate-900">Achina Mayya</h4>
                  <p className="text-xs text-slate-500 font-semibold">Founder &amp; CEO, AevyTV</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Has been pivotal for us. The personalised interactions and instant responses greatly improved our engagement rates, and more importantly our sales!"
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-center text-[11px] font-bold text-purple-600">
                ✓ Verified Customer Review
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. NEW: START WHATSAPP MARKETING IN 10 MINUTES (USER UPLOADED IMAGE 4) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 rounded-[36px] border border-slate-200/90 shadow-xl p-8 sm:p-14 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Start WhatsApp Marketing in 10 Minutes
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Our Platform is powered by Official Whatsapp Business APIs and is in alignment with all Whatsapp Rules.
              </p>

              <div className="space-y-5 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0">
                    🛡️
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Official Green Tick Verification</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Get Verified Green Tick on your Whatsapp. Broadcast Unlimited Notifications everyday.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">
                    💬
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Dedicated Live Chat Support</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Priority Chat Support by our team over WhatsApp, Phone, Live Chat &amp; Email.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Blazing Fast Feature launches</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      We're constantly adding new WhatsApp features, so you can always offer the best experience to your customers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#00c853] hover:bg-[#00b248] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition"
                >
                  <span>Start Now for FREE</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* Right Layered Isometric Dashboard Collage (Image 4) */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="font-extrabold text-xs text-slate-900">✨ AI Ads Manager Dashboard</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                    Meta Verified
                  </span>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">ROAS</span>
                    <span className="font-black text-slate-900 text-sm">7.5X</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Leads</span>
                    <span className="font-black text-slate-900 text-sm">3,900</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Revenue</span>
                    <span className="font-black text-emerald-600 text-sm">₹15.2L</span>
                  </div>
                </div>

                {/* Floating chat snippet */}
                <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="bg-white p-3 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-[11px]">ZoomBus Assistant ✓</span>
                      <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 rounded">Verified Blue Tick</span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      Hello, I will be your travel assistant from ZoomBus. Please choose an option:
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 py-1.5 bg-slate-100 text-slate-800 font-bold rounded text-[10px]">
                        Book Bus Ticket
                      </button>
                      <button className="flex-1 py-1.5 bg-slate-100 text-slate-800 font-bold rounded text-[10px]">
                        Cancel Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. DEVELOPER API SECTION */}
      <section id="developer" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
              ⚡ Ultra-Low Latency OTP API
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Developer-First WhatsApp OTP &amp; Notification Engine
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Drop-in authentication using the official Meta WhatsApp Cloud API. Guaranteed 99.9% deliverability with sub-3-second latencies and zero telecom DLT headaches.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-2xl font-black text-slate-900 block">&lt; 2.4s</span>
                <span className="text-xs text-slate-500 font-semibold">Average Delivery Time</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-2xl font-black text-emerald-600 block">60% Less</span>
                <span className="text-xs text-slate-500 font-semibold">Cost vs Telecom SMS</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <Link
                href="/dashboard/setup"
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-xs transition"
              >
                View Setup Guide ➔
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition"
              >
                Get API Keys
              </Link>
            </div>
          </div>

          {/* Interactive Code Box */}
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-white font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-400 text-xs ml-2">send-otp.sh</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveCodeTab("curl")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${activeCodeTab === "curl" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setActiveCodeTab("node")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${activeCodeTab === "node" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Node.js
                </button>
                <button
                  onClick={() => setActiveCodeTab("python")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${activeCodeTab === "python" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Python
                </button>
              </div>
            </div>

            {activeCodeTab === "curl" && (
              <pre className="text-emerald-400 leading-relaxed overflow-x-auto p-2">
{`curl -X POST https://api.digitalbeings.in/v1/otp/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "+919876543210",
    "templateName": "auth_otp_v1",
    "otpCode": "849201"
  }'`}
              </pre>
            )}

            {activeCodeTab === "node" && (
              <pre className="text-blue-300 leading-relaxed overflow-x-auto p-2">
{`import { WhatsAppOTP } from '@whatsapp-otp/sdk';

const client = new WhatsAppOTP({ apiKey: process.env.API_KEY });

await client.sendOTP({
  phone: '+919876543210',
  code: '849201',
  expiry: 300 // 5 minutes
});`}
              </pre>
            )}

            {activeCodeTab === "python" && (
              <pre className="text-amber-300 leading-relaxed overflow-x-auto p-2">
{`import requests

res = requests.post(
  "https://api.digitalbeings.in/v1/otp/send",
  headers={"Authorization": "Bearer YOUR_API_KEY"},
  json={"phoneNumber": "+919876543210", "otpCode": "849201"}
)
print(res.json())`}
              </pre>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status: 200 OK</span>
              <span className="text-emerald-400">⚡ Delivered in 1.48s</span>
            </div>
          </div>
        </div>
      </section>

      {/* 12. PRICING SECTION */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-600 text-base">
              Pay as you go. No hidden telecom setup fees or long-term contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Tier 1: Free Trial */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Starter Trial</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500">/ 14 days</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Perfect for testing templates, broadcast flows, and developer APIs.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 pt-2 font-medium">
                  <li className="flex items-center gap-2">✓ 1,000 Free Service Conversations</li>
                  <li className="flex items-center gap-2">✓ 1 WhatsApp Registered Number</li>
                  <li className="flex items-center gap-2">✓ Excel Audience Auto-Mapping</li>
                  <li className="flex items-center gap-2">✓ Full REST API &amp; Webhooks</li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full text-center py-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 transition block"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Tier 2: Pro Growth (Featured) */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-6 flex flex-col justify-between relative border-2 border-emerald-500">
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-500 to-[#25D366] text-slate-900 font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Pro Marketer</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹1,425</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  For scaling brands that need unlimited broadcasts, funnels &amp; analytics.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-200 pt-2 font-medium">
                  <li className="flex items-center gap-2">✓ Unlimited Broadcast Campaigns</li>
                  <li className="flex items-center gap-2">✓ Multi-Number Service Routing</li>
                  <li className="flex items-center gap-2">✓ Live Smartphone Chat Mockup</li>
                  <li className="flex items-center gap-2">✓ Real-time Funnel &amp; Audit Logs</li>
                  <li className="flex items-center gap-2">✓ Priority Meta API Queuing</li>
                </ul>
              </div>
              <Link
                href="/signup"
                className="w-full text-center py-3 rounded-xl bg-[#00c853] hover:bg-[#00b248] text-white font-extrabold text-xs shadow-md transition block"
              >
                Get Started Now ➔
              </Link>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Enterprise Custom</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">Custom</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For high-throughput enterprises, banking, and global retail operations.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700 pt-2 font-medium">
                  <li className="flex items-center gap-2">✓ Dedicated Meta WABA Tier Acceleration</li>
                  <li className="flex items-center gap-2">✓ 50+ Messages / Sec Throttle Speed</li>
                  <li className="flex items-center gap-2">✓ 99.99% Uptime SLA Guarantee</li>
                  <li className="flex items-center gap-2">✓ 24/7 Dedicated Account Manager</li>
                </ul>
              </div>
              <Link
                href="/dashboard/wallet"
                className="w-full text-center py-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 transition block"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 13. FAQ SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm">Everything you need to know about our WhatsApp Cloud Platform</p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Do I need a new phone number to connect to Meta WhatsApp Cloud API?",
              a: "You can use an existing phone number or register a fresh one. If using an existing number, it must be disconnected from standard WhatsApp/WhatsApp Business mobile app so Meta can bind it directly to the official Cloud API."
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
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between hover:bg-slate-50 transition"
              >
                <span>{faq.q}</span>
                <span className="text-slate-400 font-normal text-lg">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 14. PRE-FOOTER CTA BANNER */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Ready to <span className="text-emerald-400">5X Your Revenue</span> with WhatsApp?
          </h2>
          <p className="text-slate-300 text-base max-w-2xl mx-auto">
            Join 210,000+ businesses automating broadcasts, OTPs, and customer support with official Meta Cloud APIs.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-[#00c853] hover:bg-[#00b248] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2"
            >
              <span>Start 14-Day Free Trial</span>
              <span>➔</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* 15. GLOBAL FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-16 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#25D366] flex items-center justify-center text-white font-black text-sm">
                ⚡
              </div>
              <span className="font-black text-xl tracking-tight text-slate-900">
                OTP<span className="text-emerald-500">SaaS</span>
              </span>
            </Link>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Official Meta Tech Partner powering broadcast marketing, customer support, and instant OTP authentication over WhatsApp Cloud API.
            </p>
            <div className="pt-2 flex items-center gap-2 text-emerald-700 font-bold text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Meta Cloud API Systems Operational (99.98% Uptime)
            </div>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Product</h5>
            <ul className="space-y-2">
              <li><Link href="#broadcast" className="hover:text-slate-900">Broadcast Campaigns</Link></li>
              <li><Link href="#developer" className="hover:text-slate-900">WhatsApp OTP API</Link></li>
              <li><Link href="#features" className="hover:text-slate-900">Click to WhatsApp Ads</Link></li>
              <li><Link href="#features" className="hover:text-slate-900">WhatsApp Forms</Link></li>
              <li><Link href="#features" className="hover:text-slate-900">WhatsApp Payments</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Resources</h5>
            <ul className="space-y-2">
              <li><Link href="/dashboard/setup" className="hover:text-slate-900">Meta Setup Guide</Link></li>
              <li><Link href="/dashboard/templates" className="hover:text-slate-900">Template Studio</Link></li>
              <li><Link href="/dashboard/campaigns" className="hover:text-slate-900">Campaign Manager</Link></li>
              <li><Link href="/dashboard/numbers" className="hover:text-slate-900">Numbers &amp; Routing</Link></li>
              <li><Link href="/dashboard/wallet" className="hover:text-slate-900">Pricing &amp; Wallet</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3">Legal &amp; Trust</h5>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-slate-900">Terms of Service</Link></li>
              <li><span className="text-slate-400">SOC-2 Type II Certified</span></li>
              <li><span className="text-slate-400">GDPR Compliant</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OTP SaaS / Digital Beings. All rights reserved. Meta and WhatsApp are registered trademarks of Meta Platforms, Inc.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/login" className="hover:underline">Portal Login</Link>
          </div>
        </div>
      </footer>

      {/* 16. FLOATING WHATSAPP CHAT BUTTON (BOTTOM RIGHT AS IN ALL SCREENSHOTS) */}
      <a
        href="https://wa.me/?text=Hello%20I%20want%20to%20learn%20more%20about%20WhatsApp%20Cloud%20SaaS"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
        aria-label="Chat on WhatsApp"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
      </a>
    </div>
  );
}
