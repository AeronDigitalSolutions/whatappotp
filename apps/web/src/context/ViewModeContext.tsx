"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ViewMode = "USER" | "DEVELOPER";

interface ViewModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isDev: boolean;
  isUser: boolean;
  toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  mode: "USER",
  setMode: () => {},
  isDev: false,
  isUser: true,
  toggleMode: () => {}
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("USER");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ui_view_mode") as ViewMode | null;
      if (saved === "DEVELOPER" || saved === "USER") {
        setModeState(saved);
      } else {
        setModeState("USER");
      }
    } catch (e) {}

    const handleStorageChange = () => {
      try {
        const current = localStorage.getItem("ui_view_mode") as ViewMode | null;
        if (current === "DEVELOPER" || current === "USER") {
          setModeState(current);
        }
      } catch (e) {}
    };

    window.addEventListener("ui_view_mode_changed", handleStorageChange);
    return () => {
      window.removeEventListener("ui_view_mode_changed", handleStorageChange);
    };
  }, []);

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("ui_view_mode", newMode);
      window.dispatchEvent(new Event("ui_view_mode_changed"));
    } catch (e) {}
  };

  const toggleMode = () => {
    setMode(mode === "USER" ? "DEVELOPER" : "USER");
  };

  return (
    <ViewModeContext.Provider
      value={{
        mode,
        setMode,
        isDev: mode === "DEVELOPER",
        isUser: mode === "USER",
        toggleMode
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
