"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type RoleKey =
  | "SUPER_ADMIN"
  | "OWNER"
  | "SUPPORT"
  | "MARKETING"
  | "ECOMMERCE"
  | "FINANCE"
  | "CUSTOM";

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  badge: string;
  icon: string;
  colorClass: string;
  description: string;
  permissions: string[];
}

export const ALL_MODULES = [
  { key: "inbox", label: "Live Chat Shared Inbox", path: "/dashboard/inbox", icon: "💬" },
  { key: "automations", label: "Chatbot & Auto-Replies", path: "/dashboard/automations", icon: "🤖" },
  { key: "ecommerce", label: "E-Commerce Recipes", path: "/dashboard/ecommerce", icon: "🛍️" },
  { key: "campaigns", label: "Broadcast Campaigns", path: "/dashboard/campaigns", icon: "📣" },
  { key: "templates", label: "Template Studio", path: "/dashboard/templates", icon: "📄" },
  { key: "numbers", label: "Numbers & Routing", path: "/dashboard/numbers", icon: "📱" },
  { key: "green-tick", label: "WhatsApp Verification", path: "/dashboard/green-tick", icon: "✅" },
  { key: "logs", label: "OTP & Audit Logs", path: "/dashboard/logs", icon: "📋" },
  { key: "wallet", label: "Wallet & Billing", path: "/dashboard/wallet", icon: "💳" },
  { key: "pricing_admin", label: "Pricing & Safety Admin", path: "/dashboard/pricing-admin", icon: "🛡️" },
  { key: "api_keys", label: "Developer API Keys", path: "/dashboard/api-keys", icon: "🔑" },
  { key: "settings", label: "Workspace Settings", path: "/dashboard/settings", icon: "⚙️" },
  { key: "team", label: "Team & Role Manager", path: "/dashboard/team", icon: "👥" },
  { key: "super_admin", label: "Super Admin Platform Console", path: "/dashboard/super-admin", icon: "👑" }
];

export const ROLE_PRESETS: Record<RoleKey, RoleDefinition> = {
  SUPER_ADMIN: {
    key: "SUPER_ADMIN",
    label: "Super Admin (Platform Owner)",
    badge: "Super Admin",
    icon: "👑",
    colorClass: "bg-purple-100 text-purple-900 border-purple-300",
    description: "Total cross-tenant authority across all businesses, users, and platform financials.",
    permissions: [
      "inbox", "automations", "ecommerce", "campaigns", "templates",
      "numbers", "green-tick", "logs", "wallet", "pricing_admin",
      "api_keys", "settings", "team", "super_admin"
    ]
  },
  OWNER: {
    key: "OWNER",
    label: "Business Owner (Company Full Access)",
    badge: "Owner",
    icon: "🏢",
    colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    description: "Full control over company numbers, wallet recharges, team roles, and all modules.",
    permissions: [
      "inbox", "automations", "ecommerce", "campaigns", "templates",
      "numbers", "green-tick", "logs", "wallet", "pricing_admin",
      "api_keys", "settings", "team"
    ]
  },
  SUPPORT: {
    key: "SUPPORT",
    label: "Customer Support Specialist",
    badge: "Support",
    icon: "💬",
    colorClass: "bg-teal-100 text-teal-900 border-teal-300",
    description: "Focuses on 2-way live chat customer support and pre-approved WhatsApp templates.",
    permissions: ["inbox", "templates", "logs"]
  },
  MARKETING: {
    key: "MARKETING",
    label: "Growth & Marketing Manager",
    badge: "Marketing",
    icon: "📣",
    colorClass: "bg-blue-100 text-blue-900 border-blue-300",
    description: "Builds broadcast campaigns, tests templates, and monitors delivery engagement.",
    permissions: ["campaigns", "templates", "numbers", "logs"]
  },
  ECOMMERCE: {
    key: "ECOMMERCE",
    label: "E-Commerce Operations Lead",
    badge: "E-Commerce",
    icon: "🛍️",
    colorClass: "bg-amber-100 text-amber-900 border-amber-300",
    description: "Manages Shopify/WooCommerce recipes, abandoned cart recovery, and COD confirmation.",
    permissions: ["ecommerce", "automations", "inbox", "logs"]
  },
  FINANCE: {
    key: "FINANCE",
    label: "Finance & Accounts Specialist",
    badge: "Finance",
    icon: "💳",
    colorClass: "bg-rose-100 text-rose-900 border-rose-300",
    description: "Dedicated access to wallet recharges, GST invoices, and message cost breakdowns.",
    permissions: ["wallet", "pricing_admin", "logs"]
  },
  CUSTOM: {
    key: "CUSTOM",
    label: "Custom Granular Role Simulator",
    badge: "Custom",
    icon: "⚙️",
    colorClass: "bg-indigo-100 text-indigo-900 border-indigo-300",
    description: "Interactive permission tester where you toggle any exact module access live.",
    permissions: ["inbox", "automations"]
  }
};

