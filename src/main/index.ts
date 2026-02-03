import { app, BrowserWindow, ipcMain, systemPreferences, session } from 'electron'
import { join } from 'path'
import { initDatabase } from './database'
import { setupAudioIPC, getAudioCapture, float32ToWav } from './audioCapture'
import { setupLLMIPC, getOllamaService } from './ollamaService'
import { getPythonService } from './pythonService'

let mainWindow: BrowserWindow | null = null
const pythonService = getPythonService()

// Service initialization tracking
let isInitializing = false

// State tracking for DM response context
let currentSceneMode: 'combat' | 'exploration' | 'rp' = 'exploration'
let currentSceneDescription: string = 'The adventure continues...'
let recentTranscriptBuffer: Array<{ speaker: string; text: string }> = []
let activeNPCs: string[] = []
let characterStatsCache: string = ''

const MAX_TRANSCRIPT_HISTORY = 10 // Keep last 10 utterances for context

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#1e1e2e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e2e',
      symbolColor: '#cdd6f4',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  // Set up permission handler to grant microphone access
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture']
    if (allowedPermissions.includes(permission)) {
      callback(true)
    } else {
      callback(false)
    }
  })

  // Also handle permission check requests
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture']
    return allowedPermissions.includes(permission)
  })

  // In development, load from dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Set up audio processing pipeline
function setupAudioProcessing() {
  const audioCapture = getAudioCapture()
  
  audioCapture.on('chunk', async (chunk) => {
    if (!mainWindow) return
    
    try {
      // Convert to WAV for Python service
      const wavBuffer = float32ToWav(chunk.data)
      
      // Check if Python service is running
      if (!pythonService.running) {
        console.log('Python service not running, skipping processing')
        return
      }
      
      // Transcribe
      const transcription = await pythonService.transcribe(wavBuffer)
      if (!transcription.text.trim()) return

      // Diarize (identify speaker) - handle case where no speakers are enrolled
      let diarization: { speaker_id: string; confidence: number } = {
        speaker_id: 'unknown',
        confidence: 0
      }
      
      try {
        diarization = await pythonService.diarize(wavBuffer)
      } catch (diarizationError) {
        // If diarization fails (e.g., no speakers enrolled), use unknown speaker
        console.log('Diarization unavailable, using unknown speaker:', (diarizationError as Error).message)
      }

      // Add to recent transcript buffer for LLM context
      recentTranscriptBuffer.push({
        speaker: diarization.speaker_id,
        text: transcription.text
      })
      // Keep only the last N entries
      if (recentTranscriptBuffer.length > MAX_TRANSCRIPT_HISTORY) {
        recentTranscriptBuffer = recentTranscriptBuffer.slice(-MAX_TRANSCRIPT_HISTORY)
      }
      
      // Check for low confidence and emit alert
      if (diarization.confidence < 0.6 && diarization.speaker_id !== 'unknown') {
        mainWindow.webContents.send('low-confidence', {
          speakerId: diarization.speaker_id,
          confidence: diarization.confidence,
          text: transcription.text
        })
      }

      // Send to renderer
      mainWindow.webContents.send('transcript-update', {
        text: transcription.text,
        speakerId: diarization.speaker_id,
        confidence: diarization.confidence,
        timestamp: chunk.timestamp
      })
      
      // Detect intent
      const intent = await pythonService.detectIntent(transcription.text)
      
      if (intent.should_respond) {
        // Search knowledge base for context
        const knowledge = await pythonService.searchKnowledge(transcription.text, 3)
        
        // Generate LLM response with actual state
        const ollama = getOllamaService()
        const response = await ollama.generateResponse({
          sceneMode: currentSceneMode,
          sceneDescription: currentSceneDescription,
          recentTranscript: [...recentTranscriptBuffer], // Pass full context
          relevantKnowledge: knowledge.results.map(r => r.content),
          characterStats: characterStatsCache,
          activeNPCs: activeNPCs
        })
        
        if (response.action === 'respond' && response.text) {
          // Synthesize speech
          try {
            const audio = await pythonService.synthesize(response.text, response.npcVoice)
            mainWindow.webContents.send('dm-response', {
              text: response.text,
              audioData: audio.audio_data,
              npcVoice: response.npcVoice
            })
          } catch (ttsError) {
            // TTS failed, still send text response
            console.error('TTS error:', ttsError)
            mainWindow.webContents.send('dm-response', {
              text: response.text,
              npcVoice: response.npcVoice
            })
          }
        }
      }
    } catch (error) {
      console.error('Audio processing error:', error)
    }
  })
}

