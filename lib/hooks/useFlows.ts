"use client";

import { useState, useEffect, useCallback } from "react";

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  on: boolean;
  ts: string;
}

export function useFlows() {
  const [f, setF] = useState<Workflow[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("0nork_f") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("0nork_f", JSON.stringify(f));
  }, [f]);

  const add = useCallback((w: Omit<Workflow, "id" | "ts">) => {
    setF((prev) => [
      ...prev,
      { ...w, id: Date.now() + "", ts: new Date().toISOString() },
    ]);
  }, []);

  const rm = useCallback((id: string) => {
    setF((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const tog = useCallback((id: string) => {
    setF((prev) => prev.map((x) => (x.id === id ? { ...x, on: !x.on } : x)));
  }, []);

  return { f, add, rm, tog };
}
