import { noteLabel } from "@/lib/utils";
import { FileText, Clock, ExternalLink } from "lucide-react";
import { useOpenInEditor, useRecentFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

function formatTimeAgo(unixSecs: number): string {
  const diff = Date.now() / 1000 - unixSecs;
  if (diff < 60) return "Gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "Gestern" : `vor ${days} Tagen`;
}

export function RecentFiles() {
  const files = useRecentFiles("work", 12);
  const openInEditor = useOpenInEditor();

  return (
    <GlassPanel
      title="Zuletzt bearbeitet"
      icon={<Clock className="w-3.5 h-3.5" />}
      badge={`${files.length} Dateien`}
      className="h-full"
      noPadding
    >
      <ScrollArea className="flex-1 h-0">
        <div className="p-1 divide-y divide-white/[0.04]">
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => openInEditor(f.path)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.05] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text)] group-hover:text-white truncate">
                    {noteLabel(f.path)}
                  </p>
                  <p className="text-[10px] text-[var(--text-subtle)] truncate">
                    {f.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-[var(--text-muted)] border border-white/[0.06]">
                  {formatTimeAgo(f.modified)}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}

          {files.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Keine kürzlich geöffneten Notizen
            </div>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
