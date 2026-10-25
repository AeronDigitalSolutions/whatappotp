"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      role="switch"
      aria-checked={isDark}
      className={`relative inline-flex items-center gap-2 p-1.5 rounded-full transition-all duration-300 backdrop-blur-xl border select-none cursor-pointer group ${
        isDark
          ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200 shadow-inner hover:border-emerald-500/40"
          : "bg-slate-200/70 hover:bg-slate-300/80 border-slate-300/80 text-slate-800 shadow-xs hover:border-emerald-500/50"
      } ${className}`}
      title={isDark ? "Switch to Apple Light Theme" : "Switch to Apple Pro Dark Theme"}
    >
      {/* Sliding Pill Indicator */}
      <div className="relative flex items-center justify-between w-14 h-6 px-1 rounded-full bg-black/20 dark:bg-black/40 border border-black/10 dark:border-white/10 overflow-hidden">
        {/* Sun Icon */}
        <span
          className={`flex items-center justify-center w-5 h-5 text-xs transition-transform duration-300 z-10 ${
            !isDark ? "text-amber-500 scale-110 font-bold" : "text-slate-500 opacity-60 scale-90"
          }`}
        >
          ☀️
        </span>

        {/* Moon Icon */}
        <span
          className={`flex items-center justify-center w-5 h-5 text-xs transition-transform duration-300 z-10 ${
            isDark ? "text-emerald-300 scale-110 font-bold" : "text-slate-500 opacity-60 scale-90"
          }`}
        >
          🌙
        </span>

        {/* Animated Thumb */}
        <span
          className={`absolute top-0.5 bottom-0.5 w-5 rounded-full transition-all duration-300 shadow-sm ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isDark
              ? "left-[31px] bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              : "left-[3px] bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-bold tracking-tight pr-1.5 transition-colors">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}
