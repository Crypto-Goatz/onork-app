"use client";

import { useState, useEffect, useCallback } from "react";

export interface HistoryEntry {
  id: string;
  ts: string;
  type: string;
  detail: string;
}

export function useHistory() {
  const [h, setH] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("0nork_h") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("0nork_h", JSON.stringify(h));
  }, [h]);

  const add = useCallback((type: string, detail: string) => {
    setH((prev) =>
      [
        { id: Date.now() + "", ts: new Date().toISOString(), type, detail },
        ...prev,
      ].slice(0, 200),
    );
  }, []);

  const clear = useCallback(() => {
    setH([]);
  }, []);

  return { h, add, clear };
}
