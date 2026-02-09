"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { LOGO_SVG } from "@/components/ServiceIcon";

const PIN_CODE = "412724";

export default function PinPage() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [shk, setShk] = useState(false);
  const router = useRouter();

  const handleDigit = (n: string) => {
    if (pin.length >= 6) return;
    const next = pin + n;
    setPin(next);
    setErr(false);

    if (next.length === 6) {
      if (next === PIN_CODE) {
        setTimeout(async () => {
          await fetch("/api/auth/pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: next }),
          });
          router.push("/deck");
        }, 200);
      } else {
        setShk(true);
        setErr(true);
        setTimeout(() => {
          setPin("");
          setShk(false);
        }, 600);
      }
    }
  };

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-onork-bg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_#7c3aed33,_transparent_70%)]" />

      <div className="relative animate-slide-up text-center">
        {/* Logo */}
        <span
          dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
          className="inline-flex w-14 h-14"
        />

        <div className="text-3xl font-black mt-2 tracking-tight bg-gradient-to-br from-onork-p3 to-onork-b2 bg-clip-text text-transparent">
          0nork
        </div>

        <div className="text-xs text-onork-text-dim mt-1.5 tracking-widest uppercase">
          Enter Access Code
        </div>

        {/* PIN dots */}
        <div className={`flex gap-3 justify-center my-8 ${shk ? "animate-shake" : ""}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  err
                    ? "border-onork-red bg-onork-red"
                    : filled
                      ? "border-onork-p2 bg-onork-p2 shadow-[0_0_10px_#6366f144]"
                      : "border-onork-border bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((n, i) =>
            n === null ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() =>
                  n === "del"
                    ? setPin((p) => p.slice(0, -1))
                    : handleDigit(String(n))
                }
                className={`h-14 rounded-2xl text-xl font-semibold transition-all duration-100 active:scale-95 cursor-pointer flex items-center justify-center ${
                  n === "del"
                    ? "bg-transparent border-none text-onork-text-dim hover:text-onork-text"
                    : "glass-card text-onork-text hover:bg-white/[0.08]"
                }`}
              >
                {n === "del" ? <Delete size={20} /> : n}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
