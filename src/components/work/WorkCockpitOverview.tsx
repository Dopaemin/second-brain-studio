import { useState, useMemo } from "react";
import { noteLabel, cn } from "@/lib/utils";
import {
  FileText,
  ArrowRight,
  FolderGit2,
  BookOpen,
  Clock,
  Inbox,
  Sparkles,
  Search,
  Bot,
  ChevronRight,
  CalendarDays,
  Plus,
  Compass,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useVaultFiles, useRecentFiles } from "@/hooks/useVaultFiles";
import { useCopilotActions, isEditedByCopilot } from "@/lib/copilotHistory";
import { usePods } from "@/hooks/usePods";
import { Pod, getPodFiles } from "@/lib/pods";
import { PodCard } from "@/components/pods/PodCard";
import { PodDetailView } from "@/components/pods/PodDetailView";
import { CreatePodModal } from "@/components/pods/CreatePodModal";
import { EditPodModal } from "@/components/pods/EditPodModal";
import { SprintDashboardView } from "./SprintDashboardView";
import { useSprintData } from "@/hooks/useSprintData";
import { ScrollArea } from "../ui/scroll-area";

interface WorkCockpitOverviewProps {
  onSelectFile: (path: string) => void;
  onSelectPod?: (pod: Pod | null) => void;
}

interface TopicHub {
  title: string;
  description: string;
  count: number;
  badge: string;
  targetPath: string | null;
}

function formatTimeAgo(unixSecs: number): string {
  const diff = Date.now() / 1000 - unixSecs;
  if (diff < 60) return "Gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "Gestern" : `vor ${days}d`;
}

