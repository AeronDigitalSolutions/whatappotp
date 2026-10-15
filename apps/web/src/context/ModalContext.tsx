"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ModalType = "success" | "error" | "warning" | "info";

export interface ModalDetailItem {
  label: string;
  value: string;
}

export interface ModalOptions {
  title?: string;
  message?: string;
  type?: ModalType;
  badge?: string;
  details?: ModalDetailItem[];
  note?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger" | "warning" | "default";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  showSuccess: (message: string, title?: string, options?: Partial<ModalOptions>) => void;
  showError: (message: string, title?: string, options?: Partial<ModalOptions>) => void;
  showWarning: (message: string, title?: string, options?: Partial<ModalOptions>) => void;
  showInfo: (message: string, title?: string, options?: Partial<ModalOptions>) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, options?: Partial<ModalOptions>) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ModalOptions;
  }>({
    isOpen: false,
    options: { message: "" }
  });

  const showModal = (options: ModalOptions) => {
    // Smart parsing if plain text message has status or paragraphs
    let parsedBadge = options.badge;
    let parsedNote = options.note;
    let cleanMessage = options.message || "";

    if (!parsedBadge && cleanMessage.includes("Status:")) {
      const match = cleanMessage.match(/Status:\s*([A-Z\s\/]+)/i);
      if (match) {
        parsedBadge = match[1].trim();
        cleanMessage = cleanMessage.replace(/Status:\s*([A-Z\s\/]+)/i, "").trim();
      }
    }

    if (!parsedNote && cleanMessage.includes("\n\n")) {
      const parts = cleanMessage.split("\n\n");
      cleanMessage = parts[0].trim();
      parsedNote = parts.slice(1).join("\n\n").trim();
    }

    setModalState({
      isOpen: true,
      options: {
        type: options.type || "info",
        title: options.title || getDefaultTitle(options.type || "info"),
        confirmText: options.confirmText || "Got it",
        badge: parsedBadge,
        note: parsedNote,
        ...options,
        message: cleanMessage
      }
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const showSuccess = (message: string, title?: string, extra?: Partial<ModalOptions>) => {
    showModal({ title: title || "Success", message, type: "success", confirmVariant: "primary", ...extra });
  };

  const showError = (message: string, title?: string, extra?: Partial<ModalOptions>) => {
    showModal({ title: title || "Error Encountered", message, type: "error", confirmVariant: "danger", ...extra });
  };

  const showWarning = (message: string, title?: string, extra?: Partial<ModalOptions>) => {
    showModal({ title: title || "Attention", message, type: "warning", confirmVariant: "warning", ...extra });
  };

  const showInfo = (message: string, title?: string, extra?: Partial<ModalOptions>) => {
    showModal({ title: title || "Information", message, type: "info", confirmVariant: "default", ...extra });
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string, extra?: Partial<ModalOptions>) => {
    showModal({
      title: title || "Please Confirm",
      message,
      type: "warning",
      confirmText: "Yes, Confirm",
      cancelText: "Cancel",
      confirmVariant: "danger",
      onConfirm,
      ...extra
    });
  };

  // Intercept window.alert so even unexpected alerts render in the universal modal
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msgStr = typeof message === "object" ? JSON.stringify(message) : String(message || "");
      const isError =
        msgStr.toLowerCase().includes("error") ||
        msgStr.toLowerCase().includes("failed") ||
        msgStr.toLowerCase().includes("rejected");
      const isSuccess =
        msgStr.toLowerCase().includes("success") || msgStr.toLowerCase().includes("approved");

      showModal({
        title: isSuccess ? "Success" : isError ? "Action Notice" : "Message",
        message: msgStr,
        type: isSuccess ? "success" : isError ? "error" : "info"
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const { isOpen, options } = modalState;
  const buttonVariant = getButtonVariant(options);

  return (
    <ModalContext.Provider
      value={{
        showModal,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        closeModal
      }}
    >
      {children}

      {/* Universal Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform scale-100 animate-in zoom-in-95 duration-200 relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors text-base font-bold"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Header Icon & Title */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-3">
                {getIcon(options.type || "info", buttonVariant)}
              </div>

              {options.badge && (
                <div className="mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase border shadow-xs ${getBadgeStyle(options.type || "info")}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                    {options.badge}
                  </span>
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {options.title}
              </h3>

              {options.message && (
                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  {options.message}
                </p>
              )}
            </div>

            {/* Structured Details Card (if provided) */}
            {options.details && options.details.length > 0 && (
              <div className="mt-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 divide-y divide-slate-100 text-xs">
                {options.details.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between ${idx > 0 ? "pt-2.5" : ""} ${idx < options.details!.length - 1 ? "pb-2.5" : ""}`}>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-900 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-xs">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Helpful Note / Next Steps Banner */}
            {options.note && (
              <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-xs text-emerald-900 flex items-start gap-3 leading-relaxed">
                <span className="text-emerald-600 text-base shrink-0 mt-0.5">💡</span>
                <span className="font-medium">{options.note}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`mt-6 ${options.cancelText ? "grid grid-cols-2 gap-3" : "flex"}`}>
              {options.cancelText && (
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    if (options.onCancel) options.onCancel();
                  }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-center"
                >
                  {options.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => {
                  closeModal();
                  if (options.onConfirm) options.onConfirm();
                }}
                style={getButtonInlineStyle(buttonVariant)}
                className={`w-full py-3 px-5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer text-center ${getButtonClass(
                  buttonVariant
                )}`}
              >
                {options.confirmText || "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

function getDefaultTitle(type: ModalType) {
  switch (type) {
    case "success":
      return "Success";
    case "error":
      return "Error Encountered";
    case "warning":
      return "Action Required";
    case "info":
    default:
      return "Notice";
  }
}

function getButtonVariant(options: ModalOptions): "danger" | "warning" | "primary" | "default" {
  if (options.confirmVariant) return options.confirmVariant;
  const text = (options.confirmText || "").toLowerCase();
  const title = (options.title || "").toLowerCase();
  if (
    text.includes("delete") ||
    text.includes("remove") ||
    title.includes("delete") ||
    title.includes("remove") ||
    options.type === "error"
  ) {
    return "danger";
  }
  if (options.type === "warning") {
    return "warning";
  }
  if (options.type === "success") {
    return "primary";
  }
  return "default";
}

function getIcon(type: ModalType, variant?: "danger" | "warning" | "primary" | "default") {
  if (variant === "danger" || type === "error") {
    return (
      <div className="w-14 h-14 rounded-full bg-red-100/90 text-red-600 ring-8 ring-red-50 flex items-center justify-center shadow-sm">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
    );
  }
  switch (type) {
    case "success":
      return (
        <div className="w-14 h-14 rounded-full bg-emerald-100/90 text-emerald-600 ring-8 ring-emerald-50 flex items-center justify-center shadow-sm">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "warning":
      return (
        <div className="w-14 h-14 rounded-full bg-amber-100/90 text-amber-600 ring-8 ring-amber-50 flex items-center justify-center shadow-sm">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case "info":
    default:
      return (
        <div className="w-14 h-14 rounded-full bg-blue-100/90 text-blue-600 ring-8 ring-blue-50 flex items-center justify-center shadow-sm">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

function getBadgeStyle(type: ModalType) {
  switch (type) {
    case "success":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "error":
      return "bg-red-50 text-red-800 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "info":
    default:
      return "bg-blue-50 text-blue-800 border-blue-200";
  }
}

function getButtonClass(variant: "danger" | "warning" | "primary" | "default") {
  switch (variant) {
    case "danger":
      return "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20";
    case "warning":
      return "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20";
    case "primary":
      return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20";
    case "default":
    default:
      return "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20";
  }
}

function getButtonInlineStyle(variant: "danger" | "warning" | "primary" | "default"): React.CSSProperties {
  switch (variant) {
    case "danger":
      return { backgroundColor: "#dc2626", color: "#ffffff" };
    case "warning":
      return { backgroundColor: "#d97706", color: "#ffffff" };
    case "primary":
      return { backgroundColor: "#059669", color: "#ffffff" };
    case "default":
    default:
      return { backgroundColor: "#0f172a", color: "#ffffff" };
  }
}
