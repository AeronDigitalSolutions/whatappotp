"use client";

import { useEffect, useState } from "react";
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

  const [formData, setFormData] = useState({
    name: "",
    category: "MARKETING" as "AUTHENTICATION" | "MARKETING" | "UTILITY",
    language: "en_US",
    headerType: "NONE" as "NONE" | "TEXT" | "IMAGE",
    headerText: "",
    bodyText: "Hello {{1}}, thank you for your order! Your confirmation code is {{2}}.",
    footerText: "Reply STOP to unsubscribe",
    buttonType: "URL" as "NONE" | "URL" | "QUICK_REPLY" | "OTP",
    buttonText: "Visit Website",
    buttonUrl: "https://digitalbeings.in"
  });

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

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
    } catch (e: any) {
      setError(e.message || "Network error loading templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const handleDelete = (name: string) => {
    showModal({
      title: "Delete WhatsApp Template?",
      type: "warning",
      confirmVariant: "danger",
      loaderVariant: "bubble",
      badge: "Permanent Action",
      message: `Are you sure you want to delete template "${name}" from your Meta WhatsApp account?`,
      details: [
        { label: "Template Name", value: name },
        { label: "WABA ID", value: wabaId || "2107898293422238" }
      ],
      note: "Once deleted from Meta, any active marketing campaigns or OTP dispatch using this template name will immediately fail.",
      confirmText: "Yes, Delete Template",
      cancelText: "Cancel",
      loadingTitle: `Deleting Template "${name}"...`,
      loadingMessage: `Communicating with Meta WhatsApp Cloud API to permanently delete "${name}". Please wait...`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}/${encodeURIComponent(name)}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
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
      components.push({
        type: "BODY",
        text: formData.bodyText
      });

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
        showModal({
          title: "Template Submitted to Meta",
          type: "success",
          badge: "Under Review • Meta AI",
          message: `Template "${formData.name}" was successfully registered with WhatsApp Cloud API.`,
          details: [
            { label: "Template Name", value: formData.name },
            { label: "Category", value: formData.category },
            { label: "Language", value: formData.language }
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
          bodyText: "Hello {{1}}, thank you for your order! Your confirmation code is {{2}}.",
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
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">✓ APPROVED</span>;
      case "PENDING":
      case "IN_REVIEW":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">⏳ IN REVIEW</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">✕ REJECTED</span>;
      case "PAUSED":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">⏸ PAUSED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">{status}</span>;
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
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm break-all">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getCategoryBadge(template.category)}
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{template.language}</span>
                      </div>
                    </div>
                    <div>{getStatusBadge(template.status)}</div>
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
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 text-[10px]">ID: {template.id}</span>
                  <button
                    onClick={() => handleDelete(template.name)}
                    className="text-red-600 hover:text-red-800 font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">Create & Submit Template to Meta</h3>
                <p className="text-xs text-slate-500">Meta AI automatically reviews Authentication and Standard templates within minutes.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <strong>Meta Submission Error:</strong> {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Side */}
              <form onSubmit={handleSubmitTemplate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. login_otp_verification"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3.5 py-2 text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                    >
                      <option value="AUTHENTICATION">🔑 Authentication (OTP)</option>
                      <option value="MARKETING">📢 Marketing / Promo</option>
                      <option value="UTILITY">📦 Utility / Order Alert</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
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
                        <label className="text-xs font-bold text-slate-700 uppercase">Header Type</label>
                        <select
                          value={formData.headerType}
                          onChange={(e) => setFormData({ ...formData, headerType: e.target.value as any })}
                          className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="NONE">None</option>
                          <option value="TEXT">Text Header</option>
                          <option value="IMAGE">Image Header</option>
                        </select>
                      </div>
                      {formData.headerType === "TEXT" && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase">Header Text</label>
                          <input
                            type="text"
                            placeholder="e.g. Order Confirmed"
                            value={formData.headerText}
                            onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                            className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Body Text</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, bodyText: formData.bodyText + " {{1}}" })}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          + Add Variable {"{{1}}"}
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        required
                        value={formData.bodyText}
                        onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm font-sans"
                        placeholder="Type message here... Use {{1}}, {{2}} for variables."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase">Footer Text (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Reply STOP to unsubscribe"
                        value={formData.footerText}
                        onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                        className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase">Button Type</label>
                        <select
                          value={formData.buttonType}
                          onChange={(e) => setFormData({ ...formData, buttonType: e.target.value as any })}
                          className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                        >
                          <option value="NONE">None</option>
                          <option value="URL">Website URL</option>
                          <option value="QUICK_REPLY">Quick Reply</option>
                        </select>
                      </div>
                      {formData.buttonType !== "NONE" && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase">Button Label</label>
                          <input
                            type="text"
                            placeholder="e.g. Visit Website"
                            value={formData.buttonText}
                            onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                            className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {formData.buttonType === "URL" && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase">Destination URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={formData.buttonUrl}
                          onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                          className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </>
                )}

                {formData.category === "AUTHENTICATION" && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                    <p className="font-bold">Meta Standard OTP Format</p>
                    <p>Meta automatically generates standard, highly secure OTP templates with a 1-tap "Copy Code" button. Custom text is restricted by Meta policies to prevent phishing.</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                  >
                    {submitting ? "Submitting to Meta..." : "🚀 Submit to Meta Review"}
                  </button>
                </div>
              </form>

              {/* Live Preview Side */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Live WhatsApp Preview</span>
                <div className="w-full max-w-xs bg-[#EFEAE2] p-4 rounded-2xl shadow-md border border-slate-300 space-y-3 font-sans">
                  {formData.category === "AUTHENTICATION" ? (
                    <>
                      <div className="text-xs text-slate-800 leading-relaxed">
                        <span className="font-mono bg-white px-2 py-0.5 rounded font-bold text-slate-900">123456</span> is your verification code. Valid for 10 minutes. For your security, do not share this code.
                      </div>
                      <div className="pt-2 border-t border-black/10">
                        <div className="bg-white text-blue-600 font-semibold text-center py-2 rounded-lg text-xs shadow-xs border border-slate-200">
                          📋 Copy Code
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {formData.headerType === "TEXT" && formData.headerText && (
                        <div className="font-bold text-slate-900 text-sm border-b border-black/10 pb-1">
                          {formData.headerText}
                        </div>
                      )}
                      {formData.headerType === "IMAGE" && (
                        <div className="h-32 bg-slate-300 rounded-lg flex items-center justify-center text-slate-500 text-xs font-semibold">
                          🖼️ Image Header Preview
                        </div>
                      )}
                      <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                        {formData.bodyText}
                      </div>
                      {formData.footerText && (
                        <div className="text-[10px] text-slate-500 pt-1">
                          {formData.footerText}
                        </div>
                      )}
                      {formData.buttonType !== "NONE" && formData.buttonText && (
                        <div className="pt-2 border-t border-black/10">
                          <div className="bg-white text-blue-600 font-semibold text-center py-2 rounded-lg text-xs shadow-xs border border-slate-200">
                            {formData.buttonText}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
