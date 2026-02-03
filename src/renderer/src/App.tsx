import { useEffect, useCallback } from 'react'
import { useAppStore, useIsAppReady } from './store'
import { Layout } from './components/Layout'
import { OnboardingWizard } from './components/OnboardingWizard'
import { StartupScreen } from './components/StartupScreen'
import type { TranscriptSegment, DMResponse } from '@shared/types'

function App() {
  const showOnboarding = useAppStore((state) => state.showOnboarding)
  const session = useAppStore((state) => state.session)
  const isAppReady = useIsAppReady()
  const addTranscriptSegment = useAppStore((state) => state.addTranscriptSegment)

  // Handle incoming transcript updates from main process
  const handleTranscriptUpdate = useCallback((segment: TranscriptSegment) => {
    addTranscriptSegment(segment)
  }, [addTranscriptSegment])

  // Handle DM responses
  const handleDMResponse = useCallback((response: DMResponse) => {
    // Add DM response to transcript as a special segment
    addTranscriptSegment({
      id: response.id,
      sessionId: session?.id || 'unknown',
      speakerId: 'dm',
      text: response.text,
      timestamp: response.timestamp,
      confidence: 1.0,
      edited: false
    })
  }, [addTranscriptSegment, session])

  // Set up IPC listeners for transcript and DM responses
  useEffect(() => {
    const api = window.electronAPI
    
    // Guard against missing API (e.g., in browser dev mode)
    if (!api) {
      console.warn('electronAPI not available - running outside Electron?')
      return
    }

    // Listen for transcript updates from main process
    const unsubTranscript = api.onTranscriptUpdate?.(handleTranscriptUpdate)
    const unsubDM = api.onDMResponse?.(handleDMResponse)

    return () => {
      unsubTranscript?.()
      unsubDM?.()
    }
  }, [handleTranscriptUpdate, handleDMResponse])

  // Show startup screen while services are initializing
  if (!isAppReady) {
    return <StartupScreen />
  }

  // Show onboarding wizard if no session exists
  if (showOnboarding && !session) {
    return <OnboardingWizard />
  }

  return <Layout />
}

export default App
