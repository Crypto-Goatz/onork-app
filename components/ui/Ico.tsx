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
      className="inline-flex shrink-0 transition-transform duration-200 hover:scale-110"
      style={{ width: sz, height: sz }}
    />
  );
}
