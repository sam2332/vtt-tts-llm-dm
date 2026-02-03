import { useState } from 'react'
import { useAppStore } from '../store'
import { KNOWLEDGE_CATEGORIES } from '@shared/types'
import { generateId } from '@shared/utils'
import type { KnowledgeEntry } from '@shared/types'

interface KnowledgeModalProps {
  onClose: () => void
}

export function KnowledgeModal({ onClose }: KnowledgeModalProps) {
  const addKnowledge = useAppStore((state) => state.addKnowledge)
  const session = useAppStore((state) => state.session)

  const [category, setCategory] = useState<KnowledgeEntry['category']>('npc')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) return

    const entry: KnowledgeEntry = {
      id: generateId(),
      sessionId: session?.id || '',
      category,
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date(),
      source: 'user_input'
    }

    addKnowledge(entry)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="font-bold text-lg">Add Campaign Knowledge</h2>
          <button onClick={onClose} className="btn-icon">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeEntry['category'])}
              className="input-field w-full"
            >
              {KNOWLEDGE_CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Thorgrim the Blacksmith"
              className="input-field w-full"
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe this knowledge entry..."
              rows={4}
              className="textarea-field w-full"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., ally, shop, dwarf"
              className="input-field w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={!title.trim() || !content.trim()}
            >
              Add Knowledge
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
