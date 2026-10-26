import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { GlassPanel } from "../GlassPanel";

const INBOX_PATH =
  "/Users/I539120/Documents/second-brain/01 Inbox/Schnellnotizen.md";

export function QuickNote() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!text.trim()) return;
    try {
      setError(null);
      const existing = await invoke<string>("read_file", {
        path: INBOX_PATH,
      }).catch(() => "# Schnellnotizen\n");
      const date = new Date().toISOString().slice(0, 16).replace("T", " ");
      const appended = `${existing}\n- ${date}: ${text.trim()}`;
      await invoke("write_file", { path: INBOX_PATH, content: appended });
      setText("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save note:", e);
      setError("Fehler beim Speichern");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <GlassPanel title="Schnellnotiz">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Notiz zur Inbox..."
        className="w-full text-sm bg-transparent resize-none outline-none no-drag"
        style={{ color: "var(--text-primary)", minHeight: "60px" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) save();
        }}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
      <button
        onClick={save}
        className="self-end text-xs px-3 py-1 rounded-full no-drag transition-all hover:scale-105"
        style={{
          background: "var(--accent-glow)",
          border: "1px solid var(--accent-border)",
          color: "var(--text-primary)",
        }}
      >
        {saved ? "Gespeichert!" : "⌘↵ Speichern"}
      </button>
    </GlassPanel>
  );
}
