import { noteLabel } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { Search, FileText, ArrowRight, X } from "lucide-react";
import { useVaultFiles } from "@/hooks/useVaultFiles";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: "work" | "private";
  onSwitchMode: (mode: "work" | "private") => void;
  onSelectFile?: (path: string) => void;
  onOpenSettings?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  currentMode,
  onSwitchMode,
  onSelectFile,
  onOpenSettings,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const { files: workFiles } = useVaultFiles("work");
  const { files: privateFiles } = useVaultFiles("private");

  const allFiles = useMemo(() => {
    return [...workFiles, ...privateFiles];
  }, [workFiles, privateFiles]);

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 8);
    const q = query.toLowerCase();
    return allFiles.filter(
      (f) =>
        noteLabel(f.path).toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [allFiles, query]);

  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [query, isOpen]);
  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(filteredFiles.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const f = filteredFiles[active];
        if (f) {
          e.preventDefault();
          onSelectFile?.(f.path);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredFiles, active, onSelectFile]);

  if (!isOpen) return null;

  const handleFileClick = (path: string) => {
    if (onSelectFile) {
      onSelectFile(path);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/25 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white border border-hairline rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline bg-[#fafaf8]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dokument oder Befehl suchen…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="font-mono text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-black/[0.04] border border-hairline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-hairline">
          {/* Action Switch */}
          <div className="pb-1.5">
            <p className="px-3 py-1 font-mono text-[9.5px] uppercase tracking-wider text-[var(--text-muted)]">
              Aktionen
            </p>
            <button
              type="button"
              onClick={() => {
                onSwitchMode(currentMode === "work" ? "private" : "work");
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs text-[var(--text-primary)] hover:bg-[#f4f4ee] transition-colors cursor-pointer"
            >
              <span>
                Zu <strong>{currentMode === "work" ? "Privat" : "Arbeit"}</strong> wechseln
              </span>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs text-[var(--text-primary)] hover:bg-[#f4f4ee] transition-colors cursor-pointer"
              >
                <span>Einstellungen & Typografie öffnen</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">⌘,</span>
              </button>
            )}
          </div>

          {/* Documents */}
          <div className="pt-1.5">
            <p className="px-3 py-1 font-mono text-[9.5px] uppercase tracking-wider text-[var(--text-muted)]">
              {query.trim() ? "Suchergebnisse" : "Häufig verwendet"}
            </p>
            {filteredFiles.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
                Keine Dokumente gefunden
              </div>
            ) : (
              filteredFiles.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => handleFileClick(file.path)}
                  onMouseEnter={() => setActive(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs text-left transition-colors group cursor-pointer ${idx === active ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)]" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)] shrink-0" />
                    <div className="truncate">
                      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)]">
                        {noteLabel(file.path)}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">
                        {file.category}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--accent-cobalt)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Öffnen ↵
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#fafaf8] border-t border-hairline flex items-center justify-between font-mono text-[10.5px] text-[var(--text-muted)]">
          <span>↑↓ Navigieren • ↵ Auswählen</span>
          <span>Knowledge Workspace Spotlight</span>
        </div>
      </div>
    </div>
  );
}
