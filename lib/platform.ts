/**
 * Platform detection for cross-platform keyboard shortcut display.
 * Returns true when running on macOS / iOS (i.e. the ⌘ key is the modifier).
 * Falls back to false (Ctrl) on Windows, Linux, and during SSR.
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * Returns the modifier key symbol appropriate for the current platform.
 *  - Mac  → "⌘"
 *  - Win/Linux → "Ctrl+"
 */
export function modSymbol(): string {
  return isMac() ? "⌘" : "Ctrl+";
}

/**
 * Returns a human-readable shortcut string, e.g. "⌘N" on Mac or "Ctrl+N" on Windows.
 */
export function modKey(key: string): string {
  return `${modSymbol()}${key}`;
}
