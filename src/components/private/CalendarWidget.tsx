import { Clock } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";

function parse(str: string): Date | null {
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatEvent(startStr: string, endStr: string) {
  const s = parse(startStr);
  const e = parse(endStr);
  if (!s) return { day: startStr, time: "", isToday: false };
  const time = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return {
    day: s.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }),
    time: e ? `${time(s)} – ${time(e)}` : time(s),
    isToday: new Date().toDateString() === s.toDateString(),
  };
}

export function CalendarWidget() {
  const { events, loading, error } = useCalendar();

  return (
    <GlassPanel title="Termine" badge={events.length ? `${events.length}` : undefined} className="h-full" noPadding>
      <ScrollArea className="flex-1 h-0">
        <div className="p-3 space-y-2">
          {events.map((ev, idx) => {
            const { day, time, isToday } = formatEvent(ev.start, ev.end);
            return (
              <div
                key={`${ev.title}-${idx}`}
                className={cn(
                  "p-2.5 rounded-[4px] border",
                  isToday
                    ? "border-[var(--accent-cobalt-border)] bg-[var(--accent-cobalt-subtle)]"
                    : "border-hairline bg-[#fafaf8]"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={cn(
                      "font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold",
                      isToday ? "bg-[var(--accent-cobalt)] text-white" : "bg-black/[0.04] text-[var(--text-muted)]"
                    )}
                  >
                    {isToday ? "Heute" : day}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {time}
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{ev.title}</p>
                <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">{ev.calendar}</p>
              </div>
            );
          })}

          {!loading && events.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-[var(--text-secondary)] mb-1">
                {error ? "Kalender nicht verfügbar" : "Keine Termine in den nächsten 7 Tagen"}
              </p>
              {error && (
                <p className="font-mono text-[10px] text-[var(--text-muted)] px-2 leading-relaxed">
                  Der Kalender-Zugriff läuft nur in der Desktop-App (npm run tauri dev).
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
