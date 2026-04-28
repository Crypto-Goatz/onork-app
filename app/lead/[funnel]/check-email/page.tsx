import { Mail } from 'lucide-react'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-lg ring-1 ring-zinc-200">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Mail className="h-7 w-7 text-zinc-700" />
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="text-[15px] leading-relaxed text-zinc-600">
          We sent a confirmation link to your email. Click it to receive your free guide instantly.
        </p>
        <p className="mt-5 text-xs text-zinc-400">Didn&rsquo;t get it? Check your spam folder.</p>
      </div>
    </div>
  )
}
