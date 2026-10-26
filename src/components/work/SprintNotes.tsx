import { useOpenInEditor, useVaultFiles } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";

export function SprintNotes() {
  const { files } = useVaultFiles("work");
  const openInEditor = useOpenInEditor();
  const sessions = files
    .filter((f) => f.path.includes("05 Daily Notes/Sessions"))
    .slice(0, 5);

  return (
    <GlassPanel title="Sprint Notes">
      <div className="flex flex-col gap-1">
        {sessions.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Keine Session Logs
          </p>
        )}
        {sessions.map((f) => (
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
    </GlassPanel>
  );
}
