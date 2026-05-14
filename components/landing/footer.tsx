import { Brandmark } from "./nav";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/6">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brandmark className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-500">
            Inkwell · An AI-Powered Note Taking App
          </span>
        </div>
      </div>
    </footer>
  );
}
