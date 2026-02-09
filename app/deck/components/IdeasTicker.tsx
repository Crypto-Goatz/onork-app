"use client";

import { useMemo } from "react";
import { SVC } from "@/lib/services";
import { getIdeas } from "@/lib/ideas";

interface TickerProps {
  isC: (service: string) => boolean;
}

export function IdeasTicker({ isC }: TickerProps) {
  const conn = Object.keys(SVC).filter((k) => isC(k));

  const ideas = useMemo(() => {
    return getIdeas(conn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.join(",")]);

  const doubled = [...ideas, ...ideas];

  return (
    <div className="overflow-hidden shrink-0 relative border-b border-white/[0.06] py-1.5">
      {/* Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-[2] bg-gradient-to-r from-onork-bg to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-[2] bg-gradient-to-l from-onork-bg to-transparent" />

      <div className="flex items-center gap-1.5 pl-3 mb-0.5">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-onork-p3">
          Ideas
        </span>
      </div>

      <div
        className="flex whitespace-nowrap animate-scroll"
        style={{ animationDuration: `${ideas.length * 5}s` }}
      >
        {doubled.map((x, i) => (
          <span
            key={i}
            className="inline-flex items-center shrink-0 text-xs text-onork-text-dim px-4 py-0.5"
          >
            <span className="w-1 h-1 rounded-full bg-onork-p3 mr-2.5 shrink-0" />
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}
