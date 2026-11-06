export interface SprintItem {
  id: string;
  raw: string;
  title: string;
  ticketId?: string;
  ticketUrl?: string;
  status: "done" | "in_progress" | "todo" | "blocked";
  checked: boolean;
  details?: string;
  lineIndex: number;
}

export interface SprintDoc {
  path: string;
  fileName: string;
  sprintNumber?: string;
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  reviewDate?: string;
  status: "aktiv" | "abgeschlossen" | "geplant";
  tags: string[];
  type: "sprint" | "review" | "retro" | "planning" | "journal" | "session";
  rawContent: string;
  items: SprintItem[];
  notesSection: string;
  standSection: string;
  ergebnisSection: string;
}

/**
 * Parses frontmatter YAML block and returns key-value pairs
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawYaml = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};

  for (const line of rawYaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    let val = trimmed.slice(colonIdx + 1).trim();

    // Check array [a, b, c]
    if (val.startsWith("[") && val.endsWith("]")) {
      frontmatter[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      // Remove quotes
      val = val.replace(/^['"]|['"]$/g, "");
      frontmatter[key] = val;
    }
  }

  return { frontmatter, body };
}

/**
 * Extracts sections from markdown like ## Backlog Items, ## Notizen, etc.
 */
export function extractSection(content: string, headingRegex: RegExp): string {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    if (headingRegex.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && /^##\s+/.test(line)) {
      break;
    }
    if (capturing) {
      captured.push(line);
    }
  }

  return captured.join("\n").trim();
}

/**
 * Parses items from markdown lines under Backlog Items / Stand
 */
export function parseSprintItems(content: string): SprintItem[] {
  const lines = content.split("\n");
  const items: SprintItem[] = [];

  // If the document has a dedicated Backlog Items section, ONLY parse from that section.
  // Otherwise fallback to Stand/Fortschritt.
  const hasDedicatedBacklog = lines.some((l) =>
    /^##\s+(Backlog Items|Aufgaben|Backlog)/i.test(l.trim())
  );

  const sectionRegex = hasDedicatedBacklog
    ? /^##\s+(Backlog Items|Aufgaben|Backlog)/i
    : /^##\s+(Backlog Items|Aufgaben|Backlog|Items|Stand|Fortschritt)/i;

  let inTargetSection = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check section header
    if (sectionRegex.test(trimmed)) {
      inTargetSection = true;
      return;
    }
    if (inTargetSection && /^##\s+/.test(trimmed)) {
      inTargetSection = false;
      return;
    }

    // Capture list items: - or *
    if (inTargetSection && /^[-*]\s+/.test(trimmed)) {
      const itemRaw = trimmed.replace(/^[-*]\s+/, "");
      if (!itemRaw || itemRaw.startsWith("<!--")) return;

      // Extract ticket ID like [GRL-15114](https://...) or GRL-15114
      const ticketMatch = itemRaw.match(/\[([A-Z]+-\d+)\]\(([^)]+)\)/);
      const simpleTicketMatch = itemRaw.match(/\b([A-Z]+-\d+)\b/);

      const ticketId = ticketMatch?.[1] || simpleTicketMatch?.[1];
      const ticketUrl = ticketMatch?.[2];

      // Determine status from emoji or checkmarks
      let status: SprintItem["status"] = "todo";
      let checked = false;

      if (
        /✅|\[x\]|\[X\]|erledigt|fertig|gemerged/i.test(itemRaw) ||
        /\(fertig\)/i.test(itemRaw)
      ) {
        status = "done";
        checked = true;
      } else if (
        /🔄|in\s+progress|in\s+bearbeitung|in\s+review/i.test(itemRaw)
      ) {
        status = "in_progress";
      } else if (/❌|inaktiv|abgebrochen|blockiert/i.test(itemRaw)) {
        status = "blocked";
      } else if (/⏳|\[\s\]|ausstehend|offen/i.test(itemRaw)) {
        status = "todo";
      }

      // Title cleanup: remove markdown link wrappers for pure display
      let title = itemRaw
        .replace(/\[([A-Z]+-\d+)\]\([^)]+\)/g, "$1")
        .replace(/[✅🔄⏳❌]/g, "")
        .replace(/^\[[ xX]\]\s*/, "")
        .trim();

      items.push({
        id: `sprint-item-${index}`,
        raw: line,
        title,
        ticketId,
        ticketUrl,
        status,
        checked,
        lineIndex: index,
      });
    }
  });

  return items;
}

/**
 * Parses full sprint document
 */
