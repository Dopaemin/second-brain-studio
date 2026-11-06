import { startResizeDragging, type ResizeDirection } from "@/lib/window";

/**
 * Native Window Resize Borders for Desktop macOS / Tauri.
 * Provides accessible, high-precision hitzones for dragging borders and corners
 * to resize the window effortlessly, even with custom overlay titlebars.
 */
export function WindowResizeBorders() {
  // Only render on desktop / Tauri
  if (typeof window === "undefined") return null;

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    // Only primary mouse button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startResizeDragging(direction);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] select-none">
      {/* --- EDGES --- */}

      {/* Top Edge (avoiding macOS traffic lights at the top-left: left: 78px) */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "North")}
        className="pointer-events-auto absolute top-0 left-[78px] right-4 h-2 cursor-ns-resize z-10"
      />

      {/* Bottom Edge */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "South")}
        className="pointer-events-auto absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-10"
      />

      {/* Left Edge (starts below traffic light area: top-7) */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "West")}
        className="pointer-events-auto absolute left-0 top-7 bottom-4 w-2 cursor-ew-resize z-10"
      />

      {/* Right Edge */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "East")}
        className="pointer-events-auto absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize z-10"
      />

      {/* --- CORNERS --- */}

      {/* Top-Right Corner */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "NorthEast")}
        className="pointer-events-auto absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-20"
      />

      {/* Bottom-Right Corner */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "SouthEast")}
        className="pointer-events-auto absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
      />

      {/* Bottom-Left Corner */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "SouthWest")}
        className="pointer-events-auto absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-20"
      />

      {/* Top-Left Corner (Safe top corner above traffic lights) */}
      <div
        role="presentation"
        data-window-resize-handle="true"
        data-no-drag="true"
        data-tauri-drag-region="false"
        onMouseDown={(e) => handleResizeStart(e, "NorthWest")}
        className="pointer-events-auto absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-20"
      />
    </div>
  );
}
