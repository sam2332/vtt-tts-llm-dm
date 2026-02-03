import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Media permissions
  getMediaAccessStatus: () => ipcRenderer.invoke('get-media-access-status'),
  askForMediaAccess: () => ipcRenderer.invoke('ask-for-media-access'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Database operations
  getSpeakers: () => ipcRenderer.invoke('db-get-speakers'),
  saveSpeaker: (speaker: unknown) => ipcRenderer.invoke('db-save-speaker', speaker),
  deleteSpeaker: (id: string) => ipcRenderer.invoke('db-delete-speaker', id),

  getSession: (id: string) => ipcRenderer.invoke('db-get-session', id),
  saveSession: (session: unknown) => ipcRenderer.invoke('db-save-session', session),
  getSessions: () => ipcRenderer.invoke('db-get-sessions'),

  getTranscripts: (sessionId: string) => ipcRenderer.invoke('db-get-transcripts', sessionId),
  saveTranscript: (transcript: unknown) => ipcRenderer.invoke('db-save-transcript', transcript),

  getCharacters: () => ipcRenderer.invoke('db-get-characters'),
  saveCharacter: (character: unknown) => ipcRenderer.invoke('db-save-character', character),

  getKnowledge: (sessionId: string) => ipcRenderer.invoke('db-get-knowledge', sessionId),
  saveKnowledge: (knowledge: unknown) => ipcRenderer.invoke('db-save-knowledge', knowledge),

  // Audio operations
  startAudioCapture: () => ipcRenderer.invoke('audio-start-capture'),
  stopAudioCapture: () => ipcRenderer.invoke('audio-stop-capture'),
  isCapturing: () => ipcRenderer.invoke('audio-is-capturing'),
  getAudioDevices: () => ipcRenderer.invoke('audio-get-devices'),
  sendAudioData: (data: Float32Array) => ipcRenderer.send('audio-data', data),

  // Python service operations
  pythonHealth: () => ipcRenderer.invoke('python-health'),
  pythonStart: () => ipcRenderer.invoke('python-start'),
  pythonStop: () => ipcRenderer.invoke('python-stop'),
  enrollSpeaker: (speakerId: string, audioData: string) => 
    ipcRenderer.invoke('python-enroll-speaker', speakerId, audioData),
  transcribeSpeech: (audioData: string) => 
    ipcRenderer.invoke('python-transcribe', audioData),
  addKnowledge: (entry: unknown) => 
    ipcRenderer.invoke('python-add-knowledge', entry),
  searchKnowledge: (query: string, nResults?: number) => 
    ipcRenderer.invoke('python-search-knowledge', query, nResults),
  synthesizeSpeech: (text: string, voice?: string) => 
    ipcRenderer.invoke('python-synthesize', text, voice),

  // LLM operations
  llmHealth: () => ipcRenderer.invoke('llm-check-health'),
  llmListModels: () => ipcRenderer.invoke('llm-list-models'),
  llmSetModel: (model: string) => ipcRenderer.invoke('llm-set-model', model),
  llmClearHistory: () => ipcRenderer.invoke('llm-clear-history'),
  generateDMResponse: (context: unknown) => 
    ipcRenderer.invoke('llm-generate-response', context),

  // DM state management
  setSceneMode: (mode: 'combat' | 'exploration' | 'rp') => 
    ipcRenderer.invoke('dm-set-scene-mode', mode),
  setSceneDescription: (description: string) => 
    ipcRenderer.invoke('dm-set-scene-description', description),
  setActiveNPCs: (npcs: string[]) => 
    ipcRenderer.invoke('dm-set-active-npcs', npcs),
  setCharacterStats: (stats: string) => 
    ipcRenderer.invoke('dm-set-character-stats', stats),
  clearTranscriptHistory: () => 
    ipcRenderer.invoke('dm-clear-transcript-history'),
  forceDMResponse: (promptText?: string) => 
    ipcRenderer.invoke('dm-force-response', promptText),
  
  // Event listeners
  onTranscriptUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('transcript-update', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('transcript-update')
  },
  onDMResponse: (callback: (data: unknown) => void) => {
    ipcRenderer.on('dm-response', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('dm-response')
  },
  onSpeakerIdentified: (callback: (data: unknown) => void) => {
    ipcRenderer.on('speaker-identified', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('speaker-identified')
  },
  onLowConfidence: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('low-confidence', handler)
    return () => ipcRenderer.removeListener('low-confidence', handler)
  },
  onServiceStatus: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('service-status', handler)
    return () => ipcRenderer.removeListener('service-status', handler)
  },
  
  // Request service initialization
  initializeServices: () => ipcRenderer.invoke('initialize-services')
})

// Type definitions are in src/renderer/src/electron.d.ts
// The preload script exposes all these methods to the renderer
