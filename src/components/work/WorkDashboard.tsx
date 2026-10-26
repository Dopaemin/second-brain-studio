import { QuickAccess } from "./QuickAccess";
import { QuickNote } from "./QuickNote";
import { RecentFiles } from "./RecentFiles";
import { SprintNotes } from "./SprintNotes";
import { TodoList } from "./TodoList";

export function WorkDashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 320px",
          gridTemplateRows: "1fr 1fr",
          gap: "1px",
          flex: 1,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ gridRow: "1 / 3", background: "var(--bg)", overflow: "hidden" }}>
          <QuickAccess />
        </div>
        <div style={{ background: "var(--bg)", overflow: "hidden" }}>
          <RecentFiles />
        </div>
        <div style={{ gridRow: "1 / 3", background: "var(--bg)", overflow: "hidden" }}>
          <TodoList />
        </div>
        <div style={{ background: "var(--bg)", overflow: "hidden" }}>
          <SprintNotes />
        </div>
      </div>
      {/* Quick note bar at bottom */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <QuickNote />
      </div>
    </div>
  );
}
