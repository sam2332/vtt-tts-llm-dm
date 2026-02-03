import { useState, useEffect, useCallback } from 'react'
import { useAppStore, useSession, useSceneMode } from '../store'
import { SettingsPanel } from './SettingsPanel'
import { useAudioCapture } from '../hooks'
import type { SceneMode } from '@shared/types'

export function TopBar() {
  const session = useSession()
  const sceneMode = useSceneMode()
  const setListening = useAppStore((state) => state.setListening)
  const setSceneMode = useAppStore((state) => state.setSceneMode)
  const selectedMicrophone = useAppStore((state) => state.settings.selectedMicrophone)
  
  const [showSettings, setShowSettings] = useState(false)
  
  // Use the audio capture hook with selected microphone
  const { 
    startCapture, 
    stopCapture, 
    deviceName,
    isCapturing
  } = useAudioCapture({ deviceId: selectedMicrophone })

  // Sync hook's isCapturing state to the store
  useEffect(() => {
    setListening(isCapturing)
  }, [isCapturing, setListening])

  const handleToggleListening = useCallback(async () => {
    try {
      if (isCapturing) {
        await stopCapture()
      } else {
        await startCapture()
      }
    } catch (error) {
      console.error('Failed to toggle audio capture:', error)
    }
  }, [isCapturing, startCapture, stopCapture])

  const sceneModes: { mode: SceneMode; label: string; color: string; icon: string }[] = [
    { mode: 'combat', label: 'Combat', color: 'text-error', icon: '⚔️' },
    { mode: 'exploration', label: 'Explore', color: 'text-success', icon: '🗺️' },
    { mode: 'rp', label: 'RP', color: 'text-accent', icon: '🎭' }
  ]

  return (
    <>
      <header className="h-14 bg-surface border-b border-surface-light flex items-center px-4 gap-4 titlebar-drag-region">
        {/* App Icon & Title */}
        <div className="flex items-center gap-3 titlebar-no-drag">
          <span className="text-2xl">🎲</span>
          <div>
            <h1 className="font-bold text-sm leading-tight">AI DM Listener</h1>
            {session && (
              <p className="text-xs text-text-secondary">{session.campaignName}</p>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Scene Mode Selector */}
        <div className="flex gap-1 titlebar-no-drag">
          {sceneModes.map(({ mode, label, color, icon }) => (
            <button
              key={mode}
              onClick={() => setSceneMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sceneMode === mode
                  ? `bg-surface-light ${color}`
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
              }`}
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-surface-light" />

        {/* Listening Toggle with Microphone Info */}
        <div className="flex items-center gap-2 titlebar-no-drag">
          <button
            onClick={handleToggleListening}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all ${
              isCapturing
                ? 'bg-error/20 text-error hover:bg-error/30'
                : 'bg-success/20 text-success hover:bg-success/30'
            }`}
            title={isCapturing && deviceName ? `Using: ${deviceName}` : 'Start listening'}
          >
            <span className="text-lg">🎤</span>
            <span className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-error animate-pulse' : 'bg-success'}`} />
            {isCapturing ? 'Stop' : 'Start'}
          </button>
          
          {/* Show device name when listening */}
          {isCapturing && deviceName && (
            <span className="text-xs text-text-secondary max-w-[120px] truncate" title={deviceName}>
              {deviceName}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1 titlebar-no-drag">
          <button className="btn-icon" title="Save Checkpoint">
            💾
          </button>
          <button 
            className="btn-icon" 
            title="Settings"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
          <button className="btn-icon" title="Help">
            ❓
          </button>
        </div>
      </header>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
