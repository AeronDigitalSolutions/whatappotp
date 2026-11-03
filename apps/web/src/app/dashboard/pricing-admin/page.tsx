"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingAdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Pricing, margins & provider costs are restricted exclusively to the internal office admin dashboard (/office)
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      let isOfficeStaff = false;
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u.isManager || u.role === "OFFICE_MANAGER" || u.officeRole || u.isSuperAdmin) {
            isOfficeStaff = true;
          }
        } catch (e) {}
      }
      if (isOfficeStaff) {
        router.replace("/office");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Redirecting to workspace...</p>
      </div>
    </div>
  );
}
