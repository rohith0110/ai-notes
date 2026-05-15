"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowLeft,
  FileX,
  Sparkles,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { SignInButton, Show } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Brandmark } from "@/components/landing/nav";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { formatRelativeTime } from "@/lib/utils";

export default function PublicSharePage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId;
  const note = useQuery(api.notes.getByShareId, { shareId });
  const state = useQuery(api.share.accessState, { shareId });
  const requestAccess = useMutation(api.share.requestAccess);
  const [busy, setBusy] = React.useState(false);

  if (note === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="font-mono text-xs text-zinc-600">loading…</div>
      </div>
    );
  }
  if (note === null) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <FileX
          className="mb-3 h-6 w-6 text-zinc-600"
          strokeWidth={1.5}
        />
        <h1 className="text-lg text-zinc-200">This note isn&apos;t available</h1>
        <p className="mt-1 text-[12px] text-zinc-500">
          It may have been made private or deleted.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Go to Inkwell
        </Link>
      </div>
    );
  }

  const onRequest = async () => {
    setBusy(true);
    try {
      const result = await requestAccess({ shareId });
      if (result.status === "requested") {
        toast.success("Access requested — the owner has been notified");
      } else if (result.status === "already_pending") {
        toast.info("You've already requested access — waiting for owner");
      } else if (result.status === "approved") {
        toast.success("Already approved — opening note");
      } else if (result.status === "already_collaborator") {
        toast.success("You already have access");
      }
    } catch {
      toast.error("Could not request access");
    } finally {
      setBusy(false);
    }
  };

  const accessRole = state && state.exists ? state.role : "anon";
  const isPending =
    accessRole === "requester" &&
    "requestStatus" in (state ?? {}) &&
    state?.requestStatus === "pending";
  const showRequest =
    accessRole === "anon" ||
    accessRole === "visitor" ||
    (accessRole === "requester" &&
      "requestStatus" in (state ?? {}) &&
      state?.requestStatus !== "approved" &&
      state?.requestStatus !== "pending");

  const hasAccess =
    accessRole === "owner" ||
    accessRole === "editor" ||
    accessRole === "viewer";

  return (
    <main className="min-h-[100dvh] bg-black">
      <header className="sticky top-0 z-10 border-b border-white/6 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <Brandmark className="h-4 w-4 text-zinc-300 transition-transform group-hover:rotate-12" />
            <span className="text-sm font-medium tracking-tight text-zinc-200">
              Inkwell
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded border border-white/10 bg-white/3 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              <ShieldCheck className="h-2.5 w-2.5" />
              Public share
            </span>
            {hasAccess && "noteId" in (state ?? {}) && state?.noteId ? (
              <Link href={`/notes/${state.noteId}`}>
                <Button size="sm" variant="secondary">
                  Open in workspace
                </Button>
              </Link>
            ) : accessRole === "requester" &&
              "requestStatus" in (state ?? {}) &&
              state?.requestStatus === "pending" ? (
              <span className="text-[11px] text-zinc-500 font-mono">
                request pending
              </span>
            ) : showRequest ? (
              <>
                <Show when="signed-out">
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={`/share/${shareId}`}
                  >
                    <Button size="sm">Request edit access</Button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <Button size="sm" onClick={onRequest} loading={busy}>
                    Request edit access
                  </Button>
                </Show>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="font-mono text-[11px] text-zinc-500 mb-2">
          shared by {note.ownerName} · updated{" "}
          {formatRelativeTime(note.updatedAt)}
        </div>
        <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-white mb-4">
          {note.title}
        </h1>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-8">
            {note.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/3 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400"
              >
                <Hash className="h-2.5 w-2.5" />
                {t}
              </span>
            ))}
          </div>
        )}

        {note.aiSummary && (
          <div className="mb-8 rounded-lg border border-white/6 bg-white/2 p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-2">
              <Sparkles className="h-3 w-3" />
              AI summary
            </div>
            <p className="text-[14px] text-zinc-200 leading-relaxed">
              {note.aiSummary}
            </p>
            {note.aiActionItems && note.aiActionItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/6">
                <div className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 mb-2">
                  Action items
                </div>
                <ul className="space-y-1">
                  {note.aiActionItems.map((it, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-zinc-300"
                    >
                      <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <MarkdownPreview source={note.content} />

        <div className="mt-16 border-t border-white/6 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-[12px] text-zinc-500">
            You&apos;re viewing this note via a public link.
            {showRequest &&
              " Request edit access to collaborate with the owner."}
            {isPending &&
              " Your access request is pending owner approval."}
          </div>
          {isPending ? (
            <span className="text-[11px] text-zinc-500 font-mono">request pending…</span>
          ) : showRequest ? (
            <>
              <Show when="signed-out">
                <SignInButton
                  mode="modal"
                  forceRedirectUrl={`/share/${shareId}`}
                >
                  <Button size="sm">Request edit access</Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Button size="sm" onClick={onRequest} loading={busy}>
                  Request edit access
                </Button>
              </Show>
            </>
          ) : null}
        </div>
      </article>
    </main>
  );
}