// Initialize app
app.whenReady().then(async () => {
  // Initialize database
  await initDatabase()
  
  // Set up IPC handlers
  setupAudioIPC()
  setupLLMIPC()
  setupPythonIPC()
  setupServiceInitIPC()
  
  // Set up audio processing pipeline
  setupAudioProcessing()

  createWindow()
  
  // Services will be initialized when renderer requests via IPC

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    pythonService.stop()
    app.quit()
  }
})

// Python service IPC handlers
function setupPythonIPC() {
  ipcMain.handle('python-start', async () => {
    await pythonService.start()
    return { success: true }
  })
  
  ipcMain.handle('python-stop', () => {
    pythonService.stop()
    return { success: true }
  })
  
  ipcMain.handle('python-health', async () => {
    if (!pythonService.running) return { status: 'stopped' }
    return pythonService.getHealth()
  })
  
  ipcMain.handle('python-transcribe', async (_event, audioData: string) => {
    const buffer = Buffer.from(audioData, 'base64')
    return pythonService.transcribe(buffer)
  })
  
  ipcMain.handle('python-enroll-speaker', async (_event, speakerId: string, audioData: string) => {
    const buffer = Buffer.from(audioData, 'base64')
    return pythonService.enrollSpeaker(speakerId, buffer)
  })
  
  ipcMain.handle('python-add-knowledge', async (_event, entry) => {
    return pythonService.addKnowledge(entry)
  })
  
  ipcMain.handle('python-search-knowledge', async (_event, query: string, nResults?: number) => {
    return pythonService.searchKnowledge(query, nResults)
  })
  
  ipcMain.handle('python-synthesize', async (_event, text: string, voice?: string) => {
    return pythonService.synthesize(text, voice)
  })
}

// Service initialization IPC handler
function setupServiceInitIPC() {
  ipcMain.handle('initialize-services', async () => {
    console.log('initialize-services IPC handler called')
    
    // Helper to send status updates
    const sendStatus = (status: Record<string, unknown>) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Sending service status:', JSON.stringify(status))
        mainWindow.webContents.send('service-status', status)
      } else {
        console.warn('Cannot send status - mainWindow not available')
      }
    }
    
    // Check if Python service is already running
    if (pythonService.running) {
      console.log('Python service already running, sending current status')
      try {
        const health = await pythonService.getHealth()
        sendStatus({ 
          python: { 
            status: 'ready', 
            message: 'Python service ready',
            services: health.services
          } 
        })
      } catch {
        sendStatus({ python: { status: 'error', message: 'Python service error' } })
      }
    } else if (isInitializing) {
      // Already initializing, just send starting status
      console.log('Python service is initializing...')
      sendStatus({ python: { status: 'starting', message: 'Starting Python ML service...' } })
    } else {
      // Start Python service
      isInitializing = true
      sendStatus({ python: { status: 'starting', message: 'Starting Python ML service...' } })
      
      try {
        await pythonService.start()
        const health = await pythonService.getHealth()
        sendStatus({ 
          python: { 
            status: 'ready', 
            message: 'Python service ready',
            services: health.services
          } 
        })
        console.log('Python service started')
      } catch (error) {
        const errorMessage = (error as Error).message
        sendStatus({ 
          python: { 
            status: 'error', 
            message: `Python service failed: ${errorMessage}` 
          } 
        })
        console.warn('Python service not available:', error)
      } finally {
        isInitializing = false
      }
    }
    
    // Check LLM service
    sendStatus({ llm: { status: 'checking', message: 'Checking Ollama connection...' } })
    
    try {
      const ollama = getOllamaService()
      const healthy = await ollama.checkHealth()
      
      if (healthy) {
        const models = await ollama.listModels()
        sendStatus({ 
          llm: { 
            status: 'ready', 
            message: 'Ollama connected',
            model: models[0] || 'No models found'
          } 
        })
      } else {
        sendStatus({ 
          llm: { 
            status: 'error', 
            message: 'Ollama not responding. Is it running?' 
          } 
        })
      }
    } catch (error) {
      sendStatus({ 
        llm: { 
          status: 'error', 
          message: 'Could not connect to Ollama' 
        } 
      })
    }
  })
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// Microphone permission handlers
ipcMain.handle('get-media-access-status', () => {
  // On macOS, use systemPreferences. On Windows/Linux, permissions are handled differently
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('microphone')
  }
  // On Windows, if we can query devices, we likely have permission
  // The actual permission check happens when getUserMedia is called
  return 'granted'
})

