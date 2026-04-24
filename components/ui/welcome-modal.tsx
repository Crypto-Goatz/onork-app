'use client'

import { useState, useEffect } from 'react'
import { X, ArrowRight, Sparkles } from 'lucide-react'

interface WelcomeStep {
  title: string
  description: string
  icon: React.ReactNode
  tip?: string
}

interface WelcomeModalProps {
  storageKey: string
  title: string
  subtitle: string
  steps: WelcomeStep[]
  onComplete?: () => void
}

export function WelcomeModal({ storageKey, title, subtitle, steps, onComplete }: WelcomeModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const dismissed = localStorage.getItem(`welcome_${storageKey}`)
    if (!dismissed) setOpen(true)
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(`welcome_${storageKey}`, 'true')
    setOpen(false)
    onComplete?.()
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  if (!open) return null

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        {/* Header gradient */}
        <div className="relative px-7 pt-7 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-[#6EE05A]/[0.06] to-transparent pointer-events-none" />
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#6EE05A]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6EE05A]">Welcome</span>
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-[13px] text-white/40 mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Step content */}
        <div className="px-7 py-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-white mb-1">{current.title}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed">{current.description}</p>
              {current.tip && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-[#6EE05A]/[0.06] border border-[#6EE05A]/20">
                  <p className="text-[12px] text-[#6EE05A]/80 leading-relaxed">
                    <span className="font-bold">Pro tip:</span> {current.tip}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-6 flex items-center justify-between">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === step ? 'bg-[#6EE05A] w-4' : i < step ? 'bg-[#6EE05A]/40' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="px-4 py-2 rounded-lg text-[12px] text-white/30 hover:text-white/50 bg-transparent border-none cursor-pointer transition-colors"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#6EE05A] text-[#0d1117] text-[13px] font-bold hover:bg-[#6EE05A]/90 transition-colors cursor-pointer border-none"
            >
              {step < steps.length - 1 ? 'Next' : 'Get Started'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
