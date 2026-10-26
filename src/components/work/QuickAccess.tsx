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
        <div className="flex flex-col gap-3">
          {Object.entries(grouped).map(([cat, catFiles]) => (
            <div key={cat}>
              <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                {cat}
              </p>
              <div className="flex flex-col gap-0.5">
                {catFiles.slice(0, 8).map((f) => (
                  <button
                    key={f.path}
                    onClick={() => openInEditor(f.path)}
                    className="text-left text-sm px-2 py-1 rounded-md hover:bg-white/5 transition-colors truncate no-drag"
                    style={{ color: "var(--text-primary)" }}
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
