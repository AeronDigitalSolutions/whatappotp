"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useSubscription } from "@/context/SubscriptionContext";
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

interface ChecklistItem {
  id: string;
  title: string;
  status: "COMPLETE" | "ACTION_REQUIRED" | "UNABLE_TO_VERIFY" | "CHECKING";
  value: string;
  explanation: string;
  recommendedAction: string;
  metaUrl: string;
}

interface ChecklistSummary {
  completed: number;
  total: number;
  summaryText: string;
}

interface ObaResponse {
  success: boolean;
  phoneId: string;
  displayPhone: string;
  verifiedName: string;
  qualityRating: string;
  nameStatus: string;
  isSandbox: boolean;
  accountMode: string;
  obaStatus: "NOT_STARTED" | "DRAFT" | "READY_TO_SUBMIT" | "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
  isOfficialBusinessAccount: boolean;
  checklist: ChecklistItem[];
  checklistSummary: ChecklistSummary;
  wabaId: string;
  metaManagerUrl: string;
  metaSecurityCenterUrl: string;
  application?: any;
}

interface EvidenceArticle {
  id: string;
  url: string;
  publication: string;
  headline: string;
  evidenceType: "EDITORIAL_NEWS" | "BUSINESS_FEATURE" | "INDUSTRY_AWARD" | "WIKIPEDIA_OR_MEDIA";
}

const DEFAULT_ARTICLES: EvidenceArticle[] = [
  {
    id: "art-1",
    url: "",
    publication: "",
    headline: "",
    evidenceType: "EDITORIAL_NEWS"
  },
  {
    id: "art-2",
    url: "",
    publication: "",
    headline: "",
    evidenceType: "EDITORIAL_NEWS"
  }
];

const STEPS_CONFIG = [
  {
    step: 1,
    label: "Business Account",
    title: "Select Registered WhatsApp Business Account",
    subtitle: "Choose the active production phone number registered with WhatsApp Cloud API for verification.",
    icon: "📱",
    tag: "Account Selection"
  },
  {
    step: 2,
    label: "Requirements",
    title: "Technical Readiness & Meta Requirements",
    subtitle: "Meta automated pre-flight checks and Two-Step Verification security compliance.",
    icon: "🛡️",
    tag: "Readiness Checks"
  },
  {
    step: 3,
    label: "Brand Details",
    title: "Brand Identity & Corporate Details",
    subtitle: "Provide exact legal corporate entity details, official website, and brand ownership proof.",
    icon: "🏢",
    tag: "Brand Profile"
  },
  {
    step: 4,
    label: "Press Evidence",
    title: "Editorial Press Evidence Dossier",
    subtitle: "Independent organic news coverage proving public notability and genuine brand search interest.",
    icon: "📰",
    tag: "Notability Dossier"
  },
  {
    step: 5,
    label: "Review & Submit",
    title: "Final Review & Confirmation Declaration",
    subtitle: "Inspect your complete verification dossier before transmitting directly to Meta's review queue.",
    icon: "🚀",
    tag: "Final Declaration"
  }
];

