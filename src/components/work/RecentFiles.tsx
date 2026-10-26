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
    <GlassPanel title="Zuletzt bearbeitet" className="h-full">
      <div style={{ overflow: "auto", flex: 1 }}>
        {files.map((f, i) => (
          <button
            key={f.path}
            onClick={() => handleClick(f.path)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "7px 14px",
              border: "none",
              borderBottom:
                i < files.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
              background: "transparent",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-surface-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                fontSize: "13px",
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                textAlign: "left",
              }}
            >
              {f.name}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginLeft: "8px",
                flexShrink: 0,
              }}
            >
              {timeAgo(f.modified)}
            </span>
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
