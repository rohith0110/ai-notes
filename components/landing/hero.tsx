"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { SignInButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/badge";
import { isMac } from "@/lib/platform";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-60 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-24 sm:px-6 sm:pt-32 sm:pb-40">
        <div className="flex items-center gap-2 animate-fade-up [animation-delay:0ms]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[13px] font-medium text-zinc-400 tracking-wide">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live · v0.1
          </span>
        </div>

        <h1
          className="mt-7 max-w-3xl text-4xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.035em] leading-[1.02] sm:leading-[0.98] text-white animate-fade-up [animation-delay:80ms]"
        >
          A workspace for{" "}
          <span className="relative inline-block">
            <span className="relative z-10">thinking</span>
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/60" />
          </span>
          ,
          <br />
          accelerated by AI.
        </h1>

        <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-zinc-400 animate-fade-up [animation-delay:160ms]">
          Capture ideas in markdown. Generate summaries, action items, and
          titles on demand. Share a note with one link, collaborate the moment
          someone asks.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-up [animation-delay:240ms]">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/notes">
              <Button size="lg" className="group min-w-45">
                Start writing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/notes">
              <Button size="lg" className="group min-w-45">
                Open workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </Show>
          <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
            <span className="text-zinc-700">-</span>
            <span className="flex items-center gap-1">
              <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
              <span className="ml-1">command palette</span>
            </span>
          </div>
        </div>

        <div className="relative mt-12 sm:mt-20 animate-fade-up [animation-delay:360ms]">
          <FloatingPreview />
        </div>
      </div>
    </section>
  );
}

function FloatingPreview() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 bg-gradient-radial from-white/4 to-transparent pointer-events-none" />
      <div className="relative rounded-xl border border-white/10 bg-zinc-950 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/6 px-4 py-2.5 bg-zinc-950">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          </div>
          <div className="ml-3 flex-1 truncate font-mono text-[11px] text-zinc-500">
            app/notes/q3-planning
          </div>
          <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
        </div>
        <div className="grid grid-cols-12 min-h-70">
          <div className="col-span-3 border-r border-white/6 p-3 hidden sm:block">
            <div className="space-y-1.5">
              {["Q3 planning", "Research notes", "Daily journal", "Reading list"].map(
                (t, i) => (
                  <div
                    key={t}
                    className={`px-2 py-1.5 rounded text-[12px] truncate ${i === 0
                      ? "bg-white/6 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    {t}
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="col-span-12 sm:col-span-9 p-4 sm:p-5">
            <div className="text-xs text-zinc-600 font-mono mb-3">
              # markdown · 432 words · 2m ago
            </div>
            <div className="text-lg font-medium text-white mb-3 tracking-tight">
              Q3 planning: Inkwell roadmap
            </div>
            <div className="space-y-2 text-[13px] text-zinc-400 leading-relaxed">
              <div>
                Ship the editor with real-time autosave and a markdown preview
                toggle. Use Convex queries for live updates across all open
                tabs.
              </div>
              <div className="border-l-2 border-white/15 pl-3 italic text-zinc-500">
                Action item: design the share dialog with permission roles.
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              {["planning", "roadmap", "q3"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/10 bg-white/3 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
