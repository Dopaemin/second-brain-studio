import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  calendar: string;
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<CalendarEvent[]>("get_calendar_events")
      .then(setEvents)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { events, error, loading };
}
