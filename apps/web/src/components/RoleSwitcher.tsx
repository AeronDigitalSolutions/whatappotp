"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePermissions, ROLE_PRESETS, RoleKey, ALL_MODULES } from "@/context/PermissionContext";

export default function RoleSwitcher() {
  const {
    activeRole,
    setActiveRole,
    activeRoleDef,
    customPermissions,
    toggleCustomPermission,
    setCustomPermissions
  } = usePermissions();

  const [isOpen, setIsOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const rolesList: RoleKey[] = [
    "SUPER_ADMIN",
    "OWNER",
    "SUPPORT",
    "MARKETING",
    "ECOMMERCE",
    "FINANCE",
    "CUSTOM"
  ];

  const handleSelectRole = (roleKey: RoleKey) => {
    setActiveRole(roleKey);
    setIsOpen(false);
    if (roleKey === "CUSTOM") {
      setShowCustomModal(true);
    }
  };

  const handleSelectAllCustom = () => {
    setCustomPermissions(ALL_MODULES.map(m => m.key));
  };

  const handleClearAllCustom = () => {
    setCustomPermissions([]);
  };

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {/* Switcher Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          title="Switch Active Testing Role"
        >
          <span className="flex items-center justify-center text-sm">
            {activeRoleDef.icon}
          </span>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 leading-tight">
                {activeRoleDef.badge}
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                Testing Switcher
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
              {activeRoleDef.label}
            </span>
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200/90 z-50 p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Switch Active Role</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Live RBAC Tester
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Switch roles to instantly experience the exact dashboard navigation, powers, and security barriers of each tier.
              </p>
            </div>

            {/* List of Roles */}
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {rolesList.map((key) => {
                const def = ROLE_PRESETS[key];
                const isSelected = activeRole === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectRole(key)}
                    type="button"
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white hover:bg-slate-50 text-slate-800 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <span className="text-lg p-1 shrink-0">{def.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {def.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        {def.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {def.permissions.slice(0, 4).map((p) => (
                          <span
                            key={p}
                            className={`text-[9px] px-1.5 py-0.2 rounded ${
                              isSelected
                                ? "bg-slate-800 text-slate-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p}
                          </span>
                        ))}
                        {def.permissions.length > 4 && (
                          <span className={`text-[9px] px-1 rounded ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                            +{def.permissions.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Permissions Quick Configure */}
            {activeRole === "CUSTOM" && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                <span className="text-[11px] text-slate-600 font-medium">
                  Configured: <strong>{customPermissions.length}</strong> / {ALL_MODULES.length} modules
                </span>
                <button
                  onClick={() => setShowCustomModal(true)}
                  type="button"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                >
                  ⚙️ Configure Modules
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Granular Permissions Simulator Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚙️</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Custom Role Simulator</h3>
                  <p className="text-xs text-slate-500">
                    Toggle individual modules to simulate an employee with bespoke powers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Active permissions: <strong className="text-slate-800">{customPermissions.length}</strong> of {ALL_MODULES.length} modules
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllCustom}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAllCustom}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Module Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
              {ALL_MODULES.map((mod) => {
                const isChecked = customPermissions.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                      isChecked
                        ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium"
                        : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCustomPermission(mod.key)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-base">{mod.icon}</span>
                    <span className="text-xs font-semibold">{mod.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition shadow-xs"
              >
                Apply & Test Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
