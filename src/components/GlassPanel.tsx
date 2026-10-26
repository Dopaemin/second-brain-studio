import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function GlassPanel({ children, className, title, action }: PanelProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            padding: "10px 14px 9px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {title}
          </span>
          {action}
        </div>
      )}
      <div className="flex flex-col" style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
