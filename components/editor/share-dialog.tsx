"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import {
  Copy,
  Check,
  ExternalLink,
  Lock,
  Globe,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ShareDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Doc<"notes">;
}) {
  const setPublic = useMutation(api.share.setPublic);
  const removeCollab = useMutation(api.share.removeCollaborator);
  const collaborators = useQuery(api.share.collaboratorsForNote, {
    noteId: note._id,
  });
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const shareUrl =
    note.shareId && note.isPublic
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${note.shareId}`
      : "";

  const onTogglePublic = async () => {
    setBusy(true);
    try {
      await setPublic({ id: note._id, isPublic: !note.isPublic });
      toast.success(!note.isPublic ? "Note is now public" : "Note is private");
    } catch (e) {
      toast.error("Could not change visibility");
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share "{note.title}"</DialogTitle>
          <DialogDescription>
            Anyone with the public link can view this note. Approve edit
            access from notifications.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-white/6 bg-white/2 p-3">
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${note.isPublic
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/3 text-zinc-400"
                }`}
            >
              {note.isPublic ? (
                <Globe className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Lock className="h-4 w-4" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-zinc-200">
                {note.isPublic ? "Public link" : "Private"}
              </div>
              <div className="text-[12px] text-zinc-500 mt-0.5">
                {note.isPublic
                  ? "Anyone with the link can view"
                  : "Only you can see this note"}
              </div>
            </div>
            <Button
              variant={note.isPublic ? "ghost" : "primary"}
              size="lg"
              onClick={onTogglePublic}
              loading={busy}
            >
              {note.isPublic ? "Disable" : "Enable"}
            </Button>
          </div>

          {shareUrl && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-1.5">
                Public link
              </div>
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-[12px] text-zinc-200 outline-none font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={onCopy}
                  className="inline-flex h-7 items-center gap-1 rounded px-2 text-[12px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 text-[14px] uppercase tracking-wider font-mono text-zinc-500 mb-2">
              <Users className="h-4 w-4" strokeWidth={1.5} />
              Collaborators
            </div>
            {!collaborators || collaborators.length === 0 ? (
              <div className="text-[13px] text-zinc-500 leading-relaxed">
                No collaborators yet. Visitors can request access from the
                public share page; you'll see those requests in your
                notifications bell.
              </div>
            ) : (
              <div className="space-y-1">
                {collaborators.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center gap-3 rounded-md border border-white/6 bg-white/1.5 px-3 py-2"
                  >
                    {c.user?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.user.imageUrl}
                        alt={c.user.name || "User"}
                        className="h-7 w-7 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300">
                        {(c.user?.name || c.user?.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-zinc-200 truncate">
                        {c.user?.name || c.user?.email || "Unknown"}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {c.role === "editor" ? "Can edit" : "Can view"}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        removeCollab({ collaboratorId: c._id }).catch(() =>
                          toast.error("Could not remove"),
                        )
                      }
                      className="text-zinc-500 hover:text-red-300 transition-colors"
                      aria-label="Remove collaborator"
                    >
                      <UserMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
