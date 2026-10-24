"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useSubscription } from "@/context/SubscriptionContext";

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
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-8 bg-slate-50 overflow-hidden">
      {/* Top Banner / Bar with Phone Selector Dropdown */}
      <div className="h-16 bg-white border-b border-slate-200/80 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {filteredConversations.length} Active Conversation{filteredConversations.length !== 1 ? "s" : ""}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              {selectedPhoneId === "ALL"
                ? "Unified 2-way inbox across all connected WhatsApp numbers"
                : `Filtered to ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "selected line"}`}
            </p>
          </div>
        </div>

        {/* Number Selector Dropdown & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* WhatsApp Business Line Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-xs text-emerald-600">📱</span>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
              WhatsApp Line:
            </label>
            <div className="relative">
              <select
                value={selectedPhoneId}
                onChange={(e) => setSelectedPhoneId(e.target.value)}
                className="appearance-none bg-white border border-slate-200/90 hover:border-emerald-500 text-slate-800 text-xs font-bold rounded-lg pl-2.5 pr-7 py-1.5 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition min-w-[210px] sm:min-w-[260px]"
              >
                <option value="ALL">🌐 All Connected Numbers ({phoneNumbers.length})</option>
                {phoneNumbers.map((p) => {
                  const countForNum = conversations.filter(c => c.phoneId === p.phoneId).length;
                  return (
                    <option key={p.phoneId} value={p.phoneId}>
                      {p.displayPhone} {p.verifiedName ? `• ${p.verifiedName}` : ""} ({countForNum} chat{countForNum !== 1 ? "s" : ""}) {p.isDefault ? "★ Default" : ""}
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
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow-2xs shrink-0"
            >
              <span>⚠️ Link Number</span>
              <span>→</span>
            </Link>
          )}

          <button
            onClick={() => {
              fetchConversations(true);
              loadPhoneNumbers();
              if (selectedConvId) fetchMessages(selectedConvId);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
            title="Refresh conversations and numbers"
          >
            🔄 <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Inbox 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Conversations List */}
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats or phone numbers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
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
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {selectedPhoneId !== "ALL" && (
                <button
                  onClick={() => setSelectedPhoneId("ALL")}
                  className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline shrink-0"
                  title="Clear number filter"
                >
                  Clear filter ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <p className="text-2xl mb-2">📭</p>
                <p className="font-semibold text-slate-700">
                  {selectedPhoneId !== "ALL"
                    ? `No chats found for ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "selected line"}`
                    : "No conversations found"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedPhoneId !== "ALL"
                    ? "Inbound messages to this specific WhatsApp line will appear here."
                    : "Inbound WhatsApp messages will appear here automatically."}
                </p>
                {selectedPhoneId !== "ALL" && (
                  <button
                    onClick={() => setSelectedPhoneId("ALL")}
                    className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition"
                  >
                    Show All Numbers →
                  </button>
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
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? "bg-emerald-50/60 border-l-4 border-emerald-600" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {conv.customerName || conv.customerPhone}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <p className="text-slate-500 text-[11px] truncate pr-2">
                          {conv.lastMessageDirection === "OUTBOUND" && (
                            <span className="text-emerald-600 font-medium mr-1">You:</span>
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
                              ? "bg-emerald-100 text-emerald-800"
                              : conv.status === "WAITING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {conv.status}
                        </span>

                        {/* WhatsApp business line badge */}
                        {matchedNumber ? (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            <span>📱</span>
                            <span>{matchedNumber.displayPhone}</span>
                          </span>
                        ) : conv.phoneId && conv.phoneId !== "phone_default" ? (
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            ID: {conv.phoneId.slice(-6)}
                          </span>
                        ) : null}

                        {conv.tags && conv.tags.length > 0 && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[90px]">
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
        <div className="flex-1 flex flex-col bg-[#efeae2]/40 relative overflow-hidden">
          {activeConv ? (
            <>
              {/* Active Chat Header */}
              <div className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {(activeConv.customerName || activeConv.customerPhone).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {activeConv.customerName || activeConv.customerPhone}
                      </h2>
                      <span className="text-xs text-slate-500 font-mono">
                        +{activeConv.customerPhone.replace(/^\+/, "")}
                      </span>
                      {activeConvPhone && (
                        <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span>📱 Line: {activeConvPhone.displayPhone}</span>
                          {activeConvPhone.verifiedName && (
                            <span className="text-emerald-600 font-normal">({activeConvPhone.verifiedName})</span>
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
                          serviceWindowInfo.active ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {serviceWindowInfo.label}
                      </span>
                      <span className="text-slate-400 text-[10px] hidden md:inline">
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
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="OPEN">🟢 Open</option>
                    <option value="WAITING">🟡 Waiting</option>
                    <option value="RESOLVED">⚪ Resolved</option>
                  </select>

                  <button
                    onClick={() => setActiveTab(activeTab === "chat" ? "details" : "chat")}
                    className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-medium"
                    title="Toggle customer details"
                  >
                    ℹ️ Details
                  </button>
                </div>
              </div>

              {/* Service Window Notice Banner */}
              {!serviceWindowInfo.active && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>
                      <strong>24-Hour Meta Service Window Expired:</strong> To message this customer, you must use an approved Meta Template or wait for them to send a new message.
                    </span>
                  </div>
                  <Link
                    href="/dashboard/campaigns"
                    className="text-amber-800 underline font-bold hover:text-amber-900 text-xs shrink-0 ml-3"
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
                  <div className="p-12 text-center text-slate-400 text-xs bg-white/60 rounded-xl max-w-md mx-auto my-6 border border-slate-200/80">
                    <p className="text-2xl mb-1">💬</p>
                    <p className="font-semibold text-slate-700">No messages in this conversation yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
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
                              ? "bg-[#d9fdd3] text-slate-900 rounded-tr-xs"
                              : "bg-white text-slate-900 rounded-tl-xs border border-slate-200/60"
                          }`}
                        >
                          {isOutbound && matchedSender && (
                            <div className="text-[9px] font-bold text-emerald-800 pb-0.5 flex items-center gap-1">
                              <span>📱 Sent via {matchedSender.displayPhone}</span>
                              {matchedSender.verifiedName ? <span className="text-slate-400">({matchedSender.verifiedName})</span> : null}
                            </div>
                          )}

                          <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                            {msg.content || msg.body || ""}
                          </p>

                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isOutbound ? "text-emerald-700" : "text-slate-400"
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
              <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  ⚡ Quick:
                </span>
                {QUICK_RESPONSES.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="shrink-0 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition max-w-[200px] truncate"
                    title={qr}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Outbound Sender Line Selector */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Replying From:
                  </span>
                  {phoneNumbers.length > 0 ? (
                    <div className="relative">
                      <select
                        value={effectiveSenderPhoneId}
                        onChange={(e) => setReplySenderPhoneId(e.target.value)}
                        className="appearance-none bg-white border border-emerald-300 text-emerald-900 font-bold text-xs rounded-lg pl-2.5 pr-7 py-1 shadow-2xs hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-700 pointer-events-none text-[10px]">▼</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Default Project WhatsApp Line
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
                  <span>Customer receives reply from this verified business line</span>
                </div>
              </div>

              {/* Message Composer Input */}
              <form
                onSubmit={handleSendMessage}
                className="bg-white border-t border-slate-200 p-3 flex items-center gap-2"
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
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <span className="text-5xl mb-3">💬</span>
              <h3 className="text-base font-bold text-slate-700">Select a conversation</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {selectedPhoneId !== "ALL"
                  ? `Choose a chat on ${phoneNumbers.find(p => p.phoneId === selectedPhoneId)?.displayPhone || "this line"} from the left pane to view messages and reply in real time.`
                  : "Choose a customer thread from the left pane to view messages, reply in real time, or manage customer attributes."}
              </p>
            </div>
          )}
        </div>

        {/* Pane 3: Customer Details & Contact Attributes (Collapsible / Side Pane) */}
        {activeConv && activeTab === "details" && (
          <div className="w-72 bg-white border-l border-slate-200 p-5 overflow-y-auto space-y-5 shrink-0">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                {(activeConv.customerName || activeConv.customerPhone).slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeConv.customerName || "Customer"}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                +{activeConv.customerPhone.replace(/^\+/, "")}
              </p>
            </div>

            {/* Business Line Information */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Connected WhatsApp Line
              </h4>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Number:</span>
                  <span className="font-bold text-slate-800">
                    {activeConvPhone?.displayPhone || activeConv.phoneId || "Default Line"}
                  </span>
                </div>
                {activeConvPhone?.verifiedName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Verified Name:</span>
                    <span className="font-semibold text-emerald-700">{activeConvPhone.verifiedName}</span>
                  </div>
                )}
                {activeConvPhone?.quality && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Quality:</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      {activeConvPhone.quality}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Window Information */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Meta 24h Service Window
              </h4>
              <div
                className={`p-3 rounded-lg border text-xs ${
                  serviceWindowInfo.active
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
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
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Conversation Details
              </h4>

              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-slate-800">{activeConv.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">First Contact:</span>
                  <span className="font-medium text-slate-700">{formatDateHeader(activeConv.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total In Thread:</span>
                  <span className="font-medium text-slate-700">{messages.length} messages</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tags & Segments
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(activeConv.tags && activeConv.tags.length > 0
                  ? activeConv.tags
                  : ["Inbound Lead", "WhatsApp Web"]
                ).map((tag, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium"
                  >
                    🏷️ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta Official Cloud API disclaimer */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              🔒 Powered by Meta Official WhatsApp Cloud API. Messages are encrypted and delivered directly to the user device.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
