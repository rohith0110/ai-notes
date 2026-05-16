"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Plus,
  Search,
  X,
  Archive,
  ArchiveRestore,
  FileText,
  Hash,
  Inbox,
  Keyboard,
  MoreHorizontal,
  Trash2,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import { rankItems } from "@/lib/fuzzy";
import { matchesNewNoteShortcut } from "@/lib/platform";
import { useOS } from "@/lib/use-platform";

type View = "active" | "archived";

export function NotesSidebar({
  mobileOpen = false,
  onClose,
  onOpenShortcuts,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  onOpenShortcuts?: () => void;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const os = useOS();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>("active");
  const [selectedIds, setSelectedIds] = React.useState<Set<Id<"notes">>>(
    new Set(),
  );
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);

  const archiveMutation = useMutation(api.notes.archive);
  const removeMutation = useMutation(api.notes.remove);
  const generateAction = useAction(api.ai.generate);

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

  const isSelecting = selectedIds.size > 0;

  const toggleSelect = React.useCallback((id: Id<"notes">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Escape clears selection.
  React.useEffect(() => {
    if (!isSelecting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSelecting, clearSelection]);

  const onBulkArchive = async () => {
    const ids = [...selectedIds];
    const shouldArchive = view !== "archived";
    clearSelection();
    try {
      await Promise.all(ids.map((id) => archiveMutation({ id, archived: shouldArchive })));
      toast.success(
        `${ids.length} note${ids.length !== 1 ? "s" : ""} ${shouldArchive ? "archived" : "restored"}`,
      );
    } catch {
      toast.error("Could not update notes");
    }
  };

  const onBulkGenerate = () => {
    const ids = [...selectedIds];
    clearSelection();
    toast.promise(
      Promise.all(
        ids.map((id) =>
          generateAction({
            noteId: id,
            kinds: ["title", "tags", "summary", "actions"],
            force: true,
            applyTitle: true,
          }),
        ),
      ),
      {
        loading: `Generating AI for ${ids.length} note${ids.length !== 1 ? "s" : ""}…`,
        success: `AI generated for ${ids.length} note${ids.length !== 1 ? "s" : ""}`,
        error: "Some notes could not be processed",
      },
    );
  };

  const onBulkDelete = async () => {
    const ids = [...selectedIds];
    clearSelection();
    setConfirmBulkDelete(false);
    try {
      await Promise.all(ids.map((id) => removeMutation({ id })));
      toast.success(
        `${ids.length} note${ids.length !== 1 ? "s" : ""} deleted`,
      );
    } catch {
      toast.error("Could not delete notes");
    }
  };

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

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        document.getElementById("sidebar-search")?.focus();
        return;
      }
      if (matchesNewNoteShortcut(e, os)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onNew();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [onNew, os]);

  const activeId = params?.id as Id<"notes"> | undefined;

  // How many notes are selected relative to current filtered list (for select-all).
  const filteredIds = React.useMemo(
    () => new Set(filtered?.map((n) => n._id) ?? []),
    [filtered],
  );
  const allVisibleSelected =
    filtered && filtered.length > 0 && filtered.every((n) => selectedIds.has(n._id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible.
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible.
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "flex w-72 max-w-[85vw] flex-col border-r border-white/6",
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
            title="New note"
          >
            <Plus className="h-3.5 w-3.5" />
            New note
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              id="sidebar-search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-[13px]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-white/6 px-3 py-2 flex items-center gap-1">
          <ViewTab
            active={view === "active" && pathname === "/notes"}
            onClick={() => { setView("active"); clearSelection(); }}
            icon={Inbox}
          >
            All notes
          </ViewTab>
          <ViewTab
            active={view === "archived"}
            onClick={() => { setView("archived"); clearSelection(); }}
            icon={Archive}
          >
            Archived
          </ViewTab>
        </div>

        {/* Bulk action bar — visible whenever at least one note is selected */}
        {isSelecting ? (
          <div className="border-b border-white/6 bg-white/3 px-3 py-2 flex items-center gap-1">
            {/* Select-all toggle */}
            <button
              type="button"
              onClick={toggleSelectAll}
              aria-label={allVisibleSelected ? "Deselect all" : "Select all"}
              className={cn(
                "mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all",
                allVisibleSelected
                  ? "border-indigo-400/70 bg-indigo-500/20"
                  : "border-white/25",
              )}
            >
              {allVisibleSelected && <Check className="h-2.5 w-2.5 text-indigo-300" />}
            </button>
            <span className="flex-1 text-[12px] font-medium text-zinc-300">
              {selectedIds.size} selected
            </span>
            <button
              onClick={onBulkArchive}
              title={view === "archived" ? "Restore selected" : "Archive selected"}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/6 hover:text-white"
            >
              {view === "archived" ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onBulkGenerate}
              title="Generate AI for selected"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/6 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              title="Delete selected"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            <button
              onClick={clearSelection}
              title="Clear selection (Esc)"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/6 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          tags && tags.length > 0 && (
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
          )
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
                    selected={selectedIds.has(n._id)}
                    isSelecting={isSelecting}
                    onToggle={toggleSelect}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/6 shadow-[0_-8px_16px_rgba(0,0,0,0.35)]">
          <div className="px-4 py-3">
            <span className="text-sm font-medium text-zinc-400">
              {filtered?.length ?? 0}{" "}
              {view === "archived" ? "archived" : "active"}{" "}
              {(filtered?.length ?? 0) === 1 ? "note" : "notes"}
            </span>
          </div>
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex w-full items-center gap-2.5 border-t border-white/6 px-4 py-3 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4 shrink-0" />
              <span className="text-[13px]">Keyboard shortcuts</span>
            </button>
          )}
        </div>
      </aside>

      {/* Bulk delete confirmation — portaled to body to escape sidebar CSS transform */}
      {confirmBulkDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Delete {selectedIds.size} note{selectedIds.size !== 1 ? "s" : ""}?
                </DialogTitle>
                <DialogDescription>
                  This will permanently remove {selectedIds.size} note
                  {selectedIds.size !== 1 ? "s" : ""}. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmBulkDelete(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={onBulkDelete}>
                  <Trash2 className="h-3 w-3" />
                  Delete {selectedIds.size} note{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>,
          document.body,
        )}
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
        active ? "bg-white/6 text-white" : "text-zinc-500 hover:text-zinc-200",
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
  selected,
  isSelecting,
  onToggle,
  onNavigate,
}: {
  note: Doc<"notes">;
  active: boolean;
  selected: boolean;
  isSelecting: boolean;
  onToggle: (id: Id<"notes">) => void;
  onNavigate?: () => void;
}) {
  const preview = note.contentText.slice(0, 70);

  return (
    <div className="relative group/item">
      {/* Checkbox / dot — always present, toggling selection */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle(note._id);
        }}
        aria-label={selected ? "Deselect note" : "Select note"}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-5 w-5 shrink-0 items-center justify-center"
      >
        {/* Dot: fades out on hover or when selecting */}
        <span
          className={cn(
            "absolute h-1.5 w-1.5 rounded-full transition-opacity duration-100",
            note.isPublic ? "bg-emerald-400" : "bg-zinc-700",
            selected || isSelecting
              ? "opacity-0"
              : "group-hover/item:opacity-0",
          )}
        />
        {/* Checkbox ring: fades in on hover or when selecting */}
        <span
          className={cn(
            "absolute inset-0 rounded border transition-all duration-100",
            selected
              ? "border-indigo-400/70 bg-indigo-500/20 opacity-100"
              : isSelecting
                ? "border-white/25 opacity-100"
                : "border-white/25 opacity-0 group-hover/item:opacity-100",
          )}
        />
        {selected && (
          <Check className="relative h-2.5 w-2.5 text-indigo-300" />
        )}
      </button>

      <Link
        href={`/notes/${note._id}`}
        onClick={(e) => {
          if (isSelecting) {
            e.preventDefault();
            onToggle(note._id);
            return;
          }
          onNavigate?.();
        }}
        className={cn(
          "block rounded-md py-2 pl-8 pr-8 transition-colors",
          active && !isSelecting
            ? "bg-white/6 text-white"
            : selected
              ? "bg-white/4 text-zinc-200"
              : "text-zinc-300 hover:bg-white/3",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-[13px] font-medium">
            {note.title || "Untitled"}
          </span>
          <span className="font-mono text-[10px] text-zinc-600 shrink-0">
            {formatRelativeTime(note.updatedAt)}
          </span>
        </div>
        {preview && (
          <div className="mt-0.5 truncate text-[11.5px] text-zinc-500 leading-snug">
            {preview}
          </div>
        )}
        {note.tags.length > 0 && (
          <div className="mt-1 flex items-center gap-1 overflow-hidden">
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

      {/* Three-dot menu hidden during multi-select */}
      {!isSelecting && <NoteContextMenu note={note} />}
    </div>
  );
}

function NoteContextMenu({ note }: { note: Doc<"notes"> }) {
  const archive = useMutation(api.notes.archive);
  const remove = useMutation(api.notes.remove);
  const generate = useAction(api.ai.generate);

  const [open, setOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, right: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onArchive = async () => {
    setOpen(false);
    try {
      await archive({ id: note._id, archived: !note.isArchived });
      toast.success(note.isArchived ? "Restored" : "Archived");
    } catch {
      toast.error("Could not update");
    }
  };

  const onRegenerate = () => {
    setOpen(false);
    toast.promise(
      generate({
        noteId: note._id,
        kinds: ["title", "tags", "summary", "actions"],
        force: true,
        applyTitle: true,
      }),
      {
        loading: "Generating AI content…",
        success: "AI content updated",
        error: "Could not generate",
      },
    );
  };

  const onDelete = async () => {
    setConfirmDelete(false);
    try {
      await remove({ id: note._id });
      toast.success("Note deleted");
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        aria-label="Note actions"
        className="absolute right-1 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded text-zinc-600 opacity-0 transition-all group-hover/item:opacity-100 hover:bg-white/6 hover:text-zinc-300"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
            }}
            className="min-w-[11rem] overflow-hidden rounded-md border border-white/10 bg-zinc-950 p-1 shadow-2xl animate-fade-up"
          >
            <button
              onClick={onArchive}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {note.isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archive
                </>
              )}
            </button>
            <button
              onClick={onRegenerate}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              Generate AI
            </button>
            <div className="my-1 h-px bg-white/6" />
            <button
              onClick={() => {
                setOpen(false);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>,
          document.body,
        )}

      {confirmDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this note?</DialogTitle>
                <DialogDescription>
                  &quot;{note.title || "Untitled"}&quot; will be permanently
                  removed. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
                  Delete permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>,
          document.body,
        )}
    </>
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
        <div className="mt-1 text-[11px] text-zinc-600 font-mono">
          &quot;{query}&quot;
        </div>
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
