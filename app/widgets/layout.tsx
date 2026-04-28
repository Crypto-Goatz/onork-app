import type { Metadata } from 'next'
import './widget.css'

export const metadata: Metadata = {
  title: '0nCore Widget',
  robots: 'noindex',
}

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-white antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  )
}
