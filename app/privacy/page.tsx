import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — 0nCore',
  description: 'How 0nCore (RocketOpp LLC) collects, uses, and protects your information.',
  alternates: { canonical: 'https://0ncore.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — 0nCore',
    description: 'How 0nCore (RocketOpp LLC) collects, uses, and protects your information.',
    url: 'https://0ncore.com/privacy',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. Who we are',
    body: (
      <>
        <p>
          0nCore is operated by <strong className="text-[#e6edf3]">RocketOpp LLC</strong>{' '}
          (&ldquo;0nCore&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). This Privacy Policy
          describes how we collect, use, and share information when you use 0ncore.com,
          0nMCP, and any related products or services (collectively, the &ldquo;Service&rdquo;).
        </p>
        <p>
          Questions or requests about this policy can be sent to{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    title: '2. Information we collect',
    body: (
      <>
        <p>We collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong className="text-[#e6edf3]">Account information.</strong> Name, email
            address, password hash, organization name, and billing details you provide when
            you sign up or subscribe.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Workflow and content data.</strong>{' '}
            Configurations, prompts, integrations, and assets you create or upload while
            using the Service.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Usage analytics.</strong> Pages viewed,
            features used, errors encountered, device and browser metadata, and approximate
            location derived from IP.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Support communications.</strong> Messages
            you send to us by email or community channels.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '3. How we use information',
    body: (
      <>
        <p>We use the information described above to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Provide, maintain, and secure the Service.</li>
          <li>Authenticate you and protect your account.</li>
          <li>Process payments and prevent fraud.</li>
          <li>Improve features, fix bugs, and measure product performance.</li>
          <li>Respond to support requests and operational notices.</li>
          <li>Comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Third-party service providers',
    body: (
      <>
        <p>
          We rely on a small number of trusted vendors to operate the Service. These
          providers process information on our behalf under contractual data-protection
          obligations:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong className="text-[#e6edf3]">Supabase</strong> — managed Postgres
            database, authentication, and storage.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Vercel</strong> — application hosting and
            edge delivery.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Groq</strong> — AI inference for
            production-path AI features.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Stripe</strong> — subscription billing and
            payment processing.
          </li>
          <li>
            <strong className="text-[#e6edf3]">CRM platform</strong> — customer
            relationship management for users who connect their CRM workspace.
          </li>
          <li>
            <strong className="text-[#e6edf3]">Google Analytics</strong> — aggregate usage
            measurement.
          </li>
        </ul>
        <p>
          We do not sell personal information. We share information with these providers
          only to the extent necessary for them to perform the services we&rsquo;ve
          contracted them to provide.
        </p>
      </>
    ),
  },
  {
    title: '5. Cookies and tracking',
    body: (
      <>
        <p>
          We use a small number of cookies and similar technologies for two purposes:
          authentication (keeping you logged in) and analytics (understanding how the
          Service is used so we can improve it). We do not use third-party advertising
          cookies. You can clear cookies in your browser at any time, though doing so will
          sign you out.
        </p>
      </>
    ),
  },
  {
    title: '6. Data retention',
    body: (
      <>
        <p>
          We retain account and workflow data for as long as your account is active.
          When you delete your account, we delete or anonymize your personal information
          within 30 days, except where we&rsquo;re required to retain it for legal,
          accounting, or fraud-prevention purposes (typically up to 7 years for billing
          records).
        </p>
        <p>
          Aggregate, de-identified analytics may be retained indefinitely for product
          insights.
        </p>
      </>
    ),
  },
  {
    title: '7. Your rights',
    body: (
      <>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Access the personal information we hold about you.</li>
          <li>Correct inaccurate information.</li>
          <li>Delete your account and associated personal data.</li>
          <li>Export your workflow data in a portable format.</li>
          <li>Object to or restrict certain processing activities.</li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>
          . We will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    title: '8. Security',
    body: (
      <>
        <p>
          We use industry-standard safeguards including TLS encryption in transit,
          encryption at rest, scoped access controls, and audit logging. No system is
          perfectly secure — if you suspect a security issue, email{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>{' '}
          with &ldquo;Security&rdquo; in the subject line.
        </p>
      </>
    ),
  },
  {
    title: '9. International users',
    body: (
      <>
        <p>
          0nCore is operated from the United States. If you access the Service from
          outside the U.S., you understand that your information will be transferred to,
          stored, and processed in the U.S., where data-protection laws may differ from
          those in your jurisdiction.
        </p>
      </>
    ),
  },
  {
    title: '10. Children',
    body: (
      <>
        <p>
          The Service is not directed to children under 13, and we do not knowingly
          collect personal information from anyone under 13. If you believe a child has
          provided us information, please contact us so we can remove it.
        </p>
      </>
    ),
  },
  {
    title: '11. Changes to this policy',
    body: (
      <>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be
          announced via email or in-app notice at least 14 days before they take effect.
          The &ldquo;Effective date&rdquo; below reflects the most recent revision.
        </p>
      </>
    ),
  },
  {
    title: '12. Contact',
    body: (
      <>
        <p>
          RocketOpp LLC
          <br />
          Email:{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-medium tracking-wide uppercase text-[#6EE05A]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#8b949e]">Effective date: May 1, 2026</p>
        </header>

        <p className="text-sm text-[#c9d1d9] leading-relaxed">
          This Privacy Policy explains how RocketOpp LLC handles information collected
          through 0nCore, 0nMCP, and related services. We&rsquo;ve tried to write this in
          plain language. If anything is unclear, email us — we&rsquo;ll explain.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-[#e6edf3]">{section.title}</h2>
              <div className="text-sm text-[#c9d1d9] leading-relaxed space-y-3">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="pt-6 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8b949e]">
          <span>&copy; 2026 RocketOpp LLC. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/support" className="hover:text-[#e6edf3] transition-colors">
              Support
            </Link>
            <Link href="/terms" className="hover:text-[#e6edf3] transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-[#e6edf3] transition-colors">
              Home
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
