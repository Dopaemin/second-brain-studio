import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GENERIC_NAMES = new Set(["readme", "index", "license", "changelog", "agents", "claude", "todo"]);

/** Human label for a note path; generic names (README, INDEX…) get their parent folder prepended. */
export function noteLabel(filePath: string): string {
  const parts = filePath.split("/");
  const name = (parts.pop() ?? "").replace(/\.md$/, "").normalize("NFC");
  const parent = parts.pop()?.normalize("NFC");
  return GENERIC_NAMES.has(name.toLowerCase()) && parent ? `${parent} / ${name}` : name;
}
