/**
 * Conic Mesh Background — slowly rotating conic gradient that creates a
 * subtle moving mesh behind any hero. Pairs well with AnimatedGrid layered
 * on top.
 */
export default function ConicMeshBg({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-[-25%] origin-center animate-conic-spin opacity-[0.18] [background:conic-gradient(from_0deg_at_50%_50%,transparent_0deg,#6EE05A_60deg,transparent_120deg,#14b8a6_200deg,transparent_260deg,#06b6d4_320deg,transparent_360deg)] blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/40 via-transparent to-[#0d1117]/80" />
    </div>
  )
}
