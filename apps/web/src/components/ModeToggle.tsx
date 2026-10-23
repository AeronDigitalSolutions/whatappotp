"use client";

import React from "react";
import { useViewMode } from "@/context/ViewModeContext";

export default function ModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useViewMode();

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-2xs ${className}`}
      role="group"
      aria-label="View Mode Switcher"
    >
      <button
        type="button"
        onClick={() => setMode("USER")}
        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer ${
          mode === "USER"
            ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/80 ring-1 ring-emerald-500/10"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Simple, clean mode for business users"
      >
        <span className="text-sm text-emerald-600">👤</span>
        <span>User Mode</span>
      </button>

      <button
        type="button"
        onClick={() => setMode("DEVELOPER")}
        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer ${
          mode === "DEVELOPER"
            ? "bg-slate-900 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Technical developer mode with Graph API IDs, tokens, and payloads"
      >
        <span className="text-xs font-mono font-black">&lt;/&gt;</span>
        <span>Developer Mode</span>
      </button>
    </div>
  );
}
