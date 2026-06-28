import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Search, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Free HIPAA 2026 Readiness Score — Is Your Website Compliant?',
  description: 'Get your free HIPAA 2026 readiness score in 30 seconds. 51-point assessment checks your website against the current HIPAA Security Rule and the 2026 NPRM. No login required.',
  openGraph: {
    title: 'Free HIPAA 2026 Readiness Score',
    description: 'Check your healthcare website compliance in 30 seconds. Dual scoring: current rule + 2026 NPRM.',
    url: 'https://0ncore.com/hipaa',
    type: 'website',
  },
}

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

const CATEGORIES = [
  { svg: '/icons/hipaa/transport-security.svg', title: 'Transport Security', desc: 'TLS configuration, HSTS enforcement, certificate validity, HTTP redirect chains, and encryption-in-transit verification across public and authenticated endpoints.', count: 14 },
  { svg: '/icons/hipaa/privacy-disclosures.svg', title: 'Privacy Disclosures', desc: 'Notice of Privacy Practices, CMS version disclosure, content freshness monitoring, consent language assessment, and HIPAA badge visibility.', count: 10 },
  { svg: '/icons/hipaa/security-headers.svg', title: 'Security Headers', desc: 'Content-Security-Policy, X-Frame-Options, CORS configuration, wildcard origin detection, server version exposure, and clickjacking prevention.', count: 13 },
  { svg: '/icons/hipaa/auth-controls.svg', title: 'Authentication Controls', desc: 'MFA detection, session cookie security, open registration endpoints, rate limiting, login page analysis, and password policy signals.', count: 12 },
  { svg: '/icons/hipaa/data-exposure.svg', title: 'Data Exposure', desc: 'PHI in URLs, phpinfo/test.php exposure, EOL software detection, third-party trackers without BAA, exposed logs, composer.json, and debug endpoints.', count: 14 },
]

const CHANGES_TABLE = [
  { req: 'Multi-Factor Authentication', current: 'Addressable', nprm: 'Required' },
  { req: 'Encryption at Rest', current: 'Addressable', nprm: 'Required' },
  { req: 'Vulnerability Scans', current: 'Not specified', nprm: 'Every 6 months' },
  { req: 'Penetration Tests', current: 'Not specified', nprm: 'Annual' },
  { req: 'Risk Analysis', current: 'General requirement', nprm: 'Explicit threat documentation' },
  { req: 'Compliance Audit', current: 'Implied', nprm: 'Every 12 months' },
]

const STATE_LAWS = [
  { state: 'New York', law: 'SHIELD Act', requirement: 'Requires reasonable data security safeguards for any business handling private info of NY residents. Mandatory breach notification within 72 hours.' },
  { state: 'California', law: 'CMIA + CCPA/CPRA', requirement: 'Confidentiality of Medical Information Act adds state-level PHI protections. CCPA grants patients additional data rights beyond HIPAA.' },
  { state: 'Texas', law: 'HB 300', requirement: 'Stricter than HIPAA for electronic health records. Requires employee training, limits PHI sales, and mandates 60-day breach notice.' },
  { state: 'Illinois', law: 'BIPA', requirement: 'Biometric Information Privacy Act requires written consent before collecting fingerprints or facial recognition data. Private right of action.' },
  { state: 'Massachusetts', law: '201 CMR 17.00', requirement: 'Comprehensive data security regulations requiring written information security programs, encryption, and access controls.' },
  { state: 'Connecticut', law: 'CTDPA + PA 23-56', requirement: 'Data privacy act with specific health data provisions. Requires opt-in consent for processing sensitive health information.' },
]

