'use client'

import { useState } from 'react'

interface Lesson {
  id: string
  title: string
  duration: string
  completed: boolean
}

interface Module {
  id: string
  title: string
  description: string
  icon: string
  lessons: Lesson[]
  badge?: string
}

const MODULES: Module[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Set up your account, connect your CRM, and configure your first automation.',
    icon: '1',
    badge: 'START HERE',
    lessons: [
      { id: 'gs-1', title: 'Welcome to 0nCore', duration: '2 min', completed: false },
      { id: 'gs-2', title: 'Connect Your CRM', duration: '5 min', completed: false },
      { id: 'gs-3', title: 'Set Up Your Brand Board', duration: '4 min', completed: false },
      { id: 'gs-4', title: 'Train Your Company AI (K3)', duration: '6 min', completed: false },
      { id: 'gs-5', title: 'Install Your First Add-on', duration: '3 min', completed: false },
      { id: 'gs-6', title: 'Generate Your API Token', duration: '2 min', completed: false },
    ],
  },
  {
    id: 'social-mastery',
    title: 'Social Media Mastery',
    description: 'Connect accounts, generate bulk content, and automate your social presence.',
    icon: '2',
    lessons: [
      { id: 'sm-1', title: 'Connect Social Accounts via CRM', duration: '4 min', completed: false },
      { id: 'sm-2', title: 'AI Content Generation', duration: '5 min', completed: false },
      { id: 'sm-3', title: 'Bulk Post Generator (50+ posts)', duration: '6 min', completed: false },
      { id: 'sm-4', title: 'CSV Import & Export', duration: '3 min', completed: false },
      { id: 'sm-5', title: 'Scheduling & Analytics', duration: '4 min', completed: false },
    ],
  },
  {
    id: 'email-builder',
    title: 'Email Builder Pro',
    description: 'Build drag-and-drop emails, use AI generation, and connect design tools.',
    icon: '3',
    lessons: [
      { id: 'eb-1', title: 'Unlayer Editor Basics', duration: '5 min', completed: false },
      { id: 'eb-2', title: 'AI Email Generation', duration: '4 min', completed: false },
      { id: 'eb-3', title: 'Canva + Figma Integration', duration: '6 min', completed: false },
      { id: 'eb-4', title: 'Save & Manage Templates', duration: '3 min', completed: false },
      { id: 'eb-5', title: 'Send Campaigns via CRM', duration: '4 min', completed: false },
    ],
  },
  {
    id: 'pipeline-contacts',
    title: 'Pipeline & Contacts',
    description: 'Manage your sales pipeline, import contacts, and automate follow-ups.',
    icon: '4',
    lessons: [
      { id: 'pc-1', title: 'Pipeline Board View', duration: '4 min', completed: false },
      { id: 'pc-2', title: 'Import & Segment Contacts', duration: '5 min', completed: false },
      { id: 'pc-3', title: 'AI-Powered Lead Scoring', duration: '4 min', completed: false },
      { id: 'pc-4', title: 'Automated Follow-up Sequences', duration: '6 min', completed: false },
    ],
  },
  {
    id: 'ai-security',
    title: '0nAI Security',
    description: 'Understand trust scores, challenge system, and behavioral authentication.',
    icon: '5',
    lessons: [
      { id: 'as-1', title: 'How Trust Scoring Works', duration: '5 min', completed: false },
      { id: 'as-2', title: 'Capability Tiers (T1-T4)', duration: '4 min', completed: false },
      { id: 'as-3', title: 'Challenge System', duration: '5 min', completed: false },
      { id: 'as-4', title: 'Reading the Security Timeline', duration: '3 min', completed: false },
    ],
  },
  {
    id: 'analytics-cro',
    title: 'Analytics & CRO9',
    description: 'Connect Google Analytics, run CRO audits, and optimize conversions.',
    icon: '6',
    lessons: [
      { id: 'ac-1', title: 'Upload Google SA Key', duration: '4 min', completed: false },
      { id: 'ac-2', title: 'GA4 Dashboard Overview', duration: '5 min', completed: false },
      { id: 'ac-3', title: 'Search Console Data', duration: '4 min', completed: false },
      { id: 'ac-4', title: 'CRO9 Score Breakdown', duration: '6 min', completed: false },
      { id: 'ac-5', title: 'Acting on Recommendations', duration: '5 min', completed: false },
    ],
  },
  {
    id: 'wordpress',
    title: 'WordPress Integration',
    description: 'Install the 0nCore WP plugin, generate your token, and connect your site.',
    icon: '7',
    lessons: [
      { id: 'wp-1', title: 'Download & Install Plugin', duration: '3 min', completed: false },
      { id: 'wp-2', title: 'Generate API Token', duration: '2 min', completed: false },
      { id: 'wp-3', title: 'Configure CRM Sync', duration: '4 min', completed: false },
      { id: 'wp-4', title: 'Set Up Tracking (GA4 + Meta)', duration: '4 min', completed: false },
      { id: 'wp-5', title: 'AI Forms & Booking Embeds', duration: '5 min', completed: false },
    ],
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Master the kanban board, AI assistant, focus mode, and project canvas.',
    icon: '8',
    lessons: [
      { id: 'tm-1', title: 'Kanban Board Basics', duration: '3 min', completed: false },
      { id: 'tm-2', title: 'Personal AI Assistant', duration: '5 min', completed: false },
      { id: 'tm-3', title: 'Focus Mode & Timer', duration: '3 min', completed: false },
      { id: 'tm-4', title: 'AutoPlan Your Day', duration: '4 min', completed: false },
      { id: 'tm-5', title: 'Client & Project Management', duration: '5 min', completed: false },
    ],
  },
]

const STORAGE_KEY = '0ncore_learn_progress'

export default function LearnPage() {
  const [expandedModule, setExpandedModule] = useState<string | null>('getting-started')
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  function toggleLesson(lessonId: string) {
    setCompletedLessons(prev => {
      const next = prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const totalLessons = MODULES.reduce((sum, m) => sum + m.lessons.length, 0)
  const completedCount = completedLessons.length
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold">0nBoarding 101</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
              {MODULES.length} Modules
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Master every feature of 0nCore. Complete at your own pace.</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-primary">{progressPct}%</div>
          <div className="text-[10px] text-muted-foreground">{completedCount}/{totalLessons} lessons</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted mb-8 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {MODULES.map(mod => {
          const modCompleted = mod.lessons.filter(l => completedLessons.includes(l.id)).length
          const isExpanded = expandedModule === mod.id
          const modPct = mod.lessons.length > 0 ? Math.round((modCompleted / mod.lessons.length) * 100) : 0
          const isDone = modCompleted === mod.lessons.length

          return (
            <div key={mod.id} className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
              <button
                onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black shrink-0 transition-colors ${isDone ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                  {isDone ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{mod.title}</span>
                    {mod.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase">{mod.badge}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{modCompleted}/{mod.lessons.length}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${modPct}%` }} />
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 space-y-1 border-t border-border/30 pt-3">
                  {mod.lessons.map(lesson => {
                    const isDone = completedLessons.includes(lesson.id)
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => toggleLesson(lesson.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors group text-left"
                      >
                        <div className={`flex items-center justify-center w-5 h-5 rounded-md border-[1.5px] shrink-0 transition-all ${isDone ? 'bg-primary border-primary' : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'}`}>
                          {isDone && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <span className={`text-xs flex-1 ${isDone ? 'line-through text-muted-foreground/40' : 'text-foreground'}`}>{lesson.title}</span>
                        <span className="text-[10px] text-muted-foreground/50">{lesson.duration}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
