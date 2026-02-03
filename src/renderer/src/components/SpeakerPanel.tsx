import { useSpeakers } from '../store'
import { getInitials } from '@shared/utils'

export function SpeakerPanel() {
  const speakers = useSpeakers()

  return (
    <div className="p-3 space-y-2">
      {speakers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm mb-3">No speakers enrolled</p>
          <button className="btn-primary text-sm">
            + Add Speakers
          </button>
        </div>
      ) : (
        speakers.map((speaker) => (
          <div 
            key={speaker.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors cursor-pointer"
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

            {/* Status */}
            <div className="w-2 h-2 rounded-full bg-success" title="Enrolled" />
          </div>
        ))
      )}

      {speakers.length > 0 && speakers.length < 6 && (
        <button className="w-full py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors">
          + Add Speaker
        </button>
      )}
    </div>
  )
}
