import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * One entry point for all backend calls.
 * - Desktop app: native Tauri command.
 * - Browser (dev server): same command via the vault dev bridge.
 */
export async function invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauri()) return tauriInvoke<T>(cmd, args);

  let res: Response;
  try {
    res = await fetch("/__vault/invoke", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vault-client": "1" },
      body: JSON.stringify({ cmd, args }),
    });
  } catch {
    throw new Error("Backend nicht erreichbar");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error ?? res.statusText);
  return data.result as T;
}

const VAULT_EVENT = "vault-changed";

/** Tell all views that files changed so lists/todos refresh. */
export function emitVaultChanged() {
  window.dispatchEvent(new Event(VAULT_EVENT));
}

/** Subscribe to file changes. Returns an unsubscribe function. */
export function onVaultChanged(cb: () => void) {
  window.addEventListener(VAULT_EVENT, cb);
  return () => window.removeEventListener(VAULT_EVENT, cb);
}
