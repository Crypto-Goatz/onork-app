"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div
      className="h-dvh flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #7c3aed44, transparent 70%), #08081a",
      }}
    >
      <div className="animate-slide-up text-center">
        <span
          dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
          className="inline-flex"
          style={{ width: 52, height: 52 }}
        />

        <div
          className="text-[30px] font-black mt-1"
          style={{
            letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #818cf8, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          0nork
        </div>

        <div className="text-[11px] text-onork-text-dim mt-1 tracking-[0.15em] uppercase">
          Enter Access Code
        </div>

        {/* PIN dots */}
        <div
          className={`flex gap-2.5 justify-center my-6 ${shk ? "animate-shake" : ""}`}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="transition-all duration-[120ms]"
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `2px solid ${err ? "#f87171" : i < pin.length ? "#6366f1" : "#1e2258"}`,
                background: i < pin.length ? (err ? "#f87171" : "#6366f1") : "transparent",
                boxShadow: i < pin.length && !err ? "0 0 8px #6366f144" : "none",
              }}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[230px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "\u232B"].map((n, i) =>
            n === null ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() =>
                  n === "\u232B"
                    ? setPin((p) => p.slice(0, -1))
                    : handleDigit(String(n))
                }
                className="cursor-pointer transition-all duration-100 active:scale-95"
                style={{
                  width: 60,
                  height: 52,
                  borderRadius: 12,
                  background: n === "\u232B" ? "transparent" : "#12143a",
                  border: n === "\u232B" ? "none" : "1px solid #1e2258",
                  color: "#f0f0ff",
                  fontSize: n === "\u232B" ? 18 : 20,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {n}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
