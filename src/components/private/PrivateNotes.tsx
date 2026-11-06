import { noteLabel } from "@/lib/utils";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useVaultFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

interface PrivateNotesProps {
  onSelectFile: (path: string) => void;
}

function timeAgo(unixSecs: number): string {
  const diff = Date.now() / 1000 - unixSecs;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function PrivateNotes({ onSelectFile }: PrivateNotesProps) {
  const { files, loading, error } = useVaultFiles("private");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? files.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : files;
    return list.slice(0, 60);
  }, [files, search]);

  return (
    <GlassPanel title="Notizen" badge={`${files.length}`} className="h-full" noPadding>
      <div className="p-3 border-b border-hairline bg-[#fafaf8]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Private Notiz suchen…"
            className="editorial-input w-full pl-8 pr-2.5 py-1.5 text-xs placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-2.5 space-y-0.5">
          {shown.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => onSelectFile(f.path)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[4px] text-left hover:bg-[#f4f4ee] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-3 h-3 shrink-0 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)]" />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">{noteLabel(f.path)}</p>
                  <p className="font-mono text-[9.5px] text-[var(--text-muted)] truncate">{f.category}</p>
                </div>
              </div>
              <span className="font-mono text-[9.5px] text-[var(--text-muted)] shrink-0">{timeAgo(f.modified)}</span>
            </button>
          ))}

          {!loading && shown.length === 0 && (
            <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
              {error ?? "Keine Notizen gefunden"}
            </div>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
