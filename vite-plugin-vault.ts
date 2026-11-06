import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";

/**
 * Dev-only bridge: exposes the same commands the Tauri backend offers
 * (list_vault_files, read_file, ...) over HTTP so the app is fully usable
 * in a normal browser at http://localhost:1420 with the REAL vault files.
 *
 * Safety: only reachable from the dev server, requires a custom header
 * (blocks cross-site requests) and is restricted to the two vault folders.
 */

const DOCS = path.join(os.homedir(), "Documents");
const ROOTS = [path.join(DOCS, "second-brain"), path.join(DOCS, "personal-brain")];

function assertInVault(p: string): string {
  const resolved = path.resolve(String(p));
  const ok = ROOTS.some((r) => resolved === r || resolved.startsWith(r + path.sep));
  if (!ok) throw new Error(`Pfad liegt außerhalb der Vaults: ${p}`);
  return resolved;
}

const nfc = (s: string) => s.normalize("NFC");

function walkMarkdown(root: string, skipDirs: string[] = []): string[] {
  const skip = new Set(["node_modules", "Library", "Packages", "07 Anhänge", ...skipDirs].map(nfc));
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    // Nested git repositories (cloned projects) are code, not notes.
    if (dir !== root && entries.some((x) => x.name === ".git")) continue;
    for (const e of entries) {
      if (e.name.startsWith(".") || skip.has(nfc(e.name))) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
    }
  }
  return out;
}

