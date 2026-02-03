import { useState, useEffect, useCallback } from 'react'
import { useAppStore, useSession, useSceneMode, useServiceStatus } from '../store'
import { SettingsPanel } from './SettingsPanel'
import { useAudioCapture } from '../hooks'
import type { SceneMode } from '@shared/types'

export function TopBar() {
  const session = useSession()
  const sceneMode = useSceneMode()
  const serviceStatus = useServiceStatus()
  const setListening = useAppStore((state) => state.setListening)
  const setSceneMode = useAppStore((state) => state.setSceneMode)
  const selectedMicrophone = useAppStore((state) => state.settings.selectedMicrophone)
  
  const [showSettings, setShowSettings] = useState(false)
  const [showServicePopup, setShowServicePopup] = useState(false)
  
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
          {/* Service Status Indicator */}
          <div className="relative">
            <button 
              className="btn-icon flex items-center gap-1"
              title="Service Status"
              onClick={() => setShowServicePopup(!showServicePopup)}
            >
              <ServiceStatusDot status={serviceStatus.python.status} />
              <ServiceStatusDot status={serviceStatus.llm.status} />
            </button>
            
            {showServicePopup && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-surface-light rounded-lg shadow-xl z-50">
                <div className="p-3 border-b border-surface-light">
                  <h3 className="font-medium text-sm">Service Status</h3>
                </div>
                <div className="p-3 space-y-2">
                  <ServiceStatusRow 
                    name="Python ML" 
                    status={serviceStatus.python.status}
                    message={serviceStatus.python.message}
                  />
                  <ServiceStatusRow 
                    name="Ollama LLM" 
                    status={serviceStatus.llm.status}
                    message={serviceStatus.llm.message}
                  />
                </div>
              </div>
            )}
          </div>
          
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

// Helper component for service status dot
function ServiceStatusDot({ status }: { status: 'starting' | 'checking' | 'ready' | 'error' | 'stopped' }) {
  const colorClass = {
    starting: 'bg-yellow-400 animate-pulse',
    checking: 'bg-yellow-400 animate-pulse',
    ready: 'bg-green-400',
    error: 'bg-red-400',
    stopped: 'bg-gray-500'
  }[status]
  
  return <span className={`w-2 h-2 rounded-full ${colorClass}`} />
}

// Helper component for service status row in popup
function ServiceStatusRow({ 
  name, 
  status, 
  message 
}: { 
  name: string
  status: 'starting' | 'checking' | 'ready' | 'error' | 'stopped'
  message?: string
}) {
  const statusLabel = {
    starting: 'Starting...',
    checking: 'Checking...',
    ready: 'Ready',
    error: 'Error',
    stopped: 'Stopped'
  }[status]
  
  const statusColor = {
    starting: 'text-yellow-400',
    checking: 'text-yellow-400',
    ready: 'text-green-400',
    error: 'text-red-400',
    stopped: 'text-gray-400'
  }[status]
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ServiceStatusDot status={status} />
        <span className="text-sm text-text-primary">{name}</span>
      </div>
      <span className={`text-xs ${statusColor}`} title={message}>
        {statusLabel}
      </span>
    </div>
  )
}
