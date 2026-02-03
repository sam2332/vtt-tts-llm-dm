/**
 * Audio Capture Module
 * Handles microphone capture, VAD, and audio chunking
 */

import { EventEmitter } from 'events'
import { ipcMain } from 'electron'

// Audio configuration
const SAMPLE_RATE = 16000
const CHANNELS = 1
const CHUNK_DURATION = 2000 // 2 seconds in ms
const CHUNK_SIZE = (SAMPLE_RATE * CHUNK_DURATION) / 1000

// Voice Activity Detection (VAD) configuration
const VAD_ENERGY_THRESHOLD = 0.01  // RMS energy threshold (increase to reduce sensitivity)
const VAD_ZERO_CROSSING_THRESHOLD = 0.1  // Speech typically has moderate zero crossings
const VAD_MIN_SPEECH_SAMPLES = 800  // Minimum samples above threshold (~50ms at 16kHz)

interface AudioChunk {
  data: Float32Array
  timestamp: Date
  duration: number
}

class AudioCapture extends EventEmitter {
  private isCapturing: boolean = false
  private audioBuffer: Float32Array[] = []
  private chunkInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  /**
   * Start audio capture
   * Audio is captured in the renderer process and sent via IPC
   */
  start(): void {
    if (this.isCapturing) return

    this.isCapturing = true
    this.audioBuffer = []
    
    // Start chunk processing interval
    this.chunkInterval = setInterval(() => {
      this.processBuffer()
    }, CHUNK_DURATION)

    this.emit('started')
    console.log('Audio capture started')
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    if (!this.isCapturing) return

    this.isCapturing = false
    
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval)
      this.chunkInterval = null
    }

    // Process any remaining audio
    this.processBuffer()
    this.audioBuffer = []

    this.emit('stopped')
    console.log('Audio capture stopped')
  }

  /**
   * Add audio data from renderer
   */
  addAudioData(data: Float32Array): void {
    if (!this.isCapturing) return
    this.audioBuffer.push(data)
  }

  /**
   * Check if audio contains speech using energy-based VAD
   */
  private detectVoiceActivity(samples: Float32Array): boolean {
    if (samples.length === 0) return false

    // Calculate RMS energy
    let sumSquares = 0
    let zeroCrossings = 0
    let samplesAboveThreshold = 0
    const minEnergy = VAD_ENERGY_THRESHOLD * 0.5  // Per-sample threshold

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]
      sumSquares += sample * sample
      
      // Count samples with significant energy
      if (Math.abs(sample) > minEnergy) {
        samplesAboveThreshold++
      }
      
      // Count zero crossings (speech has moderate zero crossings)
      if (i > 0 && ((samples[i - 1] >= 0 && sample < 0) || (samples[i - 1] < 0 && sample >= 0))) {
        zeroCrossings++
      }
    }

    const rmsEnergy = Math.sqrt(sumSquares / samples.length)
    const zeroCrossingRate = zeroCrossings / samples.length

    // Voice activity detected if:
    // 1. RMS energy is above threshold
    // 2. Enough samples have significant energy
    // 3. Zero crossing rate is in speech range (not too high = noise, not too low = silence)
    const hasEnergy = rmsEnergy > VAD_ENERGY_THRESHOLD
    const hasSufficientSamples = samplesAboveThreshold > VAD_MIN_SPEECH_SAMPLES
    const hasReasonableZeroCrossings = zeroCrossingRate > 0.02 && zeroCrossingRate < 0.5

    const hasVoice = hasEnergy && hasSufficientSamples && hasReasonableZeroCrossings

    if (!hasVoice && rmsEnergy > 0.001) {
      // Log near-threshold audio for debugging
      console.log(`VAD: Rejected chunk - RMS: ${rmsEnergy.toFixed(4)}, Samples: ${samplesAboveThreshold}, ZCR: ${zeroCrossingRate.toFixed(3)}`)
    }

    return hasVoice
  }

  /**
   * Process buffered audio into chunks
   */
  private processBuffer(): void {
    if (this.audioBuffer.length === 0) return

    // Concatenate all buffered audio
    const totalLength = this.audioBuffer.reduce((sum, arr) => sum + arr.length, 0)
    const combined = new Float32Array(totalLength)
    
    let offset = 0
    for (const arr of this.audioBuffer) {
      combined.set(arr, offset)
      offset += arr.length
    }

    // Clear buffer
    this.audioBuffer = []

    // Check for voice activity before processing
    if (!this.detectVoiceActivity(combined)) {
      return  // Skip silent chunks
    }

    // Create chunk
    const chunk: AudioChunk = {
      data: combined,
      timestamp: new Date(),
      duration: (combined.length / SAMPLE_RATE) * 1000
    }

    // Emit chunk for processing
    this.emit('chunk', chunk)
  }

  get capturing(): boolean {
    return this.isCapturing
  }
}

// Singleton instance
let audioCapture: AudioCapture | null = null

export function getAudioCapture(): AudioCapture {
  if (!audioCapture) {
    audioCapture = new AudioCapture()
  }
  return audioCapture
}

/**
 * Set up IPC handlers for audio capture
 */
export function setupAudioIPC(): void {
  const capture = getAudioCapture()

  ipcMain.handle('audio-start-capture', () => {
    capture.start()
    return { success: true }
  })

  ipcMain.handle('audio-stop-capture', () => {
    capture.stop()
    return { success: true }
  })

  ipcMain.handle('audio-is-capturing', () => {
    return capture.capturing
  })

  // Receive audio data from renderer
  ipcMain.on('audio-data', (_event, data: Float32Array) => {
    capture.addAudioData(data)
  })
}

/**
 * Convert Float32Array to WAV buffer for API calls
 */
export function float32ToWav(samples: Float32Array, sampleRate: number = SAMPLE_RATE): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  
  // WAV header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20)  // AudioFormat (PCM)
  buffer.writeUInt16LE(CHANNELS, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * CHANNELS * 2, 28) // ByteRate
  buffer.writeUInt16LE(CHANNELS * 2, 32) // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  
  // Convert float32 to int16
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF
    buffer.writeInt16LE(Math.round(val), offset)
    offset += 2
  }
  
  return buffer
}

export { AudioCapture, SAMPLE_RATE, CHUNK_SIZE, VAD_ENERGY_THRESHOLD }
export type { AudioChunk }
