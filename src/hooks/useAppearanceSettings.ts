import { useState, useEffect, useCallback } from "react";

export type FontFamily =
  | "sf-pro"
  | "new-york"
  | "sf-mono"
  | "sf-rounded"
  | "sans"
  | "serif"
  | "mono";
export type TextSize = "sm" | "base" | "lg" | "xl";
export type ReaderWidth = "normal" | "wide" | "full";
export type LineSpacing = "normal" | "relaxed" | "loose";
export type ThemeMode = "light" | "dark" | "system";

export interface AppearanceSettings {
  fontFamily: FontFamily;
  textSize: TextSize;
  readerWidth: ReaderWidth;
  lineSpacing: LineSpacing;
  theme: ThemeMode;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontFamily: "sf-pro", // Default to native Apple SF Pro on macOS
  textSize: "lg", // Default to "Lesefreundlich" (16.5px) so the user can read comfortably!
  readerWidth: "wide",
  lineSpacing: "relaxed",
  theme: "light", // Pure neutral light canvas / can be toggled to pure Apple obsidian dark
};

function readStoredSettings(): AppearanceSettings {
  try {
    const saved = localStorage.getItem("dashboard_appearance_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.fontFamily === "serif") {
        parsed.fontFamily = "sf-pro";
      }
      return { ...DEFAULT_APPEARANCE, ...parsed };
    }
  } catch {}
  return DEFAULT_APPEARANCE;
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>(readStoredSettings);

  // Sync across component instances & windows
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<AppearanceSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener("appearance-settings-changed", handleSync);
    return () => window.removeEventListener("appearance-settings-changed", handleSync);
  }, []);

  // Apply attributes & theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-font", settings.fontFamily);
    root.setAttribute("data-text-size", settings.textSize);
    root.setAttribute("data-reader-width", settings.readerWidth);
    root.setAttribute("data-line-spacing", settings.lineSpacing);

    applyThemeToDocument(settings.theme);

    // If system theme, listen to OS dark mode change
    if (settings.theme === "system" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = () => {
        applyThemeToDocument("system");
      };
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem("dashboard_appearance_settings", JSON.stringify(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent("appearance-settings-changed", { detail: next })
      );
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APPEARANCE);
    try {
      localStorage.setItem("dashboard_appearance_settings", JSON.stringify(DEFAULT_APPEARANCE));
    } catch {}
    window.dispatchEvent(
      new CustomEvent("appearance-settings-changed", { detail: DEFAULT_APPEARANCE })
    );
  }, []);

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: isDark ? "light" : "dark" });
  }, [isDark, updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    isDark,
    toggleTheme,
  };
}
