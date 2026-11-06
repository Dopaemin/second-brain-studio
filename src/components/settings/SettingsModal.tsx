import { useState, useEffect } from "react";
import {
  X,
  Type,
  Sparkles,
  Check,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAppearanceSettings,
  FontFamily,
  TextSize,
  ReaderWidth,
  LineSpacing,
} from "@/hooks/useAppearanceSettings";
import {
  getStoredConfig,
  saveStoredConfig,
  DEFAULT_CONFIG,
  AgentConfig,
} from "@/lib/aiAgent";
import {
  getWorkVault,
  getPrivateVault,
  setVaultPaths,
  resetVaultPaths,
} from "@/hooks/useVaultFiles";

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.7-11.7-13.98-5.34-8.24-9.59-17.65-12.75-28.23-3.16-10.59-4.74-20.93-4.74-31.05 0-14.78 3.82-26.79 11.45-36.03 7.64-9.24 17.07-13.98 28.3-14.22 4.47 0 9.77 1.25 15.9 3.75 6.13 2.5 10.02 3.84 11.66 4.02 1.63-.18 5.75-1.58 12.37-4.22 6.61-2.63 12.18-3.8 16.71-3.5 12.44.88 22.38 5.66 29.83 14.33-10.98 6.64-16.35 15.65-16.12 27.02.24 8.87 3.55 16.32 9.94 22.36 6.39 6.04 14.15 9.53 23.27 10.47-2.34 6.94-5.22 14.07-8.64 21.39zm-38.33-118.6c0 7.37-2.66 14.39-7.98 21.05-5.32 6.67-11.83 10.82-19.53 12.47-.24-.95-.41-2.02-.5-3.21-.1-1.19-.15-2.22-.15-3.08 0-7.07 2.87-14.05 8.62-20.94 5.75-6.89 12.38-11.08 19.89-12.57.1.92.15 1.83.15 2.73z" />
    </svg>
  );
}

interface FontOption {
  id: FontFamily;
  name: string;
  tag: string;
  category: "apple" | "curated";
  badge?: string;
  preview: string;
  fontClass: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useAppearanceSettings();
  const [activeTab, setActiveTab] = useState<"typography" | "ai" | "vaults">("typography");

  // AI config state inside settings
  const [aiConfig, setAiConfig] = useState<AgentConfig>(getStoredConfig);
  const [savedAiSuccess, setSavedAiSuccess] = useState(false);

  // Vault paths state
  const [workVaultInput, setWorkVaultInput] = useState(getWorkVault);
  const [privateVaultInput, setPrivateVaultInput] = useState(getPrivateVault);
  const [savedVaultSuccess, setSavedVaultSuccess] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fontOptions: FontOption[] = [
    // Apple Native System Fonts
    {
      id: "sf-pro",
      name: "Apple SF Pro",
      tag: "San Francisco",
      category: "apple",
      badge: "macOS System",
      preview: "Klares, zeitloses Schweizer Design von Apple – kristallklar auf allen Mac Retina-Displays.",
      fontClass: "font-apple-sans",
    },
    {
      id: "new-york",
      name: "Apple New York",
      tag: "Editorial Serif",
      category: "apple",
      badge: "Apple Books",
      preview: "Apples elegante Serif-Schrift mit historischen Proportionen für literarisches, ruhiges Lesen.",
      fontClass: "font-apple-serif",
    },
    {
      id: "sf-mono",
      name: "Apple SF Mono",
      tag: "Xcode & Terminal",
      category: "apple",
      badge: "Developer",
      preview: "Präzise Monospace-Schrift für saubere Markdown-Syntax, Tabellen und Code-Snippets.",
      fontClass: "font-apple-mono",
    },
    {
      id: "sf-rounded",
      name: "Apple SF Rounded",
      tag: "Sanft & Freundlich",
      category: "apple",
      badge: "Abgerundet",
      preview: "Harmonische Rundungen an den Ecken für ein besonders sanftes, zugängliches Schriftbild.",
      fontClass: "font-apple-rounded",
    },

    // Curated & Web Fonts
    {
      id: "sans",
      name: "Geist Sans",
      tag: "Modern & Minimal",
      category: "curated",
      badge: "Vercel",
      preview: "Klares Schweizer Neo-Grotesk-Design für strukturierte Wissensarbeit und Übersicht.",
      fontClass: "font-sans",
    },
    {
      id: "serif",
      name: "Newsreader",
      tag: "Buch & Magazin",
      category: "curated",
      badge: "Klassiker",
      preview: "Klassische Typografie mit hohem Kontrast für lange, ermüdungsfreie Lese-Sessions.",
      fontClass: "font-editorial",
    },
    {
      id: "mono",
      name: "JetBrains Mono",
      tag: "Technisch & Code",
      category: "curated",
      badge: "IDE Standard",
      preview: "Erhöhte x-Höhe und optimierte Zeichenbreite für Code, Daten und Markdown.",
      fontClass: "font-mono",
    },
  ];

