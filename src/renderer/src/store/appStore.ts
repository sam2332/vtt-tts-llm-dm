import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { 
  SpeakerProfile, 
  TranscriptSegment, 
  CharacterSheet, 
  KnowledgeEntry,
  SessionState,
  InitiativeEntry,
  SceneMode,
  AppSettings,
  DMResponse
} from '@shared/types'
import { DEFAULT_SETTINGS, SPEAKER_COLORS } from '@shared/types'

interface AppState {
  // Session
  session: SessionState | null
  isListening: boolean
  
  // Speakers
  speakers: SpeakerProfile[]
  
  // Transcript
  transcript: TranscriptSegment[]
  
  // Characters
  characters: CharacterSheet[]
  
  // Knowledge
  knowledge: KnowledgeEntry[]
  
  // Initiative
  initiative: InitiativeEntry[]
  currentTurnIndex: number
  
  // DM responses
  dmResponses: DMResponse[]
  
  // Scene mode
  sceneMode: SceneMode
  
  // Settings
  settings: AppSettings
  
  // UI state
  showOnboarding: boolean
  showSpeakerEnrollment: boolean
  lowConfidenceAlert: { speakerId: string; confidence: number; text: string } | null
  sidebarTab: 'speakers' | 'characters' | 'knowledge'
  
  // Actions
  setSession: (session: SessionState | null) => void
  setListening: (listening: boolean) => void
  
  addSpeaker: (speaker: SpeakerProfile) => void
  updateSpeaker: (id: string, updates: Partial<SpeakerProfile>) => void
  removeSpeaker: (id: string) => void
  
  addTranscript: (segment: TranscriptSegment) => void
  addTranscriptSegment: (segment: TranscriptSegment) => void
  updateTranscript: (id: string, updates: Partial<TranscriptSegment>) => void
  updateTranscriptSegment: (id: string, updates: Partial<TranscriptSegment>) => void
  clearTranscript: () => void
  
  addCharacter: (character: CharacterSheet) => void
  updateCharacter: (id: string, updates: Partial<CharacterSheet>) => void
  removeCharacter: (id: string) => void
  
  addKnowledge: (entry: KnowledgeEntry) => void
  updateKnowledge: (id: string, updates: Partial<KnowledgeEntry>) => void
  removeKnowledge: (id: string) => void
  
  setInitiative: (entries: InitiativeEntry[]) => void
  addToInitiative: (entry: InitiativeEntry) => void
  removeFromInitiative: (id: string) => void
  nextTurn: () => void
  resetCombat: () => void
  
  addDMResponse: (response: DMResponse) => void
  
  setSceneMode: (mode: SceneMode) => void
  setSettings: (settings: Partial<AppSettings>) => void
  
  setShowOnboarding: (show: boolean) => void
  setShowSpeakerEnrollment: (show: boolean) => void
  setLowConfidenceAlert: (alert: { speakerId: string; confidence: number; text: string } | null) => void
  setSidebarTab: (tab: 'speakers' | 'characters' | 'knowledge') => void
  
  // Reset
  resetState: () => void
}

