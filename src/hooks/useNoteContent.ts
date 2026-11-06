import { useState, useEffect, useCallback } from "react";
import { emitVaultChanged, invoke } from "@/lib/backend";

export function useNoteContent(filePath: string | null) {
  const [content, setContent] = useState<string>("");
  const [initialContent, setInitialContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setContent("");
      setInitialContent("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    invoke<string>("read_file", { path: filePath })
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setInitialContent(text);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = String(e?.message ?? e);
        if (/no such file|enoent|not found/i.test(msg)) {
          // New note: start empty, file is created on first save.
          setContent("");
          setInitialContent("");
        } else {
          setError(`Datei konnte nicht gelesen werden: ${msg}`);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const saveContent = useCallback(
    async (newContent: string) => {
      if (!filePath) return;
      setSaving(true);
      setError(null);
      try {
        await invoke("write_file", { path: filePath, content: newContent });
        setContent(newContent);
        setInitialContent(newContent);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        emitVaultChanged();
      } catch (e) {
        setError(`Speichern fehlgeschlagen: ${String((e as Error)?.message ?? e)}`);
      } finally {
        setSaving(false);
      }
    },
    [filePath]
  );

  const isDirty = content !== initialContent;

  return {
    content,
    setContent,
    loading,
    saving,
    saveSuccess,
    error,
    saveContent,
    isDirty,
  };
}
