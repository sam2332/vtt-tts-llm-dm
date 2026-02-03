import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store'
import { generateId } from '@shared/utils'
import { SPEAKER_COLORS } from '@shared/types'
import type { SpeakerProfile } from '@shared/types'

// D&D-themed reading prompts for voice enrollment
// These passages are designed to capture a variety of phonemes and speech patterns
const ENROLLMENT_PROMPTS = [
  {
    title: "The Tavern Tale",
    text: "The grizzled dwarf slammed his mug on the oak table. 'Listen here, young adventurer,' he growled. 'These mountains hold secrets that would freeze your very soul. I've seen creatures with eyes like burning coals and claws that could pierce dragon scale. But the treasure? Aye, it's worth every danger. Gold coins thick as your thumb, gems the size of goose eggs, and magical artifacts from ages past.'"
  },
  {
    title: "The Quest Begins",
    text: "You stand at the crossroads as thunder rumbles in the distance. To the north lies the Whispering Woods, where ancient elves guard forbidden knowledge. The eastern path leads to the Crimson Keep, stronghold of the vampire lord who has terrorized these lands for centuries. Behind you, the village burns. There is no going back. What do you do?"
  },
  {
    title: "The Wizard's Warning",
    text: "My dear friends, the situation is quite precarious indeed. The arcane energies surrounding this temple are fluctuating wildly—most unusual, I must say. We should proceed with extreme caution. Perhaps the rogue could check for traps? And paladin, keep your divine senses alert. There's something deeply wrong here, something that chills me to my very bones."
  },
  {
    title: "Battle Cry",
    text: "For glory and honor! The orcs charge from the treeline, their war drums echoing through the valley. Draw your weapons! Archers, loose your arrows! Shield wall, hold the line! We fight today not just for ourselves, but for everyone who cannot fight. Let them remember this day—the day we stood together against the darkness!"
  },
  {
    title: "The Mysterious Stranger",
    text: "She appeared from the shadows, her cloak shimmering with an otherworldly light. 'I have been watching you,' she whispered, her voice like silk over steel. 'You seek the Amulet of Eternal Dawn, do you not? I can help you find it. But nothing in this world comes without a price. The question is: what are you willing to sacrifice?'"
  }
]

interface SpeakerEnrollmentProps {
  onComplete: () => void
  onCancel: () => void
}

