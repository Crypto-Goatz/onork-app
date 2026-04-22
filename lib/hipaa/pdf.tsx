/**
 * HIPAA Findings PDF — "laymen terms" summary.
 *
 * Rendered server-side via @react-pdf/renderer. The PDF is what ships with
 * the first confirmation email. Explains, in plain English, what failed
 * and WHY HIPAA would flag it.
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

interface HipaaPdfInput {
  companyName: string
  publicUrl: string
  dashboardUrl: string
  currentGrade: string
  currentRuleScore: number
  nprmGrade: string
  nprm2026Score: number
  criticalFindings: number
  highFindings: number
  topFindings: { name: string; severity: string; detail: string }[]
  scanDate: string
  contactEmail: string
  creditHidden?: boolean
}

const colors = {
  bg: '#ffffff',
  ink: '#0a0a0a',
  muted: '#5f6773',
  line: '#e5e7eb',
  brand: '#ff6b35',
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#0ea5e9',
  ok: '#16a34a',
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10.5, color: colors.ink, lineHeight: 1.4 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1.2 },
  kicker: { fontSize: 9, color: colors.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  p: { marginBottom: 6 },
  small: { fontSize: 9, color: colors.muted },
  hr: { borderBottomWidth: 1, borderBottomColor: colors.line, marginTop: 8, marginBottom: 8 },
  gradeRow: { flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 4 },
  gradeCard: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 12 },
  gradeNumber: { fontSize: 30, fontWeight: 700 },
  gradeLetter: { fontSize: 22, fontWeight: 700, marginLeft: 6 },
  counterRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 16 },
  counter: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 8, flex: 1 },
  counterLabel: { fontSize: 8, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  counterValue: { fontSize: 16, fontWeight: 700, marginTop: 2 },
  finding: { marginBottom: 10, paddingLeft: 10, borderLeftWidth: 3 },
  findingTitle: { fontWeight: 700, marginBottom: 2 },
  findingDetail: { color: colors.muted, marginBottom: 4 },
  whyLabel: { fontWeight: 700, color: colors.ink },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, fontSize: 8, color: colors.muted, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, textAlign: 'center' },
  brandBar: { height: 4, backgroundColor: colors.brand, marginBottom: 16, borderRadius: 2 },
})

function sevColor(sev: string): string {
  const s = sev.toLowerCase()
  if (s === 'critical') return colors.critical
  if (s === 'high')     return colors.high
  if (s === 'medium')   return colors.medium
  return colors.low
}

function laymensReason(name: string, severity: string): string {
  const sev = severity.toLowerCase()
  const n = name.toLowerCase()
  if (n.includes('https') || n.includes('tls') || n.includes('encryption in transit'))
    return 'HIPAA requires all Protected Health Information (PHI) to be encrypted in transit. Without HTTPS, anyone on the network can read patient data as it travels between their browser and your site.'
  if (n.includes('login') || n.includes('authentication') || n.includes('password'))
    return 'The Security Rule requires strong authentication controls. Weak login pages (no MFA, no rate limiting, no audit trail) are the #1 way PHI gets exposed in a breach.'
  if (n.includes('audit') || n.includes('log'))
    return 'HIPAA mandates audit logs of who accessed what, and when. Missing or weak logging means you cannot prove compliance during an OCR audit and cannot respond to a breach notification.'
  if (n.includes('encryption at rest') || n.includes('database'))
    return 'The 2026 NPRM explicitly requires encryption at rest for PHI. If your database is unencrypted, a server breach becomes a reportable incident — with potential fines up to $1.9M/year per violation.'
  if (n.includes('session') || n.includes('cookie'))
    return 'Session hijacking is a leading vector for unauthorized PHI access. Secure/HttpOnly cookies and session timeout are baseline controls the Security Rule expects.'
  if (n.includes('consent') || n.includes('privacy') || n.includes('notice'))
    return 'The Privacy Rule requires a Notice of Privacy Practices to be prominently displayed. Missing it opens you to enforcement action from HHS OCR, independent of any breach.'
  if (n.includes('form') || n.includes('contact'))
    return 'Any form that collects PHI (symptoms, diagnoses, provider names) must be encrypted end-to-end and transmitted over TLS. Plain-text form submissions are a fast-track to a reportable incident.'
  if (sev === 'critical') return 'This is flagged critical because it maps to a Security Rule requirement that the 2026 NPRM is tightening — failure here is the kind of finding that triggers a formal audit.'
  if (sev === 'high')     return 'Under the 2026 NPRM this moves from "addressable" to "required" — meaning you must fix it or document why it is not technically feasible. Most orgs cannot justify the latter.'
  if (sev === 'medium')   return 'Flagged medium because it does not block certification, but it is the sort of gap auditors use to escalate scope — and every adjacent finding compounds risk.'
  return 'This control is part of the HIPAA Security Rule baseline. Fixing it now is dramatically cheaper than remediating after a breach.'
}

export function buildHipaaPdf(input: HipaaPdfInput): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.brandBar} />
        {!input.creditHidden && (
          <Text style={styles.kicker}>0nCore HIPAA Readiness · Findings Summary</Text>
        )}
        <Text style={styles.h1}>{input.companyName}</Text>
        <Text style={styles.small}>
          Scan performed {new Date(input.scanDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Recipient: {input.contactEmail}
        </Text>
        <Text style={styles.small}>Sites analyzed: {input.publicUrl} · {input.dashboardUrl}</Text>

        <View style={styles.hr} />

        <Text style={styles.h2}>Executive Score</Text>
        <View style={styles.gradeRow}>
          <View style={styles.gradeCard}>
            <Text style={styles.small}>CURRENT HIPAA RULE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={[styles.gradeNumber, { color: sevColor(input.currentRuleScore < 60 ? 'critical' : input.currentRuleScore < 80 ? 'high' : 'low') }]}>{input.currentRuleScore}</Text>
              <Text style={[styles.gradeLetter, { color: colors.muted }]}>/ 100 · {input.currentGrade}</Text>
            </View>
          </View>
          <View style={styles.gradeCard}>
            <Text style={styles.small}>2026 NPRM (UPCOMING)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <Text style={[styles.gradeNumber, { color: sevColor(input.nprm2026Score < 60 ? 'critical' : input.nprm2026Score < 80 ? 'high' : 'low') }]}>{input.nprm2026Score}</Text>
              <Text style={[styles.gradeLetter, { color: colors.muted }]}>/ 100 · {input.nprmGrade}</Text>
            </View>
          </View>
        </View>

        <View style={styles.counterRow}>
          <View style={styles.counter}>
            <Text style={styles.counterLabel}>Critical</Text>
            <Text style={[styles.counterValue, { color: colors.critical }]}>{input.criticalFindings}</Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterLabel}>High</Text>
            <Text style={[styles.counterValue, { color: colors.high }]}>{input.highFindings}</Text>
          </View>
        </View>

        <Text style={styles.h2}>What We Found — In Plain English</Text>
        <Text style={styles.p}>
          We ran a live scan across your public site and your dashboard. Below are the top gaps we detected, ranked by severity. Each one is explained in plain English — including <Text style={styles.whyLabel}>why HIPAA would flag it</Text>.
        </Text>

        {input.topFindings.map((f, i) => (
          <View key={i} style={[styles.finding, { borderLeftColor: sevColor(f.severity) }]}>
            <Text style={styles.findingTitle}>{i + 1}. {f.name} <Text style={[styles.small, { color: sevColor(f.severity) }]}> · {f.severity.toUpperCase()}</Text></Text>
            <Text style={styles.findingDetail}>{f.detail}</Text>
            <Text style={styles.p}><Text style={styles.whyLabel}>Why HIPAA would fail this: </Text>{laymensReason(f.name, f.severity)}</Text>
          </View>
        ))}

        <View style={styles.hr} />

        <Text style={styles.h2}>What Happens Next</Text>
        <Text style={styles.p}>
          Your <Text style={styles.whyLabel}>full readiness report</Text> is being generated now. You will receive it within 60 minutes to {input.contactEmail}. It includes:
        </Text>
        <Text style={styles.p}>• A complete line-item list of every control we checked (not just the top 5)</Text>
        <Text style={styles.p}>• Prioritised remediation plan with time + difficulty estimates per fix</Text>
        <Text style={styles.p}>• State-specific overlay ({/* from input */}your primary state) — which laws stack on top of federal HIPAA</Text>
        <Text style={styles.p}>• A 2026 NPRM delta — what changes in the upcoming rule and what you need to do before enforcement starts</Text>

        <Text style={styles.footer}>
          This summary is informational. It does not constitute legal advice. A full readiness report from a qualified HIPAA assessor will be sent separately.
          {!input.creditHidden && '\nPowered by 0nCore · 0ncore.com'}
        </Text>
      </Page>
    </Document>
  )

  return renderToBuffer(doc) as Promise<Buffer>
}
