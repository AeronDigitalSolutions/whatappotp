"use client";

import React, { useState, useRef, useEffect } from "react";
import { useViewMode } from "@/context/ViewModeContext";

export default function FloatingModeSwitcher() {
  const { mode, setMode, isUser, isDev } = useViewMode();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSwitchToDev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMode("DEVELOPER");
    setIsOpen(false);
  };

  const handleSwitchToUser = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMode("USER");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 select-none">
      {/* Floating Interactive Popover Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Workspace View Mode
              </span>
              <h4 className="text-xs font-black text-slate-900 mt-0.5">
                Current Status: {isUser ? "User Mode" : "Developer Mode"}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
              aria-label="Close mode switcher"
            >
              ✕
            </button>
          </div>

          {/* Conditional Action: Switch to the other mode */}
          {isUser ? (
            /* Currently in USER MODE -> Offer switch to DEVELOPER MODE */
            <div className="space-y-2">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">User Mode Active</div>
                    <div className="text-[10px] text-emerald-700">Clean & minimal interface</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-md">
                  Active
                </span>
              </div>

              <button
                type="button"
                onClick={handleSwitchToDev}
                className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-left transition flex items-center justify-between group shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                    &lt;/&gt;
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Switch to Developer Mode</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Show Meta tokens, IDs & raw debug tools
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold transition group-hover:translate-x-0.5">
                  ➔
                </div>
              </button>
            </div>
          ) : (
            /* Currently in DEVELOPER MODE -> Offer switch to USER MODE */
            <div className="space-y-2">
              <div className="p-3 bg-slate-900 text-white border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                    &lt;/&gt;
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Developer Mode Active</div>
                    <div className="text-[10px] text-slate-400">Technical API & Token diagnostics</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-md">
                  Active
                </span>
              </div>

              <button
                type="button"
                onClick={handleSwitchToUser}
                className="w-full p-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-left transition flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Switch to User Mode</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Clean, distraction-free business workspace
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition group-hover:translate-x-0.5">
                  ➔
                </div>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Applies globally across all modules</span>
            <span className="font-mono">Auto-saved</span>
          </div>
        </div>
      )}

      {/* Main Floating Capsule Button */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer backdrop-blur-md ${
          isUser
            ? "bg-white/95 border-slate-200/90 text-slate-800 hover:border-emerald-300 hover:ring-2 hover:ring-emerald-500/10"
            : "bg-slate-900/95 border-slate-700/80 text-white hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/20"
        }`}
        title={`Current Status: ${isUser ? "User Mode" : "Developer Mode"}. Click to toggle.`}
      >
        {/* Status Icon Badge */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
            isUser
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-800 text-emerald-400 border border-slate-600 font-mono text-[10px]"
          }`}
        >
          {isUser ? "👤" : "</>"}
        </div>

        {/* Text Details */}
        <div className="text-left">
          <div
            className={`text-[9px] uppercase tracking-wider font-extrabold leading-none ${
              isUser ? "text-slate-400" : "text-slate-400"
            }`}
          >
            Status
          </div>
          <div
            className={`text-xs font-black leading-tight mt-0.5 ${
              isUser ? "text-slate-900" : "text-white"
            }`}
          >
            {isUser ? "User Mode" : "Developer Mode"}
          </div>
        </div>

        {/* Right Arrow / Toggle Action Indicator */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isUser) {
              handleSwitchToDev(e);
            } else {
              handleSwitchToUser(e);
            }
          }}
          className={`ml-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150 cursor-pointer ${
            isUser
              ? "bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white"
              : "bg-slate-800 text-slate-300 hover:bg-emerald-400 hover:text-slate-950"
          }`}
          title={isUser ? "Switch to Developer Mode" : "Switch to User Mode"}
        >
          ➔
        </button>
      </div>
    </div>
  );
}
