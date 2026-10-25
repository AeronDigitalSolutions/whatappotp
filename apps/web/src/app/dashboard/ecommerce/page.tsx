"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useSubscription } from "@/context/SubscriptionContext";

interface EcommerceConfig {
  id?: string;
  projectId: string;
  storeName?: string;
  platform?: "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";
  storeType?: "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";
  storeUrl?: string;
  storeDomain?: string;
  webhookSecret?: string;
  abandonedCartEnabled?: boolean | number;
  abandonedCartTemplate?: string;
  abandonedCartDelayMinutes?: number;
  orderConfirmationEnabled?: boolean | number;
  orderConfirmationTemplate?: string;
  codVerificationEnabled?: boolean | number;
  codVerificationTemplate?: string;
  shippingUpdatesEnabled?: boolean | number;
  shippingUpdateEnabled?: boolean | number;
  shippingUpdatesTemplate?: string;
  shippingUpdateTemplate?: string;
  totalEventsReceived?: number;
  totalMessagesTriggered?: number;
}

interface EcommerceEvent {
  id: string;
  projectId: string;
  storeId?: string;
  eventType: string;
  customerPhone?: string;
  customerName?: string;
  orderId?: string;
  orderTotal?: number;
  cartValue?: number;
  status: string;
  dispatchedMessageId?: string;
  metaMessageId?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function EcommerceTriggersPage() {
  const { isDemo, triggerPaywall } = useSubscription();
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  // Store Configuration state with safe defaults
  const [config, setConfig] = useState<EcommerceConfig>({
    projectId: "default",
    storeName: "My E-Commerce Store",
    platform: "SHOPIFY",
    storeType: "SHOPIFY",
    storeUrl: "",
    webhookSecret: "whsec_default",
    abandonedCartEnabled: true,
    abandonedCartTemplate: "cart_recovery_discount",
    abandonedCartDelayMinutes: 30,
    orderConfirmationEnabled: true,
    orderConfirmationTemplate: "order_confirmation_v2",
    codVerificationEnabled: true,
    codVerificationTemplate: "cod_verification_interactive",
    shippingUpdatesEnabled: true,
    shippingUpdatesTemplate: "shipping_transit_update"
  });

  // Events & Simulator State
  const [events, setEvents] = useState<EcommerceEvent[]>([]);
  const [simEventType, setSimEventType] = useState<string>("ABANDONED_CART");
  const [simPhone, setSimPhone] = useState<string>("");
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Meta Templates for Live Approval Verification
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);

  // Dialog Box (Modal) for unapproved template alert
  const [unapprovedModal, setUnapprovedModal] = useState<{
    isOpen: boolean;
    templateName: string;
    templateStatus: string;
    eventType: string;
    customerPhone: string;
    errorMessage?: string;
  } | null>(null);

  const getSimTemplateName = (eventType: string) => {
    if (eventType === "ABANDONED_CART") return config.abandonedCartTemplate || "cart_recovery_discount";
    if (eventType === "ORDER_CREATED") return config.orderConfirmationTemplate || "order_confirmation_v2";
    if (eventType === "COD_VERIFICATION") return config.codVerificationTemplate || "cod_verification_interactive";
    if (eventType === "SHIPPING_UPDATE") return config.shippingUpdatesTemplate || "shipping_transit_update";
    return "cart_recovery_discount";
  };

  const getTemplateMeta = (tplName?: string) => {
    if (!tplName) return null;
    if (tplName.toLowerCase() === "hello_world") return { name: "hello_world", status: "APPROVED" };
    return metaTemplates.find((t: any) => t.name?.toLowerCase() === tplName.toLowerCase()) || null;
  };

