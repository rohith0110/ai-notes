"use client";

import Link from "next/link";
import {
  SignInButton,
  UserButton,
  Show
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Brandmark />
          <span className="text-[15px] font-medium tracking-tight text-white">
            Inkwell
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 text-[14px]">
          <a
            href="#features"
            className="px-3 py-1.5 text-zinc-400 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#workflow"
            className="px-3 py-1.5 text-zinc-400 transition-colors hover:text-white"
          >
            Workflow
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-zinc-400 transition-colors hover:text-white"
          >
            Source
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/notes">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/notes">
              <Button size="sm" variant="secondary">
                Open app
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-7 w-7 rounded-full",
                  userButtonTrigger:
                    "focus:shadow-none focus:ring-0 rounded-full",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}

export function Brandmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5 text-white"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20L20 4" />
      <path d="M4 20h6" />
      <path d="M14 4h6v6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
