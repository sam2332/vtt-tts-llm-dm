import type { 
  SpeakerProfile, 
  TranscriptSegment, 
  KnowledgeEntry, 
  CharacterSheet,
  SessionState,
  DMResponse,
  ServiceStatus
} from '../shared/types'

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>

  // Media permissions
  getMediaAccessStatus: () => Promise<'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'>
  askForMediaAccess: () => Promise<boolean>

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  // Database operations
  getSpeakers: () => Promise<SpeakerProfile[]>
  saveSpeaker: (speaker: SpeakerProfile) => Promise<void>
  deleteSpeaker: (id: string) => Promise<void>

  getSession: (id: string) => Promise<SessionState | null>
  saveSession: (session: SessionState) => Promise<void>
  getSessions: () => Promise<SessionState[]>

  getTranscripts: (sessionId: string) => Promise<TranscriptSegment[]>
  saveTranscript: (transcript: TranscriptSegment) => Promise<void>

  getCharacters: () => Promise<CharacterSheet[]>
  saveCharacter: (character: CharacterSheet) => Promise<void>

  getKnowledge: (sessionId: string) => Promise<KnowledgeEntry[]>
  saveKnowledge: (knowledge: KnowledgeEntry) => Promise<void>

  // Audio operations
  startAudioCapture: () => Promise<void>
  stopAudioCapture: () => Promise<void>
  isCapturing: () => Promise<boolean>
  getAudioDevices: () => Promise<MediaDeviceInfo[]>
  sendAudioData: (data: Float32Array) => void

  // Python service operations
  pythonHealth: () => Promise<boolean>
  pythonStart: () => Promise<void>
  pythonStop: () => Promise<void>
  enrollSpeaker: (speakerId: string, audioData: string) => Promise<{ success: boolean; embedding?: number[] }>
  transcribeSpeech: (audioData: string) => Promise<{ text: string; language: string }>
  addKnowledge: (entry: Partial<KnowledgeEntry>) => Promise<{ success: boolean }>
  searchKnowledge: (query: string, nResults?: number) => Promise<KnowledgeEntry[]>
  synthesizeSpeech: (text: string, voice?: string) => Promise<{ audioPath: string }>

  // LLM operations
  llmHealth: () => Promise<boolean>
  llmListModels: () => Promise<string[]>
  llmSetModel: (model: string) => Promise<void>
  llmClearHistory: () => Promise<void>
  generateDMResponse: (context: {
    transcript: TranscriptSegment[]
    knowledge: KnowledgeEntry[]
    characters: CharacterSheet[]
    sceneMode: string
  }) => Promise<DMResponse>

  // DM state management
  setSceneMode: (mode: 'combat' | 'exploration' | 'rp') => Promise<{ success: boolean; sceneMode: string }>
  setSceneDescription: (description: string) => Promise<{ success: boolean }>
  setActiveNPCs: (npcs: string[]) => Promise<{ success: boolean }>
  setCharacterStats: (stats: string) => Promise<{ success: boolean }>
  clearTranscriptHistory: () => Promise<{ success: boolean }>
  forceDMResponse: (promptText?: string) => Promise<{ success: boolean; text?: string; error?: string }>

  // Event listeners (return unsubscribe function)
  onTranscriptUpdate: (callback: (segment: TranscriptSegment) => void) => () => void
  onDMResponse: (callback: (response: DMResponse) => void) => () => void
  onSpeakerIdentified: (callback: (data: { speakerId: string; confidence: number }) => void) => () => void
  onLowConfidence: (callback: (data: { segment: TranscriptSegment; suggestions: string[] }) => void) => () => void
  onServiceStatus: (callback: (status: Partial<ServiceStatus>) => void) => () => void
  
  // Service initialization
  initializeServices: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
