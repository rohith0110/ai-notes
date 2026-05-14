"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SignInButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative border-t border-white/6">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black pointer-events-none" />

          <div className="relative px-8 py-20 sm:px-16 sm:py-24 text-center">
            <div className="font-mono text-[11px] text-zinc-500 tracking-wide uppercase mb-5">
              ready when you are
            </div>
            <h2 className="text-4xl sm:text-5xl font-medium tracking-[-0.02em] text-white">
              Start a note.
              <br />
              <span className="text-zinc-400">Let the rest catch up.</span>
            </h2>
            <p className="mt-6 max-w-md mx-auto text-zinc-400 text-[15px]">
              No setup. Sign in, start writing.
            </p>
            <div className="mt-10 flex justify-center">
              <Show when="signed-out">
                <SignInButton mode="modal" forceRedirectUrl="/notes">
                  <Button size="lg" className="group min-w-50">
                    Start writing now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Link href="/notes">
                  <Button size="lg" className="group min-w-50">
                    Open workspace
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
