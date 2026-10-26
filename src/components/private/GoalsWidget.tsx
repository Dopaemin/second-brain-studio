import { useVaultFiles } from "@/hooks/useVaultFiles";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { GlassPanel } from "../GlassPanel";

export function GoalsWidget() {
  const { files } = useVaultFiles("private");
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    if (files.length === 0) return;

    const load = async () => {
      const found: string[] = [];
      for (const f of files.slice(0, 10)) {
        const content = await invoke<string>("read_file", {
          path: f.path,
        }).catch(() => "");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (
            trimmed.startsWith("- [ ]") ||
            trimmed.toLowerCase().startsWith("ziel:")
          ) {
            found.push(
              trimmed
                .replace(/^-\s*\[\s*\]\s*/, "")
                .replace(/^ziel:\s*/i, "")
            );
          }
        }
      }
      setGoals(found.slice(0, 8));
    };
    load();
  }, [files]);

  return (
    <GlassPanel title="Ziele">
      <div className="flex flex-col gap-1">
        {goals.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Keine Ziele
          </p>
        )}
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: "var(--accent)" }}>◎</span>
            <p className="text-sm" style={{ color: "var(--text)" }}>
              {g}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
