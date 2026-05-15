export function Workflow() {
  const steps = [
    {
      step: "01",
      title: "Write",
      body: "Open a fresh note. Markdown with a preview toggle, autosave, tags, archive.",
      detail: "// type. tab. enter.",
    },
    {
      step: "02",
      title: "Distill",
      body: "When content drifts past a threshold, AI regenerates the title automatically. Summary and action items are one click away.",
      detail: "// gemini",
    },
    {
      step: "03",
      title: "Share",
      body: "Toggle a note public. Send the link. Reviewers request edit access — you approve from the notifications bell.",
      detail: "// /share/abc123",
    },
  ];
  return (
    <section className="relative border-t border-white/6">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-32">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <div className="font-mono text-[13px] text-zinc-500 tracking-wide uppercase mb-3">
            <span className="text-zinc-500">[02]</span> The Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white">
            Three steps.
            <br />
            <span className="text-zinc-500">No friction in between.</span>
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-11 h-px bg-linear-to-r from-transparent via-white/10 to-transparent hidden md:block" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black font-mono text-[11px] text-zinc-300">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-medium text-white tracking-tight">
                    {s.title}
                  </h3>
                </div>
                <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
