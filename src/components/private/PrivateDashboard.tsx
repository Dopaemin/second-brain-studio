import { CalendarWidget } from "./CalendarWidget";
import { FinanceWidget } from "./FinanceWidget";
import { HabitTracker } from "./HabitTracker";
import { PrivateNotes } from "./PrivateNotes";
import { PrivateTodos } from "./PrivateTodos";
import { MarkdownViewer } from "../MarkdownViewer";
import { useState } from "react";

interface PrivateDashboardProps {
  selectedFile?: string | null;
  onSelectFile?: (path: string | null) => void;
}

export function PrivateDashboard({ selectedFile, onSelectFile }: PrivateDashboardProps) {
  const [internalFile, setInternalFile] = useState<string | null>(null);

  const activePath = selectedFile !== undefined ? selectedFile : internalFile;
  const setActivePath = onSelectFile || setInternalFile;

  if (activePath) {
    return (
      <div className="p-3.5 h-full overflow-hidden">
        <MarkdownViewer filePath={activePath} onClose={() => setActivePath(null)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3.5 p-3.5 h-full overflow-hidden select-none">
      <div className="col-span-4 h-full overflow-hidden">
        <PrivateNotes onSelectFile={setActivePath} />
      </div>

      <div className="col-span-4 h-full flex flex-col gap-3.5 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <HabitTracker />
        </div>
        <div className="h-[52%] min-h-0 overflow-hidden">
          <PrivateTodos onSelectFile={setActivePath} />
        </div>
      </div>

      <div className="col-span-4 h-full flex flex-col gap-3.5 overflow-hidden">
        <div className="h-[34%] min-h-0 overflow-hidden">
          <CalendarWidget />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <FinanceWidget />
        </div>
      </div>
    </div>
  );
}
