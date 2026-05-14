import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function formatAbsoluteDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Cheap, stable content fingerprint used to decide whether AI artifacts
 * (title/summary) are stale enough to warrant regeneration.
 */
export function contentHash(text: string): string {
  const normalized = (text || "").trim().toLowerCase().replace(/\s+/g, " ");
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + ":" + normalized.length;
}

/**
 * Returns ratio of content drift between two hashes produced by `contentHash`.
 * Same fingerprint → 0. Different fingerprints w/ similar length → low ratio.
 * Wildly different lengths → high ratio.
 */
export function contentDrift(prevHash: string | undefined, nextText: string): number {
  if (!prevHash) return 1;
  const [, prevLenStr] = prevHash.split(":");
  const prevLen = parseInt(prevLenStr ?? "0", 10);
  const nextLen = nextText.trim().length;
  if (prevLen === 0) return 1;
  if (contentHash(nextText) === prevHash) return 0;
  return Math.min(1, Math.abs(nextLen - prevLen) / Math.max(prevLen, nextLen, 1) + 0.15);
}

/**
 * Strips common markdown decoration so plain text can be indexed for search
 * and fed to AI without noise.
 */
export function markdownToPlain(md: string): string {
  return (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