export function WorkCockpitOverview({ onSelectFile }: WorkCockpitOverviewProps) {
  const { files } = useVaultFiles("work");
  const recentFiles = useRecentFiles("work", 6);
  const copilotActions = useCopilotActions();
  const [recentFilter, setRecentFilter] = useState<"all" | "copilot">("all");

  const { pods, addPod, updatePod, removePod } = usePods();
  const [activePod, setActivePod] = useState<Pod | null>(null);
  const [createPodOpen, setCreatePodOpen] = useState(false);
  const [podToEdit, setPodToEdit] = useState<Pod | null>(null);

  // Sprints state & integration
  const [cockpitView, setCockpitView] = useState<"overview" | "sprints">("overview");
  const { activeSprintDoc, sprintsList, reviewsList, updateItemStatus } = useSprintData();

  // Discover actual folder structures in the Work Vault to suggest for Pods
  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      const rel = f.path.replace(/^\/Users\/[^/]+\/Documents\/second-brain\/?/, "");
      const parts = rel.split("/");
      if (parts.length > 1) {
        parts.pop(); // discard filename
        set.add(parts.join("/"));
      }
    }
    return Array.from(set).sort();
  }, [files]);

  const projectsCount = files.filter((f) => f.category.includes("02")).length;
  const resourcesCount = files.filter((f) => f.category.includes("04")).length;
  const dailyCount = files.filter((f) => f.category.includes("05")).length;
  const inboxCount = files.filter((f) => f.category.includes("01")).length;

  const sprintLogs = useMemo(() => {
    return files
      .filter(
        (f) =>
          f.name.toLowerCase().includes("sprint") ||
          f.path.includes("Sessions") ||
          f.path.includes("Daily Notes")
      )
      .slice(0, 5);
  }, [files]);

  const topicHubs = useMemo<TopicHub[]>(() => {
    const omni = files.filter((f) => f.path.includes("Sustainability in EPM"));
    const gl = files.filter(
      (f) => f.path.includes("SAP Green Ledger") && !f.path.includes("CBAM")
    );
    const cbam = files.filter(
      (f) => f.path.includes("CBAM") || f.path.includes("Green Ledger CBAM")
    );
    const devAi = files.filter(
      (f) => f.path.includes("AI und KI") || f.path.includes("Dev Snippets")
    );

    return [
      {
        title: "Sustainability in EPM – Omni Agent",
        description: "Agent User Flows, Personas, Pod 2 & Footprint Optimization",
        count: omni.length,
        badge: "Fokus-Projekt",
        targetPath:
          omni.find((f) => f.name === "INDEX")?.path ||
          omni.find((f) => f.name.includes("Kick-off"))?.path ||
          omni[0]?.path ||
          null,
      },
      {
        title: "SAP Green Ledger",
        description: "Metering Architektur, Sprints, FDD Process & Schnittstellen",
        count: gl.length,
        badge: "Kern-Domäne",
        targetPath:
          gl.find((f) => f.name === "INDEX")?.path ||
          gl.find((f) => f.name.includes("Home"))?.path ||
          gl[0]?.path ||
          null,
      },
      {
        title: "Dev Snippets & AI Tools",
        description: "Model Context Protocol (MCP), Prompting, CQL & UI5 Best Practices",
        count: devAi.length,
        badge: "Wissensbasis",
        targetPath:
          devAi.find((f) => f.name === "INDEX")?.path ||
          devAi.find((f) => f.name.includes("MCP"))?.path ||
          devAi[0]?.path ||
          null,
      },
      {
        title: "Green Ledger CBAM",
        description: "Engineering Alignment, Sprint Reviews & Vertretungsübergabe",
        count: cbam.length,
        badge: "Sprint-Bereich",
        targetPath:
          cbam.find((f) => f.name.includes("INDEX"))?.path ||
          cbam[0]?.path ||
          null,
      },
    ];
  }, [files]);

  if (activePod) {
    return (
      <PodDetailView
        pod={activePod}
        allFiles={files}
        onBack={() => setActivePod(null)}
        onSelectFile={onSelectFile}
        onDeletePod={(id) => {
          removePod(id);
          setActivePod(null);
        }}
        onUpdatePod={(updated) => {
          setActivePod(updated);
        }}
        availableFolders={availableFolders}
      />
    );
  }

  if (cockpitView === "sprints") {
    return (
      <SprintDashboardView
        onBack={() => setCockpitView("overview")}
        onSelectFile={onSelectFile}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border border-hairline rounded-md overflow-hidden select-none">
      <ScrollArea className="h-full">
        <div className="p-6 lg:p-7 space-y-6 w-full max-w-[1280px] mx-auto">
          {/* Editorial Welcome Header */}
          <div className="pb-5 border-b border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <h2 className="font-editorial text-2xl font-normal text-[var(--text-primary)] tracking-tight">
                  Wissensraum & Cockpit
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-semibold">{files.length} Notizen</span>
                <span>•</span>
                <span>{projectsCount} Aktive Projekte</span>
                <span>•</span>
                <span>{resourcesCount} Ressourcen</span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">Vault synchronisiert</span>
                {copilotActions.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[var(--accent-cobalt)] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {copilotActions.length} Copilot Aktionen
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Keyboard Actions & View Switcher */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* View Switcher: Cockpit vs. Sprint Dashboard */}
              <div className="inline-flex items-center p-0.5 rounded-[5px] bg-[var(--bg-subtle)] border border-hairline mr-1">
                <button
                  type="button"
                  onClick={() => setCockpitView("overview")}
                  className="px-3 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Cockpit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCockpitView("sprints")}
                  className="px-3 py-1 rounded-[4px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sprints</span>
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    Sprint {activeSprintDoc?.sprintNumber || (sprintsList[0]?.name.match(/\d+/)?.[0] ?? "—")}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-hairline text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-cobalt)] transition-colors" />
                <span>Dokument suchen</span>
                <kbd className="ml-1 font-mono text-[10px] px-1 py-0.2 rounded bg-black/[0.04] text-[var(--text-muted)] border border-hairline">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "j", metaKey: true, bubbles: true })
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--accent-cobalt-subtle)] hover:bg-[#ebf0fe] border border-[var(--accent-cobalt-border)] text-xs font-semibold text-[var(--accent-cobalt)] transition-colors cursor-pointer shadow-2xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Wiki Copilot</span>
                <kbd className="ml-1 font-mono text-[10px] px-1 py-0.2 rounded bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/20">
                  ⌘J
                </kbd>
              </button>
            </div>
          </div>

          {/* Minimalist Metrics Grid - 4 Columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline hover:border-[var(--border-strong)] transition-colors">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span>Aktive Projekte</span>
                <FolderGit2 className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
              </div>
              <p className="font-editorial text-2xl text-[var(--text-primary)] leading-none mt-1">{projectsCount}</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1.5 truncate">Work, POCs & Specs</p>
            </div>

            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline hover:border-[var(--border-strong)] transition-colors">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span>Ressourcen & Wissen</span>
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="font-editorial text-2xl text-[var(--text-primary)] leading-none mt-1">{resourcesCount}</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1.5 truncate">AI, Guides & Snippets</p>
            </div>

            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline hover:border-[var(--border-strong)] transition-colors">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span>Daily & Sessions</span>
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p className="font-editorial text-2xl text-[var(--text-primary)] leading-none mt-1">{dailyCount}</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1.5 truncate">Journal & Arbeits-Logs</p>
            </div>

            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline hover:border-[var(--border-strong)] transition-colors">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span>Inbox & Schnellnotizen</span>
                <Inbox className="w-3.5 h-3.5 text-stone-600" />
              </div>
              <p className="font-editorial text-2xl text-[var(--text-primary)] leading-none mt-1">{inboxCount}</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1.5 truncate">Unsortierte Gedanken</p>
            </div>
          </div>

          {/* PODS KACHEL / SEGMENT: Team LLM Wikis */}
          <div className="p-5 rounded-lg bg-[#fafaf8] border border-hairline hover:border-[var(--border-strong)] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3.5 border-b border-hairline">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cobalt)] shadow-xs animate-pulse" />
                  <h3 className="font-editorial text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Pods
                  </h3>
                  <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.2 rounded bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)] font-semibold">
                    Team LLM Wikis
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    • {pods.length} {pods.length === 1 ? "Pod" : "Pods"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Cluster für Teamaufgaben. Klicke auf einen Punkt mit Titel, um in den Dokumenten-Pfad des Pods zu springen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreatePodOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white hover:bg-[#f0f0ea] border border-hairline text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                <span>Neuer Pod</span>
              </button>
            </div>

            {/* Pods Grid */}
            {pods.length === 0 ? (
              <div className="py-8 text-center bg-white border border-dashed border-hairline rounded-md">
                <p className="text-xs text-[var(--text-muted)]">Noch keine Pods angelegt.</p>
                <button
                  type="button"
                  onClick={() => setCreatePodOpen(true)}
                  className="mt-2 text-xs text-[var(--accent-cobalt)] hover:underline font-medium cursor-pointer"
                >
                  + Ersten Pod für dein Team erstellen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pods.map((pod) => (
                  <PodCard
                    key={pod.id}
                    pod={pod}
                    filesCount={getPodFiles(pod, files).length}
                    onEnterPod={(selected) => setActivePod(selected)}
                    onEditPod={(selected) => setPodToEdit(selected)}
                    onDeletePod={removePod}
                  />
                ))}

                {/* Action Card: Neuen Pod anlegen */}
                <button
                  type="button"
                  onClick={() => setCreatePodOpen(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-hairline hover:border-[var(--accent-cobalt-border)] hover:bg-[#fbfbf8] text-[var(--text-muted)] hover:text-[var(--accent-cobalt)] transition-all cursor-pointer group min-h-[110px]"
                >
                  <Plus className="w-4 h-4 mb-1 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)] transition-colors" />
                  <span className="text-xs font-medium">Neuen Pod anlegen</span>
                  <span className="font-mono text-[9px] text-[var(--text-faint)] mt-0.5">
                    Teamaufgabe & LLM Wiki
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Sprints & Backlog Cockpit Segment */}
          <div className="p-5 rounded-lg border border-hairline bg-[var(--bg-surface)] space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs animate-pulse shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                      Sprints & Backlog
                    </h3>
                    <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      Aktiv: Sprint {activeSprintDoc?.sprintNumber || (sprintsList[0]?.name.match(/\d+/)?.[0] ?? "—")}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {activeSprintDoc?.startDate && activeSprintDoc?.endDate
                      ? `Zeitraum: ${activeSprintDoc.startDate} – ${activeSprintDoc.endDate}${activeSprintDoc.reviewDate ? ` (Review am ${activeSprintDoc.reviewDate})` : ""}`
                      : activeSprintDoc
                      ? "Zeitraum: Laufend"
                      : "Kein aktiver Sprint ausgewählt"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCockpitView("sprints")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer shadow-2xs hover:opacity-90 transition-opacity"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sprint Dashboard öffnen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Sprint Items Direct Preview & Status */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Aktuelle Backlog Items ({activeSprintDoc?.items.length || 0})
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  Klicke auf den Status zum Weiterschalten
                </span>
              </div>

              {(!activeSprintDoc?.items || activeSprintDoc.items.length === 0) ? (
                <div className="p-6 rounded border border-dashed border-hairline text-center text-xs text-[var(--text-muted)]">
                  Keine Backlog Items in Sprint {activeSprintDoc?.sprintNumber || ""} erfasst.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeSprintDoc.items.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded border border-hairline bg-[var(--bg-subtle)] flex items-center justify-between gap-2.5 text-xs select-none hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next = item.status === "done" ? "todo" : item.status === "todo" ? "in_progress" : "done";
                            updateItemStatus(item, next);
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold shrink-0 cursor-pointer shadow-2xs transition-all",
                            item.status === "done"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : item.status === "in_progress"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)]"
                          )}
                          title="Status ändern"
                        >
                          {item.status === "done" ? "✅ Fertig" : item.status === "in_progress" ? "🔄 In Arbeit" : "⏳ Offen"}
                        </button>

                        {item.ticketId && (
                          <span className="font-mono text-[10px] font-semibold text-[var(--text-primary)] shrink-0">
                            {item.ticketId}
                          </span>
                        )}

                        <span className={cn("truncate text-[var(--text-primary)]", item.status === "done" && "line-through text-[var(--text-muted)]")}>
                          {item.title.replace(item.ticketId || "", "").trim()}
                        </span>
                      </div>

                      {item.ticketUrl && (
                        <a
                          href={item.ticketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 p-1"
                          title="In Jira öffnen"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sprint Reviews / Planning Quick Strip */}
            <div className="pt-2 border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10.5px]">
                  <strong>{reviewsList.length}</strong> Review & Retro-Notizen
                </span>
                <span>•</span>
                <span className="font-mono text-[10.5px]">
                  <strong>{sprintsList.length}</strong> Sprints archiviert
                </span>
              </div>

              <div className="flex items-center gap-2">
                {reviewsList[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      setCockpitView("sprints");
                    }}
                    className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:underline text-xs cursor-pointer"
                  >
                    <span>Letztes Review: {reviewsList[0].name.replace(".md", "")}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Zuletzt bearbeitet - Mit Filter-Tabs für "Alle" und "Vom Copilot bearbeitet" */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center p-0.5 rounded-[4px] bg-[#eeeee9] border border-hairline">
                  <button
                    type="button"
                    onClick={() => setRecentFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-[3px] font-mono text-[10.5px] uppercase tracking-wider font-semibold transition-all cursor-pointer",
                      recentFilter === "all"
                        ? "bg-white text-[var(--text-primary)] shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Alle Zuletzt Bearbeitet ({recentFiles.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecentFilter("copilot")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-[10.5px] uppercase tracking-wider font-semibold transition-all cursor-pointer",
                      recentFilter === "copilot"
                        ? "bg-[var(--accent-cobalt)] text-white dark:text-zinc-950 dark:font-semibold shadow-xs"
                        : "text-[var(--accent-cobalt)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Vom Copilot Bearbeitet ({copilotActions.length})</span>
                  </button>
                </div>
              </div>

              <span className="font-mono text-[10px] text-[var(--text-faint)]">
                {recentFilter === "copilot"
                  ? "Vom Knowledge Copilot geschriebene & geöffnete Notizen"
                  : "Klicken zum Lesen & Bearbeiten"}
              </span>
            </div>

            {/* Filter: Alle Notizen */}
            {recentFilter === "all" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {recentFiles.map((file) => {
                  const fromCopilot = isEditedByCopilot(file.path);
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => onSelectFile(file.path)}
                      className="p-3.5 rounded-md bg-[#fafaf8] hover:bg-[#f4f4ee] border border-hairline hover:border-[var(--accent-cobalt-border)] text-left transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs min-h-[92px]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
                          {fromCopilot && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-[8.5px] px-1 py-0.2 rounded bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)] font-semibold shrink-0">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Copilot</span>
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9.5px] text-[var(--text-muted)] shrink-0">
                          {formatTimeAgo(file.modified)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] transition-colors truncate">
                          {noteLabel(file.path)}
                        </h4>
                        <p className="font-mono text-[9.5px] text-[var(--text-muted)] truncate mt-1">
                          {file.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter: Nur vom Copilot bearbeitet */}
            {recentFilter === "copilot" && (
              <div>
                {copilotActions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {copilotActions.slice(0, 6).map((action) => (
                      <button
                        key={`${action.path}-${action.timestamp}`}
                        type="button"
                        onClick={() => onSelectFile(action.path)}
                        className="p-3.5 rounded-md bg-[var(--accent-cobalt-subtle)]/30 hover:bg-[var(--accent-cobalt-subtle)]/70 border border-[var(--accent-cobalt-border)] text-left transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs min-h-[92px]"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-white text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)] uppercase tracking-wider font-semibold">
                              {action.action === "created"
                                ? "Neu erstellt"
                                : action.action === "updated"
                                ? "Aktualisiert"
                                : "Geöffnet"}
                            </span>
                          </div>
                          <span className="font-mono text-[9.5px] text-[var(--text-muted)] shrink-0">
                            {formatTimeAgo(action.timestamp / 1000)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] transition-colors truncate">
                            {action.name}
                          </h4>
                          <p className="font-mono text-[9.5px] text-[var(--text-muted)] truncate mt-1">
                            {action.summary || action.category}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-[#fafaf8] border border-dashed border-hairline rounded-md p-6">
                    <Sparkles className="w-6 h-6 text-[var(--accent-cobalt)] mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                      Noch keine Notizen vom Copilot bearbeitet
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">
                      Frage den Wiki Copilot (⌘J), um neue Sessions anzulegen, Notizen zusammenzufassen oder Inhalte zu bearbeiten.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new KeyboardEvent("keydown", { key: "j", metaKey: true, bubbles: true })
                        )
                      }
                      className="editorial-btn editorial-btn-primary text-xs gap-1.5 mx-auto"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Copilot öffnen (⌘J)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lower Dual-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {/* Left Column: Recent Work Sessions & Logs */}
            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Arbeits-Sessions & Logs
                    </h3>
                  </div>
                  <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline">
                    {sprintLogs.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sprintLogs.map((log) => {
                    const fromCopilot = isEditedByCopilot(log.path);
                    return (
                      <button
                        key={log.path}
                        type="button"
                        onClick={() => onSelectFile(log.path)}
                        className="w-full flex items-center justify-between p-2.5 rounded-[4px] bg-white hover:bg-[#f0f0ea] border border-hairline hover:border-[var(--border-strong)] text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <Clock className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)] shrink-0 transition-colors" />
                          <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] font-medium truncate">
                            {log.name}
                          </span>
                          {fromCopilot && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-[8.5px] px-1 py-0.2 rounded bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border border-[var(--accent-cobalt-border)] font-medium shrink-0">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Copilot</span>
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9.5px] text-[var(--accent-cobalt)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          Öffnen <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-hairline flex items-center justify-between font-mono text-[10px] text-[var(--text-muted)]">
                <span>Tägliche Notizen & Sprint-Syncs</span>
                <span className="text-[var(--accent-cobalt)]">05 Daily Notes</span>
              </div>
            </div>

            {/* Right Column: Key Topic Hubs */}
            <div className="p-4 rounded-md bg-[#fafaf8] border border-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                    <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Wissens-Schwerpunkte
                    </h3>
                  </div>
                  <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline">
                    {topicHubs.length} Bereiche
                  </span>
                </div>

                <div className="space-y-1.5">
                  {topicHubs.map((hub) => (
                    <button
                      key={hub.title}
                      type="button"
                      disabled={!hub.targetPath}
                      onClick={() => hub.targetPath && onSelectFile(hub.targetPath)}
                      className="w-full flex items-center justify-between p-2.5 rounded-[4px] bg-white hover:bg-[#f0f0ea] border border-hairline hover:border-[var(--accent-cobalt-border)] text-left transition-all group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cobalt)] truncate">
                            {hub.title}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline shrink-0">
                            {hub.count} Notizen
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-muted)] truncate">
                          {hub.description}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--accent-cobalt)] transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-hairline flex items-center justify-between font-mono text-[10px] text-[var(--text-muted)]">
                <span>Themenwelten im Vault</span>
                <span className="text-[var(--accent-cobalt)]">Direkt springen →</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Pod Modal */}
      <CreatePodModal
        isOpen={createPodOpen}
        onClose={() => setCreatePodOpen(false)}
        availableFolders={availableFolders}
        onCreate={async (data) => {
          const created = await addPod(data);
          setActivePod(created);
        }}
      />

      {/* Edit Pod Settings Modal */}
      <EditPodModal
        isOpen={!!podToEdit}
        pod={podToEdit}
        onClose={() => setPodToEdit(null)}
        availableFolders={availableFolders}
        onSave={(id, data) => {
          updatePod(id, data);
          setPodToEdit(null);
        }}
      />
    </div>
  );
}
