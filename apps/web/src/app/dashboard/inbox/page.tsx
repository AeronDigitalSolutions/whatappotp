"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useSubscription } from "@/context/SubscriptionContext";

interface ContactSearchResult {
  phone: string;
  name?: string;
  source: string;
  conversationId?: string;
  lastSeen?: string;
}

interface PhoneNumberItem {
  id: string;
  phoneId: string;
  displayPhone: string;
  verifiedName?: string;
  wabaId?: string;
  wabaName?: string;
  service?: string;
  isDefault?: boolean;
  quality?: string;
  status?: string;
}

interface Conversation {
  id: string;
  projectId: string;
  phoneId?: string;
  customerPhone: string;
  customerName?: string;
  status: "OPEN" | "RESOLVED" | "WAITING";
  unreadCount: number;
  lastMessage?: string;
  lastMessageDirection?: "INBOUND" | "OUTBOUND";
  lastMessageAt?: string;
  serviceWindowExpiresAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content?: string;
  body?: string;
  status: string;
  senderPhone?: string;
  recipientPhone?: string;
  senderName?: string;
  createdAt: string;
}

interface FreeTierInfo {
  total: number;
  used: number;
  remaining: number;
  currentMonth: string;
  nextMonth: string;
  nextResetDate?: string;
  resetsInDays?: number;
}

const QUICK_RESPONSES = [
  "👋 Hello! Thanks for reaching out to Digital Beings. How can I help you today?",
  "📦 Please share your Order ID or registered mobile number and I'll track your package right away.",
  "💳 Your payment has been received and verified. Your order is being packed now!",
  "👨‍💼 I am transferring your request to a senior specialist who will assist you shortly.",
  "✅ We have resolved your inquiry. Please let us know if there is anything else we can do for you!"
];

