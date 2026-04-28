'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ReactFlowProvider, type Edge } from '@xyflow/react'
import { toast } from 'sonner'
import {
  Folder,
  ChevronDown,
  Plus,
  Pencil,
  CheckCircle,
  AlertTriangle,
  Layers,
  Save,
  Zap,
  Loader2,
  X,
  Check,
  Minimize2,
  Columns2,
  AlignJustify,
  MessageSquare,
  GitBranch,
  Kanban,
  FileJson,
} from 'lucide-react'
import CapabilityPalette from '@/components/automations/CapabilityPalette'
import AutomationCanvas from '@/components/automations/AutomationCanvas'
import ConfigPanel from '@/components/automations/ConfigPanel'
import AIRecommendations from '@/components/automations/AIRecommendations'
import GenerateBar from '@/components/automations/GenerateBar'
import ChatView, { type ChatMessage } from '@/components/automations/ChatView'
import PipelineView from '@/components/automations/PipelineView'
import DotOnView from '@/components/automations/DotOnView'
import type { CapabilityNodeType, CapabilityNodeData } from '@/components/automations/CapabilityNode'
import type { Capability } from '@/components/automations/capabilities'
import QuickConfigModal from '@/components/automations/QuickConfigModal'
import AppConfigModal from '@/components/automations/AppConfigModal'
import WorkflowSettingsModal, { type WorkflowSettings, DEFAULT_WORKFLOW_SETTINGS } from '@/components/automations/WorkflowSettingsModal'
import { Sparkles, Settings as SettingsIcon } from 'lucide-react'

type ViewMode = 'chat' | 'workflow' | 'pipeline' | 'doton'

const VIEW_TABS: { key: ViewMode; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'workflow', label: 'Workflow', icon: GitBranch },
  { key: 'pipeline', label: 'Pipeline', icon: Kanban },
  { key: 'doton', label: '.0n File', icon: FileJson },
]

interface SavedAutomation {
  id: string;
  name: string;
  nodes: CapabilityNodeType[];
  edges: Edge[];
  status: 'draft' | 'active' | 'paused';
  updatedAt: number;
}