export function parseSprintDoc(path: string, content: string): SprintDoc {
  const fileName = path.split("/").pop() || "Sprint Notiz";
  const { frontmatter } = parseFrontmatter(content);

  // Classify document type
  let type: SprintDoc["type"] = "sprint";
  const lowerPath = path.toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes("review") || frontmatter.tags?.includes("sprint-review")) {
    type = "review";
  } else if (lowerName.includes("retro") || frontmatter.tags?.includes("sprint-retro")) {
    type = "retro";
  } else if (lowerName.includes("journal") || frontmatter.tags?.includes("sprint-planning")) {
    type = "journal";
  } else if (lowerPath.includes("/sessions/")) {
    type = "session";
  }

  // Sprint number from frontmatter or filename
  let sprintNumber: string | undefined = frontmatter.sprint ? String(frontmatter.sprint) : undefined;
  if (!sprintNumber) {
    const numMatch = fileName.match(/Sprint\s+(\d+)/i);
    if (numMatch) sprintNumber = numMatch[1];
  }

  const title =
    frontmatter.title ||
    fileName.replace(".md", "");

  const statusRaw = (frontmatter.status || "").toLowerCase();
  let status: SprintDoc["status"] = "abgeschlossen";
  if (statusRaw.includes("aktiv") || statusRaw.includes("active") || statusRaw.includes("in_progress")) {
    status = "aktiv";
  } else if (statusRaw.includes("geplant") || statusRaw.includes("planned")) {
    status = "geplant";
  }

  const tags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : frontmatter.tags
    ? [String(frontmatter.tags)]
    : [];

  const items = parseSprintItems(content);
  const notesSection = extractSection(content, /^##\s+(Notizen|Dev Snippets|Notizen & Dev Snippets)/i);
  const standSection = extractSection(content, /^##\s+(Stand|Fortschritt|Stand \/ Fortschritt)/i);
  const ergebnisSection = extractSection(content, /^##\s+(Ergebnis|Zusammenfassung|Outcomes)/i);

  return {
    path,
    fileName,
    sprintNumber,
    title,
    date: frontmatter.date,
    startDate: frontmatter["sprint-start"] || frontmatter.start,
    endDate: frontmatter["sprint-ende"] || frontmatter["sprint-end"] || frontmatter.end,
    reviewDate: frontmatter["sprint-review"] || frontmatter.review,
    status,
    tags,
    type,
    rawContent: content,
    items,
    notesSection,
    standSection,
    ergebnisSection,
  };
}

/**
 * Updates an item's status in the raw markdown content
 */
export function updateSprintItemStatus(
  content: string,
  item: SprintItem,
  newStatus: "done" | "in_progress" | "todo" | "blocked"
): string {
  const lines = content.split("\n");
  if (item.lineIndex < 0 || item.lineIndex >= lines.length) return content;

  let line = lines[item.lineIndex];

  // Map status to symbol
  const symbolMap = {
    done: "✅",
    in_progress: "🔄",
    todo: "⏳",
    blocked: "❌",
  };

  const newSymbol = symbolMap[newStatus];

  // Remove existing status symbols or checkmarks
  let cleaned = line
    .replace(/[✅🔄⏳❌]/g, "")
    .replace(/^(\s*[-*]\s*)\[[ xX]\]\s*/, "$1")
    .trimEnd();

  // If checkbox style was present:
  if (/^(\s*[-*]\s*)/.test(cleaned)) {
    if (newStatus === "done") {
      cleaned = cleaned.replace(/^(\s*[-*]\s*)/, "$1[x] ");
    } else {
      cleaned = cleaned.replace(/^(\s*[-*]\s*)/, "$1[ ] ");
    }
  }

  // Append new status symbol
  lines[item.lineIndex] = `${cleaned} ${newSymbol}`.trimEnd();
  return lines.join("\n");
}

/**
 * Adds a new backlog item to the Sprint markdown under ## Backlog Items
 */
export function addSprintItem(
  content: string,
  newItemText: string,
  status: "done" | "in_progress" | "todo" = "todo"
): string {
  const lines = content.split("\n");
  const symbolMap = {
    done: "✅",
    in_progress: "🔄",
    todo: "⏳",
  };
  const symbol = symbolMap[status];
  const formattedLine = `- ${newItemText.trim()} ${symbol}`;

  // Find index of "## Backlog Items" or "## Aufgaben"
  const backlogIdx = lines.findIndex((l) =>
    /^##\s+(Backlog Items|Aufgaben|Items)/i.test(l.trim())
  );

  if (backlogIdx !== -1) {
    // Insert after any comment or directly under heading
    let insertAt = backlogIdx + 1;
    while (
      insertAt < lines.length &&
      (lines[insertAt].trim() === "" || lines[insertAt].trim().startsWith("<!--"))
    ) {
      insertAt++;
    }
    lines.splice(insertAt, 0, formattedLine);
    return lines.join("\n");
  }

  // Fallback: append at end
  return `${content}\n\n## Backlog Items\n\n${formattedLine}\n`;
}

/**
 * Edits the text of an item in the markdown
 */
export function editSprintItemText(
  content: string,
  item: SprintItem,
  newText: string
): string {
  const lines = content.split("\n");
  if (item.lineIndex < 0 || item.lineIndex >= lines.length) return content;

  const symbolMap = {
    done: "✅",
    in_progress: "🔄",
    todo: "⏳",
    blocked: "❌",
  };
  const symbol = symbolMap[item.status];
  lines[item.lineIndex] = `- ${newText.trim()} ${symbol}`;
  return lines.join("\n");
}

/**
 * Deletes an item from the markdown
 */
export function deleteSprintItem(content: string, item: SprintItem): string {
  const lines = content.split("\n");
  if (item.lineIndex < 0 || item.lineIndex >= lines.length) return content;
  lines.splice(item.lineIndex, 1);
  return lines.join("\n");
}

/**
 * Creates template content for a brand new Sprint file
 */
export function createSprintTemplate(
  sprintNum: string | number,
  startDate: string,
  endDate: string,
  initialItems: string[] = []
): string {
  const itemsStr =
    initialItems.length > 0
      ? initialItems.map((it) => `- ${it.trim()} ⏳`).join("\n")
      : "- [ ] Erstes Backlog Item anlegen ⏳";

  return `---
date: ${startDate}
sprint: ${sprintNum}
sprint-start: ${startDate}
sprint-ende: ${endDate}
sprint-review: ${endDate}
tags: [typ/sprint, bereich/work, projekt/green-ledger]
status: aktiv
---

# Sprint ${sprintNum}

**Zeitraum:** ${startDate} – ${endDate} (Review: ${endDate})

## Backlog Items

${itemsStr}

## Notizen & Dev Snippets

<!-- Während des Sprints hier Gedanken, Links und Notizen festhalten -->

## Stand / Fortschritt

<!-- Tägliche Status-Updates zu den Backlog-Items -->

## Ergebnis

<!-- Wird bei Sprint-Ende mit Ergebnissen und Zusammenfassung befüllt -->
`;
}

/**
 * Creates template content for a new Sprint Review document
 */
export function createSprintReviewTemplate(
  dateStr: string,
  sprintTitle: string = "Sprint Review"
): string {
  return `---
title: ${sprintTitle} — ${dateStr}
date: ${dateStr}
tags:
  - work
  - scrum
  - sprint-review
  - green-ledger
status: aktiv
---

# ${sprintTitle} — ${dateStr}

Moderiert von Emin.

## Anwesende / Abwesend

- 

## Besprochene Items & Demos

- 

## Feedback & Nächste Schritte

- 
`;
}

/**
 * Updates the frontmatter status ("aktiv" | "abgeschlossen" | "geplant") in markdown
 */
export function updateSprintStatusInContent(
  content: string,
  status: "aktiv" | "abgeschlossen" | "geplant"
): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match) {
    let yaml = match[1];
    const statusRegex = /^status\s*:.*$/m;
    if (statusRegex.test(yaml)) {
      yaml = yaml.replace(statusRegex, `status: ${status}`);
    } else {
      yaml = `${yaml.trimEnd()}\nstatus: ${status}`;
    }
    return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${yaml}\n---`);
  } else {
    return `---\nstatus: ${status}\n---\n\n${content}`;
  }
}

/**
 * Appends carry-over items to a sprint document under ## Backlog Items
 */
export function appendCarryOverItems(
  content: string,
  items: SprintItem[],
  previousSprintNum?: string
): string {
  if (items.length === 0) return content;

  const lines = content.split("\n");
  const suffix = previousSprintNum ? ` (Carry-over aus Sprint ${previousSprintNum})` : " (Carry-over)";

  const newLines = items.map((it) => {
    // Preserve Jira ticket link if available
    const ticketPart = it.ticketId && it.ticketUrl ? `[${it.ticketId}](${it.ticketUrl}) ` : "";
    const cleanTitle = it.title.replace(it.ticketId || "", "").trim();
    return `- ${ticketPart}${cleanTitle} 🔄${suffix}`.trim();
  });

  const backlogIdx = lines.findIndex((l) =>
    /^##\s+(Backlog Items|Aufgaben|Backlog)/i.test(l.trim())
  );

  if (backlogIdx !== -1) {
    let insertAt = backlogIdx + 1;
    while (
      insertAt < lines.length &&
      (lines[insertAt].trim() === "" || lines[insertAt].trim().startsWith("<!--"))
    ) {
      insertAt++;
    }
    lines.splice(insertAt, 0, ...newLines);
    return lines.join("\n");
  }

  return `${content}\n\n## Backlog Items\n\n${newLines.join("\n")}\n`;
}

