"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  FileText,
  Archive,
  Sparkles,
  Globe,
  Hash,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { Sparkline } from "@/components/dashboard/sparkline";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const data = useQuery(api.insights.dashboard);

  if (data === undefined || data === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="font-mono text-xs text-zinc-600">loading…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 sm:mb-10">
        <div className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
          Dashboard
        </div>
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
          Your week, at a glance.
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 sm:mb-10">
        <StatCard
          icon={FileText}
          label="Total notes"
          value={data.totalNotes}
          hint={`${data.totalWords.toLocaleString()} words written`}
        />
        <StatCard
          icon={Sparkles}
          label="AI calls"
          value={data.aiUsageTotal}
          hint={`${data.aiByKindWeek.summary + data.aiByKindWeek.title + data.aiByKindWeek.actions} this week`}
        />
        <StatCard
          icon={Globe}
          label="Public notes"
          value={data.publicNotes}
          hint={data.publicNotes === 0 ? "Share one to enable collab" : "Public via share link"}
        />
        <StatCard
          icon={Archive}
          label="Archived"
          value={data.archivedNotes}
          hint="Tucked away"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8 sm:mb-10">
        <div className="lg:col-span-2 rounded-lg border border-white/6 bg-white/1.5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-0.5">
                Weekly activity
              </div>
              <div className="text-lg font-medium text-white tracking-tight">
                Edits + AI calls
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-zinc-700" />
                edits
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-white/80" />
                ai
              </span>
            </div>
          </div>
          <Sparkline data={data.weeklyActivity} />
        </div>

        <div className="rounded-lg border border-white/6 bg-white/1.5 p-4 sm:p-5">
          <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-3">
            AI breakdown (7d)
          </div>
          <div className="space-y-3">
            <AiBar label="Summaries" count={data.aiByKindWeek.summary} total={data.aiUsageTotal || 1} />
            <AiBar label="Titles" count={data.aiByKindWeek.title} total={data.aiUsageTotal || 1} />
            <AiBar label="Actions" count={data.aiByKindWeek.actions} total={data.aiUsageTotal || 1} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-lg border border-white/6 bg-white/1.5 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-white/6 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
              Recent notes
            </div>
            <Link
              href="/notes"
              className="text-[11px] text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-0.5"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-[13px] text-zinc-400 mb-3">
                No notes yet
              </div>
              <Link href="/notes">
                <Button size="sm">
                  Create your first note
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/4">
              {data.recent.map((n) => (
                <li key={n._id}>
                  <Link
                    href={`/notes/${n._id}`}
                    className="block px-4 sm:px-5 py-3 hover:bg-white/2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-zinc-200 truncate">
                          {n.title || "Untitled"}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-zinc-500">
                          <span>{n.wordCount} words</span>
                          {n.tags.slice(0, 3).map((t) => (
                            <span key={t} className="font-mono">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-zinc-600 shrink-0">
                        {formatRelativeTime(n.updatedAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-white/6 bg-white/1.5 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-white/6">
            <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
              Most-used tags
            </div>
          </div>
          {data.topTags.length === 0 ? (
            <div className="px-5 py-8 text-center text-[12px] text-zinc-500">
              No tags yet. Add #tags to your notes to see them here.
            </div>
          ) : (
            <ul className="p-2 space-y-0.5">
              {data.topTags.map((t) => (
                <li key={t.tag}>
                  <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 hover:bg-white/3 transition-colors">
                    <span className="inline-flex items-center gap-1 font-mono text-[12px] text-zinc-300">
                      <Hash className="h-2.5 w-2.5 text-zinc-500" />
                      {t.tag}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                      {t.count}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AiBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = Math.min(100, Math.max(0, (count / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-500 tabular-nums">{count}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/4 overflow-hidden">
        <div
          className="h-full bg-white/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
