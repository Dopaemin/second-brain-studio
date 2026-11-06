import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  contentClassName?: string;
  noPadding?: boolean;
}

export function GlassPanel({
  children,
  className,
  title,
  icon,
  badge,
  action,
  contentClassName,
  noPadding = false,
}: GlassPanelProps) {
  return (
    <section
      className={cn(
        "editorial-panel flex flex-col overflow-hidden bg-[var(--bg-surface)]",
        className
      )}
    >
      {title && (
        <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-hairline bg-[var(--bg-subtle)] shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span className="text-[var(--text-muted)] shrink-0 flex items-center">
                {icon}
              </span>
            )}
            <h3 className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--text-muted)] truncate">
              {title}
            </h3>
            {badge && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] border border-hairline">
                {badge}
              </span>
            )}
          </div>
          {action && <div className="flex items-center gap-1.5 ml-2 shrink-0">{action}</div>}
        </header>
      )}

      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden min-h-0",
          !noPadding && "p-3.5",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
