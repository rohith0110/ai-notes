import {
  Sparkles,
  Search,
  Share2,
  GitBranch,
  Activity,
  Keyboard,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI that earns its keep",
    body: "Summaries, action items, and titles generated on demand — debounced and drift-aware, never wasted.",
    meta: "Gemini",
  },
  {
    icon: Search,
    title: "Search that forgives typos",
    body: "Full-text search with relevance ranking. Title matches beat tag matches beat body matches.",
    meta: "0ms feel",
  },
  {
    icon: Share2,
    title: "Share with one link",
    body: "Public, read-only links. Visitors can request edit access — owners approve in a notification.",
    meta: "private by default",
  },
  {
    icon: GitBranch,
    title: "Real-time collaboration",
    body: "Convex reactivity means every edit propagates instantly. No refresh, no merge conflicts to think about.",
    meta: "convex",
  },
  {
    icon: Activity,
    title: "Productivity that compounds",
    body: "Dashboard tracks total notes, most-used tags, AI usage, and a weekly activity sparkline.",
    meta: "insights",
  },
  {
    icon: Keyboard,
    title: "Built for the keyboard",
    body: "New note, preview toggle, and instant search — all on low-conflict shortcuts that adapt to macOS and Windows.",
    meta: "shortcuts",
  },
];

export function Features() {
  return (
    <section className="relative border-t border-white/6 bg-black">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-32">
        <div className="max-w-2xl">
          <div className="font-mono text-[14px] text-zinc-500 tracking-wide uppercase mb-3">
            <span className="text-zinc-500">[01]</span> Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white">
            Everything a notes app should be.
            <br />
            <span className="text-zinc-500">Nothing it shouldn&apos;t.</span>
          </h2>
        </div>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/6 border border-white/6 rounded-lg overflow-hidden">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-black p-5 sm:p-6 transition-colors hover:bg-zinc-950"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/3 text-zinc-300 transition-all group-hover:border-white/20 group-hover:text-white">
                  <f.icon className="h-4.5 w-4.5" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[12px] text-zinc-600 tracking-wider uppercase">
                  {f.meta}
                </span>
              </div>
              <h3 className="text-[16px] font-medium text-white tracking-tight mb-2">
                {f.title}
              </h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
