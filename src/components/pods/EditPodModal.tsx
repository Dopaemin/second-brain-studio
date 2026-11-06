import { useState, useEffect, useMemo } from "react";
import { X, Folder, Users, Target, Palette, Check } from "lucide-react";
import { Pod, PodColor, COLOR_VARIANTS } from "@/lib/pods";
import { cn } from "@/lib/utils";

interface EditPodModalProps {
  isOpen: boolean;
  pod: Pod | null;
  onClose: () => void;
  availableFolders?: string[];
  onSave: (
    id: string,
    data: {
      name: string;
      mission: string;
      team: string;
      color: PodColor;
      documentPath: string;
    }
  ) => void;
}

const DEFAULT_PRESET_PATHS = [
  "02 Projekte/Work",
  "04 Ressourcen/Sustainability in EPM – Omni Agent",
  "04 Ressourcen/SAP Green Ledger",
  "04 Ressourcen/AI und KI",
  "04 Ressourcen/Dev Snippets",
  "05 Daily Notes/Sessions",
  "Pods/Team-Wiki",
];

export function EditPodModal({
  isOpen,
  pod,
  onClose,
  availableFolders = [],
  onSave,
}: EditPodModalProps) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [mission, setMission] = useState("");
  const [documentPath, setDocumentPath] = useState("");
  const [color, setColor] = useState<PodColor>("emerald");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when pod changes or modal opens
  useEffect(() => {
    if (pod) {
      setName(pod.name);
      setTeam(pod.team);
      setMission(pod.mission);
      setDocumentPath(pod.documentPath);
      setColor(pod.color);
    }
  }, [pod, isOpen]);

  // Handle ESC
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

  // Merge default preset paths with real discovered vault folders
  const allFolderSuggestions = useMemo(() => {
    const set = new Set([...DEFAULT_PRESET_PATHS, ...availableFolders]);
    return Array.from(set).slice(0, 8);
  }, [availableFolders]);

  if (!isOpen || !pod) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    onSave(pod.id, {
      name: name.trim(),
      team: team.trim() || "Team",
      mission: mission.trim(),
      color,
      documentPath: documentPath.trim() || pod.documentPath,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-hairline rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline bg-[#fafaf8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "w-3 h-3 rounded-full shadow-xs transition-colors",
                COLOR_VARIANTS[color]?.dotClass || "bg-emerald-500"
              )}
            />
            <div>
              <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                Pod-Einstellungen & Pfad
              </h3>
              <p className="font-mono text-[10px] text-[var(--text-muted)] truncate">
                Name, Dokumenten-Pfad & LLM Wiki konfigurieren
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4] transition-colors cursor-pointer"
            title="Schließen (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Pod Name */}
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1">
              Pod-Titel / Name *
            </label>
            <input
              type="text"
              required
              placeholder="z.B. Pod 2 – Integrated Finance & Sustainability"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)] focus:ring-1 focus:ring-[var(--accent-cobalt)]"
            />
          </div>

          {/* Team / Squad & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-[var(--text-muted)]" />
                <span>Team / Squad</span>
              </label>
              <input
                type="text"
                placeholder="z.B. Omni Agent Squad"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Palette className="w-3 h-3 text-[var(--text-muted)]" />
                <span>Status-Farbe</span>
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {(Object.keys(COLOR_VARIANTS) as PodColor[]).map((c) => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      title={COLOR_VARIANTS[c].label}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer",
                        isSelected
                          ? "ring-2 ring-[var(--accent-cobalt)] ring-offset-1 scale-110 shadow-xs"
                          : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <span className={cn("w-3.5 h-3.5 rounded-full", COLOR_VARIANTS[c].dotClass)} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Document Path in Vault */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] flex items-center gap-1">
                <Folder className="w-3 h-3 text-[var(--accent-cobalt)]" />
                <span>Dokumenten-Pfad im Vault *</span>
              </label>
              <span className="font-mono text-[9.5px] text-[var(--text-muted)]">
                Relativ zu Second Brain
              </span>
            </div>
            <input
              type="text"
              required
              value={documentPath}
              onChange={(e) => setDocumentPath(e.target.value)}
              placeholder="z.B. 04 Ressourcen/Sustainability in EPM – Omni Agent"
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)] focus:ring-1 focus:ring-[var(--accent-cobalt)]"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Alle Notizen in diesem Ordner werden automatisch dem Pod zugeordnet und vom Wiki Copilot durchsucht.
            </p>

            {/* Quick Folder Suggestions */}
            <div className="mt-2 pt-1 border-t border-hairline/60">
              <span className="text-[9.5px] text-[var(--text-muted)] font-mono uppercase tracking-wider block mb-1">
                Schnellauswahl aus dem Vault:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 max-h-[85px] overflow-y-auto no-scrollbar">
                {allFolderSuggestions.map((p) => {
                  const isCurrent = documentPath.trim() === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDocumentPath(p)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1",
                        isCurrent
                          ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border-[var(--accent-cobalt-border)] font-medium"
                          : "bg-[#f2f2ed] hover:bg-[#eaeae4] text-[var(--text-secondary)] border-hairline"
                      )}
                    >
                      <Folder className="w-2.5 h-2.5 opacity-70" />
                      <span>{p.split("/").pop()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mission / Teamaufgabe */}
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Teamaufgabe & Mission (LLM Wiki Kontext)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Welche Aufgabe löst dieser Pod? Worauf soll der LLM Wiki Copilot trainiert sein?"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)] leading-relaxed"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Dieser Text dient als systemischer Fokus-Prompt für den Wiki Copilot.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[4px] border border-hairline text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#fafaf8] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !documentPath.trim()}
              className="px-4 py-1.5 rounded-[4px] bg-[var(--accent-cobalt)] hover:bg-[var(--accent-cobalt-hover)] text-white dark:text-zinc-950 dark:font-semibold text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
