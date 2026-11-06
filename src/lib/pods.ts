import { WORK_VAULT, VaultFile } from "@/hooks/useVaultFiles";
import { invoke, emitVaultChanged } from "./backend";

export type PodColor = "emerald" | "blue" | "purple" | "amber" | "rose" | "teal";

export interface Pod {
  id: string;
  name: string;
  mission: string;
  team: string;
  color: PodColor;
  documentPath: string; // Relative to WORK_VAULT or absolute
  createdAt: number;
}

const STORAGE_KEY = "second_brain_team_pods";
const PODS_CHANGED_EVENT = "pods-changed";

export const COLOR_VARIANTS: Record<
  PodColor,
  { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }
> = {
  emerald: {
    label: "Smaragdgrün",
    dotClass: "bg-emerald-500 shadow-emerald-500/40",
    bgClass: "bg-emerald-50 text-emerald-800",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
  blue: {
    label: "Kobaltblau",
    dotClass: "bg-blue-600 shadow-blue-600/40",
    bgClass: "bg-blue-50 text-blue-800",
    textClass: "text-blue-600",
    borderClass: "border-blue-200",
  },
  purple: {
    label: "Amethyst",
    dotClass: "bg-purple-600 shadow-purple-600/40",
    bgClass: "bg-purple-50 text-purple-800",
    textClass: "text-purple-600",
    borderClass: "border-purple-200",
  },
  amber: {
    label: "Bernstein",
    dotClass: "bg-amber-500 shadow-amber-500/40",
    bgClass: "bg-amber-50 text-amber-800",
    textClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  rose: {
    label: "Koralle / Rose",
    dotClass: "bg-rose-500 shadow-rose-500/40",
    bgClass: "bg-rose-50 text-rose-800",
    textClass: "text-rose-600",
    borderClass: "border-rose-200",
  },
  teal: {
    label: "Türkis",
    dotClass: "bg-teal-500 shadow-teal-500/40",
    bgClass: "bg-teal-50 text-teal-800",
    textClass: "text-teal-600",
    borderClass: "border-teal-200",
  },
};

export const INITIAL_PODS: Pod[] = [
  {
    id: "pod-epm-finance",
    name: "Pod 2 – Integrated Finance & Sustainability",
    mission: "Footprint Optimization, Carbon Performance Steering, Personas & Omni Agent User Flows",
    team: "Omni Agent Squad",
    color: "emerald",
    documentPath: "04 Ressourcen/Sustainability in EPM – Omni Agent",
    createdAt: 1728345600000,
  },
];

export function getStoredPods(): Pod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Only Omni Agent is an actual Pod; filter out older mock entries
        const cleaned = parsed.filter(
          (p) => p.id !== "pod-green-ledger" && p.id !== "pod-ai-governance"
        );
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.error("Error loading pods:", err);
  }
  return INITIAL_PODS;
}

export function saveStoredPods(pods: Pod[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pods));
    window.dispatchEvent(new Event(PODS_CHANGED_EVENT));
  } catch (err) {
    console.error("Error saving pods:", err);
  }
}

export function subscribePods(callback: () => void): () => void {
  window.addEventListener(PODS_CHANGED_EVENT, callback);
  return () => window.removeEventListener(PODS_CHANGED_EVENT, callback);
}

export async function createPod(data: {
  name: string;
  mission: string;
  team: string;
  color: PodColor;
  documentPath: string;
}): Promise<Pod> {
  const pods = getStoredPods();
  const id = "pod-" + Date.now();
  const cleanPath = data.documentPath.trim().replace(/^\/+/, "");

  const newPod: Pod = {
    id,
    name: data.name.trim(),
    mission: data.mission.trim(),
    team: data.team.trim() || "Team",
    color: data.color || "blue",
    documentPath: cleanPath,
    createdAt: Date.now(),
  };

  const updated = [newPod, ...pods];
  saveStoredPods(updated);

  // Automatically ensure the pod directory and an initial INDEX.md exist in the vault
  try {
    const fullFolderPath = `${WORK_VAULT}/${cleanPath}`;
    const initialFilePath = `${fullFolderPath}/INDEX.md`;
    const initialContent = `# ${newPod.name}

> **Team:** ${newPod.team}  
> **Mission:** ${newPod.mission}  
> **Erstellt:** ${new Date().toLocaleDateString("de-DE")}  

---

## 🎯 Pod-Ziele & Teamaufgabe
- [ ] Kick-off & Alignment durchführen
- [ ] Architektur- und Wissensbasis aufbauen
- [ ] Offene Fragen für das Team dokumentieren

## 📚 Relevante Notizen & Wiki-Seiten
Hier entsteht das kollektive LLM-Wiki für diesen Pod. Alle Dateien in diesem Ordner stehen dem Wiki Copilot zur Verfügung.
`;

    await invoke("write_file", { path: initialFilePath, content: initialContent });
    emitVaultChanged();
  } catch (err) {
    console.warn("Could not automatically create initial INDEX.md in vault:", err);
  }

  return newPod;
}

export function deletePod(podId: string): void {
  const pods = getStoredPods();
  const filtered = pods.filter((p) => p.id !== podId);
  saveStoredPods(filtered);
}

export function updatePod(
  podId: string,
  data: Partial<Omit<Pod, "id" | "createdAt">>
): Pod | null {
  const pods = getStoredPods();
  const index = pods.findIndex((p) => p.id === podId);
  if (index === -1) return null;

  const current = pods[index];
  const updatedPod: Pod = {
    ...current,
    name: data.name !== undefined ? data.name.trim() : current.name,
    mission: data.mission !== undefined ? data.mission.trim() : current.mission,
    team: data.team !== undefined ? data.team.trim() : current.team,
    color: data.color !== undefined ? data.color : current.color,
    documentPath:
      data.documentPath !== undefined
        ? data.documentPath.trim().replace(/^\/+/, "")
        : current.documentPath,
  };

  pods[index] = updatedPod;
  saveStoredPods(pods);
  return updatedPod;
}

/**
 * Filter files belonging to a specific pod's path
 */
export function getPodFiles(pod: Pod, allFiles: VaultFile[]): VaultFile[] {
  const normPath = pod.documentPath.toLowerCase().trim().replace(/\\/g, "/");
  return allFiles.filter((f) => {
    const fPath = f.path.toLowerCase().replace(/\\/g, "/");
    return fPath.includes(normPath);
  });
}
