import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Check,
  X,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Edit3,
  Save,
} from "lucide-react";
import { useSprintData } from "@/hooks/useSprintData";
import { SprintItem } from "@/lib/sprints";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SprintDashboardViewProps {
  onBack?: () => void;
  onSelectFile?: (path: string) => void;
}

export function SprintDashboardView({
  onBack,
  onSelectFile,
}: SprintDashboardViewProps) {
  const {
    sprintFiles,
    sprintsList,
    reviewsList,
    planningList,
    activeSprintPath,
    activeSprintDoc,
    selectedSprintPath,
    selectedSprintDoc,
    setSelectedSprintPath,
    setActiveSprint,
    closeSprint,
    loadingDoc,
    updateItemStatus,
    addItem,
    editItem,
    deleteItem,
    saveRawContent,
    createNewSprint,
    createNewReview,
  } = useSprintData();

  // Document currently displayed in the Sprint Dashboard (selected sprint or active sprint fallback)
  const currentDoc = selectedSprintDoc || activeSprintDoc;

  // Active Main Tab inside Sprint Dashboard:
  // "sprint" (Backlog & Planning), "reviews" (Sprint Reviews & Retros), "all-notes" (Alles mit #Sprint)
  const [activeTab, setActiveTab] = useState<"sprint" | "reviews" | "all-notes">("sprint");

  // Items Filter in Current Sprint
  const [itemsFilter, setItemsFilter] = useState<"all" | "in_progress" | "todo" | "done">("all");

  // New Item Input State
  const [newItemText, setNewItemText] = useState("");

  // Inline Item Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  // Inline Notes / Raw Markdown Edit State for Sprint Planning
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedRawContent, setEditedRawContent] = useState("");

  // Selected Review Note for deep-dive in Reviews tab
  const [selectedReviewPath, setSelectedReviewPath] = useState<string | null>(null);

  // Automatically select first review note if none is selected
  useEffect(() => {
    if (!selectedReviewPath && reviewsList.length > 0) {
      setSelectedReviewPath(reviewsList[0].path);
    }
  }, [reviewsList, selectedReviewPath]);

  // New Sprint Modal State
  const [showNewSprintModal, setShowNewSprintModal] = useState(false);
  const [newSprintNumber, setNewSprintNumber] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  // Close Sprint Modal State
  const [showCloseSprintModal, setShowCloseSprintModal] = useState(false);
  const [closeSprintCarryOver, setCloseSprintCarryOver] = useState(true);
  const [closeSprintNextNum, setCloseSprintNextNum] = useState("");
  const [isClosingSprint, setIsClosingSprint] = useState(false);

  // New Review Modal State
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [newReviewTitle, setNewReviewTitle] = useState("Sprint Review");
  const [newReviewDate, setNewReviewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Search filter for all sprint-tagged notes
  const [tagNotesQuery, setTagNotesQuery] = useState("");

  // Filtered items of current sprint
  const filteredItems = useMemo(() => {
    if (!currentDoc) return [];
    if (itemsFilter === "all") return currentDoc.items;
    return currentDoc.items.filter((it) => it.status === itemsFilter);
  }, [currentDoc, itemsFilter]);

  // Statistics for current sprint
  const stats = useMemo(() => {
    if (!currentDoc) return { total: 0, done: 0, in_progress: 0, todo: 0, percent: 0 };
    const total = currentDoc.items.length;
    const done = currentDoc.items.filter((i) => i.status === "done").length;
    const in_progress = currentDoc.items.filter((i) => i.status === "in_progress").length;
    const todo = currentDoc.items.filter((i) => i.status === "todo").length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, in_progress, todo, percent };
  }, [currentDoc]);

  // Handle adding new item
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !currentDoc) return;
    await addItem(newItemText.trim(), "todo", currentDoc.path);
    setNewItemText("");
  };

  // Handle close sprint submission
  const handleCloseSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDoc) return;
    try {
      setIsClosingSprint(true);
      await closeSprint(currentDoc.path, {
        nextSprintNumber: closeSprintNextNum.trim() || undefined,
        carryOverOpenItems: closeSprintCarryOver,
      });
      setShowCloseSprintModal(false);
    } catch (err) {
      console.error("Fehler beim Schließen des Sprints:", err);
    } finally {
      setIsClosingSprint(false);
    }
  };

  // Handle inline edit item save
  const handleSaveItemEdit = async (item: SprintItem) => {
    if (!editingItemText.trim()) return;
    await editItem(item, editingItemText.trim());
    setEditingItemId(null);
    setEditingItemText("");
  };

  // Handle toggle status cycle: todo -> in_progress -> done -> todo
  const handleCycleStatus = async (item: SprintItem) => {
    const nextStatusMap: Record<SprintItem["status"], SprintItem["status"]> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
      blocked: "todo",
    };
    await updateItemStatus(item, nextStatusMap[item.status]);
  };

  // Handle create new sprint
  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintNumber.trim()) return;
    await createNewSprint(
      newSprintNumber.trim(),
      newSprintStart.trim() || new Date().toISOString().split("T")[0],
      newSprintEnd.trim() || new Date().toISOString().split("T")[0]
    );
    setShowNewSprintModal(false);
    setNewSprintNumber("");
  };

  // Handle create new review
  const handleCreateReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewDate.trim()) return;
    const createdPath = await createNewReview(newReviewTitle.trim(), newReviewDate.trim());
    setShowNewReviewModal(false);
    if (createdPath) {
      setSelectedReviewPath(createdPath);
      setActiveTab("reviews");
    }
  };

  // Filtered list of all sprint-tagged notes
  const filteredAllNotes = useMemo(() => {
    if (!tagNotesQuery.trim()) return sprintFiles;
    const q = tagNotesQuery.toLowerCase();
    return sprintFiles.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [sprintFiles, tagNotesQuery]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border border-hairline rounded-md overflow-hidden select-none animate-fadeIn">
      {/* Top Header / Navigation Bar */}
      <div className="px-6 py-3.5 border-b border-hairline bg-[var(--bg-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Zurück zum Wissensraum"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cockpit</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-hairline shrink-0" />

          {/* Title & Active Sprint Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full shadow-xs shrink-0",
              currentDoc?.status === "aktiv" ? "bg-emerald-500 animate-pulse" : "bg-[var(--text-muted)]"
            )} />
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="font-editorial text-lg font-semibold tracking-tight text-[var(--text-primary)] truncate">
                Sprint Dashboard
              </h2>
              {currentDoc && (
                <span className={cn(
                  "font-mono text-[10px] uppercase px-1.5 py-0.2 rounded border shrink-0 font-bold",
                  currentDoc.status === "aktiv"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : currentDoc.status === "geplant"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)] border-hairline"
                )}>
                  {currentDoc.title} ({currentDoc.status})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* SPRINT LIFECYCLE: Close Sprint or Activate Sprint */}
          {currentDoc && currentDoc.status === "aktiv" && (
            <button
              type="button"
              onClick={() => {
                setCloseSprintNextNum(String(parseInt(currentDoc.sprintNumber || "0", 10) + 1));
                setShowCloseSprintModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
              title="Diesen Sprint abschließen und neuen Sprint starten"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sprint abschließen</span>
            </button>
          )}

          {currentDoc && currentDoc.status !== "aktiv" && (
            <button
              type="button"
              onClick={async () => {
                await setActiveSprint(currentDoc.path);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-emerald-500/30 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer shadow-2xs"
              title="Diesen Sprint als aktuell aktiven Sprint festlegen"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Als aktiv setzen</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (currentDoc) {
                setEditedRawContent(currentDoc.rawContent);
                setIsEditingNotes(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
            title="Sprint-Notiz direkt bearbeiten"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sprint bearbeiten</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewSprintModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
            title="Neuen Sprint anlegen"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Neuer Sprint</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewReviewModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
            title="Neues Sprint Review Notizblatt erstellen"
          >
            <Plus className="w-3.5 h-3.5 text-purple-500" />
            <span>Neues Review</span>
          </button>

          {currentDoc && onSelectFile && (
            <button
              type="button"
              onClick={() => onSelectFile(currentDoc.path)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
              title="Notiz im vollen Markdown-Viewer öffnen"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation & Sprint Switcher Bar */}
      <div className="px-6 py-2.5 border-b border-hairline bg-[var(--bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Tabs: Backlog & Planning | Reviews & Retros | Alle #Sprint Notizen */}
        <div className="flex items-center gap-1 p-0.5 rounded-[5px] bg-[var(--bg-subtle)] border border-hairline shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("sprint")}
            className={cn(
              "px-3 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "sprint"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Planning & Backlog Items</span>
            {currentDoc && (
              <span className="font-mono text-[10px] px-1 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                {currentDoc.items.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "px-3 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "reviews"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reviews & Retros</span>
            <span className="font-mono text-[10px] px-1 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
              {reviewsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all-notes")}
            className={cn(
              "px-3 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "all-notes"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Alle #Sprint-Notizen</span>
            <span className="font-mono text-[10px] px-1 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
              {sprintFiles.length}
            </span>
          </button>
        </div>

        {/* Sprint Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[10.5px] font-mono uppercase text-[var(--text-muted)] mr-1 shrink-0">
            Sprint:
          </span>
          {sprintsList.map((s) => {
            const isSelected = s.path === selectedSprintPath;
            const numMatch = s.name.match(/\d+/)?.[0];
            const isCurrent = s.path === activeSprintPath;

            return (
              <button
                key={s.path}
                type="button"
                onClick={() => setSelectedSprintPath(s.path)}
                className={cn(
                  "px-2.5 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer shrink-0 border flex items-center gap-1.5",
                  isSelected
                    ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] border-transparent font-semibold shadow-xs"
                    : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border-hairline"
                )}
              >
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Aktuell aktiver Sprint" />
                )}
                <span>Sprint {numMatch || s.name}</span>
                {isCurrent && (
                  <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Aktiv
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {/* TAB 1: SPRINT PLANNING & BACKLOG ITEMS */}
        {activeTab === "sprint" && (
          <div className="h-full grid grid-cols-12 gap-0 overflow-hidden divide-x divide-hairline">
            {/* Left 7 Cols: Backlog Items & Interactive Item Editor */}
            <div className="col-span-12 lg:col-span-7 h-full flex flex-col overflow-hidden">
              {/* Backlog Header & Controls */}
              <div className="p-4 border-b border-hairline bg-[var(--bg-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-editorial text-sm font-semibold text-[var(--text-primary)]">
                      Backlog Items & Aufgaben
                    </h3>
                    <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-hairline">
                      {stats.done} / {stats.total} erledigt ({stats.percent}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Klicke auf den Status eines Items zum Weiterschalten oder bearbeite es direkt.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setItemsFilter("all")}
                    className={cn(
                      "px-2 py-0.5 rounded cursor-pointer transition-colors",
                      itemsFilter === "all"
                        ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    )}
                  >
                    Alle ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsFilter("in_progress")}
                    className={cn(
                      "px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1",
                      itemsFilter === "in_progress"
                        ? "bg-amber-500 text-white font-semibold"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    )}
                  >
                    <span>🔄 In Arbeit</span>
                    <span>({stats.in_progress})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsFilter("todo")}
                    className={cn(
                      "px-2 py-0.5 rounded cursor-pointer transition-colors",
                      itemsFilter === "todo"
                        ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    )}
                  >
                    ⏳ Offen ({stats.todo})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsFilter("done")}
                    className={cn(
                      "px-2 py-0.5 rounded cursor-pointer transition-colors",
                      itemsFilter === "done"
                        ? "bg-emerald-600 text-white font-semibold"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    )}
                  >
                    ✅ Fertig ({stats.done})
                  </button>
                </div>
              </div>

              {/* Quick Add Bar */}
              <div className="p-3 border-b border-hairline bg-[var(--bg-surface)] shrink-0">
                <form onSubmit={handleAddItemSubmit} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Neues Item direkt zum Sprint hinzufügen (z. B. [GRL-15120] Logging-Fix)..."
                      className="w-full px-3 py-1.5 rounded-[4px] bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newItemText.trim()}
                    className="px-3 py-1.5 rounded-[4px] bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-2xs hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Item anlegen</span>
                  </button>
                </form>
              </div>

              {/* Items List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {loadingDoc ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Lade Sprint-Items…
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Keine Items mit diesem Filter gefunden.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isEditing = editingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "group p-3 rounded-lg border transition-all select-none flex flex-col gap-2 relative",
                            item.status === "done"
                              ? "bg-[var(--bg-subtle)]/50 border-hairline opacity-75"
                              : item.status === "in_progress"
                              ? "bg-[var(--bg-surface)] border-amber-500/30 shadow-xs"
                              : "bg-[var(--bg-surface)] border-hairline hover:border-[var(--border-strong)] shadow-xs"
                          )}
                        >
                          {/* Item Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              {/* Status Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(item)}
                                className={cn(
                                  "mt-0.5 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold cursor-pointer shrink-0 transition-all flex items-center gap-1 shadow-2xs",
                                  item.status === "done"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : item.status === "in_progress"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border border-hairline hover:text-[var(--text-primary)]"
                                )}
                                title="Klicken, um Status weiterzuschalten (Offen → In Arbeit → Erledigt)"
                              >
                                {item.status === "done" && <span>✅ Fertig</span>}
                                {item.status === "in_progress" && <span>🔄 In Arbeit</span>}
                                {item.status === "todo" && <span>⏳ Offen</span>}
                                {item.status === "blocked" && <span>❌ Blockiert</span>}
                              </button>

                              {/* Title / Inline Edit */}
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingItemText}
                                    onChange={(e) => setEditingItemText(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveItemEdit(item);
                                      if (e.key === "Escape") setEditingItemId(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveItemEdit(item)}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {item.ticketId && (
                                      <span className="font-mono text-[10.5px] font-semibold text-[var(--text-primary)] px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-hairline">
                                        {item.ticketId}
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        "text-xs font-medium text-[var(--text-primary)] break-words",
                                        item.status === "done" && "line-through text-[var(--text-muted)]"
                                      )}
                                    >
                                      {item.title.replace(item.ticketId || "", "").trim()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions on hover */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {item.ticketUrl && (
                                  <a
                                    href={item.ticketUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                                    title="In Jira / Browser öffnen"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditingItemText(item.title);
                                  }}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                                  title="Item-Text direkt bearbeiten"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item)}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title="Item aus Sprint entfernen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right 5 Cols: Sprint Planning, Notizen & Dev Snippets */}
            <div className="col-span-12 lg:col-span-5 h-full flex flex-col overflow-hidden bg-[var(--bg-surface)]">
              {/* Header */}
              <div className="p-4 border-b border-hairline bg-[var(--bg-subtle)] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-editorial text-sm font-semibold text-[var(--text-primary)]">
                    Sprint Planning & Notizen
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Zeitraum: {currentDoc?.startDate || "—"} bis {currentDoc?.endDate || "—"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditingNotes) {
                      if (currentDoc) saveRawContent(editedRawContent, currentDoc.path);
                      setIsEditingNotes(false);
                    } else if (currentDoc) {
                      setEditedRawContent(currentDoc.rawContent);
                      setIsEditingNotes(true);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
                >
                  {isEditingNotes ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Speichern</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Bearbeiten</span>
                    </>
                  )}
                </button>
              </div>

              {/* Planning & Notes Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase block">
                        Markdown-Direktbearbeitung:
                      </span>
                      <textarea
                        value={editedRawContent}
                        onChange={(e) => setEditedRawContent(e.target.value)}
                        rows={22}
                        className="w-full p-3 rounded-lg bg-[var(--bg-subtle)] border border-hairline font-mono text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-strong)]"
                      />
                    </div>
                  ) : (
                    <>
                      {/* Sprint Meta Card */}
                      <div className="p-3.5 rounded-lg border border-hairline bg-[var(--bg-subtle)] space-y-2.5 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-[10.5px]">STATUS:</span>
                          <span className={cn(
                            "font-bold uppercase text-[10.5px] px-1.5 py-0.5 rounded border",
                            currentDoc?.status === "aktiv"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : currentDoc?.status === "geplant"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-hairline"
                          )}>
                            {currentDoc?.status || "ABGESCHLOSSEN"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-[10.5px]">REVIEW-DATUM:</span>
                          <span className="text-[var(--text-primary)]">
                            {currentDoc?.reviewDate || currentDoc?.endDate || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-[10.5px]">DATEI:</span>
                          <span className="text-[var(--text-muted)] truncate max-w-[200px]" title={currentDoc?.path}>
                            {currentDoc?.fileName}
                          </span>
                        </div>

                        {/* Quick action buttons in meta card */}
                        {currentDoc && (
                          <div className="pt-2 border-t border-hairline flex items-center justify-end">
                            {currentDoc.status === "aktiv" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCloseSprintNextNum(String(parseInt(currentDoc.sprintNumber || "0", 10) + 1));
                                  setShowCloseSprintModal(true);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Sprint abschließen & Übergabe</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await setActiveSprint(currentDoc.path);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-emerald-500/30 text-xs font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer shadow-2xs transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Als aktiven Sprint setzen</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Notizen & Dev Snippets Section */}
                      <div>
                        <h4 className="font-editorial text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5 font-mono">
                          <BookOpen className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                          <span>Notizen & Dev Snippets</span>
                        </h4>
                        {currentDoc?.notesSection ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed p-3 rounded-lg border border-hairline bg-[var(--bg-subtle)]">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {currentDoc.notesSection}
                            </Markdown>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg border border-dashed border-hairline text-xs text-[var(--text-muted)] text-center">
                            Keine Notizen erfasst. Klicke auf „Bearbeiten“, um Notizen einzutragen.
                          </div>
                        )}
                      </div>

                      {/* Ergebnis / Outcomes Section */}
                      {currentDoc?.ergebnisSection && (
                        <div>
                          <h4 className="font-editorial text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Ergebnis & Review-Zusammenfassung</span>
                          </h4>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed p-3 rounded-lg border border-hairline bg-[var(--bg-subtle)]">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {currentDoc.ergebnisSection}
                            </Markdown>
                          </div>
                        </div>
                      )}

                      {/* Related Planning Journals */}
                      <div>
                        <h4 className="font-editorial text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5 font-mono">
                          <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>Verknüpfte Planning-Journale ({planningList.length})</span>
                        </h4>
                        <div className="space-y-1.5">
                          {planningList.slice(0, 4).map((p) => (
                            <div
                              key={p.path}
                              onClick={() => onSelectFile?.(p.path)}
                              className="p-2 rounded border border-hairline hover:bg-[var(--bg-hover)] cursor-pointer transition-colors flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-[var(--text-primary)] truncate">
                                {p.name.replace(".md", "")}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* TAB 2: REVIEWS & RETROS */}
        {activeTab === "reviews" && (
          <div className="h-full grid grid-cols-12 gap-0 overflow-hidden divide-x divide-hairline">
            {/* Left 4 Cols: List of Reviews & Retros */}
            <div className="col-span-12 lg:col-span-4 h-full flex flex-col overflow-hidden bg-[var(--bg-subtle)]">
              <div className="p-4 border-b border-hairline flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-editorial text-sm font-semibold text-[var(--text-primary)]">
                    Sprint Reviews & Retros
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {reviewsList.length} Protokolle & Notizen gefunden
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(true)}
                  className="px-2 py-1 rounded bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-medium cursor-pointer shadow-2xs hover:opacity-90"
                >
                  + Neu
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1.5">
                  {reviewsList.map((r) => {
                    const isSelected = r.path === selectedReviewPath;
                    const isRetro = /retro/i.test(r.name);

                    return (
                      <div
                        key={r.path}
                        onClick={() => setSelectedReviewPath(r.path)}
                        className={cn(
                          "p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1",
                          isSelected
                            ? "border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs"
                            : "border-hairline bg-[var(--bg-surface)]/70 hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold",
                              isRetro
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            )}
                          >
                            {isRetro ? "Retro" : "Review"}
                          </span>
                          <span className="font-mono text-[9.5px] text-[var(--text-muted)]">
                            {r.name.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] || ""}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {r.name.replace(".md", "")}
                        </h4>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] truncate">
                          {r.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right 8 Cols: Selected Review Document Details & Inline Editing */}
            <div className="col-span-12 lg:col-span-8 h-full flex flex-col overflow-hidden bg-[var(--bg-surface)]">
              {selectedReviewPath ? (
                <ReviewDocumentViewer
                  path={selectedReviewPath}
                  onOpenFull={onSelectFile}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-muted)]">
                  <CheckCircle2 className="w-8 h-8 text-[var(--text-faint)] mb-2" />
                  <p className="font-medium text-[var(--text-secondary)]">Wähle links ein Sprint Review oder eine Retro aus</p>
                  <p className="mt-1">Du kannst Notizen, Teilnehmer und Vereinbarungen direkt hier betrachten und bearbeiten.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ALLE NOTIZEN MIT #SPRINT */}
        {activeTab === "all-notes" && (
          <div className="h-full flex flex-col overflow-hidden p-6 max-w-[1200px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline shrink-0">
              <div>
                <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                  Alle mit #Sprint getaggten Notizen & Dokumente
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Vollständige Übersicht aller Dokumente im Vault mit Sprint-Bezug, Sprints, Retros, Reviews und Planungsjournalen.
                </p>
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tagNotesQuery}
                  onChange={(e) => setTagNotesQuery(e.target.value)}
                  placeholder="In Sprint-Notizen suchen…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-[4px] bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAllNotes.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => onSelectFile?.(f.path)}
                    className="p-3.5 rounded-lg border border-hairline bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border border-hairline truncate">
                          {f.category}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] transition-colors">
                        {f.name.replace(".md", "")}
                      </h4>
                    </div>

                    <div className="pt-2 mt-2 border-t border-hairline flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                      <span className="truncate">{f.path.split("/").slice(-2, -1)[0]}</span>
                      <span className="text-[var(--text-primary)] font-medium">Öffnen ↗</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* MODAL 1: NEUEN SPRINT ANLEGEN */}
      {showNewSprintModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn"
          onClick={() => setShowNewSprintModal(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg-surface)] border border-hairline rounded-lg shadow-2xl p-6 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-hairline">
              <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                Neuen Sprint anlegen
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSprintModal(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSprintSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                  Sprint-Nummer
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. 67"
                  value={newSprintNumber}
                  onChange={(e) => setNewSprintNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                    Start-Datum
                  </label>
                  <input
                    type="date"
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                    Ende-Datum
                  </label>
                  <input
                    type="date"
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSprintModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer shadow-2xs hover:opacity-90"
                >
                  Sprint erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SPRINT ABSCHLIESSEN */}
      {showCloseSprintModal && currentDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn"
          onClick={() => setShowCloseSprintModal(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg-surface)] border border-hairline rounded-lg shadow-2xl p-6 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-hairline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                  Sprint {currentDoc.sprintNumber || currentDoc.title} abschließen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseSprintModal(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseSprintSubmit} className="space-y-4">
              <div className="p-3 rounded-lg border border-hairline bg-[var(--bg-subtle)] space-y-1.5 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-[var(--text-muted)]">Erledigt:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.done} von {stats.total} Items ({stats.percent}%)
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[var(--text-muted)]">Offen / In Arbeit:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {stats.todo + stats.in_progress} Items
                  </span>
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                  Nächste Sprint-Nummer
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. 68"
                  value={closeSprintNextNum}
                  onChange={(e) => setCloseSprintNextNum(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {stats.todo + stats.in_progress > 0 && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-hairline bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeSprintCarryOver}
                    onChange={(e) => setCloseSprintCarryOver(e.target.checked)}
                    className="mt-0.5 rounded accent-emerald-500"
                  />
                  <span>
                    Offene & in Arbeit befindliche Aufgaben ({stats.todo + stats.in_progress}) automatisch als <strong>Carry-Over</strong> in Sprint {closeSprintNextNum || "den nächsten Sprint"} übernehmen
                  </span>
                </label>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseSprintModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  disabled={isClosingSprint}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isClosingSprint}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isClosingSprint ? "Schließe ab…" : "Sprint jetzt abschließen"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEUES REVIEW ANLEGEN */}
      {showNewReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fadeIn"
          onClick={() => setShowNewReviewModal(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg-surface)] border border-hairline rounded-lg shadow-2xl p-6 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-hairline">
              <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                Neues Sprint Review Protokoll anlegen
              </h3>
              <button
                type="button"
                onClick={() => setShowNewReviewModal(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReviewSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                  Titel / Anlass
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Sprint Review"
                  value={newReviewTitle}
                  onChange={(e) => setNewReviewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase text-[var(--text-muted)] block mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  required
                  value={newReviewDate}
                  onChange={(e) => setNewReviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-subtle)] border border-hairline text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer shadow-2xs hover:opacity-90"
                >
                  Protokoll erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Live Review Document Viewer & Inline Editor
function ReviewDocumentViewer({
  path,
  onOpenFull,
}: {
  path: string;
  onOpenFull?: (path: string) => void;
}) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const fileName = path.split("/").pop() || "Review Notiz";

  const loadContent = async () => {
    try {
      setLoading(true);
      const text = await (await import("@/lib/backend")).invoke<string>("read_file", { path });
      setContent(text);
      setEditContent(text);
    } catch (e) {
      console.error("Fehler beim Lesen des Reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  useMemo(() => {
    loadContent();
    setIsEditing(false);
  }, [path]);

  const handleSave = async () => {
    try {
      await (await import("@/lib/backend")).invoke("write_file", { path, content: editContent });
      setContent(editContent);
      setIsEditing(false);
      (await import("@/lib/backend")).emitVaultChanged();
    } catch (e) {
      console.error("Fehler beim Speichern des Reviews:", e);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-hairline bg-[var(--bg-subtle)] flex items-center justify-between shrink-0">
        <div>
          <h4 className="font-editorial text-sm font-semibold text-[var(--text-primary)] truncate">
            {fileName.replace(".md", "")}
          </h4>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {path.replace(/^\/Users\/[^/]+\/Documents\/second-brain\/?/, "")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setEditContent(content);
                setIsEditing(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
          >
            {isEditing ? (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-500" />
                <span>Speichern</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                <span>Bearbeiten</span>
              </>
            )}
          </button>

          {onOpenFull && (
            <button
              type="button"
              onClick={() => onOpenFull(path)}
              className="p-1.5 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-hairline text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Im Editor öffnen"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-[800px] mx-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              Lade Protokoll…
            </div>
          ) : isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={24}
              className="w-full p-4 rounded-lg bg-[var(--bg-subtle)] border border-hairline font-mono text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none"
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