export default function LiveInboxPage() {
  const { isDemo, triggerPaywall } = useSubscription();
  const [projectId, setProjectId] = useState<string>("");
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberItem[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("ALL");
  const [loadingNumbers, setLoadingNumbers] = useState<boolean>(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>("");
  const [replySenderPhoneId, setReplySenderPhoneId] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "WAITING" | "RESOLVED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"chat" | "details">("chat");
  const [freeTier, setFreeTier] = useState<FreeTierInfo>({
    total: 1000,
    used: 0,
    remaining: 1000,
    currentMonth: new Date().toLocaleString("en-US", { month: "long" }),
    nextMonth: new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleString("en-US", { month: "long" }),
    resetsInDays: 30
  });

  // Start New Conversation & Contact Search States
  const [mounted, setMounted] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [newChatPhone, setNewChatPhone] = useState<string>("");
  const [newChatName, setNewChatName] = useState<string>("");
  const [newChatSenderPhoneId, setNewChatSenderPhoneId] = useState<string>("");
  const [newChatMode, setNewChatMode] = useState<"template" | "text">("template");
  const [newChatMessage, setNewChatMessage] = useState<string>("");
  const [newChatTemplateName, setNewChatTemplateName] = useState<string>("");
  const [newChatTemplateLanguage, setNewChatTemplateLanguage] = useState<string>("en_US");
  const [newChatTemplateVariables, setNewChatTemplateVariables] = useState<Record<string, string>>({});
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [submittingNewChat, setSubmittingNewChat] = useState<boolean>(false);
  const [newChatError, setNewChatError] = useState<string>("");
  const [contactResults, setContactResults] = useState<ContactSearchResult[]>([]);
  const [searchingContacts, setSearchingContacts] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Fetch Connected WhatsApp Phone Numbers for this Project
  const loadPhoneNumbers = async () => {
    if (!projectId) return;
    setLoadingNumbers(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/${projectId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.numbers)) {
        setPhoneNumbers(data.numbers);
      }
    } catch (e) {
      console.error("Failed to load phone numbers for inbox:", e);
    } finally {
      setLoadingNumbers(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadPhoneNumbers();
    }
  }, [projectId]);

  // Fetch conversations with phone filter
  const fetchConversations = async (showSpinner = false) => {
    if (!projectId) return;
    if (showSpinner) setLoadingList(true);
    try {
      const queryParam = selectedPhoneId && selectedPhoneId !== "ALL" ? `?phoneId=${encodeURIComponent(selectedPhoneId)}` : "";
      const res = await fetch(`${getApiUrl()}/v1/inbox/conversations/${projectId}${queryParam}`);
      const data = await res.json();
      if (data.freeTier) {
        setFreeTier(data.freeTier);
      }
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (data.conversations.length > 0) {
          const currentStillExists = data.conversations.some((c: any) => c.id === selectedConvId);
          if (!currentStillExists) {
            setSelectedConvId(data.conversations[0].id);
          }
        } else {
          setSelectedConvId("");
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      if (showSpinner) setLoadingList(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchConversations(true);
      // Auto-poll conversations every 8 seconds for real-time customer messages
      const interval = setInterval(() => {
        fetchConversations(false);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [projectId, selectedPhoneId]);

  // Fetch messages when selected conversation changes
  const fetchMessages = async (convId: string) => {
    if (!projectId || !convId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/inbox/messages/${projectId}/${convId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        // Mark as read
        fetch(`${getApiUrl()}/v1/inbox/conversation/${convId}/read`, { method: "POST" });
        // Update local unread badge
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
      // Poll active thread every 4 seconds
      const msgInterval = setInterval(() => {
        fetch(`${getApiUrl()}/v1/inbox/messages/${projectId}/${selectedConvId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          })
          .catch(() => {});
      }, 4000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedConvId, projectId]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Active selected conversation
  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === selectedConvId);
  }, [conversations, selectedConvId]);

  // Active conversation's receiving phone record
  const activeConvPhone = useMemo(() => {
    if (!activeConv || !activeConv.phoneId) return null;
    return phoneNumbers.find(p => p.phoneId === activeConv.phoneId) || null;
  }, [activeConv, phoneNumbers]);

  // Automatically initialize reply sender line to the conversation's phoneId
  useEffect(() => {
    if (activeConv) {
      if (activeConv.phoneId && phoneNumbers.some(p => p.phoneId === activeConv.phoneId)) {
        setReplySenderPhoneId(activeConv.phoneId);
      } else {
        const def = phoneNumbers.find(p => p.isDefault) || phoneNumbers[0];
        if (def) setReplySenderPhoneId(def.phoneId);
      }
    }
  }, [selectedConvId, activeConv?.phoneId, phoneNumbers]);

  // Resolve effective sender phoneId for reply
  const effectiveSenderPhoneId = useMemo(() => {
    if (replySenderPhoneId) return replySenderPhoneId;
    if (activeConv?.phoneId && activeConv.phoneId !== "phone_default") return activeConv.phoneId;
    const def = phoneNumbers.find(p => p.isDefault) || phoneNumbers[0];
    return def ? def.phoneId : "";
  }, [replySenderPhoneId, activeConv, phoneNumbers]);

  const effectiveSenderPhoneObj = useMemo(() => {
    return phoneNumbers.find(p => p.phoneId === effectiveSenderPhoneId) || null;
  }, [phoneNumbers, effectiveSenderPhoneId]);

  // Filtered conversations list
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchesPhone = selectedPhoneId === "ALL" || c.phoneId === selectedPhoneId;
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        c.customerPhone.includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q));
      return matchesPhone && matchesStatus && matchesSearch;
    });
  }, [conversations, selectedPhoneId, statusFilter, searchQuery]);

  // Check 24-hour service window
  const serviceWindowInfo = useMemo(() => {
    if (!activeConv || !activeConv.serviceWindowExpiresAt) {
      return { active: false, label: "Unknown / Needs Inbound Message", minutesLeft: 0 };
    }
    const expiresAt = new Date(activeConv.serviceWindowExpiresAt).getTime();
    const now = Date.now();
    const diffMs = expiresAt - now;
    if (diffMs > 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        active: true,
        label: `${hours}h ${mins}m remaining`,
        minutesLeft: Math.floor(diffMs / 60000)
      };
    } else {
      return {
        active: false,
        label: "24h Window Expired (Template Required)",
        minutesLeft: 0
      };
    }
  }, [activeConv]);

  // Selected Template Object & Dynamic Variable Keys
  const selectedTemplateObj = useMemo(() => {
    return availableTemplates.find(t => t.name === newChatTemplateName);
  }, [availableTemplates, newChatTemplateName]);

  const templateBodyText = useMemo(() => {
    if (!selectedTemplateObj?.components) return "";
    const bodyComp = selectedTemplateObj.components.find((c: any) => c.type === "BODY");
    return bodyComp?.text || "";
  }, [selectedTemplateObj]);

  const templateVariableKeys = useMemo(() => {
    if (!templateBodyText) return [];
    const matches: string[] = templateBodyText.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueKeys = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, "")))).sort((a: string, b: string) => Number(a) - Number(b));
    return uniqueKeys;
  }, [templateBodyText]);

  // Fetch approved templates from Meta
  const loadTemplates = async () => {
    if (!projectId) return;
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        const approved = data.templates.filter((t: any) => t.status === "APPROVED" || !t.status);
        setAvailableTemplates(approved);
        if (approved.length > 0) {
          setNewChatTemplateName(prev => prev || approved[0].name);
          setNewChatTemplateLanguage(prev => prev || approved[0].language || "en_US");
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Open New Chat Modal with optional prefilled number and name
  const openNewChatModal = (prefillPhone = "", prefillName = "") => {
    setNewChatPhone(prefillPhone);
    setNewChatName(prefillName);
    setNewChatError("");
    if (!newChatSenderPhoneId && phoneNumbers.length > 0) {
      const def = phoneNumbers.find(p => p.isDefault) || phoneNumbers[0];
      if (def) setNewChatSenderPhoneId(def.phoneId);
    }
    setShowNewChatModal(true);
    loadTemplates();
  };

  // Live Contact Search from OTP & Campaigns
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setContactResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!projectId) return;
      setSearchingContacts(true);
      try {
        const res = await fetch(`${getApiUrl()}/v1/inbox/contacts/search/${projectId}?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.contacts)) {
          const activePhones = new Set(conversations.map(c => c.customerPhone.replace(/\D/g, "")));
          const nonActive = data.contacts.filter((c: ContactSearchResult) => {
            const norm = c.phone.replace(/\D/g, "");
            return !activePhones.has(norm);
          });
          setContactResults(nonActive);
        }
      } catch (e) {
        console.error("Contact search error:", e);
      } finally {
        setSearchingContacts(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, projectId, conversations]);

  // Handle Start New Chat Submission
  const handleStartNewChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To initiate live WhatsApp conversations with customer contacts, please take our 30-Day Starter Trial (₹500 + GST) or monthly plan."
      );
      return;
    }

    if (!newChatPhone.trim()) {
      setNewChatError("Please enter a recipient phone number.");
      return;
    }

    setSubmittingNewChat(true);
    setNewChatError("");

    try {
      let templateVars: string[] = [];
      if (newChatMode === "template") {
        templateVars = templateVariableKeys.map(k => newChatTemplateVariables[k] || "");
      }

      const payload: any = {
        customerPhone: newChatPhone.trim(),
        customerName: newChatName.trim() || undefined,
        senderPhoneId: newChatSenderPhoneId || effectiveSenderPhoneId,
        messageType: newChatMode,
        body: newChatMode === "text" ? (newChatMessage.trim() || undefined) : undefined,
        templateName: newChatMode === "template" ? newChatTemplateName : undefined,
        templateLanguage: newChatMode === "template" ? (selectedTemplateObj?.language || newChatTemplateLanguage || "en_US") : undefined,
        templateVariables: newChatMode === "template" ? templateVars : undefined
      };

      const res = await fetch(`${getApiUrl()}/v1/inbox/conversation/start/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNewChatError(data.error || "Failed to start conversation.");
        return;
      }

      if (data.warning && newChatMode === "text") {
        setNewChatError(data.warning);
        return;
      }

      // Success! Update local conversations
      if (data.conversation) {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === data.conversation.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.conversation;
            return updated;
          }
          return [data.conversation, ...prev];
        });
        setSelectedConvId(data.conversation.id);
      }

      setShowNewChatModal(false);
      setNewChatPhone("");
      setNewChatName("");
      setNewChatMessage("");
      setNewChatTemplateVariables({});
      setSearchQuery("");

      if (data.conversationId) {
        fetchMessages(data.conversationId);
      }
      fetchConversations(false);
    } catch (err: any) {
      setNewChatError(err.message || "Failed to start conversation.");
    } finally {
      setSubmittingNewChat(false);
    }
  };

  // Send outbound message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To send live WhatsApp messages to customer contacts from the shared team inbox, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!replyText.trim() || !activeConv || sending) return;

    setSending(true);
    const textToSend = replyText.trim();
    setReplyText("");
    setFreeTier(prev => ({
      ...prev,
      used: prev.used + 1,
      remaining: Math.max(0, prev.remaining - 1)
    }));

    // Optimistic UI push
    const tempId = "temp-" + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConv.id,
      direction: "OUTBOUND",
      type: "text",
      content: textToSend,
      body: textToSend,
      senderPhone: effectiveSenderPhoneId,
      status: "sending",
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${getApiUrl()}/v1/inbox/send/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConv.id,
          customerPhone: activeConv.customerPhone,
          body: textToSend,
          senderPhoneId: effectiveSenderPhoneId
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh messages
        fetchMessages(activeConv.id);
        fetchConversations(false);
      } else {
        alert("Message dispatch failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Change conversation status
  const handleUpdateStatus = async (newStatus: "OPEN" | "WAITING" | "RESOLVED") => {
    if (!activeConv) return;
    try {
      await fetch(`${getApiUrl()}/v1/inbox/conversation/${activeConv.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      setConversations(prev =>
        prev.map(c => (c.id === activeConv.id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error("Failed to update conversation status:", err);
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDateHeader = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-4 sm:-m-8 bg-slate-50 dark:bg-[#070b14] overflow-hidden">
      {/* Top Banner / Bar with Phone Selector Dropdown */}
      <div className="h-16 bg-white dark:bg-[#0B101D] border-b border-slate-200/80 dark:border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 shadow-2xs backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
            💬
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {filteredConversations.length} Active Conversation{filteredConversations.length !== 1 ? "s" : ""}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
              {selectedPhoneId === "ALL"
                ? "Unified 2-way inbox across all connected WhatsApp numbers"
                : `Filtered to ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "selected line"}`}
            </p>
          </div>
        </div>

        {/* Number Selector Dropdown & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WhatsApp Business Line Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">📱</span>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider hidden md:inline">
              Line:
            </label>
            <div className="relative">
              <select
                value={selectedPhoneId}
                onChange={(e) => setSelectedPhoneId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#070b14] border border-slate-200/90 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg pl-2.5 pr-7 py-1.5 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition w-[155px] sm:w-[185px] truncate"
              >
                <option value="ALL">🌐 All Numbers ({phoneNumbers.length})</option>
                {phoneNumbers.map((p) => {
                  const countForNum = conversations.filter(c => c.phoneId === p.phoneId).length;
                  return (
                    <option key={p.phoneId} value={p.phoneId}>
                      {p.displayPhone} {p.verifiedName ? `• ${p.verifiedName}` : ""} ({countForNum}) {p.isDefault ? "★" : ""}
                    </option>
                  );
                })}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</span>
            </div>
          </div>

          {phoneNumbers.length === 0 && !loadingNumbers && (
            <Link
              href="/dashboard/numbers"
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-2xs shrink-0"
            >
              <span>⚠️ Link Number</span>
              <span>→</span>
            </Link>
          )}

          <button
            onClick={() => openNewChatModal()}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs hover:shadow cursor-pointer shrink-0"
            title="Start a new WhatsApp conversation with any phone number"
          >
            <span className="text-sm font-black leading-none">＋</span>
            <span>Start Conversation</span>
          </button>

          <button
            onClick={() => {
              fetchConversations(true);
              loadPhoneNumbers();
              if (selectedConvId) fetchMessages(selectedConvId);
            }}
            className="px-3 py-1.5 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
            title="Refresh conversations and numbers"
          >
            🔄 <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Inbox 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Conversations List */}
        <div className="w-80 md:w-96 bg-white dark:bg-[#0B101D] border-r border-slate-200 dark:border-white/[0.08] flex flex-col shrink-0">
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] space-y-2.5">
            {/* Free Monthly Messages Meter (Meta Free Tier) */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-100/40 dark:to-white/[0.02] border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                  🎁
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {freeTier.remaining.toLocaleString()} / {freeTier.total.toLocaleString()} Free Left
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      {freeTier.currentMonth}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Drops to 0 • Resets 1st of {freeTier.nextMonth}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-2xs">
                  ₹0 Fee
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search chats or phone numbers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#070b14] transition"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => openNewChatModal()}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer shadow-2xs"
                title="Start new conversation with any number"
              >
                <span>＋</span>
                <span>New</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {(["ALL", "OPEN", "WAITING", "RESOLVED"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${
                      statusFilter === tab
                        ? "bg-slate-900 dark:bg-emerald-600 text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {selectedPhoneId !== "ALL" && (
                <button
                  onClick={() => setSelectedPhoneId("ALL")}
                  className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold underline shrink-0"
                  title="Clear number filter"
                >
                  Clear filter ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
            {/* 1-Click Action: Start new chat with this searched number or name */}
            {searchQuery.trim().length > 0 && (
              <div
                onClick={() => openNewChatModal(searchQuery.trim())}
                className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-b border-emerald-500/20 cursor-pointer transition flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    💬
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                      Start chat with &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Click to enter message or template ➔
                    </p>
                  </div>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">＋</span>
              </div>
            )}

            {/* Found Contacts from OTP & Campaigns */}
            {contactResults.length > 0 && (
              <div className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.06] p-2 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 flex items-center justify-between">
                  <span>Contacts from OTP & Campaigns</span>
                  <span className="text-[9px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.2 rounded font-mono">
                    {contactResults.length}
                  </span>
                </div>
                {contactResults.map((contact, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (contact.conversationId) {
                        setSelectedConvId(contact.conversationId);
                      } else {
                        openNewChatModal(contact.phone, contact.name);
                      }
                    }}
                    className="p-2 hover:bg-white dark:hover:bg-white/[0.06] rounded-lg cursor-pointer transition flex items-center justify-between gap-2 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {contact.source === "OTP" ? "🔐" : "📢"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {contact.name || contact.phone}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          +{contact.phone.replace(/^\+/, "")} • {contact.source}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded">
                      {contact.conversationId ? "Open Chat" : "Start Chat"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {loadingList ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <p className="text-3xl mb-2">💬</p>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {searchQuery
                    ? `No chats found matching "${searchQuery}"`
                    : selectedPhoneId !== "ALL"
                    ? `No chats found for ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "selected line"}`
                    : "No conversations found"}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  You can start a conversation with any WhatsApp number directly using Direct Message or an Approved Meta Template.
                </p>
                <button
                  onClick={() => openNewChatModal(searchQuery)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">＋</span>
                  <span>Start New Conversation {searchQuery ? `with "${searchQuery}"` : ""}</span>
                </button>
                {selectedPhoneId !== "ALL" && (
                  <div className="mt-2">
                    <button
                      onClick={() => setSelectedPhoneId("ALL")}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Show All Numbers →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                const initials = (conv.customerName || conv.customerPhone).slice(0, 2).toUpperCase();
                const matchedNumber = phoneNumbers.find(p => p.phoneId === conv.phoneId);

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] ${
                      isSelected ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-l-4 border-emerald-600 dark:border-emerald-500" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs">
                        {initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0B101D]"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {conv.customerName || conv.customerPhone}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 ml-1">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate pr-2">
                          {conv.lastMessageDirection === "OUTBOUND" && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium mr-1">You:</span>
                          )}
                          {conv.lastMessage || "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            conv.status === "OPEN"
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                              : conv.status === "WAITING"
                              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                              : "bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {conv.status}
                        </span>

                        {/* WhatsApp business line badge */}
                        {matchedNumber ? (
                          <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            <span>📱</span>
                            <span>{matchedNumber.displayPhone}</span>
                          </span>
                        ) : conv.phoneId && conv.phoneId !== "phone_default" ? (
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            ID: {conv.phoneId.slice(-6)}
                          </span>
                        ) : null}

                        {conv.tags && conv.tags.length > 0 && (
                          <span className="text-[9px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                            {conv.tags[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pane 2: Message Thread & Composer */}
        <div className="flex-1 flex flex-col bg-[#efeae2]/40 dark:bg-[#070b14] relative overflow-hidden">
          {activeConv ? (
            <>
              {/* Active Chat Header */}
              <div className="h-16 bg-white dark:bg-[#0B101D] border-b border-slate-200 dark:border-white/[0.08] px-5 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {(activeConv.customerName || activeConv.customerPhone).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {activeConv.customerName || activeConv.customerPhone}
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        +{activeConv.customerPhone.replace(/^\+/, "")}
                      </span>
                      {activeConvPhone && (
                        <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span>📱 Line: {activeConvPhone.displayPhone}</span>
                          {activeConvPhone.verifiedName && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-normal">({activeConvPhone.verifiedName})</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* 24-Hour Customer Service Window Pill */}
                    <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          serviceWindowInfo.active ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      ></span>
                      <span
                        className={`font-semibold ${
                          serviceWindowInfo.active ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {serviceWindowInfo.label}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] hidden md:inline">
                        • Meta 24h Care Window
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  <select
                    value={activeConv.status}
                    onChange={e => handleUpdateStatus(e.target.value as any)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#070b14] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="OPEN">🟢 Open</option>
                    <option value="WAITING">🟡 Waiting</option>
                    <option value="RESOLVED">⚪ Resolved</option>
                  </select>

                  <button
                    onClick={() => setActiveTab(activeTab === "chat" ? "details" : "chat")}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.06] text-xs font-medium transition"
                    title="Toggle customer details"
                  >
                    ℹ️ Details
                  </button>
                </div>
              </div>

              {/* Service Window Notice Banner */}
              {!serviceWindowInfo.active && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      <strong>24-Hour Meta Service Window Expired:</strong> To message this customer, you must use an approved Meta Template or wait for them to send a new message.
                    </span>
                  </div>
                  <Link
                    href="/dashboard/campaigns"
                    className="text-amber-800 dark:text-amber-300 underline font-bold hover:text-amber-900 dark:hover:text-amber-200 text-xs shrink-0 ml-3"
                  >
                    Send Template →
                  </Link>
                </div>
              )}

              {/* Message Thread Scroll View */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loadingMessages && messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading chat history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs bg-white/60 dark:bg-[#0B101D]/80 rounded-xl max-w-md mx-auto my-6 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md">
                    <p className="text-2xl mb-1">💬</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">No messages in this conversation yet</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Type a response below to initiate chat from {effectiveSenderPhoneObj?.displayPhone || "your business line"}.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isOutbound = msg.direction === "OUTBOUND";
                    const matchedSender = phoneNumbers.find(p => p.phoneId === msg.senderPhone);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-2xs text-xs relative ${
                            isOutbound
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-xs"
                              : "bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-white/[0.06]"
                          }`}
                        >
                          {isOutbound && matchedSender && (
                            <div className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 pb-0.5 flex items-center gap-1">
                              <span>📱 Sent via {matchedSender.displayPhone}</span>
                              {matchedSender.verifiedName ? <span className="text-slate-400 dark:text-emerald-200">({matchedSender.verifiedName})</span> : null}
                            </div>
                          )}

                          <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                            {msg.content || msg.body || ""}
                          </p>

                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isOutbound ? "text-emerald-700 dark:text-emerald-200" : "text-slate-400 dark:text-slate-400"
                            }`}
                          >
                            <span>{formatTimestamp(msg.createdAt)}</span>
                            {isOutbound && (
                              <span title={`Status: ${msg.status}`}>
                                {msg.status === "sending" ? "⏳" : "✓✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Response Templates Selector */}
              <div className="bg-slate-50/90 dark:bg-[#0B101D]/90 border-t border-slate-200 dark:border-white/[0.08] px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                  ⚡ Quick:
                </span>
                {QUICK_RESPONSES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="shrink-0 bg-white dark:bg-[#070b14] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium transition max-w-[200px] truncate"
                    title={qr}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Outbound Sender Line Selector */}
              <div className="bg-slate-50 dark:bg-[#0B101D] border-t border-slate-200 dark:border-white/[0.08] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Replying From:
                  </span>
                  {phoneNumbers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={effectiveSenderPhoneId}
                        onChange={(e) => setReplySenderPhoneId(e.target.value)}
                        className="appearance-none bg-white dark:bg-[#070b14] border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300 font-bold text-xs rounded-lg pl-2.5 pr-7 py-1 shadow-2xs hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {phoneNumbers.map((p) => {
                          const isThreadLine = p.phoneId === activeConv?.phoneId;
                          return (
                            <option key={p.phoneId} value={p.phoneId}>
                              📱 {p.displayPhone} {p.verifiedName ? `• ${p.verifiedName}` : ""} {isThreadLine ? "★ [This Thread's Line]" : p.isDefault ? "[Default]" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-400 pointer-events-none text-[10px]">▼</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded">
                      Default Project WhatsApp Line
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[10.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ₹0.00 Meta Fee
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10.5px] hidden sm:inline">
                    • {freeTier.remaining.toLocaleString()} free {freeTier.currentMonth} replies remaining
                  </span>
                </div>
              </div>

              {/* Message Composer Input */}
              <form
                onSubmit={handleSendMessage}
                className="bg-white dark:bg-[#0B101D] border-t border-slate-200 dark:border-white/[0.08] p-3 flex items-center gap-2"
              >
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    serviceWindowInfo.active
                      ? "Type a reply... (Press Enter to send)"
                      : "Type a reply or initiate via Meta Template..."
                  }
                  className="flex-1 resize-none bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#070b14] transition"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
                >
                  {sending ? "Sending..." : "Send ➤"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center">
              <span className="text-5xl mb-3">💬</span>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Select a conversation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {selectedPhoneId !== "ALL"
                  ? `Choose a chat on ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "this line"} from the left pane to view messages and reply in real time.`
                  : "Choose a customer thread from the left pane to view messages, reply in real time, or manage customer attributes."}
              </p>
            </div>
          )}
        </div>

        {/* Pane 3: Customer Details & Contact Attributes (Collapsible / Side Pane) */}
        {activeConv && activeTab === "details" && (
          <div className="w-72 bg-white dark:bg-[#0B101D] border-l border-slate-200 dark:border-white/[0.08] p-5 overflow-y-auto space-y-5 shrink-0">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                {(activeConv.customerName || activeConv.customerPhone).slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeConv.customerName || "Customer"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                +{activeConv.customerPhone.replace(/^\+/, "")}
              </p>
            </div>

            {/* Business Line Information */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Connected WhatsApp Line
              </h4>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#070b14] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Number:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {activeConvPhone?.displayPhone || activeConv.phoneId || "Default Line"}
                  </span>
                </div>
                {activeConvPhone?.verifiedName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Verified Name:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{activeConvPhone.verifiedName}</span>
                  </div>
                )}
                {activeConvPhone?.quality && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Quality:</span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.2 rounded">
                      {activeConvPhone.quality}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Window Information */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Meta 24h Service Window
              </h4>
              <div
                className={`p-3 rounded-lg border text-xs ${
                  serviceWindowInfo.active
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${serviceWindowInfo.active ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                  {serviceWindowInfo.active ? "Active Free-Form Window" : "Window Expired"}
                </div>
                <p className="text-[11px] mt-1 leading-relaxed">
                  {serviceWindowInfo.active
                    ? `You can send regular text, images, and attachments for free until ${new Date(activeConv.serviceWindowExpiresAt || "").toLocaleTimeString()}.`
                    : "Standard WhatsApp policy requires starting conversations with pre-approved Meta Templates."}
                </p>
              </div>
            </div>

            {/* Conversation Attributes */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Conversation Details
              </h4>

              <div className="bg-slate-50 dark:bg-[#070b14] rounded-lg p-3 space-y-2 text-xs border border-slate-100 dark:border-white/[0.06]">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Status:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeConv.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">First Contact:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateHeader(activeConv.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total In Thread:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{messages.length} messages</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Tags & Segments
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(activeConv.tags && activeConv.tags.length > 0
                  ? activeConv.tags
                  : ["Inbound Lead", "WhatsApp Web"]
                ).map((tag, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md font-medium"
                  >
                    🏷️ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta Official Cloud API disclaimer */}
            <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-lg border border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              🔒 Powered by Meta Official WhatsApp Cloud API. Messages are encrypted and delivered directly to the user device.
            </div>
          </div>
        )}
      </div>

      {/* Start New Conversation Modal */}
      {mounted && showNewChatModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold">
                  💬
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Start New WhatsApp Conversation
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Reach out to any WhatsApp phone number using your connected line
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleStartNewChat} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {newChatError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                  <span className="text-sm shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold">{newChatError}</p>
                    {newChatError.includes("24-hour") && newChatMode === "text" && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewChatMode("template");
                          setNewChatError("");
                        }}
                        className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline block hover:text-emerald-800"
                      >
                        Switch to Pre-Approved Meta Template →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Row 1: Recipient Phone Number & Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recipient Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210 or +91..."
                    value={newChatPhone}
                    onChange={e => setNewChatPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    10-digit Indian numbers auto-prefix with +91.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newChatName}
                    onChange={e => setNewChatName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Sender WhatsApp Line */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender WhatsApp Business Line
                </label>
                <select
                  value={newChatSenderPhoneId}
                  onChange={e => setNewChatSenderPhoneId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {phoneNumbers.map(p => (
                    <option key={p.phoneId} value={p.phoneId}>
                      {p.displayPhone} {p.verifiedName ? `• ${p.verifiedName}` : ""} {p.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outreach Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Outreach Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChatMode("template")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newChatMode === "template"
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-2xs"
                        : "border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>📄</span>
                      <span>Meta Template</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold ml-auto">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Pre-approved by Meta. Required for cold numbers outside 24h care window.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChatMode("text")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newChatMode === "text"
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-2xs"
                        : "border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>💬</span>
                      <span>Direct Message</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      Free-form text message. Works for active sessions or developer sandbox.
                    </p>
                  </button>
                </div>
              </div>

              {/* Mode 1: Template Message */}
              {newChatMode === "template" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.06]">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Approved Template
                    </label>
                    {loadingTemplates ? (
                      <div className="py-2 text-slate-400 text-xs">Loading approved templates from Meta...</div>
                    ) : availableTemplates.length === 0 ? (
                      <div className="text-xs text-amber-700 dark:text-amber-400 py-1">
                        No approved templates found.{" "}
                        <Link href="/dashboard/templates" className="font-bold underline">
                          Create a template in Template Studio →
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={newChatTemplateName}
                        onChange={e => {
                          const tName = e.target.value;
                          setNewChatTemplateName(tName);
                          const t = availableTemplates.find(x => x.name === tName);
                          if (t?.language) setNewChatTemplateLanguage(t.language);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {availableTemplates.map((t: any) => (
                          <option key={t.id || t.name} value={t.name}>
                            {t.name} ({t.category || "UTILITY"}) • {t.language || "en_US"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {templateBodyText && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Template Message Preview:
                      </label>
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                        {templateBodyText}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Variables */}
                  {templateVariableKeys.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Template Parameters ({templateVariableKeys.length})
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {templateVariableKeys.map(k => (
                          <div key={k}>
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                              Variable &#123;&#123;{k}&#125;&#125; Value
                            </label>
                            <input
                              type="text"
                              placeholder={k === "1" && newChatName ? newChatName : `Value for {{${k}}}`}
                              value={newChatTemplateVariables[k] || ""}
                              onChange={e => setNewChatTemplateVariables(prev => ({ ...prev, [k]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Direct Text Message */}
              {newChatMode === "text" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Direct Message <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Type your message to initiate the conversation... (Leave empty to just open the thread)"
                    value={newChatMessage}
                    onChange={e => setNewChatMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1">
                    {QUICK_RESPONSES.slice(0, 3).map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNewChatMessage(r)}
                        className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-white/[0.05] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/80 dark:border-white/5 truncate max-w-full"
                      >
                        {r.slice(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingNewChat || !newChatPhone.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingNewChat ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting Chat...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Start Conversation & Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
