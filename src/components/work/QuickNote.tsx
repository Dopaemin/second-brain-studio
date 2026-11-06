import { useState } from "react";
import { CornerDownLeft, CheckCircle2 } from "lucide-react";
import { invoke, emitVaultChanged } from "@/lib/backend";
import { WORK_VAULT } from "@/hooks/useVaultFiles";
import { cn } from "@/lib/utils";

const INBOX_PATH = `${WORK_VAULT}/01 Inbox/Schnellnotizen.md`;

const NOTE_TAGS = [
  { id: "inbox", label: "Notiz", format: (t: string, ts: string) => `- ${ts}: ${t}` },
  { id: "idea", label: "Idee", format: (t: string, ts: string) => `- ${ts}: [Idee] ${t}` },
  { id: "task", label: "Aufgabe", format: (t: string) => `- [ ] ${t}` },
  { id: "meeting", label: "Meeting", format: (t: string, ts: string) => `- ${ts}: [Meeting] ${t}` },
];

export function QuickNote() {
  const [text, setText] = useState("");
  const [selectedTag, setSelectedTag] = useState("inbox");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const clean = text.trim();
    if (!clean || saving) return;
    setSaving(true);
    setError(null);

    const tag = NOTE_TAGS.find((t) => t.id === selectedTag)!;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    try {
      const existing = await invoke<string>("read_file", { path: INBOX_PATH }).catch(() => "# Schnellnotizen\n");
      await invoke("write_file", {
        path: INBOX_PATH,
        content: `${existing.trimEnd()}\n${tag.format(clean, ts)}\n`,
      });
      setText("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      emitVaultChanged();
    } catch (e) {
      setError(`Speichern fehlgeschlagen: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <footer className="px-4 py-2.5 flex items-center gap-3 bg-white select-none">
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {NOTE_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setSelectedTag(tag.id)}
            className={cn(
              "px-2.5 py-1 rounded-[3px] font-mono text-[10.5px] uppercase tracking-wider transition-all border",
              selectedTag === tag.id
                ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] font-semibold border-[var(--accent-cobalt-border)]"
                : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-[#f3f3ee]"
            )}
          >
            {tag.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        placeholder="In die Inbox schreiben und Enter drücken…"
        className="editorial-input flex-1 text-xs px-3 py-1.5 placeholder:text-[var(--text-faint)]"
      />

      {error ? (
        <span className="text-xs text-rose-600 shrink-0 max-w-[260px] truncate" title={error}>{error}</span>
      ) : saved ? (
        <div className="flex items-center gap-1.5 px-3 py-1 text-[var(--accent-cobalt)] text-xs font-medium font-mono shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>In Inbox gespeichert</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={save}
          disabled={!text.trim() || saving}
          className="editorial-btn editorial-btn-primary gap-1 px-3 py-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Speichern</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      )}
    </footer>
  );
}
