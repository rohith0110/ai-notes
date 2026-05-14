"use client";

import * as React from "react";
import { Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TagsInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const next = raw
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^\w-]/g, "")
      .slice(0, 24);
    if (!next) return;
    if (value.includes(next)) return;
    onChange([...value, next]);
    setDraft("");
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-7"
      onClick={() => ref.current?.focus()}
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/4 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300"
        >
          <Hash className="h-2.5 w-2.5 text-zinc-500" />
          {t}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== t));
              }}
              className="ml-0.5 text-zinc-500 hover:text-zinc-200"
              aria-label={`Remove ${t}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? "Add tags…" : ""}
          className={cn(
            "min-w-20 flex-1 bg-transparent text-[15px] text-zinc-200 placeholder:text-zinc-600 outline-none",
          )}
        />
      )}
    </div>
  );
}
