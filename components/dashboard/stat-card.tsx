import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  className,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/6 bg-white/1.5 p-5",
        "transition-colors hover:bg-white/2.5",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
          {label}
        </div>
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
        )}
      </div>
      <div className="text-3xl font-medium tracking-tight text-white tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-zinc-500 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}
