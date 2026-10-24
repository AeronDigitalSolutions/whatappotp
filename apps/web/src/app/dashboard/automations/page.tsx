"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getApiUrl } from "@/lib/api";
import { useSubscription } from "@/context/SubscriptionContext";

interface QuickReplyButton {
  id: string;
  title: string;
}

interface AutomationRule {
  id: string;
  projectId: string;
  name: string;
  triggerType: "KEYWORD" | "EXACT_MATCH" | "DEFAULT_FALLBACK";
  keywords: string[];
  responseType: "TEXT" | "BUTTONS" | "TEMPLATE";
  responseText: string;
  buttons?: QuickReplyButton[];
  isActive: boolean;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AutomationsPage() {
  const { isDemo, triggerPaywall } = useSubscription();
  const [projectId, setProjectId] = useState<string>("");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>("");
  const [formTriggerType, setFormTriggerType] = useState<"KEYWORD" | "EXACT_MATCH" | "DEFAULT_FALLBACK">("KEYWORD");
  const [formKeywords, setFormKeywords] = useState<string>("");
  const [formResponseText, setFormResponseText] = useState<string>("");
  const [formButtons, setFormButtons] = useState<string[]>(["Track Order", "Talk to Human"]);
  const [saving, setSaving] = useState<boolean>(false);

  // Initialize Project ID
  useEffect(() => {
    let pid = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;
    if (!pid && typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.projectId) pid = u.projectId;
          else if (u.projects && u.projects.length > 0) pid = u.projects[0].id;
        } catch (e) {}
      }
    }
    setProjectId(pid || "default");
  }, []);

  // Fetch Rules
  const fetchRules = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/automations/${projectId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rules)) {
        setRules(data.rules);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchRules();
    }
  }, [projectId]);

  // Toggle active state
  const handleToggle = async (ruleId: string) => {
    // Optimistic UI update
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r))
    );

    try {
      const res = await fetch(`${getApiUrl()}/v1/automations/${ruleId}/toggle`, {
        method: "PATCH"
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setRules(prev =>
          prev.map(r => (r.id === ruleId ? { ...r, isActive: data.rule.isActive } : r))
        );
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
      fetchRules();
    }
  };

  // Delete rule
  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;
    try {
      await fetch(`${getApiUrl()}/v1/automations/${ruleId}`, {
        method: "DELETE"
      });
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (err) {
      alert("Failed to delete rule: " + (err as any).message);
    }
  };

  // Open modal for create or edit
  const openModal = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormName(rule.name);
      setFormTriggerType(rule.triggerType);
      setFormKeywords(rule.keywords ? rule.keywords.join(", ") : "");
      setFormResponseText(rule.responseText);
      setFormButtons(
        rule.buttons && rule.buttons.length > 0
          ? rule.buttons.map(b => b.title)
          : []
      );
    } else {
      setEditingRule(null);
      setFormName("");
      setFormTriggerType("KEYWORD");
      setFormKeywords("");
      setFormResponseText("");
      setFormButtons(["Support", "Catalog"]);
    }
    setModalOpen(true);
  };

  // Save rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To save and activate live 24/7 conversational chatbot rules on your WhatsApp number, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!formName.trim() || !formResponseText.trim()) {
      alert("Please provide both rule name and response text.");
      return;
    }

    setSaving(true);
    try {
      const keywordsArray = formKeywords
        .split(",")
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

      const buttonsPayload = formButtons
        .filter(b => b.trim())
        .map((title, idx) => ({ id: `btn_${idx + 1}`, title: title.trim() }));

      const payload = {
        ruleId: editingRule?.id,
        name: formName.trim(),
        triggerType: formTriggerType,
        keywords: keywordsArray,
        responseType: buttonsPayload.length > 0 ? "BUTTONS" : "TEXT",
        responseText: formResponseText.trim(),
        buttons: buttonsPayload,
        isActive: editingRule ? editingRule.isActive : true
      };

      const res = await fetch(`${getApiUrl()}/v1/automations/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchRules();
      } else {
        alert("Failed to save rule: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error saving rule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter(r => r.isActive).length;
    const totalExecutions = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);
    return { total, active, totalExecutions };
  }, [rules]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 text-base shrink-0 font-bold">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {stats.active} Active Bot Rule{stats.active !== 1 ? "s" : ""}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400">Keyword-triggered instant replies & quick action buttons</p>
          </div>
        </div>

        {/* Right: Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Create New Bot Rule</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 text-xs shrink-0 font-bold">
              ⚡
            </div>
            <span className="text-xs font-bold text-slate-700">Active Bots</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900">
            {stats.active} <span className="text-xs text-slate-400 font-normal">/ {stats.total} total</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Automated workflows running live</div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 text-xs shrink-0 font-bold">
              💬
            </div>
            <span className="text-xs font-bold text-slate-700">Automated Replies Sent</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900">
            {stats.totalExecutions.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched without human intervention</div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 text-xs shrink-0 font-bold">
              🚀
            </div>
            <span className="text-xs font-bold text-slate-700">Response Speed</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-emerald-600">&lt; 1 Second</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Direct Meta Cloud API webhook latency</div>
        </div>
      </div>

      {/* Automations Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading your automation rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">🤖</p>
          <h3 className="text-base font-bold text-slate-800">No automation bots configured yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Create automated rules that trigger instant replies whenever customers message you on WhatsApp.
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg"
          >
            Create Your First Bot Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rules.map(rule => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl border transition shadow-xs flex flex-col justify-between ${
                rule.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50/50"
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Card Header & Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shrink-0">
                      🤖
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{rule.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {rule.triggerType === "EXACT_MATCH" ? "Exact Match" : "Keyword Contains"}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          ⚡ {rule.executionCount} triggered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Trigger Keywords Pills */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Trigger Keywords ({rule.keywords?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.keywords && rule.keywords.length > 0 ? (
                      rule.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono font-medium"
                        >
                          &quot;{kw}&quot;
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No keywords assigned</span>
                    )}
                  </div>
                </div>

                {/* Message Response Bubble Preview */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Automated WhatsApp Reply
                  </p>
                  <div className="bg-[#efeae2]/60 p-3.5 rounded-xl border border-amber-900/10 text-xs text-slate-800 space-y-2.5">
                    <p className="whitespace-pre-wrap leading-relaxed">{rule.responseText}</p>
                    
                    {/* Interactive Buttons Preview */}
                    {rule.buttons && rule.buttons.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-amber-900/10">
                        {rule.buttons.map((btn, i) => (
                          <div
                            key={i}
                            className="bg-white border border-slate-200/90 text-center py-1.5 px-3 rounded-lg text-emerald-700 font-semibold text-[11px] shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <span>💬</span> {btn.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  Updated {new Date(rule.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(rule)}
                    className="px-2.5 py-1 text-slate-700 hover:text-slate-900 font-semibold hover:bg-slate-200 rounded transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-2.5 py-1 text-red-600 hover:text-red-700 font-semibold hover:bg-red-50 rounded transition"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingRule ? "Edit Automation Rule" : "Create New Automation Rule"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              {/* Rule Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Welcome & Lead Bot, Refund Inquiries"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Trigger Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trigger Mode
                  </label>
                  <select
                    value={formTriggerType}
                    onChange={e => setFormTriggerType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="KEYWORD">Keyword Contains (Partial match)</option>
                    <option value="EXACT_MATCH">Exact Phrase Match</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Language
                  </label>
                  <select
                    defaultValue="ALL"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">All Languages</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
              </div>

              {/* Trigger Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trigger Keywords (Comma separated) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. hello, hi, start, help, price"
                  value={formKeywords}
                  onChange={e => setFormKeywords(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When a customer sends any of these words, this bot responds instantly.
                </p>
              </div>

              {/* Bot Response Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp Reply Message *
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter the automated reply message..."
                  value={formResponseText}
                  onChange={e => setFormResponseText(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Quick Reply Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Interactive Quick Reply Buttons (Max 3)
                </label>
                <div className="space-y-2">
                  {formButtons.map((btn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={btn}
                        maxLength={20}
                        onChange={e => {
                          const updated = [...formButtons];
                          updated[idx] = e.target.value;
                          setFormButtons(updated);
                        }}
                        placeholder={`Button ${idx + 1} text`}
                        className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormButtons(formButtons.filter((_, i) => i !== idx));
                        }}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {formButtons.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setFormButtons([...formButtons, ""])}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                    >
                      + Add Button
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  {saving ? "Saving..." : "Save Bot Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
