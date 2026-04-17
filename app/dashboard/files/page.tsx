'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  FolderPlus, Upload, Trash2, RefreshCw, Search, Grid, List,
  Folder, FileText, Image, Film, Music, File, ChevronRight,
  ArrowLeft, Eye, Download, MoreHorizontal, X,
} from 'lucide-react'

interface MediaItem {
  _id?: string
  id?: string
  name: string
  type: string
  url?: string
  size?: number
  category?: string
  parentId?: string
  createdAt?: string
  updatedAt?: string
  altType?: string
  altId?: string
}

function getIcon(item: MediaItem) {
  if (item.type === 'folder') return <Folder className="h-5 w-5 text-amber" />
  const ext = item.name?.split('.').pop()?.toLowerCase() || ''
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <Image className="h-5 w-5 text-purple" />
  if (['mp4','mov','avi','webm'].includes(ext)) return <Film className="h-5 w-5 text-cyan" />
  if (['mp3','wav','ogg'].includes(ext)) return <Music className="h-5 w-5 text-orange" />
  if (['pdf','doc','docx','txt'].includes(ext)) return <FileText className="h-5 w-5 text-red" />
  return <File className="h-5 w-5 text-text-muted" />
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function FileManagerPage() {
  const supabase = createClient()
  const [files, setFiles] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [selected, setSelected] = useState<MediaItem | null>(null)

  useEffect(() => { load() }, [currentFolder])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const params = new URLSearchParams()
    if (currentFolder) params.set('parentId', currentFolder)
    if (search) params.set('q', search)
    const res = await fetch(`/api/media?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setFiles(data.files || [])
    }
    setLoading(false)
  }

  function openFolder(item: MediaItem) {
    const id = item._id || item.id || ''
    setBreadcrumbs(prev => [...prev, { id, name: item.name }])
    setCurrentFolder(id)
  }

  function navigateBack() {
    const newCrumbs = breadcrumbs.slice(0, -1)
    setBreadcrumbs(newCrumbs)
    setCurrentFolder(newCrumbs.length > 0 ? newCrumbs[newCrumbs.length - 1].id : null)
  }

  function navigateTo(index: number) {
    if (index < 0) {
      setBreadcrumbs([])
      setCurrentFolder(null)
    } else {
      const newCrumbs = breadcrumbs.slice(0, index + 1)
      setBreadcrumbs(newCrumbs)
      setCurrentFolder(newCrumbs[newCrumbs.length - 1].id)
    }
  }

  async function createFolder() {
    if (!folderName.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'create_folder', name: folderName, parentId: currentFolder }),
    })
    setFolderName('')
    setShowNewFolder(false)
    load()
  }

  async function uploadFile() {
    if (!uploadUrl.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'upload', fileUrl: uploadUrl, name: uploadName || 'uploaded-file', parentId: currentFolder }),
    })
    setUploadUrl('')
    setUploadName('')
    setShowUpload(false)
    load()
  }

  async function deleteItem(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/media?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
    setSelected(null)
    load()
  }

  const folders = files.filter(f => f.type === 'folder')
  const items = files.filter(f => f.type !== 'folder')

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted animate-pulse">Loading media...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="mt-1 text-sm text-text-muted">{files.length} items · CRM media gallery</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)} className="gap-1.5"><FolderPlus className="h-3.5 w-3.5" /> New Folder</Button>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload</Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <div className="flex border border-border/50 rounded-lg overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-1.5 ${view === 'grid' ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}><Grid className="h-3.5 w-3.5" /></button>
            <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}><List className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            className="w-full rounded-lg border border-border/50 bg-bg-card/50 pl-9 pr-3 py-2 text-sm text-white placeholder:text-text-muted"
            placeholder="Search files and folders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <button onClick={() => navigateTo(-1)} className="hover:text-white transition-colors">Media</button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigateTo(i)} className="hover:text-white transition-colors">{crumb.name}</button>
          </span>
        ))}
        {breadcrumbs.length > 0 && (
          <button onClick={navigateBack} className="ml-2 text-text-muted hover:text-white"><ArrowLeft className="h-3 w-3" /></button>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className={view === 'grid' ? 'grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6' : 'space-y-1'}>
          {folders.map(folder => (
            <div
              key={folder._id || folder.id}
              onClick={() => openFolder(folder)}
              className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-3 flex items-center gap-2.5 transition-colors hover:border-border"
            >
              <Folder className="h-5 w-5 text-amber shrink-0" />
              <span className="text-sm text-white truncate">{folder.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Files */}
      {items.length === 0 && folders.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
          <File className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No files in this folder.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map(item => (
            <div
              key={item._id || item.id}
              onClick={() => setSelected(item)}
              className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-3 transition-colors hover:border-border group"
            >
              {item.url && ['jpg','jpeg','png','gif','webp'].some(ext => item.name?.toLowerCase().endsWith(ext)) ? (
                <div className="aspect-square rounded-lg overflow-hidden bg-bg-secondary mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-bg-secondary flex items-center justify-center mb-2">
                  {getIcon(item)}
                </div>
              )}
              <p className="text-xs text-white truncate">{item.name}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{formatSize(item.size)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div
              key={item._id || item.id}
              onClick={() => setSelected(item)}
              className="cursor-pointer rounded-lg border border-border/50 bg-bg-card/50 p-3 flex items-center gap-3 transition-colors hover:border-border"
            >
              {getIcon(item)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.name}</p>
                <p className="text-[10px] text-text-muted">{formatSize(item.size)} {item.createdAt && `· ${new Date(item.createdAt).toLocaleDateString()}`}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm bg-bg-secondary border-border">
          <DialogHeader><DialogTitle className="text-white">New Folder</DialogTitle></DialogHeader>
          <input className="w-full rounded-lg border border-border/50 bg-bg-card/50 px-3 py-2.5 text-sm text-white placeholder:text-text-muted" placeholder="Folder name" value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
          <DialogFooter><Button onClick={createFolder} className="bg-accent text-cta-text hover:bg-accent-action">Create Folder</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md bg-bg-secondary border-border">
          <DialogHeader><DialogTitle className="text-white">Upload File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">File URL</label>
              <input className="w-full rounded-lg border border-border/50 bg-bg-card/50 px-3 py-2.5 text-sm text-white placeholder:text-text-muted" placeholder="https://example.com/file.pdf" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">File Name</label>
              <input className="w-full rounded-lg border border-border/50 bg-bg-card/50 px-3 py-2.5 text-sm text-white placeholder:text-text-muted" placeholder="my-file.pdf" value={uploadName} onChange={e => setUploadName(e.target.value)} />
            </div>
          </div>
          <DialogFooter><Button onClick={uploadFile} className="bg-accent text-cta-text hover:bg-accent-action">Upload</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-md bg-bg-secondary border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {getIcon(selected)}
                <DialogTitle className="text-white truncate">{selected.name}</DialogTitle>
              </div>
            </DialogHeader>
            {selected.url && ['jpg','jpeg','png','gif','webp'].some(ext => selected.name?.toLowerCase().endsWith(ext)) && (
              <div className="rounded-lg overflow-hidden bg-bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.url} alt={selected.name} className="w-full max-h-64 object-contain" />
              </div>
            )}
            <div className="space-y-1.5 text-xs text-text-secondary">
              {selected.size && <div className="flex justify-between"><span>Size</span><span>{formatSize(selected.size)}</span></div>}
              {selected.createdAt && <div className="flex justify-between"><span>Created</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div>}
              {selected.url && <div className="flex justify-between"><span>URL</span><span className="truncate ml-4 font-mono text-[10px]">{selected.url.slice(0, 40)}...</span></div>}
            </div>
            <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
              <Button variant="outline" size="sm" className="text-red hover:text-red gap-1" onClick={() => deleteItem(selected._id || selected.id || '')}>
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <div className="flex gap-1.5">
                {selected.url && (
                  <Button variant="outline" size="sm" onClick={() => window.open(selected.url, '_blank')} className="gap-1">
                    <Eye className="h-3 w-3" /> View
                  </Button>
                )}
                {selected.url && (
                  <Button size="sm" className="bg-accent text-cta-text hover:bg-accent-action gap-1" onClick={() => { navigator.clipboard.writeText(selected.url || '') }}>
                    Copy URL
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
