"use client";

import { useState, useEffect, useCallback } from "react";
import { SVC } from "@/lib/services";

type VaultData = Record<string, Record<string, string>>;

export function useVault() {
  const [credentials, setCredentials] = useState<VaultData>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("0nork_v") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("0nork_v", JSON.stringify(credentials));
  }, [credentials]);

  const set = useCallback((service: string, key: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [service]: { ...(prev[service] || {}), [key]: value },
    }));
  }, []);

  const get = useCallback(
    (service: string, key: string): string => {
      return credentials?.[service]?.[key] || "";
    },
    [credentials],
  );

  const isC = useCallback(
    (service: string): boolean => {
      const sv = SVC[service];
      if (!sv) return false;
      const required = sv.f.filter(
        (f) => f.s || f.k === "url" || f.k === "client_id",
      );
      return (
        required.length > 0 &&
        required.every((f) => !!credentials?.[service]?.[f.k])
      );
    },
    [credentials],
  );

  const n = Object.keys(SVC).filter(isC).length;

  return { credentials, set, get, isC, n };
}
