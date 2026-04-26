'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Tag, Loader2, AlertTriangle, RefreshCw, Plus, X, Trash2,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface TagItem {
  id: string
  name: string
}

export default function TagsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tagList, setTagList] = useState<TagItem[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadTags = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.tags.list()
      setTagList(data.tags || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadTags() }, [loadTags])

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) {
      toast.error('Enter a tag name')
      return
    }
    setAdding(true)
    try {
      await crm.tags.create(name)
      toast.success(`Tag "${name}" created`)
      setNewTagName('')
      loadTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tag')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      await crm.tags.delete(id)
      toast.success(`Tag "${name}" deleted`)
      loadTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag')
    }
    setDeletingId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#7ed957]" />
            Tags
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {tagList.length} tag{tagList.length !== 1 ? 's' : ''} in your CRM
          </p>
        </div>
        <button
          onClick={() => { loadTags(); toast.success('Tags refreshed') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Add Tag Input */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New tag name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 transition-colors"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Tag
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Tag Chips */}
      {!loading && (
        <>
          {tagList.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <Tag className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No tags yet</p>
              <p className="text-white/20 text-xs mt-1">Add tags above to organize your contacts</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagList.map(tag => (
                <div
                  key={tag.id}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/20 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
                  <span className="text-sm font-medium text-white">{tag.name}</span>
                  <button
                    onClick={() => handleDelete(tag.id, tag.name)}
                    disabled={deletingId === tag.id}
                    className="p-0.5 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 cursor-pointer bg-transparent border-none transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === tag.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
