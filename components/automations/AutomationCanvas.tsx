'use client'

import { useCallback, useMemo, useEffect, type DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Edge,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CapabilityNode, { type CapabilityNodeType, type CapabilityNodeData } from './CapabilityNode'
import type { Capability } from './capabilities'
import { aiEdgeTypes } from '@/components/ai/edge'

const nodeTypes = { capability: CapabilityNode }
const edgeTypes = aiEdgeTypes

interface AutomationCanvasProps {
  nodes: CapabilityNodeType[];
  edges: Edge[];
  onNodesChange: (nodes: CapabilityNodeType[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  stepCounter: number;
  onStepCounterUpdate: (n: number) => void;
  onNodeDoubleClick?: (node: CapabilityNodeType) => void;
}

export default function AutomationCanvas({
  nodes, edges, onNodesChange: setNodes, onEdgesChange: setEdges,
  onNodeSelect, stepCounter, onStepCounterUpdate, onNodeDoubleClick,
}: AutomationCanvasProps) {
  const { screenToFlowPosition, fitView } = useReactFlow()

  // Auto-recenter when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100)
    }
  }, [nodes.length, fitView])

  const handleNodesChange: OnNodesChange<CapabilityNodeType> = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, nodes) as CapabilityNodeType[]),
    [nodes, setNodes]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  )

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      setEdges(addEdge({
        ...connection,
        type: 'animated',
        data: { status: 'running' },
      }, edges))
    },
    [edges, setEdges]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: CapabilityNodeType) => onNodeSelect(node.id),
    [onNodeSelect]
  )

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: CapabilityNodeType) => onNodeDoubleClick?.(node),
    [onNodeDoubleClick]
  )

  const handlePaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const capRaw = e.dataTransfer.getData('application/0n-capability')
    const appRaw = e.dataTransfer.getData('application/0n-app')
    const switchRaw = e.dataTransfer.getData('application/0n-switch')
    if (!capRaw && !appRaw && !switchRaw) return

    const newCounter = stepCounter + 1
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    let data: CapabilityNodeData
    let idPrefix = 'cap'

    if (switchRaw) {
      const sw = JSON.parse(switchRaw) as {
        kind: 'switch'
        switch_id: string
        name: string
        description: string
        tool: { name: string; service: string; method: string } | null
        steps: Array<{ tool: string; params: Record<string, unknown> }>
        is_multi: boolean
        tags: string[]
      }
      data = {
        capabilityId: `switch_${sw.switch_id}`,
        name: sw.name,
        description: sw.description || (sw.tool ? `Run ${sw.tool.name}` : 'Run saved switch'),
        icon: 'Power',
        color: '#7ed957',
        category: 'switches',
        configured: true,
        steps: sw.is_multi
          ? sw.steps.map(s => `Run ${s.tool}`)
          : sw.tool
          ? [`Fire ${sw.tool.method} ${sw.tool.name}`]
          : ['Run saved switch'],
        config: {},
        kind: 'switch',
        switchId: sw.switch_id,
        toolName: sw.tool?.name ?? null,
        toolMethod: sw.tool?.method ?? null,
        toolService: sw.tool?.service ?? null,
        isMulti: sw.is_multi,
      }
      idPrefix = 'sw'
    } else if (appRaw) {
      const app = JSON.parse(appRaw) as {
        kind: 'app'; app_id: string; slug: string; name: string; description: string;
        icon: string | null; category: string; installation_id: string | null; installed: boolean;
      }
      data = {
        capabilityId: `app_${app.slug}`,
        name: app.name,
        description: app.description,
        icon: app.icon || app.name.charAt(0),
        color: '#7ed957',
        category: app.category,
        configured: app.installed,
        steps: ['Run installed .0n app'],
        config: {},
        kind: 'app',
        appId: app.app_id,
        appSlug: app.slug,
        installationId: app.installation_id,
      }
      idPrefix = 'app'
    } else {
      const cap: Capability = JSON.parse(capRaw)
      data = {
        capabilityId: cap.id,
        name: cap.name,
        description: cap.description,
        icon: cap.icon,
        color: cap.color,
        category: cap.category,
        configured: !cap.configFields || cap.configFields.length === 0,
        steps: cap.steps,
        config: {},
        kind: 'capability',
      }
      idPrefix = 'cap'
    }

    const newNode: CapabilityNodeType = {
      id: `${idPrefix}_${newCounter}`,
      type: 'capability',
      position,
      data,
    }

    // Auto-connect to the last node
    const lastNode = nodes[nodes.length - 1]
    const updatedNodes = [...nodes, newNode]
    const updatedEdges = lastNode ? [...edges, {
      id: `e_${lastNode.id}_${newNode.id}`,
      source: lastNode.id,
      target: newNode.id,
      type: 'animated',
      data: { status: 'running' as const },
    }] : edges

    setNodes(updatedNodes)
    setEdges(updatedEdges)
    onStepCounterUpdate(newCounter)
  }, [nodes, edges, stepCounter, setNodes, setEdges, onStepCounterUpdate, screenToFlowPosition])

  const defaultEdgeOptions = useMemo(() => ({
    type: 'animated' as const,
    data: { status: 'running' as const },
  }), [])

  return (
    <div style={{ flex: 1, width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        defaultEdgeOptions={defaultEdgeOptions}
        colorMode="dark"
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1c2b42" />
        <Controls
          showInteractive={false}
          style={{
            background: 'var(--bg-card, #1f2937)',
            border: '1px solid #1c2b42',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        />
      </ReactFlow>
    </div>
  )
}