  const textSizeOptions: { id: TextSize; label: string; desc: string; badge?: string }[] = [
    { id: "sm", label: "S", desc: "Kompakt (13.5px)" },
    { id: "base", label: "M", desc: "Standard (15px)" },
    { id: "lg", label: "L", desc: "Lesefreundlich (17px)", badge: "Empfohlen" },
    { id: "xl", label: "XL", desc: "Groß (19px)", badge: "Große Monitore" },
  ];

  const readerWidthOptions: { id: ReaderWidth; label: string; width: string }[] = [
    { id: "normal", label: "Standard", width: "780px" },
    { id: "wide", label: "Großzügig", width: "960px" },
    { id: "full", label: "Vollbreite", width: "100%" },
  ];

  const lineSpacingOptions: { id: LineSpacing; label: string; height: string }[] = [
    { id: "normal", label: "Kompakt", height: "1.6" },
    { id: "relaxed", label: "Komfortabel", height: "1.78" },
    { id: "loose", label: "Großzügig", height: "1.96" },
  ];

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredConfig(aiConfig);
    setSavedAiSuccess(true);
    setTimeout(() => setSavedAiSuccess(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[var(--bg-surface)] border border-hairline rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-hairline bg-[var(--bg-subtle)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-editorial text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Einstellungen & Erscheinungsbild
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Personalisiere Dark Mode, Lesbarkeit, Apple-Schriftarten und Integrationen.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            title="Schließen (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-hairline bg-[var(--bg-subtle)] gap-4 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("typography")}
            className={cn(
              "py-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "typography"
                ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Erscheinungsbild & Typografie</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "py-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "ai"
                ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>KI Copilot & Proxy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vaults")}
            className={cn(
              "py-2.5 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-2",
              activeTab === "vaults"
                ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Vaults & Infos</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "typography" && (
            <>
              {/* Section 1: Farbschema & Dark Mode (Apple Obsidian - ZERO Navy / Marine Blue) */}
              <div className="pb-6 border-b border-hairline">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono block">
                      1. Farbschema & Dark Mode
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Reines Apple-Design: Garantiert 100% frei von Dunkelblau oder Marineblau.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-hairline">
                    Aktuell: {settings.theme === "dark" ? "Dunkel (Graphit)" : settings.theme === "light" ? "Hell (Papier)" : "System (macOS)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option: Hell */}
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: "light" })}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer relative",
                      settings.theme === "light"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] shadow-xs ring-1 ring-[var(--accent-cobalt)]"
                        : "border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {settings.theme === "light" && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-xs text-[var(--text-primary)]">
                        Hell (Light)
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Warmes, augenschonendes Papierweiß für helle Arbeitsumgebungen.
                    </p>
                  </button>

                  {/* Option: Dunkel (Apple Obsidian / Graphit - KEIN Dunkelblau) */}
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: "dark" })}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer relative",
                      settings.theme === "dark"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] shadow-xs ring-1 ring-[var(--accent-cobalt)]"
                        : "border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {settings.theme === "dark" && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Moon className="w-4 h-4 text-[var(--text-primary)]" />
                      <span className="font-semibold text-xs text-[var(--text-primary)]">
                        Dunkel (Graphit)
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Reines Apple-Anthrazit (#121212). Tiefes Schwarz ohne Marineblau/Blaustich.
                    </p>
                  </button>

                  {/* Option: System (macOS) */}
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: "system" })}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-lg border transition-all cursor-pointer relative",
                      settings.theme === "system"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] shadow-xs ring-1 ring-[var(--accent-cobalt)]"
                        : "border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {settings.theme === "system" && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Monitor className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="font-semibold text-xs text-[var(--text-primary)]">
                        System (macOS)
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Folgt automatisch den Hell-/Dunkel-Einstellungen deines Mac-Betriebssystems.
                    </p>
                  </button>
                </div>
              </div>

              {/* Section 2: Schriftarten (Apple System & Curated) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono block">
                      2. Schriftart wählen ({fontOptions.length} Varianten)
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Wähle zwischen nativer Apple-Typografie für macOS und klassischen Schriftarten.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)]">
                    Aktiv: {fontOptions.find((f) => f.id === settings.fontFamily)?.name ?? settings.fontFamily}
                  </span>
                </div>

                {/* Apple System Typografie (macOS) */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                    <AppleLogo className="w-3 h-3 text-[var(--text-primary)]" />
                    <span>Apple System Typografie (macOS)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fontOptions
                      .filter((f) => f.category === "apple")
                      .map((f) => {
                        const isSelected = settings.fontFamily === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => updateSettings({ fontFamily: f.id })}
                            className={cn(
                              "flex flex-col text-left p-3 rounded-lg border transition-all cursor-pointer relative",
                              isSelected
                                ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] shadow-xs ring-1 ring-[var(--accent-cobalt)]"
                                : "border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 pr-5">
                              <span className="font-semibold text-xs text-[var(--text-primary)]">
                                {f.name}
                              </span>
                              {f.badge && (
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-hairline text-[var(--text-secondary)]">
                                  {f.badge}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[9.5px] uppercase text-[var(--text-muted)] mt-0.5">
                              {f.tag}
                            </span>
                            <p
                              className={cn(
                                "text-[12px] text-[var(--text-secondary)] mt-2 line-clamp-2 leading-snug",
                                f.fontClass
                              )}
                            >
                              {f.preview}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Redaktionelle & Entwickler Schriften */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                    <Type className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Redaktionelle & Entwickler Schriften</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {fontOptions
                      .filter((f) => f.category === "curated")
                      .map((f) => {
                        const isSelected = settings.fontFamily === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => updateSettings({ fontFamily: f.id })}
                            className={cn(
                              "flex flex-col text-left p-3 rounded-lg border transition-all cursor-pointer relative",
                              isSelected
                                ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] shadow-xs ring-1 ring-[var(--accent-cobalt)]"
                                : "border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 pr-5">
                              <span className="font-semibold text-xs text-[var(--text-primary)]">
                                {f.name}
                              </span>
                              {f.badge && (
                                <span className="font-mono text-[8.5px] uppercase px-1 py-0.2 rounded bg-hairline text-[var(--text-muted)]">
                                  {f.badge}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[9.5px] uppercase text-[var(--text-muted)] mt-0.5">
                              {f.tag}
                            </span>
                            <p
                              className={cn(
                                "text-[12px] text-[var(--text-secondary)] mt-2 line-clamp-2 leading-snug",
                                f.fontClass
                              )}
                            >
                              {f.preview}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Section 3: Schriftgröße (Text Scale) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono block">
                      3. Schriftgröße & Skalierung
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Vergrößert Notizen, Listen und Copilot für entspanntes Lesen.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {textSizeOptions.map((opt) => {
                    const isSelected = settings.textSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ textSize: opt.id })}
                        className={cn(
                          "flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all cursor-pointer text-center relative",
                          isSelected
                            ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] font-semibold shadow-xs"
                            : "border-hairline bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2 px-1.5 py-0.2 rounded-full font-mono text-[8.5px] uppercase tracking-wide bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 font-medium">
                            {opt.badge}
                          </span>
                        )}
                        <span className="text-base font-bold mb-0.5">{opt.label}</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4 & 5: Notizen Lesebreite & Zeilenabstand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono block mb-2">
                    4. Lesebreite (Spalte)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {readerWidthOptions.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => updateSettings({ readerWidth: w.id })}
                        className={cn(
                          "py-2 px-1 rounded border text-xs text-center transition-all cursor-pointer font-medium",
                          settings.readerWidth === w.id
                            ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                            : "border-hairline bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        <div>{w.label}</div>
                        <div className="text-[9.5px] text-[var(--text-muted)] font-mono">{w.width}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono block mb-2">
                    5. Zeilenabstand
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {lineSpacingOptions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateSettings({ lineSpacing: s.id })}
                        className={cn(
                          "py-2 px-1 rounded border text-xs text-center transition-all cursor-pointer font-medium",
                          settings.lineSpacing === s.id
                            ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                            : "border-hairline bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        <div>{s.label}</div>
                        <div className="text-[9.5px] text-[var(--text-muted)] font-mono">{s.height}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-hairline">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-hairline">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">
                    Live-Vorschau deines Notizen-Texts:
                  </span>
                  <span className="font-mono text-[10px] text-[var(--accent-cobalt)]">
                    {fontOptions.find((f) => f.id === settings.fontFamily)?.name ?? settings.fontFamily} • {settings.textSize.toUpperCase()} • {settings.lineSpacing}
                  </span>
                </div>
                <h3 className="font-editorial text-lg font-normal mb-1.5 text-[var(--text-primary)]">
                  Architektur & Wissensmanagement im Second Brain
                </h3>
                <p
                  className="text-[var(--reader-font-size,17px)] text-[var(--text-secondary)] transition-all"
                  style={{ lineHeight: "var(--reader-line-height, 1.76)" }}
                >
                  Gedanken werden präziser, wenn die Umgebung ruhig und klar ist. Mit der richtigen Schriftgröße
                  und Schriftart liest du Notizen flüssig und ermüdungsfrei auf jedem Bildschirm.
                </p>
              </div>

              {/* Reset Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={resetSettings}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Auf Standard-Erscheinungsbild zurücksetzen</span>
                </button>
              </div>
            </>
          )}

          {activeTab === "ai" && (
            <form onSubmit={handleSaveAi} className="space-y-4 text-xs">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  HAI Proxy & LLM Agent Konfiguration
                </h3>
                <p className="text-[var(--text-muted)] mt-0.5">
                  Verbindet das Dashboard mit deinem lokalen Hyperspace AI Proxy.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  Bevorzugtes Sprachmodell
                </label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-hairline rounded-[4px] text-xs outline-none"
                >
                  <option value="gpt-4.1-mini">gpt-4.1-mini (Schnellste Antwortzeit • Empfohlen)</option>
                  <option value="gpt-4.1">gpt-4.1 (Standard)</option>
                  <option value="gpt-5-mini">gpt-5-mini (Hohe Reasoning-Intelligenz)</option>
                  <option value="gpt-5">gpt-5 (Präzise Synthese)</option>
                  <option value="gpt-6.1-sol">gpt-6.1-sol (Hyperspace Agentic Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  Antwort-Tempo & Schreibfluss
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiConfig({ ...aiConfig, pacing: "natural" })}
                    className={cn(
                      "p-2.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between",
                      (aiConfig.pacing || "natural") === "natural"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                        : "border-hairline bg-white text-[var(--text-secondary)] hover:bg-[#fafaf8]"
                    )}
                  >
                    <div>
                      <span className="font-semibold text-xs block">🌿 Natürlich</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                        Fließender Lesefluss & natürliche Denkpausen
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase mt-2 px-1 py-0.2 rounded bg-black/[0.04] self-start">
                      Empfohlen
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiConfig({ ...aiConfig, pacing: "calm" })}
                    className={cn(
                      "p-2.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between",
                      aiConfig.pacing === "calm"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                        : "border-hairline bg-white text-[var(--text-secondary)] hover:bg-[#fafaf8]"
                    )}
                  >
                    <div>
                      <span className="font-semibold text-xs block">🧘 Ruhig & Bedacht</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                        Entspanntes Tempo für komplexe Notizen
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase mt-2 px-1 py-0.2 rounded bg-black/[0.04] self-start">
                      Bedacht
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiConfig({ ...aiConfig, pacing: "instant" })}
                    className={cn(
                      "p-2.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between",
                      aiConfig.pacing === "instant"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]"
                        : "border-hairline bg-white text-[var(--text-secondary)] hover:bg-[#fafaf8]"
                    )}
                  >
                    <div>
                      <span className="font-semibold text-xs block">⚡️ Sofort</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                        Direkte Ausgabe ohne Schreib-Animation
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase mt-2 px-1 py-0.2 rounded bg-black/[0.04] self-start">
                      Direkt
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  Endpunkt-URL (Lokal)
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-hairline rounded-[4px] font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">
                  API Key (Laufende Session)
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-hairline rounded-[4px] font-mono text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-hairline">
                {savedAiSuccess ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Einstellungen erfolgreich gespeichert!</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAiConfig(DEFAULT_CONFIG)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Standardwerte laden
                  </button>
                )}

                <button
                  type="submit"
                  className="editorial-btn editorial-btn-primary px-4 py-1.5 text-xs"
                >
                  Speichern
                </button>
              </div>
            </form>
          )}

          {activeTab === "vaults" && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  Verbundene Knowledge Vaults
                </h3>
                <p className="text-[var(--text-muted)] mt-0.5">
                  Verbinde deine lokalen Obsidian Markdown-Verzeichnisse auf deinem Rechner.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setVaultPaths(workVaultInput, privateVaultInput);
                  setSavedVaultSuccess(true);
                  setTimeout(() => setSavedVaultSuccess(false), 2500);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1 uppercase font-semibold">
                    Arbeit / Second Brain Pfad:
                  </label>
                  <input
                    type="text"
                    value={workVaultInput}
                    onChange={(e) => setWorkVaultInput(e.target.value)}
                    placeholder="/Users/username/Documents/second-brain"
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-hairline rounded-[4px] font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1 uppercase font-semibold">
                    Privat / Personal Brain Pfad:
                  </label>
                  <input
                    type="text"
                    value={privateVaultInput}
                    onChange={(e) => setPrivateVaultInput(e.target.value)}
                    placeholder="/Users/username/Documents/personal-brain"
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-hairline rounded-[4px] font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  {savedVaultSuccess ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Vault-Pfade erfolgreich gespeichert!</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        resetVaultPaths();
                        setWorkVaultInput(getWorkVault());
                        setPrivateVaultInput(getPrivateVault());
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Auf Standard zurücksetzen
                    </button>
                  )}

                  <button
                    type="submit"
                    className="editorial-btn editorial-btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Pfade speichern
                  </button>
                </div>
              </form>

              <div className="pt-2">
                <h4 className="font-semibold text-xs text-[var(--text-primary)] mb-2">
                  Tastatur-Kürzel Übersicht:
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded border border-hairline bg-[var(--bg-subtle)] flex justify-between">
                    <span>Dokumentensuche:</span>
                    <kbd className="px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded border border-hairline">⌘K</kbd>
                  </div>
                  <div className="p-2 rounded border border-hairline bg-[var(--bg-subtle)] flex justify-between">
                    <span>Wiki Copilot:</span>
                    <kbd className="px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded border border-hairline">⌘J</kbd>
                  </div>
                  <div className="p-2 rounded border border-hairline bg-[var(--bg-subtle)] flex justify-between">
                    <span>Einstellungen:</span>
                    <kbd className="px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded border border-hairline">⌘,</kbd>
                  </div>
                  <div className="p-2 rounded border border-hairline bg-[var(--bg-subtle)] flex justify-between">
                    <span>Zurück / Schließen:</span>
                    <kbd className="px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded border border-hairline">ESC</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
