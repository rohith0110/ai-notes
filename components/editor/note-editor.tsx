"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import {
  Share2,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
  Sparkles,
  PanelRight,
  PanelRightClose,
  Eye,
  Pencil,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { AIPanel } from "./ai-panel";
import { ShareDialog } from "./share-dialog";
import { TagsInput } from "./tags-input";
import {
  MarkdownToolbar,
  EditorCtx,
  applyShortcut,
  autoIndent,
} from "./markdown-toolbar";
import { MarkdownPreview } from "./markdown-preview";
import {
  cn,
  contentDrift,
  contentHash,
  countWords,
  formatRelativeTime,
} from "@/lib/utils";
import { modKey } from "@/lib/platform";

type NoteWithViewer = Doc<"notes"> & {
  viewerRole: "owner" | "editor" | "viewer";
};

const SAVE_DEBOUNCE_MS = 700;
const TITLE_AUTOGEN_THRESHOLD = 0.3;

export function NoteEditor({ note }: { note: NoteWithViewer }) {
  const router = useRouter();
  const update = useMutation(api.notes.update);
  const archive = useMutation(api.notes.archive);
  const remove = useMutation(api.notes.remove);
  const generate = useAction(api.ai.generate);

  const [title, setTitle] = React.useState(note.title);
  const [content, setContent] = React.useState(note.content);
  const [tags, setTags] = React.useState<string[]>(note.tags);
  const [titleUserSet, setTitleUserSet] = React.useState(note.titleIsUserSet);
  const [view, setView] = React.useState<"write" | "preview">("write");
  const [aiOpen, setAiOpen] = React.useState(true);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number>(note.updatedAt);
  const [saving, setSaving] = React.useState(false);

  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const ctxRef = React.useRef<EditorCtx | null>(null);
  const initialNoteIdRef = React.useRef(note._id);

  // Tracks whether the user has explicitly typed in the title field since the
  // last save. Used to avoid overwriting AI-generated titles with the stale
  // local value when the autosave fires.
  const titleLocallyEdited = React.useRef(false);

  // Tracks whether the user has made ANY local edit (content, tags) since
  // the last save or server sync.  Used to distinguish "user typed something"
  // from "server pushed an update that differs from local state".
  const contentLocallyEdited = React.useRef(false);
  const tagsLocallyEdited = React.useRef(false);

  const readOnly = note.viewerRole === "viewer";
  const isOwner = note.viewerRole === "owner";

  // Sync local state when navigating between notes (different note loaded)
  React.useEffect(() => {
    if (note._id !== initialNoteIdRef.current) {
      initialNoteIdRef.current = note._id;
      titleLocallyEdited.current = false;
      contentLocallyEdited.current = false;
      tagsLocallyEdited.current = false;
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setTitleUserSet(note.titleIsUserSet);
      setSavedAt(note.updatedAt);
    }
  }, [note]);

  // Real-time sync: accept server updates for fields the user hasn't locally
  // edited. This provides true real-time collaboration — when another user
  // edits the note in a different browser, changes appear instantly without
  // triggering a save loop.
  //
  // The locally-edited flags are reset here (not in the save handler) to
  // prevent a race: user types → save fires → flag reset → server pushes
  // update before user's next keystroke → sync overwrites new input.
  // By resetting only when local === server, we wait for the full round-trip.
  React.useEffect(() => {
    if (note._id !== initialNoteIdRef.current) return;

    // Title: always accept server value if user hasn't locally edited,
    // or clear the edit flag if local now matches server (save round-tripped).
    if (!titleLocallyEdited.current) {
      setTitle(note.title);
      setTitleUserSet(note.titleIsUserSet);
    } else if (title === note.title) {
      titleLocallyEdited.current = false;
    }

    // Content
    if (!contentLocallyEdited.current) {
      setContent(note.content);
      setSavedAt(note.updatedAt);
    } else if (content === note.content) {
      contentLocallyEdited.current = false;
    }

    // Tags
    if (!tagsLocallyEdited.current) {
      setTags(note.tags);
    } else if (JSON.stringify(tags) === JSON.stringify(note.tags)) {
      tagsLocallyEdited.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.title, note.content, note.tags, note.titleIsUserSet, note.updatedAt]);

  // Keep ref to editor context for toolbar
  React.useEffect(() => {
    if (editorRef.current) {
      ctxRef.current = {
        textarea: editorRef.current,
        value: content,
        setValue: (v) => {
          setContent(v);
          contentLocallyEdited.current = true;
        },
      };
    }
  });

  // Debounced autosave
  // Only includes fields the user has actually locally edited.
  const dirty =
    (titleLocallyEdited.current && title !== note.title) ||
    (contentLocallyEdited.current && content !== note.content) ||
    (tagsLocallyEdited.current && JSON.stringify(tags) !== JSON.stringify(note.tags)) ||
    (titleLocallyEdited.current && titleUserSet !== note.titleIsUserSet);
  React.useEffect(() => {
    if (!dirty || readOnly) return;
    setSaving(true);
    const t = setTimeout(async () => {
      try {
        await update({
          id: note._id,
          title: titleLocallyEdited.current ? title : undefined,
          content: contentLocallyEdited.current ? content : undefined,
          tags: tagsLocallyEdited.current ? tags : undefined,
          titleIsUserSet: titleLocallyEdited.current ? titleUserSet : undefined,
        });
        setSavedAt(Date.now());
        // NOTE: We do NOT reset the locally-edited flags here. They are
        // reset in the real-time sync effect only when the server's value
        // matches the local value — meaning the save has round-tripped and
        // the user hasn't typed anything new since. This prevents a race
        // where the user types between the save call and the Convex
        // subscription update, causing the sync to overwrite new keystrokes.
      } catch (e) {
        toast.error("Could not save");
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      setSaving(false);
    };
  }, [title, content, tags, titleUserSet, dirty, readOnly, note._id, update]);

  // Auto-regenerate title on note exit when content has drifted
  React.useEffect(() => {
    return () => {
      if (readOnly) return;
      const plain = note.contentText;
      if (titleUserSet) return;
      if (plain.length < 40) return;
      const drift = contentDrift(note.lastTitleHash, plain);
      if (drift < TITLE_AUTOGEN_THRESHOLD) return;
      generate({
        noteId: note._id,
        kinds: ["title", "tags"],
        applyTitle: true,
      }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note._id]);

  // Cmd+/ (Mac) / Ctrl+/ (Win) toggle preview
  // Cmd+. (Mac) / Ctrl+. (Win) toggle AI panel
  // Use capture:true so we intercept before the browser handles e.g. Ctrl+/
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setView((v) => (v === "write" ? "preview" : "write"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setAiOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  const onArchive = async () => {
    try {
      await archive({ id: note._id, archived: !note.isArchived });
      toast.success(note.isArchived ? "Restored" : "Archived");
      if (!note.isArchived) router.push("/notes");
    } catch {
      toast.error("Could not update");
    }
  };

  const onDelete = async () => {
    try {
      await remove({ id: note._id });
      toast.success("Note deleted");
      router.push("/notes");
    } catch {
      toast.error("Could not delete");
    }
  };

  const words = React.useMemo(() => countWords(content), [content]);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex flex-1 min-w-0 flex-col">
        {/* Top action bar */}
        <div className="border-b border-white/6 px-5 py-2 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-zinc-500 font-mono">
            {saving ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Saved {formatRelativeTime(savedAt)}
              </span>
            )}
            {note.isPublic && (
              <span className="hidden sm:inline-flex items-center gap-1 ml-2 rounded border border-emerald-400/20 bg-emerald-400/5 px-1.5 py-0.5 text-[11px] text-emerald-300 uppercase tracking-wider">
                <Globe className="h-3 w-3" />
                Public
              </span>
            )}
            {!isOwner && (
              <span className="hidden sm:inline-flex items-center gap-1 ml-2 rounded border border-sky-400/20 bg-sky-400/5 px-1.5 py-0.5 text-[11px] text-sky-300 uppercase tracking-wider">
                <Users className="h-3 w-3" />
                {note.viewerRole === "editor" ? "Collaborator" : "View only"}
              </span>
            )}
            {readOnly && (
              <span className="hidden sm:inline-flex items-center gap-1 ml-2 rounded border border-amber-400/20 bg-amber-400/5 px-1.5 py-0.5 text-[11px] text-amber-300 uppercase tracking-wider">
                Read-only
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex items-center rounded-md border border-white/6 p-0.5 mr-2">
              <ViewToggle
                active={view === "write"}
                onClick={() => setView("write")}
                icon={Pencil}
                title={`Write (${modKey("/")})`}
                shortcut={view === "preview" ? modKey("/") : undefined}
              >
                Write
              </ViewToggle>
              <ViewToggle
                active={view === "preview"}
                onClick={() => setView("preview")}
                icon={Eye}
                title={`Preview (${modKey("/")})`}
                shortcut={view === "write" ? modKey("/") : undefined}
              >
                Preview
              </ViewToggle>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShareOpen(true)}
                className="text-[14px]"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            )}
            <button
              onClick={() => setAiOpen((v) => !v)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                aiOpen
                  ? "bg-white/6 text-white"
                  : "text-zinc-400 hover:bg-white/4 hover:text-white",
              )}
              aria-label="Toggle AI panel"
              title={`Toggle AI panel (${modKey(".")})`}
            >
              {aiOpen ? (
                <PanelRightClose className="h-4.5 w-4.5" strokeWidth={1.5} />
              ) : (
                <PanelRight className="h-4.5 w-4.5" strokeWidth={1.5} />
              )}
            </button>
            {isOwner && (
              <Dropdown>
                <DropdownTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/4 hover:text-white">
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem onSelect={onArchive}>
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
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    destructive
                    onSelect={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete note
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <input
              value={title}
              readOnly={readOnly}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleUserSet(true);
                titleLocallyEdited.current = true;
              }}
              placeholder="Untitled"
              className="w-full bg-transparent text-3xl sm:text-4xl font-medium tracking-tight text-white placeholder:text-zinc-700 outline-none mb-3"
              spellCheck={false}
            />
            <div className="mb-5">
              <TagsInput
                value={tags}
                onChange={(newTags) => {
                  setTags(newTags);
                  tagsLocallyEdited.current = true;
                }}
                disabled={readOnly}
              />
            </div>

            {view === "write" && !readOnly && (
              <div className="mb-3 flex items-center justify-between border-b border-white/4 pb-2">
                <MarkdownToolbar ctxRef={ctxRef} />
                <div className="font-mono text-[13px] text-zinc-600">
                  {words} word{words === 1 ? "" : "s"} · markdown
                </div>
              </div>
            )}

            {view === "write" ? (
              <textarea
                ref={editorRef}
                readOnly={readOnly}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  contentLocallyEdited.current = true;
                }}
                onKeyDown={(e) => {
                  if (!ctxRef.current) return;
                  ctxRef.current.value = content;
                  if (applyShortcut(e, ctxRef.current)) return;
                  if (autoIndent(e, ctxRef.current)) return;
                }}
                placeholder={
                  readOnly
                    ? "This note is read-only."
                    : "Start writing in markdown…\n\n# A heading\n- A list item\n**Bold** _italic_ `code`"
                }
                spellCheck={true}
                className="w-full min-h-[60vh] bg-transparent text-[15px] leading-7 text-zinc-200 placeholder:text-zinc-700 outline-none resize-none font-sans"
              />
            ) : (
              <div className="min-h-[60vh]">
                <MarkdownPreview source={content} />
              </div>
            )}
          </div>
        </div>
      </section>

      {aiOpen && (
        <aside className="hidden md:flex w-80 shrink-0 flex-col border-l border-white/6 bg-zinc-950/30">
          <AIPanel note={note} />
        </aside>
      )}

      {isOwner && (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} note={note} />
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>
              "{note.title}" will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  title,
  shortcut,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  title?: string;
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[13px] transition-colors",
        active
          ? "bg-white/8 text-white"
          : "text-zinc-400 hover:text-zinc-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {children}
      {shortcut && (
        <kbd className="ml-1.5 inline-flex h-5 items-center rounded bg-white/5 border border-white/10 px-1.5 font-mono text-[11px] text-zinc-400">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
