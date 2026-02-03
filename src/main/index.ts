import { app, BrowserWindow, ipcMain, systemPreferences, session } from 'electron'
import { join } from 'path'
import { initDatabase } from './database'
import { setupAudioIPC, getAudioCapture, float32ToWav } from './audioCapture'
import { setupLLMIPC, getOllamaService } from './ollamaService'
import { getPythonService } from './pythonService'

let mainWindow: BrowserWindow | null = null
const pythonService = getPythonService()

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
        
        // Generate LLM response
        const ollama = getOllamaService()
        const response = await ollama.generateResponse({
          sceneMode: 'exploration', // TODO: Get from state
          sceneDescription: 'The adventure continues...',
          recentTranscript: [{ speaker: diarization.speaker_id, text: transcription.text }],
          relevantKnowledge: knowledge.results.map(r => r.content),
          characterStats: '',
          activeNPCs: []
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
  
  // Set up audio processing pipeline
  setupAudioProcessing()

  createWindow()
  
  // Try to start Python service (optional, may not be available)
  try {
    await pythonService.start()
    console.log('Python service started')
  } catch (error) {
    console.warn('Python service not available:', error)
    console.warn('Some features will be disabled')
  }

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
