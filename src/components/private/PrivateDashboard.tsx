import { CalendarWidget } from "./CalendarWidget";
import { FinanceWidget } from "./FinanceWidget";
import { GoalsWidget } from "./GoalsWidget";
import { HabitTracker } from "./HabitTracker";
import { PrivateTodos } from "./PrivateTodos";

export function PrivateDashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "12px",
        height: "100%",
      }}
    >
      <div style={{ gridColumn: "1", gridRow: "1 / 3" }}>
        <CalendarWidget />
      </div>
      <div style={{ gridColumn: "2", gridRow: "1" }}>
        <GoalsWidget />
      </div>
      <div style={{ gridColumn: "3", gridRow: "1" }}>
        <FinanceWidget />
      </div>
      <div style={{ gridColumn: "2", gridRow: "2" }}>
        <PrivateTodos />
      </div>
      <div style={{ gridColumn: "3", gridRow: "2" }}>
        <HabitTracker />
      </div>
    </div>
  );
}
