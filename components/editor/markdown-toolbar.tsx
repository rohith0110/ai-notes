"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  CheckSquare,
} from "lucide-react";
import { modKey } from "@/lib/platform";

type Action = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  shortcut?: string;
  fn: (ctx: EditorCtx) => void;
};

export type EditorCtx = {
  textarea: HTMLTextAreaElement;
  value: string;
  setValue: (v: string) => void;
};

function wrap(ctx: EditorCtx, before: string, after = before) {
  const { textarea, value, setValue } = ctx;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    if (selected) {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    } else {
      textarea.selectionStart = textarea.selectionEnd =
        start + before.length;
    }
  });
}

function linePrefix(ctx: EditorCtx, prefix: string) {
  const { textarea, value, setValue } = ctx;
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const next =
    value.slice(0, lineStart) + prefix + value.slice(lineStart);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
  });
}

const actions: Action[] = [
  { icon: Bold, label: "Bold", shortcut: modKey("B"), fn: (c) => wrap(c, "**") },
  { icon: Italic, label: "Italic", shortcut: modKey("I"), fn: (c) => wrap(c, "_") },
  {
    icon: Heading1,
    label: "Heading 1",
    fn: (c) => linePrefix(c, "# "),
  },
  {
    icon: Heading2,
    label: "Heading 2",
    fn: (c) => linePrefix(c, "## "),
  },
  { icon: List, label: "Bullet list", fn: (c) => linePrefix(c, "- ") },
  {
    icon: ListOrdered,
    label: "Numbered list",
    fn: (c) => linePrefix(c, "1. "),
  },
  { icon: CheckSquare, label: "Task", fn: (c) => linePrefix(c, "- [ ] ") },
  { icon: Quote, label: "Quote", fn: (c) => linePrefix(c, "> ") },
  { icon: Code, label: "Inline code", fn: (c) => wrap(c, "`") },
  {
    icon: LinkIcon,
    label: "Link",
    shortcut: modKey("K"),
    fn: (c) => wrap(c, "[", "](url)"),
  },
];

export function MarkdownToolbar({ ctxRef }: { ctxRef: React.RefObject<EditorCtx | null> }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => ctxRef.current && a.fn(ctxRef.current)}
          title={a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:bg-white/6 hover:text-white transition-colors sm:h-7 sm:w-7"
        >
          <a.icon className="h-4.5 w-4.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

export function applyShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  ctx: EditorCtx,
) {
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.key === "b") {
    e.preventDefault();
    wrap(ctx, "**");
    return true;
  }
  if (e.key === "i") {
    e.preventDefault();
    wrap(ctx, "_");
    return true;
  }
  if (e.key === "k") {
    e.preventDefault();
    wrap(ctx, "[", "](url)");
    return true;
  }
  return false;
}

export function autoIndent(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  ctx: EditorCtx,
) {
  if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey) return false;
  const { textarea, value, setValue } = ctx;
  const pos = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  const line = value.slice(lineStart, pos);
  const bullet = line.match(/^(\s*)([-*]|\d+\.|\- \[[ x]\])\s/);
  if (!bullet) return false;
  const [, indent, marker] = bullet;
  if (line.trim() === marker.trim()) {
    e.preventDefault();
    const next = value.slice(0, lineStart) + value.slice(pos);
    setValue(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = lineStart;
    });
    return true;
  }
  e.preventDefault();
  const insertion =
    "\n" +
    (indent ?? "") +
    (marker === "- [ ]" || marker === "- [x]" ? "- [ ]" : marker) +
    " ";
  const next = value.slice(0, pos) + insertion + value.slice(pos);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd =
      pos + insertion.length;
  });
  return true;
}
