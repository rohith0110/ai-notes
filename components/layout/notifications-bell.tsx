"use client";

import { useQuery, useMutation } from "convex/react";
import { Bell, Check, X, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
} from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export function NotificationsBell() {
  const requests = useQuery(api.notifications.pendingShareRequests);
  const respond = useMutation(api.share.respondToRequest);
  const count = requests?.length ?? 0;

  const onRespond = async (
    id: Id<"shareRequests">,
    approve: boolean,
    role: "viewer" | "editor" = "editor",
  ) => {
    try {
      await respond({ requestId: id, approve, role });
      toast.success(approve ? "Access granted" : "Request denied");
    } catch {
      toast.error("Could not update request");
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:text-white outline-none">
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 font-mono text-[10px] text-black">
            {count}
          </span>
        )}
      </DropdownTrigger>
      <DropdownContent className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-white/6 px-4 py-3">
          <div className="text-xs font-medium text-zinc-200">
            Access requests
          </div>
          <div className="text-[11px] text-zinc-500">
            {count === 0
              ? "No pending requests"
              : `${count} ${count === 1 ? "request" : "requests"} awaiting review`}
          </div>
        </div>
        {requests === undefined ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-500">
            Loading…
          </div>
        ) : count === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell
              className="mx-auto mb-2 h-5 w-5 text-zinc-700"
              strokeWidth={1.5}
            />
            <div className="text-xs text-zinc-500">All caught up.</div>
            <div className="mt-1 text-[11px] text-zinc-600">
              Share a note publicly to receive access requests here.
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {requests.map((r) => (
              <div
                key={r._id}
                className="border-b border-white/4 last:border-b-0 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={r.requester?.imageUrl}
                    name={r.requester?.name || r.requester?.email || "User"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">
                      <span className="font-medium">
                        {r.requester?.name || r.requester?.email || "Someone"}
                      </span>
                      <span className="text-zinc-500"> requested access</span>
                    </div>
                    {r.requester?.email && r.requester.name && (
                      <div className="text-[11px] text-zinc-500 truncate">
                        {r.requester.email}
                      </div>
                    )}
                    <Link
                      href={`/notes/${r.note?._id}`}
                      className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{r.note?.title}</span>
                    </Link>
                    {r.message && (
                      <div className="mt-1 text-[11px] text-zinc-500 line-clamp-2 border-l border-white/10 pl-2 italic">
                        &quot;{r.message}&quot;
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onRespond(r._id, true, "editor")}
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRespond(r._id, false)}
                      >
                        <X className="h-3 w-3" />
                        Deny
                      </Button>
                      <span className="ml-auto text-[10px] text-zinc-600">
                        {formatRelativeTime(r.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

function Avatar({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-8 w-8 rounded-full border border-white/10"
      />
    );
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[12px] font-medium text-zinc-300">
      {initial}
    </div>
  );
}
