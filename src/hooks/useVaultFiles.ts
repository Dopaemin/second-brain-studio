import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export interface VaultFile {
  path: string;
  name: string;
  category: string;
  modified: number;
}

export interface TodoItem {
  text: string;
  checked: boolean;
  file_path: string;
  line_index: number;
}

const WORK_VAULT = "/Users/I539120/Documents/second-brain";
const PRIVATE_VAULT = "/Users/I539120/Documents/personal-brain";

export function useVaultFiles(vault: "work" | "private") {
  const vaultPath = vault === "work" ? WORK_VAULT : PRIVATE_VAULT;
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<VaultFile[]>("list_vault_files", { vaultPath })
      .then(setFiles)
      .catch((e) => console.error("Failed to list vault files:", e))
      .finally(() => setLoading(false));
  }, [vaultPath]);

  return { files, loading };
}

export function useRecentFiles(vault: "work" | "private", limit = 10) {
  const vaultPath = vault === "work" ? WORK_VAULT : PRIVATE_VAULT;
  const [files, setFiles] = useState<VaultFile[]>([]);

  useEffect(() => {
    invoke<VaultFile[]>("recent_files", { vaultPath, limit })
      .then(setFiles)
      .catch((e) => console.error("Failed to get recent files:", e));
  }, [vaultPath, limit]);

  return files;
}

export function useTodos(vault: "work" | "private") {
  const vaultPath = vault === "work" ? WORK_VAULT : PRIVATE_VAULT;
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const refresh = useCallback(() => {
    invoke<TodoItem[]>("parse_todos", { vaultPath })
      .then(setTodos)
      .catch((e) => console.error("Failed to parse todos:", e));
  }, [vaultPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (todo: TodoItem) => {
      await invoke("toggle_todo", {
        filePath: todo.file_path,
        lineIndex: todo.line_index,
        checked: !todo.checked,
      });
      refresh();
    },
    [refresh]
  );

  return { todos, toggle };
}

export function useOpenInEditor() {
  return useCallback(async (path: string) => {
    await invoke("open_in_editor", { path });
  }, []);
}