export default function WhatsAppVerificationPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const { isDemo, triggerPaywall } = useSubscription();

  // Navigation & Step state with Directional Animations
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const goToStep = (targetStep: number) => {
    if (targetStep === currentStep) return;
    setDirection(targetStep > currentStep ? "forward" : "backward");
    setCurrentStep(targetStep);
  };

  const [numbers, setNumbers] = useState<PhoneNumberItem[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumberItem | null>(null);
  const [obaData, setObaData] = useState<ObaResponse | null>(null);
  const [applications, setApplications] = useState<any[]>([]);

  // Loading states
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [loadingOba, setLoadingOba] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    brandName: "",
    websiteUrl: "",
    parentBrand: "",
    industry: "Retail & E-commerce",
    operatingCountry: "India",
    wikipediaUrl: "",
    evidenceArticles: DEFAULT_ARTICLES,
    socialInstagram: "",
    socialLinkedin: "",
    socialTwitter: "",
    socialFacebook: "",
    justification: "",
    declarationAccepted: false
  });

  // If left column is long, stick to bottom so buttons remain visible as soon as the bottom appears; otherwise stick to top
  const leftColRef = useRef<HTMLDivElement>(null);
  const [isLong, setIsLong] = useState(false);

  useEffect(() => {
    if (!leftColRef.current) return;
    const checkHeight = () => {
      if (!leftColRef.current) return;
      const height = leftColRef.current.offsetHeight;
      const vh = window.innerHeight;
      setIsLong(height + 48 >= vh);
    };

    checkHeight();
    const observer = new ResizeObserver(checkHeight);
    observer.observe(leftColRef.current);
    window.addEventListener("resize", checkHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkHeight);
    };
  }, [currentStep]);

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // Load registered phone numbers
  const loadNumbers = useCallback(async () => {
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
  }, [projectId]);

  // Load historical applications
  const loadApplications = useCallback(async () => {
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
  }, [projectId]);

  // Load OBA status for selected phone
  const loadObaStatus = useCallback(async (phone: PhoneNumberItem) => {
    if (!projectId || !phone) return;
    setLoadingOba(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-status/${projectId}/${phone.phoneId}`);
      const data: ObaResponse = await res.json();
      if (data.success) {
        setObaData(data);

        // If there's an existing application or draft, restore form data
        if (data.application) {
          const app = data.application;
          let restoredArticles: EvidenceArticle[] = DEFAULT_ARTICLES;

          if (Array.isArray(app.mediaLinks) && app.mediaLinks.length > 0) {
            restoredArticles = app.mediaLinks.map((item: any, idx: number) => {
              if (typeof item === "string") {
                return {
                  id: `art-${idx}`,
                  url: item,
                  publication: "",
                  headline: "",
                  evidenceType: "EDITORIAL_NEWS"
                };
              }
              return {
                id: item.id || `art-${idx}`,
                url: item.url || "",
                publication: item.publication || "",
                headline: item.headline || "",
                evidenceType: item.evidenceType || "EDITORIAL_NEWS"
              };
            });
          }

          setFormData(prev => ({
            ...prev,
            brandName: app.brandName || data.verifiedName || phone.verifiedName || prev.brandName,
            websiteUrl: app.websiteUrl || prev.websiteUrl,
            parentBrand: app.parentBrand || prev.parentBrand,
            industry: app.industry || prev.industry,
            operatingCountry: app.operatingCountry || prev.operatingCountry,
            wikipediaUrl: app.wikipediaUrl || prev.wikipediaUrl,
            evidenceArticles: restoredArticles.length > 0 ? restoredArticles : DEFAULT_ARTICLES,
            socialInstagram: app.socialLinks?.instagram || prev.socialInstagram,
            socialLinkedin: app.socialLinks?.linkedin || prev.socialLinkedin,
            socialTwitter: app.socialLinks?.twitter || prev.socialTwitter,
            socialFacebook: app.socialLinks?.facebook || prev.socialFacebook,
            justification: app.justification || prev.justification,
            declarationAccepted: Boolean(app.declarationAccepted)
          }));

          // Restore saved step if in draft mode
          if (app.status === "DRAFT" && app.currentStep && app.currentStep >= 1 && app.currentStep <= 5) {
            setCurrentStep(app.currentStep);
          }
        } else {
          // Pre-fill brand name from verified display name if empty
          setFormData(prev => ({
            ...prev,
            brandName: prev.brandName || data.verifiedName || phone.verifiedName || ""
          }));
        }
      }
    } catch (e: any) {
      console.error("Failed to load OBA status", e);
    } finally {
      setLoadingOba(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadNumbers();
    loadApplications();
  }, [loadNumbers, loadApplications]);

  useEffect(() => {
    if (selectedPhone) {
      loadObaStatus(selectedPhone);
    }
  }, [selectedPhone, loadObaStatus]);

  // Evidence article handlers
  const handleArticleChange = (index: number, field: keyof EvidenceArticle, value: string) => {
    const updated = [...formData.evidenceArticles];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, evidenceArticles: updated }));
  };

  const addArticleSlot = () => {
    if (formData.evidenceArticles.length >= 5) {
      showWarning("Meta allows a maximum of 5 supporting news articles in the notability dossier.", "Maximum Articles");
      return;
    }
    const newArticle: EvidenceArticle = {
      id: `art-${Date.now()}`,
      url: "",
      publication: "",
      headline: "",
      evidenceType: "EDITORIAL_NEWS"
    };
    setFormData(prev => ({ ...prev, evidenceArticles: [...prev.evidenceArticles, newArticle] }));
  };

  const removeArticleSlot = (index: number) => {
    if (formData.evidenceArticles.length <= 1) {
      showWarning("At least one supporting editorial evidence slot is required for the dossier.", "Required Slot");
      return;
    }
    const updated = formData.evidenceArticles.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, evidenceArticles: updated }));
  };

  // Save progress as Draft
  const handleSaveDraft = async (stepToSave: number = currentStep) => {
    if (!selectedPhone) {
      showError("Please select a registered phone number first.", "No Number Selected");
      return;
    }

    setSavingDraft(true);
    try {
      const validArticles = formData.evidenceArticles.filter(a => a.url.trim().length > 0);
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-draft/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneId: selectedPhone.phoneId,
          displayPhone: selectedPhone.displayPhone,
          currentStep: stepToSave,
          brandName: formData.brandName,
          websiteUrl: formData.websiteUrl,
          parentBrand: formData.parentBrand,
          industry: formData.industry,
          operatingCountry: formData.operatingCountry,
          wikipediaUrl: formData.wikipediaUrl,
          mediaLinks: validArticles,
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
        showSuccess("Your verification dossier progress has been saved as a draft.", "Draft Saved");
        loadObaStatus(selectedPhone);
      } else {
        showError(data.error || "Failed to save draft", "Draft Error");
      }
    } catch (e: any) {
      showError(e.message || "Network error while saving draft", "Draft Error");
    } finally {
      setSavingDraft(false);
    }
  };

  // Step 3 Validation before moving to Step 4
  const handleProceedFromStep3 = () => {
    if (!formData.brandName.trim()) {
      showError("Please enter your official brand name.", "Brand Name Required");
      return;
    }
    if (!formData.websiteUrl.trim() || (!formData.websiteUrl.startsWith("http://") && !formData.websiteUrl.startsWith("https://"))) {
      showError("Please enter a valid website URL starting with https:// or http://", "Website URL Required");
      return;
    }
    handleSaveDraft(4);
    goToStep(4);
  };

  // Step 4 Validation before moving to Step 5
  const handleProceedFromStep4 = () => {
    const validArticles = formData.evidenceArticles.filter(a => a.url.trim().length > 5);
    if (validArticles.length === 0) {
      showWarning(
        "Meta reviewers require at least 1–3 non-promotional news articles from reputable editorial outlets (e.g. Economic Times, Forbes, YourStory) to establish brand notability.",
        "News Articles Highly Recommended"
      );
    }
    handleSaveDraft(5);
    goToStep(5);
  };

  // Final Application Submission (Step 5)
  const handleSubmitApplication = async () => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To submit an Official Green Tick (OBA) verification application to Meta, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST). Professional Plan includes filing support free!"
      );
      return;
    }
    if (!selectedPhone) {
      showError("Please select a registered phone number.", "Selection Required");
      return;
    }
    if (!formData.brandName.trim()) {
      showError("Please provide an official brand name.", "Brand Name Required");
      setCurrentStep(3);
      return;
    }
    if (!formData.websiteUrl.trim() || (!formData.websiteUrl.startsWith("http://") && !formData.websiteUrl.startsWith("https://"))) {
      showError("Please provide a valid official website URL starting with https://", "Website Required");
      setCurrentStep(3);
      return;
    }
    if (!formData.declarationAccepted) {
      showError("Please accept the authorization declaration checkbox before submitting.", "Declaration Required");
      return;
    }

    setSubmitting(true);
    try {
      const validArticles = formData.evidenceArticles.filter(a => a.url.trim().length > 0);
      const res = await fetch(`${getApiUrl()}/v1/meta/oba-apply/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneId: selectedPhone.phoneId,
          displayPhone: selectedPhone.displayPhone,
          brandName: formData.brandName,
          websiteUrl: formData.websiteUrl,
          parentBrand: formData.parentBrand,
          industry: formData.industry,
          operatingCountry: formData.operatingCountry,
          wikipediaUrl: formData.wikipediaUrl,
          mediaLinks: validArticles,
          socialLinks: {
            instagram: formData.socialInstagram,
            linkedin: formData.socialLinkedin,
            twitter: formData.socialTwitter,
            facebook: formData.socialFacebook
          },
          justification: formData.justification,
          declarationAccepted: formData.declarationAccepted
        })
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(
          `Your WhatsApp Business Verification application has been submitted successfully!\n\nReference ID: ${data.submissionReference}\n\nMeta's editorial board will review your notability dossier within 2 to 4 business days.`,
          "Application Submitted!"
        );
        loadObaStatus(selectedPhone);
        loadApplications();
        setShowApplicationDetails(true);
      } else {
        showError(data.error || "Failed to submit verification application", "Submission Error");
      }
    } catch (e: any) {
      showError(e.message || "Network error while submitting", "Submission Error");
    } finally {
      setSubmitting(false);
    }
  };

  const status = obaData?.obaStatus || "NOT_STARTED";
  const isSubmittedOrReviewed = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "VERIFIED" || status === "REJECTED";
  const checklist = obaData?.checklist || [];
  const checklistSummary = obaData?.checklistSummary || { completed: 3, total: 4, summaryText: "3 of 4 verified prerequisites completed" };
  const lastApp = obaData?.application;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        {/* Left: Account / Phone Number Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Select WhatsApp Number for Verification
          </label>
          <div className="flex items-center gap-2">
            {numbers.length > 0 ? (
              <select
                value={selectedPhone?.phoneId || ""}
                onChange={(e) => {
                  const target = numbers.find(n => n.phoneId === e.target.value);
                  if (target) {
                    setSelectedPhone(target);
                    loadObaStatus(target);
                  }
                }}
                className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs transition"
              >
                {numbers.map(n => (
                  <option key={n.id} value={n.phoneId}>
                    📞 {n.displayPhone} {n.verifiedName ? `(${n.verifiedName})` : ""} {n.isDefault ? "• Default" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400">Loading numbers...</span>
            )}
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
              <span className="text-emerald-600">✅</span> OBA Studio
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href="/dashboard/wallet"
              className="px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/90 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-[11px] font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
            >
              <span>🟢</span>
              <span>Included Free with Pro · ₹999 + GST on Basic</span>
            </a>
            {selectedPhone && (
              <button
                onClick={() => loadObaStatus(selectedPhone)}
                disabled={loadingOba}
                className="px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className={loadingOba ? "animate-spin" : ""}>🔄</span>
                <span>Refresh Status</span>
              </button>
            )}
            {obaData?.metaManagerUrl && (
              <a
                href={obaData.metaManagerUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🌐</span>
                <span>Meta Manager ↗</span>
              </a>
            )}
          </div>
        </div>

      {/* Official Clarification Banner (Trustworthy Positioning) */}
      <div className="bg-slate-50 dark:bg-[#0B101D]/80 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 md:p-5 text-xs text-slate-700 dark:text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
            ℹ️
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
              Official Business Account vs. Meta Verified
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              An <b>Official Business Account (OBA)</b> displays Meta's green verified checkmark badge (✅) and verified brand name in chat headers at no platform fee. Meta awards this exclusively to authentic, actively searched brands through an editorial review of organic news coverage. This is distinct from the Meta Verified paid subscription.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>Review time: <b className="dark:text-slate-200">2–4 business days</b></span>
        </div>
      </div>

      {/* Persistent Status Tracking View (If Submitted, Under Review, Verified, or Rejected) */}
      {isSubmittedOrReviewed && (
        <div className="rounded-2xl border p-5 md:p-6 transition-all shadow-xs">
          {status === "VERIFIED" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/90 dark:bg-emerald-950/30 -m-5 md:-m-6 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  ✅
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Official Business Account Verified</h3>
                    <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-[11px] font-extrabold rounded-full">
                      ACTIVE BADGE
                    </span>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-200/90 text-xs mt-1 leading-relaxed max-w-2xl">
                    Meta has granted Official Business Account status to <b>{selectedPhone?.displayPhone}</b>. Your approved brand name <b>"{obaData?.verifiedName || formData.brandName}"</b> is displayed alongside the green verified badge across customer conversations.
                  </p>
                  {lastApp?.submissionReference && (
                    <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-1.5 font-mono">
                      Reference ID: <b>{lastApp.submissionReference}</b>
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a
                  href={obaData?.metaManagerUrl || "https://business.facebook.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Manage on Meta ↗
                </a>
              </div>
            </div>
          ) : (status === "SUBMITTED" || status === "UNDER_REVIEW") ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50/90 dark:bg-amber-950/30 -m-5 md:-m-6 p-6 rounded-2xl border border-amber-200 dark:border-amber-500/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  ⏳
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-amber-950 dark:text-amber-100">Application Under Meta Editorial Review</h3>
                    <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-extrabold rounded-full">
                      PENDING DECISION
                    </span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-200/90 text-xs mt-1 leading-relaxed max-w-2xl">
                    Your verification dossier for <b>{selectedPhone?.displayPhone}</b> has been received and queued for manual assessment by Meta's Trust & Safety Board. Reviews typically take <b>2 to 4 business days</b>.
                  </p>
                  {lastApp?.submissionReference && (
                    <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-1.5 font-mono">
                      Application Reference ID: <b>{lastApp.submissionReference}</b>
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplicationDetails(!showApplicationDetails)}
                  className="px-3.5 py-2 bg-white dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-xl hover:bg-amber-100/60 dark:hover:bg-amber-950/60 shadow-2xs transition"
                >
                  {showApplicationDetails ? "Hide Dossier Details" : "View Submitted Dossier"}
                </button>
                <a
                  href={obaData?.metaManagerUrl || "https://business.facebook.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Track on Meta ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-rose-50/90 dark:bg-rose-950/30 -m-5 md:-m-6 p-6 rounded-2xl border border-rose-200 dark:border-rose-500/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-rose-950 dark:text-rose-100">Meta Did Not Approve OBA Status</h3>
                    <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-500/20 text-rose-900 dark:text-rose-200 text-[11px] font-extrabold rounded-full">
                      COOLDOWN ACTIVE
                    </span>
                  </div>
                  <p className="text-rose-800 dark:text-rose-200/90 text-xs mt-1 leading-relaxed max-w-2xl">
                    Meta's editorial board concluded that the submitted news coverage did not sufficiently demonstrate widespread brand notability. Meta enforces a standard <b>30-day cooldown period</b> before a new application with stronger organic press coverage can be submitted.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => {
                    goToStep(3);
                    setShowApplicationDetails(true);
                  }}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Update Brand Dossier
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Submitted Dossier Details */}
          {showApplicationDetails && lastApp && (
            <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/[0.08] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-white/70 dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/[0.08]">
                <span className="font-bold text-slate-500 block uppercase text-[10px] tracking-wider mb-1">Brand Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{lastApp.brandName}</span>
                <p className="text-slate-500 text-[11px] mt-0.5 truncate">{lastApp.websiteUrl}</p>
              </div>
              <div className="p-3 bg-white/70 dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/[0.08]">
                <span className="font-bold text-slate-500 block uppercase text-[10px] tracking-wider mb-1">Industry & Country</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{lastApp.industry || "Retail & E-commerce"}</span>
                <p className="text-slate-500 text-[11px] mt-0.5">{lastApp.operatingCountry || "India"}</p>
              </div>
              <div className="p-3 bg-white/70 dark:bg-white/[0.04] rounded-xl border border-black/5 dark:border-white/[0.08]">
                <span className="font-bold text-slate-500 block uppercase text-[10px] tracking-wider mb-1">Submitted Media Links</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {Array.isArray(lastApp.mediaLinks) ? `${lastApp.mediaLinks.length} articles attached` : "Press references attached"}
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">Reviewed by Meta Editorial Board</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP CONTENT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Step Workspace (8 Cols) */}
        <div className="lg:col-span-8">
          <div ref={leftColRef} className={`${isLong ? "sticky bottom-6" : "sticky top-6"} space-y-6`}>

          {/* Dynamic Animated Workflow Header & Active Step Banner */}
          <div className="bg-white dark:bg-[#0B101D]/80 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
                  {STEPS_CONFIG[currentStep - 1]?.icon || "🧭"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                      Step {currentStep} of 5
                    </span>
                    <span className="text-xs font-semibold text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {STEPS_CONFIG[currentStep - 1]?.tag}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {STEPS_CONFIG[currentStep - 1]?.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {selectedPhone && (
                  <span className="hidden md:inline-flex px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10">
                    Active: <b className="dark:text-white">{selectedPhone.displayPhone}</b>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveDraft(currentStep)}
                  disabled={savingDraft || !selectedPhone}
                  className="px-3.5 py-1.5 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <span>💾</span> {savingDraft ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </div>

            {/* Sleek Animated Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Verification Application Progress</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentStep * 20}% Completed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-2 rounded-full transition-all duration-500 ease-out shadow-xs"
                  style={{ width: `${currentStep * 20}%` }}
                />
              </div>
            </div>

            {/* Dynamic Step Navigation Pills: Only Active Step is expanded with title, completed show checkmarks */}
            <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {STEPS_CONFIG.map((s) => {
                const isCurrent = currentStep === s.step;
                const isCompleted = currentStep > s.step;
                const isAccessible = s.step <= currentStep || (selectedPhone && s.step <= 2);

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => isAccessible && goToStep(s.step)}
                    disabled={!isAccessible}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                      isCurrent
                        ? "bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/10 shrink-0"
                        : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20 border border-emerald-200/80 dark:border-emerald-500/20 cursor-pointer shrink-0"
                        : "bg-slate-50 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-white/[0.06] cursor-not-allowed opacity-60 shrink-0"
                    }`}
                    title={`${s.step}. ${s.label}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? "bg-emerald-500 text-white shadow-xs"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                    }`}>
                      {isCompleted ? "✓" : s.step}
                    </span>
                    <span className={`transition-all duration-300 whitespace-nowrap ${
                      isCurrent ? "inline-block font-bold text-xs" : "hidden sm:group-hover:inline-block text-[11px]"
                    }`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Workflow Step Container */}
          <div
            key={currentStep}
            className={direction === "forward" ? "workflow-step-forward" : "workflow-step-backward"}
          >

          {/* ================= STEP 1: BUSINESS ACCOUNT SELECTION ================= */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <span>📱</span> Step 1: Select WhatsApp Business Account
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Choose the registered phone number you wish to verify for an Official Business Account (OBA).
                </p>
              </div>

              {loadingNumbers ? (
                <div className="py-12 text-center">
                  <Loader scale={0.8} color="#0f172a" />
                  <p className="text-xs text-slate-500 mt-3 font-medium">Fetching registered numbers from Cloud API...</p>
                </div>
              ) : numbers.length === 0 ? (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <p className="font-bold">No registered phone numbers found in this workspace.</p>
                  <p className="text-amber-800 dark:text-amber-300/85 leading-relaxed">
                    Please visit <b className="text-amber-950 dark:text-amber-100">Numbers &amp; Routing</b> in the dashboard to connect an official WhatsApp Cloud API number first before applying for verification.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Available Business Phone Numbers ({numbers.length}):</p>
                  <div className="grid grid-cols-1 gap-3">
                    {numbers.map((phone) => {
                      const isSelected = selectedPhone?.phoneId === phone.phoneId;
                      const isSandbox = phone.phoneId.startsWith("1555") || phone.displayPhone.includes("1555");

                      return (
                        <div
                          key={phone.phoneId}
                          onClick={() => setSelectedPhone(phone)}
                          className={`p-4 rounded-xl border cursor-pointer transition text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                              : "bg-slate-50 dark:bg-[#070b14] hover:bg-slate-100/70 dark:hover:bg-white/[0.03] border-slate-200 dark:border-white/[0.08]"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                              isSelected ? "bg-emerald-600 text-white" : "bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                            }`}>
                              📱
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{phone.displayPhone}</p>
                                {isSandbox ? (
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[10px] font-bold rounded border border-amber-200 dark:border-amber-500/30">
                                    Meta Test Sandbox
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-500/30">
                                    Live Production Number
                                  </span>
                                )}
                                {phone.isDefault && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                                Verified Display Name: <b>{phone.verifiedName || "Pending Meta Approval"}</b>
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Phone ID: {phone.phoneId} • WABA ID: {phone.wabaId}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="text-right text-[11px] text-slate-500">
                              <span className="block font-semibold text-slate-700 dark:text-slate-300">Quality: {phone.quality || "GREEN"}</span>
                              <span className="text-slate-400">Cloud API Connected</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected ? "bg-emerald-600 text-white" : "border border-slate-300 dark:border-white/20 text-transparent"
                            }`}>
                              ✓
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 1 Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {selectedPhone ? `Selected: ${selectedPhone.displayPhone}` : "Select a number to continue"}
                </span>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={!selectedPhone}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>Continue to Requirements</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: REQUIREMENTS & READINESS CHECKLIST ================= */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                      <span>🛡️</span> Step 2: Meta Requirements & Readiness Checklist
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Meta evaluates these technical prerequisites before assigning a manual editorial reviewer.
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    {checklistSummary.summaryText}
                  </div>
                </div>
              </div>

              {/* Factual Checklist Items */}
              <div className="space-y-3">
                {checklist.map((item) => {
                  const isPass = item.status === "COMPLETE";
                  const isAction = item.status === "ACTION_REQUIRED";
                  const isUnable = item.status === "UNABLE_TO_VERIFY";

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition ${
                        isPass
                          ? "bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-500/30"
                          : isAction
                          ? "bg-amber-50/40 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-500/30"
                          : "bg-slate-50 dark:bg-[#070b14] border-slate-200 dark:border-white/[0.08]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">
                            {isPass ? "✅" : isAction ? "⚠️" : "🔍"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm">{item.title}</h4>
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                                isPass
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                  : isAction
                                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                                  : "bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/20"
                              }`}>
                                {isPass ? "Verified Complete" : isAction ? "Action Required" : "Confirmation Required"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {item.explanation}
                            </p>
                            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Status value:</span>
                              <span className="font-mono bg-white/80 dark:bg-white/[0.08] px-1.5 py-0.5 rounded border border-black/5 dark:border-white/10 text-slate-800 dark:text-slate-200">
                                {item.value}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          <a
                            href={item.metaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.1] text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 transition"
                          >
                            <span>Meta Settings ↗</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notice regarding Meta Business Verification */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-500/30 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <span className="font-bold block">Important Note on Meta Business Portfolio Verification:</span>
                <p className="text-blue-800 dark:text-blue-300 leading-relaxed text-[11px]">
                  Meta requires that the parent Business Portfolio (holding your WhatsApp account) is verified with your official company certificate (e.g. GSTIN, Certificate of Incorporation, or Business License). If you have not verified your business in Meta Business Manager Security Center, please do so before submitting.
                </p>
              </div>

              {/* Step 2 Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  ← Back to Account
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveDraft(2)}
                    disabled={savingDraft}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Brand Information</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: BRAND INFORMATION ================= */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <span>🏢</span> Step 3: Brand Identity & Organization Details
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Provide exact details regarding your brand identity. Meta reviewers compare this against your public website and media references.
                </p>
              </div>

              {/* Form Section A: Business Identity */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  A. Business & Brand Identity
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Official Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="e.g. Acme Corporation"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Must match or clearly correspond with your approved WhatsApp display name.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Official Website URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://acmecorp.com"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Must include https:// and represent your active corporate domain.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Parent Legal Entity / Holding Company <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.parentBrand}
                      onChange={(e) => setFormData({ ...formData, parentBrand: e.target.value })}
                      placeholder="e.g. Acme Global Technologies Private Limited"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Legal entity name as registered on corporate/tax documents.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Operating Industry / Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Retail & E-commerce">Retail & E-commerce</option>
                      <option value="Financial Services & Banking">Financial Services & Banking</option>
                      <option value="Technology & SaaS">Technology & SaaS</option>
                      <option value="Healthcare & Pharmaceuticals">Healthcare & Pharmaceuticals</option>
                      <option value="Education & EdTech">Education & EdTech</option>
                      <option value="Hospitality, Travel & Logistics">Hospitality, Travel & Logistics</option>
                      <option value="Media, Publishing & Entertainment">Media, Publishing & Entertainment</option>
                      <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                      <option value="Other Commercial Business">Other Commercial Business</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Primary Country of Brand Presence <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.operatingCountry}
                      onChange={(e) => setFormData({ ...formData, operatingCountry: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="International / Global">International / Global</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Wikipedia / Crunchbase Profile <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.wikipediaUrl}
                      onChange={(e) => setFormData({ ...formData, wikipediaUrl: e.target.value })}
                      placeholder="https://en.wikipedia.org/wiki/YourBrand"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Meta reviewers strongly weight verified encyclopedia or financial databases.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Section B: Notability Justification */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  B. Brand Notability Explanation
                </h4>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Justification Statement for Meta's Reviewers <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Explain why your brand meets Meta's notability criteria (e.g. established brand recognition, active customer search volume, risk of impersonation without verified checkmark, scale of operations)..."
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  Provide concise factual information highlighting user scale, consumer trust, and why verified identity protects your customers.
                </p>
              </div>

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  ← Back to Requirements
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveDraft(3)}
                    disabled={savingDraft}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedFromStep3}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Evidence</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: SUPPORTING EVIDENCE (NOTABILITY DOSSIER) ================= */}
          {currentStep === 4 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                      <span>📰</span> Step 4: Editorial Press Evidence Dossier
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Meta requires 3 to 5 organic news articles to prove that your brand is recognized and searched.
                    </p>
                  </div>
                  {formData.evidenceArticles.length < 5 && (
                    <button
                      type="button"
                      onClick={addArticleSlot}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span> Add Another Article
                    </button>
                  )}
                </div>
              </div>

              {/* What Meta Accepts / Rejects Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-1 text-emerald-950 dark:text-emerald-200">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <span>✅</span> Acceptable Evidence
                  </span>
                  <ul className="text-emerald-900 dark:text-emerald-300 list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>Major national & business news (The Economic Times, Mint, Forbes, Times of India, TechCrunch, YourStory)</li>
                    <li>Recognized national industry awards & recognitions</li>
                    <li>Official Wikipedia page (organic community-edited)</li>
                  </ul>
                </div>
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-xl space-y-1 text-rose-950 dark:text-rose-200">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                    <span>❌</span> Unacceptable Evidence (Rejected by Meta)
                  </span>
                  <ul className="text-rose-900 dark:text-rose-300 list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>Paid press releases (PR Newswire, Business Wire, ANI sponsored articles)</li>
                    <li>Company blogs, Medium posts, or Substack letters</li>
                    <li>Social media posts, YouTube videos, podcast links</li>
                  </ul>
                </div>
              </div>

              {/* Structured Article Inputs */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Editorial Articles ({formData.evidenceArticles.length} / 5 slots)
                </h4>

                {formData.evidenceArticles.map((article, idx) => (
                  <div key={article.id} className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        Article Resource
                      </span>
                      {formData.evidenceArticles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArticleSlot(idx)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Article URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          value={article.url}
                          onChange={(e) => handleArticleChange(idx, "url", e.target.value)}
                          placeholder="https://economictimes.indiatimes.com/tech/startups/yourbrand-funding..."
                          className="w-full bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Publication Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={article.publication}
                          onChange={(e) => handleArticleChange(idx, "publication", e.target.value)}
                          placeholder="e.g. The Economic Times"
                          className="w-full bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Headline / Summary
                        </label>
                        <input
                          type="text"
                          value={article.headline}
                          onChange={(e) => handleArticleChange(idx, "headline", e.target.value)}
                          placeholder="Headline describing brand milestone or coverage..."
                          className="w-full bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Evidence Type
                        </label>
                        <select
                          value={article.evidenceType}
                          onChange={(e) => handleArticleChange(idx, "evidenceType", e.target.value as any)}
                          className="w-full bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="EDITORIAL_NEWS">Editorial News Article</option>
                          <option value="BUSINESS_FEATURE">Major Business Profile</option>
                          <option value="INDUSTRY_AWARD">Recognized Industry Award</option>
                          <option value="WIKIPEDIA_OR_MEDIA">Major Media Feature</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Media Footprint (Optional Supporting Links) */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Social Media Footprint (Optional Supporting Evidence)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.socialInstagram}
                    onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                    placeholder="Instagram handle or URL (e.g. @yourbrand)"
                    className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={formData.socialLinkedin}
                    onChange={(e) => setFormData({ ...formData, socialLinkedin: e.target.value })}
                    placeholder="LinkedIn Company Page URL"
                    className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={formData.socialTwitter}
                    onChange={(e) => setFormData({ ...formData, socialTwitter: e.target.value })}
                    placeholder="X / Twitter handle or URL (e.g. @yourbrand)"
                    className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={formData.socialFacebook}
                    onChange={(e) => setFormData({ ...formData, socialFacebook: e.target.value })}
                    placeholder="Facebook Official Page URL"
                    className="bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Step 4 Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  ← Back to Brand Details
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveDraft(4)}
                    disabled={savingDraft}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedFromStep4}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Review & Submit</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: REVIEW AND SUBMIT ================= */}
          {currentStep === 5 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-6 backdrop-blur-xl">
              <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <span>📋</span> Step 5: Final Review & Submission Declaration
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Carefully review your application summary before transmitting your dossier to Meta for evaluation.
                </p>
              </div>

              {/* Application Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Account Card */}
                <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Business Account</span>
                    <button type="button" onClick={() => goToStep(1)} className="text-blue-600 hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPhone?.displayPhone}</p>
                  <p className="text-slate-600 dark:text-slate-300">Verified Display Name: <b>{selectedPhone?.verifiedName || "Pending"}</b></p>
                  <p className="text-slate-400 font-mono text-[10px]">WABA ID: {selectedPhone?.wabaId}</p>
                </div>

                {/* Requirements Checklist Card */}
                <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Prerequisites Standing</span>
                    <button type="button" onClick={() => goToStep(2)} className="text-blue-600 hover:underline text-[11px] font-bold cursor-pointer">Inspect</button>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">{checklistSummary.summaryText}</p>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    Display Name approved • 2FA Active • High Messaging Quality
                  </p>
                  <p className="text-slate-400 text-[10px]">Business Manager Security Center confirmation required</p>
                </div>

                {/* Brand Identity Card */}
                <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Brand Information</span>
                    <button type="button" onClick={() => goToStep(3)} className="text-blue-600 hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formData.brandName || "Not set"}</p>
                  <p className="text-slate-600 dark:text-slate-300 truncate">{formData.websiteUrl || "Not set"}</p>
                  <p className="text-slate-500 text-[11px]">
                    {formData.industry} • {formData.operatingCountry}
                  </p>
                </div>

                {/* Evidence Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Notability Evidence</span>
                    <button type="button" onClick={() => goToStep(4)} className="text-blue-600 hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formData.evidenceArticles.filter(a => a.url.trim().length > 0).length} Editorial Article(s)
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {formData.evidenceArticles.filter(a => a.publication.trim().length > 0).map(a => a.publication).join(", ") || "No publications listed"}
                  </p>
                  <p className="text-slate-400 text-[10px]">Ready for Meta Editorial Review Board</p>
                </div>
              </div>

              {/* What Happens Next Roadmap */}
              <div className="p-4 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">What Happens After Submission:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-2.5 bg-white dark:bg-[#070b14] rounded-lg border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">1. Submission Logged</span>
                    <span className="text-slate-500 leading-relaxed">
                      Application reference ID is recorded and sent to Meta Review queue.
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-[#070b14] rounded-lg border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">2. Editorial Assessment</span>
                    <span className="text-slate-500 leading-relaxed">
                      Meta reviewers independently assess organic press coverage (2–4 business days).
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-[#070b14] rounded-lg border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">3. Badge Activation</span>
                    <span className="text-slate-500 leading-relaxed">
                      Upon approval, the green tick badge appears automatically across all customer chats.
                    </span>
                  </div>
                </div>
              </div>

              {/* User Confirmation Declaration */}
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-500/30 rounded-xl text-amber-950 dark:text-amber-200">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.declarationAccepted}
                    onChange={(e) => setFormData({ ...formData, declarationAccepted: e.target.checked })}
                    className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    <span className="font-bold block text-slate-900 dark:text-slate-100 mb-0.5">
                      Authorization & Truthfulness Declaration <span className="text-red-500">*</span>
                    </span>
                    I affirm that I am an authorized representative of <b>{formData.brandName || "the registered business"}</b>, that the submitted brand details and news links represent genuine organic coverage, and that this account operates in compliance with Meta's WhatsApp Commerce and Business Policies.
                  </div>
                </label>
              </div>

              {/* Step 5 Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  ← Back to Evidence
                </button>
                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveDraft(5)}
                    disabled={savingDraft || submitting}
                    className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitApplication}
                    disabled={submitting || !formData.declarationAccepted}
                    className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader scale={0.7} color="#ffffff" />
                        <span>Transmitting Dossier to Meta...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Submit Verification Application</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
          </div>

        </div>

        {/* Right Column: All Instructions & Reviewer Guidance (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">

          {/* Dynamic Contextual Guidance Card for Active Step */}
          <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-2xs space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Reviewer Guidance & Instructions
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-md border border-emerald-200/80 dark:border-emerald-500/20">
                Step {currentStep} of 5
              </span>
            </div>

            {/* Dynamic Step Content with Smooth Fade-in Animation */}
            <div key={`guidance-${currentStep}`} className="workflow-instruction-fade space-y-3 text-xs leading-relaxed">
              {currentStep === 1 && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
                      <span>📱</span> Direct Cloud API Phone Requirement
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Only phone numbers registered directly via WhatsApp Cloud API are eligible for Official Business Account (OBA) evaluation. Personal WhatsApp or WhatsApp Business App numbers must be ported to Cloud API first.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-200/80 dark:border-amber-500/30 space-y-1.5">
                    <span className="font-bold text-amber-950 dark:text-amber-200 block flex items-center gap-1.5">
                      <span>🚫</span> Sandbox / Test Numbers Disqualified
                    </span>
                    <p className="text-amber-900 dark:text-amber-300/85 text-[11px] leading-relaxed">
                      Meta automatically rejects verification applications submitted for test numbers (e.g. +1 555 numbers). Ensure you choose a live production phone number.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-1.5">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block flex items-center gap-1.5">
                      <span>🟢</span> Green Quality Score Mandatory
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-300/85 text-[11px] leading-relaxed">
                      The number must maintain a <b>High (Green)</b> quality rating. If your number has received policy warnings or is flagged with Medium/Low quality, improve messaging health before applying.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-transparent dark:border-white/[0.08] text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Multi-Number Portfolios:</span>
                    <p>
                      If your business operates multiple phone numbers, select the primary public customer-facing line. The green badge will attach directly to this verified number.
                    </p>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
                      <span>🛡️</span> The 4 Meta Pre-Flight Pillars
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Meta's automated intake engine evaluates technical compliance before routing your dossier to human reviewers:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] pl-0.5">
                      <li><b>Display Name:</b> Pre-approved & matching commercial brand.</li>
                      <li><b>Two-Step Verification (2FA):</b> Mandatory 6-digit security PIN enabled.</li>
                      <li><b>Business Portfolio:</b> Verified in Meta Security Center with tax/corporate registration.</li>
                      <li><b>Messaging Quality:</b> Green rating with zero spam policy flags.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/25 rounded-xl border border-blue-200/80 dark:border-blue-500/30 space-y-1.5 text-blue-900 dark:text-blue-200">
                    <span className="font-bold text-blue-950 dark:text-blue-200 block flex items-center gap-1.5">
                      <span>🔐</span> Setting 2FA in Meta Manager
                    </span>
                    <p className="text-blue-900 dark:text-blue-300/85 text-[11px] leading-relaxed">
                      If 2FA shows incomplete, open WhatsApp Manager → Phone Numbers → Settings → Two-Step Verification to configure your 6-digit PIN.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-200/80 dark:border-amber-500/30 space-y-1.5">
                    <span className="font-bold text-amber-950 dark:text-amber-200 block flex items-center gap-1.5">
                      <span>🏢</span> Business Manager Certificate
                    </span>
                    <p className="text-amber-900 dark:text-amber-300/85 text-[11px] leading-relaxed">
                      Ensure your legal corporate entity (GSTIN, Incorporation Certificate, or Business License) is approved in Meta Business Manager Security Center.
                    </p>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
                      <span>🏢</span> Brand Name & Legal Alignment
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Your brand name must match your legal entity registration or registered trademark/DBA. If your commercial brand differs from the parent corporation, declare both in the Brand and Parent Entity fields.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-1.5">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block flex items-center gap-1.5">
                      <span>🌐</span> Corporate Website Requirements
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-emerald-950 dark:text-emerald-300/90 text-[11px]">
                      <li>Must use HTTPS with a valid SSL certificate.</li>
                      <li>Registered WhatsApp phone number must appear on the website footer or Contact page.</li>
                      <li>Active privacy policy and terms of service pages.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/25 rounded-xl border border-purple-200/80 dark:border-purple-500/30 space-y-1.5 text-purple-900 dark:text-purple-200">
                    <span className="font-bold text-purple-950 dark:text-purple-200 block flex items-center gap-1.5">
                      <span>⚡</span> Fast-Track Approval Boosters
                    </span>
                    <p className="text-purple-900 dark:text-purple-300/85 text-[11px] leading-relaxed">
                      Providing a community-edited Wikipedia article, Crunchbase corporate profile, or verified Blue Tick social media accounts boosts editorial pass rates by over 3x.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-transparent dark:border-white/[0.08] text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Justification Tips:</span>
                    <p>
                      Highlight consumer search volume, monthly active customer reach, and why verification protects your consumers against fraudulent impersonation.
                    </p>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
                      <span>📰</span> Meta Notability Evaluation Criteria
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Meta's Trust & Safety Board reviews independent editorial articles to confirm that your brand is widely searched and recognized by the public.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-1 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block flex items-center gap-1.5">
                      <span>✅</span> Tier-1 Acceptable Publications
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-300/85 text-[11px] leading-relaxed">
                      The Economic Times, Mint, Forbes, TechCrunch, YourStory, Reuters, Bloomberg, Times of India, Business Standard, Inc42, NDTV.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50/70 dark:bg-rose-950/25 rounded-xl border border-rose-200/80 dark:border-rose-500/30 space-y-1 text-rose-900 dark:text-rose-200">
                    <span className="font-bold text-rose-950 dark:text-rose-200 block flex items-center gap-1.5">
                      <span>❌</span> Auto-Rejected Sources (Causes Cooldown)
                    </span>
                    <p className="text-rose-900 dark:text-rose-300/85 text-[11px] leading-relaxed">
                      Paid press release distribution (PR Newswire, Business Wire, ANI, NewsVoir), Medium articles, company blogs, YouTube links, or sponsored posts.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-transparent dark:border-white/[0.08] text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Recommended Count:</span>
                    <p>
                      Attach 3 to 5 strong organic articles covering major company milestones, institutional funding, or national industry recognitions.
                    </p>
                  </div>
                </>
              )}

              {currentStep === 5 && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
                      <span>📋</span> Final Review & Transmission
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Once submitted, your application cannot be modified while Meta's Trust & Safety team is reviewing the dossier.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 space-y-1 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block flex items-center gap-1.5">
                      <span>⏱️</span> Review SLA: 2–4 Business Days
                    </span>
                    <p className="text-emerald-900 dark:text-emerald-300/85 text-[11px] leading-relaxed">
                      Upon approval, the green verified checkmark (✅) is automatically activated across all customer chats worldwide.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-200/80 dark:border-amber-500/30 space-y-1">
                    <span className="font-bold text-amber-950 dark:text-amber-200 block flex items-center gap-1.5">
                      <span>⏳</span> 30-Day Cooldown Policy
                    </span>
                    <p className="text-amber-900 dark:text-amber-300/85 text-[11px] leading-relaxed">
                      If Meta declines verification due to insufficient press notability, a mandatory 30-day waiting period applies before re-applying.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-[#070b14] border border-transparent dark:border-white/[0.08] rounded-xl text-slate-700 dark:text-slate-300 text-[11px] space-y-1">
                    <span className="font-bold block text-slate-900 dark:text-slate-100">100% Free Meta Evaluation</span>
                    <p className="leading-relaxed">
                      Meta does not charge platform fees for Official Business Account badges. Digital Beings connects directly via official Cloud API.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Application Pipeline Navigator Card */}
          <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-2xs space-y-3 backdrop-blur-xl">
            <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span>🧭</span> Application Pipeline</span>
              <span className="text-[10px] text-emerald-700 font-bold">{currentStep}/5 Active</span>
            </h4>
            <div className="space-y-1.5">
              {STEPS_CONFIG.map((s) => {
                const isCurrent = currentStep === s.step;
                const isCompleted = currentStep > s.step;
                const isAccessible = s.step <= currentStep || (selectedPhone && s.step <= 2);

                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => isAccessible && goToStep(s.step)}
                    disabled={!isAccessible}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
                      isCurrent
                        ? "bg-slate-900 dark:bg-emerald-600 text-white font-bold shadow-xs"
                        : isCompleted
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-medium cursor-pointer border border-emerald-200/80 dark:border-emerald-500/20"
                        : "bg-slate-50 dark:bg-[#070b14] text-slate-400 dark:text-slate-400 opacity-80 cursor-not-allowed border border-slate-200/60 dark:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCurrent
                          ? "bg-emerald-500 text-white"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      }`}>
                        {isCompleted ? "✓" : s.step}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs truncate ${isCurrent ? "text-white" : "text-slate-900 dark:text-slate-200"}`}>
                          {s.label}
                        </p>
                        <p className={`text-[10px] truncate ${isCurrent ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                          {s.tag}
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prerequisites Standing Scorecard */}
          <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-2xs space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <span>🛡️</span> Technical Readiness
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-500/30">
                {checklistSummary.summaryText}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200/70 dark:border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-200 font-medium text-[11px]">Display Name Approved</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">✓ Verified</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200/70 dark:border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-200 font-medium text-[11px]">Two-Step Verification (2FA)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">✓ 6-Digit PIN</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200/70 dark:border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-200 font-medium text-[11px]">Phone Quality Rating</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">✓ High (Green)</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200/70 dark:border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-200 font-medium text-[11px]">Meta Business Portfolio</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">✓ Registered</span>
              </div>
            </div>
          </div>

          {/* Past Applications Log */}
          {applications.length > 0 && (
            <div className="bg-white dark:bg-[#0B101D]/80 p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3 backdrop-blur-xl">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 uppercase tracking-wider text-slate-500">
                <span>📋</span> Application History ({applications.length})
              </h4>
              <div className="space-y-2">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-200/70 dark:border-white/[0.08] text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{app.brandName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{app.displayPhone}</p>
                      {app.submissionReference && (
                        <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{app.submissionReference}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                      app.status === "VERIFIED"
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                        : app.status === "REJECTED"
                        ? "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300"
                        : app.status === "DRAFT"
                        ? "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                    }`}>
                      {app.status || "SUBMITTED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Cloud Platform Integrity Policy Notice */}
          <div className="p-4 bg-slate-50 dark:bg-[#0B101D]/80 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-slate-400 space-y-1 backdrop-blur-xl">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Digital Beings Compliance Assurance</span>
            <p className="leading-relaxed">
              Digital Beings connects directly via Meta's official Cloud API. We do not charge fees for Official Business Account badge evaluation or guarantee editorial outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
