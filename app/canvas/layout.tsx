/**
 * Canvas layout — escapes the dark dashboard chrome. Full-bleed white.
 */

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900">
      {children}
    </div>
  )
}
