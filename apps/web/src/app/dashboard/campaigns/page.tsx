"use client";

import React, { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { useSubscription } from "@/context/SubscriptionContext";
import Loader from "@/components/Loader";

interface PhoneNumberItem {
  id: string;
  phoneId: string;
  displayPhone: string;
  verifiedName?: string;
  service: string;
  isDefault: boolean;
  quality?: string;
}

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  buttons?: Array<{
    type: "URL" | "QUICK_REPLY" | "OTP" | "PHONE_NUMBER";
    text: string;
    url?: string;
  }>;
}

interface MetaTemplate {
  id: string;
  name: string;
  category: "AUTHENTICATION" | "MARKETING" | "UTILITY";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  components: TemplateComponent[];
}

interface CampaignItem {
  id: string;
  name: string;
  service: "MARKETING" | "UTILITY";
  phoneId: string;
  senderPhone?: string;
  templateName: string;
  templateLanguage: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "COMPLETED" | "PAUSED" | "FAILED";
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface RecipientItem {
  id: string;
  phone: string;
  name?: string;
  variables?: Record<string, string>;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  metaMessageId?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const { showModal, showSuccess, showError, showWarning, showLoading } = useModal();
  const { isDemo, triggerPaywall } = useSubscription();

  // Project ID from localStorage
  const [projectId, setProjectId] = useState<string>("");

  // Data states
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Available Sender Numbers & Templates
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberItem[]>([]);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [templateVariablesMap, setTemplateVariablesMap] = useState<Record<string, Array<{ index: number; name: string; label: string; sampleValue: string }>>>({});

  // Wizard state
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Wizard Form Data
  const [campaignName, setCampaignName] = useState<string>("");
  const [service, setService] = useState<"MARKETING" | "UTILITY">("MARKETING");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [templateLanguage, setTemplateLanguage] = useState<string>("en_US");
  const [sendRate, setSendRate] = useState<number>(10);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");

  // Excel & Audience Mapping state
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [phoneColumn, setPhoneColumn] = useState<string>("");
  const [nameColumn, setNameColumn] = useState<string>("");
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});
  const [staticFallbacks, setStaticFallbacks] = useState<Record<string, string>>({});
  const [previewRowIndex, setPreviewRowIndex] = useState<number>(0);

  // Test Message
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>("");
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Recipient details drawer
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [recipientsList, setRecipientsList] = useState<RecipientItem[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState<boolean>(false);

  // Initialize Project ID
  useEffect(() => {
    let pid = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;
    if (!pid && typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.projectId) pid = u.projectId;
        } catch (e) {}
      }
    }
    if (pid) {
      setProjectId(pid);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch Campaigns, Phone Numbers, and Templates
  const loadCampaigns = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (e: any) {
      console.error("Failed to load campaigns:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    if (!projectId) return;
    try {
      // 1. Load Phone Numbers
      const pRes = await fetch(`${getApiUrl()}/v1/meta/numbers/${projectId}`);
      const pData = await pRes.json();
      if (pData.success && pData.numbers) {
        setPhoneNumbers(pData.numbers);
        if (pData.numbers.length > 0 && !selectedPhoneId) {
          const defaultNum = pData.numbers.find((n: PhoneNumberItem) => n.isDefault) || pData.numbers[0];
          setSelectedPhoneId(defaultNum.phoneId);
        }
      }

      // 2. Load Approved Templates from Meta (strictly exclude AUTHENTICATION / OTP templates)
      const tRes = await fetch(`${getApiUrl()}/v1/meta/templates/${projectId}`);
      const tData = await tRes.json();
      if (tData.success && tData.templates) {
        const approved = tData.templates.filter((t: MetaTemplate) => t.status === "APPROVED" && t.category !== "AUTHENTICATION");
        setTemplates(approved);
      }

      // 3. Load Template Variables metadata
      try {
        const vRes = await fetch(`${getApiUrl()}/v1/meta/template-variables/${projectId}`);
        const vData = await vRes.json();
        if (vData.success && vData.variables) {
          setTemplateVariablesMap(vData.variables);
        }
      } catch (err) {}
    } catch (e) {
      console.error("Error loading dependencies:", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadCampaigns();
      loadDependencies();
    }
  }, [projectId]);

  // Filter templates by category (MARKETING or UTILITY)
  const filteredTemplatesForService = useMemo(() => {
    return templates.filter((t) => {
      if (t.category === "AUTHENTICATION") return false;
      if (service === "MARKETING") return t.category === "MARKETING";
      if (service === "UTILITY") return t.category === "UTILITY";
      return true;
    });
  }, [templates, service]);

  // Selected Template object
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.name === selectedTemplateName);
  }, [templates, selectedTemplateName]);

  // Auto-select first template when category or list changes
  useEffect(() => {
    if (filteredTemplatesForService.length > 0) {
      const exists = filteredTemplatesForService.find((t) => t.name === selectedTemplateName);
      if (!exists) {
        setSelectedTemplateName(filteredTemplatesForService[0].name);
        setTemplateLanguage(filteredTemplatesForService[0].language || "en_US");
      }
    } else {
      setSelectedTemplateName("");
    }
  }, [filteredTemplatesForService]);

  // Detect variables like {{1}}, {{2}} or {{Customer_Name}} in template body
  const detectedVariables = useMemo(() => {
    if (!currentTemplate) return [];
    const bodyComp = currentTemplate.components?.find((c) => c.type === "BODY");
    if (!bodyComp || !bodyComp.text) return [];

    const matches = bodyComp.text.match(/\{\{([a-zA-Z0-9_\s]+)\}\}/g);
    if (!matches) return [];

    const uniqueVars = Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, "").trim())));
    return uniqueVars.sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return 0;
    });
  }, [currentTemplate]);

  // Helper: Get label and sample preview for a given variable key in the current template
  const getVariableInfo = (varKey: string) => {
    // 1. Try templateVariablesMap for current template
    const savedList = templateVariablesMap[selectedTemplateName];
    if (savedList && Array.isArray(savedList)) {
      const found = savedList.find(
        (v) => String(v.index) === String(varKey) || v.name.toLowerCase() === varKey.toLowerCase()
      );
      if (found) {
        return {
          label: found.label || found.name,
          sample: found.sampleValue || "Sample Value",
          originalName: found.name
        };
      }
    }

    // 2. Try localStorage fallback
    if (typeof window !== "undefined") {
      try {
        const localStr = localStorage.getItem(`tpl_vars_${selectedTemplateName}`);
        if (localStr) {
          const parsed: any[] = JSON.parse(localStr);
          const found = parsed.find(
            (v) => String(v.index) === String(varKey) || v.name.toLowerCase() === varKey.toLowerCase()
          );
          if (found) {
            return {
              label: found.label || found.name,
              sample: found.sampleValue || "Sample Value",
              originalName: found.name
            };
          }
        }
      } catch (e) {}
    }

    // 3. Smart fallbacks
    let label = varKey.replace(/_/g, " ");
    let sample = "Sample Value";
    if (/^\d+$/.test(varKey)) {
      if (varKey === "1") {
        label = "Customer Name";
        sample = "Rahul Sharma";
      } else if (varKey === "2") {
        label = "Order ID";
        sample = "ORD-9481";
      } else if (varKey === "3") {
        label = "Offer / Amount";
        sample = "₹1,499";
      } else {
        label = `Variable ${varKey}`;
        sample = `Value ${varKey}`;
      }
    } else {
      const lower = varKey.toLowerCase();
      if (/name|customer|user|client/i.test(lower)) sample = "Rahul Sharma";
      else if (/order|invoice|bill/i.test(lower)) sample = "ORD-9481";
      else if (/discount|offer|percent|coupon/i.test(lower)) sample = "25% OFF";
      else if (/address|city|loc/i.test(lower)) sample = "Flat 402, Green Avenue, Mumbai";
      else if (/amount|price|total|cost|fee/i.test(lower)) sample = "₹1,499";
      else if (/date|time|day/i.test(lower)) sample = "24 Oct 2026";
    }

    return {
      label,
      sample,
      originalName: varKey
    };
  };

  // Handle Excel / CSV File Upload with Smart Auto-Mapping
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showError("Uploaded spreadsheet is empty. Please include headers and at least one contact row.");
          return;
        }

        const cols = Object.keys(data[0]);
        setExcelColumns(cols);
        setParsedRows(data);
        setPreviewRowIndex(0);

        // Smart phone column detection
        const detectedPhone = cols.find((c) =>
          /phone|mobile|contact|whatsapp|number|cell/i.test(c.trim())
        );
        if (detectedPhone) setPhoneColumn(detectedPhone);
        else setPhoneColumn(cols[0]);

        // Smart recipient name column detection
        const detectedName = cols.find((c) => /name|customer|client|recipient|user/i.test(c.trim()));
        if (detectedName) setNameColumn(detectedName);

        // Smart auto-mapping for template variables against Excel columns
        const initialMap: Record<string, string> = {};
        const initialFallbacks: Record<string, string> = {};

        detectedVariables.forEach((v, idx) => {
          const info = getVariableInfo(v);
          initialFallbacks[v] = info.sample;

          const lowerLabel = info.label.toLowerCase();
          const lowerVar = v.toLowerCase();
          const lowerOrig = (info.originalName || "").toLowerCase();

          // Search for best matching Excel column
          const matchedCol = cols.find((c) => {
            const lc = c.trim().toLowerCase();
            return (
              lc === lowerLabel ||
              lc === lowerVar ||
              lc === lowerOrig ||
              lc.replace(/[^a-z0-9]/g, "") === lowerLabel.replace(/[^a-z0-9]/g, "") ||
              lc.replace(/[^a-z0-9]/g, "") === lowerVar.replace(/[^a-z0-9]/g, "") ||
              (lowerLabel.includes("name") && lc.includes("name")) ||
              (lowerLabel.includes("order") && lc.includes("order")) ||
              (lowerLabel.includes("discount") && (lc.includes("discount") || lc.includes("offer") || lc.includes("promo"))) ||
              (lowerLabel.includes("address") && (lc.includes("address") || lc.includes("city") || lc.includes("location"))) ||
              (lowerLabel.includes("amount") && (lc.includes("amount") || lc.includes("price") || lc.includes("total") || lc.includes("cost"))) ||
              (lowerLabel.includes("date") && (lc.includes("date") || lc.includes("day") || lc.includes("time")))
            );
          });

          if (matchedCol) {
            initialMap[v] = matchedCol;
          } else if (idx === 0 && detectedName) {
            initialMap[v] = detectedName;
          } else if (cols[idx + 1]) {
            initialMap[v] = cols[idx + 1];
          }
        });

        setVariableMappings(initialMap);
        setStaticFallbacks(initialFallbacks);

        showSuccess(`Loaded ${data.length} records from "${file.name}" successfully! Mapped Excel columns automatically.`, "Spreadsheet Imported");
      } catch (err: any) {
        showError("Failed to parse file: " + err.message, "File Read Error");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Download Sample Excel Template
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Phone: "919876543210",
        Name: "Rahul Sharma",
        Order_ID: "ORD-9481",
        Product: "Premium Subscription",
        Discount: "25% OFF"
      },
      {
        Phone: "919812345678",
        Name: "Priya Patel",
        Order_ID: "ORD-9482",
        Product: "Annual Plan",
        Discount: "20% OFF"
      },
      {
        Phone: "919988776655",
        Name: "Amit Verma",
        Order_ID: "ORD-9483",
        Product: "Developer Bundle",
        Discount: "30% OFF"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audience");
    XLSX.writeFile(wb, "whatsapp_campaign_audience_sample.xlsx");
  };

  // Generate Real-time Preview Text for WhatsApp Mockup
  const renderedMessageText = useMemo(() => {
    if (!currentTemplate) return "Please select a template to preview message content.";
    const bodyComp = currentTemplate.components?.find((c) => c.type === "BODY");
    if (!bodyComp || !bodyComp.text) return "No message body found.";

    let text = bodyComp.text;
    const currentRow = parsedRows[previewRowIndex] || {};

    detectedVariables.forEach((v) => {
      const info = getVariableInfo(v);
      const mappedCol = variableMappings[v];
      let val = mappedCol && currentRow[mappedCol] !== undefined
        ? String(currentRow[mappedCol])
        : staticFallbacks[v] || info.sample || `{{${v}}}`;
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), val);
    });

    return text;
  }, [currentTemplate, parsedRows, previewRowIndex, variableMappings, staticFallbacks, detectedVariables]);

  // Send Test Message
  const handleSendTestMessage = async () => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To send live test WhatsApp broadcasts to phone numbers, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!testPhoneNumber) {
      showError("Please enter a valid test WhatsApp number.");
      return;
    }
    if (!selectedTemplateName) {
      showError("Please select a template first.");
      return;
    }

    setIsSendingTest(true);
    try {
      // Gather sample variables
      const sampleVars: Record<string, string> = {};
      const currentRow = parsedRows[0] || {};
      detectedVariables.forEach((v) => {
        const info = getVariableInfo(v);
        const mappedCol = variableMappings[v];
        sampleVars[v] = mappedCol && currentRow[mappedCol] ? String(currentRow[mappedCol]) : staticFallbacks[v] || info.sample || "Sample Value";
      });

      const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}/test-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneId: selectedPhoneId,
          templateName: selectedTemplateName,
          templateLanguage,
          testPhone: testPhoneNumber,
          variables: sampleVars
        })
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(`Test message dispatched to +${testPhoneNumber.replace(/[^0-9]/g, "")}! Check your WhatsApp.`, "Test Message Sent");
      } else {
        showError(data.error || "Failed to send test message", "Meta API Error");
      }
    } catch (e: any) {
      showError(e.message || "Failed to dispatch test message", "Network Error");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Create Campaign
  const handleCreateCampaign = async () => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To create and schedule broadcast campaigns for delivery, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    if (!campaignName.trim()) {
      showError("Please provide a name for this campaign.");
      setWizardStep(1);
      return;
    }
    if (!selectedPhoneId) {
      showError("Please select a sender WhatsApp phone number.");
      setWizardStep(1);
      return;
    }
    if (!selectedTemplateName) {
      showError("Please select an approved WhatsApp template.");
      setWizardStep(2);
      return;
    }
    if (!parsedRows || parsedRows.length === 0) {
      showError("Audience list is empty. Please upload an Excel or CSV file with recipient contacts.");
      setWizardStep(3);
      return;
    }
    if (!phoneColumn) {
      showError("Please select which Excel column contains recipient phone numbers.");
      setWizardStep(3);
      return;
    }

    // Build recipient payload
    const recipientsPayload = parsedRows.map((row) => {
      let rawPhone = String(row[phoneColumn] || "").replace(/[^0-9]/g, "");
      // Auto-format 10 digit Indian number to 91
      if (rawPhone.length === 10) rawPhone = "91" + rawPhone;

      const vars: Record<string, string> = {};
      detectedVariables.forEach((v) => {
        const info = getVariableInfo(v);
        const col = variableMappings[v];
        vars[v] = col && row[col] ? String(row[col]) : staticFallbacks[v] || info.sample || "";
      });

      return {
        phone: rawPhone,
        name: nameColumn && row[nameColumn] ? String(row[nameColumn]) : null,
        variables: vars,
        rawData: row
      };
    });

    const senderObj = phoneNumbers.find((n) => n.phoneId === selectedPhoneId);

    showLoading("Packaging audience and registering broadcast campaign...", "Creating Campaign");

    try {
      const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          service,
          phoneId: selectedPhoneId,
          senderPhone: senderObj ? senderObj.displayPhone : null,
          templateName: selectedTemplateName,
          templateLanguage,
          variablesMapping: variableMappings,
          scheduledAt: isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : null,
          sendRate,
          recipients: recipientsPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowWizard(false);
        resetWizard();
        showSuccess(
          `Campaign "${campaignName}" created with ${recipientsPayload.length} recipients. You can launch it now or whenever you are ready!`,
          "Campaign Ready"
        );
        loadCampaigns();
      } else {
        showError(data.error || "Failed to create campaign", "Campaign Creation Error");
      }
    } catch (e: any) {
      showError(e.message || "Network error registering campaign", "Error");
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCampaignName("");
    setService("MARKETING");
    setExcelFileName("");
    setExcelColumns([]);
    setParsedRows([]);
    setPhoneColumn("");
    setNameColumn("");
    setVariableMappings({});
    setStaticFallbacks({});
    setIsScheduled(false);
    setScheduledDateTime("");
  };

  // Launch Campaign
  const handleLaunchCampaign = (camp: CampaignItem) => {
    if (isDemo) {
      triggerPaywall(
        "To Continue, Please Take a Subscription",
        "To launch and dispatch WhatsApp broadcast campaigns to customer contacts, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST)."
      );
      return;
    }
    showModal({
      title: `Launch Campaign "${camp.name}"?`,
      type: "info",
      badge: "Broadcast Launch",
      message: `You are about to start dispatching ${camp.totalRecipients} WhatsApp messages using template "${camp.templateName}".`,
      details: [
        { label: "Target Audience", value: `${camp.totalRecipients} Contacts` },
        { label: "Service Mode", value: camp.service },
        { label: "Sender Number", value: camp.senderPhone || camp.phoneId }
      ],
      note: "Messages will be delivered safely with throttled rate-limiting. You can pause or monitor progress anytime.",
      confirmText: "Yes, Start Campaign",
      cancelText: "Cancel",
      loadingTitle: `Launching "${camp.name}"...`,
      loadingMessage: "Communicating with WhatsApp Cloud API to trigger broadcast...",
      onConfirm: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}/${camp.id}/launch`, {
            method: "POST"
          });
          const data = await res.json();
          if (data.success) {
            showSuccess(data.message || "Campaign started successfully!", "Campaign In Progress");
            loadCampaigns();
          } else {
            showError(data.error || "Failed to launch campaign", "Launch Error");
          }
        } catch (e: any) {
          showError(e.message || "Network exception starting campaign", "Error");
        }
      }
    });
  };

  // Pause Campaign
  const handlePauseCampaign = async (camp: CampaignItem) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}/${camp.id}/pause`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Campaign "${camp.name}" has been paused.`, "Campaign Paused");
        loadCampaigns();
      } else {
        showError(data.error || "Failed to pause campaign");
      }
    } catch (e: any) {
      showError(e.message || "Failed to pause campaign");
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = (camp: CampaignItem) => {
    showModal({
      title: `Delete Campaign "${camp.name}"?`,
      type: "warning",
      confirmVariant: "danger",
      badge: "Permanent Deletion",
      message: `Are you sure you want to delete this campaign and its recipient delivery logs? This action cannot be undone.`,
      confirmText: "Yes, Delete Campaign",
      cancelText: "Cancel",
      loadingTitle: "Deleting Campaign...",
      loadingMessage: "Purging campaign records and recipient logs...",
      onConfirm: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}/${camp.id}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
            showSuccess(`Campaign "${camp.name}" deleted successfully.`, "Deleted");
            loadCampaigns();
          } else {
            showError(data.error || "Failed to delete campaign");
          }
        } catch (e: any) {
          showError(e.message || "Failed to delete campaign");
        }
      }
    });
  };

  // View Recipient Logs
  const handleViewDetails = async (camp: CampaignItem) => {
    setSelectedCampaign(camp);
    setLoadingRecipients(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/campaigns/${projectId}/${camp.id}/recipients?limit=500`);
      const data = await res.json();
      if (data.success) {
        setRecipientsList(data.recipients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Export Recipients to CSV
  const handleExportRecipientsCsv = () => {
    if (!recipientsList || recipientsList.length === 0) return;
    const exportData = recipientsList.map((r) => ({
      Phone: r.phone,
      Name: r.name || "",
      Status: r.status,
      SentAt: r.sentAt || "",
      MetaMessageID: r.metaMessageId || "",
      Error: r.errorMessage || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryLog");
    XLSX.writeFile(wb, `${selectedCampaign?.name || "campaign"}_delivery_log.xlsx`);
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesService = filterService === "ALL" || c.service === filterService;
      const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.senderPhone && c.senderPhone.includes(searchQuery)) ||
        c.templateName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesService && matchesStatus && matchesSearch;
    });
  }, [campaigns, filterService, filterStatus, searchQuery]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalCamps = campaigns.length;
    const totalRecipients = campaigns.reduce((acc, c) => acc + (c.totalRecipients || 0), 0);
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + (c.failedCount || 0), 0);
    const successRate = totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : "100";
    const activeCount = campaigns.filter((c) => c.status === "RUNNING").length;

    return { totalCamps, totalRecipients, totalSent, successRate, activeCount };
  }, [campaigns]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Control Bar with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80">
        {/* Left: Quick Broadcast Type Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "ALL", label: "All Broadcasts", icon: "📢", count: campaigns.length },
            { id: "MARKETING", label: "Marketing", icon: "📣", count: campaigns.filter(c => c.service === "MARKETING").length },
            { id: "UTILITY", label: "Utility", icon: "📋", count: campaigns.filter(c => c.service === "UTILITY").length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterService(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                filterService === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                filterService === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadCampaigns}
              disabled={loading}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                resetWizard();
                setShowWizard(true);
              }}
              className="px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm font-bold leading-none">+</span>
              <span>Create New Campaign</span>
            </button>
          </div>
        </div>

      {/* KPI Hero Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 text-xs shrink-0 font-bold">
                📢
              </div>
              <span className="text-xs font-bold text-slate-700">Total Campaigns</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{stats.activeCount} active</span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900">{stats.totalCamps}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All created broadcast runs</div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 text-xs shrink-0 font-bold">
                👥
              </div>
              <span className="text-xs font-bold text-slate-700">Total Audience</span>
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900">{stats.totalRecipients.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Contacts mapped in lists</div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 text-xs shrink-0 font-bold">
                🚀
              </div>
              <span className="text-xs font-bold text-slate-700">Messages Sent</span>
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-emerald-600">{stats.totalSent.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched to Meta Cloud</div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 text-xs shrink-0 font-bold">
                ⚡
              </div>
              <span className="text-xs font-bold text-slate-700">Delivery Rate</span>
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900">{stats.successRate}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Average dispatch health</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            placeholder="Search campaigns by name, sender number, or template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Broadcast Types</option>
            <option value="MARKETING">📣 Marketing & Promo</option>
            <option value="UTILITY">📋 Operational & Utility</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="RUNNING">🔵 Running</option>
            <option value="COMPLETED">🟢 Completed</option>
            <option value="SCHEDULED">🟡 Scheduled</option>
            <option value="DRAFT">⚪ Draft</option>
            <option value="PAUSED">🟠 Paused</option>
            <option value="FAILED">🔴 Failed</option>
          </select>
        </div>
      </div>

      {/* Campaigns List Table */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Loader scale={0.95} color="#0f172a" />
          <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fetching campaigns and real-time delivery funnels...
          </p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl mb-4">
            📣
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">No Broadcast Campaigns Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            You haven't created any campaigns matching your criteria yet. Upload an Excel list and launch targeted promotional broadcasts or order updates!
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                resetWizard();
                setShowWizard(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
            >
              + Create First Campaign
            </button>
            <button
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
            >
              📥 Download Sample Excel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6 font-bold">Campaign Details</th>
                  <th className="py-4 px-6 font-bold">Service & Sender</th>
                  <th className="py-4 px-6 font-bold">Template</th>
                  <th className="py-4 px-6 font-bold">Delivery Progress</th>
                  <th className="py-4 px-6 font-bold">Status</th>
                  <th className="py-4 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map((camp) => {
                  const pct =
                    camp.totalRecipients > 0 ? Math.round((camp.sentCount / camp.totalRecipients) * 100) : 0;

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/60 transition">
                      {/* Name & Created */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-base">{camp.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Created {new Date(camp.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Service & Sender Number */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase mb-1.5 ${
                            camp.service === "MARKETING"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : camp.service === "UTILITY"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {camp.service}
                        </span>
                        <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                          <span>📱</span> {camp.senderPhone || camp.phoneId}
                        </div>
                      </td>

                      {/* Template */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-800 border border-slate-200">
                          {camp.templateName}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 uppercase font-semibold">
                          Language: {camp.templateLanguage}
                        </div>
                      </td>

                      {/* Progress Bar & Counts */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-900">
                            {camp.sentCount} / {camp.totalRecipients} sent
                          </span>
                          <span className="text-slate-500 font-mono">{pct}%</span>
                        </div>
                        <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              camp.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : camp.status === "RUNNING"
                                ? "bg-blue-500 animate-pulse"
                                : camp.status === "FAILED"
                                ? "bg-red-500"
                                : "bg-slate-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {camp.failedCount > 0 && (
                          <div className="text-[10px] text-red-600 font-bold mt-1">
                            ⚠️ {camp.failedCount} failed
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                            camp.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : camp.status === "RUNNING"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : camp.status === "SCHEDULED"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : camp.status === "PAUSED"
                              ? "bg-orange-50 text-orange-800 border-orange-200"
                              : camp.status === "FAILED"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              camp.status === "RUNNING"
                                ? "bg-blue-500 animate-ping"
                                : camp.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : "bg-current"
                            }`}
                          ></span>
                          {camp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {camp.status === "DRAFT" || camp.status === "SCHEDULED" ? (
                            <button
                              onClick={() => handleLaunchCampaign(camp)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1"
                            >
                              <span>🚀</span> Launch
                            </button>
                          ) : camp.status === "RUNNING" ? (
                            <button
                              onClick={() => handlePauseCampaign(camp)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1"
                            >
                              <span>⏸️</span> Pause
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleViewDetails(camp)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            title="View Audience Delivery Log"
                          >
                            <span>📊</span> Logs
                          </button>

                          <button
                            onClick={() => handleDeleteCampaign(camp)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-xs font-bold transition border border-transparent hover:border-red-200"
                            title="Delete Campaign"
                          >
                            🗑️
                          </button>
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

      {/* ========================================================
          CAMPAIGN BUILDER WIZARD MODAL (4 STEPS)
         ======================================================== */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 transform scale-100 max-h-[90vh] overflow-y-auto relative">
            {/* Header & Steps Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Step {wizardStep} of 4
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  {wizardStep === 1 && "Campaign Basics & Sender Routing"}
                  {wizardStep === 2 && "Select Template & Live Preview"}
                  {wizardStep === 3 && "Audience Upload & Smart Column Mapping"}
                  {wizardStep === 4 && "Review, Test Send & Launch"}
                </h2>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-4 gap-2 mb-8 text-center text-xs font-bold">
              <div
                onClick={() => setWizardStep(1)}
                className={`py-2 px-1 rounded-xl cursor-pointer transition border ${
                  wizardStep === 1
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                1. Basics
              </div>
              <div
                onClick={() => setWizardStep(2)}
                className={`py-2 px-1 rounded-xl cursor-pointer transition border ${
                  wizardStep === 2
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                2. Template
              </div>
              <div
                onClick={() => setWizardStep(3)}
                className={`py-2 px-1 rounded-xl cursor-pointer transition border ${
                  wizardStep === 3
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                3. Audience & Mapping
              </div>
              <div
                onClick={() => setWizardStep(4)}
                className={`py-2 px-1 rounded-xl cursor-pointer transition border ${
                  wizardStep === 4
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                4. Review & Launch
              </div>
            </div>

            {/* STEP 1: CAMPAIGN BASICS & ROUTING */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Diwali Festive Flash Sale 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">A clear internal name to identify your broadcast.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Service Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setService("MARKETING")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                        service === "MARKETING"
                          ? "border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-600/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">📣</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          ₹1.00 / msg
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">Marketing & Promo Broadcast</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Festive discounts, promotional offers, seasonal sales, and product launch announcements.
                      </div>
                    </div>

                    <div
                      onClick={() => setService("UTILITY")}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                        service === "UTILITY"
                          ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">📋</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          ₹0.50 / msg (50% Off)
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm">Operational & Utility Broadcast</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Invoices, fee due reminders, school/society notices, and service maintenance alerts.
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-100/80 border border-slate-200/80 rounded-xl p-3 mt-3 flex items-start gap-2.5 text-[11px] text-slate-600">
                    <span className="text-base shrink-0 mt-0.5">💡</span>
                    <span>
                      <b>Looking for OTP / Authentication?</b> OTP is a real-time, 1-to-1 security trigger and cannot be sent via bulk Excel campaigns. Dispatch OTPs programmatically using your secret keys under <a href="/dashboard/api-keys" className="font-bold text-slate-900 underline hover:text-emerald-700">API Keys & Gateway</a>.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Sender WhatsApp Phone Number <span className="text-red-500">*</span>
                  </label>
                  {phoneNumbers.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                      ⚠️ No phone numbers registered in your workspace yet. Please add a number under <b>Numbers & Routing</b> first.
                    </div>
                  ) : (
                    <select
                      value={selectedPhoneId}
                      onChange={(e) => setSelectedPhoneId(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {phoneNumbers.map((num) => {
                        const hasService = num.service?.includes(service);
                        return (
                          <option key={num.phoneId} value={num.phoneId}>
                            {num.displayPhone} {num.verifiedName ? `(${num.verifiedName})` : ""} - Services: [{num.service}]{" "}
                            {hasService ? "✓ Compatible" : "⚠️ Service Not Tagged"}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    Messages will be dispatched from this verified Meta WhatsApp Business number.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      if (!campaignName.trim()) {
                        showError("Please enter a campaign name.");
                        return;
                      }
                      if (!selectedPhoneId) {
                        showError("Please select a sender phone number.");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-sm"
                  >
                    Next: Choose Template →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: TEMPLATE SELECTION & LIVE PREVIEW */}
            {wizardStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Form: Select Template */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Meta Approved Template ({service}) <span className="text-red-500">*</span>
                    </label>
                    {filteredTemplatesForService.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                        ⚠️ No approved templates found for <b>{service}</b>. You can create and submit templates in the{" "}
                        <b>Template Studio</b> tab.
                      </div>
                    ) : (
                      <select
                        value={selectedTemplateName}
                        onChange={(e) => {
                          setSelectedTemplateName(e.target.value);
                          const tpl = templates.find((t) => t.name === e.target.value);
                          if (tpl) setTemplateLanguage(tpl.language || "en_US");
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {filteredTemplatesForService.map((tpl) => (
                          <option key={tpl.id || tpl.name} value={tpl.name}>
                            {tpl.name} ({tpl.language}) • APPROVED
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-slate-400 mt-1.5">
                      Meta WhatsApp only allows broadcast campaigns using pre-approved templates.
                    </p>
                  </div>

                  {/* Detected Variables notice */}
                  {detectedVariables.length > 0 ? (
                    <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs text-purple-900 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="font-extrabold flex items-center gap-1.5 text-purple-900">
                          <span>💡</span> Detected {detectedVariables.length} Dynamic Variables in Template
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200">
                          Auto-mapped to Excel
                        </span>
                      </div>
                      <p className="text-slate-600">
                        This template uses dynamic placeholders that will be extracted from your uploaded Excel sheet in the next step:
                      </p>
                      <div className="space-y-1.5">
                        {detectedVariables.map((v) => {
                          const info = getVariableInfo(v);
                          return (
                            <div key={v} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  {"{{" + v + "}}"}
                                </span>
                                <span className="font-bold text-slate-800 text-xs">
                                  {info.label}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Sample: <b className="text-slate-700">"{info.sample}"</b>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                      ✓ This template has no dynamic variables. All recipients will receive the standard message.
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedTemplateName) {
                          showError("Please select a template.");
                          return;
                        }
                        setWizardStep(3);
                      }}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-sm"
                    >
                      Next: Audience & Excel Mapping →
                    </button>
                  </div>
                </div>

                {/* Right Column: Realistic WhatsApp Phone Mockup */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Live WhatsApp Preview
                  </div>
                  <div className="w-[280px] bg-slate-800 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700 relative">
                    {/* Phone Notch */}
                    <div className="w-24 h-4 bg-slate-900 rounded-b-xl mx-auto mb-2"></div>

                    {/* WhatsApp Chat Screen */}
                    <div className="bg-[#E5DDD5] rounded-[24px] overflow-hidden min-h-[380px] flex flex-col justify-between p-3 border border-slate-300 relative text-xs">
                      {/* Chat Header */}
                      <div className="bg-[#075E54] text-white p-2.5 -mx-3 -mt-3 flex items-center justify-between mb-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] font-bold">
                            WA
                          </div>
                          <div>
                            <div className="font-bold leading-none flex items-center gap-1">
                              <span>Verified Sender</span>
                              <span className="text-[10px] text-emerald-300">✓</span>
                            </div>
                            <div className="text-[9px] text-emerald-100 opacity-80">Official Business Account</div>
                          </div>
                        </div>
                      </div>

                      {/* Chat Bubble */}
                      <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-100 space-y-2 max-w-[95%]">
                        {/* Header Component */}
                        {currentTemplate?.components?.find((c) => c.type === "HEADER") && (
                          <div className="font-bold text-slate-900 pb-1 border-b border-slate-100 text-[11px]">
                            {currentTemplate.components.find((c) => c.type === "HEADER")?.text || "Announcement"}
                          </div>
                        )}

                        {/* Body Component */}
                        <div className="text-slate-800 leading-relaxed text-[11px] whitespace-pre-wrap">
                          {renderedMessageText}
                        </div>

                        {/* Footer Component */}
                        {currentTemplate?.components?.find((c) => c.type === "FOOTER") && (
                          <div className="text-[9px] text-slate-400 pt-1">
                            {currentTemplate.components.find((c) => c.type === "FOOTER")?.text}
                          </div>
                        )}

                        {/* Timestamp & Double check */}
                        <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1">
                          <span>12:00 PM</span>
                          <span className="text-blue-500 font-bold">✓✓</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {currentTemplate?.components?.find((c) => c.type === "BUTTONS") && (
                        <div className="space-y-1.5 mt-2">
                          {currentTemplate.components
                            .find((c) => c.type === "BUTTONS")
                            ?.buttons?.map((btn, idx) => (
                              <div
                                key={idx}
                                className="bg-white text-blue-600 font-bold py-1.5 px-3 rounded-xl shadow-xs text-center border border-slate-200 text-[11px] flex items-center justify-center gap-1.5"
                              >
                                {btn.type === "URL" && <span>🔗</span>}
                                {btn.type === "OTP" && <span>📋</span>}
                                <span>{btn.text}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AUDIENCE UPLOAD & SMART COLUMN MAPPING */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                {/* Upload Excel or CSV */}
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 text-center transition bg-slate-50/50">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl mb-3">
                    📊
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">Upload Excel Spreadsheet or CSV</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Supported formats: <b>.xlsx, .xls, .csv</b>. Include columns for phone numbers, customer names, and any template parameters.
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer transition shadow-xs">
                      Choose File
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-xl transition"
                    >
                      📥 Download Sample Template
                    </button>
                  </div>

                  {excelFileName && (
                    <div className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200">
                      ✓ Selected: {excelFileName} ({parsedRows.length} rows detected)
                    </div>
                  )}
                </div>

                {/* Column Mapping Section */}
                {parsedRows.length > 0 && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">Smart Column Mapping</h4>
                        <p className="text-xs text-slate-500">Map your Excel columns to the recipient fields and template variables.</p>
                      </div>
                      <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                        {parsedRows.length} Total Contacts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Recipient Phone Column */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Recipient Phone Number Column <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={phoneColumn}
                          onChange={(e) => setPhoneColumn(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                        >
                          {excelColumns.map((c) => (
                            <option key={c} value={c}>
                              Column: {c}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">E.164 phone numbers with country code (e.g. 919876543210).</p>
                      </div>

                      {/* Recipient Name Column */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Recipient Name Column (Optional)
                        </label>
                        <select
                          value={nameColumn}
                          onChange={(e) => setNameColumn(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- None / Do Not Map --</option>
                          {excelColumns.map((c) => (
                            <option key={c} value={c}>
                              Column: {c}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">Used for reporting and logs.</p>
                      </div>
                    </div>

                    {/* Template Variable Mapping */}
                    {detectedVariables.length > 0 && (
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>✨</span> Map Template Variables to Excel Columns
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {detectedVariables.length} custom Excel field{detectedVariables.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {detectedVariables.map((v) => {
                            const info = getVariableInfo(v);
                            const isMapped = Boolean(variableMappings[v]);
                            const sampleFromRow = isMapped && parsedRows[0] ? parsedRows[0][variableMappings[v]] : null;

                            return (
                              <div
                                key={v}
                                className={`bg-white p-4 rounded-2xl border transition shadow-xs space-y-3 ${
                                  isMapped ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-extrabold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                      {"{{" + v + "}}"}
                                    </span>
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      {info.label}
                                    </span>
                                  </div>
                                  {isMapped ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                      <span>✓</span> Mapped
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                                      Needs Mapping
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                                    <span>Map to Excel Column:</span>
                                    <span className="text-[9px] font-normal text-slate-400">Sample: "{info.sample}"</span>
                                  </label>
                                  <select
                                    value={variableMappings[v] || ""}
                                    onChange={(e) =>
                                      setVariableMappings((prev) => ({
                                        ...prev,
                                        [v]: e.target.value
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                  >
                                    <option value="">-- Choose Excel Column --</option>
                                    {excelColumns.map((c) => (
                                      <option key={c} value={c}>
                                        Column: {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {sampleFromRow !== null && sampleFromRow !== undefined && (
                                  <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                                    <span className="text-slate-400 text-[10px]">Row 1 Value:</span>
                                    <span className="font-bold text-slate-900 truncate max-w-[150px]">{String(sampleFromRow)}</span>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    Static Fallback (If cell is empty):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={`e.g. ${info.sample}`}
                                    value={staticFallbacks[v] || ""}
                                    onChange={(e) =>
                                      setStaticFallbacks((prev) => ({
                                        ...prev,
                                        [v]: e.target.value
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Live Row Swapper & Preview */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Audience Sample Preview ({previewRowIndex + 1} of {Math.min(5, parsedRows.length)})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={previewRowIndex <= 0}
                            onClick={() => setPreviewRowIndex((prev) => Math.max(0, prev - 1))}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40"
                          >
                            ← Prev
                          </button>
                          <button
                            type="button"
                            disabled={previewRowIndex >= Math.min(4, parsedRows.length - 1)}
                            onClick={() => setPreviewRowIndex((prev) => Math.min(parsedRows.length - 1, prev + 1))}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40"
                          >
                            Next →
                          </button>
                        </div>
                      </div>

                      {/* Display Row Data */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs font-mono overflow-x-auto space-y-1">
                        <div className="text-slate-500 font-bold mb-1">
                          Phone: <span className="text-emerald-700 font-bold">{parsedRows[previewRowIndex]?.[phoneColumn] || "N/A"}</span>
                        </div>
                        {detectedVariables.map((v) => {
                          const col = variableMappings[v];
                          const val = col ? parsedRows[previewRowIndex]?.[col] : staticFallbacks[v];
                          return (
                            <div key={v} className="text-slate-600">
                              {"{{" + v + "}}"}: <span className="text-purple-700 font-bold">{val || "EMPTY"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (parsedRows.length === 0) {
                        showError("Please upload an Excel or CSV file first.");
                        return;
                      }
                      if (!phoneColumn) {
                        showError("Please map the phone number column.");
                        return;
                      }
                      setWizardStep(4);
                    }}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-sm"
                  >
                    Next: Review & Launch →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW, TEST SEND & LAUNCH */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 divide-y divide-slate-200 text-sm">
                  <div className="pb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Campaign Title</span>
                    <span className="font-extrabold text-slate-900">{campaignName}</span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Service Category</span>
                    <span className="font-extrabold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                      {service}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Sender Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {phoneNumbers.find((n) => n.phoneId === selectedPhoneId)?.displayPhone || selectedPhoneId}
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Selected Template</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedTemplateName} ({templateLanguage})
                    </span>
                  </div>

                  <div className="py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Audience Size</span>
                    <span className="font-black text-emerald-600 text-base">{parsedRows.length.toLocaleString()} Contacts</span>
                  </div>
                </div>

                {/* Scheduling & Rate Limiting Settings */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Dispatch Configuration
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Rate Limiting */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Throttle Speed (Safety Rate-Limit)
                      </label>
                      <select
                        value={sendRate}
                        onChange={(e) => setSendRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
                      >
                        <option value={5}>5 messages / sec (Maximum Safety)</option>
                        <option value={10}>10 messages / sec (Recommended)</option>
                        <option value={20}>20 messages / sec (High Volume)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Prevents Meta Graph API rate-limiting.</p>
                    </div>

                    {/* Schedule Time */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Send Time</label>
                      <div className="flex items-center gap-3 mb-2">
                        <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={!isScheduled}
                            onChange={() => setIsScheduled(false)}
                          />
                          <span>Instant Launch</span>
                        </label>
                        <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={isScheduled}
                            onChange={() => setIsScheduled(true)}
                          />
                          <span>Schedule for Later</span>
                        </label>
                      </div>

                      {isScheduled && (
                        <input
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Test Send Section */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <span>🧪</span> Send a Real Test WhatsApp Message
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Verify template appearance on your personal phone before starting the full broadcast.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="e.g. 919876543210"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      className="px-3 py-2 border border-emerald-300 rounded-xl text-xs font-mono w-44"
                    />
                    <button
                      type="button"
                      disabled={isSendingTest}
                      onClick={handleSendTestMessage}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs disabled:opacity-50"
                    >
                      {isSendingTest ? "Sending..." : "Send Test"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCreateCampaign}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <span>🚀</span> Save & Create Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          AUDIENCE & DELIVERY FUNNEL LOGS DRAWER / MODAL
         ======================================================== */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 transform scale-100 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                  {selectedCampaign.service}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {selectedCampaign.name} - Audience Delivery Funnel
                </h3>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Campaign Summary & Export */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Audience</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{selectedCampaign.totalRecipients}</p>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Sent Successfully</span>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{selectedCampaign.sentCount}</p>
              </div>

              <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center">
                <span className="text-[10px] font-bold text-red-600 uppercase">Failed Dispatches</span>
                <p className="text-xl font-black text-red-700 mt-0.5">{selectedCampaign.failedCount}</p>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Status</span>
                <p className="text-sm font-extrabold text-blue-800 mt-1">{selectedCampaign.status}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Audience Contact Logs (Displaying up to 500 records)
              </h4>
              <button
                onClick={handleExportRecipientsCsv}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>📥</span> Export to Excel
              </button>
            </div>

            {/* Recipients Table */}
            {loadingRecipients ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <Loader scale={0.9} color="#0f172a" />
                <p className="mt-3 text-xs font-bold text-slate-500">Loading recipient delivery records...</p>
              </div>
            ) : recipientsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No recipient records logged yet.</div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Recipient Phone</th>
                      <th className="py-2.5 px-4">Recipient Name</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Meta Message ID</th>
                      <th className="py-2.5 px-4">Error / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {recipientsList.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-800">+{r.phone}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-700">{r.name || "-"}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.status === "sent" || r.status === "delivered" || r.status === "read"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">{r.metaMessageId || "-"}</td>
                        <td className="py-2.5 px-4 text-red-600 font-sans text-[11px]">{r.errorMessage || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
