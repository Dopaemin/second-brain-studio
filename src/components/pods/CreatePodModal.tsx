import { useState, useEffect, useMemo } from "react";
import { X, Sparkles, Folder, Users, Target, Palette } from "lucide-react";
import { PodColor, COLOR_VARIANTS } from "@/lib/pods";
import { cn } from "@/lib/utils";

interface CreatePodModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableFolders?: string[];
  onCreate: (data: {
    name: string;
    mission: string;
    team: string;
    color: PodColor;
    documentPath: string;
  }) => Promise<void>;
}

const PRESET_PATHS = [
  "02 Projekte/Work",
  "04 Ressourcen/Sustainability in EPM – Omni Agent",
  "04 Ressourcen/SAP Green Ledger",
  "04 Ressourcen/AI und KI",
  "04 Ressourcen/Dev Snippets",
  "05 Daily Notes/Sessions",
  "Pods/Team-Wiki",
];

export function CreatePodModal({
  isOpen,
  onClose,
  onCreate,
  availableFolders = [],
}: CreatePodModalProps) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [mission, setMission] = useState("");
  const [documentPath, setDocumentPath] = useState("02 Projekte/Work");
  const [color, setColor] = useState<PodColor>("emerald");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allFolderSuggestions = useMemo(() => {
    const set = new Set([...PRESET_PATHS, ...availableFolders]);
    return Array.from(set).slice(0, 8);
  }, [availableFolders]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreate({
        name,
        team,
        mission,
        color,
        documentPath: documentPath || `Pods/${name.trim()}`,
      });
      // Reset form
      setName("");
      setTeam("");
      setMission("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cobalt)] shadow-xs animate-pulse" />
            <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
              Neuen Pod (LLM Wiki) erstellen
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#eaeae4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Pod Name */}
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1">
              Pod-Titel *
            </label>
            <input
              type="text"
              required
              placeholder="z.B. Pod 3 – Footprint Governance & Audit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)] focus:ring-1 focus:ring-[var(--accent-cobalt)]"
            />
          </div>

          {/* Team / Squad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-[var(--text-muted)]" />
                <span>Team / Squad</span>
              </label>
              <input
                type="text"
                placeholder="z.B. EPM Sustainability"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)]"
              />
            </div>

            {/* Color Accent */}
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
                          ? "ring-2 ring-[var(--accent-cobalt)] ring-offset-1 scale-110"
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

          {/* Mission / Teamaufgabe */}
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Team-Aufgabe / Mission (LLM Wiki Kontext)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Welche Aufgabe löst dieser Pod? Worauf soll der LLM Wiki Copilot trainiert sein?"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)]"
            />
          </div>

          {/* Document Path in Vault */}
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <Folder className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Dokumenten-Pfad im Vault</span>
            </label>
            <input
              type="text"
              required
              value={documentPath}
              onChange={(e) => setDocumentPath(e.target.value)}
              placeholder="z.B. 04 Ressourcen/Sustainability in EPM"
              className="w-full px-3 py-2 rounded border border-hairline bg-white text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)]"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">Vorschläge:</span>
              {allFolderSuggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDocumentPath(p)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#f2f2ed] hover:bg-[#eaeae4] text-[var(--text-secondary)] border border-hairline transition-colors cursor-pointer"
                >
                  {p.split("/").pop()}
                </button>
              ))}
            </div>
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
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded-[4px] bg-[var(--accent-cobalt)] hover:bg-[var(--accent-cobalt-hover)] text-white dark:text-zinc-950 dark:font-semibold text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pod anlegen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
