import { useOpenInEditor, useRecentFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";

function timeAgo(unixSecs: number): string {
  const diff = Date.now() / 1000 - unixSecs;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function RecentFiles() {
  const files = useRecentFiles("work", 10);
  const openInEditor = useOpenInEditor();

  const handleClick = async (path: string) => {
    try {
      await openInEditor(path);
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  };

  return (
    <GlassPanel title="Zuletzt bearbeitet">
      <div className="flex flex-col gap-1">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => handleClick(f.path)}
            className="flex items-center justify-between text-sm px-2 py-1 rounded-md hover:bg-white/5 transition-colors no-drag"
            style={{ color: "var(--text-primary)" }}
          >
            <span className="truncate flex-1 text-left">{f.name}</span>
            <span
              className="ml-2 text-xs shrink-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {timeAgo(f.modified)}
            </span>
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
