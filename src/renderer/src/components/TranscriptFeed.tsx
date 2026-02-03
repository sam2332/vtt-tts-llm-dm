import { useRef, useEffect } from 'react'
import { useTranscript, useSpeakers } from '../store'
import { formatTimestamp, getInitials } from '@shared/utils'

export function TranscriptFeed() {
  const transcript = useTranscript()
  const speakers = useSpeakers()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript.length])

  const getSpeaker = (speakerId: string | null) => {
    if (!speakerId) return null
    return speakers.find(s => s.id === speakerId)
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {transcript.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <span className="text-6xl mb-4">🎙️</span>
          <h2 className="text-xl font-bold mb-2">Ready to Listen</h2>
          <p className="text-text-secondary max-w-md">
            Click "Start" to begin capturing audio. The AI DM will listen to your conversation 
            and respond when appropriate.
          </p>
        </div>
      ) : (
        transcript.map((segment) => {
          const speaker = getSpeaker(segment.speakerId)
          const isDM = !segment.speakerId

          return (
            <div
              key={segment.id}
              className={`flex gap-3 p-3 rounded-lg animate-fade-in ${
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
                </div>
                <p className="text-sm leading-relaxed">{segment.text}</p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
