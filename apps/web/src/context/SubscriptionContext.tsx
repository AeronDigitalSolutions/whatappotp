"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import ActivationPaywallModal from "@/components/ActivationPaywallModal";
import { getApiUrl } from "@/lib/api";

export interface SubscriptionContextType {
  subscription: any;
  isActivated: boolean;
  isDemo: boolean;
  loading: boolean;
  planId: string;
  triggerPaywall: (customTitle?: string, customSubtitle?: string) => void;
  guardAction: (action: () => void | Promise<void>, actionName?: string, customSubtitle?: string) => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  isActivated: false,
  isDemo: true,
  loading: true,
  planId: "UNPAID",
  triggerPaywall: () => {},
  guardAction: () => false,
  refreshSubscription: async () => {}
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

/**
 * Global helper to trigger the subscription paywall from anywhere (components, forms, event handlers)
 */
export function openActivationPaywall(title?: string, subtitle?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("trigger_activation_paywall", {
        detail: { title, subtitle }
      })
    );
  }
}

/**
 * Synchronous check whether the active workspace is in Demo Preview Mode
 */
export function isWorkspaceInDemoMode(): boolean {
  if (typeof window !== "undefined") {
    const isAct = localStorage.getItem("workspace_is_activated");
    if (isAct === "true") return false;
    return true;
  }
  return true;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [orgId, setOrgId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Workspace Owner");
  const [userEmail, setUserEmail] = useState<string>("");

  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paywallTitle, setPaywallTitle] = useState<string>("To Continue, Please Take a Subscription");
  const [paywallSubtitle, setPaywallSubtitle] = useState<string>(
    "To continue, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST) to unlock live WhatsApp operations."
  );

  const fetchSubscription = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const userJson = localStorage.getItem("user");
      let currentOrgId = localStorage.getItem("organizationId") || "";
      if (userJson) {
        const u = JSON.parse(userJson);
        if (u.name) setUserName(u.name);
        if (u.email) setUserEmail(u.email);
        if (!currentOrgId && u.organizationId) currentOrgId = u.organizationId;
      }
      setOrgId(currentOrgId);

      if (currentOrgId) {
        const res = await fetch(`${getApiUrl()}/v1/wallet/${currentOrgId}`);
        const data = await res.json();
        if (data.success && data.subscription) {
          setSubscription(data.subscription);
          const activated = Boolean(data.subscription.isActivated);
          localStorage.setItem("workspace_is_activated", activated ? "true" : "false");
          localStorage.setItem("workspace_plan", data.subscription.plan || "UNPAID");
        } else {
          localStorage.setItem("workspace_is_activated", "false");
        }
      }
    } catch (e) {
      console.warn("Failed to fetch subscription status:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();

    const handleCustomPaywall = (e: any) => {
      const detail = e.detail || {};
      setPaywallTitle(detail.title || "To Continue, Please Take a Subscription");
      setPaywallSubtitle(
        detail.subtitle ||
        "To continue, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST) to unlock live WhatsApp operations."
      );
      setIsPaywallOpen(true);
    };

    window.addEventListener("trigger_activation_paywall", handleCustomPaywall);
    return () => {
      window.removeEventListener("trigger_activation_paywall", handleCustomPaywall);
    };
  }, [fetchSubscription]);

  const isActivated = Boolean(subscription?.isActivated);
  const isDemo = !isActivated;
  const planId = subscription?.plan || "UNPAID";

  const triggerPaywall = useCallback((customTitle?: string, customSubtitle?: string) => {
    setPaywallTitle(customTitle || "To Continue, Please Take a Subscription");
    setPaywallSubtitle(
      customSubtitle ||
      "To continue, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST) to unlock live WhatsApp operations."
    );
    setIsPaywallOpen(true);
  }, []);

  const guardAction = useCallback(
    (action: () => void | Promise<void>, actionName?: string, customSubtitle?: string): boolean => {
      if (isDemo) {
        triggerPaywall(
          actionName ? `To continue ${actionName}, please take a subscription` : "To Continue, Please Take a Subscription",
          customSubtitle ||
          "To continue, you have to take our 30-Day Starter Trial (₹500 + GST) or choose a monthly subscription (₹1,000 or ₹2,500 + GST) to unlock live WhatsApp operations."
        );
        return false;
      }
      action();
      return true;
    },
    [isDemo, triggerPaywall]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isActivated,
        isDemo,
        loading,
        planId,
        triggerPaywall,
        guardAction,
        refreshSubscription: fetchSubscription
      }}
    >
      {children}

      <ActivationPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title={paywallTitle}
        subtitle={paywallSubtitle}
        organizationId={orgId}
        userName={userName}
        userEmail={userEmail}
        onActivationSuccess={() => {
          setIsPaywallOpen(false);
          localStorage.setItem("workspace_is_activated", "true");
          window.location.reload();
        }}
      />
    </SubscriptionContext.Provider>
  );
}