const initialState = {
  session: null,
  isListening: false,
  speakers: [],
  transcript: [],
  characters: [],
  knowledge: [],
  initiative: [],
  currentTurnIndex: 0,
  dmResponses: [],
  sceneMode: 'exploration' as SceneMode,
  settings: DEFAULT_SETTINGS,
  showOnboarding: true,
  showSpeakerEnrollment: false,
  lowConfidenceAlert: null,
  sidebarTab: 'speakers' as const
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      // Session actions
      setSession: (session) => set({ session }),
      setListening: (isListening) => set({ isListening }),
      
      // Speaker actions
      addSpeaker: (speaker) => set((state) => ({
        speakers: [...state.speakers, {
          ...speaker,
          colorCode: speaker.colorCode || SPEAKER_COLORS[state.speakers.length % SPEAKER_COLORS.length]
        }]
      })),
      updateSpeaker: (id, updates) => set((state) => ({
        speakers: state.speakers.map((s) => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      removeSpeaker: (id) => set((state) => ({
        speakers: state.speakers.filter((s) => s.id !== id)
      })),
      
      // Transcript actions
      addTranscript: (segment) => set((state) => ({
        transcript: [...state.transcript, segment]
      })),
      addTranscriptSegment: (segment) => set((state) => ({
        transcript: [...state.transcript, segment]
      })),
      updateTranscript: (id, updates) => set((state) => ({
        transcript: state.transcript.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        )
      })),
      updateTranscriptSegment: (id, updates) => set((state) => ({
        transcript: state.transcript.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        )
      })),
      clearTranscript: () => set({ transcript: [] }),
      
      // Character actions
      addCharacter: (character) => set((state) => ({
        characters: [...state.characters, character]
      })),
      updateCharacter: (id, updates) => set((state) => ({
        characters: state.characters.map((c) => 
          c.id === id ? { ...c, ...updates } : c
        )
      })),
      removeCharacter: (id) => set((state) => ({
        characters: state.characters.filter((c) => c.id !== id)
      })),
      
      // Knowledge actions
      addKnowledge: (entry) => set((state) => ({
        knowledge: [...state.knowledge, entry]
      })),
      updateKnowledge: (id, updates) => set((state) => ({
        knowledge: state.knowledge.map((k) => 
          k.id === id ? { ...k, ...updates } : k
        )
      })),
      removeKnowledge: (id) => set((state) => ({
        knowledge: state.knowledge.filter((k) => k.id !== id)
      })),
      
      // Initiative actions
      setInitiative: (entries) => set({ 
        initiative: entries.sort((a, b) => b.value - a.value),
        currentTurnIndex: 0 
      }),
      addToInitiative: (entry) => set((state) => ({
        initiative: [...state.initiative, entry].sort((a, b) => b.value - a.value)
      })),
      removeFromInitiative: (id) => set((state) => ({
        initiative: state.initiative.filter((i) => i.id !== id)
      })),
      nextTurn: () => set((state) => ({
        currentTurnIndex: (state.currentTurnIndex + 1) % state.initiative.length
      })),
      resetCombat: () => set({ initiative: [], currentTurnIndex: 0 }),
      
      // DM response actions
      addDMResponse: (response) => set((state) => ({
        dmResponses: [...state.dmResponses, response],
        transcript: [...state.transcript, {
          id: response.id,
          sessionId: state.session?.id || '',
          speakerId: null,
          text: response.text,
          timestamp: response.timestamp,
          confidence: 1,
          edited: false
        }]
      })),
      
      // Scene mode actions
      setSceneMode: (sceneMode) => set({ sceneMode }),
      setSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
      
      // UI state actions
      setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
      setShowSpeakerEnrollment: (showSpeakerEnrollment) => set({ showSpeakerEnrollment }),
      setLowConfidenceAlert: (lowConfidenceAlert) => set({ lowConfidenceAlert }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      
      // Reset
      resetState: () => set(initialState)
    }),
    {
      name: 'ai-dm-listener-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        speakers: state.speakers,
        characters: state.characters,
        knowledge: state.knowledge,
        settings: state.settings,
        sceneMode: state.sceneMode,
        showOnboarding: state.showOnboarding
      })
    }
  )
)

// Selector hooks for performance
export const useSession = () => useAppStore((state) => state.session)
export const useIsListening = () => useAppStore((state) => state.isListening)
export const useSpeakers = () => useAppStore((state) => state.speakers)
export const useTranscript = () => useAppStore((state) => state.transcript)
export const useCharacters = () => useAppStore((state) => state.characters)
export const useKnowledge = () => useAppStore((state) => state.knowledge)
export const useInitiative = () => useAppStore((state) => state.initiative)
export const useSceneMode = () => useAppStore((state) => state.sceneMode)
export const useSettings = () => useAppStore((state) => state.settings)
