"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export type OfficeModule =
  | "leads"
  | "chat"
  | "payments"
  | "onboarding"
  | "portfolio"
  | "revenue"
  | "activity";

interface Lead {
  id: string;
  salespersonEmail: string;
  businessName: string;
  contactPerson: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  dealAmount: number;
  planSelected: "TRIAL" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
  status: "NEW_LEAD" | "CONTACTED" | "PAYMENT_LINK_SENT" | "PAID" | "ONBOARDED";
  wabaId?: string;
  metaPhoneNumberId?: string;
  systemToken?: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  paymentStatus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentLinkItem {
  id: string;
  leadId?: string;
  rzpLinkId?: string;
  shortUrl: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  leadId: string;
  senderPhone?: string;
  recipientPhone: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  metaMessageId?: string;
  status: string;
  createdAt: string;
}

interface SalesSettings {
  businessPortfolioName: string;
  salesWhatsAppNumber: string;
  metaPhoneId?: string;
  metaWabaId?: string;
  metaAccessToken?: string;
  isConnected: boolean;
}

export default function OfficeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active module for Left Vertical Navigation
  const [activeModule, setActiveModule] = useState<OfficeModule>("leads");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Settings & Single Business Portfolio
  const [settings, setSettings] = useState<SalesSettings>({
    businessPortfolioName: "Digital Beings Official Sales Portfolio",
    salesWhatsAppNumber: "+91 80004 88200",
    isConnected: true
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    businessPortfolioName: "Digital Beings Official Sales Portfolio",
    salesWhatsAppNumber: "+91 80004 88200",
    metaPhoneId: "",
    metaWabaId: "",
    metaAccessToken: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Leads & Pipeline
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadCounts, setLeadCounts] = useState({
    TOTAL: 0,
    NEW_LEAD: 0,
    CONTACTED: 0,
    PAYMENT_LINK_SENT: 0,
    PAID: 0,
    ONBOARDED: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<"ALL" | Lead["status"]>("ALL");

  // Payment Links list
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>([]);
  const [loadingPayLinks, setLoadingPayLinks] = useState(false);

  // "First Client" / New Lead Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    dealAmount: "500",
    planSelected: "TRIAL" as Lead["planSelected"],
    notes: "",
    status: "NEW_LEAD" as Lead["status"]
  });
  const [submittingClient, setSubmittingClient] = useState(false);

  // Razorpay Payment Link Modal
  const [payLinkModalOpen, setPayLinkModalOpen] = useState(false);
  const [selectedLeadForPay, setSelectedLeadForPay] = useState<Lead | null>(null);
  const [payLinkForm, setPayLinkForm] = useState({
    amount: "500",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    description: "WhatsApp SaaS Onboarding & Starter Plan"
  });
  const [generatingPayLink, setGeneratingPayLink] = useState(false);
  const [generatedLinkResult, setGeneratedLinkResult] = useState<{ shortUrl: string; amount: number } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2-Way Lead Chat
  const [activeChatLead, setActiveChatLead] = useState<Lead | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  // Onboard / WABA Config Modal
  const [wabaModalOpen, setWabaModalOpen] = useState(false);
  const [selectedLeadForWaba, setSelectedLeadForWaba] = useState<Lead | null>(null);
  const [wabaForm, setWabaForm] = useState({
    wabaId: "",
    metaPhoneNumberId: "",
    systemToken: "",
    notes: ""
  });
  const [savingWaba, setSavingWaba] = useState(false);

  // Initial Load & Auth Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        router.push("/login");
        return;
      }
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        loadDashboardData(parsed.email);
        loadPaymentLinks(parsed.email);
      } catch (e) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
  }, [router]);

  const loadDashboardData = async (email: string = "emp@digitalbeings.com") => {
    try {
      // 1. Fetch settings
      const setRes = await fetch(`${getApiUrl()}/v1/office/settings?email=${encodeURIComponent(email)}`);
      const setData = await setRes.json();
      if (setData.success && setData.settings) {
        setSettings(setData.settings);
        setSettingsForm({
          businessPortfolioName: setData.settings.businessPortfolioName || "Digital Beings Official Sales Portfolio",
          salesWhatsAppNumber: setData.settings.salesWhatsAppNumber || "+91 80004 88200",
          metaPhoneId: setData.settings.metaPhoneId || "",
          metaWabaId: setData.settings.metaWabaId || "",
          metaAccessToken: setData.settings.metaAccessToken || ""
        });
      }

      // 2. Fetch leads
      const leadRes = await fetch(`${getApiUrl()}/v1/office/leads?email=${encodeURIComponent(email)}`);
      const leadData = await leadRes.json();
      if (leadData.success) {
        const fetchedLeads = leadData.leads || [];
        setLeads(fetchedLeads);
        if (leadData.counts) setLeadCounts(leadData.counts);
        if (leadData.totalRevenue !== undefined) setTotalRevenue(leadData.totalRevenue);

        // If no chat lead selected yet, set the first lead
        if (!activeChatLead && fetchedLeads.length > 0) {
          setActiveChatLead(fetchedLeads[0]);
          loadChatMessages(fetchedLeads[0].id);
        }
      }
    } catch (err: any) {
      console.error("Error loading office data:", err);
    }
  };

  const loadPaymentLinks = async (email: string = "emp@digitalbeings.com") => {
    setLoadingPayLinks(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/payment-links?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) {
        setPaymentLinks(data.links || []);
      }
    } catch (e) {
      console.error("Error fetching payment links:", e);
    } finally {
      setLoadingPayLinks(false);
    }
  };

  const loadChatMessages = async (leadId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/chat/${leadId}`);
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Error fetching chat:", e);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("projectId");
      localStorage.removeItem("organizationId");
      localStorage.removeItem("db_preview_role");
      router.push("/login");
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salespersonEmail: user?.email || "emp@digitalbeings.com",
          ...settingsForm
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update settings");
      setSettingsModalOpen(false);
      loadDashboardData(user?.email);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Create Client Form
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClient(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salespersonEmail: user?.email || "emp@digitalbeings.com",
          ...clientForm
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create client");

      setClientModalOpen(false);
      setClientForm({
        businessName: "",
        contactPerson: "",
        email: "",
        phone: "",
        whatsappNumber: "",
        dealAmount: "500",
        planSelected: "TRIAL",
        notes: "",
        status: "NEW_LEAD"
      });
      loadDashboardData(user?.email);
    } catch (err: any) {
      alert("Error creating client: " + err.message);
    } finally {
      setSubmittingClient(false);
    }
  };

  // Update Lead Status
  const handleUpdateStatus = async (leadId: string, newStatus: Lead["status"]) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData(user?.email);
      }
    } catch (err: any) {
      console.error("Error updating lead status:", err);
    }
  };

  // Open Payment Link Modal
  const openPayLinkModal = (lead?: Lead) => {
    setGeneratedLinkResult(null);
    setCopiedLink(false);
    if (lead) {
      setSelectedLeadForPay(lead);
      setPayLinkForm({
        amount: String(lead.dealAmount || 500),
        customerName: lead.contactPerson || lead.businessName,
        customerPhone: lead.whatsappNumber || lead.phone || "",
        customerEmail: lead.email || "",
        description: `Digital Beings WhatsApp SaaS - ${lead.planSelected} Plan`
      });
    } else {
      setSelectedLeadForPay(null);
      setPayLinkForm({
        amount: "500",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        description: "Digital Beings SaaS Platform Activation"
      });
    }
    setPayLinkModalOpen(true);
  };

  // Generate Payment Link
  const handleGeneratePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingPayLink(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/payment-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadForPay?.id || null,
          salespersonEmail: user?.email || "emp@digitalbeings.com",
          amount: payLinkForm.amount,
          customerName: payLinkForm.customerName,
          customerPhone: payLinkForm.customerPhone,
          customerEmail: payLinkForm.customerEmail,
          description: payLinkForm.description
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate link");

      setGeneratedLinkResult({
        shortUrl: data.shortUrl,
        amount: data.amount
      });
      loadDashboardData(user?.email);
      loadPaymentLinks(user?.email);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGeneratingPayLink(false);
    }
  };

  // Copy Link to clipboard
  const handleCopyLink = (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Select Lead for Chat
  const handleSelectLeadForChat = (lead: Lead) => {
    setActiveChatLead(lead);
    loadChatMessages(lead.id);
  };

  // Send WhatsApp Message in Chat
  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : chatInput;
    if (!textToSend.trim() || !activeChatLead) return;

    const messageText = textToSend.trim();
    if (customText === undefined) setChatInput("");
    setSendingChat(true);

    try {
      const res = await fetch(`${getApiUrl()}/v1/office/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeChatLead.id,
          phone: activeChatLead.whatsappNumber || activeChatLead.phone,
          message: messageText,
          salespersonEmail: user?.email || "emp@digitalbeings.com"
        })
      });
      const data = await res.json();
      if (data.success) {
        loadChatMessages(activeChatLead.id);
        loadDashboardData(user?.email);
      }
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setSendingChat(false);
    }
  };

  // Open WABA Modal
  const openWabaModal = (lead: Lead) => {
    setSelectedLeadForWaba(lead);
    setWabaForm({
      wabaId: lead.wabaId || "",
      metaPhoneNumberId: lead.metaPhoneNumberId || "",
      systemToken: lead.systemToken || "",
      notes: lead.notes || ""
    });
    setWabaModalOpen(true);
  };

  // Save WABA Config
  const handleSaveWaba = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForWaba) return;
    setSavingWaba(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/leads/${selectedLeadForWaba.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...wabaForm,
          status: "ONBOARDED"
        })
      });
      const data = await res.json();
      if (data.success) {
        setWabaModalOpen(false);
        loadDashboardData(user?.email);
      }
    } catch (err: any) {
      alert("Error saving WABA config: " + err.message);
    } finally {
      setSavingWaba(false);
    }
  };

  // Filtered Leads for Table
  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeStatusFilter === "ALL" || lead.status === activeStatusFilter;
    const matchesQuery =
      searchQuery === "" ||
      lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    return matchesTab && matchesQuery;
  });

  // Filtered Leads for Chat search
  const filteredChatLeads = leads.filter(lead => {
    if (!chatSearch.trim()) return true;
    return (
      lead.businessName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      lead.contactPerson.toLowerCase().includes(chatSearch.toLowerCase()) ||
      lead.phone.includes(chatSearch)
    );
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#030712] text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
            Loading Office Workspace...
          </span>
        </div>
      </div>
    );
  }

  // Left Vertical Menu Items Definition
  const menuItems = [
    {
      id: "leads" as OfficeModule,
      name: "Leads & Pipeline",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      badge: leadCounts.TOTAL > 0 ? String(leadCounts.TOTAL) : undefined,
      badgeColor: "bg-emerald-500 text-white"
    },
    {
      id: "chat" as OfficeModule,
      name: "2-Way Lead Chat",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: "WhatsApp",
      badgeColor: "bg-emerald-600 text-white"
    },
    {
      id: "payments" as OfficeModule,
      name: "Payment Links",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      badge: "Razorpay",
      badgeColor: "bg-indigo-600 text-white"
    },
    {
      id: "onboarding" as OfficeModule,
      name: "Client Onboarding",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      badge: leadCounts.PAID > 0 ? `${leadCounts.PAID} Ready` : undefined,
      badgeColor: "bg-amber-500 text-white"
    },
    {
      id: "portfolio" as OfficeModule,
      name: "Portfolio & WhatsApp",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: "revenue" as OfficeModule,
      name: "Revenue & Targets",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: "activity" as OfficeModule,
      name: "Activity & Logs",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* =========================================================================
          LEFT VERTICAL MENU (SIDEBAR)
      ========================================================================= */}
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-[#080d1a] border-r border-slate-200/90 dark:border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top: Branding & Business Portfolio Box */}
        <div className="flex flex-col p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <Link href="/office" className="flex items-center gap-2.5 group">
              <img
                src="/icon.png"
                alt="Digital Beings"
                className="w-9 h-9 rounded-xl object-contain shadow-xs group-hover:scale-105 transition"
              />
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none text-slate-900 dark:text-white">
                  Digital<span className="text-emerald-600 dark:text-emerald-400">Beings</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                  Office Operations
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Single Business Portfolio Representation Box */}
          <div className="rounded-2xl p-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                Active Portfolio
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {settings.businessPortfolioName}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {settings.salesWhatsAppNumber}
              </span>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Middle: Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Section: Core Workflows */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Sales &amp; Outreach
            </div>
            <nav className="space-y-1">
              {menuItems.slice(0, 4).map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer text-left ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.badgeColor || "bg-slate-200 dark:bg-white/10"}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Section: Management & Analytics */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Operations &amp; Analytics
            </div>
            <nav className="space-y-1">
              {menuItems.slice(4).map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer text-left ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: Employee Profile & Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                ES
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Sales Representative
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "emp@digitalbeings.com"}
                </span>
              </div>
            </div>

            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => openPayLinkModal()}
              className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-bold text-center hover:bg-indigo-100 transition cursor-pointer"
            >
              💳 Pay Link
            </button>
            <button
              onClick={handleSignOut}
              className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-[11px] font-bold transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN RIGHT WORKSPACE
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Office Hub
                </span>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                  {menuItems.find((m) => m.id === activeModule)?.name || "Dashboard"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openPayLinkModal()}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
            >
              <span>💳 Random Pay Link</span>
            </button>

            <button
              onClick={() => setClientModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <span>+ First Client</span>
            </button>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* =========================================================================
              MODULE 1: LEADS & PIPELINE
          ========================================================================= */}
          {activeModule === "leads" && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
                    <span>🏢 Sales Lead Pipeline &amp; Customer Acquisition</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Lead Status Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Track prospective clients through the sales cycle. Chat directly from your assigned WhatsApp number, generate Razorpay payment links of any custom amount, and execute assisted onboarding.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => openPayLinkModal()}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>💳 Payment Link</span>
                  </button>
                  <button
                    onClick={() => setClientModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>+ First Client</span>
                  </button>
                </div>
              </div>

              {/* Pipeline KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {[
                  { label: "Total Leads", count: leadCounts.TOTAL, bg: "bg-slate-100 dark:bg-white/5", text: "text-slate-900 dark:text-white" },
                  { label: "New Inquiries", count: leadCounts.NEW_LEAD, bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
                  { label: "Contacted", count: leadCounts.CONTACTED, bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
                  { label: "Link Sent", count: leadCounts.PAYMENT_LINK_SENT, bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
                  { label: "Paid Deals", count: leadCounts.PAID, bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Onboarded", count: leadCounts.ONBOARDED, bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" }
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.bg} p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-2`}>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className={`text-2xl sm:text-3xl font-black ${stat.text}`}>
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filter Tabs & Search */}
              <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {[
                    { key: "ALL", label: `All (${leadCounts.TOTAL})` },
                    { key: "NEW_LEAD", label: `New (${leadCounts.NEW_LEAD})` },
                    { key: "CONTACTED", label: `Contacted (${leadCounts.CONTACTED})` },
                    { key: "PAYMENT_LINK_SENT", label: `Link Sent (${leadCounts.PAYMENT_LINK_SENT})` },
                    { key: "PAID", label: `Paid (${leadCounts.PAID})` },
                    { key: "ONBOARDED", label: `Onboarded (${leadCounts.ONBOARDED})` }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveStatusFilter(tab.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        activeStatusFilter === tab.key
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    placeholder="Search by business, contact, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/90 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3.5 px-5">Client / Business</th>
                        <th className="py-3.5 px-4">Contact Person</th>
                        <th className="py-3.5 px-4">Target Plan &amp; Deal</th>
                        <th className="py-3.5 px-4">Lead Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <span className="text-4xl">📋</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                No clients found in this stage
                              </p>
                              <p className="text-xs text-slate-500 max-w-sm">
                                Register your first prospective lead or client to begin the sales outreach process.
                              </p>
                              <button
                                onClick={() => setClientModalOpen(true)}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                + First Client
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                            <td className="py-4 px-5">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {lead.businessName}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {lead.phone}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {lead.contactPerson}
                                </span>
                                {lead.email && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                    {lead.email}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                  ₹{Number(lead.dealAmount || 0).toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {lead.planSelected} Plan
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <select
                                value={lead.status}
                                onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                                className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg border focus:outline-hidden cursor-pointer ${
                                  lead.status === "NEW_LEAD"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
                                    : lead.status === "CONTACTED"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                                    : lead.status === "PAYMENT_LINK_SENT"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                                    : lead.status === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30"
                                }`}
                              >
                                <option value="NEW_LEAD">🔵 New Lead</option>
                                <option value="CONTACTED">💬 Contacted</option>
                                <option value="PAYMENT_LINK_SENT">💳 Link Sent</option>
                                <option value="PAID">💰 Paid Deal</option>
                                <option value="ONBOARDED">🚀 Onboarded</option>
                              </select>
                            </td>
                            <td className="py-4 px-5 text-right space-x-2">
                              <button
                                onClick={() => {
                                  handleSelectLeadForChat(lead);
                                  setActiveModule("chat");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 font-bold text-xs transition cursor-pointer"
                              >
                                💬 Chat
                              </button>

                              <button
                                onClick={() => openPayLinkModal(lead)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-300 font-bold text-xs transition cursor-pointer"
                              >
                                💳 Pay Link
                              </button>

                              {lead.status === "PAID" && (
                                <button
                                  onClick={() => openWabaModal(lead)}
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                >
                                  🚀 Onboard
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 2: 2-WAY LEAD CHAT (WHATSAPP WORKSPACE)
          ========================================================================= */}
          {activeModule === "chat" && (
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden flex flex-col md:flex-row h-[750px]">
              {/* Left Column: Leads / Conversations List */}
              <div className="w-full md:w-80 border-r border-slate-200/90 dark:border-white/10 flex flex-col h-full bg-slate-50/50 dark:bg-white/[0.01]">
                <div className="p-4 border-b border-slate-200/90 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Lead Chats
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {settings.salesWhatsAppNumber}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                  {filteredChatLeads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No matching leads found
                    </div>
                  ) : (
                    filteredChatLeads.map((lead) => {
                      const isSelected = activeChatLead?.id === lead.id;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectLeadForChat(lead)}
                          className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                            isSelected
                              ? "bg-white dark:bg-white/10 border-l-4 border-emerald-500 shadow-2xs"
                              : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                            {lead.businessName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {lead.businessName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ₹{lead.dealAmount}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                              {lead.contactPerson} ({lead.phone})
                            </span>
                            <span className="inline-block mt-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {lead.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Thread & Composer */}
              <div className="flex-1 flex flex-col h-full bg-[#fcfcfd] dark:bg-[#070b14]">
                {activeChatLead ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B101D] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {activeChatLead.businessName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">
                              {activeChatLead.businessName}
                            </h2>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              {activeChatLead.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Contact: <span className="font-bold text-slate-800 dark:text-slate-200">{activeChatLead.contactPerson}</span> • {activeChatLead.whatsappNumber || activeChatLead.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPayLinkModal(activeChatLead)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                        >
                          💳 Send Pay Link
                        </button>
                        {activeChatLead.status === "PAID" && (
                          <button
                            onClick={() => openWabaModal(activeChatLead)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                          >
                            🚀 Onboard
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                          <span className="text-4xl">💬</span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Start the WhatsApp Conversation
                          </p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Send an introductory message or proposal link to {activeChatLead.contactPerson} directly from your sales desk.
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isOutbound = msg.direction === "OUTBOUND";
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                            >
                              <div
                                className={`max-w-md rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                                  isOutbound
                                    ? "bg-emerald-600 text-white rounded-br-none"
                                    : "bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 rounded-bl-none"
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Reply Shortcuts */}
                    <div className="px-4 py-2 bg-slate-100/70 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Quick Send:
                      </span>
                      <button
                        onClick={() =>
                          handleSendChat(
                            undefined,
                            `Hi ${activeChatLead.contactPerson}, thank you for your interest in Digital Beings WhatsApp SaaS platform! How may we assist your business today?`
                          )
                        }
                        className="text-[11px] font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg hover:border-emerald-500 transition shrink-0 cursor-pointer"
                      >
                        👋 Introduction
                      </button>
                      <button
                        onClick={() =>
                          handleSendChat(
                            undefined,
                            `Here is the onboarding payment link for your ${activeChatLead.planSelected} plan (₹${activeChatLead.dealAmount}): https://digitalbeings.in/pay`
                          )
                        }
                        className="text-[11px] font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg hover:border-emerald-500 transition shrink-0 cursor-pointer"
                      >
                        💳 Pay Link Reminder
                      </button>
                      <button
                        onClick={() =>
                          handleSendChat(
                            undefined,
                            `Your payment has been received! Please provide your Facebook Business Manager ID so we can complete your Meta WhatsApp Cloud API setup.`
                          )
                        }
                        className="text-[11px] font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg hover:border-emerald-500 transition shrink-0 cursor-pointer"
                      >
                        ⚙️ WABA Setup Checklist
                      </button>
                    </div>

                    {/* Message Composer */}
                    <form onSubmit={handleSendChat} className="p-4 bg-white dark:bg-[#0B101D] border-t border-slate-200/90 dark:border-white/10 flex items-center gap-3">
                      <input
                        type="text"
                        placeholder={`Type a message to ${activeChatLead.contactPerson}...`}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingChat || !chatInput.trim()}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center gap-2 shrink-0"
                      >
                        {sendingChat ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Send ➔</span>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 text-center text-slate-500">
                    Select a lead from the list to start chatting.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 3: PAYMENT LINKS STUDIO
          ========================================================================= */}
          {activeModule === "payments" && (
            <div className="space-y-6">
              {/* Payment Link Generator Banner */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30">
                    <span>💳 Razorpay Custom Amount Payment Generator</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Generate Instant Payment Links
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Generate an instant payment link for any custom or random amount, link it to a client lead, copy to clipboard, or send directly via WhatsApp.
                  </p>
                </div>

                <button
                  onClick={() => openPayLinkModal()}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>+ Create Payment Link</span>
                  <span>➔</span>
                </button>
              </div>

              {/* Quick Amount Generator Form Card */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Quick Amount Presets
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "₹500 (Trial)", amt: "500" },
                    { label: "₹1,000 (Basic)", amt: "1000" },
                    { label: "₹2,500 (Pro)", amt: "2500" },
                    { label: "₹5,000 (Enterprise)", amt: "5000" }
                  ].map((preset) => (
                    <button
                      key={preset.amt}
                      onClick={() => {
                        setPayLinkForm((prev) => ({ ...prev, amount: preset.amt }));
                        setPayLinkModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Links History Table */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Generated Payment Links History
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300">
                      {paymentLinks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => loadPaymentLinks(user?.email)}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/90 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3 px-5">Client / Customer</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Link</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                      {loadingPayLinks ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Loading payment links...
                          </td>
                        </tr>
                      ) : paymentLinks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No payment links generated yet. Click "+ Create Payment Link" to issue one.
                          </td>
                        </tr>
                      ) : (
                        paymentLinks.map((link) => (
                          <tr key={link.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                            <td className="py-3.5 px-5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {link.customerName}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {link.customerPhone || "No phone"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              ₹{Number(link.amount).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 max-w-[200px] truncate">
                              <a href={link.shortUrl} target="_blank" rel="noreferrer" className="hover:underline">
                                {link.shortUrl}
                              </a>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                {link.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {new Date(link.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-5 text-right space-x-2">
                              <button
                                onClick={() => handleCopyLink(link.shortUrl)}
                                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                              >
                                Copy Link
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 4: CLIENT ONBOARDING (ASSISTED)
          ========================================================================= */}
          {activeModule === "onboarding" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-500/30">
                    <span>🚀 Assisted WABA &amp; Meta Cloud Onboarding</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Assisted Client Onboarding Hub
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Once a lead has paid, assist them in connecting their Meta WhatsApp Business Account (WABA), phone number ID, and access credentials to activate their workspace.
                  </p>
                </div>
              </div>

              {/* Onboarding Checklist Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    step: "01",
                    title: "Payment Received",
                    desc: "Verify that the Razorpay payment link has been fulfilled."
                  },
                  {
                    step: "02",
                    title: "Meta Verification",
                    desc: "Confirm client's Meta Business Manager ID and business verification status."
                  },
                  {
                    step: "03",
                    title: "WABA & Phone Link",
                    desc: "Input client's WABA ID and Phone Number ID to complete assisted onboarding."
                  }
                ].map((s) => (
                  <div key={s.step} className="bg-white dark:bg-[#0B101D] p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-2">
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                      STEP {s.step}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Paid / Onboarded Clients Queue */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between">
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Clients Ready for Assisted Onboarding
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/90 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3 px-5">Client Name</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Plan / Amount</th>
                        <th className="py-3 px-4">WABA ID</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                      {leads.filter((l) => l.status === "PAID" || l.status === "ONBOARDED").length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No paid clients in the onboarding queue yet. Mark a lead as "PAID" or issue a payment link to get started.
                          </td>
                        </tr>
                      ) : (
                        leads
                          .filter((l) => l.status === "PAID" || l.status === "ONBOARDED")
                          .map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                              <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                                {lead.businessName}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                {lead.contactPerson} ({lead.phone})
                              </td>
                              <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                                {lead.planSelected} • ₹{lead.dealAmount}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                {lead.wabaId || "Not linked"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  lead.status === "ONBOARDED"
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                }`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right">
                                <button
                                  onClick={() => openWabaModal(lead)}
                                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                >
                                  {lead.wabaId ? "Update WABA" : "Configure WABA"}
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 5: PORTFOLIO & WHATSAPP SETTINGS
          ========================================================================= */}
          {activeModule === "portfolio" && (
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Sales Business Portfolio &amp; WhatsApp Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage the official business portfolio and connected WhatsApp number used by your sales team to chat with prospective leads.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Business Portfolio Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.businessPortfolioName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, businessPortfolioName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Assigned Salesperson WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={settingsForm.salesWhatsAppNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, salesWhatsAppNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Meta Phone Number ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1406142089245094"
                    value={settingsForm.metaPhoneId}
                    onChange={(e) => setSettingsForm({ ...settingsForm, metaPhoneId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Meta WABA ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 119827364512345"
                    value={settingsForm.metaWabaId}
                    onChange={(e) => setSettingsForm({ ...settingsForm, metaWabaId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Meta System User Permanent Access Token (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="EAAG..."
                    value={settingsForm.metaAccessToken}
                    onChange={(e) => setSettingsForm({ ...settingsForm, metaAccessToken: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Portfolio Settings"}
                </button>
              </form>
            </div>
          )}

          {/* =========================================================================
              MODULE 6: REVENUE & CONVERSION TARGETS
          ========================================================================= */}
          {activeModule === "revenue" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Sales Desk Performance
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                    Revenue &amp; Conversion Analytics
                  </h1>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Closed Revenue
                  </span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    ₹{totalRevenue.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Conversion Pipeline Progress */}
              <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Monthly Revenue Target (₹1,00,000)
                </h3>
                <div className="w-full bg-slate-100 dark:bg-white/10 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalRevenue / 100000) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-bold">
                  <span>Current: ₹{totalRevenue.toLocaleString("en-IN")}</span>
                  <span>Target: ₹1,00,000 ({Math.min(100, Math.round((totalRevenue / 100000) * 100))}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 7: ACTIVITY & AUDIT LOGS
          ========================================================================= */}
          {activeModule === "activity" && (
            <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Sales Team Activity &amp; Audit Trail
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Chronological history of leads acquired, payment links dispatched, and clients onboarded.
                </p>
              </div>

              <div className="space-y-4">
                {leads.length === 0 ? (
                  <p className="text-xs text-slate-500">No activity logged yet.</p>
                ) : (
                  leads.map((l) => (
                    <div key={l.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Lead: {l.businessName} ({l.contactPerson})
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Status: <span className="font-bold text-emerald-600">{l.status}</span> • Amount: ₹{l.dealAmount}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL 1: "+ FIRST CLIENT" / INTAKE FORM MODAL
      ========================================================================= */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200/90 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Register New Client Lead
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Start filling out basic client credentials for sales outreach and onboarding.
                </p>
              </div>
              <button
                onClick={() => setClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics India"
                  value={clientForm.businessName}
                  onChange={(e) => setClientForm({ ...clientForm, businessName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp / Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value, whatsappNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Deal Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="500"
                    value={clientForm.dealAmount}
                    onChange={(e) => setClientForm({ ...clientForm, dealAmount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Plan Selected
                </label>
                <select
                  value={clientForm.planSelected}
                  onChange={(e) => setClientForm({ ...clientForm, planSelected: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="TRIAL">Starter Trial (₹500 / 30 Days)</option>
                  <option value="BASIC">Basic Business Plan (₹1,000 / month)</option>
                  <option value="PROFESSIONAL">Professional Plan (₹2,500 / month)</option>
                  <option value="ENTERPRISE">Custom Enterprise</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClient}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {submittingClient ? "Saving..." : "Create Client Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RAZORPAY CUSTOM PAYMENT LINK GENERATOR MODAL
      ========================================================================= */}
      {payLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200/90 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Generate Razorpay Payment Link
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generate a payment link for any custom or random amount to send to leads.
                </p>
              </div>
              <button
                onClick={() => setPayLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {generatedLinkResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Payment Link Generated!
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                      ₹{generatedLinkResult.amount}
                    </span>
                  </div>
                  <p className="text-xs font-mono break-all text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-300/40">
                    {generatedLinkResult.shortUrl}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopyLink(generatedLinkResult.shortUrl)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {copiedLink ? "✓ Copied to Clipboard!" : "Copy Link"}
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hello, please find your Digital Beings WhatsApp SaaS activation payment link: ${generatedLinkResult.shortUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <span>Send on WhatsApp</span>
                  </a>
                </div>

                <button
                  onClick={() => setGeneratedLinkResult(null)}
                  className="w-full text-center text-xs text-slate-500 hover:underline pt-2 cursor-pointer font-bold"
                >
                  Create another payment link
                </button>
              </div>
            ) : (
              <form onSubmit={handleGeneratePaymentLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Custom / Random Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500, 1000, 2500"
                    value={payLinkForm.amount}
                    onChange={(e) => setPayLinkForm({ ...payLinkForm, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Exports"
                    value={payLinkForm.customerName}
                    onChange={(e) => setPayLinkForm({ ...payLinkForm, customerName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={payLinkForm.customerPhone}
                      onChange={(e) => setPayLinkForm({ ...payLinkForm, customerPhone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="client@mail.com"
                      value={payLinkForm.customerEmail}
                      onChange={(e) => setPayLinkForm({ ...payLinkForm, customerEmail: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={payLinkForm.description}
                    onChange={(e) => setPayLinkForm({ ...payLinkForm, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setPayLinkModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingPayLink}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    {generatingPayLink ? "Generating..." : "Generate Live Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: WABA / ASSISTED ONBOARDING MODAL
      ========================================================================= */}
      {wabaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200/90 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Assisted WABA Onboarding
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Client: <span className="font-bold text-slate-900 dark:text-white">{selectedLeadForWaba?.businessName}</span>
                </p>
              </div>
              <button
                onClick={() => setWabaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWaba} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta WABA ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 119827364512345"
                  value={wabaForm.wabaId}
                  onChange={(e) => setWabaForm({ ...wabaForm, wabaId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1406142089245094"
                  value={wabaForm.metaPhoneNumberId}
                  onChange={(e) => setWabaForm({ ...wabaForm, metaPhoneNumberId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Permanent System User Access Token
                </label>
                <textarea
                  rows={2}
                  placeholder="EAAG..."
                  value={wabaForm.systemToken}
                  onChange={(e) => setWabaForm({ ...wabaForm, systemToken: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Onboarding Notes &amp; Verification Status
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified GST, display name approved"
                  value={wabaForm.notes}
                  onChange={(e) => setWabaForm({ ...wabaForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setWabaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWaba}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {savingWaba ? "Saving..." : "Save & Complete Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: SETTINGS / PORTFOLIO QUICK MODAL
      ========================================================================= */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200/90 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Sales WhatsApp Portfolio Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the WhatsApp number and business portfolio for sales outreach.
                </p>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Business Portfolio Name
                </label>
                <input
                  type="text"
                  value={settingsForm.businessPortfolioName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, businessPortfolioName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Salesperson WhatsApp Number
                </label>
                <input
                  type="text"
                  value={settingsForm.salesWhatsAppNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, salesWhatsAppNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
