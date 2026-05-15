"use client";

import * as React from "react";
import { detectOS, type OS } from "./platform";

// The OS never changes during a session, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * SSR-safe OS read. `useSyncExternalStore` returns the server snapshot
 * ("other") during SSR and the first client paint, then swaps to the real
 * value — without a hydration warning and without a setState-in-effect.
 */
export function useOS(): OS {
  return React.useSyncExternalStore<OS>(
    subscribe,
    () => detectOS(),
    () => "other",
  );
}
