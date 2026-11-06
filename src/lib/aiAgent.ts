import { invoke, emitVaultChanged } from "./backend";
import { WORK_VAULT, PRIVATE_VAULT } from "@/hooks/useVaultFiles";
import { recordCopilotAction } from "./copilotHistory";

export interface AttachedFile {
  path: string;
  name: string;
  vault?: "work" | "private" | "external";
  category?: string;
  content?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  timestamp?: number;
  activity?: string; // e.g. "Durchsuche Vault nach 'Green Ledger'..."
  attachedFiles?: AttachedFile[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ResponsePacing = "natural" | "calm" | "instant";

export interface AgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  pacing?: ResponsePacing; // "natural" (angenehmer Schreibfluss), "calm" (entspannt), "instant" (sofort)
}

export const DEFAULT_CONFIG: AgentConfig = {
  baseUrl: "http://127.0.0.1:6655/openai/v1",
  apiKey: "632f5ec7-ae98-4cd3-9ce1-b1214940fb12",
  model: "gpt-4.1-mini",
  pacing: "natural",
  systemPrompt: `Du bist der hochintelligente Knowledge Copilot und das LLM-Wiki für das Second Brain des Nutzers.
Deine Aufgabe ist es, Notizen, Projekte, Aufgaben und Wissen zu finden, zu vernetzen, zusammenzufassen und zu bearbeiten, ohne dass der Nutzer zwischen Terminal und Obsidian wechseln muss.

ARCHITEKTUR DES SECOND BRAINS:
1. WORK VAULT (/Users/I539120/Documents/second-brain) - PARA Methode:
   - 00 Kontext: Globale Ausrichtung, Prinzipien, Systemkontext.
   - 01 Inbox: Ideen, Schnellnotizen.md, unstrukturierte Notizen.
   - 02 Projekte: Aktive Projekte (z.B. Omni Agent, Sustainability in EPM, Green Ledger).
   - 03 Bereiche: Dauerhafte Verantwortungsbereiche (Teams, Architektur, Reviews).
   - 04 Ressourcen: Nachschlagewerke, Recherche, INDEX-Dateien, Guides.
   - 05 Daily Notes: Sprint-Logs, Session-Notes (z.B. Sessions/YYYY-MM-DD – <Titel>.md).
   - 06 Archiv: Abgeschlossene Projekte.

2. PRIVATE VAULT (/Users/I539120/Documents/personal-brain):
   - 02 Projekte: Persönliche Coding- & Spieleprojekte (Godot Spielprojekt, Wheel of Life App, AI-Agent-Development).
   - 03 Bereiche: Leben & Routinen, Habits/Habits.md (Gewohnheiten-Tracker), Finanzen/Finanzen.md (Einnahmen/Ausgaben-Tabelle).
   - 06 Archiv: Private Altnotizen.

DEINE FÄHIGKEITEN & TOOLS:
- search_vault: Durchsucht den Inhalt und Titel aller Markdown-Dateien nach Begriffen. Nutze dies sofort, wenn der Nutzer nach Wissen fragt!
- read_note: Liest den vollständigen Markdown-Inhalt einer Datei.
- open_note: Öffnet eine Notiz direkt im zentralen Reader/Editor des Dashboards. Nutze dies, wenn der Nutzer eine Notiz sehen oder öffnen möchte!
- create_or_update_note: Schreibt oder hängt Inhalt an eine Notiz an. Wenn du Arbeits-Sessions dokumentierst, erstelle die Datei unter '05 Daily Notes/Sessions/YYYY-MM-DD – <Titel>.md'. Jede bearbeitete oder erstellte Notiz wird automatisch im Dashboard geöffnet und im Cockpit unter 'Zuletzt vom Copilot bearbeitet' vermerkt!
- add_todo: Erstellt ein neues ToDo '- [ ] ...' in der Inbox (Schnellnotizen.md).
- list_vault_files: Listet Notizen auf.

VERHALTENSREGELN:
- Antworte präzise, klar und auf den Punkt auf Deutsch (sofern der Nutzer nicht eine andere Sprache wählt).
- Nutze aktiv deine Tools (search_vault, read_note, open_note), wenn der Nutzer nach Inhalten oder Kontext fragt.
- Wenn du eine Session oder Notiz für den Nutzer erstellst, fasse die wichtigsten Punkte zusammen und öffne die Datei direkt mit open_note oder erstelle sie mit create_or_update_note.
- Biete bei Recherchen strukturierte Synthesen, Bulletpoints und konkrete nächste Schritte.`,
};

export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_vault",
      description: "Durchsucht alle Markdown-Dateien im Second Brain nach Stichwörtern im Titel oder Inhalt.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Der Suchbegriff oder die Phrase (z.B. 'Green Ledger', 'Omni Agent', 'Sprint 66')",
          },
          vault: {
            type: "string",
            enum: ["work", "private", "both"],
            description: "In welchem Vault gesucht werden soll (Standard: 'both')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_note",
      description: "Liest den vollständigen Inhalt einer Markdown-Notiz anhand ihres absoluten oder relativen Pfads.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absoluter Pfad oder relativer Pfad zur Markdown-Datei.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_note",
      description: "Öffnet eine Notiz direkt im zentralen Editor/Reader des Dashboards für den Nutzer.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absoluter Pfad oder Dateiname der Notiz, die im Dashboard geöffnet werden soll.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_or_update_note",
      description: "Erstellt eine neue Notiz oder aktualisiert/hängt Text an eine bestehende Markdown-Notiz an.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absoluter Pfad zur Zieldatei (z.B. im Work- oder Private-Vault).",
          },
          content: {
            type: "string",
            description: "Der Markdown-Inhalt, der geschrieben werden soll.",
          },
          mode: {
            type: "string",
            enum: ["overwrite", "append"],
            description: "Ob die Datei überschrieben ('overwrite') oder der Text am Ende angehängt werden soll ('append'). Standard: append.",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_todo",
      description: "Fügt eine neue Aufgabe / ToDo in die Schnellnotizen der Inbox ein.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Der Aufgabentext (z.B. 'Feedback für PR einholen').",
          },
          vault: {
            type: "string",
            enum: ["work", "private"],
            description: "Work oder Private Vault (Standard: 'work').",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_vault_files",
      description: "Listet die wichtigsten Notizen eines Vaults auf.",
      parameters: {
        type: "object",
        properties: {
          vault: {
            type: "string",
            enum: ["work", "private"],
            description: "Welcher Vault gelistet werden soll.",
          },
          limit: {
            type: "number",
            description: "Maximale Anzahl zurückgegebener Dateien (Standard: 20).",
          },
        },
      },
    },
  },
];

