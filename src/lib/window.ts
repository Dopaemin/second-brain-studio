import { isTauri } from "./backend";

export type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

// Lazy-loaded Tauri Window instance
let cachedWindow: any = null;

async function getWindow() {
  if (!isTauri()) return null;
  if (cachedWindow) return cachedWindow;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    cachedWindow = getCurrentWindow();
    return cachedWindow;
  } catch (err) {
    console.warn("Tauri window API not available:", err);
    return null;
  }
}

/**
 * Initiates native window dragging (moving the window on mouse drag).
 */
export async function startDragging() {
  const win = await getWindow();
  if (win) {
    try {
      await win.startDragging();
    } catch (e) {
      console.warn("startDragging failed:", e);
    }
  }
}

/**
 * Initiates native window resize dragging from a specified border or corner.
 */
export async function startResizeDragging(direction: ResizeDirection) {
  const win = await getWindow();
  if (win) {
    try {
      await win.startResizeDragging(direction);
    } catch (e) {
      console.warn("startResizeDragging failed:", e);
    }
  }
}

/**
 * Toggles window maximization (macOS double-click titlebar behavior).
 */
export async function toggleMaximize() {
  const win = await getWindow();
  if (win) {
    try {
      await win.toggleMaximize();
    } catch (e) {
      console.warn("toggleMaximize failed:", e);
    }
  }
}