ipcMain.handle('ask-for-media-access', async () => {
  if (process.platform === 'darwin') {
    return systemPreferences.askForMediaAccess('microphone')
  }
  // On Windows, permission is requested when getUserMedia is called
  // Return true to indicate the app can attempt to access the microphone
  return true
})

// DM state management handlers
ipcMain.handle('dm-set-scene-mode', (_event, mode: 'combat' | 'exploration' | 'rp') => {
  currentSceneMode = mode
  return { success: true, sceneMode: mode }
})

ipcMain.handle('dm-set-scene-description', (_event, description: string) => {
  currentSceneDescription = description
  return { success: true }
})

ipcMain.handle('dm-set-active-npcs', (_event, npcs: string[]) => {
  activeNPCs = npcs
  return { success: true }
})

ipcMain.handle('dm-set-character-stats', (_event, stats: string) => {
  characterStatsCache = stats
  return { success: true }
})

ipcMain.handle('dm-clear-transcript-history', () => {
  recentTranscriptBuffer = []
  return { success: true }
})

// Force DM response - bypasses intent detection
ipcMain.handle('dm-force-response', async (_event, promptText?: string) => {
  if (!mainWindow) return { success: false, error: 'No window' }
  
  if (!pythonService.running) {
    return { success: false, error: 'Python service not running' }
  }
  
  try {
    // Search knowledge base for context
    const query = promptText || recentTranscriptBuffer[recentTranscriptBuffer.length - 1]?.text || 'Continue the adventure'
    const knowledge = await pythonService.searchKnowledge(query, 3)
    
    // Generate LLM response
    const ollama = getOllamaService()
    const response = await ollama.generateResponse({
      sceneMode: currentSceneMode,
      sceneDescription: currentSceneDescription,
      recentTranscript: promptText 
        ? [...recentTranscriptBuffer, { speaker: 'DM Prompt', text: promptText }]
        : [...recentTranscriptBuffer],
      relevantKnowledge: knowledge.results.map(r => r.content),
      characterStats: characterStatsCache,
      activeNPCs: activeNPCs
    })
    
    if (response.action === 'respond' && response.text) {
      // Synthesize speech
      try {
        const audio = await pythonService.synthesize(response.text, response.npcVoice)
        mainWindow.webContents.send('dm-response', {
          text: response.text,
          audioData: audio.audio_data,
          npcVoice: response.npcVoice
        })
      } catch (ttsError) {
        console.error('TTS error:', ttsError)
        mainWindow.webContents.send('dm-response', {
          text: response.text,
          npcVoice: response.npcVoice
        })
      }
      
      return { success: true, text: response.text }
    }
    
    return { success: false, error: 'LLM chose not to respond' }
  } catch (error) {
    console.error('Force DM response error:', error)
    return { success: false, error: (error as Error).message }
  }
})
