"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Plus, Sparkles, FileText, Tag, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function NotesIndexPage() {
  const router = useRouter();
  const list = useQuery(api.notes.list, { archived: false });
  const create = useMutation(api.notes.create);

  useEffect(() => {
    if (list && list.length > 0) {
      router.replace(`/notes/${list[0]._id}`);
    }
  }, [list, router]);

  const onCreate = async () => {
    try {
      const id = await create({});
      router.push(`/notes/${id}`);
    } catch {
      toast.error("Could not create note");
    }
  };

  if (list === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xs text-zinc-600 font-mono">loading…</div>
      </div>
    );
  }

  if (list.length > 0) {
    return null;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
      <div className="relative">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/3 mb-6">
            <FileText className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-white mb-3">
            Your workspace is empty.
          </h1>
          <p className="text-zinc-400 mb-8">
            Create your first note to begin. Markdown supported. AI summaries,
            action items, and suggested titles are one click away.
          </p>
          <Button size="lg" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create your first note
          </Button>

          <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            <Tip icon={Sparkles} title="AI assistance">
              Generate summaries and action items on demand
            </Tip>
            <Tip icon={Tag} title="Tags">
              Organize with #tags and filter from the sidebar
            </Tip>
            <Tip icon={Share2} title="Share">
              Toggle a note public and share with one link
            </Tip>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tip({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/1.5 p-4">
      <Icon className="mb-2 h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
      <div className="text-[12px] font-medium text-zinc-200 mb-0.5">{title}</div>
      <div className="text-[11px] text-zinc-500 leading-relaxed">{children}</div>
    </div>
  );
}
