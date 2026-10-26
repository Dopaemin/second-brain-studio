import { useOpenInEditor, useVaultFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

const CATEGORY_LABELS: Record<string, string> = {
  "02 Projekte": "Projekte",
  "03 Bereiche": "Bereiche",
  "04 Ressourcen": "Ressourcen",
  "01 Inbox": "Inbox",
};

export function QuickAccess() {
  const { files } = useVaultFiles("work");
  const openInEditor = useOpenInEditor();

  const grouped = files.reduce<Record<string, typeof files>>((acc, f) => {
    const label = CATEGORY_LABELS[f.category] ?? f.category;
    if (!acc[label]) acc[label] = [];
    acc[label].push(f);
    return acc;
  }, {});

  return (
    <GlassPanel title="Schnellzugriff" className="h-full">
      <ScrollArea className="flex-1 h-0">
        <div style={{ padding: "8px 0" }}>
          {Object.entries(grouped).map(([cat, catFiles]) => (
            <div key={cat} style={{ marginBottom: "12px" }}>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-subtle)",
                  padding: "0 14px",
                  marginBottom: "2px",
                }}
              >
                {cat}
              </p>
              <div>
                {catFiles.slice(0, 8).map((f) => (
                  <button
                    key={f.path}
                    onClick={() => openInEditor(f.path)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      fontSize: "13px",
                      padding: "5px 14px",
                      borderRadius: "0",
                      border: "none",
                      background: "transparent",
                      color: "var(--text)",
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
            </div>
          ))}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
