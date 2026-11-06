import { useState, useEffect } from "react";
import { WorkDashboard } from "./components/work/WorkDashboard";
import { PrivateDashboard } from "./components/private/PrivateDashboard";
import { ModeSwitch } from "./components/ModeSwitch";
import { CommandPalette } from "./components/CommandPalette";
import { AiCopilotDrawer } from "./components/ai/AiCopilotDrawer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useAppearanceSettings } from "./hooks/useAppearanceSettings";
import { Search, Compass, Sparkles, Sliders, Sun, Moon } from "lucide-react";
import { cn } from "./lib/utils";
import { isTauri } from "./lib/backend";
import { startDragging, toggleMaximize } from "./lib/window";

export default function App() {
  // Sync appearance settings (font family, text size scale, line spacing, theme)
  const { isDark, toggleTheme } = useAppearanceSettings();

  const [mode, setMode] = useState<"work" | "private">(() => {
    try {
      const saved = localStorage.getItem("dashboard_mode");
      if (saved === "work" || saved === "private") return saved;
    } catch {}
    return "work";
  });

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const isDesktopMac =
    typeof window !== "undefined" &&
    isTauri() &&
    (navigator.platform?.toUpperCase().includes("MAC") ||
      navigator.userAgent?.includes("Mac"));

  const handleModeChange = (newMode: "work" | "private") => {
    setMode(newMode);
    setSelectedFile(null);
  };

  useEffect(() => {
    localStorage.setItem("dashboard_mode", mode);
  }, [mode]);

  // Live formatted clock in German editorial style
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
      const timePart = now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(`${datePart} • ${timePart}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts: ⌘K for search palette, ⌘J for AI Copilot, ⌘, for settings, ⌘1/⌘2 for modes, Escape for back/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setAiDrawerOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        handleModeChange("work");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        handleModeChange("private");
      } else if (e.key === "Escape") {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (aiDrawerOpen) {
          setAiDrawerOpen(false);
        } else if (selectedFile) {
          setSelectedFile(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, settingsOpen, aiDrawerOpen, selectedFile]);

  // Open Copilot drawer automatically when dragging files from Finder/PC into the window
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        if (!aiDrawerOpen) {
          setAiDrawerOpen(true);
        }
      }
    };
    const handleWindowDrop = (e: DragEvent) => {
      // Prevent browser/WKWebView from navigating to dropped file path
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [aiDrawerOpen]);

  // Native window drag handler for moving the window smoothly on macOS & Tauri
  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      'button, input, textarea, a, select, [data-no-drag="true"], [data-interactive="true"]'
    );
    if (isInteractive) return;

    // Double-click on header background toggles window maximize (native macOS behavior)
    if (e.detail === 2) {
      toggleMaximize();
      return;
    }

    // Drag to move window
    startDragging();
  };

  return (
    <div
      data-mode={mode}
      className={cn(
        "relative flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] select-none",
        isDesktopMac && "rounded-[10px]"
      )}
    >
      {/* Editorial Header Bar with Native macOS Window Drag Region & Fixed Grid Layout */}
      <header
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        className={cn(
          "editorial-header relative z-20 h-12 grid grid-cols-[1fr_auto_1fr] items-center shrink-0 select-none",
          isDesktopMac ? "pl-[78px] pr-4" : "px-5"
        )}
      >
        {/* Left Column: Brand Identity & Search & AI Agent */}
        <div data-tauri-drag-region className="flex items-center gap-3 justify-start min-w-0 h-full">
          <div
            data-tauri-drag-region="false"
            onClick={() => setSelectedFile(null)}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
            title="Zurück zum Workspace (Esc)"
          >
            <Compass className="w-4 h-4 text-[var(--text-primary)]" />
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-base tracking-tight text-[var(--text-primary)] font-normal">
                Second Brain
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">
                Studio
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-hairline shrink-0" />

          {/* Minimalist Spotlight Search */}
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#f2f2ed] hover:bg-[#ebebe5] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border border-hairline shrink-0"
          >
            <Search className="w-3 h-3 text-[var(--text-faint)]" />
            <span className="text-[11.5px]">Dokument suchen…</span>
            <kbd className="font-mono text-[9.5px] px-1 py-0.2 rounded bg-white border border-hairline text-[var(--text-muted)]">
              ⌘K
            </kbd>
          </button>

          {/* AI Wiki Copilot Trigger */}
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => setAiDrawerOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs transition-colors cursor-pointer border shrink-0",
              aiDrawerOpen
                ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border-[var(--accent-cobalt-border)] font-medium shadow-2xs"
                : "bg-[#f2f2ed] hover:bg-[#ebebe5] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-hairline"
            )}
            title="Wiki Copilot öffnen (⌘J)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
            <span className="text-[11.5px]">Wiki Copilot</span>
            <kbd className="font-mono text-[9.5px] px-1 py-0.2 rounded bg-white border border-hairline text-[var(--text-muted)]">
              ⌘J
            </kbd>
          </button>
        </div>

        {/* Center Column: Mode Segmented Control (Permanently centered, zero layout shift) */}
        <div data-tauri-drag-region className="flex items-center justify-center shrink-0 px-3 h-full">
          <div data-tauri-drag-region="false">
            <ModeSwitch mode={mode} onChange={handleModeChange} />
          </div>
        </div>

        {/* Right Column: Theme Switch, Settings, Timestamp & Status */}
        <div data-tauri-drag-region className="flex items-center gap-2 sm:gap-3 justify-end min-w-0 h-full">
          {/* Quick Light / Dark Mode Switch with Constant Fixed Width */}
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={toggleTheme}
            className="flex items-center justify-center gap-1.5 w-[76px] py-1 rounded-[4px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border border-hairline shadow-2xs shrink-0"
            title={
              isDark
                ? "Zum hellen Modus wechseln"
                : "Zum dunklen Modus wechseln (Reines Apple Obsidian / Anthrazit – kein Dunkelblau/Marineblau)"
            }
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
            )}
            <span className="text-[11.5px] font-medium hidden sm:inline w-[38px] text-left">
              {isDark ? "Hell" : "Dunkel"}
            </span>
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs transition-colors cursor-pointer border shrink-0",
              settingsOpen
                ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border-[var(--accent-cobalt-border)] font-medium"
                : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-hairline"
            )}
            title="Einstellungen, Erscheinungsbild & Lesbarkeit (⌘,)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11.5px] hidden sm:inline">Settings</span>
          </button>

          <div className="h-4 w-[1px] bg-hairline shrink-0" />

          {currentTime && (
            <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
              {currentTime}
            </span>
          )}

          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cobalt)]" />
            <span>Vault</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="relative z-10 flex-1 overflow-hidden min-h-0">
        {mode === "work" ? (
          <WorkDashboard
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        ) : (
          <PrivateDashboard
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}
      </main>

      {/* AI Wiki Copilot Drawer */}
      <AiCopilotDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        activeFilePath={selectedFile}
        onSelectFile={setSelectedFile}
        mode={mode}
      />

      {/* Settings & Typography Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        currentMode={mode}
        onSwitchMode={handleModeChange}
        onSelectFile={setSelectedFile}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    </div>
  );
}
