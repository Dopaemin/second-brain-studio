import { useState } from "react";
import { QuickAccess } from "./QuickAccess";
import { QuickNote } from "./QuickNote";
import { TodoList } from "./TodoList";
import { SprintNotes } from "./SprintNotes";
import { WorkCockpitOverview } from "./WorkCockpitOverview";
import { MarkdownViewer } from "../MarkdownViewer";

interface WorkDashboardProps {
  selectedFile?: string | null;
  onSelectFile?: (path: string | null) => void;
}

export function WorkDashboard({ selectedFile, onSelectFile }: WorkDashboardProps) {
  const [internalFile, setInternalFile] = useState<string | null>(null);

  const activePath = selectedFile !== undefined ? selectedFile : internalFile;
  const setActivePath = onSelectFile || setInternalFile;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Main Grid Section */}
      <div className="flex-1 grid grid-cols-12 gap-3.5 p-3.5 min-h-0 overflow-hidden">
        {/* Left Column: PARA Navigator (3 cols) */}
        <div className="col-span-3 h-full overflow-hidden">
          <QuickAccess
            selectedFilePath={activePath}
            onSelectFile={setActivePath}
          />
        </div>

        {/* Center Column: Either Markdown Viewer or Cockpit Overview (6 cols) */}
        <div className="col-span-6 h-full overflow-hidden">
          {activePath ? (
            <MarkdownViewer
              filePath={activePath}
              onClose={() => setActivePath(null)}
            />
          ) : (
            <WorkCockpitOverview onSelectFile={setActivePath} />
          )}
        </div>

        {/* Right Column: Interactive Todo List & Sprint Sessions (3 cols) */}
        <div className="col-span-3 h-full flex flex-col gap-3.5 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <TodoList onSelectFile={setActivePath} />
          </div>
          <div className="h-[38%] min-h-0 overflow-hidden">
            <SprintNotes onSelectFile={setActivePath} />
          </div>
        </div>
      </div>

      {/* Docked Quick Note Bar at Bottom */}
      <div className="shrink-0 bg-white border-t border-hairline">
        <QuickNote />
      </div>
    </div>
  );
}
