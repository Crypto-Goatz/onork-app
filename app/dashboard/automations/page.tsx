'use client'

import { useState, useCallback, useRef } from 'react'
import { ReactFlowProvider, type Edge } from '@xyflow/react'
import CapabilityPalette from '@/components/automations/CapabilityPalette'
import AutomationCanvas from '@/components/automations/AutomationCanvas'
import ConfigPanel from '@/components/automations/ConfigPanel'
import AIRecommendations from '@/components/automations/AIRecommendations'
import GenerateBar from '@/components/automations/GenerateBar'
import type { CapabilityNodeType, CapabilityNodeData } from '@/components/automations/CapabilityNode'
import type { Capability } from '@/components/automations/capabilities'

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

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
  const nodeCount = nodes.length
  const configuredCount = nodes.filter(n => n.data.configured).length
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

    // Auto-connect to last node
    const lastNode = nodes[nodes.length - 1]
    const newEdge: Edge | null = lastNode ? {
      id: `e_${lastNode.id}_${newNode.id}`,
      source: lastNode.id,
      target: newNode.id,
      animated: true,
      style: { stroke: '#2dd4bf', strokeWidth: 2 },
      type: 'smoothstep',
    } : null

    setNodes(prev => [...prev, newNode])
    if (newEdge) setEdges(prev => [...prev, newEdge])
    setStepCounter(newCounter)
    setSaveStatus('unsaved')
  }, [nodes, stepCounter])

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

    // Save to localStorage for persistence
    try {
      const all = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
      const idx = all.findIndex((d: SavedAutomation) => d.id === draft.id)
      if (idx >= 0) all[idx] = draft
      else all.unshift(draft)
      localStorage.setItem('0ncore-automations', JSON.stringify(all.slice(0, 50)))
    } catch {}

    setTimeout(() => setSaveStatus('saved'), 300)
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
  }, [])

  // Load drafts from localStorage on mount
  useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
      setSavedDrafts(stored)
    } catch {}
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      background: '#0c1220',
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1c2b42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0e1825',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Workflow Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', background: '#141e30', border: '1px solid #1c2b42',
                borderRadius: 8, color: '#8b9ab5', fontSize: 12, cursor: 'pointer',
                fontFamily: '-apple-system, sans-serif',
              }}
            >
              <span style={{ fontSize: 14 }}>📂</span>
              Workflows
              <span style={{ fontSize: 10 }}>▼</span>
            </button>

            {showWorkflowMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                width: 280, background: '#141e30', border: '1px solid #1c2b42',
                borderRadius: 10, overflow: 'hidden', zIndex: 100,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}>
                <button onClick={handleNewAutomation} style={{
                  width: '100%', padding: '10px 14px', background: 'none',
                  border: 'none', borderBottom: '1px solid #1c2b42',
                  color: '#2dd4bf', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  textAlign: 'left', fontFamily: '-apple-system, sans-serif',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span>+</span> New Automation
                </button>
                {savedDrafts.length === 0 ? (
                  <div style={{ padding: '16px 14px', color: '#556880', fontSize: 12, textAlign: 'center', fontFamily: '-apple-system, sans-serif' }}>
                    No saved workflows yet
                  </div>
                ) : (
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {savedDrafts.map(draft => (
                      <button
                        key={draft.id}
                        onClick={() => handleLoadDraft(draft)}
                        style={{
                          width: '100%', padding: '10px 14px', background: draft.id === automationId ? '#1a2740' : 'none',
                          border: 'none', borderBottom: '1px solid rgba(28,43,66,0.5)',
                          color: '#e8ecf2', fontSize: 13, cursor: 'pointer',
                          textAlign: 'left', fontFamily: '-apple-system, sans-serif',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                        onMouseLeave={e => e.currentTarget.style.background = draft.id === automationId ? '#1a2740' : 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{draft.name}</div>
                          <div style={{ fontSize: 11, color: '#556880', marginTop: 2 }}>
                            {draft.nodes.length} steps · {new Date(draft.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                          background: draft.status === 'active' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                          color: draft.status === 'active' ? '#34d399' : '#fbbf24',
                        }}>{draft.status}</span>
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
              onChange={e => { setAutomationName(e.target.value); setSaveStatus('unsaved'); }}
              onBlur={() => setEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              style={{
                background: '#141e30', border: '1px solid #2dd4bf', borderRadius: 8,
                padding: '6px 12px', color: '#e8ecf2', fontSize: 15, fontWeight: 700,
                outline: 'none', width: 240, fontFamily: '-apple-system, sans-serif',
              }}
            />
          ) : (
            <h1 onClick={() => setEditing(true)} style={{
              fontSize: 16, fontWeight: 700, color: '#e8ecf2', cursor: 'pointer',
              margin: 0, fontFamily: '-apple-system, sans-serif',
            }}>
              {automationName}
              <span style={{ fontSize: 11, color: '#556880', marginLeft: 8 }}>✎</span>
            </h1>
          )}

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: hasTrigger ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
              color: hasTrigger ? '#34d399' : '#fbbf24',
              fontFamily: '-apple-system, sans-serif',
            }}>
              {hasTrigger ? '✓ Trigger' : '⚠ Needs trigger'}
            </span>
            <span style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
              fontFamily: '-apple-system, sans-serif',
            }}>
              {nodeCount} steps
            </span>
            <span style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: saveStatus === 'saved' ? 'rgba(52,211,153,0.1)' : saveStatus === 'saving' ? 'rgba(45,212,191,0.1)' : 'rgba(85,104,128,0.1)',
              color: saveStatus === 'saved' ? '#34d399' : saveStatus === 'saving' ? '#2dd4bf' : '#556880',
              fontFamily: '-apple-system, sans-serif',
            }}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : '○ Unsaved'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Menu size toggles */}
          <div style={{ display: 'flex', background: '#141e30', borderRadius: 8, border: '1px solid #1c2b42', overflow: 'hidden' }}>
            {(['minimize', 'compact', 'expand'] as const).map(size => (
              <button key={size} onClick={() => setMenuSize(size)} style={{
                padding: '6px 10px', background: menuSize === size ? '#1c2b42' : 'none',
                border: 'none', color: menuSize === size ? '#2dd4bf' : '#556880',
                fontSize: 11, cursor: 'pointer', fontWeight: 600,
                fontFamily: '-apple-system, sans-serif',
              }}>{size === 'minimize' ? '—' : size === 'compact' ? '◧' : '☰'}</button>
            ))}
          </div>
          <button onClick={handleSaveDraft} style={{
            padding: '8px 16px', background: 'none',
            border: '1px solid #1c2b42', borderRadius: 8,
            color: '#8b9ab5', fontSize: 13, cursor: 'pointer',
            fontFamily: '-apple-system, sans-serif',
          }}>Save Draft</button>
          <button style={{
            padding: '8px 20px',
            background: nodeCount > 0 && hasTrigger ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)' : '#1c2b42',
            color: nodeCount > 0 && hasTrigger ? '#0c1220' : '#556880',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: nodeCount > 0 && hasTrigger ? 'pointer' : 'not-allowed',
            fontFamily: '-apple-system, sans-serif',
          }}>Activate</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <ReactFlowProvider>
          {/* Canvas (full width) */}
          <div style={{ flex: 1, position: 'relative' }}>
            <AutomationCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={(n) => { setNodes(n); setSaveStatus('unsaved'); }}
              onEdgesChange={(e) => { setEdges(e); setSaveStatus('unsaved'); }}
              onNodeSelect={setSelectedNodeId}
              stepCounter={stepCounter}
              onStepCounterUpdate={setStepCounter}
            />

            {/* AI Recommendations — floating on left */}
            <AIRecommendations nodes={nodes} onAdd={handleAddFromRecommendation} />

            {/* Generate bar — floating on bottom center */}
            <GenerateBar onGenerate={(newNodes, newEdges) => {
              setNodes(newNodes)
              setEdges(newEdges)
              setStepCounter(newNodes.length)
              setAutomationName(newNodes.length > 0 ? 'Generated Automation' : automationName)
              setSaveStatus('unsaved')
            }} />
          </div>

          {/* Right side: Menu + Config Panel */}
          {menuSize !== 'minimize' && !selectedNode && <CapabilityPalette size={menuSize} />}
          {selectedNode && (
            <ConfigPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleNodeDelete}
            />
          )}
        </ReactFlowProvider>
      </div>
    </div>
  )
}
