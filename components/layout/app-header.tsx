"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, FileText, Menu } from "lucide-react";
import { Brandmark } from "@/components/landing/nav";
import { NotificationsBell } from "./notifications-bell";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
];

export function AppHeader({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-white/6 bg-black/85 backdrop-blur-md">
      <div className="flex h-13 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open note list"
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
        <Link
          href="/"
          className="flex items-center gap-2 group shrink-0"
          aria-label="Inkwell home"
        >
          <Brandmark className="h-4.5 w-4.5 text-white transition-transform group-hover:rotate-12" />
          <span className="font-medium text-[15px] tracking-tight text-white">
            Inkwell
          </span>
        </Link>
        <span className="hidden text-zinc-700 text-sm sm:inline" aria-hidden>
          /
        </span>
        <nav className="flex items-center gap-0.5 text-[14px] sm:gap-1">
          {tabs.map((t) => {
            const active =
              pathname === t.href ||
              (t.href === "/notes" && pathname?.startsWith("/notes"));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors sm:px-2.5",
                  active
                    ? "bg-white/6 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <t.icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NotificationsBell />
          <div className="ml-1 flex items-center">
            <UserButton
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  userButtonAvatarBox: "h-7 w-7 rounded-full",
                  userButtonTrigger:
                    "focus:shadow-none focus:ring-0 rounded-full",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
