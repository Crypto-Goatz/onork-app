/**
 * Aurora Background — three slow-drifting blurred blobs in the brand
 * gradient (green → teal → cyan). Pure CSS animations via Tailwind utility
 * classes; the keyframes themselves live in globals.css under
 * `bg-aurora-*`. Drop this into any section with `relative overflow-hidden`.
 */
export default function AuroraBg({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute -top-1/3 -left-1/4 h-[60vh] w-[60vh] rounded-full bg-[#6EE05A] opacity-25 blur-[120px] mix-blend-screen animate-aurora-1" />
      <div className="absolute top-1/4 -right-1/4 h-[55vh] w-[55vh] rounded-full bg-[#14b8a6] opacity-20 blur-[120px] mix-blend-screen animate-aurora-2" />
      <div className="absolute -bottom-1/3 left-1/3 h-[50vh] w-[50vh] rounded-full bg-[#06b6d4] opacity-20 blur-[120px] mix-blend-screen animate-aurora-3" />
    </div>
  )
}
