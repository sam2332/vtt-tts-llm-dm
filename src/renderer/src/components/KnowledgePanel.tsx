import { useState } from 'react'
import { useAppStore, useKnowledge } from '../store'
import { KNOWLEDGE_CATEGORIES } from '@shared/types'
import { generateId } from '@shared/utils'
import type { KnowledgeEntry } from '@shared/types'

export function KnowledgePanel() {
  const knowledge = useKnowledge()
  const addKnowledge = useAppStore((state) => state.addKnowledge)
  const updateKnowledge = useAppStore((state) => state.updateKnowledge)
  const removeKnowledge = useAppStore((state) => state.removeKnowledge)
  const session = useAppStore((state) => state.session)

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [category, setCategory] = useState<KnowledgeEntry['category']>('npc')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')

  const resetForm = () => {
    setCategory('npc')
    setTitle('')
    setContent('')
    setTags('')
    setEditingEntry(null)
    setShowForm(false)
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setCategory(entry.category)
    setTitle(entry.title)
    setContent(entry.content)
    setTags(entry.tags.join(', '))
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    if (editingEntry) {
      updateKnowledge(editingEntry.id, {
        category,
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      })
    } else {
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
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this knowledge entry?')) {
      removeKnowledge(id)
    }
  }

  // Filter and search
  const filteredKnowledge = knowledge.filter(entry => {
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Group by category
  const groupedKnowledge = filteredKnowledge.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {} as Record<string, KnowledgeEntry[]>)

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'location': return '🗺️'
      case 'npc': return '👤'
      case 'plot': return '📜'
      case 'lore': return '📚'
      case 'item': return '⚔️'
      default: return '📝'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-surface-light">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm">Campaign Knowledge</h2>
          <button 
            className="btn-primary text-xs py-1"
            onClick={() => setShowForm(true)}
          >
            + Add
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1 text-xs"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field text-xs"
          >
            <option value="all">All</option>
            {KNOWLEDGE_CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredKnowledge.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm mb-3">
              {knowledge.length === 0 
                ? 'No knowledge entries yet' 
                : 'No matching entries'}
            </p>
            {knowledge.length === 0 && (
              <button 
                className="btn-secondary text-sm"
                onClick={() => setShowForm(true)}
              >
                Add your first entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedKnowledge).map(([cat, entries]) => (
              <div key={cat}>
                <h3 className="text-xs font-medium text-text-secondary uppercase mb-2 flex items-center gap-1">
                  {getCategoryIcon(cat)} {cat}
                </h3>
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div 
                      key={entry.id}
                      className="card p-3 group"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{entry.title}</h4>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button 
                            className="btn-icon text-xs"
                            onClick={() => handleEdit(entry)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-icon text-xs text-error"
                            onClick={() => handleDelete(entry.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {entry.content}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map(tag => (
                            <span 
                              key={tag}
                              className="text-xs bg-surface-light px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl w-full max-w-lg mx-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-surface-light">
              <h2 className="font-bold text-lg">
                {editingEntry ? 'Edit Knowledge' : 'Add Knowledge'}
              </h2>
              <button onClick={resetForm} className="btn-icon">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={!title.trim() || !content.trim()}
                >
                  {editingEntry ? 'Save Changes' : 'Add Knowledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
