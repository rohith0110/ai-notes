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

export type OS = "mac" | "windows" | "linux" | "ios" | "android" | "other";

/**
 * Best-effort OS detection. SSR-safe (returns "other" on the server). iPadOS
 * reports as "MacIntel" with touch points, so we treat touch-capable Macs as
 * iOS for shortcut-visibility purposes.
 */
export function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touch = navigator.maxTouchPoints || 0;
  if (/iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && touch > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  if (/Mac/.test(platform) || /Mac/.test(ua)) return "mac";
  if (/Win/.test(platform) || /Windows/.test(ua)) return "windows";
  if (/Linux/.test(platform) || /Linux|X11/.test(ua)) return "linux";
  return "other";
}

/** Touch-first platforms where physical-keyboard shortcut hints are noise. */
export function isTouchOS(os: OS): boolean {
  return os === "ios" || os === "android";
}

/**
 * "New note" shortcut — Ctrl+\ (Win/Linux) / ⌘\ (macOS).
 * Low-conflict; browser lets the page intercept it even while the caret is
 * inside the editor textarea.
 */
export function newNoteShortcutLabel(os: OS): string {
  return os === "mac" ? "⌘\\" : "Ctrl+\\";
}

/**
 * Matches Ctrl+\ (Win/Linux) or ⌘\ (Mac). Uses `event.code` ("Backslash")
 * so it is keyboard-layout independent.
 */
export function matchesNewNoteShortcut(
  e: Pick<KeyboardEvent, "code" | "altKey" | "shiftKey" | "ctrlKey" | "metaKey">,
  os: OS,
): boolean {
  if (e.code !== "Backslash") return false;
  if (e.altKey || e.shiftKey) return false;
  return os === "mac" ? e.metaKey : e.ctrlKey;
}

/** Search shortcut label — Ctrl+K / ⌘K. */
export function searchShortcutLabel(os: OS): string {
  return os === "mac" ? "⌘K" : "Ctrl+K";
}
