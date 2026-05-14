"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownPreview({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  if (!source.trim()) {
    return (
      <div className={cn("text-zinc-600 italic text-sm", className)}>
        Nothing to preview yet — start typing on the Write tab.
      </div>
    );
  }
  return (
    <div className={cn("prose-notes", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
