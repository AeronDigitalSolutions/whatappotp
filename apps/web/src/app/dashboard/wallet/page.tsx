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
  isActivated?: boolean;
  isDemo?: boolean;
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

  // Wallet Balance State
  const [balance, setBalance] = useState<number>(0);
  const [reservedBalance, setReservedBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  // Modals visibility state (One at a time)
  const [showRechargeModal, setShowRechargeModal] = useState<boolean>(false);
  const [showSeatModal, setShowSeatModal] = useState<boolean>(false);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Cart Items State (Starts empty until user explicitly saves an option)
  const [rechargeInCart, setRechargeInCart] = useState<boolean>(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [rechargeCustomInput, setRechargeCustomInput] = useState<string>("1000");

  const [seatsInCart, setSeatsInCart] = useState<boolean>(false);
  const [extraSeatsCount, setExtraSeatsCount] = useState<number>(1);

  const [planInCart, setPlanInCart] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"TRIAL" | "BASIC" | "PROFESSIONAL">("BASIC");

  const [processingPayment, setProcessingPayment] = useState<boolean>(false);

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

  const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;
  const orgId = typeof window !== "undefined"
    ? (localStorage.getItem("organizationId") || user?.organizationId || user?.orgId || user?.projects?.[0]?.organizationId || "")
    : "";

  // Pricing calculations
  const planPriceMap: Record<string, number> = {
    TRIAL: 500,
    BASIC: 1000,
    PROFESSIONAL: 2500
  };

  const currentRechargeBase = rechargeInCart ? (rechargeAmount >= 100 ? rechargeAmount : 0) : 0;
  const currentSeatsBase = seatsInCart ? (Math.max(1, extraSeatsCount) * 500) : 0;
  const currentPlanBase = planInCart ? (planPriceMap[selectedPlanId] || 1000) : 0;

  const totalBaseAmount = currentRechargeBase + currentSeatsBase + currentPlanBase;
  const gstRate = 18;
  const isOutOfState = billingProfile.stateCode !== "27";
  const taxAmount = Math.round((totalBaseAmount * gstRate) / 100 * 100) / 100;
  const totalPayable = Math.round((totalBaseAmount + taxAmount) * 100) / 100;
  const hasItemsInCart = totalBaseAmount > 0;
  const cartItemCount = (rechargeInCart && currentRechargeBase > 0 ? 1 : 0) + (seatsInCart && currentSeatsBase > 0 ? 1 : 0) + (planInCart && currentPlanBase > 0 ? 1 : 0);

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

  const ensureRazorpayLoaded = async () => {
    if (typeof (window as any).Razorpay !== "undefined") return;
    return new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        if ((window as any).Razorpay) return resolve();
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout SDK")));
      } else {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to connect to Razorpay payment gateway"));
        document.body.appendChild(script);
      }
    });
  };

  const handleCombinedCheckout = async () => {
    if (!hasItemsInCart || totalBaseAmount <= 0) {
      showWarning("Your cart is currently empty. Please select an option to add to cart first.", "Cart Empty");
      return;
    }

    if (rechargeInCart && currentRechargeBase < 100) {
      showWarning("Minimum wallet recharge base amount is ₹100.", "Minimum Top-up");
      return;
    }

    // Subscription requirement check
    if (rechargeInCart && currentRechargeBase > 0 && !subscription?.isActivated && !planInCart) {
      showWarning(
        "To recharge message fuel, you must have an active subscription or trial. Please select a plan to bundle with your recharge.",
        "Subscription Required"
      );
      setShowPlanModal(true);
      return;
    }

    setProcessingPayment(true);
    try {
      await ensureRazorpayLoaded();

      // Initiate bundled order on backend
      const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BUNDLE",
          organizationId: orgId,
          rechargeAmount: rechargeInCart ? currentRechargeBase : 0,
          extraSeatsCount: seatsInCart ? extraSeatsCount : 0,
          planId: planInCart ? selectedPlanId : undefined,
          customerBilling: billingProfile
        })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      const options = {
        key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
        amount: data.amount, // in paise (Base + 18% GST)
        currency: "INR",
        name: "Digital Beings Infotech",
        description: `Order Total: ₹${data.totalAmount || totalPayable} (Base ₹${data.baseAmount} + 18% GST)`,
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
                type: "BUNDLE",
                organizationId: orgId,
                rechargeAmount: rechargeInCart ? currentRechargeBase : 0,
                extraSeatsCount: seatsInCart ? extraSeatsCount : 0,
                planId: planInCart ? selectedPlanId : undefined,
                baseAmount: data.baseAmount,
                customerBilling: billingProfile
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              showSuccess(
                `Payment verified!\n\nTax Invoice Generated: ${verifyData.invoice?.invoiceNumber || "Available in Invoices tab"}\nPayment ID: ${response.razorpay_payment_id}\n\nYour account features and credits have been activated.`,
                "Payment Successful"
              );
              // Clear cart after successful checkout
              setRechargeInCart(false);
              setSeatsInCart(false);
              setPlanInCart(false);
              setShowCartModal(false);
            } else {
              showError(verifyData.error || "Payment verification encountered an issue", "Verification Notice");
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
        modal: {
          backdropclose: true,
          escape: true,
          confirm_close: true,
          animation: true,
          ondismiss: function () {
            setProcessingPayment(false);
            setShowCartModal(true);
          }
        },
        theme: {
          color: "#059669",
          backdrop_color: "#070b14"
        }
      };

      setShowCartModal(false);
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        showError(response.error?.description || "Payment was cancelled or declined.", "Payment Failed");
        setShowCartModal(true);
      });
      rzp.open();
    } catch (err: any) {
      showError("Failed to initiate checkout: " + err.message, "Payment Error");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* FIXED FLOATING TOP-RIGHT CART & PAY CONTROLS (Zero space taken in layout) */}
      <div className="fixed top-20 right-4 sm:right-8 z-40 flex items-center gap-2 drop-shadow-xl">
        {/* Cart Button */}
        <button
          onClick={() => setShowCartModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/95 dark:bg-[#0B101D]/95 backdrop-blur-xl text-white border border-slate-700/80 dark:border-white/15 text-xs font-extrabold hover:bg-slate-800 transition shadow-2xl cursor-pointer"
          title="Open Shopping Cart"
        >
          <span className="text-sm sm:text-base">🛒</span>
          <span>Cart</span>
          {cartItemCount > 0 ? (
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {cartItemCount}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px] font-medium">(0)</span>
          )}
          {hasItemsInCart && (
            <span className="font-mono text-emerald-400 font-black pl-1.5 border-l border-slate-700 dark:border-white/20">
              ₹{totalPayable.toFixed(2)}
            </span>
          )}
        </button>

        {/* Quick Pay Now Button (Visible when cart has items) */}
        {hasItemsInCart && (
          <button
            onClick={handleCombinedCheckout}
            disabled={processingPayment}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black transition shadow-lg hover:shadow-emerald-500/25 cursor-pointer whitespace-nowrap"
          >
            {processingPayment ? <span>Opening...</span> : <span>⚡ Pay Now ➔</span>}
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Clean Top Bar: Spendable Balance + GST Profile & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/90 dark:border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 font-bold shadow-2xs">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Spendable Balance: ₹{availableBalance.toFixed(2)}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {subscription?.plan === "TRIAL"
                  ? "Starter Trial (30 Days)"
                  : subscription?.plan === "PROFESSIONAL"
                  ? "Professional Plan"
                  : subscription?.plan === "ENTERPRISE"
                  ? "Enterprise Plan"
                  : "Basic Plan"}{" "}
                • {subscription?.usedSeats || 1} of {subscription?.totalSeats || 4} Seats Used
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowProfileModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>GST Profile</span>
            </button>
            <button
              onClick={loadWalletData}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
            >
              <RefreshIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#0B101D]/80 rounded-2xl border border-slate-200/90 dark:border-white/10 p-1.5 inline-flex items-center gap-1.5 shadow-2xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            <WalletIcon className="w-4 h-4" />
            <span>Billing &amp; Packages</span>
          </button>
          <button
            onClick={() => setActiveTab("rates")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "rates"
                ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            <PricingAdminIcon className="w-4 h-4" />
            <span>Official Rate Card ({rates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "invoices"
                ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>GST Tax Invoices ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === "ledger"
                ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            <AuditLogsIcon className="w-4 h-4" />
            <span>Financial Ledger ({ledgerEntries.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ACTION TILES */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* "What would you like to do today?" - Action Tiles (Clicking opens specific modal) */}
            <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="mb-5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  Step 1: Choose Your Action
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  What would you like to do today?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any option to configure. Each selection opens a modal where you can save to your cart.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tile 1: Recharge Message Wallet */}
                <div
                  onClick={() => setShowRechargeModal(true)}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                    rechargeInCart
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                        💬
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        rechargeInCart ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                      }`}>
                        {rechargeInCart ? `✓ In Cart (₹${rechargeAmount.toLocaleString()})` : "+ Select"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Recharge Message Wallet
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Prepaid message credits for WhatsApp OTP, Utility alerts &amp; bulk broadcasts.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    <span>Wholesale rates</span>
                    <span>₹0.20/OTP ➔</span>
                  </div>
                </div>

                {/* Tile 2: Add Team Seats */}
                <div
                  onClick={() => setShowSeatModal(true)}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                    seatsInCart
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                        👥
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        seatsInCart ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                      }`}>
                        {seatsInCart ? `✓ In Cart (+${extraSeatsCount} Seat${extraSeatsCount > 1 ? "s" : ""})` : "+ Select"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Add Team Member Seats
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Add support agents, managers, and sales reps to the multi-agent WhatsApp Inbox.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>₹500 + GST / seat / mo</span>
                    <span>Expand Team ➔</span>
                  </div>
                </div>

                {/* Tile 3: Upgrade / Switch Plan */}
                <div
                  onClick={() => setShowPlanModal(true)}
                  className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                    planInCart
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                        🚀
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        planInCart ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                      }`}>
                        {planInCart ? `✓ In Cart (${selectedPlanId})` : "+ Select"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Upgrade or Switch Plan
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Upgrade tier for higher seat quotas, Meta Green Tick assistance, and AI Auto-replies.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    <span>Starter, Basic &amp; Pro tiers</span>
                    <span>From ₹500 ➔</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Baseline Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Spendable Available Balance */}
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
              <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] p-6 rounded-3xl shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">In-Flight Reserved Funds</span>
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">15-min TTL</span>
                  </div>
                  <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">₹{reservedBalance.toFixed(2)}</div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-2">
                    Held atomically during Meta dispatch. Auto-released if message fails.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                  Prevents negative balance &amp; race conditions
                </div>
              </div>

              {/* GST Billing Profile Summary */}
              <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] p-6 rounded-3xl shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">GST Registration</span>
                    <button 
                      onClick={() => setShowProfileModal(true)} 
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-base font-bold text-slate-950 dark:text-slate-100 truncate">
                    {billingProfile.legalBusinessName || "Personal / Unregistered"}
                  </div>
                  <p className="text-xs font-mono text-slate-800 dark:text-slate-300 font-semibold mt-1">
                    GSTIN: {billingProfile.gstin || "Not provided (Consumer)"}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                    Place of Supply: State Code {billingProfile.stateCode || "27"} ({billingProfile.state || "Maharashtra"})
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-400 font-medium">
                  Tax Treatment: {isOutOfState ? "Inter-state IGST (18%)" : "Intra-state CGST (9%) + SGST (9%)"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OFFICIAL RATE CARD */}
        {activeTab === "rates" && (
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Official Meta Wholesale Rate Card</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct provider wholesale pricing with automated platform margin guards.
                </p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Live Meta Conversational Engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/[0.06]">
                    <th className="py-3 px-4">Country</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Wholesale Cost</th>
                    <th className="py-3 px-4">Billed Base Price</th>
                    <th className="py-3 px-4">Margin</th>
                    <th className="py-3 px-4">Safety Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-sm">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {r.country} <span className="text-xs text-slate-400 font-mono">({r.isoCode})</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {r.category === "AUTHENTICATION" ? "🔐 Authentication / OTP" :
                         r.category === "UTILITY" ? "⚡ Utility / Alerts" :
                         "📢 Marketing / Broadcast"}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {r.providerCurrency === "USD" ? `$${r.providerCost}` : `₹${r.providerCost}`} 
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">(~₹{r.providerCostInr.toFixed(4)})</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                        ₹{r.basePrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {r.actualMarginPercent.toFixed(1)}%
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.lossRiskStatus === "SAFE"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                        }`}>
                          {r.lossRiskStatus === "SAFE" ? "SAFE (Pass)" : "REVIEW"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>All message prices are displayed excluding GST. Applicable GST is charged at recharge time.</span>
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">Unconfigured countries are blocked to prevent unbilled dispatches.</span>
            </div>
          </div>
        )}

        {/* TAB 3: GST TAX INVOICES */}
        {activeTab === "invoices" && (
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Tax Invoices</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sequential, audit-ready GST tax invoices for wallet recharge &amp; subscription transactions.
                </p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Issuer: Digital Beings Infotech Pvt Ltd</span>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                No invoices generated yet. Recharge your wallet or purchase a plan to generate a compliant tax invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/[0.06]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Base Amount</th>
                      <th className="py-3 px-4">GST Tax</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Payment Ref</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-sm">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{Number(inv.baseAmount).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          ₹{Number(inv.totalTaxAmount).toFixed(2)}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">({inv.gstRatePercent}%)</span>
                        </td>
                        <td className="py-4 px-4 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(inv.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-400 dark:text-slate-500">
                          {inv.paymentReference}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1 bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.14] text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
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

        {/* TAB 4: IMMUTABLE FINANCIAL LEDGER */}
        {activeTab === "ledger" && (
          <div className="bg-white dark:bg-[#0B101D]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Immutable Financial Ledger</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Append-only audit trail. Every message charge, reservation, recharge, and adjustment is recorded with balance snapshots.
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                🔒 Cryptographic Integrity
              </span>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                No ledger records found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/[0.06]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Balance After</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-sm">
                    {ledgerEntries.map((le) => (
                      <tr key={le.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
                            le.entryType === "CREDIT_RECHARGE" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" :
                            le.entryType === "DEBIT_DISPATCH" ? "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300" :
                            le.entryType === "REFUND" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300" :
                            le.entryType === "CREDIT_RELEASE" ? "bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300" :
                            "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300"
                          }`}>
                            {le.entryType}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 font-mono font-bold ${
                          le.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : le.amount < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {le.amount > 0 ? `+₹${le.amount.toFixed(2)}` : le.amount < 0 ? `-₹${Math.abs(le.amount).toFixed(2)}` : "₹0.00"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{le.balanceAfter.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                          {le.referenceId || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                          {le.description}
                          {le.reason && <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">Reason: {le.reason}</div>}
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

      {/* MODAL 1: RECHARGE MESSAGE WALLET */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-base font-bold text-emerald-700 dark:text-emerald-400">💬</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Recharge Message Wallet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prepaid credits added directly to your spendable balance.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Select Credit Amount (Excl. GST)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[500, 1000, 2500, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setRechargeAmount(val);
                      setRechargeCustomInput(String(val));
                    }}
                    className={`py-3 px-3 rounded-xl border text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      rechargeAmount === val
                        ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-md scale-[1.02]"
                        : "bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-sm">₹{val.toLocaleString()}</span>
                    <span className="text-[10px] font-medium opacity-80">~{Math.floor(val / 0.20).toLocaleString()} OTPs</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Or Enter Custom Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">₹</span>
                <input
                  type="number"
                  value={rechargeCustomInput}
                  onChange={(e) => {
                    setRechargeCustomInput(e.target.value);
                    const parsed = Math.max(0, Number(e.target.value));
                    setRechargeAmount(parsed);
                  }}
                  min="100"
                  step="100"
                  placeholder="Enter custom amount"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-2.5 font-black text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Wholesale rate is ₹0.20 + GST per message. Minimum recharge is ₹100.
              </p>
            </div>

            {/* Preview Breakdown */}
            <div className="p-3.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Base Credits:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{rechargeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST (18%):</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">₹{(rechargeAmount * 0.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-white/10 text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{(rechargeAmount * 1.18).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons: Save to Cart OR Go to Cart */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (rechargeAmount < 100) return showWarning("Minimum recharge amount is ₹100.", "Invalid Amount");
                  setRechargeInCart(true);
                  setShowRechargeModal(false);
                  showSuccess(`₹${rechargeAmount.toLocaleString()} message recharge saved to your cart.`, "Saved to Cart");
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer text-center"
              >
                💾 Save to Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rechargeAmount < 100) return showWarning("Minimum recharge amount is ₹100.", "Invalid Amount");
                  setRechargeInCart(true);
                  setShowRechargeModal(false);
                  setShowCartModal(true);
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition shadow-md cursor-pointer text-center"
              >
                🛒 Go to Cart &amp; Pay ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TEAM SEATS */}
      {showSeatModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-base font-bold text-blue-700 dark:text-blue-400">👥</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Add Team Member Seats</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Expand agents in your Live Chat Inbox.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSeatModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Number of Additional Seats:</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Current: {subscription?.totalSeats || 4} ➔ New Total: {(subscription?.totalSeats || 4) + extraSeatsCount} seats
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setExtraSeatsCount(Math.max(1, extraSeatsCount - 1))}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.08] border border-slate-300 dark:border-white/15 font-black text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.14] transition cursor-pointer text-lg flex items-center justify-center shadow-2xs"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-xl text-slate-900 dark:text-slate-100">
                    {extraSeatsCount}
                  </span>
                  <button
                    onClick={() => setExtraSeatsCount(extraSeatsCount + 1)}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.08] border border-slate-300 dark:border-white/15 font-black text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.14] transition cursor-pointer text-lg flex items-center justify-center shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Seats Fee ({extraSeatsCount} × ₹500/mo):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{(extraSeatsCount * 500).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST (18%):</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">₹{(extraSeatsCount * 500 * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-white/10 text-sm">
                  <span>Total Monthly:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{(extraSeatsCount * 590).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Save to Cart OR Go to Cart */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSeatsInCart(true);
                  setShowSeatModal(false);
                  showSuccess(`+${extraSeatsCount} Team Seat(s) saved to your cart.`, "Saved to Cart");
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer text-center"
              >
                💾 Save to Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setSeatsInCart(true);
                  setShowSeatModal(false);
                  setShowCartModal(true);
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition shadow-md cursor-pointer text-center"
              >
                🛒 Go to Cart &amp; Pay ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UPGRADE OR SWITCH PLAN */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-base font-bold text-purple-700 dark:text-purple-400">🚀</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Upgrade or Switch Subscription Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Predictable flat monthly dashboard pricing.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3 Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Starter Trial */}
              <div
                onClick={() => setSelectedPlanId("TRIAL")}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanId === "TRIAL"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Starter Trial</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.08]">30 Days</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹500</span>
                    <sub className="text-[10px] font-bold text-slate-500 uppercase">+ GST</sub>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">1 Seat. For first-time onboarding and API testing.</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                    <li>✓ 1 User seat (Owner profile)</li>
                    <li>✓ Full OTP &amp; Utility APIs</li>
                    <li>✓ Pay-as-you-go message fuel</li>
                  </ul>
                </div>
                <div className="mt-4 pt-2">
                  <span className={`block w-full text-center py-2 rounded-xl text-xs font-black transition ${
                    selectedPlanId === "TRIAL"
                      ? "bg-slate-900 dark:bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                  }`}>
                    {selectedPlanId === "TRIAL" ? "✓ Selected (₹500)" : "Select Trial"}
                  </span>
                </div>
              </div>

              {/* Basic Plan */}
              <div
                onClick={() => setSelectedPlanId("BASIC")}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanId === "BASIC"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Basic Plan</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">Popular</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹1,000</span>
                    <sub className="text-[10px] font-bold text-slate-500 uppercase">+ GST / mo</sub>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">4 Seats. For growing teams using WhatsApp support inbox.</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                    <li>✓ <strong>4 Seats</strong> (1 Owner + 3 Support)</li>
                    <li>✓ <strong>₹50 Free Starter Fuel</strong> (~250 OTPs)</li>
                    <li>✓ Live Chat Team Inbox &amp; Routing</li>
                  </ul>
                </div>
                <div className="mt-4 pt-2">
                  <span className={`block w-full text-center py-2 rounded-xl text-xs font-black transition ${
                    selectedPlanId === "BASIC"
                      ? "bg-slate-900 dark:bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                  }`}>
                    {selectedPlanId === "BASIC" ? "✓ Selected (₹1,000)" : "Select Basic"}
                  </span>
                </div>
              </div>

              {/* Professional Plan */}
              <div
                onClick={() => setSelectedPlanId("PROFESSIONAL")}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanId === "PROFESSIONAL"
                    ? "border-emerald-400 bg-emerald-950/40 text-white shadow-lg ring-2 ring-emerald-400/40"
                    : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-emerald-400">Professional</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">All-Inclusive</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">₹2,500</span>
                    <sub className="text-[10px] font-bold text-slate-400 uppercase">+ GST / mo</sub>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">6 Seats. E-Commerce funnels, AI auto-replies, Meta Green Tick.</p>
                  <ul className="text-xs text-slate-600 dark:text-slate-200 space-y-1 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                    <li>✓ <strong>6 Seats</strong> (1 Owner + 5 Support)</li>
                    <li>✓ <strong>₹100 Free Starter Fuel</strong> (~500 OTPs)</li>
                    <li>✓ <strong>Green Tick (OBA) Filing Support</strong></li>
                    <li>✓ AI Assistant &amp; Smart Auto-Replies</li>
                  </ul>
                </div>
                <div className="mt-4 pt-2">
                  <span className={`block w-full text-center py-2 rounded-xl text-xs font-black transition ${
                    selectedPlanId === "PROFESSIONAL"
                      ? "bg-emerald-500 text-slate-950 font-black"
                      : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                  }`}>
                    {selectedPlanId === "PROFESSIONAL" ? "✓ Selected (₹2,500)" : "Select Pro"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Save to Cart OR Go to Cart */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPlanInCart(true);
                  setShowPlanModal(false);
                  showSuccess(`${selectedPlanId} plan saved to your cart.`, "Saved to Cart");
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer text-center"
              >
                💾 Save to Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlanInCart(true);
                  setShowPlanModal(false);
                  setShowCartModal(true);
                }}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition shadow-md cursor-pointer text-center"
              >
                🛒 Go to Cart &amp; Pay ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SHOPPING CART & FINAL BILLING ("GO TO CART" MODAL) */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-white/[0.08]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  Shopping Cart
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Your Cart &amp; Billing Breakdown
                </h3>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {hasItemsInCart ? (
                <>
                  {rechargeInCart && currentRechargeBase > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-150 dark:border-white/[0.06]">
                      <div className="pr-3">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>💬</span> Message Wallet Credits
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Prepaid balance (~{Math.floor(currentRechargeBase / 0.20).toLocaleString()} OTPs)
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                          ₹{currentRechargeBase.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setRechargeInCart(false)}
                          className="text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                          title="Remove from cart"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {seatsInCart && currentSeatsBase > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-150 dark:border-white/[0.06]">
                      <div className="pr-3">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>👥</span> Additional Team Seats ({extraSeatsCount} seat{extraSeatsCount > 1 ? "s" : ""})
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          ₹500 / seat / month
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                          ₹{currentSeatsBase.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setSeatsInCart(false)}
                          className="text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                          title="Remove from cart"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {planInCart && currentPlanBase > 0 && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-150 dark:border-white/[0.06]">
                      <div className="pr-3">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>🚀</span> {selectedPlanId} Subscription Plan
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Monthly platform subscription tier
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                          ₹{currentPlanBase.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setPlanInCart(false)}
                          className="text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer"
                          title="Remove from cart"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm space-y-2">
                  <div>🛒 Your cart is currently empty.</div>
                  <div className="text-xs text-slate-500">Click any of the 3 tiles on the dashboard to configure and save to cart.</div>
                </div>
              )}
            </div>

            {/* Tax Breakdown */}
            {hasItemsInCart && (
              <div className="pt-3 border-t border-slate-150 dark:border-white/[0.06] space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Base Subtotal (Excl. Tax)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{totalBaseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST (18.0% {isOutOfState ? "IGST" : "CGST+SGST"}) [SAC: 998313]</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-slate-100">
                  <span>Total Payable Amount</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{totalPayable.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Final Checkout Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowCartModal(false);
                  handleCombinedCheckout();
                }}
                disabled={processingPayment || !hasItemsInCart || totalBaseAmount <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm transition shadow-md disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <span>Connecting to Razorpay...</span>
                ) : (
                  <span>⚡ Proceed to Payment (₹{totalPayable.toFixed(2)}) ➔</span>
                )}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-2">
                🔒 Secure 256-bit encrypted checkout via Razorpay • UPI, NetBanking, Cards
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CUSTOMER BILLING PROFILE */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Customer Billing Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl font-bold cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSaveBillingProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Legal Entity / Business Name</label>
                <input
                  type="text"
                  value={billingProfile.legalBusinessName}
                  onChange={(e) => setBillingProfile({ ...billingProfile, legalBusinessName: e.target.value })}
                  placeholder="e.g. Acme Technologies Private Limited"
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">GSTIN (15 Characters)</label>
                <input
                  type="text"
                  value={billingProfile.gstin}
                  onChange={(e) => setBillingProfile({ ...billingProfile, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  maxLength={15}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">State</label>
                  <input
                    type="text"
                    value={billingProfile.state}
                    onChange={(e) => setBillingProfile({ ...billingProfile, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">GST State Code</label>
                  <input
                    type="text"
                    value={billingProfile.stateCode}
                    onChange={(e) => setBillingProfile({ ...billingProfile, stateCode: e.target.value })}
                    placeholder="27"
                    maxLength={2}
                    className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Registered Address</label>
                <textarea
                  value={billingProfile.billingAddress}
                  onChange={(e) => setBillingProfile({ ...billingProfile, billingAddress: e.target.value })}
                  placeholder="Building, Street, Area, City, Pincode"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: INVOICE DETAILS VIEW */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B101D] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Tax Invoice</h3>
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-2xl font-bold cursor-pointer">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.06]">
                <div className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] mb-1">Supplier (Billed From)</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">Digital Beings Infotech Pvt Ltd</div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">GSTIN: 27AABCU9603R1ZM</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">Bandra Kurla Complex, Mumbai, Maharashtra</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-xl border border-slate-100 dark:border-white/[0.06]">
                <div className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] mb-1">Recipient (Billed To)</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">{selectedInvoice.customerBusinessName || "Individual Customer"}</div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">GSTIN: {selectedInvoice.customerGstin || "Unregistered"}</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">Payment Ref: {selectedInvoice.paymentReference}</div>
              </div>
            </div>

            <div className="border border-slate-100 dark:border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">SAC Code</th>
                    <th className="py-2.5 px-4 text-right">Taxable Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      Digital Beings Platform Order &amp; Message Credits Top-Up
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">998313</td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-slate-900 dark:text-slate-100">
                      ₹{Number(selectedInvoice.baseAmount).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-white/[0.06] pt-3">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Taxable Amount</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">₹{Number(selectedInvoice.baseAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>GST Tax Rate</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedInvoice.gstRatePercent}%</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Total Tax (CGST+SGST / IGST)</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">₹{Number(selectedInvoice.totalTaxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <span>Total Amount Paid</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">₹{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
