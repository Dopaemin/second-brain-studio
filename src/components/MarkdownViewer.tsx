import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Eye,
  Edit3,
  Save,
  X,
  Check,
  Copy,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useNoteContent } from "@/hooks/useNoteContent";
import { useOpenInEditor } from "@/hooks/useVaultFiles";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface MarkdownViewerProps {
  filePath: string;
  onClose: () => void;
}

export function MarkdownViewer({ filePath, onClose }: MarkdownViewerProps) {
  const {
    content,
    setContent,
    loading,
    saving,
    saveSuccess,
    error,
    saveContent,
    isDirty,
  } = useNoteContent(filePath);

  const openInEditor = useOpenInEditor();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const fileName = filePath.split("/").pop()?.replace(".md", "") || "Dokument";
  const relativeFolder = filePath
    .split("/")
    .slice(-3, -1)
    .join(" / ");

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const handleBack = () => {
    if (window.history.state?.note) {
      window.history.back();
    } else {
      onClose();
    }
  };

  // Mouse navigation (mouse button 3 = back) and browser popstate history
  useEffect(() => {
    try {
      window.history.pushState({ note: filePath }, "", "");
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    const handleMouseUp = (e: MouseEvent) => {
      // e.button === 3 is the standard Back button on 5-button mice
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        handleBack();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("pointerup", handleMouseUp);
    window.addEventListener("auxclick", handleMouseUp);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("pointerup", handleMouseUp);
      window.removeEventListener("auxclick", handleMouseUp);
    };
  }, [filePath, onClose]);

  // Keyboard shortcuts: Cmd+S to save, ESC to close, Cmd+[ or Alt+Left to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveContent(content);
      }
      if (e.key === "Escape") {
        handleBack();
      }
      if (
        (e.metaKey && e.key === "[") ||
        (e.altKey && e.key === "ArrowLeft")
      ) {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, saveContent, onClose]);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 1800);
  };

  return (
    <article className="flex flex-col h-full bg-white border border-hairline rounded-md overflow-hidden select-none">
      {/* Editorial Document Header Bar */}
      <header className="px-3.5 py-2 border-b border-hairline bg-[#fafaf8] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Dedicated Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#ecece6] transition-colors cursor-pointer border border-hairline bg-white shadow-2xs group shrink-0"
            title="Zurück zur Übersicht (ESC oder Maustaste Zurück)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:-translate-x-0.5" />
            <span>Zurück</span>
          </button>

          <div className="h-4 w-[1px] bg-hairline shrink-0" />

          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] truncate">
              {relativeFolder || "KNOWLEDGE"} /
            </span>
            <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
              {fileName}.md
            </span>
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cobalt)] shrink-0" title="Ungespeichert" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Read / Edit Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-[4px] bg-[#eeeee9] dark:bg-[var(--bg-subtle)] border border-hairline">
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-xs font-medium transition-all cursor-pointer",
                mode === "preview"
                  ? "bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Eye className="w-3 h-3" />
              <span>Lesen</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-xs font-medium transition-all cursor-pointer",
                mode === "edit"
                  ? "bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Edit3 className="w-3 h-3" />
              <span>Bearbeiten</span>
            </button>
          </div>

          {/* Save Action */}
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => saveContent(content)}
              disabled={saving || !isDirty}
              className={cn(
                "editorial-btn gap-1.5",
                isDirty
                  ? "editorial-btn-primary"
                  : "editorial-btn-secondary opacity-60 cursor-default"
              )}
            >
              <Save className="w-3 h-3" />
              <span>{saving ? "Speichert…" : "Speichern"}</span>
            </button>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-1 text-[var(--accent-cobalt)] text-xs font-medium px-2 py-0.5 rounded bg-[var(--accent-cobalt-subtle)] border border-[var(--accent-cobalt-border)]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Gespeichert</span>
            </div>
          )}

          {/* External launcher */}
          <button
            type="button"
            onClick={() => openInEditor(filePath)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#f0f0eb] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            title="In Obsidian öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={handleBack}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#f0f0eb] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            title="Schließen (ESC)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {error && (
        <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Reading & Writing Surface */}
      <div className="flex-1 overflow-hidden min-h-0 bg-white">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
            Lade Dokument…
          </div>
        ) : mode === "preview" ? (
          <ScrollArea className="h-full">
            <div
              className="py-10 px-8 mx-auto select-text transition-all"
              style={{ maxWidth: "var(--reader-max-width, 780px)" }}
            >
              {/* Document Title & Meta Header */}
              <div className="mb-8 pb-6 border-b border-hairline">
                <h1 className="font-editorial text-3xl text-[var(--text-primary)] font-normal tracking-tight mb-2.5 leading-snug">
                  {fileName}
                </h1>
                <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-muted)]">
                  <span>{wordCount} Wörter</span>
                  <span>•</span>
                  <span>~{readTimeMin} Min Lesezeit</span>
                  <span>•</span>
                  <span>Markdown</span>
                </div>
              </div>

              {/* Rendered Markdown Body */}
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h2 className="font-editorial text-2xl font-normal text-[var(--text-primary)] mt-9 mb-3.5 tracking-tight border-b border-hairline pb-2">
                      {children}
                    </h2>
                  ),
                  h2: ({ children }) => (
                    <h3 className="font-sans text-base font-semibold text-[var(--text-primary)] mt-7 mb-2.5 tracking-tight">
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-5 mb-2">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p
                      className="text-[var(--reader-font-size,17px)] text-[var(--text-secondary)] mb-4 font-normal"
                      style={{ lineHeight: "var(--reader-line-height, 1.76)" }}
                    >
                      {children}
                    </p>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote
                      className="my-5 pl-4 py-1 border-l-2 border-[var(--accent-cobalt)] italic text-[var(--text-secondary)] font-editorial"
                      style={{ fontSize: "var(--reader-font-size, 17px)", lineHeight: "var(--reader-line-height, 1.76)" }}
                    >
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => (
                    <ul
                      className="list-disc pl-5 space-y-1.5 text-[var(--reader-font-size,17px)] text-[var(--text-secondary)] mb-4"
                      style={{ lineHeight: "var(--reader-line-height, 1.76)" }}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol
                      className="list-decimal pl-5 space-y-1.5 text-[var(--reader-font-size,17px)] text-[var(--text-secondary)] mb-4"
                      style={{ lineHeight: "var(--reader-line-height, 1.76)" }}
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  input: ({ checked }) => (
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="editorial-checkbox mr-2 align-middle"
                    />
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-[var(--accent-cobalt)] underline underline-offset-3 decoration-[var(--accent-cobalt)]/40 hover:decoration-[var(--accent-cobalt)]"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ className, children }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeText = String(children).replace(/\n$/, "");

                    if (!match && !codeText.includes("\n")) {
                      return (
                        <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-[#f3f3ee] text-[var(--text-primary)] border border-hairline">
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="my-5 rounded-md overflow-hidden bg-[#f7f7f4] border border-hairline">
                        <div className="px-3.5 py-1.5 bg-[#f0f0ea] border-b border-hairline flex items-center justify-between font-mono text-[10px] text-[var(--text-muted)]">
                          <span>{match ? match[1] : "plain"}</span>
                          <button
                            type="button"
                            onClick={() => copyCode(codeText, 1)}
                            className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            {copiedCodeIndex === 1 ? (
                              <Check className="w-3 h-3 text-[var(--accent-cobalt)]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedCodeIndex === 1 ? "Kopiert" : "Kopieren"}</span>
                          </button>
                        </div>
                        <pre className="p-3.5 text-xs font-mono text-[var(--text-primary)] overflow-x-auto leading-relaxed">
                          <code>{codeText}</code>
                        </pre>
                      </div>
                    );
                  },
                  table: ({ children }) => (
                    <div className="my-5 overflow-x-auto rounded-md border border-hairline">
                      <table className="w-full text-xs text-left divide-y divide-hairline">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-3.5 py-2 bg-[#f9f9f6] font-semibold text-[var(--text-primary)]">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3.5 py-2 text-[var(--text-secondary)] border-t border-hairline">
                      {children}
                    </td>
                  ),
                  hr: () => (
                    <hr className="my-8 border-none h-[1px] bg-hairline" />
                  ),
                }}
              >
                {content}
              </Markdown>
            </div>
          </ScrollArea>
        ) : (
          /* Editor Mode */
          <div className="h-full flex flex-col p-6 max-w-[800px] mx-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Schreibe deine Gedanken in Markdown…"
              className="flex-1 w-full bg-transparent text-[13px] font-mono text-[var(--text-primary)] leading-[1.75] resize-none outline-none select-text p-4 rounded-md border border-hairline focus:border-[var(--accent-cobalt)]"
              autoFocus
            />
            <footer className="mt-3 flex items-center justify-between font-mono text-[10.5px] text-[var(--text-muted)]">
              <span>Markdown • ⌘S zum Speichern</span>
              <span>{isDirty ? "Ungespeicherte Änderungen" : "Gespeichert"}</span>
            </footer>
          </div>
        )}
      </div>
    </article>
  );
}
