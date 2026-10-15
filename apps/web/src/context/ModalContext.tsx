"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ModalType = "success" | "error" | "warning" | "info";

export interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
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
    setModalState({
      isOpen: true,
      options: {
        type: options.type || "info",
        title: options.title || getDefaultTitle(options.type || "info"),
        confirmText: options.confirmText || "OK",
        ...options
      }
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const showSuccess = (message: string, title?: string) => {
    showModal({ title: title || "Success", message, type: "success" });
  };

  const showError = (message: string, title?: string) => {
    showModal({ title: title || "Error", message, type: "error" });
  };

  const showWarning = (message: string, title?: string) => {
    showModal({ title: title || "Warning", message, type: "warning" });
  };

  const showInfo = (message: string, title?: string) => {
    showModal({ title: title || "Notice", message, type: "info" });
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    showModal({
      title: title || "Please Confirm",
      message,
      type: "warning",
      confirmText: "Confirm",
      cancelText: "Cancel",
      onConfirm
    });
  };

  // Intercept window.alert so even unexpected alerts render gracefully in the modal
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const msgStr = typeof message === "object" ? JSON.stringify(message) : String(message || "");
      const isError = msgStr.toLowerCase().includes("error") || msgStr.toLowerCase().includes("failed") || msgStr.toLowerCase().includes("rejected");
      const isSuccess = msgStr.toLowerCase().includes("success") || msgStr.toLowerCase().includes("approved");

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

      {/* Universal Message Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform scale-100 animate-in zoom-in-95 duration-200 space-y-4">
            {/* Header Icon + Title */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">{getIcon(options.type || "info")}</div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {options.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              {options.cancelText && (
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    if (options.onCancel) options.onCancel();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
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
                className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${getButtonClass(
                  options.type || "info"
                )}`}
              >
                {options.confirmText || "OK"}
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
      return "Warning";
    case "info":
    default:
      return "Information";
  }
}

function getIcon(type: ModalType) {
  switch (type) {
    case "success":
      return (
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "error":
      return (
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "warning":
      return (
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case "info":
    default:
      return (
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

function getButtonClass(type: ModalType) {
  switch (type) {
    case "success":
      return "bg-emerald-600 hover:bg-emerald-700";
    case "error":
      return "bg-red-600 hover:bg-red-700";
    case "warning":
      return "bg-amber-600 hover:bg-amber-700";
    case "info":
    default:
      return "bg-slate-900 hover:bg-slate-800";
  }
}
