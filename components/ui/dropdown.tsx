"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setUncontrolled(v);
    },
    [onOpenChange],
  );
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

export const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function DropdownTrigger({ className, children, ...props }, forwarded) {
  const ctx = React.useContext(DropdownContext)!;
  const { triggerRef } = ctx;
  const setRefs = React.useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [triggerRef, forwarded],
  );
  return (
    <button
      ref={setRefs}
      className={className}
      onClick={(e) => {
        ctx.setOpen(!ctx.open);
        props.onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});

export function DropdownContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext)!;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx.open) return;
    const onClick = (e: MouseEvent) => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !ctx.triggerRef.current?.contains(e.target as Node)
      ) {
        ctx.setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  if (!ctx.open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-40 mt-1.5 min-w-44 overflow-hidden rounded-md border border-white/10 bg-zinc-950 p-1 shadow-2xl",
        "animate-fade-up",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  className,
  children,
  onSelect,
  destructive,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> & {
  onSelect?: () => void;
  destructive?: boolean;
}) {
  const ctx = React.useContext(DropdownContext)!;
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
        destructive
          ? "text-red-300 hover:bg-red-500/10"
          : "text-zinc-300 hover:bg-white/5 hover:text-white",
        className,
      )}
      onClick={(e) => {
        onSelect?.();
        ctx.setOpen(false);
        props.onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-white/6" />;
}
