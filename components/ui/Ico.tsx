"use client";

import { SERVICE_LOGOS } from "@/components/ServiceIcon";

interface IcoProps {
  name: string;
  sz?: number;
}

export function Ico({ name, sz = 26 }: IcoProps) {
  return (
    <span
      dangerouslySetInnerHTML={{ __html: SERVICE_LOGOS[name] || SERVICE_LOGOS.onork }}
      style={{ width: sz, height: sz, display: "inline-flex", flexShrink: 0 }}
    />
  );
}
