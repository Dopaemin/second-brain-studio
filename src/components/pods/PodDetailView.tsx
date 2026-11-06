import { useState, useMemo, useEffect } from "react";
import { Pod, COLOR_VARIANTS, getPodFiles, updatePod } from "@/lib/pods";
import { VaultFile, WORK_VAULT } from "@/hooks/useVaultFiles";
import { invoke, emitVaultChanged } from "@/lib/backend";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Sparkles,
  Folder,
  FileText,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Target,
  Bot,
  Settings2,
  Pencil,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { EditPodModal } from "./EditPodModal";

interface PodDetailViewProps {
  pod: Pod;
  allFiles: VaultFile[];
  onBack: () => void;
  onSelectFile: (path: string) => void;
  onDeletePod: (podId: string) => void;
  onUpdatePod?: (updated: Pod) => void;
  availableFolders?: string[];
}

export function PodDetailView({
  pod,
  allFiles,
  onBack,
  onSelectFile,
  onDeletePod,
  onUpdatePod,
  availableFolders = [],
}: PodDetailViewProps) {
  const [currentPod, setCurrentPod] = useState<Pod>(pod);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setCurrentPod(pod);
  }, [pod]);

  const colorConfig = COLOR_VARIANTS[currentPod.color] || COLOR_VARIANTS.emerald;

  // Filter files in this pod's folder
  const podFiles = useMemo(() => {
    return getPodFiles(currentPod, allFiles);
  }, [currentPod, allFiles]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return podFiles;
    const q = searchQuery.toLowerCase();
    return podFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [podFiles, searchQuery]);

  // Quick prompt for Copilot
  const handleAskCopilot = (promptText?: string) => {
    const copilotPrompt =
      promptText ||
      `Fokus-Aufgabe für Pod "${currentPod.name}":\nTeam: ${currentPod.team}\nMission: ${currentPod.mission}\nDokumenten-Pfad: ${currentPod.documentPath}\n\nBitte gib mir einen Überblick über den aktuellen Stand und die relevanten Notizen in diesem Pod.`;

    // Dispatch global event or trigger Copilot shortcut (⌘J)
    window.dispatchEvent(
      new CustomEvent("copilot-ask-question", { detail: { question: copilotPrompt } })
    );
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", metaKey: true, bubbles: true })
    );
  };

  const handleSavePod = (
    id: string,
    data: {
      name: string;
      mission: string;
      team: string;
      color: any;
      documentPath: string;
    }
  ) => {
    const updated = updatePod(id, data);
    if (updated) {
      setCurrentPod(updated);
      onUpdatePod?.(updated);
    }
  };

  const handleCreateNoteInPod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    try {
      setIsCreatingNote(true);
      const fileName = newNoteTitle.trim().endsWith(".md")
        ? newNoteTitle.trim()
        : `${newNoteTitle.trim()}.md`;

      const targetPath = `${WORK_VAULT}/${currentPod.documentPath}/${fileName}`;
      const initialContent = `# ${newNoteTitle.trim()}

> **Pod:** ${currentPod.name}  
> **Team:** ${currentPod.team}  
> **Datum:** ${new Date().toLocaleDateString("de-DE")}  

---

## Notizen & Arbeitsstand

`;

      await invoke("write_file", { path: targetPath, content: initialContent });
      emitVaultChanged();
      setNewNoteTitle("");
      setShowAddNote(false);
      onSelectFile(targetPath);
    } catch (err) {
      console.error("Fehler beim Erstellen der Notiz im Pod:", err);
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border border-hairline rounded-md overflow-hidden select-none animate-fadeIn">
      {/* Top Header / Breadcrumbs */}
      <div className="px-6 py-3.5 border-b border-hairline bg-[#fafaf8] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-white hover:bg-[#eaeae4] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Zurück zum Cockpit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück</span>
          </button>

          <div className="h-4 w-[1px] bg-hairline shrink-0" />

          {/* Pod Title with Dot */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2.5 h-2.5 rounded-full shadow-xs shrink-0", colorConfig.dotClass)} />
            <h2 className="font-editorial text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
              {currentPod.name}
            </h2>
            <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline shrink-0 hidden sm:inline">
              {currentPod.team}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white hover:bg-[#eaeae4] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
            title="Pod-Einstellungen (Pfad, Name, Team, Mission) anpassen"
          >
            <Settings2 className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
            <span>Pod einstellen</span>
          </button>

          <button
            type="button"
            onClick={() => handleAskCopilot()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--accent-cobalt-subtle)] hover:bg-[#e0ecfe] border border-[var(--accent-cobalt-border)] text-xs font-semibold text-[var(--accent-cobalt)] transition-colors cursor-pointer shadow-2xs"
            title="Wiki Copilot für diesen Pod öffnen (⌘J)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wiki Copilot befragen</span>
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 p-1 rounded-[4px] bg-rose-50 border border-rose-200 animate-fadeIn">
              <span className="text-[11px] font-medium text-rose-800 px-1">Pod löschen?</span>
              <button
                type="button"
                onClick={() => {
                  onDeletePod(currentPod.id);
                  onBack();
                }}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-medium shadow-2xs transition-colors cursor-pointer"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-1.5 py-0.5 rounded bg-white hover:bg-zinc-100 text-zinc-600 text-[10.5px] border border-zinc-200 transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-[4px] border border-hairline hover:bg-rose-50 text-[var(--text-muted)] hover:text-rose-600 transition-colors cursor-pointer"
              title="Pod löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
          {/* Pod Mission Banner / LLM Wiki Box */}
          <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-hairline">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-muted)]">
                    <Target className="w-3 h-3 text-[var(--accent-cobalt)]" />
                    <span>Teamaufgabe & LLM Wiki Mission</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-cobalt)] hover:underline cursor-pointer font-sans"
                    title="Pod-Details & Pfad bearbeiten"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Bearbeiten</span>
                  </button>
                </div>
                <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                  {currentPod.mission}
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)] pt-1 flex-wrap">
                  <Folder className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  <span>
                    Pfad:{" "}
                    <code className="bg-white px-1.5 py-0.5 rounded border border-hairline text-[var(--text-primary)]">
                      {currentPod.documentPath}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[10.5px] text-[var(--accent-cobalt)] hover:underline cursor-pointer font-sans ml-1"
                    title="Pfad im Vault anpassen"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Pfad anpassen</span>
                  </button>
                </div>
              </div>

              {/* Quick AI Action Prompts */}
              <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleAskCopilot(
                      `Erstelle mir eine prägnante Zusammenfassung aller Dokumente und Aufgaben im Pod "${currentPod.name}".`
                    )
                  }
                  className="px-2.5 py-1 rounded-[4px] bg-white hover:bg-[#eaeae4] border border-hairline text-left text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Bot className="w-3 h-3 text-[var(--accent-cobalt)]" />
                  <span>Pod-Zusammenfassung anfordern</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAskCopilot(
                      `Welche offenen Fragen, Risiken und Todos gibt es laut den Dokumenten im Pod "${currentPod.name}"?`
                    )
                  }
                  className="px-2.5 py-1 rounded-[4px] bg-white hover:bg-[#eaeae4] border border-hairline text-left text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Bot className="w-3 h-3 text-[var(--accent-cobalt)]" />
                  <span>Offene Team-Fragen identifizieren</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pod Documents Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-hairline">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[var(--accent-cobalt)]" />
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Dokumente im Pod ({filteredFiles.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Search within Pod */}
                <div className="relative">
                  <Search className="w-3 h-3 text-[var(--text-faint)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Dokument im Pod filtern…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-2.5 py-1 rounded-[4px] bg-[#f4f4ef] border border-hairline text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:bg-white focus:border-[var(--accent-cobalt)] w-48 sm:w-60"
                  />
                </div>

                {/* Add Note Button */}
                <button
                  type="button"
                  onClick={() => setShowAddNote((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-white hover:bg-[#f0f0ea] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Notiz anlegen</span>
                </button>
              </div>
            </div>

            {/* Quick Add Note Form */}
            {showAddNote && (
              <form
                onSubmit={handleCreateNoteInPod}
                className="mb-4 p-3 rounded-lg bg-[#fafaf8] border border-hairline flex items-center gap-2 animate-fadeIn"
              >
                <FileText className="w-4 h-4 text-[var(--accent-cobalt)] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Titel der neuen Notiz im Pod (z.B. Sprint Review 2026-10-30)..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded border border-hairline bg-white text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cobalt)]"
                />
                <button
                  type="submit"
                  disabled={isCreatingNote || !newNoteTitle.trim()}
                  className="px-3 py-1.5 rounded bg-[var(--accent-cobalt)] hover:bg-[var(--accent-cobalt-hover)] text-white dark:text-zinc-950 dark:font-semibold text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Erstellen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNoteTitle("");
                  }}
                  className="px-2.5 py-1.5 rounded border border-hairline text-xs text-[var(--text-muted)] hover:bg-[#eaeae4] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
              </form>
            )}

            {/* Files Grid / List */}
            {filteredFiles.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-hairline rounded-lg bg-[#fafaf8]">
                <FileText className="w-8 h-8 text-[var(--text-faint)] mx-auto mb-2" />
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Keine Dokumente im Pfad gefunden
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Erstelle die erste Notiz oder überprüfe den Dokumenten-Pfad <code>{pod.documentPath}</code>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredFiles.map((file) => {
                  const fileNameWithoutExt = file.name.replace(/\.md$/, "");
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => onSelectFile(file.path)}
                      className="flex items-center justify-between p-3 rounded-lg border border-hairline bg-white hover:border-[var(--accent-cobalt-border)] hover:bg-[#fbfbf8] hover:shadow-xs transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 mr-2">
                        <div className="w-8 h-8 rounded bg-[#f4f4ef] group-hover:bg-[var(--accent-cobalt-subtle)] text-[var(--text-muted)] group-hover:text-[var(--accent-cobalt)] flex items-center justify-center shrink-0 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] truncate block">
                            {fileNameWithoutExt}
                          </span>
                          <span className="font-mono text-[9.5px] text-[var(--text-muted)] truncate block mt-0.5">
                            {file.category}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-[var(--accent-cobalt)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                        Öffnen <ExternalLink className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Edit Pod Settings Modal */}
      <EditPodModal
        isOpen={isEditOpen}
        pod={currentPod}
        onClose={() => setIsEditOpen(false)}
        availableFolders={availableFolders}
        onSave={handleSavePod}
      />
    </div>
  );
}
