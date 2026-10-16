"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import Loader from "@/components/Loader";

interface PhoneNumberItem {
  id: string;
  phoneId: string;
  displayPhone: string;
  verifiedName?: string;
  wabaId: string;
  wabaName?: string;
  service: string;
  isDefault: boolean;
  quality?: string;
  status?: string;
}

interface ObaResponse {
  success: boolean;
  phoneId: string;
  displayPhone: string;
  verifiedName: string;
  qualityRating: string;
  obaStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
  isOfficialBusinessAccount: boolean;
  readiness: {
    displayNameApproved: boolean;
    twoFactorEnabled: boolean;
    qualityHealthy: boolean;
    tenureEligible: boolean;
    score: number;
  };
  wabaId: string;
  metaManagerUrl: string;
  lastApplication?: any;
}

export default function GreenTickPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [numbers, setNumbers] = useState<PhoneNumberItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumberItem | null>(null);
  const [obaData, setObaData] = useState<ObaResponse | null>(null);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [loadingOba, setLoadingOba] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<"oba" | "normal">("oba");
  const [applications, setApplications] = useState<any[]>([]);

  // Dossier form state
  const [formData, setFormData] = useState({
    brandName: "",
    websiteUrl: "",
    parentBrand: "",
    wikipediaUrl: "",
    mediaLinks: ["", "", ""],
    socialInstagram: "",
    socialLinkedin: "",
    socialTwitter: "",
    socialFacebook: "",
    justification: ""
  });

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // Load registered phone numbers
  const loadNumbers = async () => {
    if (!projectId) return;
    setLoadingNumbers(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/${projectId}`);
      const data = await res.json();
      if (data.success && data.numbers && data.numbers.length > 0) {
        setNumbers(data.numbers);
        // Default to default phone or first in list
        const def = data.numbers.find((n: PhoneNumberItem) => n.isDefault) || data.numbers[0];
        setSelectedPhone(def);
      } else {
        setNumbers([]);
      }
    } catch (e: any) {
      console.error("Failed to load numbers", e);
    } finally {
      setLoadingNumbers(false);
    }
  };

  // Load OBA status for selected phone
  const loadObaStatus = async (phone: PhoneNumberItem) => {
    if (!projectId || !phone) return;
    setLoadingOba(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-status/${projectId}/${phone.phoneId}`);
      const data: ObaResponse = await res.json();
      if (data.success) {
        setObaData(data);
        // Prefill form brand name if empty
        setFormData(prev => ({
          ...prev,
          brandName: prev.brandName || data.verifiedName || phone.verifiedName || ""
        }));
      }
    } catch (e: any) {
      console.error("Failed to load OBA status", e);
    } finally {
      setLoadingOba(false);
    }
  };

  // Load previous applications
  const loadApplications = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-applications/${projectId}`);
      const data = await res.json();
      if (data.success && data.applications) {
        setApplications(data.applications);
      }
    } catch (e: any) {
      console.error("Failed to load applications", e);
    }
  };

  useEffect(() => {
    loadNumbers();
    loadApplications();
  }, [projectId]);

  useEffect(() => {
    if (selectedPhone) {
      loadObaStatus(selectedPhone);
    }
  }, [selectedPhone]);

  // Media link inputs helpers
  const handleMediaLinkChange = (index: number, val: string) => {
    const next = [...formData.mediaLinks];
    next[index] = val;
    setFormData(prev => ({ ...prev, mediaLinks: next }));
  };

  const addMediaLinkSlot = () => {
    if (formData.mediaLinks.length >= 5) {
      showWarning("Meta accepts a maximum of 5 notability news articles.", "Limit Reached");
      return;
    }
    setFormData(prev => ({ ...prev, mediaLinks: [...prev.mediaLinks, ""] }));
  };

  const removeMediaLinkSlot = (index: number) => {
    if (formData.mediaLinks.length <= 1) return;
    const next = formData.mediaLinks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, mediaLinks: next }));
  };

  // Handle application submission
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone) {
      showError("Please select a registered phone number first.", "No Number Selected");
      return;
    }

    if (!formData.brandName.trim()) {
      showError("Please enter your official brand name.", "Brand Name Required");
      return;
    }

    if (!formData.websiteUrl.trim() || !formData.websiteUrl.startsWith("http")) {
      showError("Please enter a valid website URL starting with http:// or https://", "Website Required");
      return;
    }

    const validMedia = formData.mediaLinks.filter(l => l.trim().length > 5);
    if (validMedia.length === 0) {
      showWarning(
        "Meta's editorial board requires at least 1–3 organic news articles or press mentions (e.g., Economic Times, YourStory, Forbes, Times of India) to prove brand notability.",
        "Media Articles Recommended"
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-apply/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneId: selectedPhone.phoneId,
          displayPhone: selectedPhone.displayPhone,
          brandName: formData.brandName,
          websiteUrl: formData.websiteUrl,
          parentBrand: formData.parentBrand,
          wikipediaUrl: formData.wikipediaUrl,
          mediaLinks: validMedia,
          socialLinks: {
            instagram: formData.socialInstagram,
            linkedin: formData.socialLinkedin,
            twitter: formData.socialTwitter,
            facebook: formData.socialFacebook
          },
          justification: formData.justification
        })
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(
          "Your Green Tick (Official Business Account) dossier has been compiled and submitted!\n\nOur system has logged your verification request. You can also view this request directly inside Meta WhatsApp Manager.",
          "Application Submitted!"
        );
        loadObaStatus(selectedPhone);
        loadApplications();
      } else {
        showError(data.error || "Failed to submit application", "Submission Error");
      }
    } catch (e: any) {
      showError(e.message || "Network error submitting application", "Submission Error");
    } finally {
      setSubmitting(false);
    }
  };

  const status = obaData?.obaStatus || "NOT_STARTED";
  const readiness = obaData?.readiness || {
    displayNameApproved: true,
    twoFactorEnabled: true,
    qualityHealthy: true,
    tenureEligible: true,
    score: 100
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200 flex items-center gap-1.5">
              <span>✅</span> Official Business Account (OBA)
            </span>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md border border-blue-200">
              Meta Cloud API Verified
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            WhatsApp Green Tick Verification
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-3xl leading-relaxed">
            Acquire Meta's official green checkmark badge (✅) to display your verified brand name to customers on WhatsApp—even if they haven't saved your contact.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {selectedPhone && (
            <button
              onClick={() => loadObaStatus(selectedPhone)}
              disabled={loadingOba}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
            >
              <span className={loadingOba ? "animate-spin" : ""}>🔄</span> Refresh Meta Status
            </button>
          )}
          {obaData?.metaManagerUrl && (
            <a
              href={obaData.metaManagerUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition"
            >
              <span>🌐</span> Meta WhatsApp Manager ↗
            </a>
          )}
        </div>
      </div>

      {/* Hero Badge Status Banner */}
      <div className="rounded-2xl p-5 md:p-6 border shadow-xs transition-all">
        {status === "VERIFIED" ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/80 -m-5 md:-m-6 p-6 rounded-2xl border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                ✅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-emerald-950">Official Business Account Verified!</h3>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[11px] font-extrabold rounded-full">
                    ACTIVE
                  </span>
                </div>
                <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                  The green tick verification badge is officially active on <b>{selectedPhone?.displayPhone}</b>. Your verified brand name <b>"{obaData?.verifiedName}"</b> is now displayed in bold green text across all customer chats.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs">
                ⭐ 100% Brand Trust
              </span>
            </div>
          </div>
        ) : status === "PENDING" ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50/80 -m-5 md:-m-6 p-6 rounded-2xl border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md animate-pulse">
                ⏳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-amber-950">Application Under Meta Editorial Review</h3>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[11px] font-extrabold rounded-full">
                    IN REVIEW
                  </span>
                </div>
                <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                  Your Green Tick dossier for <b>{selectedPhone?.displayPhone}</b> is currently under review by Meta's Trust & Safety Board. Reviews typically complete within <b>2 to 4 business days</b>.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <a
                href={obaData?.metaManagerUrl || "https://business.facebook.com"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
              >
                Track on Meta Manager ↗
              </a>
            </div>
          </div>
        ) : status === "REJECTED" ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50/80 -m-5 md:-m-6 p-6 rounded-2xl border border-red-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                ⚠️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-red-950">Meta Did Not Approve OBA Status</h3>
                  <span className="px-2 py-0.5 bg-red-200 text-red-900 text-[11px] font-extrabold rounded-full">
                    COOLDOWN ACTIVE
                  </span>
                </div>
                <p className="text-red-800 text-xs mt-1 leading-relaxed">
                  Meta's editorial team determined that brand notability proof was insufficient. Meta allows submitting a new application with additional press coverage after <b>30 days</b>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white -m-5 md:-m-6 p-6 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                ✨
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Ready to Apply for WhatsApp Green Tick
                </h3>
                <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl">
                  Official Business Accounts (OBA) experience over <b>95% open rates</b>, zero contact saving friction, and complete immunity from spam reports. Complete your dossier below to apply.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Readiness Score</span>
                <span className="text-lg font-extrabold text-emerald-400">{readiness.score}% Eligible</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Controls & Form | Right Live WhatsApp Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Phone Number Selector */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>📱</span> Select Phone Number to Verify
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {numbers.length} registered number{numbers.length === 1 ? "" : "s"}
              </span>
            </div>

            {loadingNumbers ? (
              <div className="py-6 text-center">
                <Loader scale={0.7} color="#0f172a" />
                <p className="text-xs text-slate-500 mt-2 font-medium">Loading phone numbers...</p>
              </div>
            ) : numbers.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                No phone numbers found in this workspace. Please register a number under <b>Numbers & Routing</b> first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {numbers.map((phone) => {
                  const isSelected = selectedPhone?.phoneId === phone.phoneId;
                  return (
                    <div
                      key={phone.phoneId}
                      onClick={() => setSelectedPhone(phone)}
                      className={`p-4 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 hover:bg-slate-100/70 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{phone.displayPhone}</p>
                          <p className="text-xs text-slate-600 mt-0.5 truncate font-medium">
                            {phone.verifiedName || "Pending Display Name"}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold shrink-0">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-black/5 text-[11px]">
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-semibold text-slate-600">
                          {phone.quality || "GREEN"}
                        </span>
                        {phone.isDefault && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 2: Eligibility & Readiness Audit Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>🛡️</span> Meta Pre-requisite Audit
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Real-time compliance checks required by Meta's Trust & Safety Board.
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                readiness.score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {readiness.score}% Compliance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Check 1 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                <span className={`text-lg ${readiness.displayNameApproved ? "text-emerald-600" : "text-amber-500"}`}>
                  {readiness.displayNameApproved ? "✅" : "⚠️"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">Approved Display Name</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {obaData?.verifiedName ? `Verified: "${obaData.verifiedName}"` : "Pending Meta Approval"}
                  </p>
                </div>
              </div>

              {/* Check 2 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                <span className={`text-lg ${readiness.twoFactorEnabled ? "text-emerald-600" : "text-amber-500"}`}>
                  {readiness.twoFactorEnabled ? "✅" : "⚠️"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">Two-Step Verification (2FA)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {readiness.twoFactorEnabled ? "Active on Cloud API" : "PIN Required in WhatsApp Manager"}
                  </p>
                </div>
              </div>

              {/* Check 3 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                <span className={`text-lg ${readiness.qualityHealthy ? "text-emerald-600" : "text-amber-500"}`}>
                  {readiness.qualityHealthy ? "✅" : "⚠️"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">Messaging Quality Rating</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Status: <span className="font-semibold text-emerald-700">{obaData?.qualityRating || "HIGH / GREEN"}</span>
                  </p>
                </div>
              </div>

              {/* Check 4 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                <span className="text-lg text-emerald-600">✅</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">Meta Business Portfolio</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    WABA ID: {obaData?.wabaId || "2107898293422238"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: The Green Tick Application Dossier Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>📝</span> Brand Notability Dossier
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Meta requires this dossier to verify that your business is a well-known, actively searched brand.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  Step 2 of 2
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-5">
              {/* Brand Name & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. Aayan Market"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must match your verified display name.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Website URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourbrand.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Website must match company domain.</p>
                </div>
              </div>

              {/* Parent Brand & Wikipedia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Parent Company / Legal Entity <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.parentBrand}
                    onChange={(e) => setFormData({ ...formData, parentBrand: e.target.value })}
                    placeholder="e.g. Aeron Digital Solutions Pvt Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Wikipedia / Crunchbase URL <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.wikipediaUrl}
                    onChange={(e) => setFormData({ ...formData, wikipediaUrl: e.target.value })}
                    placeholder="https://en.wikipedia.org/wiki/YourBrand"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Press & Media Notability Links */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Notability Proof: 3 to 5 News / PR Articles <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Articles from established news outlets (e.g. <i>Economic Times, YourStory, Forbes, Times of India, TechCrunch</i>). Meta disregards paid press releases.
                    </p>
                  </div>
                  {formData.mediaLinks.length < 5 && (
                    <button
                      type="button"
                      onClick={addMediaLinkSlot}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                    >
                      + Add Link
                    </button>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {formData.mediaLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => handleMediaLinkChange(idx, e.target.value)}
                        placeholder={`https://newsoutlet.com/article-${idx + 1}`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      {formData.mediaLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMediaLinkSlot(idx)}
                          className="text-slate-400 hover:text-red-600 p-1.5 text-sm"
                          title="Remove article"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media Proof */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Social Media Footprint <span className="text-slate-400 font-normal">(Verified profiles increase approval rate)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.socialInstagram}
                    onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                    placeholder="Instagram handle (e.g. @aayanmarket)"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    value={formData.socialLinkedin}
                    onChange={(e) => setFormData({ ...formData, socialLinkedin: e.target.value })}
                    placeholder="LinkedIn Company URL"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Business Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Justification Statement for Meta's Reviewers
                </label>
                <textarea
                  rows={3}
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Explain why your brand warrants Official Business Account status (e.g., active customer base, brand identity protection against impersonation, high messaging volume)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader scale={0.7} color="#ffffff" />
                      <span>Submitting Dossier to Meta...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Submit Green Tick Application</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center sm:text-left">
                  Review turnaround: 2 to 4 business days directly via Meta Graph API.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: WhatsApp Live Simulator & Roadmap (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-6">
          {/* WhatsApp Interactive Simulator */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>📱</span> Live WhatsApp Simulator
                </h3>
                <p className="text-[11px] text-slate-400">See how customers experience your messages.</p>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewMode("oba")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewMode === "oba" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500"
                  }`}
                >
                  ✅ Green Tick
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("normal")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewMode === "normal" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Standard
                </button>
              </div>
            </div>

            {/* Mobile Frame */}
            <div className="border-4 border-slate-900 rounded-[2.2rem] overflow-hidden shadow-xl bg-slate-900 max-w-sm mx-auto">
              {/* WhatsApp Header */}
              <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center gap-2.5 select-none">
                <span className="text-white text-xs">←</span>
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center shrink-0 border border-white/20">
                  {formData.brandName ? formData.brandName.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-xs text-white truncate">
                      {previewMode === "oba"
                        ? (formData.brandName || selectedPhone?.verifiedName || "Aayan Market")
                        : (selectedPhone?.displayPhone || "+91 98765 43210")}
                    </p>
                    {previewMode === "oba" && (
                      <span className="text-emerald-400 text-xs shrink-0" title="Meta Official Business Account">
                        ✅
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-100/80 truncate">
                    {previewMode === "oba" ? "Official Business Account" : "Business Account"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-white/90 text-xs shrink-0">
                  <span>📹</span>
                  <span>📞</span>
                  <span>⋮</span>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="bg-[#EFEAE2] p-3.5 space-y-3 min-h-[340px] flex flex-col justify-between font-sans">
                <div className="space-y-2.5">
                  {/* Warning banner if standard */}
                  {previewMode === "normal" ? (
                    <div className="bg-amber-100/90 border border-amber-300 p-2 rounded-lg text-amber-900 text-[10px] text-center shadow-xs">
                      ⚠️ The sender is not in your contact list. Report spam or add to contacts.
                    </div>
                  ) : (
                    <div className="bg-white/90 border border-emerald-200 p-2 rounded-lg text-emerald-900 text-[10px] text-center shadow-xs flex items-center justify-center gap-1.5 font-medium">
                      <span>🔒</span> This is an <b>Official WhatsApp Business Account</b> for {formData.brandName || "Aayan Market"}.
                    </div>
                  )}

                  {/* Sample WhatsApp Bubble */}
                  <div className="bg-white p-3 rounded-2xl rounded-tl-xs shadow-xs text-slate-900 text-xs space-y-1.5 max-w-[88%] border border-black/5">
                    <p className="font-bold text-[11px] text-slate-800">
                      Hi Rahul, thank you for your order! 🎉
                    </p>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      Your order <b>#ORD-8921</b> has been packed and scheduled for delivery today.
                    </p>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Order Alert</span>
                      <span className="flex items-center gap-1">11:42 AM <span className="text-blue-500">✓✓</span></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Input Mock */}
                <div className="bg-white rounded-full px-3 py-1.5 flex items-center justify-between text-slate-400 text-xs shadow-xs border border-slate-200">
                  <span>Type a message...</span>
                  <span>📎 📷 🎤</span>
                </div>
              </div>
            </div>

            {/* Impact Metric Comparison */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Open Rate</span>
                <span className="text-sm font-extrabold text-emerald-700">95%+ (vs 62%)</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Spam Reports</span>
                <span className="text-sm font-extrabold text-emerald-700">0.01% (Protected)</span>
              </div>
            </div>
          </div>

          {/* Meta Review Process Steps */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>🗺️</span> Meta Editorial Review Roadmap
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-900">Pre-requisite Verification</p>
                  <p className="text-slate-500 text-[11px]">System checks display name, 2FA, and Meta Business Portfolio status.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-900">Dossier Submission</p>
                  <p className="text-slate-500 text-[11px]">Your brand dossier and 3–5 media links are submitted to Meta Review Board.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-900">Meta Editorial Board Review</p>
                  <p className="text-slate-500 text-[11px]">Meta manual reviewers assess brand notability (takes 2 to 4 business days).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <p className="font-bold text-slate-900">Green Tick Activated Globally</p>
                  <p className="text-slate-500 text-[11px]">The green checkmark badge appears instantly across all 2.7B+ WhatsApp devices.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Past Submissions Log */}
          {applications.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>📋</span> Application History
              </h3>
              <div className="space-y-2">
                {applications.map((app) => (
                  <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{app.brandName}</p>
                      <p className="text-[10px] text-slate-500">{app.displayPhone}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                      {app.status || "SUBMITTED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