const FAQ_ITEMS = [
  { q: 'What is the HIPAA 2026 NPRM?', a: 'The HIPAA 2026 Notice of Proposed Rulemaking (NPRM) is a major update to the HIPAA Security Rule published by the U.S. Department of Health and Human Services. It eliminates the distinction between "Required" and "Addressable" implementation specifications, making nearly all safeguards mandatory. It also introduces new requirements for vulnerability scanning, penetration testing, and network segmentation.' },
  { q: 'When does the new HIPAA rule take effect?', a: 'The final rule is expected to be published in late 2025 or early 2026, with a compliance deadline approximately 180 days after publication — estimated around January 2027. Organizations should begin preparing now, as many requirements (MFA, encryption, vulnerability scanning) require significant implementation time.' },
  { q: 'What does this scanner check?', a: 'Our scanner performs 51 passive checks across 5 categories: Transport Security (TLS, HSTS, certificates), Privacy Disclosures (NPP, consent forms), Security Headers (CSP, X-Frame-Options), Authentication Controls (MFA indicators, session management), and Data Exposure (PHI in URLs, third-party trackers). All checks are non-invasive HTTP requests — we never attempt to log in or access protected data.' },
  { q: 'Is the scan safe? Will it break anything?', a: 'Completely safe. Our scanner only makes standard HTTP GET and HEAD requests — the same requests any web browser makes when visiting your site. We never submit forms, attempt authentication, or interact with any functionality. The scan is equivalent to someone visiting your public website and login page.' },
  { q: 'Do you access any patient data?', a: 'Absolutely not. We scan only publicly accessible pages and HTTP response headers. We never access, store, or process any Protected Health Information (PHI). Our scanner cannot see any data behind authentication. No BAA is required to use this tool.' },
  { q: 'What is the difference between Required and Addressable?', a: 'Under the current HIPAA Security Rule, "Required" specifications must be implemented exactly as described. "Addressable" specifications allow organizations to assess whether they are reasonable and appropriate — and implement alternatives if not. The 2026 NPRM eliminates this distinction, making virtually all specifications mandatory with no alternative implementations allowed.' },
  { q: 'What if I am a Business Associate, not a Covered Entity?', a: 'Business Associates are equally subject to the HIPAA Security Rule and will be equally affected by the 2026 NPRM. If you handle, store, transmit, or process ePHI on behalf of a Covered Entity, you must comply with all Security Rule requirements. Our scanner assesses your web infrastructure regardless of entity type.' },
  { q: 'How much does remediation cost?', a: 'Remediation costs vary significantly based on your current compliance posture, infrastructure complexity, and the number of findings. Common fixes like enabling HSTS or adding security headers can be done in hours. Larger projects like implementing MFA or encryption at rest may take weeks. Our consultation provides a prioritized remediation plan with estimated effort and cost for each finding.' },
  { q: 'Can you help us fix the issues found?', a: 'Yes. After your free scan, you can book a consultation where our team walks you through every finding and builds a prioritized remediation plan. We offer hands-on remediation services for healthcare organizations, including security header configuration, TLS hardening, MFA implementation, and ongoing compliance monitoring.' },
  { q: 'What happens after the free scan?', a: 'You immediately see your two scores (Current Rule and 2026 NPRM) along with your top 5 critical findings. To get the full detailed report with all 51 check results, remediation steps, and state-specific guidance, book a free consultation. There is no obligation — the consultation is free and we will walk you through the complete assessment.' },
]

function ScanForm({ id }: { id?: string }) {
  return (
    <form id={id} action="/hipaa/scan" method="GET" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
      <input
        name="url"
        type="url"
        required
        placeholder="https://yourpractice.com"
        aria-label="Website URL"
        style={{
          padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(126,217,87,0.2)',
          background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 15,
          outline: 'none', width: '100%',
        }}
      />
      <input
        name="dashboardUrl"
        type="url"
        required
        placeholder="https://app.yourpractice.com/login"
        aria-label="Dashboard or Portal URL"
        style={{
          padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 15,
          outline: 'none', width: '100%',
        }}
      />
      <input
        name="email"
        type="email"
        required
        placeholder="you@yourpractice.com"
        aria-label="Email"
        style={{
          padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 15,
          outline: 'none', width: '100%',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <select
          name="entityType"
          required
          aria-label="Entity Type"
          style={{
            padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 14,
            outline: 'none', width: '100%', appearance: 'none',
          }}
        >
          <option value="" disabled>Entity Type</option>
          <option value="covered-entity">Covered Entity</option>
          <option value="business-associate">Business Associate</option>
          <option value="both">Both</option>
          <option value="unsure">Not Sure</option>
        </select>
        <select
          name="state"
          required
          aria-label="State"
          style={{
            padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 14,
            outline: 'none', width: '100%', appearance: 'none',
          }}
        >
          <option value="" disabled>State</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <button
        type="submit"
        style={{
          padding: '16px 36px', borderRadius: 10, border: 'none',
          background: '#7ed957', color: '#020810', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 0 30px rgba(126,217,87,0.3)',
          marginTop: 4,
        }}
      >
        Get Your Free Score
      </button>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, textAlign: 'center' }}>
        Free instant assessment. No login required. No credit card.
      </p>
    </form>
  )
}

