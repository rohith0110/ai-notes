"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, FileText } from "lucide-react";
import { Brandmark } from "@/components/landing/nav";
import { NotificationsBell } from "./notifications-bell";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-white/6 bg-black/85 backdrop-blur-md">
      <div className="flex h-13 items-center px-4 gap-3">
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
        <span className="text-zinc-700 text-sm" aria-hidden>
          /
        </span>
        <nav className="flex items-center gap-1 text-[14px]">
          {tabs.map((t) => {
            const active =
              pathname === t.href ||
              (t.href === "/notes" && pathname?.startsWith("/notes"));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md transition-colors",
                  active
                    ? "bg-white/6 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <t.icon className="h-4 w-4" strokeWidth={1.5} />
                {t.label}
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
