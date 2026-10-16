"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import Loader from "@/components/Loader";
import TokenUpdateModal from "@/components/TokenUpdateModal";

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  buttons?: Array<{
    type: "URL" | "QUICK_REPLY" | "OTP" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
    otp_type?: string;
  }>;
}

interface TemplateItem {
  id: string;
  name: string;
  category: "AUTHENTICATION" | "MARKETING" | "UTILITY";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  components: TemplateComponent[];
}

export interface VariableDef {
  name: string;
  label: string;
  sampleValue: string;
}

export default function TemplatesPage() {
  const { showModal, showSuccess, showError, showConfirm, showLoading } = useModal();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [wabaId, setWabaId] = useState<string>("");
  // Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"live" | "raw">("live");

  // Ref to textarea for cursor-based variable insertion
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "MARKETING" as "AUTHENTICATION" | "MARKETING" | "UTILITY",
    language: "en_US",
    headerType: "NONE" as "NONE" | "TEXT" | "IMAGE",
    headerText: "",
    bodyText: "Hello {{Customer_Name}}, thank you for your order! Your confirmation code is {{Order_ID}}.",
    footerText: "Reply STOP to unsubscribe",
    buttonType: "URL" as "NONE" | "URL" | "QUICK_REPLY" | "OTP",
    buttonText: "Visit Website",
    buttonUrl: "https://digitalbeings.in"
  });

  // Dynamic variable definitions (labels and sample preview values)
  const [variableDefs, setVariableDefs] = useState<Record<string, VariableDef>>({
    Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Rahul Sharma" },
    Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "ORD-9481" }
  });

  // Saved template variables from backend / localStorage
  const [savedTemplateVars, setSavedTemplateVars] = useState<Record<string, Array<{ index: number; name: string; label: string; sampleValue: string }>>>({});

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  // Helper: Smart default label and sample based on variable placeholder name
  const getSmartDefaults = (varName: string) => {
    const lower = varName.toLowerCase();
    let label = varName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim();
    label = label.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    let sampleValue = "Sample Value";
    if (/name|customer|user|client/i.test(lower)) {
      sampleValue = "Rahul Sharma";
      if (!label || label === "1") label = "Customer Name";
    } else if (/order|invoice|bill/i.test(lower)) {
      sampleValue = "ORD-9481";
      if (!label || label === "2") label = "Order ID";
    } else if (/discount|offer|percent|coupon/i.test(lower)) {
      sampleValue = "25% OFF";
      if (!label) label = "Offer / Discount";
    } else if (/address|city|loc/i.test(lower)) {
      sampleValue = "Flat 402, Green Avenue, Mumbai";
      if (!label) label = "Delivery Address";
    } else if (/amount|price|total|cost|fee/i.test(lower)) {
      sampleValue = "₹1,499";
      if (!label) label = "Total Amount";
    } else if (/date|time|day/i.test(lower)) {
      sampleValue = "24 Oct 2026";
      if (!label) label = "Date";
    } else if (/product|item/i.test(lower)) {
      sampleValue = "Wireless Earbuds";
      if (!label) label = "Product Name";
    } else if (/code|otp|pin/i.test(lower)) {
      sampleValue = "849201";
      if (!label) label = "Verification Code";
    } else if (/link|url/i.test(lower)) {
      sampleValue = "https://digitalbeings.in/track";
      if (!label) label = "Tracking Link";
    } else if (/^\d+$/.test(varName)) {
      label = `Variable ${varName}`;
      sampleValue = `Value ${varName}`;
    }
    return { label, sampleValue };
  };

  // Close modal on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    if (showCreateModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCreateModal]);

  // Detect all unique {{...}} placeholders in bodyText (strictly letters, numbers, underscores)
  const detectedVariables = useMemo(() => {
    const matches = formData.bodyText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (!matches) return [];
    const unique = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, "").trim())));
    return unique;
  }, [formData.bodyText]);

  // Insert variable at cursor position in textarea without creating nested brackets
  const insertVariableAtCursor = (varName: string, isCustom = false) => {
    const textarea = bodyTextareaRef.current;
    const placeholder = isCustom ? "Custom_Field" : varName;
    const insertion = `{{${placeholder}}}`;

    if (!textarea) {
      setFormData(prev => ({ ...prev, bodyText: prev.bodyText + ` ${insertion}` }));
      return;
    }

    let start = textarea.selectionStart ?? textarea.value.length;
    let end = textarea.selectionEnd ?? textarea.value.length;
    const text = textarea.value;

    // Check if cursor or selection is already touching or inside brackets like {{...}}
    let before = text.substring(0, start);
    let after = text.substring(end);

    // If selection is already surrounded by braces, expand replace range to consume outer braces
    while (before.endsWith("{") && after.startsWith("}")) {
      before = before.slice(0, -1);
      after = after.slice(1);
      start -= 1;
      end += 1;
    }

    const newText = text.substring(0, start) + insertion + text.substring(end);
    setFormData(prev => ({ ...prev, bodyText: newText }));

    // Initialize in variableDefs if not already
    setVariableDefs(prev => {
      if (prev[placeholder]) return prev;
      const defaults = getSmartDefaults(placeholder);
      return {
        ...prev,
        [placeholder]: {
          name: placeholder,
          label: defaults.label,
          sampleValue: defaults.sampleValue
        }
      };
    });

    setTimeout(() => {
      textarea.focus();
      if (isCustom) {
        // Place cursor / selection right on "Custom_Field" between the {{ and }}
        textarea.setSelectionRange(start + 2, start + 2 + placeholder.length);
      } else {
        // Place cursor immediately after the inserted variable
        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      }
    }, 50);
  };

  // Generate live preview text with sample values substituted
  const livePreviewBodyText = useMemo(() => {
    let text = formData.bodyText;
    if (previewMode === "live") {
      detectedVariables.forEach(v => {
        const def = variableDefs[v];
        const val = def?.sampleValue || getSmartDefaults(v).sampleValue;
        text = text.replaceAll(`{{${v}}}`, val);
      });
      // Clean up any remaining malformed braces for preview
      text = text.replace(/\{+/g, "").replace(/\}+/g, "");
    }
    return text;
  }, [formData.bodyText, detectedVariables, variableDefs, previewMode]);

  const loadTemplates = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        if (data.wabaId) setWabaId(data.wabaId);
      } else {
        setError(data.error || "Failed to load templates from Meta");
      }

      // Also load template variables mapping
      try {
        const varRes = await fetch(`${getApiUrl()}/v1/meta/template-variables/${projectId}`);
        const varData = await varRes.json();
        if (varData.success && varData.variables) {
          setSavedTemplateVars(varData.variables);
        }
      } catch (err) {}
    } catch (e: any) {
      setError(e.message || "Network error loading templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const handleDelete = (name: string, id?: string) => {
    const isProtected = name.toLowerCase() === "hello_world" || name.toLowerCase().startsWith("sample_");
    if (isProtected) {
      showError(
        `"${name}" is a default template created by Meta WhatsApp. Meta locks default templates and does not permit them to be deleted.`,
        "Protected System Template"
      );
      return;
    }

    showModal({
      title: "Delete WhatsApp Template?",
      type: "warning",
      confirmVariant: "danger",
      loaderVariant: "bubble",
      badge: "Permanent Action",
      message: `Are you sure you want to delete template "${name}" from your Meta WhatsApp account?`,
      details: [
        { label: "Template Name", value: name },
        { label: "Template ID", value: id || "N/A" },
        { label: "WABA ID", value: wabaId || "2107898293422238" }
      ],
      note: "Once deleted from Meta, any active marketing campaigns or OTP dispatch using this template name will immediately fail.",
      confirmText: "Yes, Delete Template",
      cancelText: "Cancel",
      loadingTitle: `Deleting Template "${name}"...`,
      loadingMessage: `Communicating with Meta WhatsApp Cloud API to permanently delete "${name}". Please wait...`,
      onConfirm: async () => {
        try {
          const query = id ? `?hsm_id=${encodeURIComponent(id)}` : "";
          const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}/${encodeURIComponent(name)}${query}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
            try {
              localStorage.removeItem(`tpl_vars_${name}`);
            } catch (e) {}
            showSuccess(`Template "${name}" has been deleted successfully from Meta.`, "Template Deleted");
            loadTemplates();
          } else {
            showError(data.error || "Failed to delete template", "Deletion Error");
          }
        } catch (e: any) {
          showError(e.message || "Network error deleting template", "Deletion Error");
        }
      }
    });
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Build components according to Meta Graph API spec
    const components: any[] = [];

    // Header
    if (formData.headerType === "TEXT" && formData.headerText) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: formData.headerText
      });
    } else if (formData.headerType === "IMAGE") {
      components.push({
        type: "HEADER",
        format: "IMAGE"
      });
    }

    // Body
    let finalVarDefs: Array<{ index: number; name: string; label: string; sampleValue: string }> = [];

    if (formData.category === "AUTHENTICATION") {
      components.push({
        type: "BODY",
        add_security_recommendation: true
      });
      components.push({
        type: "BUTTONS",
        buttons: [
          {
            type: "OTP",
            otp_type: "COPY_CODE",
            text: "Copy Code"
          }
        ]
      });
    } else {
      // Convert custom named brackets e.g. {{Customer_Name}} -> {{1}}, {{Order_ID}} -> {{2}}
      let metaBodyText = formData.bodyText;
      const samplesArray: string[] = [];

      detectedVariables.forEach((v, idx) => {
        const metaIdx = idx + 1;
        const currentDef = variableDefs[v] || getSmartDefaults(v);
        const sample = currentDef.sampleValue.trim() || `Sample ${metaIdx}`;
        samplesArray.push(sample);
        finalVarDefs.push({
          index: metaIdx,
          name: v,
          label: currentDef.label || v,
          sampleValue: sample
        });
        // Replace all occurrences of {{v}} with {{metaIdx}}
        metaBodyText = metaBodyText.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), `{{${metaIdx}}}`);
      });

      const bodyComponent: any = {
        type: "BODY",
        text: metaBodyText
      };

      // Meta Cloud API strictly requires example.body_text when positional variables exist
      if (samplesArray.length > 0) {
        bodyComponent.example = {
          body_text: [samplesArray]
        };
      }

      components.push(bodyComponent);

      // Footer
      if (formData.footerText) {
        components.push({
          type: "FOOTER",
          text: formData.footerText
        });
      }

      // Buttons
      if (formData.buttonType === "URL" && formData.buttonText && formData.buttonUrl) {
        components.push({
          type: "BUTTONS",
          buttons: [
            {
              type: "URL",
              text: formData.buttonText,
              url: formData.buttonUrl
            }
          ]
        });
      } else if (formData.buttonType === "QUICK_REPLY" && formData.buttonText) {
        components.push({
          type: "BUTTONS",
          buttons: [
            {
              type: "QUICK_REPLY",
              text: formData.buttonText
            }
          ]
        });
      }
    }

    try {
      setShowCreateModal(false);
      showLoading(
        `Registering template "${formData.name}" with WhatsApp Cloud API. Meta AI is validating message structure...`,
        "Submitting Template to Meta..."
      );

      const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          language: formData.language,
          components
        })
      });

      const data = await res.json();
      if (data.success) {
        // Persist variable mapping locally and in backend
        if (finalVarDefs.length > 0) {
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(`tpl_vars_${formData.name}`, JSON.stringify(finalVarDefs));
            }
            await fetch(`${getApiUrl()}/v1/meta/template-variables/${projectId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                templateName: formData.name,
                variables: finalVarDefs
              })
            });
            setSavedTemplateVars(prev => ({
              ...prev,
              [formData.name]: finalVarDefs
            }));
          } catch (varSaveErr) {
            console.warn("Could not persist template variables:", varSaveErr);
          }
        }

        showModal({
          title: "Template Submitted to Meta",
          type: "success",
          badge: "Under Review • Meta AI",
          message: `Template "${formData.name}" was successfully registered with WhatsApp Cloud API.`,
          details: [
            { label: "Template Name", value: formData.name },
            { label: "Category", value: formData.category },
            { label: "Language", value: formData.language },
            { label: "Mapped Variables", value: finalVarDefs.length > 0 ? `${finalVarDefs.length} Dynamic Fields` : "None" }
          ],
          note: "Meta AI automatically reviews standard and authentication templates within minutes. You can click 'Refresh Status' anytime to check progress.",
          confirmText: "Back to Templates"
        });
        setFormData({
          name: "",
          category: "MARKETING",
          language: "en_US",
          headerType: "NONE",
          headerText: "",
          bodyText: "Hello {{Customer_Name}}, thank you for your order! Your confirmation code is {{Order_ID}}.",
          footerText: "Reply STOP to unsubscribe",
          buttonType: "URL",
          buttonText: "Visit Website",
          buttonUrl: "https://digitalbeings.in"
        });
        loadTemplates();
      } else {
        setSubmitError(data.error || "Meta rejected template creation");
      }
    } catch (e: any) {
      setSubmitError(e.message || "Failed to submit template");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap shrink-0 leading-tight">
            <span>✓</span>
            <span>APPROVED</span>
          </span>
        );
      case "PENDING":
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse whitespace-nowrap shrink-0 leading-tight">
            <span>⏳</span>
            <span>IN REVIEW</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-800 border border-red-300 whitespace-nowrap shrink-0 leading-tight">
            <span>✕</span>
            <span>REJECTED</span>
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 whitespace-nowrap shrink-0 leading-tight">
            <span>⏸</span>
            <span>PAUSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-800 whitespace-nowrap shrink-0 leading-tight">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "AUTHENTICATION":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">OTP / Auth</span>;
      case "MARKETING":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200">Marketing</span>;
      case "UTILITY":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">Utility</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-700">{category}</span>;
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Template Studio & Meta Approval</h1>
          <p className="text-slate-500 text-sm">Create and submit WhatsApp message templates directly to Meta for instant approval.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTokenModal(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <span>🔑</span> Meta Token
          </button>
          <button
            onClick={loadTemplates}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm"
          >
            🔄 Refresh Status
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> Create Template
          </button>
        </div>
      </div>

      {error && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-extrabold text-red-900 text-sm">Meta WhatsApp API Error</p>
              <p className="text-red-700 text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTokenModal(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
          >
            <span>🔑</span> Update Access Token
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Search templates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="AUTHENTICATION">Authentication / OTP</option>
            <option value="MARKETING">Marketing</option>
            <option value="UTILITY">Utility</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">In Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Loader scale={0.95} color="#0f172a" />
          <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing templates from Meta Graph API...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-slate-600 font-medium">No templates found matching your criteria.</p>
          <p className="text-xs text-slate-400">Click "+ Create Template" to design a message and submit it to Meta for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const header = template.components?.find(c => c.type === "HEADER");
            const body = template.components?.find(c => c.type === "BODY");
            const footer = template.components?.find(c => c.type === "FOOTER");
            const buttonsComp = template.components?.find(c => c.type === "BUTTONS");

            return (
              <div key={template.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex-1 min-w-0 pr-1">
                      <h3
                        className="font-bold text-slate-900 text-sm leading-snug break-words"
                        title={template.name}
                        style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                      >
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {getCategoryBadge(template.category)}
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{template.language}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center pt-0.5">
                      {getStatusBadge(template.status)}
                    </div>
                  </div>

                  {/* Message Bubble Preview */}
                  <div className="bg-[#EFEAE2] p-3 rounded-xl border border-slate-200 text-slate-800 text-xs space-y-2 mt-2 font-sans relative">
                    {header && (
                      <div className="font-bold text-slate-900 border-b border-black/10 pb-1">
                        {header.format === "IMAGE" ? "📷 [Image Header]" : header.text}
                      </div>
                    )}
                    <div className="whitespace-pre-line leading-relaxed text-slate-800">
                      {template.category === "AUTHENTICATION"
                        ? "Your verification code is: 123456. Valid for 10 minutes. For your security, do not share this code."
                        : body?.text || "No message body specified"}
                    </div>
                    {footer && (
                      <div className="text-[10px] text-slate-500 pt-1">
                        {footer.text}
                      </div>
                    )}
                    {buttonsComp && buttonsComp.buttons && buttonsComp.buttons.length > 0 && (
                      <div className="pt-2 border-t border-black/10 space-y-1">
                        {buttonsComp.buttons.map((btn, idx) => (
                          <div key={idx} className="bg-white text-blue-600 font-semibold text-center py-1.5 rounded border border-slate-200 text-xs shadow-xs">
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dynamic Variables Badge */}
                    {(() => {
                      const tplVars = savedTemplateVars[template.name] || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`tpl_vars_${template.name}`) || "[]") : []);
                      if (!tplVars || tplVars.length === 0) return null;
                      return (
                        <div className="pt-2 border-t border-black/10 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Excel Variables:</span>
                          {tplVars.map((v: any, idx: number) => (
                            <span key={idx} className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200">
                              {"{{" + v.index + "}}"} {v.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 text-[10px]">ID: {template.id}</span>
                  {template.name.toLowerCase() === "hello_world" || template.name.toLowerCase().startsWith("sample_") ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300/80 cursor-help"
                      title="Default sample template provisioned by Meta. Meta locks this template and it cannot be deleted."
                    >
                      <span>🔒</span> Default Meta Template
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(template.name, template.id)}
                      className="text-red-600 hover:text-red-800 font-semibold hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-hidden"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* 1. STICKY MODAL HEADER */}
            <div className="shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white z-10">
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
                  <span>✨</span> Create & Submit WhatsApp Template
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design your message with custom brackets like <code className="font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold">&#123;&#123;Customer_Name&#125;&#125;</code>. Meta AI reviews within minutes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">
                  ESC to close
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xl transition cursor-pointer"
                  title="Close Modal (or click outside / Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="shrink-0 mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <strong>Meta Submission Error:</strong> {submitError}
                </div>
              </div>
            )}

            {/* 2. SCROLLABLE CONTENT BODY */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="createTemplateForm" onSubmit={handleSubmitTemplate}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Form Side */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Template Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. order_alert_v1"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="MARKETING">📢 Marketing / Promo</option>
                          <option value="UTILITY">📦 Utility / Order Alert</option>
                          <option value="AUTHENTICATION">🔑 Authentication (OTP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Language</label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="en_US">English (en_US)</option>
                          <option value="hi">Hindi (hi)</option>
                        </select>
                      </div>
                    </div>

                    {formData.category !== "AUTHENTICATION" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Header Type</label>
                            <select
                              value={formData.headerType}
                              onChange={(e) => setFormData({ ...formData, headerType: e.target.value as any })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                            >
                              <option value="NONE">None</option>
                              <option value="TEXT">Text Header</option>
                              <option value="IMAGE">Image Header</option>
                            </select>
                          </div>
                          {formData.headerType === "TEXT" && (
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Header Text</label>
                              <input
                                type="text"
                                placeholder="e.g. Order Update"
                                value={formData.headerText}
                                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* BODY TEXT SECTION WITH CURSOR VARIABLE INSERTERS */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Body Message <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {detectedVariables.length} variable{detectedVariables.length !== 1 ? "s" : ""} detected
                            </span>
                          </div>

                          {/* Smart Quick Insert Variable Buttons */}
                          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <span>⚡</span> Click to Insert at Cursor:
                              </span>
                              <span className="text-[10px] text-slate-400">Clicking inserts placeholder at cursor</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Customer_Name")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 hover:border-purple-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Customer_Name}} at cursor"
                              >
                                <span>👤</span> + &#123;&#123;Customer_Name&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Order_ID")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Order_ID}} at cursor"
                              >
                                <span>📦</span> + &#123;&#123;Order_ID&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Offer_Discount")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Offer_Discount}} at cursor"
                              >
                                <span>🏷️</span> + &#123;&#123;Offer_Discount&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Address")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Address}} at cursor"
                              >
                                <span>📍</span> + &#123;&#123;Address&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Amount")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Amount}} at cursor"
                              >
                                <span>💰</span> + &#123;&#123;Amount&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Delivery_Date")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert {{Delivery_Date}} at cursor"
                              >
                                <span>📅</span> + &#123;&#123;Delivery_Date&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Custom_Field", true)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Insert custom brackets {{...}} with cursor inside"
                              >
                                <span>✨</span> + Custom Variable &#123;&#123;...&#125;&#125;
                              </button>
                            </div>
                          </div>

                          {/* Main Textarea */}
                          <textarea
                            ref={bodyTextareaRef}
                            rows={4}
                            required
                            value={formData.bodyText}
                            onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-sans focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Type message here... Click buttons above or write {{Field_Name}} for variables."
                          />
                        </div>

                        {/* DYNAMIC VARIABLE DEFINITION & EXCEL MAPPING TABLE */}
                        {detectedVariables.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">📊</span>
                                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                  Dynamic Variables & Excel Mapping ({detectedVariables.length})
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                Auto-translates to Meta &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Meta AI requires sample preview values to approve templates. These field labels will be used in your campaigns to automatically map uploaded Excel columns!
                            </p>

                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {detectedVariables.map((v, idx) => {
                                const metaIdx = idx + 1;
                                const currentDef = variableDefs[v] || getSmartDefaults(v);
                                return (
                                  <div
                                    key={v}
                                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                          &#123;&#123;{metaIdx}&#125;&#125;
                                        </span>
                                        <span className="font-mono text-[11px] text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                          &#123;&#123;{v}&#125;&#125;
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono">Meta Parameter #{metaIdx}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                          Excel Column Label:
                                        </label>
                                        <input
                                          type="text"
                                          value={currentDef.label}
                                          onChange={(e) => {
                                            const newLabel = e.target.value;
                                            setVariableDefs(prev => ({
                                              ...prev,
                                              [v]: {
                                                ...(prev[v] || getSmartDefaults(v)),
                                                name: v,
                                                label: newLabel
                                              }
                                            }));
                                          }}
                                          placeholder={`e.g. ${v}`}
                                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                          Sample Preview Value:
                                        </label>
                                        <input
                                          type="text"
                                          value={currentDef.sampleValue}
                                          onChange={(e) => {
                                            const newSample = e.target.value;
                                            setVariableDefs(prev => ({
                                              ...prev,
                                              [v]: {
                                                ...(prev[v] || getSmartDefaults(v)),
                                                name: v,
                                                sampleValue: newSample
                                              }
                                            }));
                                          }}
                                          placeholder="e.g. Rahul Sharma"
                                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Footer Text (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Reply STOP to unsubscribe"
                            value={formData.footerText}
                            onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              Button Type
                            </label>
                            <select
                              value={formData.buttonType}
                              onChange={(e) => setFormData({ ...formData, buttonType: e.target.value as any })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white"
                            >
                              <option value="NONE">None</option>
                              <option value="URL">Website URL</option>
                              <option value="QUICK_REPLY">Quick Reply</option>
                            </select>
                          </div>
                          {formData.buttonType !== "NONE" && (
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Button Label
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Visit Website"
                                value={formData.buttonText}
                                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {formData.buttonType === "URL" && (
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              Destination URL
                            </label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={formData.buttonUrl}
                              onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {formData.category === "AUTHENTICATION" && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                        <p className="font-bold flex items-center gap-1.5">
                          <span>🔒</span> Meta Standard OTP Format
                        </p>
                        <p>
                          Meta automatically generates standard, highly secure OTP templates with a 1-tap "Copy Code" button. Custom text is restricted by Meta policies to prevent phishing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Live Preview Side */}
                  <div className="lg:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Live WhatsApp Preview
                      </span>
                      {formData.category !== "AUTHENTICATION" && (
                        <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setPreviewMode("live")}
                            className={`px-2 py-0.5 rounded-md transition ${previewMode === "live" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"}`}
                          >
                            👁️ Sample Data
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMode("raw")}
                            className={`px-2 py-0.5 rounded-md transition ${previewMode === "raw" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"}`}
                          >
                            🔍 Raw Code
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="w-full max-w-[290px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700 relative">
                      {/* Phone Notch */}
                      <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2"></div>

                      {/* WhatsApp Chat Area */}
                      <div className="bg-[#E5DDD5] rounded-[24px] overflow-hidden min-h-[380px] flex flex-col justify-between p-3 border border-slate-300 relative text-xs">
                        {/* Chat Header */}
                        <div className="bg-[#075E54] text-white p-2.5 -mx-3 -mt-3 flex items-center justify-between mb-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-slate-900">
                              WA
                            </div>
                            <div>
                              <div className="font-bold leading-none flex items-center gap-1 text-[11px]">
                                <span>Verified Business</span>
                                <span className="text-[10px] text-emerald-300">✓</span>
                              </div>
                              <div className="text-[9px] text-emerald-100 opacity-80">Official WhatsApp Account</div>
                            </div>
                          </div>
                        </div>

                        {/* Chat Message Bubble */}
                        <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-100 space-y-2 max-w-[95%]">
                          {formData.category === "AUTHENTICATION" ? (
                            <>
                              <div className="text-xs text-slate-800 leading-relaxed">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-900">123456</span> is your verification code. Valid for 10 minutes. For your security, do not share this code.
                              </div>
                              <div className="pt-2 border-t border-black/10">
                                <div className="bg-white text-blue-600 font-bold text-center py-2 rounded-xl text-xs shadow-2xs border border-slate-200 flex items-center justify-center gap-1">
                                  <span>📋</span> Copy Code
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {formData.headerType === "TEXT" && formData.headerText && (
                                <div className="font-bold text-slate-900 text-xs border-b border-black/5 pb-1">
                                  {formData.headerText}
                                </div>
                              )}
                              {formData.headerType === "IMAGE" && (
                                <div className="h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 text-[11px] font-semibold border border-slate-300">
                                  🖼️ [Image Header Preview]
                                </div>
                              )}
                              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                                {livePreviewBodyText}
                              </div>
                              {formData.footerText && (
                                <div className="text-[10px] text-slate-400 pt-0.5">
                                  {formData.footerText}
                                </div>
                              )}
                              <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 pt-1">
                                <span>12:00 PM</span>
                                <span className="text-blue-500 font-bold">✓✓</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Buttons */}
                        {formData.category !== "AUTHENTICATION" && formData.buttonType !== "NONE" && formData.buttonText && (
                          <div className="pt-2 space-y-1.5">
                            <div className="bg-white text-blue-600 font-bold text-center py-2 rounded-xl text-xs shadow-2xs border border-slate-200 flex items-center justify-center gap-1.5">
                              {formData.buttonType === "URL" && <span>🔗</span>}
                              {formData.buttonType === "QUICK_REPLY" && <span>💬</span>}
                              <span>{formData.buttonText}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {previewMode === "live" ? "Showing realistic preview with sample data" : "Showing raw template placeholders"}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* 3. STICKY MODAL FOOTER */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-semibold hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hidden sm:inline-block px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  form="createTemplateForm"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? "Submitting to Meta..." : "🚀 Submit to Meta Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Update Modal */}
      <TokenUpdateModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSuccess={() => loadTemplates()}
        projectId={projectId || ""}
      />
    </div>
  );
}
