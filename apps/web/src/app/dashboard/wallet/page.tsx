"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import {
  WalletIcon,
  RefreshIcon,
  ShieldCheckIcon,
  AuditLogsIcon,
  PricingAdminIcon,
  SparklesIcon
} from "@/components/Icons";

interface RateRule {
  id: string;
  country: string;
  isoCode: string;
  category: string;
  basePrice: number;
  providerCost: number;
  providerCurrency: string;
  providerCostInr: number;
  totalCostInr: number;
  actualMarginPercent: number;
  status: string;
  lossRiskStatus: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  baseAmount: number;
  gstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  paymentReference: string;
  customerGstin?: string;
  customerBusinessName?: string;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  entryType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  referenceType: string;
  referenceId: string;
  description: string;
  reason?: string;
}

interface BillingProfile {
  legalBusinessName: string;
  gstin: string;
  billingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  taxExempt: boolean;
}

interface SubscriptionInfo {
  plan: string;
  planExpiresAt?: string;
  daysRemaining: number;
  isExpired: boolean;
  seatsAllowed: number;
  extraSeats: number;
  totalSeats: number;
  usedSeats: number;
  obaIncluded: boolean;
}

export default function WalletPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [activeTab, setActiveTab] = useState<"overview" | "rates" | "invoices" | "ledger">("overview");

  // Wallet State
  const [balance, setBalance] = useState<number>(0);
  const [reservedBalance, setReservedBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(1000); // Base amount in INR

  // Subscription State
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [extraSeatCount, setExtraSeatCount] = useState<number>(1);
  const [subscribing, setSubscribing] = useState(false);

  // Data lists
  const [rates, setRates] = useState<RateRule[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [billingProfile, setBillingProfile] = useState<BillingProfile>({
    legalBusinessName: "",
    gstin: "",
    billingAddress: "",
    city: "",
    state: "Maharashtra",
    stateCode: "27",
    country: "India",
    taxExempt: false
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;
  const orgId = typeof window !== "undefined"
    ? (localStorage.getItem("organizationId") || user?.organizationId || user?.orgId || user?.projects?.[0]?.organizationId || "")
    : "";

  // Real-time GST calculation
  const gstRate = 18;
  const isOutOfState = billingProfile.stateCode !== "27";
  const taxAmount = Math.round((amount * gstRate) / 100 * 100) / 100;
  const totalPayable = Math.round((amount + taxAmount) * 100) / 100;

  const loadWalletData = async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`${getApiUrl()}/v1/wallet/${orgId}`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setBalance(Number(data.wallet.balance || 0));
        setReservedBalance(Number(data.wallet.reservedBalance || 0));
        setAvailableBalance(Number(data.wallet.availableBalance || 0));

        if (data.wallet.ledgerEntries) {
          setLedgerEntries(data.wallet.ledgerEntries);
        }
        if (data.wallet.billingProfile) {
          setBillingProfile(data.wallet.billingProfile);
        }
        if (data.wallet.invoices) {
          setInvoices(data.wallet.invoices);
        }
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      }

      // Load official rate rules
      const rateRes = await fetch(`${getApiUrl()}/v1/billing/pricing-rules`);
      const rateData = await rateRes.json();
      if (rateData.success && rateData.rates) {
        setRates(rateData.rates);
      }
    } catch (e) {
      console.error("Failed to load wallet data", e);
    }
  };

  useEffect(() => {
    document.title = "Wallet & Billing Engine | Digital Beings";
    loadWalletData();
  }, [orgId]);

  const handleSaveBillingProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiUrl()}/v1/billing/profile/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingProfile)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Billing profile saved successfully. Your next tax invoice will include these details.", "Profile Updated");
        setShowProfileModal(false);
        loadWalletData();
      } else {
        showError(data.error || "Failed to update profile", "Error");
      }
    } catch (err: any) {
      showError(err.message, "Network Error");
    }
  };

  const handleTopUp = async () => {
    if (amount < 100) return showWarning("Minimum wallet recharge base amount is ₹100.", "Minimum Top-up");

    setLoading(true);
    try {
      if (typeof (window as any).Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
          if (existingScript) {
            existingScript.addEventListener("load", () => resolve());
            existingScript.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout SDK")));
            if ((window as any).Razorpay) return resolve();
          } else {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Unable to connect to Razorpay payment gateway"));
            document.body.appendChild(script);
          }
        });
      }

      // Create Order with base amount + additional GST calculation
      const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: Math.round(amount), 
          organizationId: orgId,
          customerBilling: billingProfile 
        })
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Failed to initiate payment order");

      const options = {
        key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
        amount: data.amount, // Paise (Base + 18% GST)
        currency: "INR",
        name: "Digital Beings Infotech",
        description: `Credits: ₹${amount} + 18% GST (Total: ₹${data.orderBreakdown?.totalPayableAmount || totalPayable})`,
        image: "/icon.png",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${getApiUrl()}/v1/billing/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: amount,
                organizationId: orgId,
                customerBilling: billingProfile
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              showSuccess(
                `Payment received!\n\nSpendable Credits Added: ₹${amount.toFixed(2)}\nTax Invoice Generated: ${verifyData.invoice?.invoiceNumber || "Available in Invoices tab"}\nPayment ID: ${response.razorpay_payment_id}`,
                "Recharge Successful"
              );
            }
          } catch (vErr) {
            showSuccess(`Payment received! ID: ${response.razorpay_payment_id}`, "Payment Completed");
          } finally {
            loadWalletData();
          }
        },
        prefill: {
          name: billingProfile.legalBusinessName || user?.name || "Digital Beings Client",
          email: user?.email || "billing@digitalbeings.in",
          contact: ""
        },
        theme: { color: "#059669" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        showError(response.error?.description || "Payment was cancelled or declined.", "Payment Failed");
      });
      rzp.open();

    } catch (err: any) {
      showError("Failed to initiate checkout: " + err.message, "Payment Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSubscription = async (planId: "TRIAL" | "BASIC" | "PROFESSIONAL") => {
    setSubscribing(true);
    try {
      if (typeof (window as any).Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to connect to Razorpay payment gateway"));
          document.body.appendChild(script);
        });
      }

      const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUBSCRIPTION",
          planId,
          organizationId: orgId,
          customerBilling: billingProfile
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create subscription order");

      const options = {
        key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
        amount: data.amount,
        currency: "INR",
        name: "Digital Beings Infotech",
        description: `${planId} Plan (Base ₹${data.baseAmount} + 18% GST)`,
        image: "/icon.png",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${getApiUrl()}/v1/billing/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                type: "SUBSCRIPTION",
                planId,
                baseAmount: data.baseAmount,
                organizationId: orgId,
                customerBilling: billingProfile
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              showSuccess(
                `Subscribed to ${planId} Plan successfully!\nInvoice Generated: ${verifyData.invoice?.invoiceNumber || "In Invoices tab"}\nPayment ID: ${response.razorpay_payment_id}`,
                "Subscription Active"
              );
              setShowSubscriptionModal(false);
            }
          } catch (vErr) {
            showSuccess(`Payment verified! ID: ${response.razorpay_payment_id}`, "Subscription Active");
          } finally {
            loadWalletData();
          }
        },
        prefill: {
          name: billingProfile.legalBusinessName || user?.name || "Digital Beings Client",
          email: user?.email || "billing@digitalbeings.in",
          contact: ""
        },
        theme: { color: "#154336" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        showError(response.error?.description || "Payment was cancelled or declined.", "Payment Failed");
      });
      rzp.open();
    } catch (err: any) {
      showError("Failed to initiate subscription: " + err.message, "Payment Error");
    } finally {
      setSubscribing(false);
    }
  };

  const handlePurchaseExtraSeats = async (count: number) => {
    setSubscribing(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ADDON_SEAT",
          extraSeatsCount: count,
          organizationId: orgId,
          customerBilling: billingProfile
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create seat order");

      const options = {
        key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
        amount: data.amount,
        currency: "INR",
        name: "Digital Beings Infotech",
        description: `Add-on: ${count} Additional Team Seat(s) (₹${data.baseAmount} + 18% GST)`,
        image: "/icon.png",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            await fetch(`${getApiUrl()}/v1/billing/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                type: "ADDON_SEAT",
                extraSeatsCount: count,
                baseAmount: data.baseAmount,
                organizationId: orgId,
                customerBilling: billingProfile
              })
            });
            showSuccess(`Added ${count} team seat(s) successfully!`, "Seats Added");
            setShowSeatModal(false);
          } finally {
            loadWalletData();
          }
        },
        theme: { color: "#154336" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showError(err.message, "Payment Error");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Top Control Bar with 2D Vector Icons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/90">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-emerald-700 shrink-0 font-bold shadow-2xs">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Prepaid Balance: ₹{availableBalance.toFixed(2)}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Atomic ledger billing with GST compliance &amp; margin guard
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowProfileModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>GST Profile</span>
            </button>
            <button
              onClick={loadWalletData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <RefreshIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation with 2D Icons */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 inline-flex items-center gap-1.5 shadow-2xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <WalletIcon className="w-4 h-4" />
            <span>Wallet &amp; Recharge</span>
          </button>
          <button
            onClick={() => setActiveTab("rates")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "rates"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <PricingAdminIcon className="w-4 h-4" />
            <span>Official Rate Card ({rates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "invoices"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>GST Tax Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "ledger"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <AuditLogsIcon className="w-4 h-4" />
            <span>Ledger Audit Trail ({ledgerEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & RECHARGE */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Active Subscription & Seat Status Banner */}
            <div className="bg-[#154336] rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border-2 border-emerald-500/60 relative overflow-hidden">
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                    ACTIVE SUBSCRIPTION
                  </span>
                  <span className="text-xs text-emerald-200 font-semibold">
                    {subscription?.isExpired ? "Plan Expired" : `${subscription?.daysRemaining ?? 30} days remaining`}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {subscription?.plan === "TRIAL"
                      ? "Starter Trial (₹500 / 30 Days)"
                      : subscription?.plan === "PROFESSIONAL"
                      ? "Professional Plan (₹2,500 / month)"
                      : subscription?.plan === "ENTERPRISE"
                      ? "Enterprise Custom Plan"
                      : "Basic Plan (₹1,000 / month)"}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-emerald-100 font-medium pt-1">
                  <span className="flex items-center gap-1.5">
                    👥 <strong>{subscription?.usedSeats || 1} / {subscription?.totalSeats || 4} Seats Used</strong> ({subscription?.seatsAllowed || 4} included {subscription?.extraSeats ? `+ ${subscription.extraSeats} extra` : ""})
                  </span>
                  <span className="flex items-center gap-1.5">
                    🟢 Green Tick (OBA): {subscription?.obaIncluded ? <span className="text-emerald-300 font-bold">✓ Included Free</span> : <span className="text-emerald-200">₹999 Add-on</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    ⚡ WhatsApp OTP: <span className="text-emerald-300 font-bold">₹0.20/msg</span> · Utility: <span className="text-emerald-300 font-bold">₹0.18/msg</span> · Marketing: <span className="text-emerald-300 font-bold">₹1.15/msg</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 flex-wrap z-10">
                <button
                  onClick={() => setShowSeatModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-600 transition cursor-pointer"
                >
                  + Add Team Seats (₹500/mo)
                </button>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-[#154336] font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  Upgrade / Switch Plan ➔
                </button>
              </div>
            </div>

            {/* Balance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Available Balance */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Spendable Available Balance</span>
                    <span className="bg-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Real-time</span>
                  </div>
                  <div className="text-4xl font-black">₹{availableBalance.toFixed(2)}</div>
                  <p className="text-xs text-emerald-100 mt-2">
                    Ready for message dispatch (~{Math.floor(availableBalance / 0.20).toLocaleString()} India OTPs)
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-emerald-500/30 text-[11px] text-emerald-200">
                  Total Credits: ₹{balance.toFixed(2)}
                </div>
              </div>

              {/* Reserved In-Flight */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In-Flight Reserved Funds</span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">15-min TTL</span>
                  </div>
                  <div className="text-3xl font-extrabold text-amber-600">₹{reservedBalance.toFixed(2)}</div>
                  <p className="text-xs text-slate-500 mt-2">
                    Held atomically during Meta dispatch. Auto-released if message fails.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Prevents negative balance & race conditions
                </div>
              </div>

              {/* GST Billing Profile Summary */}
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GST Registration</span>
                    <button 
                      onClick={() => setShowProfileModal(true)} 
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-base font-bold text-slate-900 truncate">
                    {billingProfile.legalBusinessName || "Personal / Unregistered"}
                  </div>
                  <p className="text-xs font-mono text-slate-600 mt-1">
                    GSTIN: {billingProfile.gstin || "Not provided (Consumer)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Place of Supply: State Code {billingProfile.stateCode || "27"} ({billingProfile.state || "Maharashtra"})
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Tax Treatment: {isOutOfState ? "Inter-state IGST (18%)" : "Intra-state CGST (9%) + SGST (9%)"}
                </div>
              </div>
            </div>

            {/* Recharge & GST Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Recharge Amount Selection */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Add Wallet Balance</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Recharge your messaging credit. Base amount is credited 100% to your spendable balance. GST is invoiced separately.
                </p>

                {/* Preset Buttons */}
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Credit Amount (Excl. GST)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[500, 1000, 2500, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2.5 text-xs font-extrabold rounded-xl border transition ${
                        amount === val
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ₹{val.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="mb-6">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Or Enter Custom Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                      min="100"
                      step="100"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 font-extrabold text-slate-900 text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1 mb-6">
                  <div className="font-bold text-slate-800">🔒 Razorpay Tier-1 Payment Security</div>
                  <div>UPI, Net Banking, Corporate Cards & Business Credit supported. Wallet credit is instant upon gateway verification.</div>
                </div>

                <button
                  onClick={handleTopUp}
                  disabled={loading || amount < 100}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-4 rounded-xl transition shadow hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                >
                  {loading ? (
                    <span>Opening Checkout...</span>
                  ) : (
                    <>
                      <span>⚡ Pay ₹{totalPayable.toFixed(2)} & Recharge Wallet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Transparent Tax Calculation Breakdown */}
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Compliant Tax Breakdown
                    </span>
                    <span className="text-xs text-slate-400">SAC Code: 998313</span>
                  </div>

                  <h4 className="text-xl font-black text-white mb-4">Billing Computation</h4>

                  <div className="space-y-3 divide-y divide-slate-800 text-sm">
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-300">Spendable Message Credits</span>
                      <span className="font-mono font-bold text-emerald-400">₹{amount.toFixed(2)}</span>
                    </div>

                    {!isOutOfState ? (
                      <>
                        <div className="flex justify-between pt-3">
                          <span className="text-slate-400">CGST (9.0%)</span>
                          <span className="font-mono text-slate-300">₹{(taxAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-3">
                          <span className="text-slate-400">SGST (9.0%)</span>
                          <span className="font-mono text-slate-300">₹{(taxAmount / 2).toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between pt-3">
                        <span className="text-slate-400">IGST (18.0%)</span>
                        <span className="font-mono text-slate-300">₹{taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-4 text-base font-black">
                      <span className="text-white">Total Payable at Gateway</span>
                      <span className="font-mono text-white text-lg">₹{totalPayable.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>✓ GST Tax Invoice generated immediately under GSTIN: 27AABCU9603R1ZM</div>
                  <div>✓ If you have a GSTIN, full Input Tax Credit (ITC) can be claimed.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE RATE CARD */}
        {activeTab === "rates" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Wholesale Rate Card</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configured, database-backed Meta WhatsApp pass-through rates with built-in margin protection.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Live Database Rates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Meta Provider Cost</th>
                    <th className="py-3 px-4">Digital Beings Retail Price</th>
                    <th className="py-3 px-4">Gross Margin</th>
                    <th className="py-3 px-4">Safety Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {r.country} <span className="text-xs font-mono text-slate-400">({r.isoCode})</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        {r.category === "AUTHENTICATION" ? "🔐 Authentication / OTP" :
                         r.category === "UTILITY" ? "⚡ Utility / Alerts" :
                         "📢 Marketing / Broadcast"}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 text-xs">
                        {r.providerCurrency === "USD" ? `$${r.providerCost}` : `₹${r.providerCost}`} 
                        <span className="text-[10px] text-slate-400 ml-1">(~₹{r.providerCostInr.toFixed(4)})</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-emerald-600 text-base">
                        ₹{r.basePrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600 text-xs">
                        {r.actualMarginPercent.toFixed(1)}%
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.lossRiskStatus === "SAFE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {r.lossRiskStatus === "SAFE" ? "SAFE (Pass)" : "REVIEW"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>All message prices are displayed excluding GST. Applicable GST is charged at recharge time.</span>
              <span className="font-mono text-[11px] text-slate-400">Unconfigured countries are blocked to prevent unbilled dispatches.</span>
            </div>
          </div>
        )}

        {/* TAB 3: GST TAX INVOICES */}
        {activeTab === "invoices" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Tax Invoices</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sequential, audit-ready GST tax invoices for wallet recharge transactions.
                </p>
              </div>
              <span className="text-xs text-slate-400">Issuer: Digital Beings Infotech Pvt Ltd</span>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No invoices generated yet. Recharge your wallet to generate a compliant tax invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Base Amount</th>
                      <th className="py-3 px-4">GST Tax</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Payment Ref</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                          ₹{Number(inv.baseAmount).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600">
                          ₹{Number(inv.totalTaxAmount).toFixed(2)}
                          <span className="text-[10px] text-slate-400 ml-1">({inv.gstRatePercent}%)</span>
                        </td>
                        <td className="py-4 px-4 font-mono font-extrabold text-emerald-600">
                          ₹{Number(inv.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-400">
                          {inv.paymentReference}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                          >
                            View Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: IMMUTABLE DOUBLE-ENTRY LEDGER */}
        {activeTab === "ledger" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Immutable Financial Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only audit trail. Every message charge, reservation, recharge, and adjustment is recorded with balance snapshots.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                🔒 Cryptographic Integrity
              </span>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No ledger records found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Balance After</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {ledgerEntries.map((le) => (
                      <tr key={le.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {new Date(le.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            le.entryType === "CREDIT_RECHARGE" ? "bg-emerald-100 text-emerald-800" :
                            le.entryType === "DEBIT_DISPATCH" ? "bg-red-100 text-red-800" :
                            le.entryType === "REFUND" ? "bg-blue-100 text-blue-800" :
                            le.entryType === "CREDIT_RELEASE" ? "bg-slate-100 text-slate-700" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {le.entryType}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 font-mono font-bold ${
                          le.amount > 0 ? "text-emerald-600" : le.amount < 0 ? "text-red-600" : "text-slate-500"
                        }`}>
                          {le.amount > 0 ? `+₹${le.amount.toFixed(2)}` : le.amount < 0 ? `-₹${Math.abs(le.amount).toFixed(2)}` : "₹0.00"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          ₹{le.balanceAfter.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400 truncate max-w-[140px]">
                          {le.referenceId || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {le.description}
                          {le.reason && <div className="text-[10px] text-slate-400 italic">Reason: {le.reason}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Customer Billing Profile */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Customer Billing Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveBillingProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Legal Entity / Business Name</label>
                <input
                  type="text"
                  value={billingProfile.legalBusinessName}
                  onChange={(e) => setBillingProfile({ ...billingProfile, legalBusinessName: e.target.value })}
                  placeholder="e.g. Acme Technologies Private Limited"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN (15 Characters)</label>
                <input
                  type="text"
                  value={billingProfile.gstin}
                  onChange={(e) => setBillingProfile({ ...billingProfile, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  maxLength={15}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={billingProfile.state}
                    onChange={(e) => setBillingProfile({ ...billingProfile, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GST State Code</label>
                  <input
                    type="text"
                    value={billingProfile.stateCode}
                    onChange={(e) => setBillingProfile({ ...billingProfile, stateCode: e.target.value })}
                    placeholder="27"
                    maxLength={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Registered Address</label>
                <textarea
                  value={billingProfile.billingAddress}
                  onChange={(e) => setBillingProfile({ ...billingProfile, billingAddress: e.target.value })}
                  placeholder="Building, Street, Area, City, Pincode"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invoice Details View */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Tax Invoice</h3>
                <p className="text-xs font-mono text-emerald-600 font-bold">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700 text-2xl font-bold">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Supplier (Billed From)</div>
                <div className="font-extrabold text-slate-900">Digital Beings Infotech Pvt Ltd</div>
                <div className="text-slate-600 mt-0.5">GSTIN: 27AABCU9603R1ZM</div>
                <div className="text-slate-500 mt-0.5">Bandra Kurla Complex, Mumbai, Maharashtra</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Recipient (Billed To)</div>
                <div className="font-extrabold text-slate-900">{selectedInvoice.customerBusinessName || "Individual Customer"}</div>
                <div className="text-slate-600 mt-0.5">GSTIN: {selectedInvoice.customerGstin || "Unregistered"}</div>
                <div className="text-slate-500 mt-0.5">Payment Ref: {selectedInvoice.paymentReference}</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">SAC</th>
                    <th className="py-2.5 px-3 text-right">Taxable Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      WhatsApp Messaging Service Prepaid Recharge
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">998313</td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-slate-900">
                      ₹{Number(selectedInvoice.baseAmount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-50 p-3 space-y-1.5 border-t border-slate-200 text-xs">
                {selectedInvoice.cgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%)</span>
                    <span className="font-mono">₹{Number(selectedInvoice.cgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoice.sgstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%)</span>
                    <span className="font-mono">₹{Number(selectedInvoice.sgstAmount).toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoice.igstAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (18%)</span>
                    <span className="font-mono">₹{Number(selectedInvoice.igstAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200 text-sm">
                  <span>Total Amount Paid</span>
                  <span className="font-mono text-emerald-600">₹{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>🖨️</span> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN UPGRADE & SUBSCRIPTION MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-150">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Select Plan
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Choose Your Digital Beings Subscription
                </h3>
                <p className="text-xs text-slate-500">
                  Predictable flat dashboard pricing. Direct Meta wholesale rates for message fuel.
                </p>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Plan 1: Starter Trial */}
              <div
                onClick={() => handlePurchaseSubscription("TRIAL")}
                className="border-2 rounded-2xl p-5 space-y-4 hover:border-emerald-500 transition cursor-pointer flex flex-col justify-between bg-white border-slate-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Starter Trial</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700">30 Days</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-slate-900">₹500</span>
                    <span className="text-xs text-slate-500"> + 18% GST (₹590)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    1 User (Owner profile only). Ideal for onboarding, verifying numbers, and testing OTP APIs.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> 1 Seat Included (Owner only)</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Full OTP API &amp; Webhooks</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Utility &amp; Order Messages</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Basic Campaign Broadcasts</li>
                    <li className="flex items-center gap-1.5 text-slate-400">· OBA Green Tick (₹999 add-on)</li>
                  </ul>
                </div>
                <button
                  disabled={subscribing}
                  className="w-full py-2.5 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-bold text-xs transition"
                >
                  {subscribing ? "Opening Checkout..." : "Start Trial (₹590)"}
                </button>
              </div>

              {/* Plan 2: Basic Business */}
              <div
                onClick={() => handlePurchaseSubscription("BASIC")}
                className="border-2 rounded-2xl p-5 space-y-4 hover:border-emerald-500 transition cursor-pointer flex flex-col justify-between bg-white border-slate-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Basic Plan</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Popular</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-slate-900">₹1,000</span>
                    <span className="text-xs text-slate-500"> / mo + GST (₹1,180)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    For growing teams needing WhatsApp OTP, order confirmations, and customer support inbox.
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-1.5 font-bold text-slate-800"><span className="text-emerald-600">✓</span> 4 Seats (1 Owner + 3 Support)</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Extra seats at ₹500/mo each</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> WhatsApp OTP &amp; Utility APIs</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Template Approval Dashboard</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Live Chat Team Inbox &amp; Routing</li>
                    <li className="flex items-center gap-1.5 text-slate-400">· OBA Green Tick (₹999 add-on)</li>
                  </ul>
                </div>
                <button
                  disabled={subscribing}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  {subscribing ? "Opening Checkout..." : "Select Basic (₹1,180)"}
                </button>
              </div>

              {/* Plan 3: Professional Scale */}
              <div
                onClick={() => handlePurchaseSubscription("PROFESSIONAL")}
                className="border-2 rounded-2xl p-5 space-y-4 hover:border-emerald-400 transition cursor-pointer flex flex-col justify-between bg-[#154336] text-white border-emerald-400 shadow-lg relative"
              >
                <div className="absolute -top-3 right-4 bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  RECOMMENDED
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 uppercase">Professional</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 border border-emerald-700">All-Inclusive</span>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-white">₹2,500</span>
                    <span className="text-xs text-emerald-200"> / mo + GST (₹2,950)</span>
                  </div>
                  <p className="text-xs text-emerald-100">
                    For scaling brands using e-commerce automations, AI auto-replies, and complex logic funnels.
                  </p>
                  <ul className="space-y-1.5 text-xs text-emerald-50 pt-2 border-t border-emerald-800/80">
                    <li className="flex items-center gap-1.5 font-bold text-white"><span className="text-emerald-400">✓</span> 6 Seats (1 Owner + 5 Support)</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> Extra seats at ₹500/mo each</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> E-Commerce API (Shopify, Woo, Custom)</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> AI Assistant &amp; Smart Auto-Replies</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> Complex Logic Campaigns (Read-Not-Replied)</li>
                    <li className="flex items-center gap-1.5 font-bold text-emerald-300"><span className="text-emerald-400">✓</span> FREE Official Green Tick Verification</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> Priority Meta API Throughput</li>
                  </ul>
                </div>
                <button
                  disabled={subscribing}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
                >
                  {subscribing ? "Opening Checkout..." : "Upgrade to Pro (₹2,950)"}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <span>Looking for high-throughput enterprise routing or 50+ seats?</span>
              <a
                href="mailto:support@digitalbeings.in?subject=Enterprise%20WhatsApp%20Inquiry"
                className="font-bold text-emerald-700 hover:underline"
              >
                Contact Enterprise Sales ➔
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXTRA TEAM SEATS MODAL */}
      {showSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Team Add-on
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Add Additional Team Seats
                </h3>
              </div>
              <button
                onClick={() => setShowSeatModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Add support profiles, sales agents, or team managers to collaborate in the WhatsApp Team Inbox.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Number of Additional Seats:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExtraSeatCount(Math.max(1, extraSeatCount - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-base text-slate-900">
                      {extraSeatCount}
                    </span>
                    <button
                      onClick={() => setExtraSeatCount(extraSeatCount + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Seat Fee ({extraSeatCount} × ₹500/mo)</span>
                    <span className="font-mono font-bold text-slate-900">₹{(extraSeatCount * 500).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%)</span>
                    <span className="font-mono text-slate-600">₹{(extraSeatCount * 500 * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                    <span>Total Monthly Amount</span>
                    <span className="font-mono text-emerald-600">₹{(extraSeatCount * 590).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePurchaseExtraSeats(extraSeatCount)}
              disabled={subscribing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
            >
              {subscribing ? "Opening Checkout..." : `Purchase ${extraSeatCount} Seat(s) via Razorpay (₹${(extraSeatCount * 590).toFixed(2)})`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