export default function HIPAAPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Free HIPAA 2026 Readiness Assessment',
    description: 'Get your free HIPAA 2026 readiness score in 30 seconds. 51-point assessment checks your website against the current HIPAA Security Rule and the 2026 NPRM.',
    url: 'https://0ncore.com/hipaa',
    publisher: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '0nCore', item: 'https://0ncore.com' },
      { '@type': 'ListItem', position: 2, name: 'HIPAA 2026 Readiness', item: 'https://0ncore.com/hipaa' },
    ],
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 32px)',
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 32, objectFit: 'contain' }} />
        </Link>
        <div className="hipaa-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/connections" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/launch-party" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Launch Party</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: '#020810',
            background: '#7ed957', padding: '8px 20px', borderRadius: 8,
            textDecoration: 'none',
          }}>VIP Access</Link>
        </div>
        <Link href="/login" className="hipaa-mobile-menu" style={{
          display: 'none', fontSize: 13, fontWeight: 600, color: '#020810',
          background: '#7ed957', padding: '8px 20px', borderRadius: 8,
          textDecoration: 'none',
        }}>VIP Access</Link>
      </nav>

      {/* HERO */}
      <section style={{
        position: 'relative', padding: 'clamp(100px, 15vw, 140px) clamp(16px, 4vw, 24px) clamp(60px, 8vw, 100px)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translate(-50%,-30%)', width: 1000, height: 1000, background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,80,80,0.04) 0%, transparent 55%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'start' }}>
          {/* Left: Copy */}
          <div>
            <div style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#ff6b6b',
              background: 'rgba(255,107,107,0.08)', padding: '5px 14px', borderRadius: 20,
              border: '1px solid rgba(255,107,107,0.15)', marginBottom: 24,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              HIPAA 2026 NPRM — Compliance Deadline: January 2027
            </div>
            <h1 style={{
              fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 800,
              letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px',
            }}>
              Is Your Healthcare Website Ready for{' '}
              <span style={{
                background: 'linear-gradient(135deg, #7ed957 0%, #00d4ff 50%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
              }}>HIPAA 2026</span>?
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, margin: '0 0 32px' }}>
              The new HIPAA Security Rule eliminates the distinction between Required and Addressable safeguards.
              Most healthcare websites will fail. Find out where you stand in 30 seconds.
            </p>
          </div>

          {/* Right: Form */}
          <div style={{
            padding: 'clamp(20px, 3vw, 32px)', borderRadius: 20,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(126,217,87,0.12)',
            boxShadow: '0 20px 80px rgba(0,0,0,0.4)',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Free HIPAA Readiness Score</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>63-point assessment in 30 seconds</p>
            <ScanForm />
          </div>
        </div>
      </section>

      {/* WHAT WE CHECK */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, marginBottom: 8 }}>
              63 Compliance Checks Across 5 Categories
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 600, margin: '0 auto' }}>
              Every check maps to a specific HIPAA Security Rule section and its 2026 NPRM equivalent.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {CATEGORIES.map(c => (
              <div key={c.title} style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}>
                <img src={c.svg} alt={c.title} style={{ width: 48, height: 48, marginBottom: 12 }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 12 }}>{c.desc}</p>
                <div style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#7ed957',
                  background: 'rgba(126,217,87,0.08)', padding: '4px 12px', borderRadius: 20,
                  border: '1px solid rgba(126,217,87,0.15)',
                }}>
                  {c.count} checks
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY THIS MATTERS */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, marginBottom: 8 }}>
              The 2026 NPRM Makes Nearly All Safeguards Mandatory
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 640, margin: '0 auto' }}>
              What was once optional is now required. Here is what changes under the proposed rule.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requirement</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Rule</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#ff6b6b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2026 NPRM</th>
                </tr>
              </thead>
              <tbody>
                {CHANGES_TABLE.map(r => (
                  <tr key={r.req}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 600 }}>{r.req}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>{r.current}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#ff6b6b', fontWeight: 600 }}>{r.nprm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            Compliance deadline: ~January 2027. Penalties:{' '}
            <span style={{ color: '#ff6b6b', fontWeight: 600 }}>up to $1.5M per violation category per year</span>.
          </p>
        </div>
      </section>

      {/* DUAL SCORING */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, marginBottom: 8 }}>
            Your Website Gets <span style={{
              background: 'linear-gradient(135deg, #7ed957 0%, #00d4ff 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
            }}>Two Scores</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 600, margin: '0 auto 40px' }}>
            We assess your compliance against both the current rule and the proposed 2026 changes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            <div style={{ padding: 32, borderRadius: 16, background: 'rgba(126,217,87,0.04)', border: '1px solid rgba(126,217,87,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7ed957', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Score 1</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Current HIPAA Security Rule</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                How you comply today against the 2013 Security Rule. Addressable specifications are scored with partial credit.
              </p>
            </div>
            <div style={{ padding: 32, borderRadius: 16, background: 'rgba(255,107,107,0.04)', border: '1px solid rgba(255,107,107,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Score 2</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>2026 NPRM Readiness</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                How you will comply under the new rules. No partial credit — every safeguard is now mandatory.
              </p>
            </div>
          </div>
          <p style={{ marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Most healthcare organizations score 20-40 points lower on the 2026 NPRM track.
          </p>
        </div>
      </section>

      {/* STATE-SPECIFIC COMPLIANCE */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, marginBottom: 8 }}>
              State Laws Add Additional Requirements
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 600, margin: '0 auto' }}>
              HIPAA sets the floor. Many states add stricter requirements for healthcare data protection.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {STATE_LAWS.map(s => (
              <div key={s.state} style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(126,217,87,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#7ed957',
                  }}>{s.state.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.state}</div>
                    <div style={{ fontSize: 11, color: '#7ed957', fontWeight: 600 }}>{s.law}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{s.requirement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FAQ_ITEMS.map((f, i) => (
              <details key={i} style={{
                padding: '20px 24px', borderRadius: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
              }}>
                <summary style={{ fontSize: 15, fontWeight: 700, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {f.q}
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18, flexShrink: 0, marginLeft: 12 }}>+</span>
                </summary>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{
        padding: 'clamp(60px, 8vw, 100px) clamp(16px, 4vw, 24px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(126,217,87,0.03) 100%)',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: 12 }}>
            Get Your Free HIPAA 2026 Score
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.7 }}>
            51-point assessment. Two scores. 30 seconds. No login required.
          </p>
          <ScanForm id="bottom-form" />
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'No PHI Collected', icon: ShieldCheck },
              { label: 'Passive Scan Only', icon: Search },
              { label: 'Results in 30 Seconds', icon: Zap },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                <b.icon size={14} style={{ color: '#7ed957' }} /> {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>&copy; 2026 RocketOpp LLC. Powered by 0nMCP.</span>
        <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 20px)', flexWrap: 'wrap' }}>
          <Link href="/platform" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/connections" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/request" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Request Access</Link>
          <Link href="/launch-party" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Launch Party</Link>
          <a href="https://0nmcp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>0nMCP</a>
          <a href="mailto:mike@rocketopp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hipaa-nav-links { display: none !important; }
          .hipaa-mobile-menu { display: flex !important; }
        }
        details summary::-webkit-details-marker { display: none; }
        details[open] summary span:last-child { transform: rotate(45deg); }
        select option { background: #0a1020; color: #fff; }
      `}</style>
    </div>
  )
}