function listVaultFiles(vaultPath: string) {
  const root = assertInVault(vaultPath);
  return walkMarkdown(root)
    .map((full) => {
      let modified = 0;
      try {
        modified = Math.floor(fs.statSync(full).mtimeMs / 1000);
      } catch {
        /* ignore */
      }
      const parts = path.relative(root, full).split(path.sep);
      return {
        path: full,
        name: nfc(path.basename(full, ".md")),
        category: parts.length > 1 ? nfc(parts[0]) : "Root",
        modified,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

function parseTodos(vaultPath: string) {
  const root = assertInVault(vaultPath);
  const files = walkMarkdown(root, ["06 Archiv"])
    .map((f) => ({ f, m: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.m - a.m);

  const todos: { text: string; checked: boolean; file_path: string; line_index: number }[] = [];
  for (const { f } of files) {
    let content: string;
    try {
      content = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    content.split("\n").forEach((line, i) => {
      const t = line.trimStart();
      if (t.startsWith("- [ ] ")) todos.push({ text: t.slice(6), checked: false, file_path: f, line_index: i });
      else if (t.startsWith("- [x] ") || t.startsWith("- [X] "))
        todos.push({ text: t.slice(6), checked: true, file_path: f, line_index: i });
    });
    if (todos.length > 800) break;
  }
  return todos;
}

function toggleTodo(filePath: string, lineIndex: number, checked: boolean) {
  const p = assertInVault(filePath);
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) throw new Error("Zeilenindex außerhalb des Bereichs");
  lines[lineIndex] = checked
    ? lines[lineIndex].replace(/- \[ \] /, "- [x] ")
    : lines[lineIndex].replace(/- \[[xX]\] /, "- [ ] ");
  fs.writeFileSync(p, lines.join("\n"));
}

function getFinanceData(financePath: string) {
  const p = assertInVault(financePath);
  const content = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const entries: { date: string; amount: number; category: string; description: string; entry_type: string }[] = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("| 20")) continue;
    const cols = line.split("|").map((s) => s.trim());
    if (cols.length < 6) continue;
    const amount = parseFloat(cols[2].replace(/[+\- ]/g, ""));
    if (Number.isNaN(amount)) continue;
    const signed = cols[2].includes("-") ? -amount : amount;
    entries.push({
      date: cols[1],
      amount: Math.abs(signed),
      category: cols[3],
      description: cols[4],
      entry_type: signed >= 0 ? "income" : "expense",
    });
  }
  const total_income = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
  const total_expenses = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
  return { entries, total_income, total_expenses, balance: total_income - total_expenses };
}

function addFinanceEntry(financePath: string, entry: any) {
  const p = assertInVault(financePath);
  const header =
    "| Datum | Betrag | Kategorie | Beschreibung | Typ |\n|-------|--------|-----------|--------------|-----|\n";
  const content = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : `# Finanzen\n\n## Einträge\n\n${header}`;
  const sign = entry.entry_type === "income" ? "+" : "-";
  const row = `| ${entry.date} | ${sign}${Number(entry.amount).toFixed(2)} | ${entry.category} | ${entry.description} | ${entry.entry_type} |\n`;
  const marker = "| Typ |\n|-------|--------|-----------|--------------|-----|\n";
  const updated = content.includes(marker)
    ? content.replace(marker, marker + row)
    : `${content.trimEnd()}\n\n## Einträge\n\n${header}${row}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, updated);
}

function searchVault(query: string, vaultPath?: string) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const roots = vaultPath ? [assertInVault(vaultPath)] : ROOTS;
  const results: { path: string; name: string; category: string; snippet: string }[] = [];
  for (const root of roots) {
    const files = walkMarkdown(root, ["06 Archiv"]);
    for (const f of files) {
      const base = path.basename(f, ".md").toLowerCase();
      let content = "";
      try {
        content = fs.readFileSync(f, "utf8");
      } catch {
        continue;
      }
      const matchTitle = base.includes(q);
      const matchContent = content.toLowerCase().includes(q);
      if (matchTitle || matchContent) {
        let snippet = "";
        if (matchContent) {
          const lines = content.split("\n");
          const line = lines.find((l) => l.toLowerCase().includes(q)) || lines[0] || "";
          snippet = line.trim().slice(0, 180);
        } else {
          snippet = content.slice(0, 150).replace(/\n/g, " ").trim();
        }
        results.push({
          path: f,
          name: nfc(path.basename(f, ".md")),
          category: path.relative(root, f).split(path.sep)[0] || "Root",
          snippet,
        });
        if (results.length >= 30) return results;
      }
    }
  }
  return results;
}

type Handler = (args: any) => unknown | Promise<unknown>;

const handlers: Record<string, Handler> = {
  list_vault_files: ({ vaultPath }) => listVaultFiles(vaultPath),
  recent_files: ({ vaultPath, limit }) => listVaultFiles(vaultPath).slice(0, Number(limit) || 10),
  search_vault: ({ query, vaultPath }) => searchVault(query, vaultPath),
  read_file: ({ path: p }) => {
    const resolved = path.resolve(String(p));
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return fs.readFileSync(resolved, "utf8");
    }
    return fs.readFileSync(assertInVault(p), "utf8");
  },
  write_file: ({ path: p, content }) => {
    const target = assertInVault(p);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(content));
  },
  create_folder: ({ path: p }) => {
    const target = assertInVault(p);
    fs.mkdirSync(target, { recursive: true });
  },
  delete_file_or_folder: ({ path: p }) => {
    const target = assertInVault(p);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  },
  rename_file_or_folder: ({ from, to }) => {
    const src = assertInVault(from);
    const dest = assertInVault(to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
  },
  reveal_in_finder: ({ path: p }) =>
    new Promise<void>((resolve, reject) => {
      const target = assertInVault(p);
      execFile("open", ["-R", target], (err) => (err ? reject(err) : resolve()));
    }),
  parse_todos: ({ vaultPath }) => parseTodos(vaultPath),
  toggle_todo: ({ filePath, lineIndex, checked }) => toggleTodo(filePath, Number(lineIndex), Boolean(checked)),
  get_finance_data: ({ financePath }) => getFinanceData(financePath),
  add_finance_entry: ({ financePath, entry }) => addFinanceEntry(financePath, entry),
  get_calendar_events: () => {
    throw new Error("Der Kalender ist nur in der Desktop-App verfügbar (npm run tauri dev).");
  },
  open_in_editor: ({ path: p }) =>
    new Promise<void>((resolve, reject) => {
      const target = assertInVault(p);
      execFile("open", ["-a", "Obsidian", target], (err) => (err ? reject(err) : resolve()));
    }),
  ai_proxy_request: async ({ url, method, api_key, body }) => {
    let targetUrl = String(url || "");
    if (targetUrl.startsWith("/hai-api")) {
      targetUrl = targetUrl.replace(/^\/hai-api/, "http://localhost:6655");
    }
    const res = await fetch(targetUrl, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${String(api_key || "").trim()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Proxy-Fehler (${res.status}): ${txt.slice(0, 300)}`);
    }
    return res.json();
  },
};

export function vaultApi(): Plugin {
  return {
    name: "vault-api",
    configureServer(server) {
      server.middlewares.use("/__vault/invoke", (req, res) => {
        res.setHeader("content-type", "application/json");
        if (req.method !== "POST" || req.headers["x-vault-client"] !== "1") {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Forbidden" }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const { cmd, args } = JSON.parse(body || "{}");
            const fn = handlers[cmd];
            if (!fn) throw new Error(`Unbekannter Befehl: ${cmd}`);
            const result = await fn(args ?? {});
            res.end(JSON.stringify({ result: result ?? null }));
          } catch (e) {
            res.statusCode = 200;
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
          }
        });
      });
    },
  };
}
