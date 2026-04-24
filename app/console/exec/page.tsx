'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ──

interface ExecContact {
  id: string
  name: string
  company: string
  stage: string
  current_score: number
  score_band: string
  deal_value: string
  deal_value_cents: number
  variable_values: Record<string, number>
  is_flagged: boolean
  flag_reason: string
  flag_severity: string
  assigned_to: string
  stage_entered_at: string
  crm_deal_id: string
  notes: string
}

interface StageConfig {
  name: string
  ring: number
  color: string
  targetDays: number
}

interface Particle {
  contact: ExecContact
  stage: StageConfig
  angle: number
  orbitSpeed: number
  r: number
  dotR: number
  trailPoints: { x: number; y: number }[]
  pulsePhase: number
  hasTail: boolean
  tailColor: string
}

// ── Constants ──

const DEFAULT_STAGES: StageConfig[] = [
  { name: 'New', ring: 1, color: '#60a5fa', targetDays: 2 },
  { name: 'In Progress', ring: 2, color: '#a78bfa', targetDays: 5 },
  { name: 'Review', ring: 3, color: '#f5c518', targetDays: 3 },
  { name: 'Complete', ring: 4, color: '#6EE05A', targetDays: 30 },
]

const MIN_RING_R = 100
const RING_GAP = 90

function scoreColor(score: number) {
  if (score >= 80) return '#6EE05A'
  if (score >= 60) return '#f5c518'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function scoreGlow(score: number) {
  if (score >= 80) return 'rgba(110,224,90,0.6)'
  if (score >= 60) return 'rgba(245,197,24,0.5)'
  if (score >= 40) return 'rgba(249,115,22,0.5)'
  return 'rgba(239,68,68,0.7)'
}

function bandLabel(s: number) {
  if (s >= 80) return 'NOMINAL'
  if (s >= 60) return 'MONITOR'
  if (s >= 40) return 'REVIEW'
  return 'CRITICAL'
}

function valToRadius(val: number, min: number, max: number) {
  const t = Math.min(Math.max((val - min) / (max - min || 1), 0), 1)
  return 7 + t * 10
}

// ── Stars ──
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random(), y: Math.random(), r: Math.random() * 1.2, a: Math.random() * 0.6 + 0.1,
}))

