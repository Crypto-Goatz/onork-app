'use client'

import { useState } from 'react'

interface CourseModule {
  title: string
  lessons: string[]
}

interface GeneratedCourse {
  title: string
  description: string
  modules: CourseModule[]
}

export default function CoursesPage() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [moduleCount, setModuleCount] = useState('5')
  const [generating, setGenerating] = useState(false)
  const [course, setCourse] = useState<GeneratedCourse | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    setCourse(null)
    setImported(false)

    try {
      const res = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim() || 'business professionals',
          moduleCount: parseInt(moduleCount),
        }),
      })
      const data = await res.json()
      if (data.course) setCourse(data.course)
    } catch {}

    setGenerating(false)
  }

  async function handleImport() {
    if (!course) return
    setImporting(true)

    try {
      await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course }),
      })
      setImported(true)
    } catch {}

    setImporting(false)
  }

  const totalLessons = course?.modules.reduce((sum, m) => sum + m.lessons.length, 0) || 0

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>AI Course Generator</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Describe a topic — AI builds the entire course and imports it into your CRM.</p>
      </div>

      {/* Generator Form */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>What should the course teach?</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Facebook Ads for Local Businesses, How to Close More Deals, Email Marketing Fundamentals"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
              onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Target Audience</label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. small business owners, real estate agents"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
                onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Modules</label>
              <select value={moduleCount} onChange={e => setModuleCount(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="3">3 modules</option>
                <option value="5">5 modules</option>
                <option value="7">7 modules</option>
                <option value="10">10 modules</option>
              </select>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{
            padding: '13px',
            background: generating ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: generating ? 'var(--text-muted, #6b7280)' : '#0c1220',
            fontWeight: 700, fontSize: 15, borderRadius: 10,
            border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
          }}>
            {generating ? 'Generating course...' : '✨ Generate Course'}
          </button>
        </div>
      </div>

      {/* Generated Course Preview */}
      {course && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {/* Course Header */}
          <div style={{ padding: 24, borderBottom: '1px solid #1c2b42' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 6px' }}>{course.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.6 }}>{course.description}</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginLeft: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-cyan, #14b8a6)' }}>{course.modules.length}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>modules</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>{totalLessons}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>lessons</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div style={{ padding: '0 24px 24px' }}>
            {course.modules.map((mod, i) => (
              <div key={i} style={{
                marginTop: 16,
                background: 'var(--bg-secondary, #161b22)',
                border: '1px solid #1c2b42',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid #1c2b42',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(45,212,191,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: 'var(--color-cyan, #14b8a6)', flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{mod.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginLeft: 'auto' }}>{mod.lessons.length} lessons</span>
                </div>
                <div style={{ padding: '8px 16px' }}>
                  {mod.lessons.map((lesson, j) => (
                    <div key={j} style={{
                      padding: '8px 0',
                      borderBottom: j < mod.lessons.length - 1 ? '1px solid rgba(28,43,66,0.5)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', flexShrink: 0 }}>{i + 1}.{j + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Import Button */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #1c2b42',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
              {imported ? '✓ Imported to your CRM' : 'Ready to import into your CRM'}
            </span>
            {imported ? (
              <span style={{ color: '#34d399', fontWeight: 600, fontSize: 14 }}>✓ Course Imported</span>
            ) : (
              <button onClick={handleImport} disabled={importing} style={{
                padding: '10px 24px',
                background: importing ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: importing ? 'var(--text-muted, #6b7280)' : '#fff',
                fontWeight: 700, fontSize: 13, borderRadius: 8,
                border: 'none', cursor: importing ? 'not-allowed' : 'pointer',
              }}>
                {importing ? 'Importing...' : 'Import to CRM →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!course && !generating && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎓</div>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14 }}>Describe a topic above and AI will generate a complete course structure.</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 8 }}>One click imports it directly into your CRM.</p>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
  borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-muted, #6b7280)',
  marginBottom: 6, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
