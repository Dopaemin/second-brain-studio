import { useState } from "react";
import { ModeSwitch } from "./components/ModeSwitch";
import { WorkDashboard } from "./components/work/WorkDashboard";
import { PrivateDashboard } from "./components/private/PrivateDashboard";

export default function App() {
  const [mode, setMode] = useState<"work" | "private">("work");

  return (
    <div data-mode={mode} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div className="app-bg" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag region header */}
        <div
          className="drag-region"
          style={{
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ModeSwitch mode={mode} onToggle={() => setMode(m => m === "work" ? "private" : "work")} />
        </div>

        {/* Dashboard content */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 16px 16px" }}>
          {mode === "work" ? <WorkDashboard /> : <PrivateDashboard />}
        </div>
      </div>
    </div>
  );
}
