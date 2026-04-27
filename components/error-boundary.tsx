'use client'

import * as React from 'react'
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-[40vh] px-4">
          <div className="max-w-sm w-full text-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-400 mb-5">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