// ── Demo data (used when no API data) ──
const DEMO_CONTACTS: ExecContact[] = [
  { id: '1', name: 'Sarah Chen', company: 'Hartwell Group', stage: 'Review', current_score: 38, score_band: 'CRITICAL', deal_value: '$18,400', deal_value_cents: 1840000, variable_values: { dream_outcome: 19, perceived_likelihood: 12, days_in_stage: 5, friction_score: 3 }, is_flagged: true, flag_reason: 'Score 38 — no contact 48hrs', flag_severity: 'critical', assigned_to: 'Sarah K.', stage_entered_at: new Date(Date.now() - 5 * 86400000).toISOString(), crm_deal_id: '#HD-4821', notes: '' },
  { id: '2', name: 'Marcus Webb', company: 'Meridian Capital', stage: 'Complete', current_score: 91, score_band: 'NOMINAL', deal_value: '$34,200', deal_value_cents: 3420000, variable_values: { dream_outcome: 24, perceived_likelihood: 22, days_in_stage: 8, friction_score: 2 }, is_flagged: false, flag_reason: '', flag_severity: '', assigned_to: 'Derek L.', stage_entered_at: new Date(Date.now() - 8 * 86400000).toISOString(), crm_deal_id: '#MC-2209', notes: '' },
  { id: '3', name: 'Dr. Priya Nair', company: 'Praxis Medical', stage: 'New', current_score: 84, score_band: 'NOMINAL', deal_value: '$9,750', deal_value_cents: 975000, variable_values: { dream_outcome: 22, perceived_likelihood: 20, days_in_stage: 2, friction_score: 4 }, is_flagged: false, flag_reason: '', flag_severity: '', assigned_to: 'James O.', stage_entered_at: new Date(Date.now() - 2 * 86400000).toISOString(), crm_deal_id: '#PM-5534', notes: '' },
  { id: '4', name: 'Tom Vance', company: 'Vance Logistics', stage: 'In Progress', current_score: 29, score_band: 'CRITICAL', deal_value: '$61,000', deal_value_cents: 6100000, variable_values: { dream_outcome: 11, perceived_likelihood: 8, days_in_stage: 19, friction_score: 22 }, is_flagged: true, flag_reason: 'CTR 0.4% — rewrite required', flag_severity: 'critical', assigned_to: 'Anya P.', stage_entered_at: new Date(Date.now() - 19 * 86400000).toISOString(), crm_deal_id: '#VL-1102', notes: '' },
  { id: '5', name: 'Jen Orion', company: 'Orion Realty', stage: 'Complete', current_score: 96, score_band: 'NOMINAL', deal_value: '$4,800', deal_value_cents: 480000, variable_values: { dream_outcome: 24, perceived_likelihood: 24, days_in_stage: 14, friction_score: 1 }, is_flagged: false, flag_reason: '', flag_severity: '', assigned_to: 'Sarah K.', stage_entered_at: new Date(Date.now() - 14 * 86400000).toISOString(), crm_deal_id: '#OR-0087', notes: '' },
  { id: '6', name: 'Alex Solace', company: 'Solace Health', stage: 'In Progress', current_score: 71, score_band: 'MONITOR', deal_value: '$22,000', deal_value_cents: 2200000, variable_values: { dream_outcome: 21, perceived_likelihood: 16, days_in_stage: 3, friction_score: 9 }, is_flagged: true, flag_reason: 'Proof score low — guarantee missing', flag_severity: 'warning', assigned_to: 'Mike R.', stage_entered_at: new Date(Date.now() - 3 * 86400000).toISOString(), crm_deal_id: '#SH-7743', notes: '' },
  { id: '7', name: 'Brad Apex', company: 'Apex Brands', stage: 'Review', current_score: 58, score_band: 'REVIEW', deal_value: '$22,100', deal_value_cents: 2210000, variable_values: { dream_outcome: 17, perceived_likelihood: 14, days_in_stage: 3, friction_score: 12 }, is_flagged: true, flag_reason: 'Status-giver absent', flag_severity: 'warning', assigned_to: 'Derek L.', stage_entered_at: new Date(Date.now() - 3 * 86400000).toISOString(), crm_deal_id: '#AB-3391', notes: '' },
  { id: '8', name: 'Chris Crane', company: 'Crane & Co.', stage: 'Review', current_score: 63, score_band: 'MONITOR', deal_value: '$7,400', deal_value_cents: 740000, variable_values: { dream_outcome: 18, perceived_likelihood: 16, days_in_stage: 4, friction_score: 12 }, is_flagged: true, flag_reason: 'Compliance suppressed ~30%', flag_severity: 'warning', assigned_to: 'James O.', stage_entered_at: new Date(Date.now() - 4 * 86400000).toISOString(), crm_deal_id: '#CC-8821', notes: '' },
  { id: '9', name: 'Natalie Park', company: 'Prism Digital', stage: 'In Progress', current_score: 77, score_band: 'MONITOR', deal_value: '$15,500', deal_value_cents: 1550000, variable_values: { dream_outcome: 20, perceived_likelihood: 18, days_in_stage: 1, friction_score: 5 }, is_flagged: false, flag_reason: '', flag_severity: '', assigned_to: 'Derek L.', stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(), crm_deal_id: '#PD-6612', notes: '' },
  { id: '10', name: 'Ryan Foster', company: 'Peak Performance', stage: 'New', current_score: 88, score_band: 'NOMINAL', deal_value: '$12,800', deal_value_cents: 1280000, variable_values: { dream_outcome: 23, perceived_likelihood: 21, days_in_stage: 1, friction_score: 3 }, is_flagged: false, flag_reason: '', flag_severity: '', assigned_to: 'Anya P.', stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(), crm_deal_id: '#PP-9901', notes: '' },
  { id: '11', name: 'Diana Walsh', company: 'Walsh & Partners', stage: 'In Progress', current_score: 45, score_band: 'REVIEW', deal_value: '$8,900', deal_value_cents: 890000, variable_values: { dream_outcome: 14, perceived_likelihood: 10, days_in_stage: 4, friction_score: 16 }, is_flagged: true, flag_reason: 'Dream Outcome vague language', flag_severity: 'warning', assigned_to: 'Sarah K.', stage_entered_at: new Date(Date.now() - 4 * 86400000).toISOString(), crm_deal_id: '#WP-2241', notes: '' },
]

