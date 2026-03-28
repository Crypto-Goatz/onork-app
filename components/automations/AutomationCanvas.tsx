'use client'

import { useCallback, useState, useMemo, type DragEvent } from 'react'
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

const nodeTypes = { capability: CapabilityNode }

interface AutomationCanvasProps {
  nodes: CapabilityNodeType[];
  edges: Edge[];
  onNodesChange: (nodes: CapabilityNodeType[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  stepCounter: number;
  onStepCounterUpdate: (n: number) => void;
}

export default function AutomationCanvas({
  nodes, edges, onNodesChange: setNodes, onEdgesChange: setEdges,
  onNodeSelect, stepCounter, onStepCounterUpdate,
}: AutomationCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

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
        animated: true,
        style: { stroke: '#2dd4bf', strokeWidth: 2 },
        type: 'smoothstep',
      }, edges))
    },
    [edges, setEdges]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: CapabilityNodeType) => onNodeSelect(node.id),
    [onNodeSelect]
  )

  const handlePaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/0n-capability')
    if (!raw) return

    const cap: Capability = JSON.parse(raw)
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const newCounter = stepCounter + 1

    const data: CapabilityNodeData = {
      capabilityId: cap.id,
      name: cap.name,
      description: cap.description,
      icon: cap.icon,
      color: cap.color,
      category: cap.category,
      configured: !cap.configFields || cap.configFields.length === 0,
      steps: cap.steps,
      config: {},
    }

    const newNode: CapabilityNodeType = {
      id: `cap_${newCounter}`,
      type: 'capability',
      position,
      data,
    }

    setNodes([...nodes, newNode])
    onStepCounterUpdate(newCounter)
  }, [nodes, stepCounter, setNodes, onStepCounterUpdate, screenToFlowPosition])

  const defaultEdgeOptions = useMemo(() => ({
    animated: true,
    style: { stroke: '#2dd4bf', strokeWidth: 2 },
    type: 'smoothstep' as const,
  }), [])

  return (
    <div style={{ flex: 1, width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        defaultEdgeOptions={defaultEdgeOptions}
        colorMode="dark"
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1c2b42" />
        <Controls
          style={{ background: '#141e30', border: '1px solid #1c2b42', borderRadius: 10 }}
        />
      </ReactFlow>
    </div>
  )
}
