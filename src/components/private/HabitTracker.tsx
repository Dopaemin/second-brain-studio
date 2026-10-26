import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "../GlassPanel";

const HABITS_PATH =
  "/Users/I539120/Documents/personal-brain/03 Bereiche/Habits/Habits.md";

const getTodayStr = () => new Date().toISOString().slice(0, 10);

interface Habit {
  name: string;
  doneToday: boolean;
  lineIndex: number;
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);

  const refresh = useCallback(async () => {
    const TODAY_STR = getTodayStr();
    const content = await invoke<string>("read_file", {
      path: HABITS_PATH,
    }).catch(() => "");
    const lines = content.split("\n");
    const found: Habit[] = [];
    let inActiveSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase() === "## aktive habits") {
        inActiveSection = true;
        continue;
      }
      if (!inActiveSection) continue;
      // Stop at the next heading
      if (line.startsWith("##")) break;
      if (
        line.startsWith("- ") &&
        !line.startsWith("- [ ]") &&
        !line.startsWith("- [")
      ) {
        const name = line.slice(2).trim();
        if (!name) continue;
        const doneToday = lines
          .slice(i + 1, i + 10)
          .some((l) => l.includes(TODAY_STR) && l.includes("[x]"));
        found.push({ name, doneToday, lineIndex: i });
      }
    }
    setHabits(found);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleHabit = async (habit: Habit) => {
    const TODAY_STR = getTodayStr();
    const content = await invoke<string>("read_file", {
      path: HABITS_PATH,
    }).catch(() => "");
    const lines = content.split("\n");
    if (habit.doneToday) {
      const completionLine = `  - [x] ${TODAY_STR} – ${habit.name}`;
      const completionIndex = lines.findIndex(
        (l) => l.trim() === completionLine.trim()
      );
      if (completionIndex !== -1) {
        lines.splice(completionIndex, 1);
      }
      await invoke("write_file", {
        path: HABITS_PATH,
        content: lines.join("\n"),
      });
    } else {
      const currentLineIndex = lines.findIndex(
        (l) => l.trim() === `- ${habit.name}`
      );
      if (currentLineIndex === -1) {
        refresh();
        return;
      }
      lines.splice(currentLineIndex + 1, 0, `  - [x] ${TODAY_STR} – ${habit.name}`);
      await invoke("write_file", {
        path: HABITS_PATH,
        content: lines.join("\n"),
      });
    }
    refresh();
  };

  return (
    <GlassPanel title="Habit Tracker – Heute">
      <div className="flex flex-col gap-2">
        {habits.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Keine Habits
          </p>
        )}
        {habits.map((h, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={h.doneToday}
              onChange={() => toggleHabit(h)}
              className="no-drag"
              style={{
                accentColor: "var(--accent)",
                width: "16px",
                height: "16px",
              }}
            />
            <p
              className="text-sm"
              style={{
                color: "var(--text-primary)",
                textDecoration: h.doneToday ? "line-through" : "none",
                opacity: h.doneToday ? 0.5 : 1,
              }}
            >
              {h.name}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
