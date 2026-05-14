"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { FileX } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NoteEditor } from "@/components/editor/note-editor";
import { Button } from "@/components/ui/button";

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id as Id<"notes">;
  const note = useQuery(api.notes.get, { id });

  if (note === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xs text-zinc-600 font-mono">loading note…</div>
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <FileX
          className="mb-3 h-6 w-6 text-zinc-600"
          strokeWidth={1.5}
        />
        <div className="text-sm text-zinc-300">Note not found</div>
        <div className="mt-1 text-[11px] text-zinc-600">
          It may have been deleted or you no longer have access.
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/notes")}
        >
          Back to notes
        </Button>
      </div>
    );
  }

  return <NoteEditor note={note} />;
}
