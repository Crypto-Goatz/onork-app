'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, Layers, CheckCircle, Loader2, ArrowRight, GraduationCap } from 'lucide-react'

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
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-core-text m-0 mb-1">AI Course Generator</h1>
        <p className="text-[13px] text-core-text-muted">
          Describe a topic — AI builds the entire course and imports it into your CRM.
        </p>
      </div>

      {/* Generator Form */}
      <div className="bg-core-card border border-core-border rounded-[14px] p-6 mb-6">
        <div className="flex flex-col gap-[14px]">
          <div>
            <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
              What should the course teach?
            </label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Facebook Ads for Local Businesses, How to Close More Deals, Email Marketing Fundamentals"
              className="w-full px-4 py-3 bg-core-surface border border-core-border rounded-[10px] text-core-text text-[14px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
            />
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
                Target Audience
              </label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. small business owners, real estate agents"
                className="w-full px-4 py-3 bg-core-surface border border-core-border rounded-[10px] text-core-text text-[14px] outline-none transition-colors duration-200 focus:border-core-cyan placeholder:text-core-text-muted"
              />
            </div>
            <div>
              <label className="block text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-[0.06em]">
                Modules
              </label>
              <select
                value={moduleCount}
                onChange={e => setModuleCount(e.target.value)}
                className="w-full px-4 py-3 bg-core-surface border border-core-border rounded-[10px] text-core-text text-[14px] outline-none transition-colors duration-200 focus:border-core-cyan cursor-pointer"
              >
                <option value="3">3 modules</option>
                <option value="5">5 modules</option>
                <option value="7">7 modules</option>
                <option value="10">10 modules</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="flex items-center justify-center gap-2 w-full py-[13px] rounded-[10px] font-bold text-[15px] border-none cursor-pointer transition-all duration-200 disabled:cursor-not-allowed bg-core-cyan text-core-bg disabled:bg-core-border disabled:text-core-text-muted"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating course...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Course
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Course Preview */}
      {course && (
        <div className="bg-core-card border border-core-border rounded-[14px] overflow-hidden">
          {/* Course Header */}
          <div className="p-6 border-b border-core-border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-[20px] font-bold text-core-text m-0 mb-1.5">{course.title}</h2>
                <p className="text-[13px] text-core-text-dim leading-relaxed">{course.description}</p>
              </div>
              <div className="flex gap-3 shrink-0 ml-5">
                <div className="text-center">
                  <div className="text-[22px] font-extrabold text-core-cyan">{course.modules.length}</div>
                  <div className="text-[10px] text-core-text-muted">modules</div>
                </div>
                <div className="text-center">
                  <div className="text-[22px] font-extrabold text-core-purple">{totalLessons}</div>
                  <div className="text-[10px] text-core-text-muted">lessons</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="px-6 pb-6">
            {course.modules.map((mod, i) => (
              <div
                key={i}
                className="mt-4 bg-core-surface border border-core-border rounded-[10px] overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center gap-2.5 border-b border-core-border">
                  <span className="w-6 h-6 rounded-[6px] bg-core-cyan/10 flex items-center justify-center text-[11px] font-extrabold text-core-cyan shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[14px] font-semibold text-core-text">{mod.title}</span>
                  <span className="text-[11px] text-core-text-muted ml-auto">{mod.lessons.length} lessons</span>
                </div>
                <div className="px-4 py-2">
                  {mod.lessons.map((lesson, j) => (
                    <div
                      key={j}
                      className={`flex gap-2.5 items-center py-2 ${
                        j < mod.lessons.length - 1 ? 'border-b border-core-border/50' : ''
                      }`}
                    >
                      <span className="text-[10px] text-core-text-muted shrink-0">
                        {i + 1}.{j + 1}
                      </span>
                      <span className="text-[13px] text-core-text-dim">{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Import Footer */}
          <div className="px-6 py-4 border-t border-core-border flex justify-between items-center">
            <span className="text-[12px] text-core-text-muted flex items-center gap-1.5">
              {imported ? (
                <>
                  <CheckCircle size={13} className="text-core-green" />
                  Imported to your CRM
                </>
              ) : (
                <>
                  <BookOpen size={13} />
                  Ready to import into your CRM
                </>
              )}
            </span>

            {imported ? (
              <span className="flex items-center gap-1.5 text-core-green font-semibold text-[14px]">
                <CheckCircle size={15} />
                Course Imported
              </span>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2.5 bg-core-purple text-white font-bold text-[13px] rounded-[8px] border-none cursor-pointer transition-all duration-200 disabled:cursor-not-allowed disabled:bg-core-border disabled:text-core-text-muted"
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import to CRM
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!course && !generating && (
        <div className="bg-core-card border border-core-border rounded-[14px] px-6 py-12 text-center">
          <div className="flex justify-center mb-3 opacity-30">
            <GraduationCap size={40} className="text-core-text-muted" />
          </div>
          <p className="text-core-text-muted text-[14px]">
            Describe a topic above and AI will generate a complete course structure.
          </p>
          <p className="text-core-text-muted text-[12px] mt-2">
            One click imports it directly into your CRM.
          </p>
        </div>
      )}
    </div>
  )
}
