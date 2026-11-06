import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  FolderGit2,
  Layers,
  BookOpen,
  Inbox,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  FileText,
  CalendarDays,
  Archive,
  Compass,
  ChevronsUpDown,
  X,
  FileCode,
  Plus,
} from "lucide-react";
import { useVaultFiles, useOpenInEditor, VaultFile, vaultRoot } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { TreeContextMenu, ContextMenuTarget } from "./TreeContextMenu";

interface QuickAccessProps {
  selectedFilePath?: string | null;
  onSelectFile: (path: string | null) => void;
}

export interface FileNode {
  type: "file";
  name: string;
  path: string;
  relPath: string;
  file: VaultFile;
}

export interface FolderNode {
  type: "folder";
  name: string;
  relPath: string;
  folders: FolderNode[];
  files: FileNode[];
  totalCount: number;
}

// Display config for top-level PARA folders
const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Folder }> = {
  "01 Inbox": { label: "Inbox", icon: Inbox },
  "02 Projekte": { label: "Projekte", icon: FolderGit2 },
  "03 Bereiche": { label: "Bereiche", icon: Layers },
  "04 Ressourcen": { label: "Ressourcen", icon: BookOpen },
  "05 Daily Notes": { label: "Daily Notes", icon: CalendarDays },
  "00 Kontext": { label: "Kontext", icon: Compass },
  "06 Archiv": { label: "Archiv", icon: Archive },
};

const CATEGORY_ORDER = [
  "01 Inbox",
  "02 Projekte",
  "03 Bereiche",
  "04 Ressourcen",
  "05 Daily Notes",
  "00 Kontext",
  "06 Archiv",
];

function buildVaultTree(files: VaultFile[], vaultRootPath: string): FolderNode {
  const rootNode: FolderNode = {
    type: "folder",
    name: "root",
    relPath: "",
    folders: [],
    files: [],
    totalCount: 0,
  };

  const folderMap = new Map<string, FolderNode>();
  folderMap.set("", rootNode);

  function getOrCreateFolder(relFolderPath: string): FolderNode {
    if (folderMap.has(relFolderPath)) return folderMap.get(relFolderPath)!;
    const lastSlash = relFolderPath.lastIndexOf("/");
    const parentPath = lastSlash !== -1 ? relFolderPath.slice(0, lastSlash) : "";
    const parentNode = getOrCreateFolder(parentPath);
    const folderName = lastSlash !== -1 ? relFolderPath.slice(lastSlash + 1) : relFolderPath;

    const newNode: FolderNode = {
      type: "folder",
      name: folderName,
      relPath: relFolderPath,
      folders: [],
      files: [],
      totalCount: 0,
    };
    parentNode.folders.push(newNode);
    folderMap.set(relFolderPath, newNode);
    return newNode;
  }

  const normalizedRoot = vaultRootPath.replace(/\\/g, "/").replace(/\/+$/, "");

  for (const f of files) {
    const normPath = f.path.replace(/\\/g, "/");
    let rel = normPath.startsWith(normalizedRoot)
      ? normPath.slice(normalizedRoot.length).replace(/^\/+/, "")
      : normPath;

    const parts = rel.split("/");
    const rawFileName = parts.pop() || "";
    const fileName = rawFileName.replace(/\.md$/, "");
    const folderRel = parts.join("/");
    const targetFolder = getOrCreateFolder(folderRel);
    targetFolder.files.push({
      type: "file",
      name: fileName,
      path: f.path,
      relPath: rel,
      file: f,
    });
  }

  function sortAndCount(node: FolderNode, isTop = false): void {
    let count = node.files.length;

    node.files.sort((a, b) => {
      if (a.name === "INDEX" || a.name === "README") return -1;
      if (b.name === "INDEX" || b.name === "README") return 1;
      if (/^\d{4}-\d{2}-\d{2}/.test(a.name) && /^\d{4}-\d{2}-\d{2}/.test(b.name)) {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });

    for (const child of node.folders) {
      sortAndCount(child);
      count += child.totalCount;
    }

    if (isTop) {
      node.folders.sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a.name);
        const ib = CATEGORY_ORDER.indexOf(b.name);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      });
    } else {
      node.folders.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );
    }

    node.totalCount = count;
  }

  sortAndCount(rootNode, true);
  return rootNode;
}

