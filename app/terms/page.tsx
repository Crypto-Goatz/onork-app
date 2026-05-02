import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — 0nCore',
  description: 'The Terms of Service governing use of 0nCore and 0nMCP, operated by RocketOpp LLC.',
  alternates: { canonical: 'https://0ncore.com/terms' },
  openGraph: {
    title: 'Terms of Service — 0nCore',
    description: 'The Terms of Service governing use of 0nCore and 0nMCP, operated by RocketOpp LLC.',
    url: 'https://0ncore.com/terms',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. Acceptance of terms',
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you
          (&ldquo;you&rdquo;) and <strong className="text-[#e6edf3]">RocketOpp LLC</strong>{' '}
          (&ldquo;0nCore&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) governing your access
          to and use of 0ncore.com, 0nMCP, and any related products or services
          (collectively, the &ldquo;Service&rdquo;). By creating an account or using the
          Service, you agree to these Terms.
        </p>
      </>
    ),
  },
  {
    title: '2. Account registration',
    body: (
      <>
        <p>
          To use most features of the Service, you must register an account. You agree to
          provide accurate information, keep it up to date, and safeguard your credentials.
          You&rsquo;re responsible for activity that occurs under your account. Notify us
          promptly at{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>{' '}
          if you suspect unauthorized access.
        </p>
        <p>
          You must be at least 18 years old, or the age of majority in your jurisdiction,
          to use the Service.
        </p>
      </>
    ),
  },
  {
    title: '3. Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Violate any applicable law or regulation.</li>
          <li>
            Infringe the intellectual-property, privacy, or other rights of any person or
            entity.
          </li>
          <li>
            Transmit malware, attempt to disrupt the Service, or probe for vulnerabilities
            without authorization.
          </li>
          <li>
            Use the Service to send spam, conduct phishing, or distribute deceptive
            content.
          </li>
          <li>
            Reverse engineer, decompile, or attempt to extract source code from the Service
            except to the extent permitted by law.
          </li>
          <li>
            Resell, white-label, or sublicense the Service without a written agreement.
          </li>
          <li>
            Use the Service to build a competing product or to train a machine-learning
            model that competes with us.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules, in our reasonable
          discretion.
        </p>
      </>
    ),
  },
  {
    title: '4. Your content',
    body: (
      <>
        <p>
          You retain ownership of the workflows, prompts, configurations, and other content
          you create or upload to the Service (&ldquo;Your Content&rdquo;). You grant
          RocketOpp LLC a worldwide, non-exclusive, royalty-free license to host, store,
          process, transmit, and display Your Content solely to provide and improve the
          Service.
        </p>
        <p>
          You represent that you have all rights necessary to grant this license and that
          Your Content does not violate any third-party rights or applicable law.
        </p>
      </>
    ),
  },
  {
    title: '5. Intellectual property',
    body: (
      <>
        <p>
          The Service, including 0nCore, 0nMCP, the .0n standard, source code,
          documentation, designs, logos, and trademarks, is the exclusive property of
          RocketOpp LLC and its licensors. Except for the limited rights expressly granted
          in these Terms, no rights are transferred to you. All rights not granted are
          reserved.
        </p>
      </>
    ),
  },
  {
    title: '6. Subscriptions and payment',
    body: (
      <>
        <p>
          Paid plans are billed through{' '}
          <strong className="text-[#e6edf3]">Stripe</strong>. By subscribing, you authorize
          us to charge your payment method on a recurring basis (monthly or annually, as
          selected) until you cancel. Fees are non-refundable except where required by law
          or expressly stated.
        </p>
        <p>
          We may change pricing with at least 30 days&rsquo; notice. Continued use of the
          Service after a price change takes effect constitutes acceptance of the new
          price.
        </p>
        <p>
          You can cancel a subscription at any time from your account settings. Cancellation
          takes effect at the end of the current billing period.
        </p>
      </>
    ),
  },
  {
    title: '7. Third-party services',
    body: (
      <>
        <p>
          The Service integrates with third-party platforms (such as your CRM, payment
          processors, and AI providers). Your use of those third-party services is governed
          by their own terms and privacy policies. We&rsquo;re not responsible for the
          availability, accuracy, or practices of third-party services.
        </p>
      </>
    ),
  },
  {
    title: '8. Beta features',
    body: (
      <>
        <p>
          We may label certain features as &ldquo;beta,&rdquo; &ldquo;preview,&rdquo; or
          similar. Beta features are provided as-is, may change or be removed at any time,
          and are excluded from any service-level commitments.
        </p>
      </>
    ),
  },
  {
    title: '9. Termination',
    body: (
      <>
        <p>
          You may terminate your account at any time by deleting it from account settings
          or emailing us. We may suspend or terminate your account if you breach these
          Terms, fail to pay fees, or use the Service in a way that creates legal or
          security risk. Upon termination, your license to use the Service ends and we may
          delete Your Content as described in our Privacy Policy.
        </p>
        <p>
          Sections 4 (your content license), 5 (IP), 10 (warranty disclaimer), 11
          (liability), 12 (indemnification), and 14 (governing law) survive termination.
        </p>
      </>
    ),
  },
  {
    title: '10. Disclaimer of warranties',
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
          OR UNINTERRUPTED OR ERROR-FREE OPERATION. WE DO NOT WARRANT THAT THE SERVICE WILL
          MEET YOUR REQUIREMENTS OR THAT ANY OUTPUT GENERATED BY AI FEATURES WILL BE
          ACCURATE OR COMPLETE.
        </p>
      </>
    ),
  },
  {
    title: '11. Limitation of liability',
    body: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ROCKETOPP LLC AND ITS OFFICERS, EMPLOYEES,
          AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
          GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE, WHETHER
          IN CONTRACT, TORT, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          OUR TOTAL CUMULATIVE LIABILITY FOR ANY CLAIM ARISING FROM OR RELATED TO THESE
          TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12)
          MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED U.S. DOLLARS
          ($100), WHICHEVER IS GREATER.
        </p>
      </>
    ),
  },
  {
    title: '12. Indemnification',
    body: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless RocketOpp LLC and its
          affiliates, officers, employees, and agents from and against any claims,
          liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo;
          fees) arising out of or in any way connected with (i) your use of the Service,
          (ii) Your Content, or (iii) your violation of these Terms or applicable law.
        </p>
      </>
    ),
  },
  {
    title: '13. Modifications to the Service or terms',
    body: (
      <>
        <p>
          We may modify the Service at any time, including by adding, removing, or changing
          features. We may also revise these Terms. Material changes to the Terms will be
          announced at least 14 days before they take effect. Continued use of the Service
          after changes take effect constitutes acceptance.
        </p>
      </>
    ),
  },
  {
    title: '14. Governing law and disputes',
    body: (
      <>
        <p>
          These Terms are governed by the laws of the Commonwealth of Pennsylvania, United
          States, without regard to conflict-of-law principles. Any dispute arising from or
          relating to these Terms or the Service will be brought exclusively in the state or
          federal courts located in Pennsylvania, and you consent to the personal
          jurisdiction of those courts.
        </p>
      </>
    ),
  },
  {
    title: '15. Miscellaneous',
    body: (
      <>
        <p>
          These Terms, together with our Privacy Policy, constitute the entire agreement
          between you and RocketOpp LLC regarding the Service. If any provision is found
          unenforceable, the remaining provisions remain in effect. Our failure to enforce a
          right is not a waiver. You may not assign these Terms without our prior written
          consent; we may assign them in connection with a merger, acquisition, or sale of
          assets.
        </p>
      </>
    ),
  },
  {
    title: '16. Contact',
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

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-medium tracking-wide uppercase text-[#6EE05A]">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
            Terms of Service
          </h1>
          <p className="text-xs text-[#8b949e]">Effective date: May 1, 2026</p>
        </header>

        <p className="text-sm text-[#c9d1d9] leading-relaxed">
          These are the rules that govern using 0nCore. We&rsquo;ve tried to keep them
          plain. If anything is unclear, email us at{' '}
          <a href="mailto:mike@rocketopp.com" className="text-[#6EE05A] hover:underline">
            mike@rocketopp.com
          </a>
          .
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
            <Link href="/privacy" className="hover:text-[#e6edf3] transition-colors">
              Privacy
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
