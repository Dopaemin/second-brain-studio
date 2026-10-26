import { useTodos, type TodoItem } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

export function TodoList() {
  const { todos, toggle } = useTodos("work");
  const open = todos.filter((t) => !t.checked).slice(0, 15);

  const handleToggle = async (todo: TodoItem) => {
    try {
      await toggle(todo);
    } catch (e) {
      console.error("Failed to toggle todo:", e);
    }
  };

  return (
    <GlassPanel title="ToDos" className="h-full">
      <ScrollArea className="flex-1 h-0">
        <div style={{ padding: "4px 0" }}>
          {open.length === 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                padding: "10px 14px",
              }}
            >
              Keine offenen Todos
            </p>
          )}
          {open.map((todo) => (
            <div
              key={`${todo.file_path}-${todo.line_index}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "6px 14px",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <input
                type="checkbox"
                checked={todo.checked}
                onChange={() => handleToggle(todo)}
                style={{
                  marginTop: "2px",
                  flexShrink: 0,
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                }}
              />
              <div style={{ overflow: "hidden" }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {todo.text}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "1px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {todo.file_path.split("/").pop()?.replace(".md", "")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
