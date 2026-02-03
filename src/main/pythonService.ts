/**
 * Python Service Bridge
 * Manages communication between Electron and the Python ML service
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'

interface PythonServiceConfig {
  port: number
  host: string
  pythonPath?: string
  preload?: boolean
}

const DEFAULT_CONFIG: PythonServiceConfig = {
  port: 5000,
  host: '127.0.0.1',
  preload: true
}

class PythonService {
  private process: ChildProcess | null = null
  private config: PythonServiceConfig
  private baseUrl: string
  private isReady: boolean = false
  private startupPromise: Promise<void> | null = null

  constructor(config: Partial<PythonServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.baseUrl = `http://${this.config.host}:${this.config.port}`
  }

  /**
   * Start the Python service
   */
  async start(): Promise<void> {
    if (this.startupPromise) {
      return this.startupPromise
    }

    this.startupPromise = this._start()
    return this.startupPromise
  }

  private async _start(): Promise<void> {
    const pythonPath = this.config.pythonPath || 'python'
    const scriptPath = join(app.getAppPath(), 'python', 'service.py')
    
    const args = [
      scriptPath,
      '--port', this.config.port.toString(),
      '--host', this.config.host
    ]

    if (this.config.preload) {
      args.push('--preload')
    }

    console.log(`Starting Python service: ${pythonPath} ${args.join(' ')}`)

    // Build enhanced PATH including common ffmpeg locations
    const ffmpegPaths = [
      'C:\\ffmpeg\\bin',
      'C:\\Program Files\\ffmpeg\\bin',
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Links` : '',
    ].filter(Boolean).join(';')
    
    const enhancedPath = ffmpegPaths + ';' + (process.env.PATH || '')

    this.process = spawn(pythonPath, args, {
      cwd: join(app.getAppPath(), 'python'),
      env: {
        ...process.env,
        PATH: enhancedPath,
        AI_DM_DATA_DIR: join(app.getPath('userData'), 'python_data')
      }
    })

    this.process.stdout?.on('data', (data) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`)
    })

    this.process.on('close', (code) => {
      console.log(`Python service exited with code ${code}`)
      this.isReady = false
      this.process = null
    })

    // Wait for service to be ready
    await this.waitForReady()
  }

  /**
   * Wait for the Python service to respond to health checks
   */
  private async waitForReady(maxRetries = 30, interval = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/health`)
        if (response.ok) {
          this.isReady = true
          console.log('Python service is ready')
          return
        }
      } catch {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    throw new Error('Python service failed to start')
  }

  /**
   * Stop the Python service
   */
  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.isReady = false
    }
  }

  /**
   * Check if service is running
   */
  get running(): boolean {
    return this.isReady && this.process !== null
  }

  /**
   * Make a request to the Python service
   */
  private async request<T>(endpoint: string, data?: unknown): Promise<T> {
    if (!this.isReady) {
      throw new Error('Python service is not ready')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // ============== API Methods ==============

  /**
   * Transcribe audio to text
   */
  async transcribe(audioData: Buffer, initialPrompt?: string): Promise<{
    text: string
    segments: Array<{ start: number; end: number; text: string }>
    language: string
  }> {
    return this.request('/transcribe', {
      audio_data: audioData.toString('base64'),
      initial_prompt: initialPrompt
    })
  }

  /**
   * Enroll a speaker's voice
   */
  async enrollSpeaker(speakerId: string, audioData: Buffer): Promise<{
    success: boolean
    speaker_id: string
    embedding_size: number
  }> {
    return this.request('/enroll', {
      speaker_id: speakerId,
      audio_data: audioData.toString('base64')
    })
  }

  /**
   * Identify speaker from audio
   */
  async diarize(audioData: Buffer): Promise<{
    speaker_id: string
    confidence: number
    alternatives: Array<{ speaker_id: string; confidence: number }>
  }> {
    return this.request('/diarize', {
      audio_data: audioData.toString('base64')
    })
  }

  /**
   * Detect if text requires DM response
   */
  async detectIntent(text: string, threshold?: number): Promise<{
    should_respond: boolean
    confidence: number
    intent_type: string
  }> {
    return this.request('/detect_intent', {
      text,
      threshold
    })
  }

  /**
   * Add knowledge to RAG database
   */
  async addKnowledge(entry: {
    id: string
    category: string
    title: string
    content: string
    tags: string[]
  }): Promise<{ success: boolean; id: string }> {
    return this.request('/add_knowledge', entry)
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(query: string, nResults?: number): Promise<{
    results: Array<{
      id: string
      content: string
      title: string
      category: string
      tags: string[]
      similarity: number
    }>
  }> {
    return this.request('/search_knowledge', {
      query,
      n_results: nResults
    })
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(text: string, voice?: string, speed?: number): Promise<{
    audio_data: string
    format: string
  }> {
    return this.request('/synthesize', {
      text,
      voice,
      speed
    })
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    status: string
    services: {
      whisper: boolean
      embeddings: boolean
      chromadb: boolean
      tts: boolean
    }
  }> {
    const response = await fetch(`${this.baseUrl}/health`)
    return response.json()
  }

  /**
   * Get detailed service status including enrolled speakers count
   */
  async getStatus(): Promise<{
    whisper_model: string
    embedding_model: string
    speakers_enrolled: number
    knowledge_entries: number
  }> {
    const response = await fetch(`${this.baseUrl}/status`)
    if (!response.ok) {
      throw new Error('Failed to get service status')
    }
    return response.json()
  }
}

// Singleton instance
let pythonService: PythonService | null = null

export function getPythonService(): PythonService {
  if (!pythonService) {
    pythonService = new PythonService()
  }
  return pythonService
}

export { PythonService }
