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
    <div
      className="overflow-hidden shrink-0 relative"
      style={{
        borderBottom: "1px solid #1e2258",
        padding: "6px 0",
      }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 z-[2]"
        style={{ background: "linear-gradient(90deg, #08081a, transparent)" }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-6 z-[2]"
        style={{ background: "linear-gradient(90deg, transparent, #08081a)" }}
      />

      <div className="flex items-center gap-1 pl-3 mb-0.5">
        <span className="text-[8px] font-extrabold tracking-[0.12em] uppercase text-onork-p3">
          IDEAS
        </span>
      </div>

      <div
        className="flex whitespace-nowrap"
        style={{ animation: `scroll ${ideas.length * 5}s linear infinite` }}
      >
        {doubled.map((x, i) => (
          <span
            key={i}
            className="inline-flex items-center shrink-0 text-[11px] text-onork-text-dim"
            style={{ padding: "2px 14px" }}
          >
            <span className="text-onork-p3 mr-2 text-[7px]">&#x25CF;</span>
            {x}
            <span className="mx-4 text-onork-text-muted">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
