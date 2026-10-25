"use client";

import React, { useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import Loader from "@/components/Loader";

interface TokenUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export default function TokenUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  projectId
}: TokenUpdateModalProps) {
  const { showSuccess, showError } = useModal();
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"quick" | "permanent">("permanent");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setLocalError("Please paste a valid Meta Access Token.");
      return;
    }
    if (!projectId) {
      setLocalError("Project ID missing. Please refresh the page.");
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/token/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token.trim(),
          projectId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Meta rejected the access token.");
      }

      showSuccess(
        `Access token verified and updated successfully for Meta user "${data.user?.name || "WhatsApp Business"}".`,
        "Meta Connected"
      );
      setToken("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || "Failed to update token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#0B101D] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#050811] dark:to-[#0c1424] text-white flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-xs">
              🔑
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Update Meta WhatsApp Token</h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">Reconnect or replace your Meta WhatsApp Cloud API credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Why Expired Alert */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Why did my token expire?
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              Meta temporary access tokens from the Graph API Explorer or standard Facebook Login expire automatically after 1–2 hours or 60 days. To eliminate token expiry forever, generate a <strong>Permanent System User Token (Never Expires)</strong> below.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                Paste Fresh Meta Access Token
              </label>
              <textarea
                rows={3}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="EAA..."
                className="w-full p-3 font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
              />
            </div>

            {localError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-xs font-medium">
                ❌ {localError}
              </div>
            )}

            {/* Instruction Tabs */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-4 bg-slate-50/70 dark:bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">How to get a new token:</span>
                <div className="flex gap-1 bg-white dark:bg-[#070b14] p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("permanent")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      activeTab === "permanent"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    ⭐ Permanent (Never Expires)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quick")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      activeTab === "quick"
                        ? "bg-slate-900 dark:bg-white/20 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    ⚡ Quick Fix (Explorer)
                  </button>
                </div>
              </div>

              {activeTab === "permanent" ? (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-bold text-emerald-800 dark:text-emerald-400">
                    Recommended for 100% automated production uptime:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                    <li>
                      Open{" "}
                      <a
                        href="https://business.facebook.com/settings/system-users"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        Meta Business Settings ➔ System Users ↗
                      </a>
                    </li>
                    <li>
                      Create or select an <strong>Admin System User</strong>.
                    </li>
                    <li>
                      Click <strong>Generate New Token</strong> and select your WhatsApp App.
                    </li>
                    <li>
                      Under <strong>Token expiration</strong>, select <strong>Never</strong>.
                    </li>
                    <li>
                      Check scopes: <code>whatsapp_business_management</code> &{" "}
                      <code>whatsapp_business_messaging</code>.
                    </li>
                    <li>Click Generate, copy the token, and paste it into the box above.</li>
                  </ol>
                </div>
              ) : (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Quick 1-minute test token:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                    <li>
                      Open{" "}
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        Meta Graph API Explorer ↗
                      </a>
                    </li>
                    <li>Select your Meta App in the top right.</li>
                    <li>
                      Under <strong>User or Page</strong>, select <strong>Get User Access Token</strong>.
                    </li>
                    <li>
                      Add permissions: <code>whatsapp_business_management</code> &{" "}
                      <code>whatsapp_business_messaging</code>.
                    </li>
                    <li>Click <strong>Generate Access Token</strong> and paste it above.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/[0.05] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader scale={0.5} color="#ffffff" />
                    <span>Verifying with Meta...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Verify & Save Token</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
