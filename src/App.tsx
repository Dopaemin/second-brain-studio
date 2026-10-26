import { useState } from "react";
import { WorkDashboard } from "./components/work/WorkDashboard";
import { PrivateDashboard } from "./components/private/PrivateDashboard";
import { BriefcaseIcon, UserIcon } from "lucide-react";

export default function App() {
  const [mode, setMode] = useState<"work" | "private">("work");

  return (
    <div
      data-mode={mode}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Top navigation bar */}
      <header
        style={{
          height: "52px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: "8px",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginRight: "auto",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
            }}
          >
            🧠
          </div>
          <span style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "-0.01em" }}>
            Second Brain
          </span>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {(["work", "private"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 12px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
                background: mode === m ? "var(--accent-muted)" : "transparent",
                color: mode === m ? "var(--accent)" : "var(--text-muted)",
                outline: mode === m ? "1px solid var(--accent-border)" : "none",
                transition: "all 200ms ease",
              }}
            >
              {m === "work" ? <BriefcaseIcon size={12} /> : <UserIcon size={12} />}
              {m === "work" ? "Work" : "Private"}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden" }}>
        {mode === "work" ? <WorkDashboard /> : <PrivateDashboard />}
      </main>
    </div>
  );
}
