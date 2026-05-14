"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Mounts once at the app root. When Clerk signs the user in, calls
 * `users.ensureCurrentUser` to upsert a matching Convex record so every
 * future query can find them by Convex ID.
 */
export function UserSync() {
  const { isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureCurrentUser);

  useEffect(() => {
    if (isSignedIn && isAuthenticated) {
      ensureUser().catch(() => {
        /* swallow; subsequent calls will retry implicitly */
      });
    }
  }, [isSignedIn, isAuthenticated, ensureUser]);

  return null;
}
