import { useTodos } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";

export function PrivateTodos() {
  const { todos, toggle } = useTodos("private");
  const open = todos.filter((t) => !t.checked).slice(0, 15);

  return (
    <GlassPanel title="ToDos" className="h-full">
      <ScrollArea className="flex-1 h-0">
        <div className="flex flex-col gap-1">
          {open.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Keine offenen Todos
            </p>
          )}
          {open.map((todo) => (
            <div
              key={`${todo.file_path}-${todo.line_index}`}
              className="flex items-start gap-2 px-1 py-0.5"
            >
              <input
                type="checkbox"
                checked={todo.checked}
                onChange={() => toggle(todo)}
                className="mt-0.5 shrink-0"
                style={{ accentColor: "var(--accent)" }}
              />
              <div>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {todo.text}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
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
