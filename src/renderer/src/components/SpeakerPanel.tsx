import { useState } from 'react'
import { useSpeakers, useAppStore } from '../store'
import { getInitials, generateId } from '@shared/utils'
import { SPEAKER_COLORS } from '@shared/types'
import type { SpeakerProfile } from '@shared/types'
import { SpeakerEnrollment } from './SpeakerEnrollment'

export function SpeakerPanel() {
  const speakers = useSpeakers()
  const addSpeaker = useAppStore((state) => state.addSpeaker)
  const removeSpeaker = useAppStore((state) => state.removeSpeaker)
  const updateSpeaker = useAppStore((state) => state.updateSpeaker)
  
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<SpeakerProfile | null>(null)
  const [newName, setNewName] = useState('')

  const handleQuickAddSpeaker = () => {
    if (!newName.trim()) return
    
    const colorIndex = speakers.length % SPEAKER_COLORS.length
    const newSpeaker: SpeakerProfile = {
      id: generateId(),
      displayName: newName.trim(),
      colorCode: SPEAKER_COLORS[colorIndex],
      enrollmentDate: new Date(),
      accuracy: 0.5 // Lower accuracy since no voice enrollment
    }
    
    addSpeaker(newSpeaker)
    setNewName('')
    setShowQuickAdd(false)
  }

  const handleEditSpeaker = (speaker: SpeakerProfile) => {
    setEditingSpeaker(speaker)
    setNewName(speaker.displayName)
  }

  const handleSaveEdit = () => {
    if (!editingSpeaker || !newName.trim()) return
    updateSpeaker(editingSpeaker.id, { displayName: newName.trim() })
    setEditingSpeaker(null)
    setNewName('')
  }

  const handleDeleteSpeaker = (id: string) => {
    if (confirm('Remove this speaker?')) {
      removeSpeaker(id)
    }
  }

  // Show enrollment wizard
  if (showEnrollment) {
    return (
      <SpeakerEnrollment 
        onComplete={() => setShowEnrollment(false)}
        onCancel={() => setShowEnrollment(false)}
      />
    )
  }

  return (
    <div className="p-3 space-y-2">
      {speakers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm mb-3">No speakers enrolled</p>
          <button 
            className="btn-primary text-sm"
            onClick={() => setShowEnrollment(true)}
          >
            + Add Speakers
          </button>
        </div>
      ) : (
        speakers.map((speaker) => (
          <div 
            key={speaker.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors group"
          >
            {/* Avatar */}
            <div 
              className="speaker-avatar"
              style={{ backgroundColor: speaker.colorCode }}
            >
              {getInitials(speaker.displayName)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{speaker.displayName}</p>
              <p className="text-xs text-text-secondary">
                {Math.round(speaker.accuracy * 100)}% accuracy
              </p>
            </div>

            {/* Actions (visible on hover) */}
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button 
                className="btn-icon text-xs"
                onClick={() => handleEditSpeaker(speaker)}
                title="Edit"
              >
                ✏️
              </button>
              <button 
                className="btn-icon text-xs text-error"
                onClick={() => handleDeleteSpeaker(speaker.id)}
                title="Remove"
              >
                🗑️
              </button>
            </div>

            {/* Status */}
            <div className="w-2 h-2 rounded-full bg-success" title="Enrolled" />
          </div>
        ))
      )}

      {speakers.length > 0 && speakers.length < 8 && (
        <div className="flex gap-2">
          <button 
            className="flex-1 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors"
            onClick={() => setShowEnrollment(true)}
            title="Full enrollment with voice recording"
          >
            + Enroll Speaker
          </button>
          <button 
            className="py-2 px-3 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors"
            onClick={() => setShowQuickAdd(true)}
            title="Quick add without voice (lower accuracy)"
          >
            ⚡
          </button>
        </div>
      )}

      {/* Quick Add Speaker Modal (no voice enrollment) */}
      {showQuickAdd && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => e.target === e.currentTarget && setShowQuickAdd(false)}
        >
          <div 
            className="bg-surface rounded-xl p-4 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold mb-2">Quick Add Speaker</h3>
            <p className="text-xs text-text-secondary mb-4">
              Add without voice enrollment (lower recognition accuracy)
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Player name..."
              className="input-field w-full mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAddSpeaker()}
            />
            <div className="flex justify-end gap-2">
              <button 
                className="btn-secondary"
                onClick={() => { setShowQuickAdd(false); setNewName(''); }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleQuickAddSpeaker}
                disabled={!newName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Speaker Modal */}
      {editingSpeaker && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => e.target === e.currentTarget && (setEditingSpeaker(null), setNewName(''))}
        >
          <div 
            className="bg-surface rounded-xl p-4 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold mb-4">Edit Speaker</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Player name..."
              className="input-field w-full mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="flex justify-end gap-2">
              <button 
                className="btn-secondary"
                onClick={() => { setEditingSpeaker(null); setNewName(''); }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={!newName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
