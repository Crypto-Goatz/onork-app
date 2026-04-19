export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  clientId?: string
  projectId?: string
  subtasks?: { id: string; title: string; done: boolean }[]
  source?: 'local' | 'email'
}

export interface Credential {
  id: string
  service: string
  username: string
  password?: string
}

export interface Client {
  id: string
  name: string
  industry?: string
  description?: string
  credentials: Credential[]
  driveLink?: string
  slackChannel?: string
  githubRepo?: string
}

export interface Email {
  id: string
  threadId: string
  snippet: string
  from: string
  subject: string
  date: string
  isRead: boolean
}

export interface CanvasNode {
  id: string
  type: 'task' | 'note' | 'milestone' | 'trigger'
  x: number
  y: number
  width?: number
  height?: number
  title: string
  content?: string
  color?: string
}

export interface CanvasLink {
  id: string
  fromId: string
  toId: string
}

export interface Project {
  id: string
  clientId?: string
  title: string
  status: 'planning' | 'active' | 'completed' | 'on-hold'
  description?: string
  canvasNodes: CanvasNode[]
  canvasLinks: CanvasLink[]
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  type: 'meeting' | 'deadline' | 'reminder' | 'personal'
}

export interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}
