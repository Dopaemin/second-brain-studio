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
      <div style={{ gridRow: "1 / 3" }}>
        <CalendarWidget />
      </div>
      <GoalsWidget />
      <PrivateTodos />
      <FinanceWidget />
      <HabitTracker />
    </div>
  );
}