export default function AutomationsPage() {
  const [nodes, setNodes] = useState<CapabilityNodeType[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [stepCounter, setStepCounter] = useState(0)
  const [automationName, setAutomationName] = useState('Untitled Automation')
  const [automationId, setAutomationId] = useState<string>(crypto.randomUUID())
  const [editing, setEditing] = useState(false)
  const [menuSize, setMenuSize] = useState<'expand' | 'compact' | 'minimize'>('expand')
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false)
  const [savedDrafts, setSavedDrafts] = useState<SavedAutomation[]>([])
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved')
  const [activating, setActivating] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('workflow')
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const pendingViewMode = useRef<ViewMode | null>(null)

  // Quick config modal — shows immediately when a node is added
  const [quickConfigNode, setQuickConfigNode] = useState<CapabilityNodeType | null>(null)

  // App config modal — shows on double-click of an app node
  const [appConfigNode, setAppConfigNode] = useState<CapabilityNodeType | null>(null)

  // AI Recommendations dropdown
  const [showAIRecs, setShowAIRecs] = useState(false)

  // Workflow Settings modal
  const [showWorkflowSettings, setShowWorkflowSettings] = useState(false)
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>(DEFAULT_WORKFLOW_SETTINGS)

  // Chat messages lifted to parent — persists across tab switches
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: "I'm your automation builder. Describe what you want to automate and I'll build it step by step.", timestamp: new Date() },
  ])

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === 'unsaved' && nodes.length > 0) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus, nodes.length])

  // Tab switch with unsaved warning
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    if (saveStatus === 'unsaved' && nodes.length > 0 && newMode !== viewMode) {
      pendingViewMode.current = newMode
      setShowUnsavedWarning(true)
    } else {
      setViewMode(newMode)
    }
  }, [saveStatus, nodes.length, viewMode])

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
  const nodeCount = nodes.length
  const hasTrigger = nodes.some(n => n.data.category === 'triggers')

  const handleNodeUpdate = useCallback((nodeId: string, config: Record<string, string>) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, config, configured: true } } : n
    ))
    setSaveStatus('unsaved')
  }, [])

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId(null)
    setSaveStatus('unsaved')
  }, [])

  const handleAddFromRecommendation = useCallback((capability: Capability) => {
    const newCounter = stepCounter + 1
    const yOffset = nodes.length * 140
    const data: CapabilityNodeData = {
      capabilityId: capability.id,
      name: capability.name,
      description: capability.description,
      icon: capability.icon,
      color: capability.color,
      category: capability.category,
      configured: !capability.configFields || capability.configFields.length === 0,
      steps: capability.steps,
      config: {},
    }

    const newNode: CapabilityNodeType = {
      id: `cap_${newCounter}`,
      type: 'capability',
      position: { x: 400, y: 80 + yOffset },
      data,
    }

    const lastNode = nodes[nodes.length - 1]
    const newEdge: Edge | null = lastNode ? {
      id: `e_${lastNode.id}_${newNode.id}`,
      source: lastNode.id,
      target: newNode.id,
      animated: true,
      style: { stroke: 'var(--core-cyan)', strokeWidth: 2 },
      type: 'smoothstep',
    } : null

    setNodes(prev => [...prev, newNode])
    if (newEdge) setEdges(prev => [...prev, newEdge])
    setStepCounter(newCounter)
    setSaveStatus('unsaved')

    // Show quick config modal if this capability has config fields
    if (capability.configFields && capability.configFields.length > 0) {
      setQuickConfigNode(newNode)
    }
  }, [nodes, stepCounter])

  const handleUpdateWorkflow = useCallback((newNodes: CapabilityNodeType[], newEdges: Edge[], name?: string) => {
    setNodes(newNodes)
    setEdges(newEdges)
    setStepCounter(newNodes.length)
    if (name) setAutomationName(name)
    setSaveStatus('unsaved')
  }, [])

  const handleSaveDraft = useCallback(() => {
    setSaveStatus('saving')
    const draft: SavedAutomation = {
      id: automationId,
      name: automationName,
      nodes,
      edges,
      status: 'draft',
      updatedAt: Date.now(),
    }

    setSavedDrafts(prev => {
      const idx = prev.findIndex(d => d.id === draft.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = draft
        return updated
      }
      return [draft, ...prev]
    })

    try {
      const all = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
      const idx = all.findIndex((d: SavedAutomation) => d.id === draft.id)
      if (idx >= 0) all[idx] = draft
      else all.unshift(draft)
      localStorage.setItem('0ncore-automations', JSON.stringify(all.slice(0, 50)))
    } catch {}

    setTimeout(() => {
      setSaveStatus('saved')
      toast.success('Draft saved')
    }, 300)
  }, [automationId, automationName, nodes, edges])

  const handleLoadDraft = useCallback((draft: SavedAutomation) => {
    setAutomationId(draft.id)
    setAutomationName(draft.name)
    setNodes(draft.nodes)
    setEdges(draft.edges)
    setStepCounter(draft.nodes.length)
    setSelectedNodeId(null)
    setShowWorkflowMenu(false)
    setSaveStatus('saved')
  }, [])

  const handleNewAutomation = useCallback(() => {
    setAutomationId(crypto.randomUUID())
    setAutomationName('Untitled Automation')
    setNodes([])
    setEdges([])
    setStepCounter(0)
    setSelectedNodeId(null)
    setShowWorkflowMenu(false)
    setSaveStatus('unsaved')
    setChatMessages([
      { id: 'welcome', role: 'assistant', content: "I'm your automation builder. Describe what you want to automate and I'll build it step by step.", timestamp: new Date() },
    ])
  }, [])

  const handleActivate = useCallback(async () => {
    if (nodes.length === 0 || !hasTrigger || activating) return
    setActivating(true)


    const dotOnSteps = nodes.map((node, i) => ({
      id: node.id,
      action: node.data.capabilityId || node.data.name || 'unknown',
      // Mirror as 'tool' + 'inputs' so /api/automations/execute can run the saved file directly.
      tool: node.data.capabilityId || node.data.name || 'unknown',
      name: node.data.name,
      inputs: node.data.config || {},
      input: {
        name: node.data.name,
        category: node.data.category,
        config: node.data.config || {},
        description: node.data.description,
      },
      ...(i > 0 ? { depends_on: [nodes[i - 1].id] } : {}),
    }))

    const triggerNode = nodes.find(n => n.data.category === 'triggers')
    const dotOnFile = {
      name: automationName,
      version: '1.0.0',
      description: `Automation: ${automationName} (${nodes.length} steps)`,
      triggers: [{
        type: triggerNode?.data.capabilityId || 'manual',
        config: triggerNode?.data.config || {},
      }],
      steps: dotOnSteps,
      metadata: {
        automation_id: automationId,
        created_at: new Date().toISOString(),
        node_count: nodes.length,
        source: 'visual_builder',
      },
    }

    try {
      const res = await fetch('/api/automations/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: automationName,
          description: `${nodes.length} steps, trigger: ${triggerNode?.data.name || 'manual'}`,
          dot_on_file: dotOnFile,
          nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
          status: 'active',
        }),
      })

      if (res.ok) {
        setSavedDrafts(prev => prev.map(d =>
          d.id === automationId ? { ...d, status: 'active' as const } : d
        ))
        try {
          const all = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
          const idx = all.findIndex((d: SavedAutomation) => d.id === automationId)
          if (idx >= 0) { all[idx].status = 'active'; localStorage.setItem('0ncore-automations', JSON.stringify(all)) }
        } catch {}

        toast.success(`"${automationName}" activated`, { description: 'Workflow is now live.' })
        setSaveStatus('saved')
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        toast.error('Activation failed', { description: data.error || 'Unknown error' })
      }
    } catch (err) {
      toast.error('Network error', { description: err instanceof Error ? err.message : 'Could not reach server' })
    } finally {
      setActivating(false)
    }
  }, [nodes, edges, hasTrigger, activating, automationName, automationId])

  // Load drafts from localStorage on mount
  useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
      setSavedDrafts(stored)
    } catch {}
  })

  // AI fill handler for quick config modal
  const handleAIFillConfig = useCallback(async (nodeId: string, capabilityId: string): Promise<Record<string, string> | null> => {
    try {
      const res = await fetch('/api/automations/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability_id: capabilityId,
          automation_name: automationName,
          existing_nodes: nodes.map(n => ({ id: n.id, name: n.data.name, category: n.data.category })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.config || null
      }
    } catch {}
    return null
  }, [automationName, nodes])

  const handleQuickConfigSave = useCallback((nodeId: string, config: Record<string, string>) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, config, configured: true } } : n
    ))
    setQuickConfigNode(null)
    setSaveStatus('unsaved')
    toast.success('Step configured')
  }, [])

  const handleNodeDoubleClick = useCallback((node: CapabilityNodeType) => {
    if (node.data.kind === 'app') {
      setAppConfigNode(node)
    } else {
      setSelectedNodeId(node.id)
    }
  }, [])

  const handleAppConfigSave = useCallback((nodeId: string, config: Record<string, string>, installationId: string | null) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config, configured: true, installationId } }
        : n
    ))
    setAppConfigNode(null)
    setSaveStatus('unsaved')
    toast.success('App configured')
  }, [])

  const menuSizeIcons = {
    minimize: Minimize2,
    compact: Columns2,
    expand: AlignJustify,
  } as const

  return (
    <div className="flex flex-col bg-core-bg" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-core-card border border-core-border rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-core-amber shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[15px] font-bold text-core-text">Unsaved changes</h3>
                <p className="text-[13px] text-core-text-dim mt-1">
                  You have unsaved changes to this automation. Save before switching views?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowUnsavedWarning(false)
                  pendingViewMode.current = null
                }}
                className="px-4 py-2 rounded-lg border border-core-border text-core-text-dim text-[13px] bg-transparent hover:bg-core-card-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingViewMode.current) setViewMode(pendingViewMode.current)
                  setShowUnsavedWarning(false)
                  pendingViewMode.current = null
                  toast.warning('Changes not saved', { description: 'Your changes will be lost if you leave without saving.' })
                }}
                className="px-4 py-2 rounded-lg border border-core-amber/30 text-core-amber text-[13px] bg-core-amber/10 hover:bg-core-amber/20 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  handleSaveDraft()
                  if (pendingViewMode.current) setViewMode(pendingViewMode.current)
                  setShowUnsavedWarning(false)
                  pendingViewMode.current = null
                }}
                className="px-4 py-2 rounded-lg bg-core-green text-core-bg text-[13px] font-bold hover:bg-core-green/90 transition-colors cursor-pointer"
              >
                Save & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Config Modal — shows immediately when a node with config fields is added */}
      {quickConfigNode && (
        <QuickConfigModal
          node={quickConfigNode}
          onSave={handleQuickConfigSave}
          onSkip={() => setQuickConfigNode(null)}
          onAIFill={handleAIFillConfig}
        />
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-[10px] border-b border-core-border bg-core-surface shrink-0">

        <div className="flex items-center gap-3">

          {/* Workflow Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-core-card border border-core-border rounded-lg text-core-text-dim text-xs cursor-pointer hover:text-core-text transition-colors"
            >
              <Folder className="w-3.5 h-3.5" />
              Workflows
              <ChevronDown className="w-3 h-3" />
            </button>

            {showWorkflowMenu && (
              <div className="absolute top-full left-0 mt-1 w-[280px] bg-core-card border border-core-border rounded-xl overflow-hidden z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                <button
                  onClick={handleNewAutomation}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-core-cyan text-[13px] font-semibold border-b border-core-border bg-transparent hover:bg-core-card-hover transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Automation
                </button>

                {savedDrafts.length === 0 ? (
                  <div className="px-3.5 py-4 text-core-text-muted text-xs text-center">
                    No saved workflows yet
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {savedDrafts.map(draft => (
                      <button
                        key={draft.id}
                        onClick={() => handleLoadDraft(draft)}
                        className={[
                          'w-full flex items-center justify-between px-3.5 py-2.5',
                          'text-left text-core-text text-[13px] border-b border-core-border/50',
                          'bg-transparent hover:bg-core-card-hover transition-colors cursor-pointer',
                          draft.id === automationId ? 'bg-core-card-hover' : '',
                        ].join(' ')}
                      >
                        <div>
                          <div className="font-semibold">{draft.name}</div>
                          <div className="text-[11px] text-core-text-muted mt-0.5">
                            {draft.nodes.length} steps · {new Date(draft.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span
                          className={[
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            draft.status === 'active'
                              ? 'bg-core-green/10 text-core-green'
                              : 'bg-core-amber/10 text-core-amber',
                          ].join(' ')}
                        >
                          {draft.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Automation Name */}
          {editing ? (
            <input
              autoFocus
              value={automationName}
              onChange={e => { setAutomationName(e.target.value); setSaveStatus('unsaved') }}
              onBlur={() => setEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              className="bg-core-card border border-core-cyan rounded-lg px-3 py-1.5 text-core-text text-[15px] font-bold outline-none w-60"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 m-0 p-0 bg-transparent border-none cursor-pointer"
            >
              <h1 className="text-[16px] font-bold text-core-text m-0">
                {automationName}
              </h1>
              <Pencil className="w-3 h-3 text-core-text-muted" />
            </button>
          )}

          {/* Status pills */}
          <div className="flex gap-2">
            <span
              className={[
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold',
                hasTrigger
                  ? 'bg-core-green/10 text-core-green'
                  : 'bg-core-amber/10 text-core-amber',
              ].join(' ')}
            >
              {hasTrigger
                ? <CheckCircle className="w-3 h-3" />
                : <AlertTriangle className="w-3 h-3" />}
              {hasTrigger ? 'Trigger' : 'Needs trigger'}
            </span>

            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-purple/10 text-core-purple">
              <Layers className="w-3 h-3" />
              {nodeCount} steps
            </span>

            <span
              className={[
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold',
                saveStatus === 'saved'
                  ? 'bg-core-green/10 text-core-green'
                  : saveStatus === 'saving'
                    ? 'bg-core-cyan/10 text-core-cyan'
                    : 'bg-core-border/30 text-core-text-muted',
              ].join(' ')}
            >
              {saveStatus === 'saved'
                ? <Check className="w-3 h-3" />
                : saveStatus === 'saving'
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Save className="w-3 h-3" />}
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex bg-core-card border border-core-border rounded-lg overflow-hidden">
            {VIEW_TABS.map(vt => {
              const VIcon = vt.icon
              return (
                <button
                  key={vt.key}
                  onClick={() => handleViewModeChange(vt.key)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 border-none text-[11px] font-semibold cursor-pointer transition-colors',
                    viewMode === vt.key
                      ? 'bg-core-green/15 text-core-green'
                      : 'bg-transparent text-core-text-muted hover:text-core-text',
                  ].join(' ')}
                >
                  <VIcon className="w-3 h-3" />
                  {vt.label}
                </button>
              )
            })}
          </div>

          {/* Menu size toggles */}
          <div className="flex bg-core-card border border-core-border rounded-lg overflow-hidden">
            {(['minimize', 'compact', 'expand'] as const).map(size => {
              const Icon = menuSizeIcons[size]
              return (
                <button
                  key={size}
                  onClick={() => setMenuSize(size)}
                  className={[
                    'px-2.5 py-1.5 border-none text-[11px] font-semibold cursor-pointer transition-colors',
                    menuSize === size
                      ? 'bg-core-border text-core-cyan'
                      : 'bg-transparent text-core-text-muted hover:text-core-text',
                  ].join(' ')}
                  title={size}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              )
            })}
          </div>

          {/* AI Recommendations dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAIRecs(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim text-[13px] cursor-pointer hover:text-core-text hover:border-core-text-dim transition-colors"
              title="AI Recommendations"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>AI</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showAIRecs && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-[340px] bg-core-card border border-core-border rounded-xl shadow-2xl overflow-hidden"
                onMouseLeave={() => setShowAIRecs(false)}
              >
                <AIRecommendations
                  nodes={nodes}
                  onAdd={cap => { handleAddFromRecommendation(cap); setShowAIRecs(false) }}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setShowWorkflowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim text-[13px] cursor-pointer hover:text-core-text hover:border-core-text-dim transition-colors"
            title="Workflow Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim text-[13px] cursor-pointer hover:text-core-text hover:border-core-text-dim transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            onClick={handleActivate}
            disabled={nodeCount === 0 || !hasTrigger || activating}
            className={[
              'flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-bold border-none transition-all',
              nodeCount > 0 && hasTrigger && !activating
                ? 'bg-gradient-to-br from-core-cyan to-core-cyan/80 text-core-bg cursor-pointer hover:opacity-90'
                : nodeCount > 0 && hasTrigger && activating
                  ? 'bg-core-cyan/10 text-core-cyan cursor-not-allowed'
                  : 'bg-core-border text-core-text-muted cursor-not-allowed',
            ].join(' ')}
          >
            {activating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />}
            {activating ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 relative">
        <ReactFlowProvider>

          {/* ═══ WORKFLOW VIEW ═══ */}
          {viewMode === 'workflow' && (
            <>
              <div className="flex-1 relative">
                <AutomationCanvas
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={(n) => { setNodes(n); setSaveStatus('unsaved') }}
                  onEdgesChange={(e) => { setEdges(e); setSaveStatus('unsaved') }}
                  onNodeSelect={setSelectedNodeId}
                  stepCounter={stepCounter}
                  onStepCounterUpdate={setStepCounter}
                  onNodeDoubleClick={handleNodeDoubleClick}
                />
                <GenerateBar onGenerate={(newNodes, newEdges) => {
                  setNodes(newNodes)
                  setEdges(newEdges)
                  setStepCounter(newNodes.length)
                  setAutomationName(newNodes.length > 0 ? 'Generated Automation' : automationName)
                  setSaveStatus('unsaved')
                }} />
              </div>
              {menuSize !== 'minimize' && !selectedNode && <CapabilityPalette size={menuSize} />}
              {selectedNode && (
                <ConfigPanel
                  node={selectedNode}
                  onUpdate={handleNodeUpdate}
                  onClose={() => setSelectedNodeId(null)}
                  onDelete={handleNodeDelete}
                />
              )}
            </>
          )}

          {/* ═══ CHAT VIEW ═══ */}
          {viewMode === 'chat' && (
            <>
              <div className="flex-1 relative">
                <ChatView
                  nodes={nodes}
                  edges={edges}
                  onUpdateWorkflow={handleUpdateWorkflow}
                  automationName={automationName}
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                />
              </div>
              {menuSize !== 'minimize' && <CapabilityPalette size={menuSize} />}
            </>
          )}

          {/* ═══ PIPELINE VIEW ═══ */}
          {viewMode === 'pipeline' && (
            <>
              <div className="flex-1 overflow-auto p-4">
                <PipelineView
                  nodes={nodes}
                  edges={edges}
                  onNodeSelect={setSelectedNodeId}
                  selectedNodeId={selectedNodeId}
                />
              </div>
              {selectedNode && (
                <ConfigPanel
                  node={selectedNode}
                  onUpdate={handleNodeUpdate}
                  onClose={() => setSelectedNodeId(null)}
                  onDelete={handleNodeDelete}
                />
              )}
            </>
          )}

          {/* ═══ .0N FILE VIEW ═══ */}
          {viewMode === 'doton' && (
            <div className="flex-1 overflow-auto">
              <DotOnView
                nodes={nodes}
                edges={edges}
                automationName={automationName}
                onImport={handleUpdateWorkflow}
              />
            </div>
          )}

        </ReactFlowProvider>
      </div>

      {/* Modals */}
      {quickConfigNode && (
        <QuickConfigModal
          node={quickConfigNode}
          onSave={handleQuickConfigSave}
          onSkip={() => setQuickConfigNode(null)}
          onAIFill={handleAIFillConfig}
        />
      )}

      {appConfigNode && (
        <AppConfigModal
          node={appConfigNode}
          onSave={handleAppConfigSave}
          onClose={() => setAppConfigNode(null)}
        />
      )}

      {showWorkflowSettings && (
        <WorkflowSettingsModal
          settings={{ ...workflowSettings, name: workflowSettings.name || automationName }}
          onSave={(next) => {
            setWorkflowSettings(next)
            if (next.name && next.name !== automationName) setAutomationName(next.name)
            setShowWorkflowSettings(false)
            setSaveStatus('unsaved')
            toast.success('Workflow settings saved')
          }}
          onClose={() => setShowWorkflowSettings(false)}
        />
      )}
    </div>
  )
}
