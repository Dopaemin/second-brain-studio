import { useCallback, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { invoke } from "@/lib/backend";
import { PRIVATE_VAULT } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

const HABITS_PATH = `${PRIVATE_VAULT}/03 Bereiche/Habits/Habits.md`;
const SECTION = "## aktive habits";

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Habit {
  name: string;
  doneToday: boolean;
  streak: number;
}

/** "  - [x] 2026-10-26 – Name" lines below a habit mark completed days. */
function parseHabits(content: string): Habit[] {
  const lines = content.split("\n");
  const today = new Date();
  const todayStr = fmt(today);
  const habits: Habit[] = [];

  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.toLowerCase() === SECTION) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith("## ")) break;

    const isTopLevel = raw.startsWith("- ") && !raw.startsWith("- [");
    if (!isTopLevel) continue;
    const name = raw.slice(2).trim();
    if (!name) continue;

    const days = new Set<string>();
    for (let j = i + 1; j < lines.length; j++) {
      const sub = lines[j];
      if (!/^\s+- \[x\]/i.test(sub)) {
        if (sub.trim() === "") continue;
        break;
      }
      const m = sub.match(/\d{4}-\d{2}-\d{2}/);
      if (m) days.add(m[0]);
    }

    const doneToday = days.has(todayStr);
    const cursor = new Date(today);
    if (!doneToday) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    habits.push({ name, doneToday, streak });
  }
  return habits;
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const content = await invoke<string>("read_file", { path: HABITS_PATH });
      setHabits(parseHabits(content));
      setError(null);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleHabit = async (habit: Habit) => {
    const todayStr = fmt(new Date());
    try {
      const lines = (await invoke<string>("read_file", { path: HABITS_PATH })).split("\n");
      const idx = lines.findIndex((l) => l.trim() === `- ${habit.name}` && !l.startsWith(" "));
      if (idx === -1) return refresh();

      if (habit.doneToday) {
        for (let j = idx + 1; j < lines.length; j++) {
          if (!/^\s+- \[x\]/i.test(lines[j])) break;
          if (lines[j].includes(todayStr)) {
            lines.splice(j, 1);
            break;
          }
        }
      } else {
        lines.splice(idx + 1, 0, `  - [x] ${todayStr} – ${habit.name}`);
      }
      await invoke("write_file", { path: HABITS_PATH, content: lines.join("\n") });
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
    refresh();
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;
    try {
      const content = await invoke<string>("read_file", { path: HABITS_PATH }).catch(
        () => "# Habits\n\n## Aktive Habits\n\n"
      );
      const lines = content.split("\n");
      const header = lines.findIndex((l) => l.trim().toLowerCase() === SECTION);
      if (header === -1) {
        lines.push("", "## Aktive Habits", "", `- ${name}`);
      } else {
        let end = lines.findIndex((l, i) => i > header && l.startsWith("## "));
        if (end === -1) end = lines.length;
        const placeholder = lines.findIndex((l, i) => i > header && i < end && l.trim() === "-");
        if (placeholder !== -1) {
          lines[placeholder] = `- ${name}`;
        } else {
          let last = end - 1;
          while (last > header && lines[last].trim() === "") last--;
          lines.splice(last + 1, 0, `- ${name}`);
        }
      }
      await invoke("write_file", { path: HABITS_PATH, content: lines.join("\n") });
      setNewHabitName("");
      setShowAdd(false);
      refresh();
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  };

  const doneCount = habits.filter((h) => h.doneToday).length;
  const progressPercent = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <GlassPanel
      title="Habits"
      badge={`${doneCount}/${habits.length}`}
      className="h-full"
      noPadding
      action={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="editorial-btn editorial-btn-ghost px-1.5 py-0.5 text-[10.5px] font-mono gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Neu</span>
        </button>
      }
    >
      <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        {habits.length > 0 && (
          <div className="mb-3 p-2.5 rounded-[4px] bg-[#fafaf8] border border-hairline">
            <div className="flex items-center justify-between font-mono text-[10.5px] mb-1.5">
              <span className="text-[var(--text-muted)]">Heute erledigt</span>
              <span className="font-semibold text-[var(--accent-cobalt)]">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#e5e5df] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-cobalt)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {showAdd && (
          <form onSubmit={addHabit} className="mb-2 flex items-center gap-1.5">
            <input
              autoFocus
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Neuer Habit…"
              className="editorial-input flex-1 px-2.5 py-1 text-xs"
            />
            <button type="submit" className="editorial-btn editorial-btn-primary px-2.5 py-1 text-xs">
              Anlegen
            </button>
          </form>
        )}

        {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

        <ScrollArea className="flex-1 h-0">
          <div className="space-y-1">
            {habits.map((habit) => (
              <div
                key={habit.name}
                onClick={() => toggleHabit(habit)}
                role="button"
                tabIndex={0}
                aria-pressed={habit.doneToday}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleHabit(habit);
                  }
                }}
                className="group flex items-center justify-between p-2 rounded-[4px] hover:bg-[#f6f6f1] transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-[3px] flex items-center justify-center shrink-0 border transition-all",
                      habit.doneToday
                        ? "bg-[var(--accent-cobalt)] border-[var(--accent-cobalt)] text-white dark:text-zinc-950"
                        : "border-[var(--border-strong)] bg-white dark:bg-zinc-800/80 group-hover:border-[var(--text-secondary)]"
                    )}
                  >
                    {habit.doneToday && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span
                    className={cn(
                      "text-xs truncate transition-colors",
                      habit.doneToday
                        ? "line-through text-[var(--text-faint)]"
                        : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                    )}
                  >
                    {habit.name}
                  </span>
                </div>
                <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-black/[0.03] text-[var(--text-muted)] border border-hairline shrink-0">
                  {habit.streak}d
                </span>
              </div>
            ))}

            {!loading && habits.length === 0 && !error && (
              <div className="py-8 text-center">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Noch keine Habits</p>
                <p className="font-mono text-[10.5px] text-[var(--text-muted)]">
                  Mit „Neu“ legst du den ersten an
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </GlassPanel>
  );
}
