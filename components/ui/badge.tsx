import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[14px] font-medium text-zinc-300 tracking-wide",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Kbd({
  children,
  className,
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded border border-white/10 bg-zinc-900 px-1 font-mono text-[13px] text-zinc-400",
        className,
      )}
    >
      {children}
    </span>
  );
}
