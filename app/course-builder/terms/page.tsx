export const metadata = {
  title: 'Terms of Service — 0n Course Builder',
  alternates: { canonical: 'https://www.0ncore.com/course-builder/terms' },
}

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0d1117] px-6 py-16 text-[#f0f4f8]">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-[#6b7c9c]">0n Course Builder · RocketOpp LLC · Updated 15 August 2026</p>

        <H>The service</H>
        <P>0n Course Builder generates course outlines and lesson content from a topic you describe, and publishes
        that content into the CRM sub-account you installed it in.</P>

        <H>Your content is yours</H>
        <P>You own the courses you generate. You are responsible for reviewing them before selling or teaching from
        them — generated text can be wrong, and you should read it.</P>

        <H>Acceptable use</H>
        <P>Do not use this app to produce content that is unlawful, infringing, or that presents professional,
        medical, legal or financial advice as verified when it has not been reviewed by someone qualified.</P>

        <H>Availability</H>
        <P>The service is provided as-is. We aim to keep it running but do not guarantee uninterrupted availability,
        and generation depends on third-party providers.</P>

        <H>Fees</H>
        <P>Any fees are shown in the marketplace listing before installation and billed through the platform.
        Uninstalling stops future charges.</P>

        <H>Liability</H>
        <P>To the extent permitted by law, RocketOpp LLC is not liable for indirect or consequential loss arising
        from use of the app. Nothing here limits liability that cannot be limited by law.</P>

        <H>Contact</H>
        <P>RocketOpp LLC · <A href="mailto:mike@rocketopp.com">mike@rocketopp.com</A></P>
      </article>
    </main>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-bold">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 leading-relaxed text-[#9fb0cc]">{children}</p>
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="text-[#7ED957] hover:underline">{children}</a>
}
