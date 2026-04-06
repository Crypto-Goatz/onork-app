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
        animated: true,
        style: { stroke: 'var(--color-cyan, #14b8a6)', strokeWidth: 2 },
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
    const newCounter = stepCounter + 1

    // Position: center of canvas, stacked vertically
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

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

    // Auto-connect to the last node
    const lastNode = nodes[nodes.length - 1]
    const updatedNodes = [...nodes, newNode]
    const updatedEdges = lastNode ? [...edges, {
      id: `e_${lastNode.id}_${newNode.id}`,
      source: lastNode.id,
      target: newNode.id,
      animated: true,
      style: { stroke: 'var(--color-cyan, #14b8a6)', strokeWidth: 2 },
      type: 'smoothstep',
    }] : edges

    setNodes(updatedNodes)
    setEdges(updatedEdges)
    onStepCounterUpdate(newCounter)
  }, [nodes, edges, stepCounter, setNodes, setEdges, onStepCounterUpdate, screenToFlowPosition])

  const defaultEdgeOptions = useMemo(() => ({
    animated: true,
    style: { stroke: 'var(--color-cyan, #14b8a6)', strokeWidth: 2 },
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