const AI_TICKS = [
  { icon: '🔴', who: 'Vance Logistics', msg: 'Score 29 — CTR 0.4%. Orbit velocity near zero. Immediate intervention required.' },
  { icon: '🟢', who: 'Meridian Capital', msg: 'Score 91 — orbiting at peak velocity. No action needed.' },
  { icon: '🟡', who: 'Apex Brands', msg: 'Score 58 — creative 22 days in market. Slowing.' },
  { icon: '💡', who: 'K4 Pattern', msg: 'B2B contacts in Review stall 2.3× faster without Trust-layer fix.' },
  { icon: '🟢', who: 'Orion Realty', msg: 'Score 96 — fastest orbit in portfolio. Referral ask ready.' },
  { icon: '🔴', who: 'Hartwell Group', msg: 'Score 38 — no contact 48hrs. Escalate now.' },
]

// ── Component ──

export default function ExecOrbitPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [contacts, setContacts] = useState<ExecContact[]>([])
  const [stages] = useState<StageConfig[]>(DEFAULT_STAGES)
  const [selected, setSelected] = useState<ExecContact | null>(null)
  const [ticks, setTicks] = useState<{ icon: string; who: string; msg: string }[]>([])
  const [loading, setLoading] = useState(true)
  const particlesRef = useRef<Particle[]>([])
  const selectedIdRef = useRef<string | null>(null)
  const timeRef = useRef(0)
  const animRef = useRef<number>(0)
  const sizeRef = useRef({ W: 0, H: 0, CX: 0, CY: 0 })

  // Load real data — NO demo fallback
  useEffect(() => {
    fetch('/api/exec/contacts')
      .then(r => r.json())
      .then(d => {
        if (d.contacts?.length) setContacts(d.contacts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Init particles when contacts change
  const initParticles = useCallback(() => {
    const byStage: Record<string, ExecContact[]> = {}
    for (const c of contacts) {
      if (!byStage[c.stage]) byStage[c.stage] = []
      byStage[c.stage].push(c)
    }

    const minVal = Math.min(...contacts.map(c => c.deal_value_cents || 1))
    const maxVal = Math.max(...contacts.map(c => c.deal_value_cents || 1))

    const ps: Particle[] = []
    for (const stage of stages) {
      const stageContacts = byStage[stage.name] || []
      stageContacts.forEach((c, i) => {
        const baseAngle = (i / (stageContacts.length || 1)) * Math.PI * 2
        const speedMult = 0.3 + (c.current_score / 100) * 0.7
        ps.push({
          contact: c, stage,
          angle: baseAngle + (Math.random() - 0.5) * 0.3,
          orbitSpeed: (0.00015 + Math.random() * 0.0001) * speedMult,
          r: MIN_RING_R + (stage.ring - 1) * RING_GAP,
          dotR: valToRadius(c.deal_value_cents || 5000, minVal, maxVal),
          trailPoints: [],
          pulsePhase: Math.random() * Math.PI * 2,
          hasTail: c.is_flagged,
          tailColor: c.flag_severity === 'critical' ? '#ef4444' : '#f5c518',
        })
      })
    }
    particlesRef.current = ps
  }, [contacts, stages])

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      const W = wrap!.offsetWidth
      const H = wrap!.offsetHeight
      canvas!.width = W
      canvas!.height = H
      sizeRef.current = { W, H, CX: W / 2, CY: H / 2 }
      initParticles()
    }

    function draw() {
      const { W, H, CX, CY } = sizeRef.current
      if (!ctx || !W) return
      ctx.clearRect(0, 0, W, H)

      const t = timeRef.current

      // ── Twinkling stars ──
      for (const s of stars) {
        const twinkle = s.a * (0.6 + 0.4 * Math.sin(t * 1.5 + s.x * 20 + s.y * 30))
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,220,255,${twinkle})`
        ctx.fill()
      }

      // ── Deep space nebula glow behind center ──
      const nebula = ctx.createRadialGradient(CX, CY, 0, CX, CY, MIN_RING_R + stages.length * RING_GAP + 40)
      nebula.addColorStop(0, 'rgba(110,224,90,0.04)')
      nebula.addColorStop(0.3, 'rgba(30,80,40,0.02)')
      nebula.addColorStop(0.6, 'rgba(20,40,80,0.015)')
      nebula.addColorStop(1, 'transparent')
      ctx.fillStyle = nebula
      ctx.fillRect(0, 0, W, H)

      // ── Orbit rings with glow ──
      for (const stage of stages) {
        const r = MIN_RING_R + (stage.ring - 1) * RING_GAP

        // Subtle glow ring
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2)
        ctx.strokeStyle = stage.color + '10'; ctx.lineWidth = 6; ctx.stroke()

        // Main dashed ring
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2)
        ctx.strokeStyle = stage.color + '30'; ctx.lineWidth = 1
        ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([])

        // Stage label with backdrop
        const lx = CX; const ly = CY - r - 14
        const labelText = stage.name.toUpperCase()
        ctx.font = '9px JetBrains Mono'
        const tw = ctx.measureText(labelText).width
        ctx.fillStyle = 'rgba(4,6,13,0.7)'
        ctx.fillRect(lx - tw / 2 - 6, ly - 8, tw + 12, 22)
        ctx.fillStyle = stage.color + 'cc'
        ctx.textAlign = 'center'
        ctx.fillText(labelText, lx, ly)

        const sc = contacts.filter(c => c.stage === stage.name)
        if (sc.length) {
          const avg = Math.round(sc.reduce((s, c) => s + c.current_score, 0) / sc.length)
          ctx.font = '8px JetBrains Mono'
          ctx.fillStyle = scoreColor(avg) + 'cc'
          ctx.fillText('avg ' + avg, lx, ly + 11)
        }
      }

      // ── Sun with radial gradient + animated corona ──
      const pulse = Math.sin(t * 2) * 0.5 + 0.5

      // Corona layers
      for (let i = 5; i >= 1; i--) {
        const coronaR = 20 + i * 12 + pulse * i * 2
        const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, coronaR)
        grad.addColorStop(0, `rgba(110,224,90,${0.03 * i})`)
        grad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(CX, CY, coronaR, 0, Math.PI * 2)
        ctx.fillStyle = grad; ctx.fill()
      }

      // Rotating energy ring
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.3)
      ctx.beginPath(); ctx.arc(0, 0, 34 + pulse * 3, 0, Math.PI * 1.2)
      ctx.strokeStyle = `rgba(110,224,90,${0.12 + pulse * 0.08})`; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, 34 + pulse * 3, Math.PI * 1.4, Math.PI * 2.2)
      ctx.strokeStyle = `rgba(110,224,90,${0.08 + pulse * 0.06})`; ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()

      // Core sphere with gradient
      const sunGrad = ctx.createRadialGradient(CX - 4, CY - 4, 2, CX, CY, 22)
      sunGrad.addColorStop(0, '#1a4a1a')
      sunGrad.addColorStop(0.5, '#0d2a0d')
      sunGrad.addColorStop(1, '#0a1a0a')
      ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2)
      ctx.fillStyle = sunGrad; ctx.fill()
      ctx.strokeStyle = '#6EE05A'; ctx.lineWidth = 1.5; ctx.stroke()

      // 0n logo
      ctx.font = 'bold 11px JetBrains Mono'; ctx.fillStyle = '#6EE05A'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('0n', CX, CY)
      ctx.textBaseline = 'alphabetic'

      // ── Particles with gradient fills ──
      for (const p of particlesRef.current) {
        p.angle += p.orbitSpeed
        const x = CX + Math.cos(p.angle) * p.r
        const y = CY + Math.sin(p.angle) * p.r

        // Smooth comet tail with gradient
        if (p.hasTail) {
          p.trailPoints.unshift({ x, y })
          if (p.trailPoints.length > 24) p.trailPoints.pop()
          if (p.trailPoints.length >= 2) {
            ctx.beginPath()
            ctx.moveTo(p.trailPoints[0].x, p.trailPoints[0].y)
            for (let i = 1; i < p.trailPoints.length; i++) {
              const prev = p.trailPoints[i - 1]
              const curr = p.trailPoints[i]
              const cpx = (prev.x + curr.x) / 2
              const cpy = (prev.y + curr.y) / 2
              ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy)
            }
            const tailGrad = ctx.createLinearGradient(
              p.trailPoints[0].x, p.trailPoints[0].y,
              p.trailPoints[p.trailPoints.length - 1].x, p.trailPoints[p.trailPoints.length - 1].y
            )
            tailGrad.addColorStop(0, p.tailColor + '60')
            tailGrad.addColorStop(1, p.tailColor + '00')
            ctx.strokeStyle = tailGrad
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.stroke()
          }
        }

        const c = p.contact
        const color = scoreColor(c.current_score)
        const glow = scoreGlow(c.current_score)
        const isSel = selectedIdRef.current === c.id
        const isCrit = c.current_score < 40

        // Critical pulse rings
        if (isCrit) {
          const pp = Math.sin(t * 4 + p.pulsePhase) * 0.5 + 0.5
          for (let ring = 0; ring < 2; ring++) {
            const rr = p.dotR + 4 + pp * 5 + ring * 4
            ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(239,68,68,${(0.25 - ring * 0.1) * (0.5 + pp * 0.5)})`
            ctx.lineWidth = 1; ctx.stroke()
          }
        }

        // Outer glow with radial gradient
        const glowR = p.dotR + (isSel ? 14 : 8)
        const glowGrad = ctx.createRadialGradient(x, y, p.dotR * 0.5, x, y, glowR)
        glowGrad.addColorStop(0, glow.replace(/[\d.]+\)$/, isSel ? '0.3)' : '0.15)'))
        glowGrad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2)
        ctx.fillStyle = glowGrad; ctx.fill()

        // Selection ring with rotation
        if (isSel) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5)
          ctx.beginPath(); ctx.arc(0, 0, p.dotR + 8, 0, Math.PI * 1.5)
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke()
          ctx.beginPath(); ctx.arc(0, 0, p.dotR + 8, Math.PI * 1.7, Math.PI * 2.8)
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke()
          ctx.restore()
        }

        // Main dot with radial gradient
        const dotGrad = ctx.createRadialGradient(x - p.dotR * 0.3, y - p.dotR * 0.3, 0, x, y, p.dotR)
        dotGrad.addColorStop(0, lightenColor(color, 30))
        dotGrad.addColorStop(0.7, color)
        dotGrad.addColorStop(1, darkenColor(color, 20))
        ctx.beginPath(); ctx.arc(x, y, p.dotR, 0, Math.PI * 2)
        ctx.fillStyle = dotGrad; ctx.shadowColor = glow; ctx.shadowBlur = isSel ? 25 : 12
        ctx.fill(); ctx.shadowBlur = 0

        // Specular highlight
        ctx.beginPath(); ctx.arc(x - p.dotR * 0.25, y - p.dotR * 0.25, p.dotR * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill()

        // Score text
        if (p.dotR >= 9) {
          ctx.font = `bold ${Math.round(p.dotR * 0.8)}px JetBrains Mono`
          ctx.fillStyle = c.current_score >= 60 ? '#04060d' : '#fff'
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(String(c.current_score), x, y + 0.5); ctx.textBaseline = 'alphabetic'
        }

        // Company label with shadow
        if (isSel || p.dotR >= 12) {
          const label = c.company.length > 16 ? c.company.slice(0, 15) + '…' : c.company
          ctx.font = '500 9px DM Sans'
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.textAlign = 'center'
          ctx.fillText(label, x + 1, y + p.dotR + 13)
          ctx.fillStyle = 'rgba(228,239,255,0.9)'
          ctx.fillText(label, x, y + p.dotR + 12)
        }
      }

      timeRef.current += 0.016
      animRef.current = requestAnimationFrame(draw)
    }

    function lightenColor(hex: string, pct: number): string {
      const num = parseInt(hex.slice(1), 16)
      const r = Math.min(255, (num >> 16) + pct)
      const g = Math.min(255, ((num >> 8) & 0xff) + pct)
      const b = Math.min(255, (num & 0xff) + pct)
      return `rgb(${r},${g},${b})`
    }

    function darkenColor(hex: string, pct: number): string {
      const num = parseInt(hex.slice(1), 16)
      const r = Math.max(0, (num >> 16) - pct)
      const g = Math.max(0, ((num >> 8) & 0xff) - pct)
      const b = Math.max(0, (num & 0xff) - pct)
      return `rgb(${r},${g},${b})`
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [contacts, stages, initParticles])

  // Click handler
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { CX, CY } = sizeRef.current

      let closest: Particle | null = null
      let closestDist = Infinity
      for (const p of particlesRef.current) {
        const x = CX + Math.cos(p.angle) * p.r
        const y = CY + Math.sin(p.angle) * p.r
        const dist = Math.hypot(mx - x, my - y)
        if (dist < closestDist && dist < p.dotR + 14) { closestDist = dist; closest = p }
      }
      if (closest) {
        selectedIdRef.current = closest.contact.id
        setSelected(closest.contact)
      } else {
        selectedIdRef.current = null
        setSelected(null)
      }
    }
    const moveHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top
      const { CX, CY } = sizeRef.current
      let hit = false
      for (const p of particlesRef.current) {
        const x = CX + Math.cos(p.angle) * p.r; const y = CY + Math.sin(p.angle) * p.r
        if (Math.hypot(mx - x, my - y) < p.dotR + 14) { hit = true; break }
      }
      canvas.style.cursor = hit ? 'pointer' : 'default'
    }
    canvas.addEventListener('click', handler)
    canvas.addEventListener('mousemove', moveHandler)
    return () => { canvas.removeEventListener('click', handler); canvas.removeEventListener('mousemove', moveHandler) }
  }, [])

  const critCount = contacts.filter(c => c.score_band === 'CRITICAL').length
  const flagCount = contacts.filter(c => c.is_flagged).length
  const activeCount = contacts.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#04060d', color: '#b8cce0', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Topbar */}
      <div style={{
        height: 50, background: 'rgba(4,6,13,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0, zIndex: 50,
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 700 }}>
          <span style={{ color: '#6EE05A' }}>0n</span><span style={{ color: '#e4efff' }}>Exec</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3a4f6a', letterSpacing: '0.08em' }}>ORBIT VIEW</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(110,224,90,0.08)', border: '1px solid rgba(110,224,90,0.25)', color: '#6EE05A' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6EE05A', boxShadow: '0 0 5px #6EE05A', display: 'inline-block', marginRight: 4, animation: 'breathe 2.5s infinite' }} />
            {activeCount} Active
          </span>
          {critCount > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}>{critCount} Critical</span>}
          {flagCount > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.22)', color: '#f5c518' }}>{flagCount} Flagged</span>}
        </div>
      </div>

      <style>{`@keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.3} } @keyframes tickerIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Empty State — shown when no contacts */}
      {!loading && contacts.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
              background: 'rgba(110,224,90,0.06)', border: '1px solid rgba(110,224,90,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6EE05A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="7" strokeDasharray="4 3" opacity="0.4" />
                <circle cx="12" cy="12" r="11" strokeDasharray="3 5" opacity="0.2" />
              </svg>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4efff', marginBottom: 8 }}>
              Your orbit is empty
            </h2>
            <p style={{ fontSize: 14, color: '#5a6f8a', lineHeight: 1.7, marginBottom: 32 }}>
              0nExec visualizes your deals as orbiting particles. Each contact gets a health score — fast orbits mean healthy deals, slow orbits mean trouble.
              <br /><br />
              <strong style={{ color: '#8a9fc0' }}>To get started:</strong> Create a scoring formula, set up an orbit, and connect your CRM contacts. They'll appear here automatically.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/console/exec/formulas/new" style={{
                padding: '10px 20px', borderRadius: 10,
                background: '#6EE05A', color: '#04060d',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}>
                Create Your First Formula
              </a>
              <a href="/console/exec/orbits" style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#8a9fc0', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                Set Up an Orbit
              </a>
            </div>

            <div style={{ marginTop: 40, padding: '16px 20px', borderRadius: 12, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.1em', marginBottom: 8 }}>HOW IT WORKS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { step: '1', text: 'Create a formula that scores what matters to your business' },
                  { step: '2', text: 'Create an orbit (pipeline) and assign the formula to it' },
                  { step: '3', text: 'Add contacts — they score automatically in real-time' },
                  { step: '4', text: 'Watch the AI detect patterns and suggest actions' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</span>
                    <span style={{ fontSize: 12, color: '#5a6f8a', lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main — only show when contacts exist */}
      {contacts.length > 0 && <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas */}
        <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(4,6,13,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a4f6a', marginBottom: 8 }}>Score Band</div>
            {[
              { color: '#6EE05A', label: 'Nominal (80–100)' },
              { color: '#f5c518', label: 'Monitor (60–79)' },
              { color: '#f97316', label: 'Review (40–59)' },
              { color: '#ef4444', label: 'Critical (<40)' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, boxShadow: `0 0 6px ${b.color}80`, flexShrink: 0 }} />
                {b.label}
              </div>
            ))}
          </div>

          {/* AI Ticker */}
          <div style={{ position: 'absolute', bottom: 20, right: selected ? 300 : 20, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none', transition: 'right 0.25s' }}>
            {ticks.map((t, i) => (
              <div key={i} style={{
                background: 'rgba(4,6,13,0.88)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '8px 12px', fontSize: 11, backdropFilter: 'blur(8px)',
                animation: 'tickerIn 0.3s ease forwards', display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ lineHeight: 1.4 }}><strong style={{ color: '#e4efff' }}>{t.who}</strong> — {t.msg}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#3a4f6a', marginTop: 2 }}>Just now · AI Intel</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{
          width: 280, background: 'rgba(8,12,24,0.97)', borderLeft: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: selected ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease',
        }}>
          {selected && (
            <>
              <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                <button onClick={() => { setSelected(null); selectedIdRef.current = null }} style={{
                  position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#3a4f6a',
                  cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 38, fontWeight: 700, lineHeight: 1, color: scoreColor(selected.current_score) }}>
                    {selected.current_score}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e4efff' }}>{selected.company}</div>
                    <div style={{ fontSize: 11, color: '#3a4f6a' }}>{selected.name} · {selected.assigned_to}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: scoreColor(selected.current_score), marginTop: 4 }}>
                      {bandLabel(selected.current_score)} · {selected.stage}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* Variable bars */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a4f6a', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>Value Equation</div>
                  {[
                    { key: 'dream_outcome', label: 'Dream Outcome', max: 25, color: '#6EE05A' },
                    { key: 'perceived_likelihood', label: 'Proof', max: 25, color: '#818cf8' },
                    { key: 'days_in_stage', label: 'Days in Stage', max: 30, color: '#f5c518' },
                    { key: 'friction_score', label: 'Friction', max: 25, color: '#f472b6' },
                  ].map(v => {
                    const val = selected.variable_values?.[v.key] ?? 0
                    return (
                      <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a4f6a', width: 76, flexShrink: 0, letterSpacing: '0.04em' }}>{v.label}</div>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(val / v.max) * 100}%`, background: v.color, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, width: 20, textAlign: 'right', color: v.color }}>{val}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Flags */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a4f6a', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>AI Analysis</div>
                  {selected.is_flagged ? (
                    <div style={{
                      borderRadius: 6, padding: '8px 9px', fontSize: 10, lineHeight: 1.5,
                      background: selected.flag_severity === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,197,24,0.07)',
                      border: `1px solid ${selected.flag_severity === 'critical' ? 'rgba(239,68,68,0.22)' : 'rgba(245,197,24,0.22)'}`,
                      color: selected.flag_severity === 'critical' ? '#fca5a5' : '#fde68a',
                    }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2, opacity: 0.7 }}>
                        ⬡ {selected.flag_severity?.toUpperCase()}
                      </div>
                      {selected.flag_reason}
                    </div>
                  ) : (
                    <div style={{
                      borderRadius: 6, padding: '8px 9px', fontSize: 10, lineHeight: 1.5,
                      background: 'rgba(110,224,90,0.08)', border: '1px solid rgba(110,224,90,0.22)', color: '#6EE05A',
                    }}>
                      ✓ No anomalies. All signals nominal.
                    </div>
                  )}
                </div>

                {/* Deal info */}
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a4f6a', marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>Deal</div>
                  {[
                    { k: 'Value', v: selected.deal_value || '—' },
                    { k: 'CRM Deal', v: selected.crm_deal_id || '—' },
                    { k: 'Stage', v: selected.stage },
                  ].map(r => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '4px 0' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3a4f6a', fontSize: 9 }}>{r.k}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>}
    </div>
  )
}
