import { useCalendar } from "@/hooks/useCalendar";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

function formatEventTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function CalendarWidget() {
  const { events, error, loading } = useCalendar();

  return (
    <GlassPanel title="Kalender – Nächste 7 Tage" className="h-full">
      <ScrollArea className="flex-1 h-0">
        {loading && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Lädt...
          </p>
        )}
        {error && (
          <p className="text-xs" style={{ color: "#f87171" }}>
            Kalender nicht verfügbar
          </p>
        )}
        <div className="flex flex-col gap-2">
          {events.map((e, i) => (
            <div key={i} className="flex flex-col gap-0.5 px-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {e.title}
              </p>
              <p className="text-xs" style={{ color: "var(--accent)" }}>
                {formatEventTime(e.start)}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {e.calendar}
              </p>
            </div>
          ))}
          {!loading && events.length === 0 && !error && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Keine Events
            </p>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
