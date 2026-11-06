import { useState, useEffect, useRef } from "react";
import {
  FilePlus,
  FolderPlus,
  ExternalLink,
  Copy,
  Edit2,
  Trash2,
  Folder,
  FileText,
  Check,
  Search,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { invoke, emitVaultChanged } from "@/lib/backend";

export interface ContextMenuTarget {
  type: "folder" | "file" | "category" | "root";
  name: string;
  relPath: string;
  absPath: string;
}

interface TreeContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onClose: () => void;
  onSelectFile?: (path: string | null) => void;
  onExpandFolder?: (relPath: string) => void;
  vaultRootPath: string;
}

export function TreeContextMenu({
  x,
  y,
  target,
  onClose,
  onSelectFile,
  onExpandFolder,
  vaultRootPath,
}: TreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Modal dialog states
  const [modalMode, setModalMode] = useState<"create_note" | "create_folder" | "rename" | "delete" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Position adjustments to prevent overflowing window bounds
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let newX = x;
      let newY = y;

      if (x + rect.width > winW - 12) {
        newX = Math.max(12, winW - rect.width - 12);
      }
      if (y + rect.height > winH - 12) {
        newY = Math.max(12, winH - rect.height - 12);
      }
      setPos({ x: newX, y: newY });
    }
  }, [x, y]);

  // Click outside to close (if no modal is open)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalMode) return; // Keep open while modal is handling action
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalMode) {
          setModalMode(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, modalMode]);

  // Determine base directory for creating files/folders
  const getTargetDir = (): string => {
    if (target.type === "file") {
      const parts = target.absPath.split("/");
      parts.pop();
      return parts.join("/") || vaultRootPath;
    }
    return target.absPath || vaultRootPath;
  };

  const getTargetRelDir = (): string => {
    if (target.type === "file") {
      const parts = target.relPath.split("/");
      parts.pop();
      return parts.join("/");
    }
    return target.relPath;
  };

  // Action: Copy Path
  const handleCopyPath = () => {
    navigator.clipboard.writeText(target.absPath);
    setCopied(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  // Action: Reveal in Finder
  const handleRevealInFinder = async () => {
    try {
      await invoke("reveal_in_finder", { path: target.absPath });
    } catch {
      // Fallback
    }
    onClose();
  };

  // Action: Open in Obsidian
  const handleOpenInObsidian = async () => {
    try {
      await invoke("open_in_editor", { path: target.absPath });
    } catch {
      // Fallback
    }
    onClose();
  };

  // Action: Create Note Submit
  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = inputValue.trim();
    if (!title) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const sanitized = title.endsWith(".md") ? title : `${title}.md`;
      const baseDir = getTargetDir();
      const newFilePath = `${baseDir}/${sanitized}`;
      const defaultContent = `# ${title.replace(/\.md$/, "")}\n\n`;

      await invoke("write_file", { path: newFilePath, content: defaultContent });
      emitVaultChanged();

      const relDir = getTargetRelDir();
      if (relDir && onExpandFolder) {
        onExpandFolder(relDir);
      }
      if (onSelectFile) {
        onSelectFile(newFilePath);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Erstellen der Notiz");
      setIsSubmitting(false);
    }
  };

  // Action: Create Folder Submit
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const folderName = inputValue.trim();
    if (!folderName) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const baseDir = getTargetDir();
      const newFolderPath = `${baseDir}/${folderName}`;

      await invoke("create_folder", { path: newFolderPath });
      // Also create a placeholder or README / INDEX so it shows up in markdown index
      const placeholderPath = `${newFolderPath}/INDEX.md`;
      await invoke("write_file", { path: placeholderPath, content: `# ${folderName}\n\n` });
      emitVaultChanged();

      const relDir = getTargetRelDir();
      const newRel = relDir ? `${relDir}/${folderName}` : folderName;
      if (onExpandFolder) {
        if (relDir) onExpandFolder(relDir);
        onExpandFolder(newRel);
      }
      if (onSelectFile) {
        onSelectFile(placeholderPath);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Erstellen des Ordners");
      setIsSubmitting(false);
    }
  };

  // Action: Rename Submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = inputValue.trim();
    if (!newName || newName === target.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const isFile = target.type === "file";
      const oldPath = target.absPath;
      const parts = oldPath.split("/");
      parts.pop();
      const parentDir = parts.join("/");
      const finalName = isFile ? (newName.endsWith(".md") ? newName : `${newName}.md`) : newName;
      const newPath = `${parentDir}/${finalName}`;

      await invoke("rename_file_or_folder", { from: oldPath, to: newPath });
      emitVaultChanged();

      if (isFile && onSelectFile) {
        onSelectFile(newPath);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Umbenennen");
      setIsSubmitting(false);
    }
  };

  // Action: Delete Submit
  const handleDeleteSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await invoke("delete_file_or_folder", { path: target.absPath });
      emitVaultChanged();
      if (target.type === "file" && onSelectFile) {
        onSelectFile(null);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Fehler beim Löschen");
      setIsSubmitting(false);
    }
  };

  // If a modal dialog is active, render the dialog
  if (modalMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {modalMode === "create_note" && (
            <form onSubmit={handleCreateNoteSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FilePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Neue Notiz erstellen</h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px]">
                    In: {target.relPath || "Vault Root"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Name der Notiz
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="z. B. Architecture Decisions"
                  className="editorial-input w-full px-3 py-2 text-xs"
                />
              </div>

              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim()}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Wird erstellt..." : "Notiz erstellen"}
                </button>
              </div>
            </form>
          )}

          {modalMode === "create_folder" && (
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Neuen Ordner erstellen</h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px]">
                    In: {target.relPath || "Vault Root"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Ordnername
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="z. B. API Specs"
                  className="editorial-input w-full px-3 py-2 text-xs"
                />
              </div>

              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim()}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Wird angelegt..." : "Ordner erstellen"}
                </button>
              </div>
            </form>
          )}

          {modalMode === "rename" && (
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {target.type === "file" ? "Notiz umbenennen" : "Ordner umbenennen"}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px]">
                    Aktuell: {target.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Neuer Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="editorial-input w-full px-3 py-2 text-xs"
                />
              </div>

              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim() || inputValue.trim() === target.name}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Wird gespeichert..." : "Speichern"}
                </button>
              </div>
            </form>
          )}

          {modalMode === "delete" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {target.type === "file" ? "Notiz löschen" : "Ordner löschen"}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Diese Aktion kann nicht widerrufen werden.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Möchtest du <strong className="text-[var(--text-primary)] font-semibold">{target.name}</strong> wirklich unwiderruflich aus deinem Vault entfernen?
              </p>

              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Wird gelöscht..." : "Endgültig löschen"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCategory = target.type === "category";
  const isFile = target.type === "file";
  const isFolder = target.type === "folder";

  return (
    <div
      ref={menuRef}
      style={{ top: `${pos.y}px`, left: `${pos.x}px` }}
      className="fixed z-50 w-56 rounded-lg bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-strong)] shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-hairline"
    >
      {/* Target Title Header */}
      <div className="px-2.5 py-1.5 pb-2">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono text-[10px] uppercase tracking-wider mb-0.5">
          {isFile ? <FileText className="w-3 h-3" /> : <Folder className="w-3 h-3" />}
          <span>{isFile ? "Notiz" : isCategory ? "Kategorie" : isFolder ? "Ordner" : "Bereich"}</span>
        </div>
        <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
          {target.name}
        </p>
      </div>

      {/* Creation Actions */}
      <div className="py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            setInputValue("");
            setErrorMsg(null);
            setModalMode("create_note");
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium transition-colors cursor-pointer text-left"
        >
          <FilePlus className="w-3.5 h-3.5 shrink-0" />
          <span>Neue Notiz erstellen...</span>
        </button>

        {!isFile && (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              setErrorMsg(null);
              setModalMode("create_folder");
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
          >
            <FolderPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Neuer Unterordner...</span>
          </button>
        )}
      </div>

      {/* File/Folder System Actions */}
      <div className="py-1 space-y-0.5">
        {isFile && (
          <button
            type="button"
            onClick={() => {
              if (onSelectFile) onSelectFile(target.absPath);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Notiz öffnen</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleRevealInFinder}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Im Finder anzeigen</span>
        </button>

        <button
          type="button"
          onClick={handleOpenInObsidian}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>In Obsidian öffnen</span>
        </button>

        <button
          type="button"
          onClick={handleCopyPath}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>Pfad kopieren</span>
          </div>
          {copied && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
        </button>
      </div>

      {/* Management Actions (Rename & Delete) - Not for Top-Level PARA Categories */}
      {!isCategory && (
        <div className="py-1 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              setInputValue(target.name);
              setErrorMsg(null);
              setModalMode("rename");
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
          >
            <Edit2 className="w-3.5 h-3.5 shrink-0" />
            <span>Umbenennen...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setModalMode("delete");
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-red-500/10 text-red-600 dark:text-red-400 hover:text-red-700 transition-colors cursor-pointer text-left"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Löschen...</span>
          </button>
        </div>
      )}
    </div>
  );
}
