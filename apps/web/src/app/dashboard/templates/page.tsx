"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import Loader from "@/components/Loader";
import TokenUpdateModal from "@/components/TokenUpdateModal";
import { useViewMode } from "@/context/ViewModeContext";
import { useSubscription } from "@/context/SubscriptionContext";

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

interface MetaPhone {
  id: string;
  number: string;
  verifiedName?: string;
  quality?: string;
  status?: string;
}

interface MetaWaba {
  id: string;
  name: string;
  phones: MetaPhone[];
}

interface MetaBusiness {
  id: string;
  name: string;
  wabas: MetaWaba[];
}

interface TemplateItem {
  id: string;
  name: string;
  category: "AUTHENTICATION" | "MARKETING" | "UTILITY";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "IN_REVIEW";
  components: TemplateComponent[];
}

export interface VariableDef {
  name: string;
  label: string;
  sampleValue: string;
}

export default function TemplatesPage() {
  const { mode, isDev, isUser } = useViewMode();
  const { showModal, showSuccess, showError, showLoading } = useModal();
  const { isDemo, triggerPaywall } = useSubscription();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [wabaId, setWabaId] = useState<string>("");

  // Meta Portfolios & WABAs Segregation State
  const [businesses, setBusinesses] = useState<MetaBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedWabaId, setSelectedWabaId] = useState<string>("");
  const [createModalWabaId, setCreateModalWabaId] = useState<string>("");
  const [loadingBusinesses, setLoadingBusinesses] = useState<boolean>(true);

  // Custom Dropdown Open States and Refs
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const bizDropdownRef = useRef<HTMLDivElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  // Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"live" | "raw">("live");

  // Copy toast state
  const [copiedName, setCopiedName] = useState<string | null>(null);

  // Ref to textarea for cursor-based variable insertion
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "MARKETING" as "AUTHENTICATION" | "MARKETING" | "UTILITY",
    language: "en_US",
    headerType: "NONE" as "NONE" | "TEXT" | "IMAGE",
    headerText: "",
    bodyText: "Hello {{Customer_Name}}, thank you for choosing us! Your order {{Order_ID}} for {{Product_Name}} has been confirmed and will arrive by {{Delivery_Date}}.",
    footerText: "Reply STOP to unsubscribe",
    buttonType: "URL" as "NONE" | "URL" | "QUICK_REPLY" | "OTP",
    buttonText: "Track Order Status",
    buttonUrl: "https://digitalbeings.in/track"
  });

  // Dynamic variable definitions (labels and sample preview values)
  const [variableDefs, setVariableDefs] = useState<Record<string, VariableDef>>({
    Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Rahul Sharma" },
    Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "ORD-9481" },
    Product_Name: { name: "Product_Name", label: "Product Name", sampleValue: "Wireless Earbuds" },
    Delivery_Date: { name: "Delivery_Date", label: "Delivery Date", sampleValue: "24 Oct 2026" }
  });

  // Saved template variables from backend / localStorage
  const [savedTemplateVars, setSavedTemplateVars] = useState<Record<string, Array<{ index: number; name: string; label: string; sampleValue: string }>>>({});

  const getProjectId = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("projectId") || "09107424-8301-4259-a7b5-a9e207f3bfca";
    }
    return "09107424-8301-4259-a7b5-a9e207f3bfca";
  };
  const projectId = getProjectId();

  const activeBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBusinessId) || businesses[0] || null;
  }, [businesses, selectedBusinessId]);

  const activeWaba = useMemo(() => {
    if (!activeBusiness) return null;
    return activeBusiness.wabas?.find(w => w.id === selectedWabaId) || activeBusiness.wabas?.[0] || null;
  }, [activeBusiness, selectedWabaId]);

  const activePhone = useMemo(() => {
    return activeWaba?.phones?.[0] || null;
  }, [activeWaba]);

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
    } else if (/link|url|tracking/i.test(lower)) {
      sampleValue = "https://digitalbeings.in/track";
      if (!label) label = "Tracking Link";
    } else if (/agent|rider|driver/i.test(lower)) {
      sampleValue = "Vikram Singh";
      if (!label) label = "Delivery Partner";
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

    let before = text.substring(0, start);
    let after = text.substring(end);

    while (before.endsWith("{") && after.startsWith("}")) {
      before = before.slice(0, -1);
      after = after.slice(1);
      start -= 1;
      end += 1;
    }

    const newText = text.substring(0, start) + insertion + text.substring(end);
    setFormData(prev => ({ ...prev, bodyText: newText }));

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
        textarea.setSelectionRange(start + 2, start + 2 + placeholder.length);
      } else {
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
      text = text.replace(/\{+/g, "").replace(/\}+/g, "");
    }
    return text;
  }, [formData.bodyText, detectedVariables, variableDefs, previewMode]);

  // Quick Starter Preset Loader
  const loadPreset = (presetKey: "ORDER" | "CART" | "DELIVERY" | "OTP") => {
    if (presetKey === "ORDER") {
      setFormData({
        name: "order_confirmation_v1",
        category: "UTILITY",
        language: "en_US",
        headerType: "TEXT",
        headerText: "Order Confirmed! 🎉",
        bodyText: "Hello {{Customer_Name}}, thank you for shopping with us! Your order {{Order_ID}} for {{Product_Name}} worth {{Total_Amount}} has been confirmed.",
        footerText: "Fast shipping via Digital Beings",
        buttonType: "URL",
        buttonText: "View Order 📦",
        buttonUrl: "https://digitalbeings.in/track"
      });
      setVariableDefs({
        Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Priya Patel" },
        Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "ORD-9482" },
        Product_Name: { name: "Product_Name", label: "Product Name", sampleValue: "Sneakers (Size 8)" },
        Total_Amount: { name: "Total_Amount", label: "Total Amount", sampleValue: "₹2,499" }
      });
    } else if (presetKey === "CART") {
      setFormData({
        name: "abandoned_cart_discount_v1",
        category: "MARKETING",
        language: "en_US",
        headerType: "TEXT",
        headerText: "You left items in your cart! 🛒",
        bodyText: "Hi {{Customer_Name}}, we noticed you left {{Product_Name}} in your cart! Complete your purchase today and get {{Offer_Discount}} with code {{Coupon_Code}}.",
        footerText: "Limited time offer. Reply STOP to opt out.",
        buttonType: "URL",
        buttonText: "Complete Purchase ➔",
        buttonUrl: "https://digitalbeings.in/checkout"
      });
      setVariableDefs({
        Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Rahul Sharma" },
        Product_Name: { name: "Product_Name", label: "Product Name", sampleValue: "Noise Cancelling Headphones" },
        Offer_Discount: { name: "Offer_Discount", label: "Offer Discount", sampleValue: "15% OFF" },
        Coupon_Code: { name: "Coupon_Code", label: "Coupon Code", sampleValue: "SAVE15" }
      });
    } else if (presetKey === "DELIVERY") {
      setFormData({
        name: "delivery_alert_v1",
        category: "UTILITY",
        language: "en_US",
        headerType: "TEXT",
        headerText: "Out for Delivery Today! 🚚",
        bodyText: "Hello {{Customer_Name}}, your shipment {{Order_ID}} is out for delivery with our delivery partner {{Rider_Name}} to {{Delivery_Address}}.",
        footerText: "Contact driver via the tracking link below.",
        buttonType: "URL",
        buttonText: "Live GPS Tracking 📍",
        buttonUrl: "https://digitalbeings.in/track"
      });
      setVariableDefs({
        Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Ananya Roy" },
        Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "DEL-8491" },
        Rider_Name: { name: "Rider_Name", label: "Delivery Partner", sampleValue: "Suresh Kumar" },
        Delivery_Address: { name: "Delivery_Address", label: "Delivery Address", sampleValue: "B-204 Sunshine Heights, Pune" }
      });
    } else if (presetKey === "OTP") {
      setFormData({
        name: "otp_verification_standard",
        category: "AUTHENTICATION",
        language: "en_US",
        headerType: "NONE",
        headerText: "",
        bodyText: "Your verification code is 123456. Valid for 10 minutes. For your security, do not share this code.",
        footerText: "",
        buttonType: "OTP",
        buttonText: "Copy Code",
        buttonUrl: ""
      });
    }
  };

  const loadBusinesses = async (initialWabaId?: string) => {
    setLoadingBusinesses(true);
    const pid = getProjectId();
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/accounts/${pid}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.businesses) && data.businesses.length > 0) {
        setBusinesses(data.businesses);

        // Determine which Business and WABA to select
        const savedBizId = typeof window !== "undefined" ? localStorage.getItem("selected_meta_biz_id") : null;
        const savedWabaId = typeof window !== "undefined" ? localStorage.getItem("selected_meta_waba_id") : null;

        let targetBiz = data.businesses[0];
        let targetWaba = targetBiz.wabas?.[0]?.id || "";

        if (initialWabaId) {
          for (const b of data.businesses) {
            const w = b.wabas?.find((waba: any) => waba.id === initialWabaId);
            if (w) {
              targetBiz = b;
              targetWaba = w.id;
              break;
            }
          }
        } else if (savedBizId || savedWabaId) {
          for (const b of data.businesses) {
            if (savedBizId && b.id === savedBizId) {
              targetBiz = b;
              if (savedWabaId && b.wabas?.some((w: any) => w.id === savedWabaId)) {
                targetWaba = savedWabaId;
              } else {
                targetWaba = b.wabas?.[0]?.id || "";
              }
              break;
            } else if (savedWabaId) {
              const w = b.wabas?.find((waba: any) => waba.id === savedWabaId);
              if (w) {
                targetBiz = b;
                targetWaba = w.id;
                break;
              }
            }
          }
        }

        setSelectedBusinessId(targetBiz.id);
        setSelectedWabaId(targetWaba);
        setWabaId(targetWaba);
        setCreateModalWabaId(targetWaba);

        // Load templates for this WABA
        await loadTemplates(targetWaba);
      } else {
        await loadTemplates();
      }
    } catch (e) {
      console.error("Error loading Meta businesses:", e);
      await loadTemplates();
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const loadTemplates = async (targetWabaId?: string) => {
    const activeWaba = targetWabaId || selectedWabaId || wabaId;
    const pid = getProjectId();
    setLoading(true);
    setError(null);
    try {
      const query = activeWaba ? `?wabaId=${encodeURIComponent(activeWaba)}` : "";
      const res = await fetch(`${getApiUrl()}/v1/meta/templates/${pid}${query}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        if (data.wabaId) {
          setWabaId(data.wabaId);
          if (!selectedWabaId) setSelectedWabaId(data.wabaId);
          if (!createModalWabaId) setCreateModalWabaId(data.wabaId);
        }
      } else {
        setError(data.error || "Failed to load templates from Meta");
      }

      try {
        const varRes = await fetch(`${getApiUrl()}/v1/meta/template-variables/${pid}`);
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

  const handleBusinessChange = (bizId: string) => {
    setSelectedBusinessId(bizId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_meta_biz_id", bizId);
    }
    const biz = businesses.find(b => b.id === bizId);
    const firstWabaId = biz?.wabas?.[0]?.id || "";
    setSelectedWabaId(firstWabaId);
    setWabaId(firstWabaId);
    setCreateModalWabaId(firstWabaId);
    if (typeof window !== "undefined" && firstWabaId) {
      localStorage.setItem("selected_meta_waba_id", firstWabaId);
    }
    loadTemplates(firstWabaId);
  };

  const handleWabaChange = (newWabaId: string) => {
    setSelectedWabaId(newWabaId);
    setWabaId(newWabaId);
    setCreateModalWabaId(newWabaId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_meta_waba_id", newWabaId);
    }
    for (const b of businesses) {
      if (b.wabas?.some(w => w.id === newWabaId)) {
        setSelectedBusinessId(b.id);
        if (typeof window !== "undefined") {
          localStorage.setItem("selected_meta_biz_id", b.id);
        }
        break;
      }
    }
    loadTemplates(newWabaId);
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  // Close custom dropdowns on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bizDropdownRef.current && !bizDropdownRef.current.contains(event.target as Node)) {
        setBizDropdownOpen(false);
      }
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setPhoneDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBizDropdownOpen(false);
        setPhoneDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const copyTemplateName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2500);
  };

  const handleDelete = (name: string, id?: string) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To delete production WhatsApp message templates, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    const isProtected = name.toLowerCase() === "hello_world" || name.toLowerCase().startsWith("sample_");
    if (isProtected) {
      showError(
        `"${name}" is a default template created by Meta WhatsApp. Meta locks default templates and does not permit them to be deleted.`,
        "Protected System Template"
      );
      return;
    }

    const currentPortfolioName = activeBusiness?.name || "Connected Portfolio";
    const targetWaba = selectedWabaId || wabaId || "2107898293422238";

    showModal({
      title: "Delete WhatsApp Template?",
      type: "warning",
      confirmVariant: "danger",
      loaderVariant: "bubble",
      badge: "Permanent Action",
      message: `Are you sure you want to delete template "${name}" from Meta WhatsApp account (${currentPortfolioName})?`,
      details: [
        { label: "Business Portfolio", value: currentPortfolioName },
        { label: "Template Name", value: name },
        { label: "Template ID", value: id || "N/A" },
        { label: "Target WABA ID", value: targetWaba }
      ],
      note: "Once deleted from Meta, any active marketing campaigns or OTP dispatch using this template name will immediately fail.",
      confirmText: "Yes, Delete Template",
      cancelText: "Cancel",
      loadingTitle: `Deleting Template "${name}"...`,
      loadingMessage: `Communicating with Meta WhatsApp Cloud API to permanently delete "${name}". Please wait...`,
      onConfirm: async () => {
        try {
          const pid = getProjectId();
          const query = `?wabaId=${encodeURIComponent(targetWaba)}${id ? `&hsm_id=${encodeURIComponent(id)}` : ""}`;
          const res = await fetch(`${getApiUrl()}/v1/meta/templates/${pid}/${encodeURIComponent(name)}${query}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
            try {
              localStorage.removeItem(`tpl_vars_${name}`);
            } catch (e) {}
            showSuccess(`Template "${name}" has been deleted successfully from Meta (${currentPortfolioName}).`, "Template Deleted");
            loadTemplates(targetWaba);
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
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To submit WhatsApp message templates to Meta for official review and approval, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

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
        metaBodyText = metaBodyText.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), `{{${metaIdx}}}`);
      });

      const bodyComponent: any = {
        type: "BODY",
        text: metaBodyText
      };

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

    const targetWaba = createModalWabaId || selectedWabaId || wabaId || "2107898293422238";
    const currentPortfolioName = activeBusiness?.name || "Connected Portfolio";

    try {
      setShowCreateModal(false);
      showLoading(
        `Registering template "${formData.name}" with Meta WhatsApp Cloud API for ${currentPortfolioName} (WABA ${targetWaba})...`,
        "Submitting Template to Meta..."
      );

      const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          language: formData.language,
          components,
          wabaId: targetWaba
        })
      });

      const data = await res.json();
      if (data.success) {
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
          } catch (e) {}
        }

        showSuccess(
          `Template "${formData.name}" registered successfully with Meta for ${currentPortfolioName}! Status: ${data.template?.status || "IN_REVIEW"}. Meta AI approves within 1 to 5 minutes!`,
          "Template Submitted"
        );
        loadTemplates(targetWaba);
      } else {
        showError(data.error || "Meta rejected the template format.", "Meta Rejection");
        setShowCreateModal(true);
        setSubmitError(data.error);
      }
    } catch (e: any) {
      showError(e.message || "Failed to submit template to Meta", "Submission Error");
      setShowCreateModal(true);
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>APPROVED</span>
          </span>
        );
      case "PENDING":
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>IN REVIEW</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <span>✕</span>
            <span>REJECTED</span>
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            <span>⏸</span>
            <span>PAUSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "AUTHENTICATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <span>🔑</span> OTP / Auth
          </span>
        );
      case "MARKETING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <span>📢</span> Marketing
          </span>
        );
      case "UTILITY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <span>📦</span> Utility
          </span>
        );
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-700">{category}</span>;
    }
  };

  // KPI Counts
  const totalApproved = templates.filter(t => t.status === "APPROVED").length;
  const totalPending = templates.filter(t => t.status === "PENDING" || t.status === "IN_REVIEW").length;
  const totalRejected = templates.filter(t => t.status === "REJECTED").length;
  const totalMarketing = templates.filter(t => t.category === "MARKETING").length;
  const totalUtility = templates.filter(t => t.category === "UTILITY").length;
  const totalAuth = templates.filter(t => t.category === "AUTHENTICATION").length;

  const filteredTemplates = templates.filter(t => {
    if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
    if (filterStatus !== "ALL") {
      if (filterStatus === "PENDING") {
        if (t.status !== "PENDING" && t.status !== "IN_REVIEW") return false;
      } else if (t.status !== filterStatus) {
        return false;
      }
    }
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {copiedName && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <span>📋</span>
          <span>Copied &quot;{copiedName}&quot; to clipboard!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR (User Mode vs Developer Mode) */}
      {/* ========================================================================= */}
      {isUser ? (
        /* USER MODE: Compact Unified Toolbar */
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
          {/* Left: Dual Portfolio & Number Selectors in place of the heading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-2xl">
            {/* Custom Business Portfolio Dropdown */}
            <div className="relative" ref={bizDropdownRef}>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Select Business Portfolio
              </label>
              <button
                type="button"
                onClick={() => {
                  setBizDropdownOpen(!bizDropdownOpen);
                  setPhoneDropdownOpen(false);
                }}
                disabled={loadingBusinesses || businesses.length === 0}
                className="w-full bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-2.5 shadow-2xs hover:shadow-xs transition text-left flex items-center justify-between gap-3 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-haspopup="listbox"
                aria-expanded={bizDropdownOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition shadow-2xs">
                    🏢
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {loadingBusinesses
                        ? "Loading Portfolios..."
                        : activeBusiness?.name || "No Portfolio Selected"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
                      {activeBusiness ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>{activeBusiness.wabas?.length || 0} Connected Account{activeBusiness.wabas?.length === 1 ? "" : "s"}</span>
                        </>
                      ) : (
                        <span>Meta Business Account</span>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                    bizDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Portfolio Dropdown Menu */}
              {bizDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-full min-w-[300px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Meta Business Portfolios
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {businesses.length} Connected
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 p-1">
                    {businesses.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No connected Meta portfolios found
                      </div>
                    ) : (
                      businesses.map((b) => {
                        const isSelected = b.id === selectedBusinessId;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              handleBusinessChange(b.id);
                              setBizDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white shadow-xs"
                                : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                  isSelected ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                🏢
                              </div>
                              <div className="min-w-0">
                                <div className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                                  {b.name}
                                </div>
                                <div className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                                  {b.wabas?.length || 0} WhatsApp Account{b.wabas?.length === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-md shrink-0">
                                Active ✓
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom WhatsApp Number Dropdown */}
            <div className="relative" ref={phoneDropdownRef}>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                Select WhatsApp Number
              </label>
              <button
                type="button"
                onClick={() => {
                  setPhoneDropdownOpen(!phoneDropdownOpen);
                  setBizDropdownOpen(false);
                }}
                disabled={loadingBusinesses || !activeBusiness?.wabas?.length}
                className="w-full bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-2.5 shadow-2xs hover:shadow-xs transition text-left flex items-center justify-between gap-3 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                aria-haspopup="listbox"
                aria-expanded={phoneDropdownOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition shadow-2xs font-bold">
                    📞
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate font-mono">
                      {activePhone?.number || (!activeBusiness?.wabas?.length ? "No registered numbers" : "Select WhatsApp Number")}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold truncate flex items-center gap-1 mt-0.5">
                      {activePhone?.verifiedName ? (
                        <>
                          <span className="text-emerald-500">✓</span>
                          <span>{activePhone.verifiedName}</span>
                        </>
                      ) : activeWaba?.name ? (
                        <span>{activeWaba.name}</span>
                      ) : (
                        <span className="text-slate-400">Cloud API</span>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                    phoneDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Phone Dropdown Menu */}
              {phoneDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-full min-w-[320px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      WhatsApp Accounts
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {activeBusiness?.wabas?.length || 0} Available
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 p-1">
                    {!activeBusiness?.wabas?.length ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No WhatsApp numbers registered for this portfolio
                      </div>
                    ) : (
                      activeBusiness.wabas.map((w) => {
                        const phone = w.phones?.[0]?.number || "Default WhatsApp Account";
                        const verifiedName = w.phones?.[0]?.verifiedName;
                        const isSelected = w.id === selectedWabaId;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              handleWabaChange(w.id);
                              setPhoneDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white shadow-xs"
                                : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isSelected ? "bg-slate-800 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                📞
                              </div>
                              <div className="min-w-0">
                                <div className={`text-xs font-bold font-mono truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                                  {phone}
                                </div>
                                <div className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                  {verifiedName ? `✓ ${verifiedName}` : w.name}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-md shrink-0">
                                Active ✓
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Clean Action Buttons (No in-page ModeToggle) */}
          <div className="flex items-center gap-2 self-start lg:self-end shrink-0">
            <button
              onClick={() => loadBusinesses(selectedWabaId)}
              disabled={loading || loadingBusinesses}
              className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className={`text-sm ${loading || loadingBusinesses ? "animate-spin" : ""}`}>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
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
                setVariableDefs({
                  Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Rahul Sharma" },
                  Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "ORD-9481" }
                });
                setCreateModalWabaId(selectedWabaId || wabaId);
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm font-bold leading-none">+</span>
              <span>Create Template</span>
            </button>
          </div>
        </div>
      ) : (
        /* DEVELOPER MODE: Full Technical Header */
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Meta WhatsApp Cloud Platform Studio • Live Enterprise Gateway
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Template Studio &amp; Message Approvals
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
              Design, preview, and register pre-approved WhatsApp message templates with dynamic personalization tags for broadcasts and OTPs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setShowTokenModal(true)}
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 shadow-2xs transition flex items-center gap-1.5"
              >
                <span>🔑</span> Meta Token
              </button>
              <button
                onClick={() => loadBusinesses(selectedWabaId)}
                disabled={loading || loadingBusinesses}
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className={`text-sm ${loading || loadingBusinesses ? "animate-spin" : ""}`}>🔄</span>
                {loading || loadingBusinesses ? "Syncing..." : "Sync from Meta"}
              </button>
              <button
                onClick={() => {
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
                  setVariableDefs({
                    Customer_Name: { name: "Customer_Name", label: "Customer Name", sampleValue: "Rahul Sharma" },
                    Order_ID: { name: "Order_ID", label: "Order ID", sampleValue: "ORD-9481" }
                  });
                  setCreateModalWabaId(selectedWabaId || wabaId);
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-md shadow-slate-900/10 hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>✨</span> Create Template
              </button>
            </div>
          </div>
        )}

      {/* ========================================================================= */}
      {/* 2. DEVELOPER MODE PORTFOLIO SELECTOR BANNER */}
      {/* ========================================================================= */}
      {!isUser && (
        /* DEVELOPER MODE: Technical Gradient Banner with WABA IDs and Meta Ping */
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mb-20"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3.5 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Meta Portfolio Segregation
                </span>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  {businesses.length > 0
                    ? `${businesses.length} Connected Meta Portfolio${businesses.length > 1 ? "s" : ""} Found`
                    : "Scanning Meta Business Portfolios..."}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                <div className="bg-slate-800/90 border border-slate-600/60 rounded-2xl p-3 shadow-inner">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>🏢 Meta Business Portfolio</span>
                    {activeBusiness && (
                      <span className="font-mono text-emerald-400 text-[10px]">ID: {activeBusiness.id}</span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBusinessId}
                      onChange={(e) => handleBusinessChange(e.target.value)}
                      disabled={loadingBusinesses || businesses.length === 0}
                      aria-label="Meta Business Portfolio"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer disabled:opacity-50 transition"
                    >
                      {businesses.length === 0 ? (
                        <option value="">{loadingBusinesses ? "Loading Portfolios..." : "No Portfolios Connected"}</option>
                      ) : (
                        businesses.map((b) => (
                          <option key={b.id} value={b.id} className="bg-slate-900 text-white py-1">
                            📁 {b.name} ({b.wabas?.length || 0} WABA{(b.wabas?.length || 0) !== 1 ? "s" : ""})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-800/90 border border-slate-600/60 rounded-2xl p-3 shadow-inner">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>📱 WhatsApp Account (WABA)</span>
                    {activeWaba && (
                      <span className="font-mono text-indigo-400 text-[10px]">WABA: {activeWaba.id.slice(-6)}</span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedWabaId}
                      onChange={(e) => handleWabaChange(e.target.value)}
                      disabled={loadingBusinesses || !activeBusiness?.wabas?.length}
                      aria-label="WhatsApp Account (WABA)"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:opacity-50 transition"
                    >
                      {!activeBusiness?.wabas?.length ? (
                        <option value="">No WABAs inside this portfolio</option>
                      ) : (
                        activeBusiness.wabas.map((w) => {
                          const phone = w.phones?.[0]?.number || "No phone linked";
                          return (
                            <option key={w.id} value={w.id} className="bg-slate-900 text-white py-1">
                              {w.name} • {phone}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap text-xs text-slate-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Viewing:</span>
                <span className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-emerald-300 font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>🏢</span>
                  <span>{activeBusiness?.name || "Digital Being"}</span>
                </span>
                <span className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-indigo-300 font-mono text-[11px] flex items-center gap-1 shadow-2xs">
                  <span>WABA:</span>
                  <span className="font-bold">{activeWaba?.id || wabaId || "2107898293422238"}</span>
                </span>
                {activePhone && (
                  <span className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-amber-300 font-bold flex items-center gap-1.5 shadow-2xs">
                    <span>📞</span>
                    <span>{activePhone.number}</span>
                    {activePhone.verifiedName && (
                      <span className="text-[10px] text-emerald-400 font-medium">({activePhone.verifiedName})</span>
                    )}
                  </span>
                )}
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                  <span>✓</span>
                  <span>Isolated Templates</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-700/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadBusinesses(selectedWabaId)}
                  disabled={loadingBusinesses || loading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span className={`text-sm ${loading || loadingBusinesses ? "animate-spin" : ""}`}>🔄</span>
                  <span>{loading || loadingBusinesses ? "Syncing Portfolio..." : "Refresh Portfolios"}</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Cloud API Live • Multi-Portfolio WABA Isolation Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STATUS METRIC CARDS (User Mode Minimal vs Dev Mode Bento) */}
      {/* ========================================================================= */}
      {isUser ? (
        /* USER MODE: Clean, Minimalist Status Cards */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === "ALL"
                ? "bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-xs"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 text-xs shrink-0 font-bold">
                📄
              </div>
              <span className="text-xs font-bold text-slate-700">All Templates</span>
            </div>
            <div className="mt-2.5 text-2xl font-black text-slate-900">{templates.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total in selected portfolio</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "APPROVED" ? "ALL" : "APPROVED")}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === "APPROVED"
                ? "bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-white border-slate-200/90 hover:border-emerald-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 text-xs shrink-0 font-black">
                ✓
              </div>
              <span className="text-xs font-bold text-emerald-900">Approved &amp; Ready</span>
            </div>
            <div className="mt-2.5 text-2xl font-black text-slate-900">{totalApproved}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ready to send to customers</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "PENDING" ? "ALL" : "PENDING")}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === "PENDING"
                ? "bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-white border-slate-200/90 hover:border-amber-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 text-xs shrink-0 font-bold">
                🕒
              </div>
              <span className="text-xs font-bold text-amber-900">In Review by Meta</span>
            </div>
            <div className="mt-2.5 text-2xl font-black text-slate-900">{totalPending}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Waiting for Meta approval</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "REJECTED" ? "ALL" : "REJECTED")}
            className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer ${
              filterStatus === "REJECTED"
                ? "bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
                : "bg-white border-slate-200/90 hover:border-rose-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 text-xs shrink-0 font-black">
                !
              </div>
              <span className="text-xs font-bold text-rose-900">Needs Revision</span>
            </div>
            <div className="mt-2.5 text-2xl font-black text-slate-900">{totalRejected}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalRejected > 0 ? "Rejected by Meta policy" : "0 rejected templates"}
            </div>
          </button>
        </div>
      ) : (
        /* DEVELOPER MODE: Full Bento KPI Strip with SLA Metrics */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Templates</span>
              <span className="text-xl">📄</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{templates.length}</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                {activeBusiness?.name ? activeBusiness.name.slice(0, 14) : "In WABA"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Discovered on Meta Graph API</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved &amp; Live</span>
              <span className="text-xl">🟢</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{totalApproved}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Ready to Send
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Passing all Meta safety guidelines</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In Review by Meta</span>
              <span className="text-xl">⏳</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{totalPending}</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                AI Evaluating
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Automated Meta review in progress</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Approval SLA</span>
              <span className="text-xl">⚡</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">~2 Mins</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                Meta Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Typical turnaround for new designs</p>
          </div>
        </div>
      )}

      {/* Meta Connection Onboarding / Error Banner */}
      {error && (
        <div className={`p-5 rounded-3xl text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          error === "Meta WhatsApp not connected"
            ? "bg-emerald-50/80 border border-emerald-200 text-emerald-950"
            : "bg-rose-50 border border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{error === "Meta WhatsApp not connected" ? "🔗" : "⚠️"}</span>
            <div>
              <p className={`font-extrabold text-sm ${error === "Meta WhatsApp not connected" ? "text-emerald-950" : "text-rose-900"}`}>
                {error === "Meta WhatsApp not connected" ? "Connect Your WhatsApp Business Account" : "Meta WhatsApp API Error"}
              </p>
              <p className={`text-xs mt-0.5 leading-relaxed ${error === "Meta WhatsApp not connected" ? "text-emerald-800" : "text-rose-700"}`}>
                {error === "Meta WhatsApp not connected"
                  ? "Link your Meta WhatsApp Cloud API token to view, create, and submit templates for instant Meta approval."
                  : error}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTokenModal(true)}
            className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-2xs transition shrink-0 cursor-pointer ${
              error === "Meta WhatsApp not connected"
                ? "bg-[#064e3b] hover:bg-[#043d2e]"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {error === "Meta WhatsApp not connected" ? "Connect Meta Account ➔" : "Update Meta Access Token ➔"}
          </button>
        </div>
      )}

      {/* CONTROLS BAR: SEGMENTED TABS, STATUS FILTER, SEARCH & VIEW TOGGLE */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Row 1: Category Segmented Tabs & View Mode Switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl overflow-x-auto max-w-full">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                filterCategory === "ALL"
                  ? "bg-[#e6f7ef] text-emerald-950 border border-emerald-200/80 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              All Templates ({templates.length})
            </button>
            <button
              onClick={() => setFilterCategory("MARKETING")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                filterCategory === "MARKETING"
                  ? "bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              <span>📢 Marketing</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-extrabold">
                {totalMarketing}
              </span>
            </button>
            <button
              onClick={() => setFilterCategory("UTILITY")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                filterCategory === "UTILITY"
                  ? "bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              <span>📦 Utility</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-extrabold">
                {totalUtility}
              </span>
            </button>
            <button
              onClick={() => setFilterCategory("AUTHENTICATION")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                filterCategory === "AUTHENTICATION"
                  ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              <span>🔑 Authentication / OTP</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-extrabold">
                {totalAuth}
              </span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                viewMode === "cards"
                  ? "bg-white text-emerald-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className={viewMode === "cards" ? "text-emerald-700 text-sm font-bold" : "text-sm"}>⊞</span>
              <span>Chat Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 font-semibold"
              }`}
            >
              <span className="text-sm">☰</span>
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="relative w-full sm:flex-1">
            <input
              type="text"
              placeholder="Search templates by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
            />
            <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs transition"
            >
              <option value="ALL">All Statuses ({templates.length})</option>
              <option value="APPROVED">Approved Only</option>
              <option value="PENDING">In Review Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENT: CARDS VIEW VS TABLE VIEW */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-2xs space-y-3">
          <Loader scale={0.9} color="#0f172a" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing templates from Meta Graph API...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-16 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto">
            📄
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">No templates found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              No WhatsApp templates match your selected filters. Design a new message and submit it to Meta for instant review.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            + Create New Template
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* VISUAL CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const header = template.components?.find(c => c.type === "HEADER");
            const body = template.components?.find(c => c.type === "BODY");
            const footer = template.components?.find(c => c.type === "FOOTER");
            const buttonsComp = template.components?.find(c => c.type === "BUTTONS");
            const isProtected = template.name.toLowerCase() === "hello_world" || template.name.toLowerCase().startsWith("sample_");

            const tplVars = savedTemplateVars[template.name] || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`tpl_vars_${template.name}`) || "[]") : []);

            return (
              <div
                key={template.id}
                className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition duration-200 group"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate" title={template.name}>
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {getCategoryBadge(template.category)}
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded">
                          {template.language}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(template.status)}
                      <button
                        onClick={() => copyTemplateName(template.name)}
                        className="text-slate-400 hover:text-slate-700 p-1 text-base font-bold transition cursor-pointer"
                        title="Template options"
                      >
                        ⋮
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Realistic Chat Bubble Container with subtle wallpaper texture */}
                  <div className="p-4 rounded-2xl border border-[#e4ded5] space-y-2 relative shadow-inner bg-[#efeae2] bg-[radial-gradient(#d3cbbe_0.75px,transparent_0.75px)] [background-size:12px_12px]">
                    {/* Speech Bubble */}
                    <div className="bg-white rounded-2xl rounded-tl-none p-3.5 shadow-2xs border border-slate-200/50 text-xs space-y-2 text-slate-800">
                      {header && (
                        <div className="font-extrabold text-slate-900 border-b border-black/5 pb-1">
                          {header.format === "IMAGE" ? "🖼️ [Image Header]" : header.text}
                        </div>
                      )}

                      <div className="whitespace-pre-line leading-relaxed text-slate-800 text-[11px] sm:text-xs">
                        {template.name.toLowerCase() === "hello_world" ? (
                          <>
                            <div className="font-extrabold text-slate-900 mb-1">Hello World</div>
                            <div>Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.</div>
                          </>
                        ) : template.category === "AUTHENTICATION" ? (
                          "Your verification code is: 123456. Valid for 10 minutes. For your security, do not share this code."
                        ) : (
                          body?.text || "No message body specified"
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 pt-0.5 border-t border-black/5">
                        {template.name.toLowerCase() === "hello_world"
                          ? "WhatsApp Business Platform sample message"
                          : footer?.text || (template.category === "AUTHENTICATION" ? "Expires in 10 minutes." : null)}
                      </div>

                      <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 pt-0.5">
                        <span>12:00 PM</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {template.category === "AUTHENTICATION" ? (
                      <div className="bg-white text-sky-600 font-bold text-center py-2 rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-1">
                        <span>🔗</span>
                        <span>Copy code</span>
                      </div>
                    ) : buttonsComp && buttonsComp.buttons && buttonsComp.buttons.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {buttonsComp.buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="bg-white text-sky-600 font-bold text-center py-2 rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {btn.type === "URL" && <span>🔗</span>}
                            {btn.type === "QUICK_REPLY" && <span>💬</span>}
                            {btn.type === "OTP" && <span>📋</span>}
                            <span>{btn.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Dynamic Excel Variables Cloud */}
                    {tplVars.length > 0 && (
                      <div className="pt-2 border-t border-black/10 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Excel Variables:
                        </span>
                        {tplVars.map((v: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200"
                          >
                            <span className="text-purple-400">&#123;&#123;{v.index}&#125;&#125;</span>
                            <span>{v.label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  {template.status === "APPROVED" && template.category !== "AUTHENTICATION" ? (
                    <Link
                      href={`/dashboard/campaigns`}
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition border border-emerald-300 shadow-2xs text-xs"
                    >
                      <span>🚀</span>
                      <span>Launch Broadcast</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-black">
                        ✓
                      </span>
                      <span>Ready for System Use</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyTemplateName(template.name)}
                      className="text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>Copy Name</span>
                    </button>
                    {!isProtected && (
                      <button
                        onClick={() => handleDelete(template.name, template.id)}
                        className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Dense enterprise management) */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Template Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Language</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Mapped Variables</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((t) => {
                  const isProtected = t.name.toLowerCase() === "hello_world" || t.name.toLowerCase().startsWith("sample_");
                  const tplVars = savedTemplateVars[t.name] || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`tpl_vars_${t.name}`) || "[]") : []);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                      </td>
                      <td className="p-4">{getCategoryBadge(t.category)}</td>
                      <td className="p-4 font-mono uppercase text-slate-600 font-bold">{t.language}</td>
                      <td className="p-4">{getStatusBadge(t.status)}</td>
                      <td className="p-4">
                        {tplVars.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tplVars.map((v: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-200"
                              >
                                &#123;&#123;{v.index}&#125;&#125; {v.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Static Template</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyTemplateName(t.name)}
                            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg font-semibold"
                          >
                            Copy Name
                          </button>
                          {!isProtected && (
                            <button
                              onClick={() => handleDelete(t.name, t.id)}
                              className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-semibold"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE STUDIO MODAL (Two-Column Designer with Ultra-Realistic iPhone) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-hidden"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white z-10">
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
                  <span>✨</span> Create &amp; Submit WhatsApp Template
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design with custom variable brackets like <code className="font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-bold">&#123;&#123;Customer_Name&#125;&#125;</code>. Meta AI evaluates in ~2 minutes.
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
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="shrink-0 mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <strong>Meta Submission Error:</strong> {submitError}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="createTemplateForm" onSubmit={handleSubmitTemplate} className="space-y-6">
                
                {/* QUICK STARTER PRESET BAR */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>⚡</span> 1-Click Starter Presets:
                    </span>
                    <span className="text-[10px] text-slate-400">Click to instantly populate template &amp; variables</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => loadPreset("ORDER")}
                      className="p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-900">🛍️ Order Update</div>
                      <div className="text-[10px] text-slate-500">Utility Category</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset("CART")}
                      className="p-2 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-900">🛒 Cart Recovery</div>
                      <div className="text-[10px] text-slate-500">Marketing Category</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset("DELIVERY")}
                      className="p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-900">📦 Out for Delivery</div>
                      <div className="text-[10px] text-slate-500">Utility Category</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset("OTP")}
                      className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-900">🔑 1-Tap OTP</div>
                      <div className="text-[10px] text-slate-500">Auth Category</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Editor Inputs */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Target Business Portfolio / WABA Selector */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🏢</span> Target Brand Portfolio &amp; Number <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                          {isDev ? "Meta API Target" : "Brand Portfolio"}
                        </span>
                      </div>
                      <select
                        value={createModalWabaId || selectedWabaId}
                        onChange={(e) => setCreateModalWabaId(e.target.value)}
                        aria-label="Target Meta Business Portfolio & WABA"
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                      >
                        {businesses.map((b) => (
                          <optgroup key={b.id} label={`📁 Portfolio: ${b.name}`}>
                            {b.wabas?.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} {w.phones?.[0]?.number ? `• ${w.phones[0].number}` : ""} {isDev ? `[WABA: ${w.id}]` : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        {isDev
                          ? "Meta AI will register this template under the selected portfolio so it stays segregated."
                          : "This template will be saved and approved for your selected brand."}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Template Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. order_alert_v1"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Category</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        >
                          <option value="MARKETING">📢 Marketing / Promotions</option>
                          <option value="UTILITY">📦 Utility / Orders</option>
                          <option value="AUTHENTICATION">🔑 Authentication (OTP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Language</label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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

                        {/* Body Text & Variable Inserters */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Body Message <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {detectedVariables.length} variable{detectedVariables.length !== 1 ? "s" : ""} detected
                            </span>
                          </div>

                          {/* Quick Insert Pills */}
                          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 block">
                              ⚡ Click pill to insert at cursor:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Customer_Name")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 transition shadow-2xs"
                              >
                                👤 + &#123;&#123;Customer_Name&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Order_ID")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 transition shadow-2xs"
                              >
                                📦 + &#123;&#123;Order_ID&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Product_Name")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 transition shadow-2xs"
                              >
                                🛍️ + &#123;&#123;Product_Name&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Offer_Discount")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition shadow-2xs"
                              >
                                🏷️ + &#123;&#123;Offer_Discount&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Delivery_Date")}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition shadow-2xs"
                              >
                                📅 + &#123;&#123;Delivery_Date&#125;&#125;
                              </button>
                              <button
                                type="button"
                                onClick={() => insertVariableAtCursor("Custom_Field", true)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition shadow-2xs"
                              >
                                ✨ + Custom &#123;&#123;...&#125;&#125;
                              </button>
                            </div>
                          </div>

                          <textarea
                            ref={bodyTextareaRef}
                            rows={4}
                            required
                            value={formData.bodyText}
                            onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-sans focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            placeholder="Type message here... Click buttons above to insert variable brackets."
                          />
                        </div>

                        {/* Dynamic Variable Definition & Excel Mapping Table */}
                        {detectedVariables.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">📊</span>
                                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                  Excel Column Mapping ({detectedVariables.length} fields)
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                Auto-translates to Meta &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              These labels will be used when uploading Excel sheets to automatically populate recipient messages.
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
                                      <span className="text-[10px] text-slate-400 font-mono">Meta Positional #{metaIdx}</span>
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
                                          Sample Value (Required by Meta):
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
                              Button Action
                            </label>
                            <select
                              value={formData.buttonType}
                              onChange={(e) => setFormData({ ...formData, buttonType: e.target.value as any })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white"
                            >
                              <option value="NONE">None</option>
                              <option value="URL">Website Link</option>
                              <option value="QUICK_REPLY">Quick Reply Button</option>
                            </select>
                          </div>
                          {formData.buttonType !== "NONE" && (
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Button Label
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Track Order"
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
                          <span>🔒</span> Meta Standard Authentication Format
                        </p>
                        <p>
                          Meta automatically formats high-security OTP templates with a 1-tap &quot;Copy Code&quot; button. Custom promotional text is restricted to prevent phishing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Ultra-Realistic iPhone Simulator */}
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
                            👁️ Customer View
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMode("raw")}
                            className={`px-2 py-0.5 rounded-md transition ${previewMode === "raw" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"}`}
                          >
                            🔍 Code View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Smartphone Mockup */}
                    <div className="w-full max-w-[290px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700 relative">
                      {/* Dynamic Island Notch */}
                      <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto mb-2.5"></div>

                      {/* WhatsApp Chat Area */}
                      <div className="bg-[#E5DDD5] rounded-[24px] overflow-hidden min-h-[390px] flex flex-col justify-between p-3 border border-slate-300 relative text-xs">
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

                        {/* Speech Bubble */}
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
                        {previewMode === "live" ? "Showing customer view with sample variables" : "Showing template code structure"}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  form="createTemplateForm"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold disabled:opacity-50 shadow-sm transition flex items-center gap-2 cursor-pointer"
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
