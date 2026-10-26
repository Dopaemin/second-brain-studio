import { QuickAccess } from "./QuickAccess";
import { QuickNote } from "./QuickNote";
import { RecentFiles } from "./RecentFiles";
import { SprintNotes } from "./SprintNotes";
import { TodoList } from "./TodoList";

export function WorkDashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "12px",
        height: "100%",
      }}
    >
      {/* Left column: QuickAccess spans 2 rows */}
      <div style={{ gridRow: "1 / 3" }}>
        <QuickAccess />
      </div>
      <RecentFiles />
      <TodoList />
      <SprintNotes />
      <QuickNote />
    </div>
  );
}
