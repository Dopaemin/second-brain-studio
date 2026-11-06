import { useState, useEffect, useMemo, useCallback } from "react";
import { useVaultFiles, VaultFile, WORK_VAULT } from "./useVaultFiles";
import { invoke, emitVaultChanged } from "@/lib/backend";
import {
  SprintDoc,
  SprintItem,
  parseSprintDoc,
  parseFrontmatter,
  updateSprintItemStatus,
  addSprintItem,
  editSprintItemText,
  deleteSprintItem,
  createSprintTemplate,
  createSprintReviewTemplate,
  updateSprintStatusInContent,
  appendCarryOverItems,
} from "@/lib/sprints";

export function useSprintData() {
  const { files, loading: filesLoading } = useVaultFiles("work");

  // Filter all sprint-relevant files in the vault
  const sprintFiles = useMemo(() => {
    return files.filter((f) => {
      const p = f.path.toLowerCase();
      const n = f.name.toLowerCase();
      return (
        p.includes("/sprints/") ||
        n.startsWith("sprint") ||
        n.includes("sprint review") ||
        n.includes("sprint retro") ||
        n.includes("sprint journal") ||
        p.includes("sprint")
      );
    });
  }, [files]);

  // Separate regular Sprints (Sprint 67, 66, 65, etc.) from Reviews and Retros
  const sprintsList = useMemo(() => {
    const list: VaultFile[] = [];
    for (const f of sprintFiles) {
      if (/sprint\s+\d+/i.test(f.name) && !/review|retro|journal/i.test(f.name)) {
        list.push(f);
      }
    }
    // Sort descending by sprint number
    return list.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
      return numB - numA;
    });
  }, [sprintFiles]);

  const reviewsList = useMemo(() => {
    return sprintFiles.filter((f) => /review|retro/i.test(f.name));
  }, [sprintFiles]);

  const planningList = useMemo(() => {
    return sprintFiles.filter((f) => /journal|planning|sessions/i.test(f.name));
  }, [sprintFiles]);

  // Active Sprint (detected by frontmatter `status: aktiv`, or falls back to highest sprint)
  const [activeSprintPath, setActiveSprintPath] = useState<string | null>(null);
  const [activeSprintDoc, setActiveSprintDoc] = useState<SprintDoc | null>(null);

  // Selected Sprint path (for viewing any sprint in the Sprint Dashboard)
  const [selectedSprintPath, setSelectedSprintPath] = useState<string | null>(null);
  const [selectedSprintDoc, setSelectedSprintDoc] = useState<SprintDoc | null>(null);

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect which sprint is currently active
  const detectActiveSprint = useCallback(async () => {
    if (sprintsList.length === 0) {
      setActiveSprintPath(null);
      setActiveSprintDoc(null);
      return;
    }

    try {
      // Check the top 10 sprints in parallel
      const candidates = await Promise.all(
        sprintsList.slice(0, 10).map(async (f) => {
          try {
            const content = await invoke<string>("read_file", { path: f.path });
            const parsed = parseSprintDoc(f.path, content);
            return { path: f.path, parsed, isActive: parsed.status === "aktiv" };
          } catch {
            return null;
          }
        })
      );

      // Find the first one marked 'aktiv'
      const foundActive = candidates.find((c) => c && c.isActive);
      let targetPath: string;
      let targetDoc: SprintDoc;

      if (foundActive && foundActive.parsed) {
        targetPath = foundActive.path;
        targetDoc = foundActive.parsed;
      } else {
        // Fallback: highest numbered sprint in sprintsList
        targetPath = sprintsList[0].path;
        const fallbackContent = await invoke<string>("read_file", { path: targetPath });
        targetDoc = parseSprintDoc(targetPath, fallbackContent);
      }

      setActiveSprintPath(targetPath);
      setActiveSprintDoc(targetDoc);

      // Initialize selectedSprintPath if not set or invalid
      setSelectedSprintPath((curr) => {
        if (!curr || !sprintsList.some((s) => s.path === curr)) {
          return targetPath;
        }
        return curr;
      });
    } catch (err: any) {
      console.error("Fehler bei der Erkennung des aktiven Sprints:", err);
      setError(`Konnte aktiven Sprint nicht ermitteln: ${err?.message || err}`);
    }
  }, [sprintsList]);

  // Run detection whenever sprintsList changes
  useEffect(() => {
    detectActiveSprint();
  }, [detectActiveSprint]);

  // Load selectedSprintDoc when selectedSprintPath changes
  useEffect(() => {
    if (!selectedSprintPath) {
      setSelectedSprintDoc(null);
      return;
    }

    if (selectedSprintPath === activeSprintPath && activeSprintDoc) {
      setSelectedSprintDoc(activeSprintDoc);
      return;
    }

    let cancelled = false;
    setLoadingDoc(true);
    invoke<string>("read_file", { path: selectedSprintPath })
      .then((content) => {
        if (!cancelled) {
          const parsed = parseSprintDoc(selectedSprintPath, content);
          setSelectedSprintDoc(parsed);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Fehler beim Laden des ausgewählten Sprints:", err);
          setError(`Konnte Sprint nicht laden: ${err?.message || err}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSprintPath, activeSprintPath, activeSprintDoc]);

  // Listen to vault-changed to reload docs
  useEffect(() => {
    const handleVaultChange = () => {
      detectActiveSprint();
      if (selectedSprintPath && selectedSprintPath !== activeSprintPath) {
        invoke<string>("read_file", { path: selectedSprintPath })
          .then((content) => {
            setSelectedSprintDoc(parseSprintDoc(selectedSprintPath, content));
          })
          .catch(() => {});
      }
    };
    window.addEventListener("vault-changed", handleVaultChange);
    return () => window.removeEventListener("vault-changed", handleVaultChange);
  }, [detectActiveSprint, selectedSprintPath, activeSprintPath]);

  // MUTATIONS:
  // Primary doc is selectedSprintDoc if available, otherwise activeSprintDoc
  const currentDoc = selectedSprintDoc || activeSprintDoc;

  // 1. Toggle or update item status
  const updateItemStatus = useCallback(
    async (
      item: SprintItem,
      newStatus: SprintItem["status"],
      targetPath?: string
    ) => {
      const doc = targetPath
        ? (targetPath === activeSprintDoc?.path ? activeSprintDoc : selectedSprintDoc)
        : currentDoc;
      if (!doc) return;

      const updatedContent = updateSprintItemStatus(
        doc.rawContent,
        item,
        newStatus
      );

      try {
        await invoke("write_file", {
          path: doc.path,
          content: updatedContent,
        });
        const repared = parseSprintDoc(doc.path, updatedContent);
        if (doc.path === activeSprintPath) setActiveSprintDoc(repared);
        if (doc.path === selectedSprintPath) setSelectedSprintDoc(repared);
        emitVaultChanged();
      } catch (err: any) {
        console.error("Fehler beim Aktualisieren des Item-Status:", err);
      }
    },
    [currentDoc, activeSprintDoc, selectedSprintDoc, activeSprintPath, selectedSprintPath]
  );

  // 2. Add new backlog item
  const addItem = useCallback(
    async (
      text: string,
      status: SprintItem["status"] = "todo",
      targetPath?: string
    ) => {
      const doc = targetPath
        ? (targetPath === activeSprintDoc?.path ? activeSprintDoc : selectedSprintDoc)
        : currentDoc;
      if (!doc || !text.trim()) return;

      const updatedContent = addSprintItem(
        doc.rawContent,
        text,
        status === "blocked" ? "todo" : status
      );

      try {
        await invoke("write_file", {
          path: doc.path,
          content: updatedContent,
        });
        const repared = parseSprintDoc(doc.path, updatedContent);
        if (doc.path === activeSprintPath) setActiveSprintDoc(repared);
        if (doc.path === selectedSprintPath) setSelectedSprintDoc(repared);
        emitVaultChanged();
      } catch (err: any) {
        console.error("Fehler beim Hinzufügen des Items:", err);
      }
    },
    [currentDoc, activeSprintDoc, selectedSprintDoc, activeSprintPath, selectedSprintPath]
  );

  // 3. Edit item text
  const editItem = useCallback(
    async (item: SprintItem, newText: string, targetPath?: string) => {
      const doc = targetPath
        ? (targetPath === activeSprintDoc?.path ? activeSprintDoc : selectedSprintDoc)
        : currentDoc;
      if (!doc || !newText.trim()) return;

      const updatedContent = editSprintItemText(
        doc.rawContent,
        item,
        newText
      );

      try {
        await invoke("write_file", {
          path: doc.path,
          content: updatedContent,
        });
        const repared = parseSprintDoc(doc.path, updatedContent);
        if (doc.path === activeSprintPath) setActiveSprintDoc(repared);
        if (doc.path === selectedSprintPath) setSelectedSprintDoc(repared);
        emitVaultChanged();
      } catch (err: any) {
        console.error("Fehler beim Bearbeiten des Items:", err);
      }
    },
    [currentDoc, activeSprintDoc, selectedSprintDoc, activeSprintPath, selectedSprintPath]
  );

  // 4. Delete item
  const deleteItem = useCallback(
    async (item: SprintItem, targetPath?: string) => {
      const doc = targetPath
        ? (targetPath === activeSprintDoc?.path ? activeSprintDoc : selectedSprintDoc)
        : currentDoc;
      if (!doc) return;

      const updatedContent = deleteSprintItem(doc.rawContent, item);

      try {
        await invoke("write_file", {
          path: doc.path,
          content: updatedContent,
        });
        const repared = parseSprintDoc(doc.path, updatedContent);
        if (doc.path === activeSprintPath) setActiveSprintDoc(repared);
        if (doc.path === selectedSprintPath) setSelectedSprintDoc(repared);
        emitVaultChanged();
      } catch (err: any) {
        console.error("Fehler beim Löschen des Items:", err);
      }
    },
    [currentDoc, activeSprintDoc, selectedSprintDoc, activeSprintPath, selectedSprintPath]
  );

  // 5. Save raw content (inline editing)
  const saveRawContent = useCallback(
    async (newContent: string, targetPath?: string) => {
      const doc = targetPath
        ? (targetPath === activeSprintDoc?.path ? activeSprintDoc : selectedSprintDoc)
        : currentDoc;
      if (!doc) return;

      try {
        await invoke("write_file", {
          path: doc.path,
          content: newContent,
        });
        const repared = parseSprintDoc(doc.path, newContent);
        if (doc.path === activeSprintPath) setActiveSprintDoc(repared);
        if (doc.path === selectedSprintPath) setSelectedSprintDoc(repared);
        emitVaultChanged();
      } catch (err: any) {
        console.error("Fehler beim Speichern der Notiz:", err);
      }
    },
    [currentDoc, activeSprintDoc, selectedSprintDoc, activeSprintPath, selectedSprintPath]
  );

  // 6. Explicitly activate a sprint (sets status: aktiv, un-sets all others)
  const setActiveSprint = useCallback(
    async (sprintPath: string) => {
      try {
        const content = await invoke<string>("read_file", { path: sprintPath });
        const updated = updateSprintStatusInContent(content, "aktiv");
        await invoke("write_file", { path: sprintPath, content: updated });

        // Set all other sprints to abgeschlossen
        for (const s of sprintsList) {
          if (s.path !== sprintPath) {
            try {
              const otherContent = await invoke<string>("read_file", { path: s.path });
              const { frontmatter } = parseFrontmatter(otherContent);
              if (
                frontmatter.status &&
                (frontmatter.status.toLowerCase().includes("aktiv") ||
                  frontmatter.status.toLowerCase().includes("active"))
              ) {
                const otherUpdated = updateSprintStatusInContent(otherContent, "abgeschlossen");
                await invoke("write_file", { path: s.path, content: otherUpdated });
              }
            } catch {
              // ignore individual errors
            }
          }
        }

        setActiveSprintPath(sprintPath);
        setSelectedSprintPath(sprintPath);
        emitVaultChanged();
        await detectActiveSprint();
      } catch (err) {
        console.error("Fehler beim Aktivieren des Sprints:", err);
      }
    },
    [sprintsList, detectActiveSprint]
  );

  // 7. Close a sprint and open/activate the next one
  const closeSprint = useCallback(
    async (
      sprintPath: string,
      options?: {
        nextSprintNumber?: string;
        carryOverOpenItems?: boolean;
        nextSprintStart?: string;
        nextSprintEnd?: string;
      }
    ): Promise<string | null> => {
      try {
        const content = await invoke<string>("read_file", { path: sprintPath });
        const doc = parseSprintDoc(sprintPath, content);
        const currentNum = parseInt(doc.sprintNumber || "0", 10);
        const nextNum = options?.nextSprintNumber
          ? options.nextSprintNumber.trim()
          : String(currentNum + 1);

        // Mark current sprint as abgeschlossen
        const closedContent = updateSprintStatusInContent(content, "abgeschlossen");
        await invoke("write_file", { path: sprintPath, content: closedContent });

        // Carry-over items (items not finished)
        const openItems = doc.items.filter((it) => it.status !== "done");

        // Next sprint file
        const nextFileName = `Sprint ${nextNum}.md`;
        const existingNext = sprintFiles.find(
          (f) => f.name.toLowerCase() === nextFileName.toLowerCase()
        );
        let nextSprintPath: string;

        if (existingNext) {
          nextSprintPath = existingNext.path;
          let nextContent = await invoke<string>("read_file", { path: nextSprintPath });
          nextContent = updateSprintStatusInContent(nextContent, "aktiv");

          if (options?.carryOverOpenItems && openItems.length > 0) {
            const nextParsed = parseSprintDoc(nextSprintPath, nextContent);
            const itemsToAppend = openItems.filter(
              (op) =>
                !nextParsed.items.some(
                  (ni) =>
                    (ni.ticketId && op.ticketId && ni.ticketId === op.ticketId) ||
                    ni.title === op.title
                )
            );
            if (itemsToAppend.length > 0) {
              nextContent = appendCarryOverItems(
                nextContent,
                itemsToAppend,
                doc.sprintNumber || String(currentNum)
              );
            }
          }
          await invoke("write_file", { path: nextSprintPath, content: nextContent });
        } else {
          // Create new sprint
          const sprintsFolder = sprintPath.substring(0, sprintPath.lastIndexOf("/"));
          nextSprintPath = `${sprintsFolder}/${nextFileName}`;
          const startDate = options?.nextSprintStart || new Date().toISOString().split("T")[0];
          const endDate =
            options?.nextSprintEnd ||
            new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
          const carryItems = options?.carryOverOpenItems
            ? openItems.map((it) => {
                const ticketPart =
                  it.ticketId && it.ticketUrl ? `[${it.ticketId}](${it.ticketUrl}) ` : "";
                const cleanTitle = it.title.replace(it.ticketId || "", "").trim();
                return `${ticketPart}${cleanTitle} 🔄 (Carry-over aus Sprint ${doc.sprintNumber || currentNum})`;
              })
            : [];
          const newTemplate = createSprintTemplate(nextNum, startDate, endDate, carryItems);
          await invoke("write_file", { path: nextSprintPath, content: newTemplate });

          // Update INDEX.md if it exists
          const indexPath = `${sprintsFolder}/INDEX.md`;
          try {
            const indexContent = await invoke<string>("read_file", { path: indexPath });
            const newLine = `- [[Sprint ${nextNum}]] - Sprint ${nextNum} | ${startDate} – ${endDate}`;
            if (!indexContent.includes(`[[Sprint ${nextNum}]]`)) {
              await invoke("write_file", {
                path: indexPath,
                content: `${indexContent.trimEnd()}\n${newLine}\n`,
              });
            }
          } catch {
            // Optional
          }
        }

        setActiveSprintPath(nextSprintPath);
        setSelectedSprintPath(nextSprintPath);
        emitVaultChanged();
        await detectActiveSprint();
        return nextSprintPath;
      } catch (err: any) {
        console.error("Fehler beim Abschließen des Sprints:", err);
        return null;
      }
    },
    [sprintFiles, detectActiveSprint]
  );

  // 8. Create brand new sprint
  const createNewSprint = useCallback(
    async (
      sprintNum: string,
      startDate: string,
      endDate: string,
      initialItems: string[] = []
    ) => {
      const fileName = `Sprint ${sprintNum}.md`;
      const targetPath = `${WORK_VAULT}/04 Ressourcen/SAP Green Ledger/Sprints/${fileName}`;
      const content = createSprintTemplate(sprintNum, startDate, endDate, initialItems);

      try {
        await invoke("write_file", { path: targetPath, content });

        // Update INDEX.md
        const indexPath = `${WORK_VAULT}/04 Ressourcen/SAP Green Ledger/Sprints/INDEX.md`;
        try {
          const indexContent = await invoke<string>("read_file", { path: indexPath });
          const newLine = `- [[Sprint ${sprintNum}]] - Sprint ${sprintNum} | ${startDate} – ${endDate}`;
          if (!indexContent.includes(`[[Sprint ${sprintNum}]]`)) {
            await invoke("write_file", {
              path: indexPath,
              content: `${indexContent.trimEnd()}\n${newLine}\n`,
            });
          }
        } catch {
          // Optional
        }

        // Close any previously active sprint
        for (const s of sprintsList) {
          if (s.path !== targetPath) {
            try {
              const otherContent = await invoke<string>("read_file", { path: s.path });
              const { frontmatter } = parseFrontmatter(otherContent);
              if (
                frontmatter.status &&
                (frontmatter.status.toLowerCase().includes("aktiv") ||
                  frontmatter.status.toLowerCase().includes("active"))
              ) {
                const otherUpdated = updateSprintStatusInContent(otherContent, "abgeschlossen");
                await invoke("write_file", { path: s.path, content: otherUpdated });
              }
            } catch {
              // ignore
            }
          }
        }

        setActiveSprintPath(targetPath);
        setSelectedSprintPath(targetPath);
        emitVaultChanged();
        await detectActiveSprint();
      } catch (err: any) {
        console.error("Fehler beim Erstellen des neuen Sprints:", err);
      }
    },
    [sprintsList, detectActiveSprint]
  );

  // 9. Create new Sprint Review note
  const createNewReview = useCallback(
    async (title: string, dateStr: string) => {
      const fileName = `${title.trim() || "Sprint Review"} ${dateStr}.md`;
      const targetPath = `${WORK_VAULT}/03 Bereiche/SAP Green Ledger CBAM/${fileName}`;
      const content = createSprintReviewTemplate(dateStr, title);

      try {
        await invoke("write_file", { path: targetPath, content });
        emitVaultChanged();
        return targetPath;
      } catch (err: any) {
        console.error("Fehler beim Erstellen des Reviews:", err);
        return null;
      }
    },
    []
  );

  return {
    sprintFiles,
    sprintsList,
    reviewsList,
    planningList,
    // Active sprint
    activeSprintPath,
    activeSprintDoc,
    // Selected sprint
    selectedSprintPath,
    selectedSprintDoc,
    setSelectedSprintPath,
    setActiveSprint,
    closeSprint,
    loadingDoc,
    filesLoading,
    error,
    updateItemStatus,
    addItem,
    editItem,
    deleteItem,
    saveRawContent,
    createNewSprint,
    createNewReview,
    refreshDoc: detectActiveSprint,
  };
}
