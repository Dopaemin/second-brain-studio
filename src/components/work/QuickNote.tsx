import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 16px",
        height: "52px",
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Schnellnotiz zur Inbox... (⌘↵)"
        style={{
          flex: 1,
          height: "32px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "0 12px",
          fontSize: "13px",
          color: "var(--text)",
          outline: "none",
          transition: "border-color 150ms ease",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = "var(--accent-border)")
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor = "var(--border)")
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) save();
        }}
      />
      {error && (
        <span style={{ fontSize: "12px", color: "var(--red)", flexShrink: 0 }}>
          {error}
        </span>
      )}
      <button
        onClick={save}
        style={{
          height: "32px",
          padding: "0 14px",
          borderRadius: "6px",
          border: "1px solid var(--accent-border)",
          background: "var(--accent-muted)",
          color: "var(--accent)",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--accent)";
          e.currentTarget.style.color = "var(--bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--accent-muted)";
          e.currentTarget.style.color = "var(--accent)";
        }}
      >
        {saved ? "Gespeichert!" : "Speichern"}
      </button>
    </div>
  );
}
