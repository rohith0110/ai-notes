"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import { ConvexAuthBanner } from "@/components/auth/convex-auth-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isTouchOS, type OS } from "@/lib/platform";
import { useOS } from "@/lib/use-platform";

export function NotesLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const os = useOS();

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
          onOpenShortcuts={isTouchOS(os) ? undefined : () => setShortcutsOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-hidden bg-black">
          {children}
        </main>
      </div>
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        os={os}
      />
    </div>
  );
}

function KeyboardShortcutsModal({
  open,
  onClose,
  os,
}: {
  open: boolean;
  onClose: () => void;
  os: OS;
}) {
  const m = os === "mac" ? "⌘" : "Ctrl+";
  const groups: { title: string; rows: { label: string; key: string }[] }[] = [
    {
      title: "Notes",
      rows: [
        { label: "New note", key: `${m}\\` },
        { label: "Search notes", key: `${m}K` },
      ],
    },
    {
      title: "Editor",
      rows: [
        { label: "Toggle write / preview", key: `${m}/` },
        { label: "Undo", key: `${m}Z` },
        { label: "Redo", key: os === "mac" ? "⌘⇧Z" : "Ctrl+Y" },
        { label: "Bold", key: `${m}B` },
        { label: "Italic", key: `${m}I` },
      ],
    },
    {
      title: "Panels",
      rows: [{ label: "Toggle AI panel", key: `${m}.` }],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="px-2 pb-3 pt-1 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {g.title}
              </p>
              <div className="space-y-0.5">
                {g.rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <span className="text-[13px] text-zinc-300">{r.label}</span>
                    <kbd className="ml-4 shrink-0 inline-flex items-center rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-zinc-400 leading-5">
                      {r.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
