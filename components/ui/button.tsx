import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 disabled:bg-zinc-700 disabled:text-zinc-400",
  secondary:
    "bg-zinc-900 text-white border border-white/10 hover:bg-zinc-800 hover:border-white/20 active:bg-zinc-700",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white",
  outline:
    "bg-transparent border border-white/15 text-white hover:bg-white/5 hover:border-white/30",
  danger:
    "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/15 hover:text-red-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-md",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 select-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