export function SpeakerEnrollment({ onComplete, onCancel }: SpeakerEnrollmentProps) {
  const speakers = useAppStore((state) => state.speakers)
  const addSpeaker = useAppStore((state) => state.addSpeaker)
  const settings = useAppStore((state) => state.settings)
  
  const [currentSpeaker, setCurrentSpeaker] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [step, setStep] = useState<'name' | 'record' | 'confirm'>('name')
  const [error, setError] = useState<string | null>(null)
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const totalSpeakers = 4
  const colorIndex = (speakers.length + currentSpeaker) % SPEAKER_COLORS.length
  const currentPrompt = ENROLLMENT_PROMPTS[selectedPromptIndex]

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Build audio constraints with selected device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
      
      // Use selected microphone if not 'default'
      if (settings.selectedMicrophone && settings.selectedMicrophone !== 'default') {
        audioConstraints.deviceId = { exact: settings.selectedMicrophone }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
        setStep('confirm')
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 60) {
            // Auto-stop after 60 seconds
            stopRecording()
            return t
          }
          return t + 1
        })
      }, 1000)

    } catch (err) {
      setError('Failed to access microphone. Please check permissions.')
      console.error('Recording error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleConfirm = async () => {
    if (!audioBlob || !displayName.trim()) return

    try {
      // Convert blob to base64 for IPC
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      // Try to enroll with Python service
      try {
        await window.electronAPI?.enrollSpeaker?.(generateId(), base64)
      } catch (enrollError) {
        console.warn('Python enrollment failed, using basic profile:', enrollError)
      }

      // Create speaker profile
      const newSpeaker: SpeakerProfile = {
        id: generateId(),
        displayName: displayName.trim(),
        colorCode: SPEAKER_COLORS[colorIndex],
        enrollmentDate: new Date(),
        accuracy: 0.8 // Starting accuracy
      }

      addSpeaker(newSpeaker)

      // Check if more speakers to enroll
      if (currentSpeaker < totalSpeakers - 1) {
        setCurrentSpeaker(prev => prev + 1)
        setDisplayName('')
        setAudioBlob(null)
        setRecordingTime(0)
        // Rotate to next prompt for variety
        setSelectedPromptIndex((selectedPromptIndex + 1) % ENROLLMENT_PROMPTS.length)
        setStep('name')
      } else {
        onComplete()
      }

    } catch (err) {
      setError('Failed to save speaker profile.')
      console.error('Save error:', err)
    }
  }

  const handleRetry = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setStep('record')
  }

  const handleSkipRemaining = () => {
    onComplete()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-surface rounded-xl w-full max-w-lg mx-4 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-light">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Speaker Enrollment</h2>
            <span className="text-sm text-text-secondary">
              Speaker {currentSpeaker + 1} of {totalSpeakers}
            </span>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalSpeakers }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < currentSpeaker ? 'bg-success' :
                  i === currentSpeaker ? 'bg-accent' :
                  'bg-surface-light'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-error/20 border border-error/50 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          {/* Step: Name */}
          {step === 'name' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl text-white"
                  style={{ backgroundColor: SPEAKER_COLORS[colorIndex] }}
                >
                  {currentSpeaker + 1}
                </div>
                <p className="text-text-secondary">
                  Enter a name for this speaker (player name, character name, or both)
                </p>
              </div>

              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Alice (Elara the Elf)"
                className="input-field w-full text-lg py-3"
                autoFocus
              />

              <div className="flex gap-3 pt-4">
                <button onClick={onCancel} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button 
                  onClick={() => setStep('record')}
                  disabled={!displayName.trim()}
                  className="btn-primary flex-1"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step: Record */}
          {step === 'record' && (
            <div className="space-y-4">
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl text-white"
                  style={{ backgroundColor: SPEAKER_COLORS[colorIndex] }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg">{displayName}</h3>
              </div>

              {/* Prompt selector */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Reading prompt:</span>
                <select 
                  value={selectedPromptIndex}
                  onChange={(e) => setSelectedPromptIndex(Number(e.target.value))}
                  className="input-field py-1 px-2 text-sm"
                  disabled={isRecording}
                >
                  {ENROLLMENT_PROMPTS.map((prompt, idx) => (
                    <option key={idx} value={idx}>{prompt.title}</option>
                  ))}
                </select>
              </div>

              {/* Reading prompt card */}
              <div className="bg-surface-light rounded-lg p-4 border border-surface-lighter">
                <p className="text-sm leading-relaxed text-text-primary">
                  "{currentPrompt.text}"
                </p>
              </div>

              <p className="text-text-secondary text-sm text-center">
                {isRecording 
                  ? "Read the passage above at your natural pace. Feel free to add emotion!"
                  : "Click record and read the passage aloud. This helps us recognize your unique voice."}
              </p>

              {/* Recording indicator */}
              <div className="py-4 text-center">
                {isRecording ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center">
                        <span className="text-xl">🎙️</span>
                      </div>
                    </div>
                    <span className="text-xl font-mono font-bold">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {recordingTime < 15 ? 'Keep reading...' : 'Looking good! Stop when finished.'}
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-surface-light mx-auto flex items-center justify-center">
                    <span className="text-2xl">🎙️</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('name')}
                  className="btn-secondary flex-1"
                  disabled={isRecording}
                >
                  ← Back
                </button>
                {isRecording ? (
                  <button 
                    onClick={stopRecording}
                    className="btn-danger flex-1"
                    disabled={recordingTime < 5}
                  >
                    ⏹ Stop Recording
                  </button>
                ) : (
                  <button 
                    onClick={startRecording}
                    className="btn-primary flex-1"
                  >
                    🔴 Start Recording
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4 text-center">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl text-white"
                style={{ backgroundColor: SPEAKER_COLORS[colorIndex] }}
              >
                ✓
              </div>

              <h3 className="font-bold text-lg">{displayName}</h3>
              
              <p className="text-text-secondary">
                Recorded {recordingTime} seconds of audio
              </p>

              {audioBlob && (
                <div className="py-4">
                  <audio 
                    controls 
                    src={URL.createObjectURL(audioBlob)}
                    className="mx-auto"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleRetry} className="btn-secondary flex-1">
                  🔄 Re-record
                </button>
                <button onClick={handleConfirm} className="btn-primary flex-1">
                  ✓ Confirm & {currentSpeaker < totalSpeakers - 1 ? 'Next' : 'Finish'}
                </button>
              </div>

              {currentSpeaker > 0 && (
                <button 
                  onClick={handleSkipRemaining}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  Skip remaining speakers
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
