"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import { ConvexAuthBanner } from "@/components/auth/convex-auth-banner";

export function NotesLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // The drawer closes via the sidebar's own navigation handlers (opening or
  // creating a note calls onClose), so no route-change effect is needed.

  // Lock body scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <AppHeader onMenu={() => setSidebarOpen(true)} />
      <ConvexAuthBanner />
      <div className="relative flex min-h-0 flex-1">
        <NotesSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 overflow-hidden bg-black">
          {children}
        </main>
      </div>
    </div>
  );
}
