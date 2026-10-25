"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useSubscription } from "@/context/SubscriptionContext";
import TokenUpdateModal from "@/components/TokenUpdateModal";
import Loader from "@/components/Loader";

export default function SetupPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const { isDemo, triggerPaywall } = useSubscription();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Cascading data & portfolios
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [connectedNumbers, setConnectedNumbers] = useState<any[]>([]);
  const [hasFetchedAccounts, setHasFetchedAccounts] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState("");
  
  // User selections for manual re-select
  const [selectedBiz, setSelectedBiz] = useState("");
  const [selectedWaba, setSelectedWaba] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [connectingPhoneId, setConnectingPhoneId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem("projectId");
    if (pid) {
      setProjectId(pid);
      fetchProjectData(pid);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProjectData = async (pid: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/project/${pid}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        if (data.project.metaAccessToken) {
          fetchMetaAccounts(pid);
          fetchConnectedNumbers(pid);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetaAccounts = async (pid: string) => {
    try {
      setFetchingAccounts(true);
      setFetchError("");
      const res = await fetch(`${getApiUrl()}/v1/meta/accounts/${pid}`);
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.businesses || []); 
      } else {
        setFetchError(data.error || "Failed to fetch accounts");
      }
    } catch (e) {
      console.error(e);
      setFetchError("Server connection error");
    } finally {
      setHasFetchedAccounts(true);
      setFetchingAccounts(false);
    }
  };

  const fetchConnectedNumbers = async (pid: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/${pid}`);
      const data = await res.json();
      if (data.success) {
        setConnectedNumbers(data.numbers || []);
      }
    } catch (e) {
      console.error("Error fetching connected numbers:", e);
    }
  };

  useEffect(() => {
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1831033178050637',
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };
  }, []);

  useEffect(() => {
    const handleMetaMessage = (event: MessageEvent) => {
      if (
        event.origin &&
        (event.origin.includes("facebook.com") || event.origin.includes("fb.com"))
      ) {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data && (data.type === "WA_EMBEDDED_SIGNUP" || data.event === "FINISH")) {
            if (projectId) {
              fetchProjectData(projectId);
              fetchMetaAccounts(projectId);
              fetchConnectedNumbers(projectId);
            }
          }
        } catch (e) {}
      }
    };

    window.addEventListener("message", handleMetaMessage);
    return () => window.removeEventListener("message", handleMetaMessage);
  }, [projectId]);

  const handleFacebookLogin = () => {
    if (!projectId) return showWarning("Please log in to your account first.", "Login Required");
    
    (window as any).FB.login(function (response: any) {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        fetch(`${getApiUrl()}/v1/auth/meta/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, projectId })
        })
        .then(res => res.json())
        .then(data => {
          if(data.success) {
             setProject({ ...project, metaAccessToken: accessToken });
             fetchMetaAccounts(projectId);
             fetchConnectedNumbers(projectId);
             showSuccess("Meta account successfully connected! Portfolios refreshed.", "Meta Linked");
          } else {
             showError("Failed to save Meta token: " + data.error, "Token Error");
          }
        })
        .catch(err => showError("Error communicating with server", "Network Error"));
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, {
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
      return_scopes: true
    });
  };

  const saveSelection = async () => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To link your Meta WhatsApp Cloud API credentials to live production routes, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!selectedWaba || !selectedPhone) return showWarning("Please select a WhatsApp Business Account and a phone number.", "Selection Required");
    setSaving(true);
    try {
      const currentBiz = businesses.find(b => b.id === selectedBiz);
      const currentWaba = currentBiz?.wabas?.find((w: any) => w.id === selectedWaba);
      const currentPhone = currentWaba?.phones?.find((p: any) => p.id === selectedPhone);

      const res = await fetch(`${getApiUrl()}/v1/meta/select/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: selectedWaba,
          phoneId: selectedPhone,
          displayPhone: currentPhone?.number || selectedPhone,
          verifiedName: currentPhone?.verifiedName,
          wabaName: currentWaba?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, metaWabaId: selectedWaba, metaPhoneId: selectedPhone });
        setIsEditing(false);
        showSuccess("Profile & number selected successfully!", "Setup Complete");
        if (projectId) {
          fetchMetaAccounts(projectId);
          fetchConnectedNumbers(projectId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const connectSpecificPhone = async (waba: any, phone: any) => {
    if (!projectId) return;
    setConnectingPhoneId(phone.id);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/select/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: waba.id,
          phoneId: phone.id,
          displayPhone: phone.number || phone.id,
          verifiedName: phone.verifiedName,
          wabaName: waba.name
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Number ${phone.number || phone.id} connected successfully to your workspace!`, "Number Connected");
        fetchProjectData(projectId);
        fetchMetaAccounts(projectId);
        fetchConnectedNumbers(projectId);
      } else {
        showError(data.error || "Failed to connect phone number", "Connection Error");
      }
    } catch (e: any) {
      showError(e.message || "Failed to connect", "Error");
    } finally {
      setConnectingPhoneId(null);
    }
  };

  // Find currently selected entities to populate cascading dropdowns
  const currentBiz = businesses.find(b => b.id === selectedBiz);
  const currentWabas = currentBiz ? currentBiz.wabas : [];
  const currentWaba = currentWabas.find((w: any) => w.id === selectedWaba);
  const currentPhones = currentWaba ? currentWaba.phones : [];

  // Summary counts
  const totalPortfoliosCount = businesses.length;
  const connectedPortfoliosCount = businesses.filter(b => 
    b.wabas?.some((w: any) => 
      w.id === project?.metaWabaId || 
      connectedNumbers.some(n => n.wabaId === w.id)
    )
  ).length;

  const totalWabasCount = businesses.reduce((acc, b) => acc + (b.wabas?.length || 0), 0);
  const connectedNumbersCount = connectedNumbers.length > 0 ? connectedNumbers.length : (project?.metaPhoneId ? 1 : 0);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader scale={0.9} color="#0f172a" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading WhatsApp Setup...</p>
      </div>
    );
  }

  return (
    <>
      <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js" />
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Meta Cloud API Onboarding
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Connect Your WhatsApp Number</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage Business Portfolios, registered WABAs, and active phone numbers.</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                if (projectId) {
                  fetchMetaAccounts(projectId);
                  fetchConnectedNumbers(projectId);
                }
              }}
              disabled={fetchingAccounts}
              className="px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>🔄</span>
              <span>{fetchingAccounts ? "Syncing..." : "Refresh Portfolios"}</span>
            </button>
            <button
              onClick={() => setShowTokenModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>🔑</span>
              <span>Update Access Token</span>
            </button>
          </div>
        </div>

        {/* STATE 1: Connect Meta (First time) */}
        {!project?.metaAccessToken && (
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-3xl shadow-sm border border-slate-200/90 dark:border-white/[0.08] overflow-hidden backdrop-blur-xl">
            {/* Top Reassurance Hero Banner */}
            <div className="p-8 sm:p-10 bg-gradient-to-b from-emerald-50/60 via-slate-50/30 to-white text-center space-y-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Official Meta Cloud API • Zero Coding Required
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight max-w-xl mx-auto">
                Connect or Register Your WhatsApp Number in Under 60 Seconds
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
                Whether you have an established Meta Business Portfolio or just a brand-new SIM card, Meta will guide you through quick SMS verification directly inside the secure popup dialog.
              </p>
            </div>

            {/* 3 Step Readiness Cards */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                    📱
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">1. Mobile Phone Ready</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Have your mobile phone nearby. Meta will send a 6-digit SMS verification code to verify number ownership.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                    ✨
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">2. No Meta Setup Needed</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Don&apos;t have a Business Portfolio yet? Meta automatically creates your official profile on the fly inside the popup.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold">
                    ⚡
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">3. Fresh or Unlinked Number</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If this number is on a personal WhatsApp phone app, simply tap &quot;Delete Account&quot; in your phone&apos;s WhatsApp settings first so Meta API can claim it.
                  </p>
                </div>
              </div>

              {/* Main Action Area */}
              <div className="pt-2 flex flex-col items-center justify-center space-y-4">
                <button
                  onClick={handleFacebookLogin}
                  className="w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl transition flex items-center justify-center gap-3 text-base"
                >
                  <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  <span>Connect with WhatsApp (Meta Official Popup)</span>
                </button>
                <p className="text-[11px] text-slate-400 font-medium">
                  🔒 Opens Meta&apos;s verified authorization dialog. Everything happens inside the popup.
                </p>

                {/* Secondary Fallbacks for Agencies & System Users */}
                <div className="pt-6 border-t border-slate-100 dark:border-white/[0.08] w-full flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
                  <span className="text-slate-400 font-medium">Agency or Enterprise setup?</span>
                  <button
                    onClick={() => setShowTokenModal(true)}
                    className="font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition"
                  >
                    🔑 Paste System User Token
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("205078357411585");
                      showSuccess("Copied Digital Being Partner ID (205078357411585)!", "Copied");
                    }}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition"
                  >
                    📋 Copy Partner ID (205078357411585)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: Cascading Profile Selection (First time or when Re-selecting) */}
        {project?.metaAccessToken && (!project?.metaWabaId || isEditing) && (
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-3xl shadow-sm border border-slate-200 dark:border-white/[0.08] p-8 space-y-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select Business Portfolio & Number</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Pick the portfolio, WABA, and sender phone number to route traffic through.</p>
              </div>
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  ✕ Cancel &amp; Back to Portfolios
                </button>
              )}
            </div>

            {fetchingAccounts && !hasFetchedAccounts ? (
              <div className="py-12 text-center space-y-4">
                <Loader scale={0.85} color="#0f172a" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discovering Business Portfolios from Meta...</p>
              </div>
            ) : fetchError || businesses.length === 0 ? (
              <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-orange-900">Action Required in Meta Business Manager</h3>
                <p className="text-orange-800 text-xs leading-relaxed">
                  {fetchError || "We securely connected to your Meta token, but found 0 Business Portfolios with registered WhatsApp Accounts."}
                </p>
                <div className="bg-white dark:bg-orange-950/20 p-4 rounded-xl border border-orange-200 dark:border-orange-500/30 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <p className="font-bold text-slate-800">Quick steps to add a number in Meta:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to <a href="https://business.facebook.com/" target="_blank" className="text-blue-600 underline font-semibold">Meta Business Manager</a>.</li>
                    <li>Select or create your Business Portfolio.</li>
                    <li>Under <strong>WhatsApp Accounts</strong>, register your phone number.</li>
                    <li>Return here and click Refresh Accounts.</li>
                  </ol>
                </div>
                <button 
                  onClick={() => fetchMetaAccounts(projectId!)} 
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition"
                >
                  Refresh Accounts
                </button>
              </div>
            ) : (
              <div className="space-y-5 bg-slate-50 dark:bg-[#070b14] p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] max-w-xl mx-auto">
                {/* 1. Business Portfolio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Meta Business Portfolio
                  </label>
                  <select 
                    className="w-full border border-slate-300 dark:border-white/10 rounded-xl p-3 bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedBiz}
                    onChange={(e) => {
                      setSelectedBiz(e.target.value);
                      setSelectedWaba("");
                      setSelectedPhone("");
                    }}
                  >
                    <option value="">-- Select Portfolio --</option>
                    {businesses.map(biz => (
                      <option key={biz.id} value={biz.id}>{biz.name} (ID: {biz.id})</option>
                    ))}
                  </select>
                </div>

                {/* 2. WhatsApp Business Account */}
                {selectedBiz && (
                  <div className="pl-4 border-l-2 border-emerald-300 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. WhatsApp Business Account (WABA)
                    </label>
                    {currentWabas.length === 0 ? (
                      <div className="p-4 bg-amber-50/90 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-xs space-y-3 text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                          <span className="text-lg shrink-0">ℹ️</span>
                          <div>
                            <p className="font-extrabold text-amber-900 text-sm">
                              Why is Ishinna Sadana not showing yet?
                            </p>
                            <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                              Your active Meta token was generated under <strong className="text-slate-900">Digital Being (ID: 205078357411585)</strong>. Meta isolates portfolios, so it blocks this token from reading assets inside <strong className="text-slate-900">{currentBiz?.name || "this portfolio"}</strong> until you grant partner permission or add a token for this portfolio.
                            </p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30 space-y-2.5">
                          <p className="font-extrabold text-slate-800 text-xs">
                            👉 Two Fast Ways to Connect {currentBiz?.name || "this portfolio"}:
                          </p>

                          <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                Method 1: Assign Partner in Meta (Takes 15 Seconds)
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded">
                                Recommended
                              </span>
                            </div>
                            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                              <li>
                                In your Meta Business Settings tab for <strong>{currentBiz?.name}</strong>, go to <strong>WhatsApp accounts</strong> ➔ <strong>Ishinna Sadana</strong>.
                              </li>
                              <li>
                                Click the <strong className="text-blue-600">Assign partner</strong> button (right above the summary tabs).
                              </li>
                              <li>
                                Enter Digital Being Partner Business ID:
                                <div className="mt-1 flex items-center gap-2">
                                  <code className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-slate-900 dark:text-slate-200 font-mono font-bold text-xs">
                                    205078357411585
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText("205078357411585");
                                      showSuccess("Copied Digital Being ID (205078357411585) to clipboard!", "Copied");
                                    }}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded shadow-2xs"
                                  >
                                    📋 Copy ID
                                  </button>
                                </div>
                              </li>
                              <li>Toggle <strong>Full control</strong> / <strong>Manage WhatsApp account</strong> and click Save!</li>
                            </ol>
                          </div>

                          <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                              Method 2: Generate Token directly inside {currentBiz?.name}
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              In <strong>{currentBiz?.name}</strong>, go to <strong>Users</strong> ➔ <strong>System users</strong>, create an Admin user, assign <strong>Ishinna Sadana</strong>, and generate a token.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowTokenModal(true)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                              <span>🔑</span> Paste Token for {currentBiz?.name}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (projectId) {
                                fetchMetaAccounts(projectId);
                                fetchConnectedNumbers(projectId);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1"
                          >
                            <span>🔄</span> Refresh Accounts Once Permitted
                          </button>
                          <a
                            href="https://business.facebook.com/settings/whatsapp-business-accounts"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline font-semibold"
                          >
                            Open Meta Business Settings ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <select 
                        className="w-full border border-slate-300 dark:border-white/10 rounded-xl p-3 bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={selectedWaba}
                        onChange={(e) => {
                          setSelectedWaba(e.target.value);
                          setSelectedPhone("");
                        }}
                      >
                        <option value="">-- Select WABA --</option>
                        {currentWabas.map((w: any) => (
                          <option key={w.id} value={w.id}>{w.name} (ID: {w.id})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* 3. Phone Number */}
                {selectedWaba && (
                  <div className="pl-4 border-l-2 border-green-400 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      3. Sender Phone Number
                    </label>
                    {currentPhones.length === 0 ? (
                      <div className="text-xs text-amber-800 dark:text-amber-200 p-3 bg-amber-50 dark:bg-amber-950/25 rounded-xl border border-amber-200 dark:border-amber-500/30 space-y-1">
                        <p className="font-bold">0 phone numbers registered in this WABA.</p>
                        <p>Register a phone number in Meta Business Settings first.</p>
                      </div>
                    ) : (
                      <select 
                        className="w-full border border-slate-300 dark:border-white/10 rounded-xl p-3 bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={selectedPhone}
                        onChange={(e) => setSelectedPhone(e.target.value)}
                      >
                        <option value="">-- Select Phone Number --</option>
                        {currentPhones.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.number} {p.verifiedName ? `(${p.verifiedName})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="pt-3">
                  <button 
                    onClick={saveSelection} 
                    disabled={!selectedWaba || !selectedPhone || saving}
                    className="w-full bg-[#00c853] hover:bg-[#00b248] text-white font-extrabold py-3.5 px-6 rounded-xl transition shadow-md shadow-emerald-500/25 disabled:opacity-50 text-sm"
                  >
                    {saving ? "Saving Selection..." : "Confirm & Connect Number ➔"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 3: Onboarding Complete & Multi-Business Portfolios Management Hub */}
        {project?.metaAccessToken && project?.metaWabaId && !isEditing && (
          <div className="space-y-8">
            
            {/* Success Status Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#00c853] text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/30 shrink-0">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Meta Link Complete &amp; Active</h2>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-full border border-emerald-300">
                      Cloud API Live
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                    Your official Meta WhatsApp account is linked. Below you can see all Business Portfolios found under this account, check which ones are active in this workspace, and connect additional portfolios or numbers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
                >
                  <span>⚙️</span> Re-select Active Sender
                </button>
              </div>
            </div>

            {/* Metrics Overview Strip (Total Portfolios, Connected, Available WABAs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xs backdrop-blur-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Portfolios</span>
                  <span className="text-lg">🏢</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{totalPortfoliosCount}</span>
                  <span className="text-xs text-slate-500 font-semibold">Found in Meta</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  {connectedPortfoliosCount} of {totalPortfoliosCount} connected to this workspace
                </p>
              </div>

              <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xs backdrop-blur-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Connected Numbers</span>
                  <span className="text-lg">📱</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600">{connectedNumbersCount}</span>
                  <span className="text-xs text-slate-500 font-semibold">Live in Dashboard</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Ready for OTP, Utility &amp; Marketing Broadcasts
                </p>
              </div>

              <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xs backdrop-blur-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">WABAs Discovered</span>
                  <span className="text-lg">💼</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{totalWabasCount}</span>
                  <span className="text-xs text-slate-500 font-semibold">WhatsApp Accounts</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Across all portfolios in your Meta account
                </p>
              </div>
            </div>

            {/* List of Business Portfolios & Connected Profiles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Business Portfolios &amp; Connected Profiles</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Explore each portfolio, inspect phone numbers, and link them to your workspace.</p>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] border border-transparent dark:border-white/10 px-2.5 py-1 rounded-md">
                  {businesses.length} Portfolios Found
                </span>
              </div>

              {fetchingAccounts ? (
                <div className="bg-white dark:bg-[#0B101D]/80 rounded-3xl border border-slate-200 dark:border-white/[0.08] p-12 text-center space-y-3 backdrop-blur-xl">
                  <Loader scale={0.8} color="#0f172a" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Portfolios from Meta...</p>
                </div>
              ) : businesses.length === 0 ? (
                <div className="bg-white dark:bg-[#0B101D]/80 rounded-3xl border border-slate-200 dark:border-white/[0.08] p-10 text-center space-y-3 backdrop-blur-xl">
                  <p className="text-sm font-bold text-slate-700">No Business Portfolios found in this Meta Account.</p>
                  <p className="text-xs text-slate-400">Ensure your token has business_management permissions or add a portfolio below.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {businesses.map((biz) => {
                    const isBizConnected = biz.wabas?.some((w: any) => 
                      w.id === project?.metaWabaId || 
                      connectedNumbers.some(n => n.wabaId === w.id)
                    );

                    return (
                      <div
                        key={biz.id}
                        className={`bg-white dark:bg-[#0B101D]/80 rounded-3xl border dark:border-white/[0.08] transition-all overflow-hidden shadow-2xs backdrop-blur-xl ${
                          isBizConnected ? "border-emerald-300 ring-2 ring-emerald-500/10" : "border-slate-200"
                        }`}
                      >
                        {/* Portfolio Header Bar */}
                        <div className="p-6 bg-slate-50/80 dark:bg-[#070b14] border-b border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                              🏢
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{biz.name}</h4>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded">
                                  ID: {biz.id}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {biz.wabas?.length || 0} WhatsApp Business Accounts registered
                              </p>
                            </div>
                          </div>

                          <div>
                            {isBizConnected ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Connected to Workspace
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-full text-xs font-semibold whitespace-nowrap">
                                ⚪ Available in Meta (Not Connected)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* WABAs and Phone Numbers list */}
                        <div className="p-6 space-y-4">
                          {!biz.wabas || biz.wabas.length === 0 ? (
                            <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">
                                No WhatsApp Business Accounts found in this portfolio.
                              </span>
                              <a
                                href="https://business.facebook.com/settings/whatsapp-business-accounts"
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
                              >
                                <span>Create WABA on Meta</span>
                                <span>↗</span>
                              </a>
                            </div>
                          ) : (
                            biz.wabas.map((waba: any) => {
                              const isWabaConnected = waba.id === project?.metaWabaId || connectedNumbers.some(n => n.wabaId === waba.id);

                              return (
                                <div key={waba.id} className="bg-slate-50/50 dark:bg-[#070b14] rounded-2xl p-4 border border-slate-200/90 dark:border-white/[0.08] space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.08] pb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">💼 {waba.name}</span>
                                      <span className="text-[10px] font-mono text-slate-400">WABA ID: {waba.id}</span>
                                    </div>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                      isWabaConnected ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                                    }`}>
                                      {isWabaConnected ? "Active WABA" : "Meta WABA"}
                                    </span>
                                  </div>

                                  {/* Phone Numbers under WABA */}
                                  {!waba.phones || waba.phones.length === 0 ? (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 py-1 flex items-center justify-between">
                                      <span>0 phone numbers registered in this WABA.</span>
                                      <a
                                        href="https://business.facebook.com/settings/whatsapp-business-accounts"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                      >
                                        Add Number in Meta ↗
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                      {waba.phones.map((phone: any) => {
                                        const isPhoneConnected = phone.id === project?.metaPhoneId || connectedNumbers.some(n => n.phoneId === phone.id);
                                        const isDefaultSender = phone.id === project?.metaPhoneId;

                                        return (
                                          <div
                                            key={phone.id}
                                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-white dark:bg-[#0B101D] dark:border-white/10 ${
                                              isPhoneConnected ? "border-emerald-300 shadow-2xs" : "border-slate-200"
                                            }`}
                                          >
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{phone.number}</span>
                                                {isDefaultSender && (
                                                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white font-bold text-[9px] rounded">
                                                    Default Sender
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {phone.verifiedName || "WhatsApp Phone"} • ID: {phone.id}
                                              </p>
                                            </div>

                                            <div className="shrink-0">
                                              {isPhoneConnected ? (
                                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                                                  <span>✓</span>
                                                  <span>Connected</span>
                                                </span>
                                              ) : (
                                                <button
                                                  onClick={() => connectSpecificPhone(waba, phone)}
                                                  disabled={connectingPhoneId === phone.id}
                                                  className="px-3 py-1 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50"
                                                >
                                                  {connectingPhoneId === phone.id ? "Connecting..." : "+ Connect"}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CONNECT MORE BUSINESS PORTFOLIOS SECTION */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                    ➕ Multi-Portfolio Management
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Connect More Business Portfolios</h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                    Need to link another Meta Business Manager, client portfolio, or connect credentials from a different WhatsApp account?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Option 1: Access Token Modal */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-2xl">🔑</span>
                    <h4 className="font-bold text-sm text-white">Add System User Token</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Paste a Permanent System User Token from another Business Portfolio to link its WABAs.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTokenModal(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Enter Portfolio Token ➔
                  </button>
                </div>

                {/* Option 2: Facebook Login */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-2xl">🌐</span>
                    <h4 className="font-bold text-sm text-white">Login with Facebook</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Authorize another Meta account or portfolio directly through the official Meta OAuth popup.
                    </p>
                  </div>
                  <button
                    onClick={handleFacebookLogin}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Authorize Portfolio ➔
                  </button>
                </div>

                {/* Option 3: Meta Business Manager Direct */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-2xl">⚙️</span>
                    <h4 className="font-bold text-sm text-white">Create on Meta</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Open Meta Business Settings to create a brand new Business Portfolio or add new phone numbers.
                    </p>
                  </div>
                  <a
                    href="https://business.facebook.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl text-center transition block"
                  >
                    Open Meta Manager ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Next Steps Journey Navigation Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xs space-y-3 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">3</span>
                  <h4 className="font-extrabold text-sm text-slate-900">Recharge Wallet &amp; Messaging Credits</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Before you send live OTPs or marketing broadcasts, ensure your wallet balance covers Meta messaging fees.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/wallet"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <span>Go to Wallet &amp; Billing</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xs space-y-3 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">4</span>
                  <h4 className="font-extrabold text-sm text-slate-900">Configure Service Routing &amp; Templates</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Route traffic by category (OTP vs Marketing vs Utility) and submit message templates to Meta for instant approval.
                </p>
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <Link
                    href="/dashboard/numbers"
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition"
                  >
                    <span>Numbers &amp; Routing</span>
                    <span>➔</span>
                  </Link>
                  <Link
                    href="/dashboard/templates"
                    className="inline-flex items-center gap-1 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition"
                  >
                    <span>Template Studio</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      <TokenUpdateModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSuccess={() => {
          if (projectId) {
            fetchProjectData(projectId);
            fetchMetaAccounts(projectId);
            fetchConnectedNumbers(projectId);
          }
        }}
        projectId={projectId || ""}
      />
    </>
  );
}
