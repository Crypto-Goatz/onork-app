'use client'

import { useState, useCallback } from 'react'
import { ReactFlowProvider, type Edge } from '@xyflow/react'
import CapabilityPalette from '@/components/automations/CapabilityPalette'
import AutomationCanvas from '@/components/automations/AutomationCanvas'
import ConfigPanel from '@/components/automations/ConfigPanel'
import type { CapabilityNodeType } from '@/components/automations/CapabilityNode'

export default function AutomationsPage() {
  const [nodes, setNodes] = useState<CapabilityNodeType[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [stepCounter, setStepCounter] = useState(0)
  const [automationName, setAutomationName] = useState('Untitled Automation')
  const [editing, setEditing] = useState(false)

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  const handleNodeUpdate = useCallback((nodeId: string, config: Record<string, string>) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config, configured: true } }
        : n
    ))
  }, [])

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNodeId(null)
  }, [])

  const nodeCount = nodes.length
  const configuredCount = nodes.filter(n => n.data.configured).length
  const hasTrigger = nodes.some(n => n.data.category === 'triggers')

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {editing ? (
            <input
              autoFocus
              value={automationName}
              onChange={e => setAutomationName(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setEditing(false)}
              style={{
                background: '#141e30', border: '1px solid #2dd4bf', borderRadius: 8,
                padding: '6px 12px', color: '#e8ecf2', fontSize: 15, fontWeight: 700,
                outline: 'none', width: 260, fontFamily: '-apple-system, sans-serif',
              }}
            />
          ) : (
            <h1
              onClick={() => setEditing(true)}
              style={{
                fontSize: 16, fontWeight: 700, color: '#e8ecf2', cursor: 'pointer',
                margin: 0, fontFamily: '-apple-system, sans-serif',
              }}
            >
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
              {hasTrigger ? '✓ Trigger set' : '⚠ Needs trigger'}
            </span>
            <span style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
              fontFamily: '-apple-system, sans-serif',
            }}>
              {nodeCount} steps · {configuredCount} configured
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setNodes([]); setEdges([]); setStepCounter(0); setSelectedNodeId(null); }}
            style={{
              padding: '8px 16px', background: 'none', border: '1px solid #1c2b42',
              borderRadius: 8, color: '#556880', fontSize: 13, cursor: 'pointer',
              fontFamily: '-apple-system, sans-serif',
            }}
          >Clear</button>
          <button style={{
            padding: '8px 20px',
            background: nodeCount > 0 && hasTrigger ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)' : '#1c2b42',
            color: nodeCount > 0 && hasTrigger ? '#0c1220' : '#556880',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: nodeCount > 0 && hasTrigger ? 'pointer' : 'not-allowed',
            fontFamily: '-apple-system, sans-serif',
          }}>
            Save & Activate
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ReactFlowProvider>
          <CapabilityPalette />
          <AutomationCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNodeId}
            stepCounter={stepCounter}
            onStepCounterUpdate={setStepCounter}
          />
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
