import { useCallback, useEffect, useState } from "react";
import { emitVaultChanged, invoke, onVaultChanged } from "@/lib/backend";

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

export const DEFAULT_WORK_VAULT =
  (import.meta.env.VITE_WORK_VAULT as string) || "/Users/I539120/Documents/second-brain";
export const DEFAULT_PRIVATE_VAULT =
  (import.meta.env.VITE_PRIVATE_VAULT as string) || "/Users/I539120/Documents/personal-brain";

export function getWorkVault(): string {
  if (typeof window === "undefined") return DEFAULT_WORK_VAULT;
  return localStorage.getItem("second_brain_work_vault") || DEFAULT_WORK_VAULT;
}

export function getPrivateVault(): string {
  if (typeof window === "undefined") return DEFAULT_PRIVATE_VAULT;
  return localStorage.getItem("second_brain_private_vault") || DEFAULT_PRIVATE_VAULT;
}

export function setVaultPaths(work?: string, personal?: string) {
  if (work) localStorage.setItem("second_brain_work_vault", work.trim());
  if (personal) localStorage.setItem("second_brain_private_vault", personal.trim());
  listCache.clear();
  emitVaultChanged();
}

export function resetVaultPaths() {
  localStorage.removeItem("second_brain_work_vault");
  localStorage.removeItem("second_brain_private_vault");
  listCache.clear();
  emitVaultChanged();
}

export const WORK_VAULT = getWorkVault();
export const PRIVATE_VAULT = getPrivateVault();

export const vaultRoot = (vault: "work" | "private") =>
  vault === "work" ? getWorkVault() : getPrivateVault();

export const vaultOfPath = (p: string): "work" | "private" =>
  p.startsWith(getPrivateVault()) ? "private" : "work";

// Share one in-flight listing between all components (vaults can be large).
const listCache = new Map<string, Promise<VaultFile[]>>();
window.addEventListener("vault-changed", () => listCache.clear());

function fetchFiles(vaultPath: string): Promise<VaultFile[]> {
  if (!listCache.has(vaultPath)) {
    const p = invoke<VaultFile[]>("list_vault_files", { vaultPath });
    p.catch(() => listCache.delete(vaultPath));
    listCache.set(vaultPath, p);
  }
  return listCache.get(vaultPath)!;
}

export function useVaultFiles(vault: "work" | "private") {
  const vaultPath = vaultRoot(vault);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((force = false) => {
    if (force) {
      listCache.delete(vaultPath);
    }
    fetchFiles(vaultPath)
      .then((res) => {
        setFiles(res);
        setError(null);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [vaultPath]);

  useEffect(() => {
    setLoading(true);
    load();
    const handleFocus = () => load(true);
    window.addEventListener("focus", handleFocus);
    const unsub = onVaultChanged(() => load(true));
    return () => {
      window.removeEventListener("focus", handleFocus);
      unsub();
    };
  }, [load]);

  return { files, loading, error, refresh: () => load(true) };
}

export function useRecentFiles(vault: "work" | "private", limit = 10) {
  const { files } = useVaultFiles(vault);
  return files.slice(0, limit);
}

export function useTodos(vault: "work" | "private") {
  const vaultPath = vaultRoot(vault);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    invoke<TodoItem[]>("parse_todos", { vaultPath })
      .then((res) => {
        setTodos(res);
        setError(null);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, [vaultPath]);

  useEffect(() => {
    refresh();
    return onVaultChanged(refresh);
  }, [refresh]);

  const toggle = useCallback(
    async (todo: TodoItem) => {
      setTodos((prev) =>
        prev.map((t) =>
          t.file_path === todo.file_path && t.line_index === todo.line_index
            ? { ...t, checked: !t.checked }
            : t
        )
      );
      try {
        await invoke("toggle_todo", {
          filePath: todo.file_path,
          lineIndex: todo.line_index,
          checked: !todo.checked,
        });
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
      }
      refresh();
    },
    [refresh]
  );

  /** Appends a new "- [ ]" task to the vault's inbox note. */
  const addTodo = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const file = `${vaultPath}/01 Inbox/Schnellnotizen.md`;
      try {
        const existing = await invoke<string>("read_file", { path: file }).catch(() => "# Schnellnotizen\n");
        await invoke("write_file", { path: file, content: `${existing.trimEnd()}\n- [ ] ${clean}\n` });
        emitVaultChanged();
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
      }
    },
    [vaultPath]
  );

  return { todos, toggle, addTodo, refresh, error };
}

export function useOpenInEditor() {
  return useCallback(async (path: string) => {
    try {
      await invoke("open_in_editor", { path });
    } catch (e) {
      console.error("open_in_editor failed:", e);
    }
  }, []);
}
