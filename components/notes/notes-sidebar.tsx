"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import {
  Plus,
  Search,
  X,
  Archive,
  FileText,
  Hash,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { rankItems } from "@/lib/fuzzy";
import {
  isTouchOS,
  matchesNewNoteShortcut,
  newNoteShortcutLabel,
  searchShortcutLabel,
} from "@/lib/platform";
import { useOS } from "@/lib/use-platform";

type View = "active" | "archived";

export function NotesSidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const os = useOS();
  const showShortcuts = !isTouchOS(os);
  const newNoteLabel = newNoteShortcutLabel(os);
  const searchLabel = searchShortcutLabel(os);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>("active");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const notes = useQuery(api.search.searchNotes, {
    query: debouncedQuery,
    archived: view === "archived",
    limit: 50,
  });
  const tags = useQuery(api.notes.allTags);
  const createNote = useMutation(api.notes.create);

  const filtered = React.useMemo(() => {
    if (!notes) return undefined;
    let list: Doc<"notes">[] = notes;
    if (activeTag) list = list.filter((n) => n.tags.includes(activeTag));
    const ranked = rankItems(
      list.map((n) => ({
        id: n._id,
        title: n.title,
        contentText: n.contentText,
        tags: n.tags,
        updatedAt: n.updatedAt,
        _full: n,
      })),
      debouncedQuery,
    );
    return ranked.map((r) => (r)._full as Doc<"notes">);
  }, [notes, activeTag, debouncedQuery]);

  const onNew = React.useCallback(async () => {
    try {
      const id = await createNote({});
      router.push(`/notes/${id}`);
      onClose?.();
      toast.success("New note created");
    } catch {
      toast.error("Could not create note");
    }
  }, [createNote, router, onClose]);

  // Keyboard shortcuts.
  //
  // "New note" is Ctrl+Alt+N (Win/Linux) / ⌘⌥N (macOS). The browser reserves
  // Ctrl/Cmd+N (new window) at the OS level and won't let the page cancel it,
  // so we use this low-conflict combo instead. Because it's modifier-guarded
  // it can fire even while the caret is inside another note's editor — no
  // typing-target check needed. Search stays on Ctrl/Cmd+K.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("sidebar-search")?.focus();
        return;
      }
      if (matchesNewNoteShortcut(e, os)) {
        e.preventDefault();
        onNew();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [onNew, os]);

  const activeId = params?.id as Id<"notes"> | undefined;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "flex w-72 max-w-[85vw] flex-col border-r border-white/6",
          // Mobile: fixed slide-in drawer. Desktop: static column in flow.
          "fixed inset-y-0 left-0 z-50 bg-zinc-950 transition-transform duration-300 ease-out",
          "md:static md:z-auto md:h-full md:max-w-none md:translate-x-0 md:bg-zinc-950/30 md:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="border-b border-white/6 p-3 space-y-2">
        <div className="flex items-center justify-between md:hidden">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Notes
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close note list"
            className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button
          onClick={onNew}
          className="w-full justify-center"
          size="md"
          title={showShortcuts ? `New note — ${newNoteLabel}` : "New note"}
        >
          <Plus className="h-3.5 w-3.5" />
          New note
          {showShortcuts && (
            <kbd className="ml-auto hidden h-5 items-center rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[11px] tracking-wide text-zinc-400 md:inline-flex">
              {newNoteLabel}
            </kbd>
          )}
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            id="sidebar-search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "h-8 pl-8 text-[13px]",
              showShortcuts ? "pr-7 md:pr-16" : "pr-7",
            )}
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            showShortcuts && (
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[11px] text-zinc-400 md:inline-flex">
                {searchLabel}
              </kbd>
            )
          )}
        </div>
      </div>

      <div className="border-b border-white/6 px-3 py-2 flex items-center gap-1">
        <ViewTab
          active={view === "active" && pathname === "/notes"}
          onClick={() => {
            setView("active");
          }}
          icon={Inbox}
        >
          All notes
        </ViewTab>
        <ViewTab
          active={view === "archived"}
          onClick={() => setView("archived")}
          icon={Archive}
        >
          Archived
        </ViewTab>
      </div>

      {tags && tags.length > 0 && (
        <div className="border-b border-white/6 px-3 py-2.5 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono px-1">
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 12).map((t) => (
              <button
                key={t.tag}
                onClick={() =>
                  setActiveTag(activeTag === t.tag ? null : t.tag)
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors",
                  activeTag === t.tag
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                )}
              >
                <Hash className="h-2.5 w-2.5" />
                {t.tag}
                <span className="text-zinc-600">{t.count}</span>
              </button>
            ))}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-2.5 w-2.5" />
                clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered === undefined ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-white/3 animate-shimmer"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={debouncedQuery} view={view} onNew={onNew} />
        ) : (
          <ul className="p-2 space-y-0.5">
            {filtered.map((n) => (
              <li key={n._id}>
                <NoteItem
                  note={n}
                  active={activeId === n._id}
                  onNavigate={onClose}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/6 px-3 py-2 font-mono text-[10px] text-zinc-600">
        <span>
          {filtered?.length ?? 0} {view === "archived" ? "archived" : "active"}
        </span>
        {showShortcuts && (
          <span className="hidden md:inline">
            <span className="mr-1">{newNoteLabel}</span>new ·{" "}
            <span className="mx-1">{searchLabel}</span>search
          </span>
        )}
      </div>
      </aside>
    </>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[14px] transition-colors",
        active
          ? "bg-white/6 text-white"
          : "text-zinc-500 hover:text-zinc-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {children}
    </button>
  );
}

function NoteItem({
  note,
  active,
  onNavigate,
}: {
  note: Doc<"notes">;
  active: boolean;
  onNavigate?: () => void;
}) {
  const preview = note.contentText.slice(0, 70);
  return (
    <Link
      href={`/notes/${note._id}`}
      onClick={onNavigate}
      className={cn(
        "block rounded-md px-2.5 py-2 transition-colors group",
        active
          ? "bg-white/6 text-white"
          : "text-zinc-300 hover:bg-white/3",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "block h-1.5 w-1.5 rounded-full shrink-0",
            note.isPublic ? "bg-emerald-400" : "bg-zinc-700",
          )}
        />
        <span className="flex-1 truncate text-[13px] font-medium">
          {note.title || "Untitled"}
        </span>
        <span className="font-mono text-[10px] text-zinc-600 shrink-0">
          {formatRelativeTime(note.updatedAt)}
        </span>
      </div>
      {preview && (
        <div className="ml-3.5 mt-0.5 truncate text-[11.5px] text-zinc-500 leading-snug">
          {preview}
        </div>
      )}
      {note.tags.length > 0 && (
        <div className="ml-3.5 mt-1 flex items-center gap-1 overflow-hidden">
          {note.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="truncate font-mono text-[10px] text-zinc-500"
            >
              #{t}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="font-mono text-[10px] text-zinc-600">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function EmptyState({
  query,
  view,
  onNew,
}: {
  query: string;
  view: View;
  onNew: () => void;
}) {
  if (query) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <Search className="mb-3 h-5 w-5 text-zinc-600" strokeWidth={1.5} />
        <div className="text-[13px] text-zinc-400">No matches</div>
        <div className="mt-1 text-[11px] text-zinc-600 font-mono">&quot;{query}&quot;</div>
      </div>
    );
  }
  if (view === "archived") {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <Archive className="mb-3 h-5 w-5 text-zinc-600" strokeWidth={1.5} />
        <div className="text-[13px] text-zinc-400">Nothing archived</div>
        <div className="mt-1 text-[11px] text-zinc-600">
          Archived notes will appear here.
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <FileText className="mb-3 h-5 w-5 text-zinc-600" strokeWidth={1.5} />
      <div className="text-[13px] text-zinc-300">No notes yet</div>
      <div className="mb-3 mt-1 text-[11px] text-zinc-500">
        Capture your first thought.
      </div>
      <Button size="sm" onClick={onNew}>
        <Plus className="h-3 w-3" />
        Create a note
      </Button>
    </div>
  );
}
