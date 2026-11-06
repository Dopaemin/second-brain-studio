import { useState } from "react";
import { Pod, COLOR_VARIANTS } from "@/lib/pods";
import { cn } from "@/lib/utils";
import { ChevronRight, Trash2, Folder, FileText, Settings2 } from "lucide-react";

interface PodCardProps {
  pod: Pod;
  filesCount: number;
  onEnterPod: (pod: Pod) => void;
  onEditPod?: (pod: Pod) => void;
  onDeletePod: (podId: string) => void;
}

export function PodCard({ pod, filesCount, onEnterPod, onEditPod, onDeletePod }: PodCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const colorConfig = COLOR_VARIANTS[pod.color] || COLOR_VARIANTS.emerald;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmingDelete) {
      onDeletePod(pod.id);
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
    }
  };

  return (
    <div
      onClick={() => onEnterPod(pod)}
      className="group relative flex flex-col justify-between p-3.5 rounded-lg border border-hairline bg-white hover:border-[var(--border-strong)] hover:shadow-xs transition-all cursor-pointer text-left"
    >
      <div>
        {/* Top: Kleiner Punkt mit Titel anklickbar */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Kleiner Punkt */}
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125 shadow-xs",
                colorConfig.dotClass
              )}
            />
            {/* Titel */}
            <span className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] transition-colors truncate">
              {pod.name}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEditPod && !confirmingDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPod(pod);
                }}
                title="Pod konfigurieren (Pfad, Name, Team, Mission)"
                className="p-1 rounded text-xs opacity-0 group-hover:opacity-100 hover:bg-[#eaeae4] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Action on hover */}
            <button
              type="button"
              onClick={handleDelete}
              title={confirmingDelete ? "Klicke erneut zum endgültigen Löschen" : "Pod löschen"}
              className={cn(
                "p-1 rounded text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1",
                confirmingDelete
                  ? "opacity-100 bg-rose-600 text-white font-medium px-2 py-0.5 shadow-2xs"
                  : "opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-[var(--text-faint)] hover:text-rose-600"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmingDelete && <span className="text-[10px]">Löschen?</span>}
            </button>
          </div>
        </div>

        {/* Team & Mission Teaser */}
        <div className="pl-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline">
              {pod.team}
            </span>
            <span className="font-mono text-[9.5px] text-[var(--text-muted)] flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" />
              {filesCount} {filesCount === 1 ? "Notiz" : "Notizen"}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-snug">
            {pod.mission}
          </p>
        </div>
      </div>

      {/* Bottom Path Indicator & Enter Prompt */}
      <div className="pl-5 pt-2 mt-2 border-t border-hairline flex items-center justify-between gap-2 font-mono text-[9.5px] text-[var(--text-muted)]">
        <span className="truncate flex items-center gap-1 min-w-0" title={pod.documentPath}>
          <Folder className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{pod.documentPath.split("/").pop()}</span>
        </span>
        <span className="text-[var(--accent-cobalt)] font-semibold flex items-center gap-0.5 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
          Öffnen <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