interface PermissionContextType {
  activeRole: RoleKey;
  setActiveRole: (role: RoleKey) => void;
  activeRoleDef: RoleDefinition;
  customPermissions: string[];
  setCustomPermissions: (perms: string[]) => void;
  toggleCustomPermission: (moduleKey: string) => void;
  hasAccess: (moduleKey: string) => boolean;
  canAccessPath: (path: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<RoleKey>("OWNER");
  const [customPermissions, setCustomPermissionsState] = useState<string[]>(["inbox", "automations"]);

  // Load saved preview role from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("db_preview_role") as RoleKey;
      if (savedRole && ROLE_PRESETS[savedRole]) {
        setActiveRoleState(savedRole);
      }
      const savedCustom = localStorage.getItem("db_custom_perms");
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (Array.isArray(parsed)) setCustomPermissionsState(parsed);
        } catch (e) {}
      }
    }
  }, []);

  const setActiveRole = (role: RoleKey) => {
    setActiveRoleState(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("db_preview_role", role);
    }
  };

  const setCustomPermissions = (perms: string[]) => {
    setCustomPermissionsState(perms);
    if (typeof window !== "undefined") {
      localStorage.setItem("db_custom_perms", JSON.stringify(perms));
    }
  };

  const toggleCustomPermission = (moduleKey: string) => {
    const updated = customPermissions.includes(moduleKey)
      ? customPermissions.filter(k => k !== moduleKey)
      : [...customPermissions, moduleKey];
    setCustomPermissions(updated);
  };

  const activeRoleDef = ROLE_PRESETS[activeRole] || ROLE_PRESETS.OWNER;

  const hasAccess = (moduleKey: string): boolean => {
    if (activeRole === "SUPER_ADMIN") return true;
    if (activeRole === "CUSTOM") return customPermissions.includes(moduleKey);
    return activeRoleDef.permissions.includes(moduleKey);
  };

  const canAccessPath = (path: string): boolean => {
    // Overview and Setup are always accessible to anyone logged in
    if (path === "/dashboard" || path === "/dashboard/setup") return true;

    const moduleMapping: Record<string, string> = {
      "/dashboard/inbox": "inbox",
      "/dashboard/automations": "automations",
      "/dashboard/ecommerce": "ecommerce",
      "/dashboard/campaigns": "campaigns",
      "/dashboard/templates": "templates",
      "/dashboard/numbers": "numbers",
      "/dashboard/green-tick": "green-tick",
      "/dashboard/logs": "logs",
      "/dashboard/wallet": "wallet",
      "/dashboard/pricing-admin": "pricing_admin",
      "/dashboard/api-keys": "api_keys",
      "/dashboard/settings": "settings",
      "/dashboard/team": "team",
      "/dashboard/super-admin": "super_admin"
    };

    const targetModule = moduleMapping[path];
    if (!targetModule) return true;
    return hasAccess(targetModule);
  };

  return (
    <PermissionContext.Provider
      value={{
        activeRole,
        setActiveRole,
        activeRoleDef,
        customPermissions,
        setCustomPermissions,
        toggleCustomPermission,
        hasAccess,
        canAccessPath
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
