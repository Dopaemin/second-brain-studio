import { Plus, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { invoke, emitVaultChanged } from "@/lib/backend";
import { useOpenInEditor, useVaultFiles, WORK_VAULT } from "@/hooks/useVaultFiles";
import { isEditedByCopilot } from "@/lib/copilotHistory";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

interface SprintNotesProps {
  onSelectFile?: (path: string) => void;
}

export function SprintNotes({ onSelectFile }: SprintNotesProps) {
  const { files } = useVaultFiles("work");
  const openInEditor = useOpenInEditor();

  const sessions = files
    .filter((f) => f.path.includes("/Sessions/") || /sprint|session/i.test(f.name))
    .slice(0, 12);

  const open = (path: string) => (onSelectFile ? onSelectFile(path) : openInEditor(path));

  const startNewSession = async () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const newPath = `${WORK_VAULT}/05 Daily Notes/Sessions/${today} Sprint Session.md`;
    try {
      await invoke<string>("read_file", { path: newPath });
    } catch {
      await invoke("write_file", {
        path: newPath,
        content: `# Sprint Session ${today}\n\n## Ziele\n\n- [ ] \n\n## Notizen\n\n`,
      }).catch(() => undefined);
      emitVaultChanged();
    }
    open(newPath);
  };

  return (
    <GlassPanel
      title="Sessions"
      badge={`${sessions.length}`}
      className="h-full"
      noPadding
      action={
        <button
          type="button"
          onClick={startNewSession}
          className="editorial-btn editorial-btn-ghost px-1.5 py-0.5 text-[10.5px] font-mono gap-1"
          title="Heutige Session-Notiz anlegen und öffnen"
        >
          <Plus className="w-3 h-3" />
          <span>Heute</span>
        </button>
      }
    >
      <ScrollArea className="flex-1 h-0">
        <div className="p-2.5 space-y-1">
          {sessions.map((f) => {
            const date = f.name.match(/\d{4}-\d{2}-\d{2}/)?.[0];
            const title = f.name.replace(/^\d{4}-\d{2}-\d{2}\s*/, "") || f.name;
            const fromCopilot = isEditedByCopilot(f.path);
            return (
              <div
                key={f.path}
                onClick={() => open(f.path)}
                className="flex items-center justify-between p-2 rounded-[4px] hover:bg-[#f6f6f1] transition-colors cursor-pointer select-none group"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-1.5">
                    {date && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                        {date}
                      </span>
                    )}
                    {fromCopilot && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[8.5px] px-1 py-0.2 rounded bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)] font-medium shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Copilot</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-medium truncate">
                    {title}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInEditor(f.path);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                    title="In Obsidian öffnen"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <ArrowRight className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)] transition-colors" />
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && (
            <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">Keine Session-Notizen</div>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
