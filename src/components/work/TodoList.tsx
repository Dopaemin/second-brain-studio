import { useState } from "react";
import { Plus, Check, FileText } from "lucide-react";
import { useTodos, type TodoItem } from "@/hooks/useVaultFiles";
import { GlassPanel } from "../GlassPanel";
import { ScrollArea } from "../ui/scroll-area";
import { cn, noteLabel } from "@/lib/utils";

interface TodoListProps {
  onSelectFile?: (path: string) => void;
}

export function TodoList({ onSelectFile }: TodoListProps) {
  const { todos, toggle, addTodo, error } = useTodos("work");
  const [filter, setFilter] = useState<"open" | "completed" | "all">("open");
  const [newTodoText, setNewTodoText] = useState("");

  const openTodos = todos.filter((t) => !t.checked);
  const completedTodos = todos.filter((t) => t.checked);

  const displayedTodos =
    filter === "open"
      ? openTodos
      : filter === "completed"
      ? completedTodos
      : todos;

  const handleToggle = async (todo: TodoItem) => {
    await toggle(todo);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    addTodo(newTodoText.trim());
    setNewTodoText("");
  };

  return (
    <GlassPanel
      title="Aufgaben"
      badge={`${openTodos.length}`}
      className="h-full"
      noPadding
      action={
        <div className="inline-flex items-center p-0.5 rounded-[4px] bg-[#eeeee9] border border-hairline">
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={cn(
              "px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition-all cursor-pointer",
              filter === "open"
                ? "bg-white text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Offen
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={cn(
              "px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition-all cursor-pointer",
              filter === "completed"
                ? "bg-white text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Erledigt
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition-all cursor-pointer",
              filter === "all"
                ? "bg-white text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Alle
          </button>
        </div>
      }
    >
      {/* Precision Add Input */}
      <form
        onSubmit={handleAdd}
        className="p-2.5 border-b border-hairline bg-[#fafaf8] flex items-center gap-2"
      >
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Aufgabe hinzufügen…"
          className="editorial-input flex-1 px-2.5 py-1 text-xs placeholder:text-[var(--text-faint)]"
        />
        <button
          type="submit"
          disabled={!newTodoText.trim()}
          className="editorial-btn editorial-btn-primary p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Hinzufügen"
        >
          <Plus className="w-3 h-3" />
        </button>
      </form>

      <ScrollArea className="flex-1 h-0">
        <div className="p-2.5 space-y-1">
          {displayedTodos.slice(0, 150).map((todo) => {
            const fileName = noteLabel(todo.file_path);

            return (
              <div
                key={`${todo.file_path}-${todo.line_index}`}
                onClick={() => handleToggle(todo)}
                className="group flex items-start gap-2.5 p-2 rounded-[4px] hover:bg-[#f6f6f1] transition-colors cursor-pointer select-none"
              >
                {/* Quiet Checkbox */}
                <button
                  type="button"
                  className={cn(
                    "w-3.5 h-3.5 rounded-[3px] mt-0.5 flex items-center justify-center shrink-0 border transition-all",
                    todo.checked
                      ? "bg-[var(--accent-cobalt)] border-[var(--accent-cobalt)] text-white dark:text-zinc-950"
                      : "border-[var(--border-strong)] bg-white dark:bg-zinc-800/80 group-hover:border-[var(--text-secondary)]"
                  )}
                >
                  {todo.checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs leading-relaxed transition-colors",
                      todo.checked
                        ? "line-through text-[var(--text-faint)]"
                        : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-normal"
                    )}
                  >
                    {todo.text}
                  </p>
                  {fileName && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectFile) onSelectFile(todo.file_path);
                      }}
                      className="inline-flex items-center gap-1 mt-0.5 font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-black/[0.03] text-[var(--text-muted)] hover:text-[var(--accent-cobalt)] hover:bg-[var(--accent-cobalt-subtle)] border border-hairline transition-colors"
                      title="Notiz öffnen"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>{fileName}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {displayedTodos.length === 0 && (
            <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
              {error ?? (filter === "open" ? "Keine offenen Aufgaben" : "Keine Aufgaben in diesem Filter")}
            </div>
          )}
        </div>
      </ScrollArea>
    </GlassPanel>
  );
}
