import { useAppStore, useSpeakers } from '../store'
import type { TranscriptSegment } from '@shared/types'

interface ConfirmSpeakerModalProps {
  segment: TranscriptSegment
  suggestions: Array<{ speakerId: string; confidence: number }>
  onConfirm: (speakerId: string) => void
  onDismiss: () => void
}

export function ConfirmSpeakerModal({ 
  segment, 
  suggestions,
  onConfirm, 
  onDismiss 
}: ConfirmSpeakerModalProps) {
  const speakers = useSpeakers()
  const updateTranscriptSegment = useAppStore((state) => state.updateTranscriptSegment)

  const handleConfirm = (speakerId: string) => {
    updateTranscriptSegment(segment.id, { speakerId })
    onConfirm(speakerId)
  }

  // Get speaker by ID
  const getSpeaker = (id: string) => speakers.find(s => s.id === id)

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-slide-up">
      <div className="bg-surface rounded-xl shadow-xl border border-surface-light w-80 overflow-hidden">
        {/* Header */}
        <div className="p-3 bg-warning/10 border-b border-surface-light flex items-center gap-2">
          <span className="text-lg">🤔</span>
          <h3 className="font-medium text-sm">Who said this?</h3>
          <button 
            onClick={onDismiss} 
            className="ml-auto btn-icon text-xs"
            title="Dismiss"
          >
            ✕
          </button>
        </div>

        {/* Quote */}
        <div className="p-3 border-b border-surface-light">
          <p className="text-sm italic text-text-secondary line-clamp-2">
            "{segment.text}"
          </p>
        </div>

        {/* Speaker Options */}
        <div className="p-2 space-y-1">
          {suggestions.map(({ speakerId, confidence }) => {
            const speaker = getSpeaker(speakerId)
            if (!speaker) return null
            
            return (
              <button
                key={speakerId}
                onClick={() => handleConfirm(speakerId)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: speaker.colorCode }}
                >
                  {speaker.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{speaker.displayName}</div>
                  <div className="text-xs text-text-secondary">
                    {(confidence * 100).toFixed(0)}% match
                  </div>
                </div>
              </button>
            )
          })}

          {/* Unknown / New Speaker option */}
          <button
            onClick={onDismiss}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors text-text-secondary"
          >
            <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-sm">
              ?
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">Unknown Speaker</div>
              <div className="text-xs">Leave unassigned</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
