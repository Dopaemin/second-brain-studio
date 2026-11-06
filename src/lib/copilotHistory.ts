import { useState, useEffect } from "react";

export interface CopilotAction {
  path: string;
  name: string;
  category: string;
  action: "created" | "updated" | "opened";
  timestamp: number;
  summary?: string;
}

const STORAGE_KEY = "copilot_actions_history";
const EVENT_NAME = "copilot-action-recorded";

const INITIAL_SEED: CopilotAction[] = [
  {
    path: "/Users/I539120/Documents/second-brain/05 Daily Notes/Sessions/2026-10-21 14:04 – Business Logging Paging Build-Fix und Deployment-Test.md",
    name: "2026-10-21 14:04 – Business Logging Paging Build-Fix und Deployment-Test",
    category: "Sessions",
    action: "created",
    timestamp: 1729512240000,
    summary: "Arbeits-Session & Build-Fix Protokoll",
  },
];

export function getCopilotActions(): CopilotAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INITIAL_SEED;
}

export function recordCopilotAction(entry: {
  path: string;
  name?: string;
  category?: string;
  action: "created" | "updated" | "opened";
  timestamp?: number;
  summary?: string;
}): CopilotAction {
  const existing = getCopilotActions();
  const cleanPath = entry.path.trim();
  const fileName =
    entry.name ||
    cleanPath.split(/[/\\]/).pop()?.replace(/\.md$/, "") ||
    "Dokument";

  const parts = cleanPath.split(/[/\\]/);
  const category =
    entry.category ||
    (parts.length > 2 ? parts[parts.length - 2] : "Vault");

  const actionItem: CopilotAction = {
    path: cleanPath,
    name: fileName,
    category,
    action: entry.action,
    timestamp: entry.timestamp || Date.now(),
    summary: entry.summary,
  };

  // Remove duplicate of the same path to bump it to the very top
  const filtered = existing.filter((a) => a.path !== cleanPath);
  const updated = [actionItem, ...filtered].slice(0, 30);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Dispatch custom window event for instant reactive update in UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { action: actionItem, all: updated } })
    );
  }

  return actionItem;
}

export function isEditedByCopilot(filePath: string): boolean {
  const actions = getCopilotActions();
  return actions.some((a) => a.path === filePath);
}

export function useCopilotActions() {
  const [actions, setActions] = useState<CopilotAction[]>(getCopilotActions);

  useEffect(() => {
    const handleUpdate = () => {
      setActions(getCopilotActions());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return actions;
}
