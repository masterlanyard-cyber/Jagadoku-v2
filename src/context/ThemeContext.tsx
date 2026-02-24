/**
 * ⚠️ THEME CONFIGURATION LOCKED ⚠️
 * 
 * DO NOT modify theme behavior, default theme, or color application logic.
 * See DESIGN_SPEC.md for complete documentation.
 * 
 * Version: 1.0.0
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "jagadoku-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  
  // Force background colors explicitly
  if (theme === "light") {
    root.style.backgroundColor = "#f8f9fc";
    root.style.colorScheme = "light";
    document.body.style.backgroundColor = "#f8f9fc";
  } else {
    root.style.backgroundColor = "#0b1220";
    root.style.colorScheme = "dark";
    document.body.style.backgroundColor = "#0b1220";
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return "light"; // Default to light mode for brighter appearance
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // Apply theme immediately on mount
    applyTheme(theme);
    
    // Also add a MutationObserver to detect if dark class is being added unexpectedly
    const observer = new MutationObserver(() => {
      if (theme === "light" && document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    
    return () => observer.disconnect();
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