function filterTree(node: FolderNode, query: string): FolderNode | null {
  const q = query.trim().toLowerCase();
  if (!q) return node;

  const folderMatches = node.name.toLowerCase().includes(q);
  const matchingFiles = node.files.filter(
    (f) => folderMatches || f.name.toLowerCase().includes(q)
  );

  const matchingFolders: FolderNode[] = [];
  for (const child of node.folders) {
    const filteredChild = filterTree(child, query);
    if (filteredChild) {
      matchingFolders.push(filteredChild);
    }
  }

  if (folderMatches || matchingFiles.length > 0 || matchingFolders.length > 0) {
    return {
      ...node,
      folders: matchingFolders,
      files: matchingFiles,
      totalCount:
        matchingFiles.length +
        matchingFolders.reduce((sum, f) => sum + f.totalCount, 0),
    };
  }
  return null;
}

interface TreeFolderItemProps {
  folder: FolderNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (relPath: string) => void;
  selectedFilePath?: string | null;
  onSelectFile: (path: string | null) => void;
  openInEditor: (path: string) => void;
  isSearchActive: boolean;
  onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void;
  rootPath: string;
}

function TreeFolderItem({
  folder,
  depth,
  expanded,
  onToggle,
  selectedFilePath,
  onSelectFile,
  openInEditor,
  isSearchActive,
  onContextMenu,
  rootPath,
}: TreeFolderItemProps) {
  const isTopCategory = depth === 0;
  const config = isTopCategory ? CATEGORY_CONFIG[folder.name] : null;
  const displayName = config ? config.label : folder.name;
  const isExpanded = isSearchActive || (expanded[folder.relPath] ?? false);

  const CategoryIcon = config ? config.icon : null;

  return (
    <div className="space-y-0.5">
      {/* Folder Row Header */}
      {isTopCategory ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggle(folder.relPath)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, {
              type: "category",
              name: displayName,
              relPath: folder.relPath,
              absPath: `${rootPath}/${folder.relPath}`,
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(folder.relPath);
            }
          }}
          className="flex items-center justify-between px-2 py-1.5 rounded-[4px] hover:bg-black/[0.03] cursor-pointer select-none transition-colors group"
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-transform" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-transform" />
            )}
            {CategoryIcon && <CategoryIcon className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-secondary)]" />}
            <span className="font-semibold">{displayName}</span>
          </div>
          <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline">
            {folder.totalCount}
          </span>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggle(folder.relPath)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, {
              type: "folder",
              name: folder.name,
              relPath: folder.relPath,
              absPath: `${rootPath}/${folder.relPath}`,
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(folder.relPath);
            }
          }}
          style={{ paddingLeft: `${Math.max(6, depth * 12)}px` }}
          className="flex items-center justify-between pr-2 py-1 rounded-[4px] hover:bg-[#f4f4ee] cursor-pointer select-none transition-colors group text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-500 shrink-0" />
            )}
            <span className="font-medium truncate">{displayName}</span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline shrink-0">
            {folder.totalCount}
          </span>
        </div>
      )}

      {/* Expanded Children Container */}
      {isExpanded && (
        <div
          className={cn(
            "space-y-0.5",
            isTopCategory
              ? "pl-1.5 border-l border-black/[0.04] ml-2.5 my-0.5"
              : "pl-1 border-l border-black/[0.04] ml-2"
          )}
        >
          {/* Subfolders */}
          {folder.folders.map((sub) => (
            <TreeFolderItem
              key={sub.relPath}
              folder={sub}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
              openInEditor={openInEditor}
              isSearchActive={isSearchActive}
              onContextMenu={onContextMenu}
              rootPath={rootPath}
            />
          ))}

          {/* Files */}
          {folder.files.map((f) => {
            const isSelected = selectedFilePath === f.path;
            const isSpecialIndex = f.name === "INDEX" || f.name === "README";
            return (
              <div
                key={f.path}
                role="button"
                tabIndex={0}
                onClick={() => onSelectFile(f.path)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, {
                    type: "file",
                    name: f.name,
                    relPath: f.relPath,
                    absPath: f.path,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectFile(f.path);
                  }
                }}
                style={{
                  paddingLeft: isTopCategory ? "16px" : `${Math.max(16, (depth + 1) * 12)}px`,
                }}
                className={cn(
                  "w-full flex items-center justify-between pr-2 py-1 rounded-[4px] text-xs transition-colors cursor-pointer select-none group border-l-2",
                  isSelected
                    ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] font-medium border-l-[var(--accent-cobalt)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#f4f4ee] border-l-transparent"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                  <FileText
                    className={cn(
                      "w-3 h-3 shrink-0",
                      isSelected
                        ? "text-[var(--accent-cobalt)]"
                        : isSpecialIndex
                        ? "text-[var(--accent-cobalt)] opacity-80"
                        : "text-[var(--text-faint)] group-hover:text-[var(--text-muted)]"
                    )}
                  />
                  <span
                    className={cn(
                      "truncate",
                      isSpecialIndex && "font-mono font-medium text-[11px]"
                    )}
                  >
                    {f.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInEditor(f.path);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                    title="In Obsidian öffnen"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  <ChevronRight
                    className={cn(
                      "w-2.5 h-2.5",
                      isSelected
                        ? "text-[var(--accent-cobalt)]"
                        : "text-[var(--text-faint)] opacity-0 group-hover:opacity-100"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function QuickAccess({ selectedFilePath, onSelectFile }: QuickAccessProps) {
  const { files, loading, error } = useVaultFiles("work");
  const openInEditor = useOpenInEditor();
  const [search, setSearch] = useState("");

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, target: ContextMenuTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        target,
      });
    },
    []
  );

  // Default expanded state: active PARA working categories open, archive and context collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    "01 Inbox": true,
    "02 Projekte": true,
    "03 Bereiche": true,
    "04 Ressourcen": true,
    "05 Daily Notes": true,
    "00 Kontext": false,
    "06 Archiv": false,
  }));

  const rootPath = useMemo(() => vaultRoot("work"), []);

  const fullTree = useMemo(() => {
    return buildVaultTree(files, rootPath);
  }, [files, rootPath]);

  const filteredTree = useMemo(() => {
    return filterTree(fullTree, search);
  }, [fullTree, search]);

  const isSearchActive = !!search.trim();

  // Auto-expand all ancestor folders leading to selected file
  useEffect(() => {
    if (!selectedFilePath) return;
    const normalizedRoot = rootPath.replace(/\\/g, "/").replace(/\/+$/, "");
    const norm = selectedFilePath.replace(/\\/g, "/");
    if (!norm.startsWith(normalizedRoot)) return;

    const rel = norm.slice(normalizedRoot.length).replace(/^\/+/, "");
    const parts = rel.split("/");
    if (parts.length <= 1) return;

    // Collect ancestor folder paths
    const ancestors: string[] = [];
    let cur = "";
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur ? `${cur}/${parts[i]}` : parts[i];
      ancestors.push(cur);
    }

    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const a of ancestors) {
        if (!next[a]) {
          next[a] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedFilePath, rootPath]);

  const handleToggle = useCallback((relPath: string) => {
    setExpanded((prev) => ({
      ...prev,
      [relPath]: !prev[relPath],
    }));
  }, []);

  // Check if all folders are currently expanded
  const areAllExpanded = useMemo(() => {
    function checkExpanded(node: FolderNode): boolean {
      if (node.relPath && !expanded[node.relPath]) return false;
      for (const child of node.folders) {
        if (!checkExpanded(child)) return false;
      }
      return true;
    }
    return checkExpanded(fullTree);
  }, [fullTree, expanded]);

  const handleToggleAll = useCallback(() => {
    if (areAllExpanded) {
      // Collapse subfolders, keep top 5 categories
      setExpanded({
        "01 Inbox": true,
        "02 Projekte": true,
        "03 Bereiche": true,
        "04 Ressourcen": true,
        "05 Daily Notes": true,
        "00 Kontext": false,
        "06 Archiv": false,
      });
    } else {
      // Expand everything
      const next: Record<string, boolean> = {};
      function expandAll(node: FolderNode) {
        if (node.relPath) next[node.relPath] = true;
        for (const child of node.folders) {
          expandAll(child);
        }
      }
      expandAll(fullTree);
      setExpanded(next);
    }
  }, [areAllExpanded, fullTree]);

  const displayCount = filteredTree ? filteredTree.totalCount : 0;

  return (
    <GlassPanel
      title="Navigator"
      badge={isSearchActive ? `${displayCount}/${files.length}` : `${files.length}`}
      className="h-full"
      noPadding
    >
      {/* Top Action Bar */}
      <div className="p-3 border-b border-hairline bg-[#fafaf8] dark:bg-[var(--bg-subtle)] space-y-2">
        <button
          type="button"
          onClick={() => onSelectFile(null)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 rounded-[4px] text-xs transition-all border",
            !selectedFilePath
              ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] font-semibold border-[var(--accent-cobalt-border)]"
              : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[#f0f0ea] dark:hover:bg-[var(--bg-hover)]"
          )}
        >
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Workspace Übersicht</span>
          </div>
          <span className="font-mono text-[9.5px] opacity-60">⌘0</span>
        </button>

        {/* Search & Tree Actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Notiz oder Ordner…"
              className="editorial-input w-full pl-8 pr-7 py-1.5 text-xs placeholder:text-[var(--text-faint)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Suche zurücksetzen"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleAll}
            className={cn(
              "p-1.5 rounded border border-hairline transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#f0f0ea]",
              areAllExpanded && "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] border-[var(--accent-cobalt-border)]"
            )}
            title={areAllExpanded ? "Ordner zuklappen" : "Alle Ordner aufklappen"}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleContextMenu(
                {
                  clientX: rect.left,
                  clientY: rect.bottom + 6,
                  preventDefault: () => {},
                  stopPropagation: () => {},
                } as any,
                {
                  type: "category",
                  name: "01 Inbox",
                  relPath: "01 Inbox",
                  absPath: `${rootPath}/01 Inbox`,
                }
              );
            }}
            className="p-1.5 rounded border border-hairline transition-colors text-[var(--text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shrink-0"
            title="Neue Notiz oder Ordner anlegen (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tree View */}
      <ScrollArea
        className="flex-1 h-0"
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('[role="button"]')) return;
          handleContextMenu(e, {
            type: "root",
            name: "Vault",
            relPath: "",
            absPath: rootPath,
          });
        }}
      >
        <div className="p-2.5 space-y-3">
          {filteredTree && filteredTree.folders.length > 0 ? (
            filteredTree.folders.map((topFolder) => (
              <TreeFolderItem
                key={topFolder.relPath}
                folder={topFolder}
                depth={0}
                expanded={expanded}
                onToggle={handleToggle}
                selectedFilePath={selectedFilePath}
                onSelectFile={onSelectFile}
                openInEditor={openInEditor}
                isSearchActive={isSearchActive}
                onContextMenu={handleContextMenu}
                rootPath={rootPath}
              />
            ))
          ) : null}

          {/* Root-Level Files (e.g. CLAUDE.md) */}
          {filteredTree && filteredTree.files.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-hairline">
              <div className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <FileCode className="w-3 h-3 text-[var(--text-faint)]" />
                <span>Allgemein</span>
              </div>
              {filteredTree.files.map((f) => {
                const isSelected = selectedFilePath === f.path;
                return (
                  <div
                    key={f.path}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectFile(f.path)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleContextMenu(e, {
                        type: "file",
                        name: f.name,
                        relPath: f.relPath,
                        absPath: f.path,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectFile(f.path);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1 rounded-[4px] text-xs transition-colors cursor-pointer select-none group border-l-2",
                      isSelected
                        ? "bg-[var(--accent-cobalt-subtle)] text-[var(--accent-cobalt)] font-medium border-l-[var(--accent-cobalt)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#f4f4ee] border-l-transparent"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                      <FileText
                        className={cn(
                          "w-3 h-3 shrink-0",
                          isSelected
                            ? "text-[var(--accent-cobalt)]"
                            : "text-[var(--text-faint)] group-hover:text-[var(--text-muted)]"
                        )}
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInEditor(f.path);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                        title="In Obsidian öffnen"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                      <ChevronRight
                        className={cn(
                          "w-2.5 h-2.5",
                          isSelected
                            ? "text-[var(--accent-cobalt)]"
                            : "text-[var(--text-faint)] opacity-0 group-hover:opacity-100"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (!filteredTree || (filteredTree.folders.length === 0 && filteredTree.files.length === 0)) && (
            <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)] px-2">
              {error ?? (isSearchActive ? "Keine Treffer für die Suche" : "Keine Notizen gefunden")}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Apple-style Right-Click Context Menu */}
      {contextMenu && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onSelectFile={onSelectFile}
          onExpandFolder={(relPath) => {
            setExpanded((prev) => ({ ...prev, [relPath]: true }));
          }}
          vaultRootPath={rootPath}
        />
      )}
    </GlassPanel>
  );
}
