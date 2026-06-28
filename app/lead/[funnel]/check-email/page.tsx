import { Mail } from 'lucide-react'

export default function CheckEmailPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020810] px-6 py-12 font-sans text-white antialiased">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.07] blur-[140px]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 text-center backdrop-blur">
        <div
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border bg-[#0d1117]"
          style={{ borderColor: '#7ed95740', boxShadow: '0 0 24px #7ed95722' }}
        >
          <Mail className="h-7 w-7" style={{ color: '#7ed957' }} />
        </div>
        <h1 className="mb-3 text-2xl font-black tracking-tight text-white">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-white/70">
          We sent a confirmation link to your email. Click it to receive your free guide instantly.
        </p>
        <p className="mt-5 text-xs text-white/45">Didn&rsquo;t get it? Check your spam folder.</p>
      </div>
    </main>
  )
}
