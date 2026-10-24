import { getApiUrl } from "./api";

export interface CustomerBillingInfo {
  legalBusinessName?: string;
  gstin?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  taxExempt?: boolean;
}

export interface PlanConfig {
  planId: "TRIAL" | "BASIC" | "PROFESSIONAL";
  name: string;
  basePrice: number;
  description: string;
  seats: string;
  bonusWalletCredit: number;
  estimatedOtpsIncluded: number;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  TRIAL: {
    planId: "TRIAL",
    name: "Starter Trial",
    basePrice: 500,
    description: "30-Day Platform Trial for 1 User (Owner Account)",
    seats: "1 User",
    bonusWalletCredit: 0,
    estimatedOtpsIncluded: 0
  },
  BASIC: {
    planId: "BASIC",
    name: "Basic Business Plan",
    basePrice: 1000,
    description: "1 Owner + 3 Support Seats (4 Total Seats)",
    seats: "4 Seats (1 Owner + 3 Support)",
    bonusWalletCredit: 50,
    estimatedOtpsIncluded: 250
  },
  PROFESSIONAL: {
    planId: "PROFESSIONAL",
    name: "Professional Plan",
    basePrice: 2500,
    description: "1 Owner + 5 Support Seats + Shopify + AI Bots + OBA Filing Support",
    seats: "6 Seats (1 Owner + 5 Support)",
    bonusWalletCredit: 100,
    estimatedOtpsIncluded: 500
  }
};

export async function loadRazorpayScript(): Promise<void> {
  if (typeof (window as any).Razorpay !== "undefined") return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to connect to Razorpay payment gateway"));
    document.body.appendChild(script);
  });
}

export async function startSubscriptionCheckout({
  planId,
  organizationId,
  customerBilling,
  userEmail,
  userName,
  onSuccess,
  onError,
  onDismiss
}: {
  planId: "TRIAL" | "BASIC" | "PROFESSIONAL";
  organizationId: string;
  customerBilling?: CustomerBillingInfo;
  userEmail?: string;
  userName?: string;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
  onDismiss?: () => void;
}): Promise<void> {
  try {
    await loadRazorpayScript();

    const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "SUBSCRIPTION",
        planId,
        organizationId,
        customerBilling
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to create subscription payment order");
    }

    const options = {
      key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
      amount: data.amount,
      currency: "INR",
      name: "Digital Beings Infotech",
      description: `${PLAN_CONFIGS[planId]?.name || planId} (Base ₹${data.baseAmount} + 18% GST)`,
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
              organizationId,
              customerBilling
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            onSuccess({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              invoice: verifyData.invoice,
              planId
            });
          } else {
            onError(verifyData.error || "Payment verification failed");
          }
        } catch (vErr: any) {
          onError("Payment received but verification encountered error: " + vErr.message);
        }
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        }
      },
      prefill: {
        name: customerBilling?.legalBusinessName || userName || "Digital Beings Client",
        email: userEmail || "billing@digitalbeings.in",
        contact: ""
      },
      theme: { color: "#154336" }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (failResp: any) {
      onError(failResp.error?.description || "Payment was declined or cancelled");
    });
    rzp.open();
  } catch (err: any) {
    onError(err.message || "Failed to initiate checkout");
  }
}
