// Speaker Profile
export interface SpeakerProfile {
  id: string
  displayName: string
  voiceEmbedding?: Float32Array
  colorCode: string
  enrollmentDate: Date
  accuracy: number
}

// Transcript Segment
export interface TranscriptSegment {
  id: string
  sessionId: string
  speakerId: string | null
  text: string
  timestamp: Date
  confidence: number
  edited: boolean
  embedding?: Float32Array
}

// Campaign Knowledge
export interface KnowledgeEntry {
  id: string
  sessionId: string
  category: 'location' | 'npc' | 'plot' | 'lore' | 'item'
  title: string
  content: string
  embedding?: Float32Array
  tags: string[]
  createdAt: Date
  source: 'user_input' | 'dm_generated'
}

// Character Sheet
export interface CharacterSheet {
  id: string
  playerId: string | null
  name: string
  class: string
  level: number
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
  skills: Array<{ name: string; proficient: boolean }>
  abilities: string[]
  inventory: string[]
}

// Session State
export interface SessionState {
  id: string
  campaignName: string
  currentScene: string
  sceneMode: 'combat' | 'exploration' | 'rp'
  createdAt: Date
  lastSaved: Date
}

// Initiative Entry
export interface InitiativeEntry {
  id: string
  name: string
  value: number
  isPlayer: boolean
  speakerId?: string
}

// Scene modes
export type SceneMode = 'combat' | 'exploration' | 'rp'

// DM Response
export interface DMResponse {
  id: string
  text: string
  npcVoice?: string
  timestamp: Date
}

// Audio chunk for processing
export interface AudioChunk {
  data: Float32Array
  timestamp: Date
  duration: number
}

// Speaker confidence result
export interface SpeakerConfidence {
  speakerId: string
  confidence: number
  alternatives: Array<{ speakerId: string; confidence: number }>
}

// App settings
export interface AppSettings {
  autoSaveInterval: number // minutes
  intentThreshold: number // 0-1
  whisperModel: 'tiny' | 'base' | 'small' | 'medium'
  llmModel: string
  llmTemperature: { combat: number; exploration: number; rp: number }
  dmVoice: string
  confidenceThreshold: number // below this, show popup
  selectedMicrophone: string // device ID or 'default'
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveInterval: 5,
  intentThreshold: 0.75,
  whisperModel: 'base',
  llmModel: 'mistral:7b-instruct-q4_K_M',
  llmTemperature: { combat: 0.7, exploration: 0.9, rp: 0.8 },
  dmVoice: 'default',
  confidenceThreshold: 0.6,
  selectedMicrophone: 'default'
}

// Speaker color palette
export const SPEAKER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e91e63', // pink
  '#00bcd4'  // cyan
]

// Knowledge categories
export const KNOWLEDGE_CATEGORIES = [
  { value: 'location', label: 'Location' },
  { value: 'npc', label: 'NPC' },
  { value: 'plot', label: 'Plot' },
  { value: 'lore', label: 'Lore' },
  { value: 'item', label: 'Item' }
] as const

// D&D 5e Skills
export const DND_SKILLS = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival'
]
