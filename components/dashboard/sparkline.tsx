"use client";

import * as React from "react";

type Point = { day: string; date: number; edits: number; ai: number };

export function Sparkline({
  data,
  height = 160,
}: {
  data: Point[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.edits, d.ai)));
  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute inset-0 flex items-end justify-between gap-3 px-1">
        {data.map((d, i) => {
          const editsH = Math.max(2, (d.edits / max) * (height - 36));
          const aiH = Math.max(0, (d.ai / max) * (height - 36));
          return (
            <div
              key={i}
              className="group relative flex-1 flex flex-col items-center"
              style={{
                animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both`,
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-end gap-0.5 w-full justify-center mb-2">
                <div
                  className="w-3 rounded-sm bg-zinc-700 transition-colors group-hover:bg-zinc-500"
                  style={{ height: `${editsH}px` }}
                />
                {aiH > 0 && (
                  <div
                    className="w-3 rounded-sm bg-white/80 transition-colors group-hover:bg-white"
                    style={{ height: `${aiH}px` }}
                  />
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-600">
                {d.day}
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="whitespace-nowrap rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-300 shadow-xl">
                  {d.edits} edits · {d.ai} ai
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
