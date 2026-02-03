import { useRef, useEffect, useState } from 'react'
import { useTranscript, useSpeakers, useAppStore } from '../store'
import { formatTimestamp, getInitials } from '@shared/utils'
import type { TranscriptSegment } from '@shared/types'

export function TranscriptFeed() {
  const transcript = useTranscript()
  const speakers = useSpeakers()
  const updateTranscript = useAppStore((state) => state.updateTranscript)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !editingId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript.length, editingId])

  const getSpeaker = (speakerId: string | null) => {
    if (!speakerId) return null
    return speakers.find(s => s.id === speakerId)
  }

  const handleStartEdit = (segment: TranscriptSegment) => {
    setEditingId(segment.id)
    setEditText(segment.text)
  }

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      updateTranscript(editingId, { text: editText.trim(), edited: true })
    }
    setEditingId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  // Filter transcript by search
  const filteredTranscript = searchQuery
    ? transcript.filter(s => 
        s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getSpeaker(s.speakerId)?.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {transcript.length > 0 && (
        <div className="p-2 border-b border-surface-light">
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
      )}
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {filteredTranscript.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-6xl mb-4">🎙️</span>
            <h2 className="text-xl font-bold mb-2">Ready to Listen</h2>
            <p className="text-text-secondary max-w-md">
              Click "Start" to begin capturing audio. The AI DM will listen to your conversation 
              and respond when appropriate.
            </p>
          </div>
        ) : filteredTranscript.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No messages match "{searchQuery}"
          </div>
        ) : (
          filteredTranscript.map((segment) => {
            const speaker = getSpeaker(segment.speakerId)
            const isDM = segment.speakerId === 'dm' || !segment.speakerId
            const isEditing = editingId === segment.id

            return (
              <div
                key={segment.id}
                className={`flex gap-3 p-3 rounded-lg animate-fade-in group ${
                  isDM ? 'message-dm' : 'message-player'
                }`}
              >
                {/* Avatar */}
                <div 
                  className="speaker-avatar flex-shrink-0"
                  style={{ 
                    backgroundColor: isDM ? '#f9e2af' : (speaker?.colorCode || '#666')
                  }}
                >
                  {isDM ? '🎲' : (speaker ? getInitials(speaker.displayName) : '?')}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium text-sm ${isDM ? 'text-dm-gold' : ''}`}>
                      {isDM ? 'Dungeon Master' : (speaker?.displayName || 'Unknown Speaker')}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatTimestamp(new Date(segment.timestamp))}
                    </span>
                    {segment.confidence < 0.6 && !isDM && (
                      <span className="text-xs text-warning" title="Low confidence">
                        ⚠️
                      </span>
                    )}
                    {segment.edited && (
                      <span className="text-xs text-text-secondary">(edited)</span>
                    )}
                    
                    {/* Edit button - visible on hover */}
                    {!isEditing && !isDM && (
                      <button 
                        className="text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        onClick={() => handleStartEdit(segment)}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="textarea-field w-full text-sm"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs py-1" onClick={handleSaveEdit}>
                          Save
                        </button>
                        <button className="btn-secondary text-xs py-1" onClick={handleCancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
