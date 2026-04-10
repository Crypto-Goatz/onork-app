'use client'

import { useState, useEffect, useRef } from 'react'

const CORRECT_PIN = '6202'

export default function ExecDemoPage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const [greetingText, setGreetingText] = useState('')
  const [greetingDone, setGreetingDone] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Disable right-click and dev tools
  useEffect(() => {
    function blockContext(e: MouseEvent) { e.preventDefault() }
    function blockKeys(e: KeyboardEvent) {
      if (e.key === 'F12') { e.preventDefault(); return }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) { e.preventDefault(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) { e.preventDefault(); return }
    }
    document.addEventListener('contextmenu', blockContext)
    document.addEventListener('keydown', blockKeys)
    return () => {
      document.removeEventListener('contextmenu', blockContext)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [])

  function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        setTimeout(() => {
          setUnlocked(true)
          setShowGreeting(true)
        }, 300)
      } else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 800)
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  // Typewriter greeting
  useEffect(() => {
    if (!showGreeting) return
    const fullText = 'Hey John, wait until you see this...'
    let i = 0
    const interval = setInterval(() => {
      i++
      setGreetingText(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => setGreetingDone(true), 1500)
      }
    }, 55)
    return () => clearInterval(interval)
  }, [showGreeting])

  // PIN pad screen
  if (!unlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#04070f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', width: '280px' }}>
          <div style={{
            fontSize: '14px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#3a4f6a',
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            marginBottom: '8px',
          }}>
            0nExec
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#e4efff',
            marginBottom: '32px',
          }}>
            Enter Access Code
          </div>

          {/* PIN dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: error ? '2px solid #ef4444' : '2px solid #2a3a52',
                background: i < pin.length ? (error ? '#ef4444' : '#6EE05A') : 'transparent',
                transition: 'all 0.15s',
                boxShadow: i < pin.length && !error ? '0 0 8px rgba(110,224,90,0.4)' : 'none',
              }} />
            ))}
          </div>

          {error && (
            <div style={{
              fontSize: '12px',
              color: '#ef4444',
              marginBottom: '16px',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Invalid code
            </div>
          )}

          {/* Number pad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            maxWidth: '240px',
            margin: '0 auto',
          }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(d => (
              <button
                key={d || 'empty'}
                onClick={() => d === '⌫' ? handleDelete() : d ? handleDigit(d) : null}
                disabled={!d}
                style={{
                  width: '72px',
                  height: '52px',
                  borderRadius: '10px',
                  border: d ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  background: d ? 'rgba(255,255,255,0.03)' : 'transparent',
                  color: '#e4efff',
                  fontSize: d === '⌫' ? '18px' : '20px',
                  fontWeight: 500,
                  cursor: d ? 'pointer' : 'default',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.1s',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Greeting animation
  if (!greetingDone) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#04070f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#e4efff',
          letterSpacing: '-0.3px',
        }}>
          {greetingText}
          <span style={{
            display: 'inline-block',
            width: '2px',
            height: '28px',
            background: '#6EE05A',
            marginLeft: '2px',
            verticalAlign: 'middle',
            animation: 'blink 0.8s step-end infinite',
          }} />
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      </div>
    )
  }

  // Full demo
  return (
    <iframe
      ref={iframeRef}
      srcDoc={DEMO_HTML}
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        background: '#04070f',
      }}
      title="0nExec Demo"
    />
  )
}

const DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>0nExec — Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #04070f;
  --s1: #080e1d;
  --s2: #0c1526;
  --s3: #101c30;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.03);
  --green: #6EE05A;
  --green2: #4ecb3a;
  --gd: rgba(110,224,90,0.08);
  --gb: rgba(110,224,90,0.22);
  --red: #ef4444;
  --rd: rgba(239,68,68,0.08);
  --rb: rgba(239,68,68,0.25);
  --yellow: #f5c518;
  --yd: rgba(245,197,24,0.07);
  --yb: rgba(245,197,24,0.22);
  --orange: #f97316;
  --od: rgba(249,115,22,0.07);
  --ob: rgba(249,115,22,0.22);
  --blue: #60a5fa;
  --purple: #a78bfa;
  --text: #b8cce0;
  --bright: #e4efff;
  --muted: #3a4f6a;
  --muted2: #1e2d42;
  --head: 'DM Sans', sans-serif;
  --body: 'DM Sans', sans-serif;
  --mono: 'JetBrains Mono', monospace;
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--body);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
body::before {
  content:'';
  position:fixed;
  inset:0;
  background:
    radial-gradient(ellipse 700px 400px at 20% -10%, rgba(110,224,90,0.04) 0%, transparent 60%),
    radial-gradient(ellipse 500px 300px at 80% 110%, rgba(96,165,250,0.03) 0%, transparent 60%);
  pointer-events:none;
  z-index:0;
}
.topbar {
  height: 52px;
  background: rgba(8,14,29,0.95);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
  position: relative;
  z-index: 20;
  backdrop-filter: blur(12px);
}
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.logo-sub {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-left: 1px solid var(--border);
  padding-left: 10px;
  margin-left: 2px;
}
.dept-switcher {
  display: flex;
  background: var(--s2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
  margin-left: 12px;
}
.dept-btn {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.07em;
  color: var(--muted);
  background: none;
  border: none;
  border-radius: 5px;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: uppercase;
  white-space: nowrap;
}
.dept-btn:hover { color: var(--text); }
.dept-btn.active { background: var(--green); color: #04070f; font-weight: 500; }
.dept-btn.active-blue { background: var(--blue); color: #04070f; font-weight: 500; }
.dept-btn.active-purple { background: var(--purple); color: #04070f; font-weight: 500; }
.tab-nav { display: flex; gap: 2px; margin-left: auto; }
.tab-btn {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.07em;
  color: var(--muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.12s;
  text-transform: uppercase;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--green); border-bottom-color: var(--green); }
.sys-status { display: flex; align-items: center; gap: 10px; margin-left: 8px; flex-shrink: 0; }
.status-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--green);
  background: var(--gd);
  border: 1px solid var(--gb);
  border-radius: 20px;
  padding: 3px 9px;
  letter-spacing: 0.07em;
}
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: breathe 2.5s ease-in-out infinite;
}
@keyframes breathe {
  0%,100% { opacity:1; box-shadow: 0 0 6px var(--green); }
  50% { opacity:0.5; box-shadow: 0 0 2px var(--green); }
}
.user-chip { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text); font-weight: 500; }
.user-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green), #2a8f1a);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #04070f; font-family: var(--body);
}
.body-wrap {
  display: grid;
  grid-template-columns: 260px 1fr 300px;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.left-panel {
  background: var(--s1);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-title { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.panel-badge { font-family: var(--mono); font-size: 9px; background: var(--rd); border: 1px solid var(--rb); color: #fca5a5; border-radius: 10px; padding: 1px 7px; letter-spacing: 0.05em; }
.panel-badge.green { background: var(--gd); border-color: var(--gb); color: var(--green); }
.portfolio-stats { padding: 14px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.port-stat { background: var(--s2); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
.port-stat-val { font-family: var(--body); font-size: 18px; font-weight: 700; color: var(--bright); letter-spacing: -0.3px; line-height: 1; margin-bottom: 3px; }
.port-stat-val.green { color: var(--green); }
.port-stat-val.red { color: var(--red); }
.port-stat-val.yellow { color: var(--yellow); }
.port-stat-lbl { font-family: var(--mono); font-size: 8px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
.intel-feed { flex: 1; overflow-y: auto; padding: 8px; }
.intel-item { display: flex; gap: 8px; padding: 9px 10px; border-radius: 7px; margin-bottom: 4px; border: 1px solid transparent; cursor: default; transition: border-color 0.12s; }
.intel-item:hover { border-color: var(--border); }
.intel-item.critical { background: var(--rd); border-color: var(--rb); }
.intel-item.warning { background: var(--yd); border-color: var(--yb); }
.intel-item.good { background: var(--gd); border-color: var(--gb); }
.intel-item.info { background: rgba(96,165,250,0.05); border-color: rgba(96,165,250,0.15); }
.intel-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
.intel-body { flex: 1; min-width: 0; }
.intel-client { font-size: 11px; font-weight: 600; color: var(--bright); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.intel-msg { font-size: 10px; color: var(--muted); line-height: 1.4; }
.intel-msg.red { color: #fca5a5; }
.intel-msg.yellow { color: #fde68a; }
.intel-msg.green { color: var(--green); }
.intel-msg.blue { color: var(--blue); }
.intel-time { font-family: var(--mono); font-size: 8px; color: var(--muted2); margin-top: 3px; }
.slack-section { border-top: 1px solid var(--border); flex-shrink: 0; }
.slack-header { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-bottom: 1px solid var(--border2); }
.slack-dot { width: 10px; height: 10px; background: #4A154B; border-radius: 2px; flex-shrink: 0; }
.slack-label { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
.slack-msgs { padding: 6px 10px; max-height: 140px; overflow-y: auto; }
.slack-msg { padding: 6px 8px; border-radius: 5px; margin-bottom: 3px; font-size: 10px; line-height: 1.4; border-left: 2px solid var(--border); }
.slack-msg.alert { border-left-color: var(--red); background: var(--rd); }
.slack-msg.new-deal { border-left-color: var(--green); background: var(--gd); }
.slack-msg.warn { border-left-color: var(--yellow); background: var(--yd); }
.slack-sender { font-weight: 600; color: var(--bright); }
.slack-text { color: var(--text); }
.slack-ts { font-family: var(--mono); font-size: 8px; color: var(--muted2); }
.main-content { overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
.tab-panel { display: none; flex: 1; overflow: hidden; flex-direction: column; }
.tab-panel.active { display: flex; }
.pipeline-topbar { display: flex; align-items: center; gap: 12px; padding: 10px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; background: rgba(8,14,29,0.6); }
.pipeline-label { font-family: var(--body); font-size: 14px; font-weight: 600; color: var(--bright); letter-spacing: -0.1px; }
.pipeline-sub { font-size: 11px; color: var(--muted); font-weight: 300; }
.pipeline-meta { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.meta-chip { font-family: var(--mono); font-size: 9px; padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border); background: var(--s2); color: var(--muted); letter-spacing: 0.06em; }
.pipeline-board { flex: 1; overflow-x: auto; overflow-y: hidden; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start; }
.stage-col { min-width: 200px; max-width: 200px; display: flex; flex-direction: column; gap: 0; }
.stage-header { background: var(--s2); border: 1px solid var(--border); border-radius: 8px 8px 0 0; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px; }
.stage-name { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.stage-avg { font-family: var(--mono); font-size: 11px; font-weight: 700; }
.stage-body { background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; padding: 8px; min-height: 60px; display: flex; flex-direction: column; gap: 6px; }
.lead-card { background: var(--s1); border: 1px solid var(--border); border-radius: 8px; padding: 11px; cursor: pointer; transition: all 0.15s; position: relative; }
.lead-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.lead-card.flag-critical { border-color: var(--rb); background: rgba(239,68,68,0.04); }
.lead-card.flag-warning { border-color: var(--yb); }
.lead-flag-dot { position: absolute; top: 8px; right: 8px; width: 6px; height: 6px; border-radius: 50%; }
.flag-dot-red { background: var(--red); box-shadow: 0 0 6px var(--red); animation: breathe 1.5s infinite; }
.flag-dot-yellow { background: var(--yellow); }
.flag-dot-green { background: var(--green); }
.lead-name { font-size: 12px; font-weight: 600; color: var(--bright); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 14px; }
.lead-company { font-size: 10px; color: var(--muted); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-score-row { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.ring-wrap { position: relative; flex-shrink: 0; }
.ring-wrap svg { transform: rotate(-90deg); }
.ring-score { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-weight: 500; }
.score-label { font-family: var(--mono); font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
.subscores { display: flex; flex-direction: column; gap: 3px; margin-bottom: 7px; }
.subscore-row { display: flex; align-items: center; gap: 5px; }
.subscore-key { font-family: var(--mono); font-size: 7px; color: var(--muted2); width: 14px; text-align: right; letter-spacing: 0.04em; }
.subscore-track { flex: 1; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.subscore-fill { height: 100%; border-radius: 2px; }
.lead-revenue { font-family: var(--mono); font-size: 10px; color: var(--green); letter-spacing: 0.04em; }
.lead-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.lead-pm { font-size: 9px; color: var(--muted); }
.lead-days { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.lead-days.over { color: var(--red); }
.pd-indicator { display: flex; align-items: center; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border2); }
.pd-dot { width: 6px; height: 6px; background: #00B0DB; border-radius: 1px; flex-shrink: 0; }
.pd-label { font-family: var(--mono); font-size: 8px; color: #00B0DB; letter-spacing: 0.05em; }
.li-card { background: var(--s1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
.li-card-title { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
.li-metric { font-family: var(--body); font-size: 24px; font-weight: 700; color: var(--bright); letter-spacing: -0.5px; margin-bottom: 4px; }
.li-sub { font-size: 12px; color: var(--muted); font-weight: 300; }
.li-delta { font-family: var(--mono); font-size: 10px; margin-top: 6px; }
.delta-up { color: var(--green); }
.delta-down { color: var(--red); }
.camp-list { display: flex; flex-direction: column; gap: 8px; }
.camp-item { background: var(--s2); border: 1px solid var(--border); border-radius: 7px; padding: 11px 12px; }
.camp-name { font-size: 12px; font-weight: 600; color: var(--bright); margin-bottom: 3px; }
.camp-type { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.07em; margin-bottom: 8px; }
.camp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.camp-stat-val { font-family: var(--mono); font-size: 11px; font-weight: 500; color: var(--bright); }
.camp-stat-lbl { font-family: var(--mono); font-size: 8px; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
.hack-alert { margin-top: 8px; padding: 6px 9px; border-radius: 5px; font-size: 10px; line-height: 1.4; }
.hack-alert.critical { background: var(--rd); border: 1px solid var(--rb); color: #fca5a5; }
.hack-alert.warning { background: var(--yd); border: 1px solid var(--yb); color: #fde68a; }
.hack-alert.good { background: var(--gd); border: 1px solid var(--gb); color: var(--green); }
.rev-layout { display: grid; grid-template-columns: 1fr 320px; gap: 0; flex: 1; overflow: hidden; }
.rev-main { padding: 16px; overflow-y: auto; }
.rev-side { border-left: 1px solid var(--border); padding: 16px; overflow-y: auto; }
.rev-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.rev-kpi { background: var(--s1); border: 1px solid var(--border); border-radius: 9px; padding: 14px 16px; }
.rev-kpi-val { font-family: var(--body); font-size: 22px; font-weight: 700; color: var(--bright); letter-spacing: -0.3px; margin-bottom: 4px; }
.rev-kpi-val.green { color: var(--green); }
.rev-kpi-val.blue { color: var(--blue); }
.rev-chart { background: var(--s1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
.chart-title { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 100px; }
.bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.bar-fill { width: 100%; border-radius: 3px 3px 0 0; background: var(--green); opacity: 0.7; transition: opacity 0.2s; }
.bar-fill:hover { opacity: 1; }
.bar-fill.projected { opacity: 0.3; background: var(--blue); border: 1px dashed rgba(96,165,250,0.4); }
.bar-lbl { font-family: var(--mono); font-size: 8px; color: var(--muted); letter-spacing: 0.04em; }
.client-rev-table { background: var(--s1); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.rev-table-head { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 60px; padding: 9px 14px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); gap: 8px; }
.th { font-family: var(--mono); font-size: 8px; color: var(--muted2); letter-spacing: 0.1em; text-transform: uppercase; }
.rev-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 60px; padding: 10px 14px; border-bottom: 1px solid var(--border2); gap: 8px; align-items: center; transition: background 0.1s; }
.rev-table-row:hover { background: rgba(255,255,255,0.015); }
.rev-table-row:last-child { border-bottom: none; }
.tc { font-size: 12px; color: var(--text); }
.tc-name { font-size: 12px; color: var(--bright); font-weight: 500; }
.tc-mono { font-family: var(--mono); font-size: 11px; }
.tc-green { color: var(--green); }
.health-pill { font-family: var(--mono); font-size: 9px; padding: 2px 7px; border-radius: 3px; text-align: center; }
.hp-green { background: var(--gd); border: 1px solid var(--gb); color: var(--green); }
.hp-yellow { background: var(--yd); border: 1px solid var(--yb); color: var(--yellow); }
.hp-red { background: var(--rd); border: 1px solid var(--rb); color: #fca5a5; }
.right-panel { background: var(--s1); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.ai-header { padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.ai-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ai-icon { width: 26px; height: 26px; background: linear-gradient(135deg, rgba(110,224,90,0.2), rgba(110,224,90,0.05)); border: 1px solid var(--gb); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.ai-title { font-family: var(--body); font-size: 13px; font-weight: 700; color: var(--bright); }
.ai-sub { font-family: var(--mono); font-size: 8px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
.k-layer { background: var(--s2); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
.k-layer-title { font-family: var(--mono); font-size: 9px; color: var(--green); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
.k-tag { font-family: var(--mono); font-size: 8px; background: var(--gd); border: 1px solid var(--gb); color: var(--green); border-radius: 3px; padding: 1px 5px; }
.k-learning { font-size: 11px; color: var(--text); line-height: 1.5; }
.lead-detail { flex: 1; overflow-y: auto; padding: 12px; }
.detail-header { margin-bottom: 12px; }
.detail-company { font-family: var(--body); font-size: 15px; font-weight: 700; color: var(--bright); margin-bottom: 2px; }
.detail-contact { font-size: 11px; color: var(--muted); }
.veq-section { margin-bottom: 12px; }
.section-label { font-family: var(--mono); font-size: 8px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border2); }
.veq-bars { display: flex; flex-direction: column; gap: 6px; }
.veq-row { display: flex; align-items: center; gap: 8px; }
.veq-label { font-family: var(--mono); font-size: 9px; color: var(--muted); width: 80px; flex-shrink: 0; letter-spacing: 0.04em; }
.veq-track { flex: 1; height: 4px; background: rgba(255,255,255,0.04); border-radius: 2px; overflow: hidden; }
.veq-fill { height: 100%; border-radius: 2px; }
.veq-val { font-family: var(--mono); font-size: 10px; width: 26px; text-align: right; flex-shrink: 0; }
.flag-list { display: flex; flex-direction: column; gap: 6px; }
.flag-item { border-radius: 6px; padding: 9px 10px; font-size: 10px; line-height: 1.5; }
.flag-item.critical { background: var(--rd); border: 1px solid var(--rb); color: #fca5a5; }
.flag-item.warning { background: var(--yd); border: 1px solid var(--yb); color: #fde68a; }
.flag-item.good { background: var(--gd); border: 1px solid var(--gb); color: var(--green); }
.flag-label { font-family: var(--mono); font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; opacity: 0.7; }
.pd-sync-card { background: rgba(0,176,219,0.05); border: 1px solid rgba(0,176,219,0.2); border-radius: 7px; padding: 10px 12px; margin-bottom: 10px; }
.pd-sync-title { font-family: var(--mono); font-size: 9px; color: #00B0DB; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
.pd-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.pd-field-lbl { font-family: var(--mono); font-size: 8px; color: var(--muted); }
.pd-field-val { font-family: var(--mono); font-size: 10px; color: var(--text); }
.brief-btn { width: 100%; padding: 10px; background: var(--gd); border: 1px solid var(--gb); color: var(--green); border-radius: 7px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; margin-top: 10px; }
.brief-btn:hover { background: rgba(110,224,90,0.14); }
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
@keyframes slideIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
.animate-in { animation: slideIn 0.3s ease forwards; }
</style>
</head>
<body>
<div class="topbar">
  <div class="logo-wrap">
    <span style="font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#e4efff;letter-spacing:-0.2px">0n<span style="color:#6EE05A">Exec</span></span>
    <span class="logo-sub">Command Center</span>
  </div>
  <div class="dept-switcher">
    <button class="dept-btn active" id="deptMarketing" onclick="switchDept('marketing')">Marketing</button>
    <button class="dept-btn" id="deptCustomers" onclick="switchDept('customers')">Customers</button>
    <button class="dept-btn" id="deptOnboarding" onclick="switchDept('onboarding')">Onboarding</button>
  </div>
  <div class="tab-nav">
    <button class="tab-btn active" onclick="switchTab('pipeline')">Pipeline</button>
    <button class="tab-btn" onclick="switchTab('linkedin')">LinkedIn Ads</button>
    <button class="tab-btn" onclick="switchTab('revenue')">Revenue</button>
  </div>
  <div class="sys-status">
    <div class="status-pill"><div class="status-dot"></div>AI Active</div>
    <div style="width:1px;height:24px;background:var(--border)"></div>
    <div class="user-chip"><div class="user-avatar">JM</div><span style="font-size:12px;font-weight:500;color:var(--bright)">John Maher</span></div>
  </div>
</div>
<div class="body-wrap">
<div class="left-panel">
  <div class="panel-header"><span class="panel-title">Portfolio Overview</span><span class="panel-badge" id="flagBadge">2 Flags</span></div>
  <div class="portfolio-stats">
    <div class="port-stat"><div class="port-stat-val green" id="statTotal">11</div><div class="port-stat-lbl">Active Clients</div></div>
    <div class="port-stat"><div class="port-stat-val" id="statAvg">68</div><div class="port-stat-lbl">Avg Score</div></div>
    <div class="port-stat"><div class="port-stat-val red" id="statCritical">2</div><div class="port-stat-lbl">Critical</div></div>
    <div class="port-stat"><div class="port-stat-val yellow" id="statBudget">$186K</div><div class="port-stat-lbl">Ad Spend</div></div>
  </div>
  <div class="panel-header" style="border-top:1px solid var(--border)"><span class="panel-title">\\u2B21 AI Intelligence Layer</span><span class="panel-badge green">K4 Active</span></div>
  <div class="intel-feed" id="intelFeed">
    <div class="intel-item critical"><div class="intel-icon">\\u{1F534}</div><div class="intel-body"><div class="intel-client">Hartwell Group</div><div class="intel-msg red">Onboarding at Day 5 of 3. No client response logged in 48 hrs. Escalation risk.</div><div class="intel-time">2 min ago</div></div></div>
    <div class="intel-item critical"><div class="intel-icon">\\u{1F534}</div><div class="intel-body"><div class="intel-client">Vance Logistics</div><div class="intel-msg red">LinkedIn CTR 0.4% vs 2.1% baseline. Headline at Grade 9 reading level.</div><div class="intel-time">8 min ago</div></div></div>
    <div class="intel-item warning"><div class="intel-icon">\\u{1F7E1}</div><div class="intel-body"><div class="intel-client">Apex Brands</div><div class="intel-msg yellow">Creative has been in market 22 days with no urgency mechanism.</div><div class="intel-time">15 min ago</div></div></div>
    <div class="intel-item good"><div class="intel-icon">\\u{1F7E2}</div><div class="intel-body"><div class="intel-client">Meridian Capital</div><div class="intel-msg green">CTR 3.4% \\u2014 62% above baseline. Dream Outcome score 24/25.</div><div class="intel-time">32 min ago</div></div></div>
    <div class="intel-item info"><div class="intel-icon">\\u{1F4A1}</div><div class="intel-body"><div class="intel-client">K4 Learning Update</div><div class="intel-msg blue">Pattern: B2B SaaS clients in Launch recover 2.3x faster with Trust-layer fixes.</div><div class="intel-time">1 hr ago</div></div></div>
  </div>
  <div class="slack-section">
    <div class="slack-header"><div class="slack-dot"></div><span class="slack-label">Slack \\u00B7 #0nexec-alerts</span><span style="margin-left:auto;font-family:var(--mono);font-size:8px;color:var(--muted)">Live</span></div>
    <div class="slack-msgs">
      <div class="slack-msg alert"><div><span class="slack-sender">0nExec AI</span> <span class="slack-ts">2m ago</span></div><div class="slack-text">\\u{1F534} Hartwell Group dropped to 38/100</div></div>
      <div class="slack-msg new-deal"><div><span class="slack-sender">Pipedrive</span> <span class="slack-ts">14m ago</span></div><div class="slack-text">\\u2705 New deal: Solace Health ($22K)</div></div>
    </div>
  </div>
</div>
<div class="main-content">
  <div class="tab-panel active" id="tabPipeline">
    <div class="pipeline-topbar">
      <div><div class="pipeline-label" id="pipelineLabel">Marketing Pipeline</div><div class="pipeline-sub" id="pipelineSub">11 active engagements</div></div>
      <div class="pipeline-meta"><div class="meta-chip" id="metaPipedrive">\\u2B21 Pipedrive Sync: Live</div><div class="meta-chip">\\u2B21 AI Monitoring: On</div></div>
    </div>
    <div class="pipeline-board" id="pipelineBoard"></div>
  </div>
  <div class="tab-panel" id="tabLinkedin">
    <div class="pipeline-topbar"><div><div class="pipeline-label">LinkedIn Ads Intelligence</div><div class="pipeline-sub">Active campaigns \\u00B7 AI creative audit</div></div></div>
    <div style="overflow-y:auto;flex:1">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:14px 16px 0">
        <div class="li-card"><div class="li-card-title">Total Ad Spend</div><div class="li-metric">$186K</div><div class="li-sub">This billing cycle</div><div class="li-delta delta-up">\\u2191 +12%</div></div>
        <div class="li-card"><div class="li-card-title">Portfolio Avg CTR</div><div class="li-metric">1.8%</div><div class="li-sub">Baseline: 2.1%</div><div class="li-delta delta-down">\\u2193 Below baseline</div></div>
        <div class="li-card"><div class="li-card-title">Avg CPA</div><div class="li-metric">$124</div><div class="li-sub">Baseline: $140</div><div class="li-delta delta-up">\\u2191 11% better</div></div>
        <div class="li-card"><div class="li-card-title">Active Campaigns</div><div class="li-metric">9</div><div class="li-sub">Across 7 clients</div></div>
        <div class="li-card"><div class="li-card-title">AI Hack Score</div><div class="li-metric" style="color:var(--yellow)">6.2</div><div class="li-sub">Portfolio avg / 12</div></div>
      </div>
      <div style="padding:12px 16px"><div class="chart-title">Active Campaigns</div>
        <div class="camp-list">
          <div class="camp-item"><div class="camp-name">Meridian Capital \\u2014 Decision Maker Retargeting</div><div class="camp-type">SPONSORED CONTENT</div><div class="camp-stats"><div><div class="camp-stat-val" style="color:var(--green)">3.4%</div><div class="camp-stat-lbl">CTR</div></div><div><div class="camp-stat-val">$88</div><div class="camp-stat-lbl">CPA</div></div><div><div class="camp-stat-val">$24,200</div><div class="camp-stat-lbl">Spend</div></div><div><div class="camp-stat-val" style="color:var(--green)">91/100</div><div class="camp-stat-lbl">Score</div></div></div><div class="hack-alert good">\\u2713 All critical hacks firing. No action needed.</div></div>
          <div class="camp-item"><div class="camp-name">Vance Logistics \\u2014 Cold Outreach</div><div class="camp-type">SPONSORED CONTENT</div><div class="camp-stats"><div><div class="camp-stat-val" style="color:var(--red)">0.4%</div><div class="camp-stat-lbl">CTR</div></div><div><div class="camp-stat-val" style="color:var(--red)">$580</div><div class="camp-stat-lbl">CPA</div></div><div><div class="camp-stat-val">$19,000</div><div class="camp-stat-lbl">Spend</div></div><div><div class="camp-stat-val" style="color:var(--red)">29/100</div><div class="camp-stat-lbl">Score</div></div></div><div class="hack-alert critical">\\u{1F534} Headline reads Grade 9. Rewrite required immediately.</div></div>
          <div class="camp-item"><div class="camp-name">Apex Brands \\u2014 Brand Awareness</div><div class="camp-type">SPONSORED CONTENT</div><div class="camp-stats"><div><div class="camp-stat-val" style="color:var(--yellow)">1.1%</div><div class="camp-stat-lbl">CTR</div></div><div><div class="camp-stat-val" style="color:var(--yellow)">$210</div><div class="camp-stat-lbl">CPA</div></div><div><div class="camp-stat-val">$11,200</div><div class="camp-stat-lbl">Spend</div></div><div><div class="camp-stat-val" style="color:var(--yellow)">58/100</div><div class="camp-stat-lbl">Score</div></div></div><div class="hack-alert warning">\\u26A1 22 days in market, no urgency mechanism.</div></div>
        </div>
      </div>
    </div>
  </div>
  <div class="tab-panel" id="tabRevenue">
    <div class="pipeline-topbar"><div><div class="pipeline-label">Revenue Intelligence</div><div class="pipeline-sub">Pipeline value \\u00B7 Client health</div></div></div>
    <div class="rev-layout">
      <div class="rev-main">
        <div class="rev-kpi-row">
          <div class="rev-kpi"><div class="rev-kpi-val green">$284K</div><div class="rev-kpi-lbl">Pipeline Value</div></div>
          <div class="rev-kpi"><div class="rev-kpi-val">$61K</div><div class="rev-kpi-lbl">MRR In-Flight</div></div>
          <div class="rev-kpi"><div class="rev-kpi-val blue">$186K</div><div class="rev-kpi-lbl">Ad Spend AUM</div></div>
          <div class="rev-kpi"><div class="rev-kpi-val" style="color:var(--yellow)">66%</div><div class="rev-kpi-lbl">On-Track Rate</div></div>
        </div>
        <div class="rev-chart"><div class="chart-title">Revenue by Month</div>
          <div class="bar-chart">
            <div class="bar-col"><div class="bar-fill" style="height:52px"></div><div class="bar-lbl">Oct</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:61px"></div><div class="bar-lbl">Nov</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:48px"></div><div class="bar-lbl">Dec</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:74px"></div><div class="bar-lbl">Jan</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:82px"></div><div class="bar-lbl">Feb</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:91px"></div><div class="bar-lbl">Mar</div></div>
            <div class="bar-col"><div class="bar-fill" style="height:86px"></div><div class="bar-lbl">Apr</div></div>
            <div class="bar-col"><div class="bar-fill projected" style="height:98px"></div><div class="bar-lbl" style="color:var(--blue)">May</div></div>
          </div>
        </div>
        <div class="client-rev-table">
          <div class="rev-table-head"><div class="th">Client</div><div class="th">Monthly</div><div class="th">Ad Spend</div><div class="th">Score</div><div class="th">Health</div></div>
          <div id="revTableBody"></div>
        </div>
      </div>
      <div class="rev-side">
        <div class="chart-title" style="margin-bottom:12px">Churn Risk Monitor</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="background:var(--rd);border:1px solid var(--rb);border-radius:7px;padding:10px 12px"><div style="font-size:11px;font-weight:600;color:#fca5a5;margin-bottom:2px">Hartwell Group</div><div style="font-size:10px;color:#fca5a5;opacity:0.8">Score trending \\u22128pts/week. Churn probability elevated.</div></div>
          <div style="background:var(--yd);border:1px solid var(--yb);border-radius:7px;padding:10px 12px"><div style="font-size:11px;font-weight:600;color:#fde68a;margin-bottom:2px">Apex Brands</div><div style="font-size:10px;color:#fde68a;opacity:0.8">Creative fatigue. Refresh recommended within 7 days.</div></div>
          <div style="background:var(--gd);border:1px solid var(--gb);border-radius:7px;padding:10px 12px"><div style="font-size:11px;font-weight:600;color:var(--green);margin-bottom:2px">Meridian Capital</div><div style="font-size:10px;color:var(--green);opacity:0.8">Score 91 and climbing. Expansion conversation appropriate.</div></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="right-panel">
  <div class="ai-header">
    <div class="ai-title-row"><div class="ai-icon">\\u2B21</div><div><div class="ai-title">AI Intel \\u00B7 K-Layer</div><div class="ai-sub">K1\\u2013K7 Active</div></div></div>
    <div class="k-layer"><div class="k-layer-title"><span class="k-tag">K4</span>Business Intelligence Engine</div><div class="k-learning">Learning from <strong style="color:var(--green)">147</strong> interventions across <strong style="color:var(--green)">11</strong> clients. Trust-layer fixes resolve 2.3\\u00D7 faster for B2B Launch. Confidence: <strong style="color:var(--green)">78%</strong></div></div>
  </div>
  <div class="lead-detail" id="leadDetail">
    <div class="detail-header"><div class="detail-company">Select a lead card</div><div class="detail-contact">Click any card in the pipeline to view full AI analysis</div></div>
    <div style="margin-top:20px;padding:16px;background:var(--s2);border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:28px;margin-bottom:8px;opacity:0.3">\\u25CE</div><div style="font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:0.1em">Select any lead card to view details</div></div>
  </div>
</div>
</div>
<script>
var BAND=function(s){return s>=80?{c:'#6EE05A',l:'NOMINAL'}:s>=60?{c:'#f5c518',l:'MONITOR'}:s>=40?{c:'#f97316',l:'REVIEW'}:{c:'#ef4444',l:'CRITICAL'}};
var STAGES=[{id:'discovery',label:'Discovery',icon:'\\u25CE'},{id:'offer',label:'Offer Build',icon:'\\u2B21'},{id:'creative',label:'Creative',icon:'\\u25B7'},{id:'launch',label:'Launch',icon:'\\u25C6'},{id:'optimize',label:'Optimize',icon:'\\u27F3'},{id:'scale',label:'Scale',icon:'\\u221E'}];
var LEADS=[
{id:1,name:'Sarah Chen',company:'Hartwell Group',stage:'launch',score:38,dream:19,proof:12,speed:4,friction:3,revenue:'$18,400',pm:'Sarah K.',days:'Day 5',overdue:true,flags:[{type:'critical',msg:'Onboarding overrun 2d. No client contact logged.'}],pdDeal:'#HD-4821',pdStage:'Launch',pdActivity:'Call overdue 2 days',detail:'Hack #5 missing. No flaw owned. CTA says "Learn More."'},
{id:2,name:'Marcus Webb',company:'Meridian Capital',stage:'scale',score:91,dream:24,proof:22,speed:23,friction:22,revenue:'$34,200',pm:'Derek L.',days:'Day 6',overdue:false,flags:[],pdDeal:'#MC-2209',pdStage:'Scale',pdActivity:'QBR scheduled May 15',detail:'All 12 hacks firing. 62% above CTR baseline. Expand budget.'},
{id:3,name:'Dr. Priya Nair',company:'Praxis Medical',stage:'discovery',score:84,dream:22,proof:20,speed:21,friction:21,revenue:'$9,750',pm:'James O.',days:'Day 2',overdue:false,flags:[],pdDeal:'#PM-5534',pdStage:'Discovery',pdActivity:'Discovery call tomorrow',detail:'Clean intake. Strong ICP match. Brief generated.'},
{id:4,name:'Tom Vance',company:'Vance Logistics',stage:'optimize',score:29,dream:11,proof:8,speed:7,friction:3,revenue:'$61,000',pm:'Anya P.',days:'Day 19',overdue:true,flags:[{type:'critical',msg:'Go-live overrun 5d. Deployment blocker.'}],pdDeal:'#VL-1102',pdStage:'Optimize',pdActivity:'Escalation required',detail:'Headline reads Grade 9. Zero moment specificity. Immediate rewrite.'},
{id:5,name:'Jen Orion',company:'Orion Realty',stage:'scale',score:96,dream:24,proof:24,speed:24,friction:24,revenue:'$4,800/mo',pm:'Sarah K.',days:'Ongoing',overdue:false,flags:[],pdDeal:'#OR-0087',pdStage:'Retainer',pdActivity:'Referral ask scheduled',detail:'Highest portfolio score. CTR 4.1%. Ask for referral this week.'},
{id:6,name:'Alex Solace',company:'Solace Health',stage:'creative',score:71,dream:21,proof:16,speed:18,friction:16,revenue:'Pending',pm:'Mike R.',days:'Day 3',overdue:false,flags:[{type:'warning',msg:'Guarantee structure missing.'}],pdDeal:'#SH-7743',pdStage:'Creative',pdActivity:'Copy review Monday',detail:'Proof/Likelihood low. Add conditional guarantee.'},
{id:7,name:'Brad Apex',company:'Apex Brands',stage:'optimize',score:58,dream:17,proof:14,speed:14,friction:13,revenue:'$22,100',pm:'Derek L.',days:'Day 3',overdue:false,flags:[{type:'warning',msg:'Status-giver absent from copy.'}],pdDeal:'#AB-3391',pdStage:'Optimize',pdActivity:'Creative refresh due',detail:'Benefits with no status-giver. "Business owners" too broad.'},
{id:8,name:'Chris Crane',company:'Crane & Co.',stage:'launch',score:63,dream:18,proof:16,speed:16,friction:13,revenue:'$7,400',pm:'James O.',days:'Day 4',overdue:false,flags:[{type:'warning',msg:'"Because" never appears in copy.'}],pdDeal:'#CC-8821',pdStage:'Launch',pdActivity:'Week 1 check-in',detail:'Hack #4 missing. No stated reason. Compliance suppressed 30%.'},
{id:9,name:'Natalie Park',company:'Prism Digital',stage:'offer',score:77,dream:20,proof:18,speed:19,friction:20,revenue:'$15,500',pm:'Derek L.',days:'Day 1',overdue:false,flags:[],pdDeal:'#PD-6612',pdStage:'Offer Build',pdActivity:'Grand Slam review',detail:'Solid onboarding. MAGIC naming applied. Avatar: B2B Agency Owner.'},
{id:10,name:'Ryan Foster',company:'Peak Performance',stage:'discovery',score:88,dream:23,proof:21,speed:22,friction:22,revenue:'$12,800',pm:'Anya P.',days:'Day 1',overdue:false,flags:[],pdDeal:'#PP-9901',pdStage:'Discovery',pdActivity:'Intro call complete',detail:'Strong discovery. Solution Aware audience. Differentiation hook confirmed.'},
{id:11,name:'Diana Walsh',company:'Walsh & Partners',stage:'creative',score:45,dream:14,proof:10,speed:12,friction:9,revenue:'$8,900',pm:'Sarah K.',days:'Day 4',overdue:false,flags:[{type:'warning',msg:'Dream Outcome score low.'}],pdDeal:'#WP-2241',pdStage:'Creative',pdActivity:'Copy revisions',detail:'Dream Outcome 14/25. "Grow your business" scores zero. Show Don\\'t Tell.'}
];
var REV=[
{name:'Meridian Capital',mo:'$34,200',spend:'$28,500',score:91,health:'hp-green'},
{name:'Vance Logistics',mo:'$61,000',spend:'$19,000',score:29,health:'hp-red'},
{name:'Orion Realty',mo:'$4,800',spend:'$9,800',score:96,health:'hp-green'},
{name:'Hartwell Group',mo:'$18,400',spend:'$14,200',score:38,health:'hp-red'},
{name:'Apex Brands',mo:'$22,100',spend:'$11,200',score:58,health:'hp-yellow'},
{name:'Peak Performance',mo:'$12,800',spend:'$8,100',score:88,health:'hp-green'},
{name:'Prism Digital',mo:'$15,500',spend:'$6,400',score:77,health:'hp-green'},
{name:'Crane & Co.',mo:'$7,400',spend:'$5,200',score:63,health:'hp-yellow'},
{name:'Solace Health',mo:'$9,750',spend:'$0',score:71,health:'hp-yellow'},
{name:'Praxis Medical',mo:'$9,750',spend:'$0',score:84,health:'hp-green'},
{name:'Walsh & Partners',mo:'$8,900',spend:'$7,100',score:45,health:'hp-yellow'}
];
function scoreRing(s,sz,fs){var b=BAND(s),r=sz/2-3,c=2*Math.PI*r,d=(s/100)*c;return '<div class="ring-wrap" style="width:'+sz+'px;height:'+sz+'px"><svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" style="transform:rotate(-90deg)"><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2.5"/><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+b.c+'" stroke-width="2.5" stroke-dasharray="'+d+' '+c+'" stroke-linecap="round"/></svg><div class="ring-score" style="font-size:'+fs+'px;color:'+b.c+'">'+s+'</div></div>';}
function subBar(v,mx,col){return '<div class="subscore-track"><div class="subscore-fill" style="width:'+Math.round(v/mx*100)+'%;background:'+col+'"></div></div>';}
function renderCard(l){var b=BAND(l.score),fc=l.flags.length>0?(l.flags[0].type==='critical'?'flag-critical':'flag-warning'):'',dc=l.flags.length>0?(l.flags[0].type==='critical'?'flag-dot-red':'flag-dot-yellow'):'flag-dot-green';return '<div class="lead-card '+fc+'" onclick="selectLead('+l.id+')" id="card-'+l.id+'"><div class="lead-flag-dot '+dc+'"></div><div class="lead-name">'+l.company+'</div><div class="lead-company">'+l.name+'</div><div class="card-score-row">'+scoreRing(l.score,36,10)+'<div><div class="score-label" style="color:'+b.c+'">'+b.l+'</div><div class="lead-revenue">'+l.revenue+'</div></div></div><div class="subscores"><div class="subscore-row"><div class="subscore-key">D</div>'+subBar(l.dream,25,'#6EE05A')+'</div><div class="subscore-row"><div class="subscore-key">P</div>'+subBar(l.proof,25,'#818cf8')+'</div><div class="subscore-row"><div class="subscore-key">S</div>'+subBar(l.speed,25,'#f5c518')+'</div><div class="subscore-row"><div class="subscore-key">F</div>'+subBar(l.friction,25,'#f472b6')+'</div></div><div class="lead-meta"><div class="lead-pm">'+l.pm+'</div><div class="lead-days '+(l.overdue?'over':'')+'">'+l.days+'</div></div><div class="pd-indicator"><div class="pd-dot"></div><div class="pd-label">PD: '+l.pdDeal+'</div></div></div>';}
function renderBoard(){var board=document.getElementById('pipelineBoard');board.innerHTML='';STAGES.forEach(function(st){var sl=LEADS.filter(function(l){return l.stage===st.id}).sort(function(a,b){return a.score-b.score});var avg=sl.length?Math.round(sl.reduce(function(s,l){return s+l.score},0)/sl.length):null;var b=avg!==null?BAND(avg):null;var col=document.createElement('div');col.className='stage-col';col.innerHTML='<div class="stage-header"><div><div class="stage-name">'+st.icon+' '+st.label+'</div><div style="font-family:var(--mono);font-size:8px;color:var(--muted2);margin-top:1px">'+sl.length+' client'+(sl.length!==1?'s':'')+'</div></div>'+(avg!==null?'<div class="stage-avg" style="color:'+b.c+'">'+avg+'</div>':'')+'</div><div class="stage-body">'+(sl.length===0?'<div style="font-family:var(--mono);font-size:9px;color:var(--muted2);text-align:center;padding:12px 0">\\u2014</div>':sl.map(renderCard).join(''))+'</div>';board.appendChild(col)});}
function selectLead(id){var l=LEADS.find(function(x){return x.id===id});if(!l)return;document.querySelectorAll('.lead-card').forEach(function(c){c.style.boxShadow=''});var card=document.getElementById('card-'+id);if(card)card.style.boxShadow='0 0 0 1.5px var(--green), 0 4px 20px rgba(110,224,90,0.15)';var b=BAND(l.score);var det=document.getElementById('leadDetail');det.innerHTML='<div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">'+scoreRing(l.score,52,14)+'<div><div class="detail-company">'+l.company+'</div><div style="font-family:var(--mono);font-size:9px;color:'+b.c+';letter-spacing:0.1em;margin:2px 0">'+b.l+'</div><div class="detail-contact">'+l.name+' \\u00B7 '+l.pm+'</div></div></div><div class="pd-sync-card"><div class="pd-sync-title"><div style="width:8px;height:8px;background:#00B0DB;border-radius:1px"></div>Pipedrive Sync \\u2014 Live</div><div class="pd-fields"><div><div class="pd-field-lbl">Deal</div><div class="pd-field-val">'+l.pdDeal+'</div></div><div><div class="pd-field-lbl">Stage</div><div class="pd-field-val">'+l.pdStage+'</div></div><div><div class="pd-field-lbl">Value</div><div class="pd-field-val">'+l.revenue+'</div></div><div><div class="pd-field-lbl">Activity</div><div class="pd-field-val" style="color:'+(l.overdue?'var(--red)':'var(--text)')+'">'+l.pdActivity+'</div></div></div></div><div class="veq-section"><div class="section-label">Value Equation</div><div class="veq-bars"><div class="veq-row"><div class="veq-label">Dream</div><div class="veq-track"><div class="veq-fill" style="width:'+(l.dream/25*100)+'%;background:#6EE05A"></div></div><div class="veq-val" style="color:#6EE05A">'+l.dream+'</div></div><div class="veq-row"><div class="veq-label">Proof</div><div class="veq-track"><div class="veq-fill" style="width:'+(l.proof/25*100)+'%;background:#818cf8"></div></div><div class="veq-val" style="color:#818cf8">'+l.proof+'</div></div><div class="veq-row"><div class="veq-label">Speed</div><div class="veq-track"><div class="veq-fill" style="width:'+(l.speed/25*100)+'%;background:#f5c518"></div></div><div class="veq-val" style="color:#f5c518">'+l.speed+'</div></div><div class="veq-row"><div class="veq-label">Friction</div><div class="veq-track"><div class="veq-fill" style="width:'+(l.friction/25*100)+'%;background:#f472b6"></div></div><div class="veq-val" style="color:#f472b6">'+l.friction+'</div></div></div></div>'+(l.flags.length>0?'<div class="veq-section"><div class="section-label">AI Flags</div><div class="flag-list">'+l.flags.map(function(f){return '<div class="flag-item '+f.type+'"><div class="flag-label">\\u2B21 '+f.type.toUpperCase()+'</div>'+f.msg+'</div>'}).join('')+'</div></div>':'<div class="veq-section"><div class="section-label">AI Status</div><div class="flag-item good">\\u2713 No anomalies detected.</div></div>')+'<div class="veq-section"><div class="section-label">Analysis</div><div style="font-size:11px;color:var(--text);line-height:1.6;background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:10px 12px">'+l.detail+'</div></div>';}
function renderRevTable(){var body=document.getElementById('revTableBody');body.innerHTML=REV.map(function(r){var b=BAND(r.score);return '<div class="rev-table-row"><div class="tc-name">'+r.name+'</div><div class="tc tc-mono tc-green">'+r.mo+'</div><div class="tc tc-mono" style="color:var(--blue)">'+r.spend+'</div><div class="tc tc-mono" style="color:'+b.c+'">'+r.score+'</div><div class="tc"><span class="health-pill '+r.health+'">'+b.l+'</span></div></div>'}).join('');}
function switchTab(t){document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')});document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active')});event.target.classList.add('active');document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.add('active');}
function switchDept(){}
renderBoard();renderRevTable();
setTimeout(function(){selectLead(1)},400);
document.addEventListener('contextmenu',function(e){e.preventDefault()});
document.addEventListener('keydown',function(e){if(e.key==='F12')e.preventDefault();if((e.ctrlKey||e.metaKey)&&e.shiftKey&&'IJCijc'.indexOf(e.key)!==-1)e.preventDefault();if((e.ctrlKey||e.metaKey)&&'USus'.indexOf(e.key)!==-1)e.preventDefault();});
<\/script>
</body>
</html>`
