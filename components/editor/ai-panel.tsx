"use client";

import * as React from "react";
import { useAction } from "convex/react";
import {
  Sparkles,
  CheckSquare,
  Type,
  RefreshCw,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn, contentDrift, formatRelativeTime } from "@/lib/utils";

type NoteWithViewer = Doc<"notes"> & {
  viewerRole?: "owner" | "editor" | "viewer";
};

export function AIPanel({
  note,
  className,
}: {
  note: NoteWithViewer;
  className?: string;
}) {
  const generate = useAction(api.ai.generate);
  const [busy, setBusy] = React.useState<null | "all" | "summary" | "title">(
    null,
  );

  const drift = contentDrift(note.lastSummaryHash, note.contentText);
  const titleDrift = contentDrift(note.lastTitleHash, note.contentText);
  const summaryStale = !!note.aiSummary && drift > 0.35;
  const titleStale = !!note.aiSuggestedTitle && titleDrift > 0.3;
  const tooShort = note.contentText.trim().length < 20;

  const onGenerate = async (
    kinds: Array<"summary" | "title" | "actions" | "tags">,
    busyLabel: "all" | "summary" | "title",
  ) => {
    if (tooShort) {
      toast.error("Add more content to generate insights");
      return;
    }
    setBusy(busyLabel);
    try {
      const result = await generate({
        noteId: note._id,
        kinds,
        force: true,
        applyTitle: !note.titleIsUserSet,
      });
      if ("skipped" in result && result.skipped) {
        toast.info("No update needed — content hasn't changed enough");
      } else {
        toast.success("Insights updated");
      }
    } catch (e) {
      toast.error("AI generation failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto", className)}>
      <div className="border-b border-white/6 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-3.5 w-3.5 text-zinc-400"
            strokeWidth={1.5}
          />
          <span className="text-[14px] font-medium text-zinc-200">
            AI insights
          </span>
        </div>
        <Button
          size="md"
          variant="secondary"
          onClick={() => onGenerate(["summary", "title", "actions", "tags"], "all")}
          loading={busy === "all"}
          disabled={busy !== null || tooShort}
          className="text-[14px]"
        >
          <Wand2 className="h-4 w-4" />
          {note.aiSummary ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {tooShort ? (
        <div className="p-6 text-center">
          <AlertCircle
            className="mx-auto mb-3 h-5 w-5 text-zinc-600"
            strokeWidth={1.5}
          />
          <div className="text-[13px] text-zinc-400">Add more content</div>
          <div className="mt-1 text-[11px] text-zinc-600 leading-relaxed">
            AI features unlock once your note crosses ~20 characters.
          </div>
        </div>
      ) : !note.aiSummary && !note.aiSuggestedTitle ? (
        <EmptyAi
          onGenerate={() =>
            onGenerate(["summary", "title", "actions", "tags"], "all")
          }
          busy={busy === "all"}
        />
      ) : (
        <div className="flex-1 px-4 py-4 space-y-5">
          {note.aiSummary && (
            <Section
              icon={Sparkles}
              title="Summary"
              stale={summaryStale}
              onRefresh={() => onGenerate(["summary"], "summary")}
              busy={busy === "summary"}
            >
              <p className="text-[13px] text-zinc-300 leading-relaxed">
                {note.aiSummary}
              </p>
            </Section>
          )}
          {note.aiActionItems && note.aiActionItems.length > 0 && (
            <Section
              icon={CheckSquare}
              title="Action items"
              stale={summaryStale}
              onRefresh={() => onGenerate(["actions"], "summary")}
              busy={busy === "summary"}
            >
              <ul className="space-y-1.5">
                {note.aiActionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-zinc-300"
                  >
                    <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {note.aiSuggestedTitle && (
            <Section
              icon={Type}
              title="Suggested title"
              stale={titleStale}
              onRefresh={() => onGenerate(["title"], "title")}
              busy={busy === "title"}
              note={
                note.titleIsUserSet
                  ? "Your title overrides this suggestion."
                  : undefined
              }
            >
              <p className="text-[13px] text-zinc-100 font-medium leading-snug">
                {note.aiSuggestedTitle}
              </p>
            </Section>
          )}
          <div className="border-t border-white/4 pt-3 font-mono text-[12px] text-zinc-600 leading-relaxed">
            {note.aiUsageCount} AI call{note.aiUsageCount === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  stale,
  onRefresh,
  busy,
  note,
  children,
}: {
  icon: any;
  title: string;
  stale?: boolean;
  onRefresh?: () => void;
  busy?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-zinc-500" strokeWidth={1.5} />
          <span className="text-[12px] uppercase tracking-wider font-mono text-zinc-500">
            {title}
          </span>
          {stale && (
            <span
              className="inline-flex items-center rounded border border-amber-400/20 bg-amber-400/5 px-1 py-px font-mono text-[12px] uppercase tracking-wider text-amber-300/80"
              title="Content has changed since this was generated"
            >
              stale
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
            aria-label={`Refresh ${title}`}
          >
            <RefreshCw
              className={cn("h-4 w-4", busy && "animate-spin")}
              strokeWidth={1.5}
            />
          </button>
        )}
      </div>
      {children}
      {note && (
        <div className="mt-2 text-[11px] text-zinc-600 italic leading-snug">
          {note}
        </div>
      )}
    </div>
  );
}

function EmptyAi({
  onGenerate,
  busy,
}: {
  onGenerate: () => void;
  busy: boolean;
}) {
  return (
    <div className="p-6 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/3 mb-3 animate-float">
        <Sparkles className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
      </div>
      <div className="text-[13px] font-medium text-zinc-200 mb-1">
        No insights yet
      </div>
      <div className="mb-4 text-[11px] text-zinc-500 leading-relaxed">
        Generate a summary, action items, and a suggested title.
      </div>
      <Button size="sm" onClick={onGenerate} loading={busy}>
        <Wand2 className="h-3 w-3" />
        Generate insights
      </Button>
    </div>
  );
}
