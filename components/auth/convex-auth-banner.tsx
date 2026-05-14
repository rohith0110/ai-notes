"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Visible only when Clerk reports the user as signed in but Convex's auth
 * bridge hasn't validated their JWT. The most common cause is a missing
 * `convex` JWT template in the Clerk dashboard. We give the user a 2s
 * grace period before showing the banner so an in-flight token fetch
 * doesn't flash this on every page load.
 */
export function ConvexAuthBanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoaded || isLoading) {
      setShow(false);
      return;
    }
    if (isSignedIn && !isAuthenticated) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [isLoaded, isLoading, isSignedIn, isAuthenticated]);

  if (!show) return null;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/6">
      <div className="mx-auto max-w-6xl flex items-start gap-3 px-5 py-2.5 text-[12px]">
        <AlertTriangle
          className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0"
          strokeWidth={1.5}
        />
        <div className="flex-1 leading-snug text-zinc-300">
          <span className="font-medium text-amber-200">
            Convex isn't receiving your Clerk JWT.
          </span>{" "}
          Open Clerk dashboard →{" "}
          <span className="font-mono text-zinc-200">JWT Templates</span> → new
          template, pick{" "}
          <span className="font-mono text-zinc-200">Convex</span> from the
          preset list. Template name must be{" "}
          <span className="font-mono text-zinc-200">convex</span>.
        </div>
        <a
          href="https://dashboard.clerk.com/last-active?path=jwt-templates"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 transition-colors shrink-0"
        >
          Open dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
