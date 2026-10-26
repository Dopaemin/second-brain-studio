import { useOpenInEditor, useVaultFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";

export function SprintNotes() {
  const { files } = useVaultFiles("work");
  const openInEditor = useOpenInEditor();
  const sessions = files
    .filter((f) => f.path.includes("05 Daily Notes/Sessions"))
    .slice(0, 5);

  return (
    <GlassPanel title="Sprint Notes" className="h-full">
      <div style={{ overflow: "auto", flex: 1 }}>
        {sessions.length === 0 && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              padding: "10px 14px",
            }}
          >
            Keine Session Logs
          </p>
        )}
        {sessions.map((f, i) => (
          <button
            key={f.path}
            onClick={() => openInEditor(f.path)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              fontSize: "13px",
              color: "var(--text)",
              padding: "7px 14px",
              border: "none",
              borderBottom:
                i < sessions.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
              background: "transparent",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-surface-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {f.name}
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
