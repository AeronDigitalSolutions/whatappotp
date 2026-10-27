"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW_LEAD" | "CONTACTED" | "PAYMENT_LINK_SENT" | "PAID" | "ONBOARDED">("ALL");

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

  // 2-Way Lead Chat Drawer
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeChatLead, setActiveChatLead] = useState<Lead | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

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

  // Initial Load
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
        setLeads(leadData.leads || []);
        if (leadData.counts) setLeadCounts(leadData.counts);
        if (leadData.totalRevenue !== undefined) setTotalRevenue(leadData.totalRevenue);
      }
    } catch (err: any) {
      console.error("Error loading office data:", err);
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

  // Open Chat Drawer
  const openChatWithLead = async (lead: Lead) => {
    setActiveChatLead(lead);
    setChatDrawerOpen(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/office/chat/${lead.id}`);
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Error fetching chat:", e);
    }
  };

  // Send WhatsApp Message in Chat
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeChatLead) return;

    const messageText = chatInput.trim();
    setChatInput("");
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
        // Refresh chat messages
        const refreshRes = await fetch(`${getApiUrl()}/v1/office/chat/${activeChatLead.id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setChatMessages(refreshData.messages || []);
        }
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

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeTab === "ALL" || lead.status === activeTab;
    const matchesQuery =
      searchQuery === "" ||
      lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    return matchesTab && matchesQuery;
  });

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

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#04060c] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/office" className="flex items-center gap-2.5">
            <img
              src="/icon.png"
              alt="Digital Beings"
              className="w-9 h-9 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-lg tracking-tight leading-none text-slate-900 dark:text-white">
                Digital<span className="text-emerald-600 dark:text-emerald-400">Beings</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Office Sales Desk
              </span>
            </div>
          </Link>

          <span className="hidden sm:inline-block h-5 w-px bg-slate-200 dark:bg-white/10 mx-1" />

          {/* Single Business Portfolio Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="truncate max-w-[200px]">{settings.businessPortfolioName}</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {settings.salesWhatsAppNumber}
            </span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold ml-1 cursor-pointer"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openPayLinkModal()}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
          >
            <span>💳 Quick Payment Link</span>
          </button>

          <ThemeToggle />

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{user?.email || "emp@digitalbeings.com"}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Action Card */}
        <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30">
              <span>🏢 B2B SaaS Sales &amp; Assisted Onboarding Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Sales Lead Tracker &amp; Onboarding Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Chat directly with leads via your assigned WhatsApp number, generate custom Razorpay links of any amount, and execute assisted client onboarding.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => openPayLinkModal()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>💳 Generate Payment Link</span>
            </button>

            <button
              onClick={() => setClientModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>+ First Client</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* 3. BUSINESS PORTFOLIO STRIP */}
        <div className="bg-white dark:bg-[#0B101D] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-white/10 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl font-bold">
              📱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {settings.businessPortfolioName}
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Official Sales Portfolio
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Connected WhatsApp Number: <strong className="text-slate-800 dark:text-slate-200">{settings.salesWhatsAppNumber}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 rounded-xl transition cursor-pointer"
            >
              ⚙️ Connect / Change WhatsApp Number
            </button>
          </div>
        </div>

        {/* 4. PIPELINE STATUS DASHBOARD */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setActiveTab("ALL")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white dark:bg-[#0B101D] border-slate-900 dark:border-white shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-slate-400"
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Leads
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {leadCounts.TOTAL}
            </div>
            <span className="text-[10px] text-slate-400">Active pipeline</span>
          </div>

          <div
            onClick={() => setActiveTab("NEW_LEAD")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "NEW_LEAD"
                ? "bg-white dark:bg-[#0B101D] border-blue-500 shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-blue-400"
            }`}
          >
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              New Inquiries
            </span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {leadCounts.NEW_LEAD}
            </div>
            <span className="text-[10px] text-slate-400">Pending initial contact</span>
          </div>

          <div
            onClick={() => setActiveTab("CONTACTED")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "CONTACTED"
                ? "bg-white dark:bg-[#0B101D] border-amber-500 shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-amber-400"
            }`}
          >
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Contacted
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {leadCounts.CONTACTED}
            </div>
            <span className="text-[10px] text-slate-400">Chat in progress</span>
          </div>

          <div
            onClick={() => setActiveTab("PAYMENT_LINK_SENT")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "PAYMENT_LINK_SENT"
                ? "bg-white dark:bg-[#0B101D] border-purple-500 shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-purple-400"
            }`}
          >
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Link Sent
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {leadCounts.PAYMENT_LINK_SENT}
            </div>
            <span className="text-[10px] text-slate-400">Awaiting payment</span>
          </div>

          <div
            onClick={() => setActiveTab("PAID")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "PAID"
                ? "bg-white dark:bg-[#0B101D] border-emerald-500 shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-emerald-400"
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Paid Deals
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {leadCounts.PAID}
            </div>
            <span className="text-[10px] text-slate-400">Ready for WABA setup</span>
          </div>

          <div
            onClick={() => setActiveTab("ONBOARDED")}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              activeTab === "ONBOARDED"
                ? "bg-white dark:bg-[#0B101D] border-teal-500 shadow-xs"
                : "bg-white/70 dark:bg-[#0B101D]/70 border-slate-200/80 dark:border-white/10 hover:border-teal-400"
            }`}
          >
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
              Onboarded
            </span>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {leadCounts.ONBOARDED}
            </div>
            <span className="text-[10px] text-slate-400">Live transacting</span>
          </div>
        </div>

        {/* 5. LEADS MANAGEMENT TABLE & EMPTY STATE */}
        <div className="bg-white dark:bg-[#0B101D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
          {/* Table Controls */}
          <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Client Pipeline
              </span>
              <span className="text-xs bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
                {filteredLeads.length} Total
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business, contact, or phone..."
                className="w-full sm:w-72 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => setClientModalOpen(true)}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                + First Client
              </button>
            </div>
          </div>

          {/* Table / Cards */}
          {filteredLeads.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-xs">
                🏢
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  No Leads in Current View
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Click the <strong>"+ First Client"</strong> button above to create your first client lead record and start chatting or generating payment links.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setClientModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  + Create First Client
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">Business &amp; Contact</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Plan &amp; Deal</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4">Payment Link</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                          {lead.businessName}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {lead.contactPerson} {lead.email ? `• ${lead.email}` : ""}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {lead.phone}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{Number(lead.dealAmount).toLocaleString("en-IN")}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {lead.planSelected}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as Lead["status"])}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                            lead.status === "NEW_LEAD"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              : lead.status === "CONTACTED"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : lead.status === "PAYMENT_LINK_SENT"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : lead.status === "PAID"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
                          }`}
                        >
                          <option value="NEW_LEAD">New Lead</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="PAYMENT_LINK_SENT">Link Sent</option>
                          <option value="PAID">Paid Deal</option>
                          <option value="ONBOARDED">Onboarded</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        {lead.paymentLinkUrl ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyLink(lead.paymentLinkUrl!)}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Copy Link
                            </button>
                            <span className="text-[10px] text-slate-400">({lead.paymentStatus})</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openPayLinkModal(lead)}
                            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                          >
                            + Generate Link
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openChatWithLead(lead)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
                            title="Chat with lead"
                          >
                            💬 Chat
                          </button>

                          <button
                            onClick={() => openPayLinkModal(lead)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold text-xs hover:bg-indigo-100 transition cursor-pointer"
                            title="Generate payment link"
                          >
                            💳 Link
                          </button>

                          <button
                            onClick={() => openWabaModal(lead)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                            title="Configure WABA & Onboard"
                          >
                            ⚙️ Onboard
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL 1: "FIRST CLIENT" / NEW LEAD FORM
          ======================================================== */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                + Register New Client Lead
              </h3>
              <button
                onClick={() => setClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Business / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.businessName}
                  onChange={(e) => setClientForm({ ...clientForm, businessName: e.target.value })}
                  placeholder="e.g. Apex Logistics Pvt Ltd"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value, whatsappNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Proposed Plan
                  </label>
                  <select
                    value={clientForm.planSelected}
                    onChange={(e) => setClientForm({ ...clientForm, planSelected: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="TRIAL">Starter Trial (₹500)</option>
                    <option value="BASIC">Basic Business (₹1,000/mo)</option>
                    <option value="PROFESSIONAL">Professional (₹2,500/mo)</option>
                    <option value="ENTERPRISE">Custom Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Deal Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={clientForm.dealAmount}
                    onChange={(e) => setClientForm({ ...clientForm, dealAmount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Initial Notes / Requirements
                </label>
                <textarea
                  rows={2}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="e.g. Needs Shopify abandoned cart webhook and 3 support seats."
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClient}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingClient ? "Saving..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: RAZORPAY PAYMENT LINK GENERATOR
          ======================================================== */}
      {payLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  💳 Generate Razorpay Payment Link
                </h3>
                <span className="text-xs text-slate-500">
                  Enter any custom or random amount for your client
                </span>
              </div>
              <button
                onClick={() => setPayLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {generatedLinkResult ? (
              <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <span>✅ Payment Link Active!</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#070b14] rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">LINK URL</span>
                  <a
                    href={generatedLinkResult.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 break-all hover:underline"
                  >
                    {generatedLinkResult.shortUrl}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(generatedLinkResult.shortUrl)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs transition cursor-pointer text-center"
                  >
                    {copiedLink ? "✓ Copied to Clipboard!" : "📋 Copy Payment Link"}
                  </button>

                  {selectedLeadForPay && (
                    <button
                      onClick={() => {
                        setPayLinkModalOpen(false);
                        openChatWithLead(selectedLeadForPay);
                        setChatInput(`Hi ${selectedLeadForPay.contactPerson}, here is your payment link for ₹${generatedLinkResult.amount}: ${generatedLinkResult.shortUrl}`);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      💬 Send on WhatsApp
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleGeneratePaymentLink} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Amount to Charge (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={payLinkForm.amount}
                      onChange={(e) => setPayLinkForm({ ...payLinkForm, amount: e.target.value })}
                      placeholder="e.g. 500, 1000, 2500, or custom"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl pl-8 pr-3.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={payLinkForm.customerName}
                      onChange={(e) => setPayLinkForm({ ...payLinkForm, customerName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={payLinkForm.customerPhone}
                      onChange={(e) => setPayLinkForm({ ...payLinkForm, customerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Purpose / Description
                  </label>
                  <input
                    type="text"
                    value={payLinkForm.description}
                    onChange={(e) => setPayLinkForm({ ...payLinkForm, description: e.target.value })}
                    placeholder="e.g. WhatsApp SaaS Setup + 30-Day Starter Plan"
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayLinkModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingPayLink}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {generatingPayLink ? "Creating Link..." : "Generate Live Razorpay Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CONFIGURE SALES PORTFOLIO & WHATSAPP NUMBER
          ======================================================== */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ⚙️ Sales WhatsApp Portfolio Configuration
              </h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Business Portfolio Name
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.businessPortfolioName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, businessPortfolioName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Salesperson WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.salesWhatsAppNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, salesWhatsAppNumber: e.target.value })}
                  placeholder="+91 80004 88200"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This phone number will be displayed on client proposals and used to dispatch 2-way WhatsApp chats.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta Phone Number ID (Optional)
                </label>
                <input
                  type="text"
                  value={settingsForm.metaPhoneId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, metaPhoneId: e.target.value })}
                  placeholder="e.g. 1406142089245094"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta Permanent System User Token (Optional)
                </label>
                <input
                  type="password"
                  value={settingsForm.metaAccessToken}
                  onChange={(e) => setSettingsForm({ ...settingsForm, metaAccessToken: e.target.value })}
                  placeholder="EAAG..."
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DRAWER: 2-WAY LEAD CHAT CONSOLE
          ======================================================== */}
      {chatDrawerOpen && activeChatLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs">
          <div className="bg-white dark:bg-[#0B101D] w-full max-w-md h-full flex flex-col border-l border-slate-200 dark:border-white/10 shadow-2xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  {activeChatLead.contactPerson.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    {activeChatLead.contactPerson}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeChatLead.businessName} • {activeChatLead.phone}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setChatDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Bar inside Chat */}
            <div className="p-2.5 bg-slate-100/70 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto text-[11px]">
              <button
                onClick={() => {
                  openPayLinkModal(activeChatLead);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold whitespace-nowrap cursor-pointer hover:bg-indigo-100"
              >
                💳 Send Payment Link
              </button>
              <button
                onClick={() => {
                  setChatDrawerOpen(false);
                  openWabaModal(activeChatLead);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold whitespace-nowrap cursor-pointer hover:bg-emerald-100"
              >
                ⚙️ Onboard WABA
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] dark:bg-[#070b14]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-500 text-xs">
                  <p>No chat messages yet with this lead.</p>
                  <p className="text-[11px]">Type a message below to dispatch via WhatsApp.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-2xs space-y-1 ${
                      msg.direction === "OUTBOUND"
                        ? "ml-auto bg-emerald-600 text-white rounded-tr-xs"
                        : "mr-auto bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 rounded-tl-xs"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <span
                      className={`text-[9px] block text-right ${
                        msg.direction === "OUTBOUND" ? "text-emerald-200" : "text-slate-400"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B101D] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type WhatsApp message..."
                className="flex-1 bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {sendingChat ? "..." : "Send ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: ONBOARD / WABA CONFIGURATION
          ======================================================== */}
      {wabaModalOpen && selectedLeadForWaba && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  ⚙️ Client WABA Onboarding Configuration
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedLeadForWaba.businessName} ({selectedLeadForWaba.contactPerson})
                </span>
              </div>
              <button
                onClick={() => setWabaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWaba} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta WABA ID (WhatsApp Business Account ID)
                </label>
                <input
                  type="text"
                  value={wabaForm.wabaId}
                  onChange={(e) => setWabaForm({ ...wabaForm, wabaId: e.target.value })}
                  placeholder="e.g. 109827364521"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta Phone Number ID
                </label>
                <input
                  type="text"
                  value={wabaForm.metaPhoneNumberId}
                  onChange={(e) => setWabaForm({ ...wabaForm, metaPhoneNumberId: e.target.value })}
                  placeholder="e.g. 1406142089245094"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meta System User Access Token
                </label>
                <input
                  type="password"
                  value={wabaForm.systemToken}
                  onChange={(e) => setWabaForm({ ...wabaForm, systemToken: e.target.value })}
                  placeholder="EAAG..."
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Onboarding Notes / Custom Instructions
                </label>
                <textarea
                  rows={2}
                  value={wabaForm.notes}
                  onChange={(e) => setWabaForm({ ...wabaForm, notes: e.target.value })}
                  placeholder="Client onboarded with Starter Plan. Webhook verified on Shopify."
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWabaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWaba}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {savingWaba ? "Saving..." : "Complete Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