  // Initialize Project ID safely
  useEffect(() => {
    let pid: string | null = null;
    if (typeof window !== "undefined") {
      pid = localStorage.getItem("projectId");
      if (!pid) {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            if (u.projectId) pid = u.projectId;
            else if (u.projects && u.projects.length > 0) pid = u.projects[0].id;
          } catch (e) {}
        }
      }
    }
    setProjectId(pid || "default");
  }, []);

  // Fetch Config, Events, and Meta Templates
  const fetchData = async () => {
    const currentPid = projectId || "default";
    setLoading(true);
    try {
      const [tplRes, cfgRes, evRes] = await Promise.all([
        fetch(`${getApiUrl()}/v1/meta/templates/${currentPid}`).catch(() => null),
        fetch(`${getApiUrl()}/v1/ecommerce/config/${currentPid}`).catch(() => null),
        fetch(`${getApiUrl()}/v1/ecommerce/events/${currentPid}`).catch(() => null)
      ]);

      if (tplRes && tplRes.ok) {
        const tplData = await tplRes.json();
        if (tplData.success && Array.isArray(tplData.templates)) {
          setMetaTemplates(tplData.templates);
        }
      }

      if (cfgRes && cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.success && cfgData.config) {
          const rawConf = cfgData.config;
          const normalizedPlatform = (rawConf.platform || rawConf.storeType || "SHOPIFY").toUpperCase() as any;
          setConfig({
            ...rawConf,
            platform: normalizedPlatform,
            storeType: normalizedPlatform,
            abandonedCartEnabled: Boolean(rawConf.abandonedCartEnabled),
            orderConfirmationEnabled: Boolean(rawConf.orderConfirmationEnabled),
            codVerificationEnabled: Boolean(rawConf.codVerificationEnabled),
            shippingUpdatesEnabled: Boolean(rawConf.shippingUpdatesEnabled ?? rawConf.shippingUpdateEnabled)
          });
        }
      }

      if (evRes && evRes.ok) {
        const evData = await evRes.json();
        if (evData.success && Array.isArray(evData.events)) {
          setEvents(evData.events);
        }
      }
    } catch (err) {
      console.error("Failed to load e-commerce settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  // Save Config
  const handleSaveConfig = async (updatedConfig: EcommerceConfig) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To save e-commerce webhook configurations and automate WhatsApp notifications, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    setSaving(true);
    const currentPid = projectId || "default";
    try {
      const res = await fetch(`${getApiUrl()}/v1/ecommerce/config/${currentPid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedConfig,
          platform: updatedConfig.platform || updatedConfig.storeType || "SHOPIFY"
        })
      });
      const data = await res.json();
      if (!data.success) {
        console.warn("Save config warning:", data.error);
      }
    } catch (err: any) {
      console.error("Error saving settings:", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Recipe helper
  const toggleRecipe = (field: keyof EcommerceConfig) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To activate e-commerce recipes (Abandoned Cart, Order Confirmation, COD Verification), you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    const currentVal = Boolean(config[field]);
    const updated: EcommerceConfig = {
      ...config,
      [field]: !currentVal
    };
    setConfig(updated);
    handleSaveConfig(updated);
  };

  // Run Simulator with live Meta verification
  const handleRunSimulator = async (useStarterFallback = false) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To simulate and trigger live WhatsApp e-commerce notifications, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!simPhone.trim()) {
      alert("Please provide a destination phone number for the test.");
      return;
    }
    setSimulating(true);
    setSimResult(null);
    const currentPid = projectId || "default";
    try {
      const res = await fetch(`${getApiUrl()}/v1/ecommerce/simulate/${currentPid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: simEventType,
          customerPhone: simPhone.trim(),
          customerName: "Test Recipient",
          orderId: "#ORD-" + Math.floor(10000 + Math.random() * 90000),
          orderTotal: 1899.00,
          testApprovedStarter: useStarterFallback
        })
      });
      const data = await res.json();
      setSimResult(data);

      if (!data.success && data.code === "TEMPLATE_NOT_APPROVED") {
        setUnapprovedModal({
          isOpen: true,
          templateName: data.templateName || getSimTemplateName(simEventType),
          templateStatus: data.templateStatus || "NOT APPROVED",
          eventType: data.eventType || simEventType,
          customerPhone: simPhone.trim(),
          errorMessage: data.message || data.error
        });
      } else if (data.success && useStarterFallback) {
        setUnapprovedModal(null);
      }

      fetchData();
    } catch (err: any) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  // Safe Webhook URL generator
  const activePlatform = (config?.platform || config?.storeType || "SHOPIFY").toLowerCase();
  const getWebhookUrl = (event: string) => {
    const currentPid = projectId || "default";
    return `${getApiUrl()}/v1/ecommerce/webhook/${currentPid}/${activePlatform}/${event}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(""), 2000);
    }
  };

  const copySecret = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && config?.webhookSecret) {
      navigator.clipboard.writeText(config.webhookSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const currentPlatformUpper = (config?.platform || config?.storeType || "SHOPIFY").toUpperCase();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Control Bar with Mode Toggle & Platform Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        {/* Left: Platform selector tabs */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Connected Store Platform
          </label>
          <div className="flex items-center gap-2">
            {(["SHOPIFY", "WOOCOMMERCE", "CUSTOM"] as const).map(plat => (
              <button
                key={plat}
                onClick={() => {
                  const updated: EcommerceConfig = { ...config, platform: plat, storeType: plat };
                  setConfig(updated);
                  handleSaveConfig(updated);
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-2xs ${
                  currentPlatformUpper === plat
                    ? "bg-[#064e3b] text-white border-[#064e3b]"
                    : "bg-white dark:bg-[#070b14] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                {plat === "SHOPIFY" ? "🛍️ Shopify" : plat === "WOOCOMMERCE" ? "🟣 WooCommerce" : "⚡ Custom API"}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Webhook status & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Webhooks Ready
            </span>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3.5 py-2 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.1] transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

      {/* Store Connection & Webhook URLs Panel */}
      <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-2xs backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Dedicated Store Webhook Endpoints</h2>
            <p className="text-[11px] text-slate-400">
              Copy these URLs directly into your {currentPlatformUpper === "SHOPIFY" ? "Shopify Admin > Notifications > Webhooks" : currentPlatformUpper === "WOOCOMMERCE" ? "WooCommerce Settings > Advanced > Webhooks" : "Custom Backend Application"}.
            </p>
          </div>
        </div>

        {/* Webhook URLs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {[
            { label: "Abandoned Cart Webhook", event: "abandoned_cart", desc: "Trigger on cart checkout creation/abandon" },
            { label: "Order Confirmation Webhook", event: "order_created", desc: "Trigger on successful customer purchase" },
            { label: "COD Verification Webhook", event: "cod_verify", desc: "Trigger on COD payment method selection" },
            { label: "Shipping Updates Webhook", event: "order_shipped", desc: "Trigger on shipment fulfillment" }
          ].map(item => {
            const url = getWebhookUrl(item.event);
            const isCopied = copiedUrl === item.event;

            return (
              <div key={item.event} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.desc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="flex-1 text-[11px] font-mono bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded px-2.5 py-1 text-slate-600 dark:text-slate-300 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(url, item.event)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition shrink-0"
                  >
                    {isCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Webhook Secret */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 text-xs gap-2">
          <div className="flex items-center gap-2 text-slate-500">
            <span>🔒 Webhook Secret:</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
              {config?.webhookSecret || "whsec_default"}
            </span>
            <button
              onClick={copySecret}
              className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px]"
            >
              {copiedSecret ? "✓ Copied" : "Copy Secret"}
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Paste these URLs into Shopify Admin &gt; Settings &gt; Notifications &gt; Webhooks
          </span>
        </div>
      </div>

      {/* 4 Pre-built High-Converting Automation Recipes */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pre-Built High-Converting Recipes</h2>
          <p className="text-xs text-slate-500">
            Turnkey workflows designed to recover lost revenue and reduce shipping returns on WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recipe 1: Abandoned Cart */}
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 shadow-xs backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
                  🛒
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Abandoned Cart Recovery</h3>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    📈 Recovers up to 28% abandoned checkouts
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.abandonedCartEnabled)}
                  onChange={() => toggleRecipe("abandonedCartEnabled")}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sends an automated reminder message with item names, product photo, and an exclusive checkout link 45 minutes after customer leaves without purchasing.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Preview Message:</p>
              <p className="italic text-slate-600">
                &quot;Hey Rahul, you left something behind! Complete your order within the next 2 hours and enjoy 10% OFF with code SAVE10.&quot;
              </p>
              <div className="pt-1.5 flex gap-2">
                <span className="text-[10px] bg-white dark:bg-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-semibold">
                  [Complete Checkout]
                </span>
              </div>
            </div>

            {/* Meta Template Verification Strip */}
            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100">
              <span className="text-slate-500">
                Template: <code className="font-mono font-bold text-slate-800">{config.abandonedCartTemplate || "cart_recovery_discount"}</code>
              </span>
              {getTemplateMeta(config.abandonedCartTemplate || "cart_recovery_discount")?.status === "APPROVED" ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Approved on Meta
                </span>
              ) : (
                <a
                  href="/dashboard/templates"
                  className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Not Approved · Submit in Studio →
                </a>
              )}
            </div>
          </div>

          {/* Recipe 2: Order Confirmation */}
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 shadow-xs backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                  📦
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Instant Order Confirmation</h3>
                  <span className="text-[10px] font-semibold text-blue-600">
                    ⚡ 98% Open Rate within 3 minutes
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.orderConfirmationEnabled)}
                  onChange={() => toggleRecipe("orderConfirmationEnabled")}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Immediately alerts customer that payment was received, order is being packed, and includes complete item summary and expected delivery date.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Preview Message:</p>
              <p className="italic text-slate-600">
                &quot;Thank you for your order #89214! We have received your payment of ₹1,899. Your package is scheduled to dispatch tomorrow.&quot;
              </p>
            </div>

            {/* Meta Template Verification Strip */}
            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100">
              <span className="text-slate-500">
                Template: <code className="font-mono font-bold text-slate-800">{config.orderConfirmationTemplate || "order_confirmation_v2"}</code>
              </span>
              {getTemplateMeta(config.orderConfirmationTemplate || "order_confirmation_v2")?.status === "APPROVED" ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Approved on Meta
                </span>
              ) : (
                <a
                  href="/dashboard/templates"
                  className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Not Approved · Submit in Studio →
                </a>
              )}
            </div>
          </div>

          {/* Recipe 3: COD Verification */}
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 shadow-xs backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                  💰
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cash on Delivery (COD) Verification</h3>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    🛡️ Cuts RTO & fake orders by 45%
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.codVerificationEnabled)}
                  onChange={() => toggleRecipe("codVerificationEnabled")}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Prompts customer with 2 interactive WhatsApp buttons: [✅ Confirm Order] or [❌ Cancel]. Unconfirmed orders can be put on hold before shipping.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Preview Message:</p>
              <p className="italic text-slate-600">
                &quot;Hi Priya, please confirm your COD order #99214 of ₹1,450 to proceed with express courier shipping.&quot;
              </p>
              <div className="pt-1.5 flex gap-2">
                <span className="text-[10px] bg-white dark:bg-emerald-500/10 border border-slate-200 dark:border-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-semibold">
                  [✅ Confirm Order]
                </span>
                <span className="text-[10px] bg-white dark:bg-red-500/10 border border-slate-200 dark:border-red-500/20 px-2 py-0.5 rounded text-red-600 dark:text-red-400 font-semibold">
                  [❌ Cancel Order]
                </span>
              </div>
            </div>

            {/* Meta Template Verification Strip */}
            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100">
              <span className="text-slate-500">
                Template: <code className="font-mono font-bold text-slate-800">{config.codVerificationTemplate || "cod_verification_interactive"}</code>
              </span>
              {getTemplateMeta(config.codVerificationTemplate || "cod_verification_interactive")?.status === "APPROVED" ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Approved on Meta
                </span>
              ) : (
                <a
                  href="/dashboard/templates"
                  className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Not Approved · Submit in Studio →
                </a>
              )}
            </div>
          </div>

          {/* Recipe 4: Shipping Transit Alerts */}
          <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 shadow-xs backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
                  🚚
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Shipping & Delivery Alerts</h3>
                  <span className="text-[10px] font-semibold text-purple-600">
                    🔔 Eliminates &quot;Where is my order&quot; support tickets
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.shippingUpdatesEnabled)}
                  onChange={() => toggleRecipe("shippingUpdatesEnabled")}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sends automated dispatch, in-transit, and out-for-delivery notifications with direct courier tracking links.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Preview Message:</p>
              <p className="italic text-slate-600">
                &quot;Great news! Your package has been dispatched via BlueDart (AWB #8271928). Expected delivery tomorrow by 6 PM.&quot;
              </p>
            </div>

            {/* Meta Template Verification Strip */}
            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100">
              <span className="text-slate-500">
                Template: <code className="font-mono font-bold text-slate-800">{config.shippingUpdatesTemplate || "shipping_transit_update"}</code>
              </span>
              {getTemplateMeta(config.shippingUpdatesTemplate || "shipping_transit_update")?.status === "APPROVED" ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Approved on Meta
                </span>
              ) : (
                <a
                  href="/dashboard/templates"
                  className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Not Approved · Submit in Studio →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulator & Live Event Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Card */}
        <div className="bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 shadow-xs space-y-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Event Dispatch Tester</h3>
          </div>
          <p className="text-xs text-slate-500">
            Dispatch a real WhatsApp event trigger to verify Meta template formatting and mobile delivery.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Event Type</label>
              <select
                value={simEventType}
                onChange={e => setSimEventType(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ABANDONED_CART">🛒 Abandoned Cart Recovery</option>
                <option value="ORDER_CREATED">📦 Order Confirmation</option>
                <option value="COD_VERIFICATION">💰 COD Order Verification</option>
                <option value="SHIPPING_UPDATE">🚚 Shipping Alert</option>
              </select>
            </div>

            {/* Live Template Verification Badge for Selected Event */}
            {(() => {
              const tplName = getSimTemplateName(simEventType);
              const tplMeta = getTemplateMeta(tplName);
              const isApproved = tplMeta && tplMeta.status === "APPROVED";
              return (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mapped Template:</span>
                    {isApproved ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Approved on Meta
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUnapprovedModal({
                          isOpen: true,
                          templateName: tplName,
                          templateStatus: tplMeta?.status || "NOT_FOUND",
                          eventType: simEventType,
                          customerPhone: simPhone.trim(),
                          errorMessage: `Template "${tplName}" is not approved on Meta.`
                        })}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        ⚠️ Not Approved · Details
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-[11px] text-slate-800 font-bold">{tplName}</code>
                    <a href="/dashboard/templates" className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold underline">
                      Manage in Studio
                    </a>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Mobile Number *
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={e => setSimPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Include country code (e.g. +91 for India)
              </span>
            </div>

            <button
              onClick={() => handleRunSimulator(false)}
              disabled={simulating}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-2"
            >
              {simulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying & Dispatching...</span>
                </>
              ) : (
                <span>🚀 Send Live WhatsApp Event</span>
              )}
            </button>

            {/* Quick Proof Test with Approved hello_world */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => handleRunSimulator(true)}
                disabled={simulating}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1.5 transition py-1 px-2 rounded hover:bg-emerald-50 border border-dashed border-emerald-200"
              >
                <span>⚡ Test Live Delivery via Approved</span>
                <code className="font-mono bg-white dark:bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-bold">hello_world</code>
              </button>
            </div>

            {simResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  simResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    {simResult.success ? "✓ WhatsApp Dispatch Succeeded!" : "✕ Dispatch Prevented"}
                  </p>
                  {simResult.dispatchedMessageId && simResult.dispatchedMessageId.startsWith("wamid.") && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                      Meta WAMID
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-1 leading-relaxed">
                  {simResult.message || simResult.error || "Event processed successfully."}
                </p>
                {simResult.code === "TEMPLATE_NOT_APPROVED" && (
                  <button
                    type="button"
                    onClick={() => setUnapprovedModal({
                      isOpen: true,
                      templateName: simResult.templateName || getSimTemplateName(simEventType),
                      templateStatus: simResult.templateStatus || "NOT APPROVED",
                      eventType: simEventType,
                      customerPhone: simPhone.trim(),
                      errorMessage: simResult.message
                    })}
                    className="mt-2 text-[11px] font-bold text-amber-900 underline block"
                  >
                    👉 Click to view Meta Approval Dialog & Next Steps
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Event Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0B101D]/80 rounded-xl border border-slate-200 dark:border-white/[0.08] p-5 shadow-xs space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent E-Commerce Activity</h3>
              <p className="text-xs text-slate-500">Live feed of inbound webhooks and dispatched messages</p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs font-semibold px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded border border-slate-200 transition"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading && events.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading recent activity...
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <p className="text-2xl mb-1">📭</p>
                <p className="font-semibold text-slate-600">No e-commerce events logged yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Trigger a test event from the left or connect your Shopify/WooCommerce store to see live activity.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Event</th>
                    <th className="p-2.5">Customer & Phone</th>
                    <th className="p-2.5">Order Total</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Message ID / Meta WAMID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map(ev => {
                    const evType = String(ev.eventType || "").toUpperCase();
                    const label =
                      evType.includes("CART") ? "🛒 Cart Abandoned" :
                      evType.includes("ORDER") ? "📦 Order Created" :
                      evType.includes("COD") ? "💰 COD Verify" : "🚚 Shipping";

                    const timeStr = ev.createdAt
                      ? new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-";

                    const messageId = ev.dispatchedMessageId || ev.metaMessageId || "sim_processed";
                    const isUnapproved = ev.status === "TEMPLATE_NOT_APPROVED" || messageId.startsWith("unapproved_");
                    const isLiveWamid = messageId.startsWith("wamid.");
                    const isFailed = ev.status === "FAILED" || messageId.startsWith("meta_err_");

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{timeStr}</td>
                        <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">{label}</td>
                        <td className="p-2.5">
                          <span className="font-medium text-slate-800 block truncate max-w-[120px]">
                            {ev.customerName || "Customer"}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {ev.customerPhone || "-"}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                          ₹{Number(ev.orderTotal || ev.cartValue || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-2.5">
                          {isUnapproved ? (
                            <button
                              onClick={() => setUnapprovedModal({
                                isOpen: true,
                                templateName: messageId.replace("unapproved_", "") || getSimTemplateName(ev.eventType),
                                templateStatus: "NOT APPROVED",
                                eventType: ev.eventType,
                                customerPhone: ev.customerPhone || simPhone,
                                errorMessage: "Template not approved by Meta"
                              })}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap transition cursor-pointer inline-flex items-center gap-1"
                              title="Click to view Meta template approval status"
                            >
                              <span>⚠️ NOT APPROVED</span>
                            </button>
                          ) : isLiveWamid ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1">
                              <span>✓ LIVE SENT</span>
                            </span>
                          ) : isFailed ? (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                              ✕ FAILED
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                              {ev.status || "PROCESSED"}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {isLiveWamid ? (
                            <span className="text-emerald-700 font-bold" title={messageId}>
                              📱 {messageId.slice(0, 18)}...
                            </span>
                          ) : isUnapproved ? (
                            <span className="text-amber-800 font-semibold" title="Unapproved template in Meta">
                              ⚠️ {messageId}
                            </span>
                          ) : (
                            <span>{messageId.slice(0, 16)}...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* DIALOG BOX (MODAL): TEMPLATE NOT APPROVED BY META */}
      {unapprovedModal && unapprovedModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B101D] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Message Template Not Approved by Meta</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Meta strictly blocks sending this automated message to real WhatsApp numbers until it is approved.
                </p>
              </div>
              <button
                onClick={() => setUnapprovedModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Event & Template Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trigger Event:</span>
                  <span className="font-bold text-slate-800">
                    {unapprovedModal.eventType.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mapped Template Name:</span>
                  <code className="font-mono bg-white dark:bg-white/[0.08] px-2 py-0.5 rounded border border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">
                    {unapprovedModal.templateName}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Meta Approval Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {unapprovedModal.templateStatus || "NOT APPROVED"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Recipient Phone:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {unapprovedModal.customerPhone}
                  </span>
                </div>
              </div>

              {/* Clear Explanation */}
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>Why can’t this message be delivered right now?</strong>
                  <br />
                  Meta WhatsApp Cloud API enforces strict anti-spam regulations. Any automated notification (like Abandoned Cart or Order Confirmation) must be submitted and approved in your WhatsApp Business Account before Meta allows delivery to real devices.
                </p>
                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg text-amber-900 text-xs space-y-1">
                  <p className="font-bold">📋 Required Next Step:</p>
                  <p>
                    Please verify or submit <code className="font-mono font-bold bg-white dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200">{unapprovedModal.templateName}</code> in <strong>Template Studio</strong>. Meta reviews and approves standard e-commerce templates within 1 minute.
                  </p>
                </div>
              </div>

              {/* One-Click Proof Option with Approved hello_world */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <span>💡</span>
                  <span>Want to verify real WhatsApp delivery right now?</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Meta provides a pre-approved starter template (<code className="font-mono font-bold bg-white dark:bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300">hello_world</code>) that can be dispatched immediately to your phone to confirm your number is working.
                </p>
                <button
                  type="button"
                  onClick={() => handleRunSimulator(true)}
                  disabled={simulating}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {simulating ? "Dispatching..." : "⚡ Send Real Test via Approved 'hello_world'"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setUnapprovedModal(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Dismiss
                </button>
                <a
                  href="/dashboard/templates"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>🎨 Open Template Studio to Submit</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