export function getStoredConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem("ai_agent_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate legacy localhost:6655 to 127.0.0.1:6655 to avoid macOS IPv6 connection refused
      if (parsed.baseUrl && parsed.baseUrl.includes("localhost:6655")) {
        parsed.baseUrl = parsed.baseUrl.replace(/localhost:6655/g, "127.0.0.1:6655");
        try {
          localStorage.setItem("ai_agent_config", JSON.stringify(parsed));
        } catch {}
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(cfg: AgentConfig) {
  localStorage.setItem("ai_agent_config", JSON.stringify(cfg));
}

/**
 * Resolves any base URL input (e.g. "http://127.0.0.1:6655", "http://localhost:6655", "/hai-api", etc.)
 * to the exact OpenAI-compatible endpoint expected by the HAI proxy (/openai/v1),
 * ensuring IPv4 loopback (127.0.0.1) is used instead of IPv6 localhost to prevent ECONNREFUSED on macOS.
 */
export function resolveProxyUrl(rawUrl: string, endpoint: string): string {
  let base = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!base) base = "http://127.0.0.1:6655/openai/v1";

  // Normalize localhost to 127.0.0.1
  base = base.replace(/localhost:6655/g, "127.0.0.1:6655");

  if (base.startsWith("/hai-api")) {
    base = base.replace(/^\/hai-api/, "http://127.0.0.1:6655");
  } else if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `http://127.0.0.1:6655${base.startsWith("/") ? "" : "/"}${base}`;
  }

  // Ensure /openai/v1 is present if not already in the path
  if (!base.includes("/openai/v1")) {
    base = `${base}/openai/v1`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

/**
 * Executes a proxy request through the native backend (Rust or Vite dev bridge),
 * completely bypassing browser CORS and preflight authorization issues.
 */
export async function sendAiProxyRequest<T = any>(
  baseUrl: string,
  endpoint: string,
  apiKey: string,
  method: "GET" | "POST" = "POST",
  body?: any
): Promise<T> {
  const fullUrl = resolveProxyUrl(baseUrl, endpoint);
  const key = (apiKey || "").trim();
  return invoke<T>("ai_proxy_request", {
    url: fullUrl,
    method,
    apiKey: key,   // Required by Tauri command IPC deserializer (camelCase)
    api_key: key,  // Required by Vite dev bridge (snake_case)
    body: body ?? null,
  });
}

export interface AgentToolContext {
  onSelectFile?: (path: string) => void;
}

// Execute a tool locally on behalf of the agent
export async function executeAgentTool(
  name: string,
  rawArgs: string,
  context?: AgentToolContext
): Promise<string> {
  let args: any = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return JSON.stringify({ error: "Ungültige JSON Argumente" });
  }

  try {
    switch (name) {
      case "search_vault": {
        const query = String(args.query || "");
        const vault = args.vault || "both";
        const results: any[] = [];
        if (vault === "work" || vault === "both") {
          const workRes = await invoke<any[]>("search_vault", { query, vaultPath: WORK_VAULT }).catch(() => []);
          results.push(...(workRes || []));
        }
        if (vault === "private" || vault === "both") {
          const privRes = await invoke<any[]>("search_vault", { query, vaultPath: PRIVATE_VAULT }).catch(() => []);
          results.push(...(privRes || []));
        }
        return JSON.stringify({
          count: results.length,
          results: results.slice(0, 15).map((r) => ({
            name: r.name,
            path: r.path,
            category: r.category,
            snippet: r.snippet,
          })),
        });
      }

      case "read_note": {
        const filePath = String(args.path || "");
        const content = await invoke<string>("read_file", { path: filePath });
        recordCopilotAction({
          path: filePath,
          action: "opened",
          summary: "Vom Copilot analysiert & gelesen",
        });
        // Truncate to reasonable token limit if very huge
        const trimmed = content.length > 25000 ? content.slice(0, 25000) + "\n... [gekürzt]" : content;
        return JSON.stringify({ path: filePath, content: trimmed });
      }

      case "open_note": {
        let filePath = String(args.path || "").trim();
        if (!filePath.startsWith("/")) {
          const found = await invoke<any[]>("search_vault", { query: filePath, vaultPath: WORK_VAULT }).catch(() => []);
          if (found && found.length > 0) {
            filePath = found[0].path;
          } else {
            filePath = `${WORK_VAULT}/${filePath.replace(/^\/+/, "")}`;
          }
        }
        if (context?.onSelectFile) {
          context.onSelectFile(filePath);
        }
        recordCopilotAction({
          path: filePath,
          action: "opened",
          summary: "Vom Copilot geöffnet",
        });
        return JSON.stringify({ success: true, opened: filePath });
      }

      case "create_or_update_note": {
        let filePath = String(args.path || "").trim();
        if (!filePath.startsWith("/")) {
          filePath = `${WORK_VAULT}/${filePath.replace(/^\/+/, "")}`;
        }
        const mode = args.mode || "append";
        let isNew = false;
        let existing = "";
        try {
          existing = await invoke<string>("read_file", { path: filePath });
        } catch {
          isNew = true;
        }

        let finalContent = String(args.content || "");
        if (mode === "append" && !isNew) {
          finalContent = existing ? `${existing.trimEnd()}\n\n${finalContent}` : finalContent;
        }

        await invoke("write_file", { path: filePath, content: finalContent });

        // Record in Copilot history
        recordCopilotAction({
          path: filePath,
          action: isNew ? "created" : "updated",
          summary: isNew
            ? "Neue Notiz vom Copilot erstellt"
            : "Inhalt vom Copilot aktualisiert/angehängt",
        });

        // Automatically open the note in the dashboard for the user!
        if (context?.onSelectFile) {
          context.onSelectFile(filePath);
        }

        emitVaultChanged();
        return JSON.stringify({
          success: true,
          path: filePath,
          mode,
          action: isNew ? "created" : "updated",
          openedInEditor: !!context?.onSelectFile,
        });
      }

      case "add_todo": {
        const text = String(args.text || "").trim();
        const vault = args.vault === "private" ? PRIVATE_VAULT : WORK_VAULT;
        const target = `${vault}/01 Inbox/Schnellnotizen.md`;
        const existing = await invoke<string>("read_file", { path: target }).catch(() => "# Schnellnotizen\n");
        const line = `- [ ] ${text}`;
        const updated = `${existing.trimEnd()}\n${line}\n`;
        await invoke("write_file", { path: target, content: updated });
        recordCopilotAction({
          path: target,
          action: "updated",
          summary: `Aufgabe hinzugefügt: "${text}"`,
        });
        emitVaultChanged();
        return JSON.stringify({ success: true, todo: line, targetFile: target });
      }

      case "list_vault_files": {
        const vault = args.vault === "private" ? PRIVATE_VAULT : WORK_VAULT;
        const limit = Number(args.limit) || 20;
        const files = await invoke<any[]>("list_vault_files", { vaultPath: vault });
        return JSON.stringify({
          files: files.slice(0, limit).map((f) => ({
            name: f.name,
            path: f.path,
            category: f.category,
          })),
        });
      }

      default:
        return JSON.stringify({ error: `Unbekanntes Tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || String(err) });
  }
}

/**
 * Abortable sleep helper for thoughtful pacing & micro-delays
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    let timer: any = null;
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Streams text with realistic, natural human typing cadence
 * - Tokens appear smoothly with small human variations
 * - Pacing pauses at sentence endings (. ? !), clauses (, ; :) and linebreaks (\n)
 * - Adapts speed dynamically so long answers finish in comfortable time (~4-6s)
 * - Returns true if finished, false if aborted
 */
export async function typeTextNaturally(
  fullText: string,
  onUpdate: (currentText: string) => void,
  signal?: AbortSignal,
  pacing: ResponsePacing = "natural"
): Promise<boolean> {
  if (pacing === "instant" || !fullText) {
    onUpdate(fullText);
    return true;
  }

  // Tokenize text into words/whitespace chunks
  const tokens = fullText.match(/\S+|\s+/g) || [fullText];
  let accumulated = "";

  // Base parameters per pacing mode
  // natural: ~22ms per token, smooth and human
  // calm: ~38ms per token, thoughtful and relaxed
  const baseDelay = pacing === "calm" ? 38 : 22;
  const sentencePause = pacing === "calm" ? 140 : 90;
  const clausePause = pacing === "calm" ? 65 : 40;
  const paragraphPause = pacing === "calm" ? 110 : 70;

  // Dynamic scale factor for long texts to avoid excessive waiting
  const totalTokens = tokens.length;
  const targetMaxDurationMs = pacing === "calm" ? 9000 : 6500;
  const estimatedNormalDuration = totalTokens * (baseDelay + 10);
  const scale = estimatedNormalDuration > targetMaxDurationMs
    ? Math.max(0.35, targetMaxDurationMs / estimatedNormalDuration)
    : 1.0;

  for (let i = 0; i < tokens.length; i++) {
    if (signal?.aborted) {
      return false;
    }

    const token = tokens[i];
    accumulated += token;
    onUpdate(accumulated);

    // Calculate natural delay with slight human variance (±4ms)
    let delay = Math.max(8, (baseDelay + (Math.floor(Math.random() * 8) - 4)) * scale);

    // Natural punctuation pauses
    if (/[.!?]$/.test(token) || /[.!?]["'»)]$/.test(token)) {
      delay += sentencePause * scale;
    } else if (/[,;:]$/.test(token)) {
      delay += clausePause * scale;
    } else if (token.includes("\n")) {
      delay += paragraphPause * scale;
    }

    await sleep(delay, signal);
  }

  return true;
}

