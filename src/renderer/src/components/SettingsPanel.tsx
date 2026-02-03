import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import type { AppSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

interface AudioDevice {
  deviceId: string
  label: string
}

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const settings = useAppStore((state) => state.settings)
  const setSettings = useAppStore((state) => state.setSettings)

  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [pythonStatus, setPythonStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [loadingDevices, setLoadingDevices] = useState(true)

  // Get audio devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to get labeled devices
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => stream.getTracks().forEach(t => t.stop()))
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        const microphones = devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 8)}...`
          }))
        
        setAudioDevices(microphones)
      } catch (err) {
        console.error('Failed to get audio devices:', err)
      } finally {
        setLoadingDevices(false)
      }
    }

    getDevices()
  }, [])

  // Check service health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const ollamaHealthy = await window.electronAPI?.llmHealth?.()
        setOllamaStatus(ollamaHealthy ? 'online' : 'offline')
        
        if (ollamaHealthy) {
          const models = await window.electronAPI?.llmListModels?.()
          setAvailableModels(models || [])
        }
      } catch {
        setOllamaStatus('offline')
      }

      try {
        const pythonHealthy = await window.electronAPI?.pythonHealth?.()
        setPythonStatus(pythonHealthy ? 'online' : 'offline')
      } catch {
        setPythonStatus('offline')
      }
    }

    checkHealth()
  }, [])

  const handleSave = () => {
    setSettings(localSettings)
    onClose()
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS)
  }

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateTemperature = (mode: 'combat' | 'exploration' | 'rp', value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      llmTemperature: { ...prev.llmTemperature, [mode]: value }
    }))
  }

  const statusColor = (status: 'checking' | 'online' | 'offline') => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      default: return 'bg-yellow-500 animate-pulse'
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Service Status */}
          <div>
            <h3 className="font-medium mb-3">Service Status</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColor(ollamaStatus)}`}></div>
                <span className="text-sm">Ollama LLM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColor(pythonStatus)}`}></div>
                <span className="text-sm">Python ML Service</span>
              </div>
            </div>
          </div>

          {/* Microphone Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Microphone
            </label>
            <select
              value={localSettings.selectedMicrophone}
              onChange={(e) => updateSetting('selectedMicrophone', e.target.value)}
              className="input-field w-full"
              disabled={loadingDevices}
            >
              <option value="default">System Default</option>
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-secondary mt-1">
              {loadingDevices 
                ? 'Loading audio devices...' 
                : `${audioDevices.length} microphone(s) available`}
            </p>
          </div>

          {/* Whisper Model */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Whisper Model (Speech Recognition)
            </label>
            <select
              value={localSettings.whisperModel}
              onChange={(e) => updateSetting('whisperModel', e.target.value as AppSettings['whisperModel'])}
              className="input-field w-full"
            >
              <option value="tiny">Tiny (fastest, least accurate)</option>
              <option value="base">Base (balanced)</option>
              <option value="small">Small (better accuracy)</option>
              <option value="medium">Medium (best accuracy, slowest)</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Larger models are more accurate but slower. 'base' recommended for most systems.
            </p>
          </div>

          {/* LLM Model */}
          <div>
            <label className="block text-sm font-medium mb-1">LLM Model</label>
            <select
              value={localSettings.llmModel}
              onChange={(e) => updateSetting('llmModel', e.target.value)}
              className="input-field w-full"
              disabled={ollamaStatus !== 'online'}
            >
              {availableModels.length > 0 ? (
                availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              ) : (
                <option value={localSettings.llmModel}>{localSettings.llmModel}</option>
              )}
            </select>
            {ollamaStatus === 'offline' && (
              <p className="text-xs text-red-400 mt-1">
                Ollama is offline. Start it to see available models.
              </p>
            )}
          </div>

          {/* DM Voice (TTS) */}
          <div>
            <label className="block text-sm font-medium mb-1">DM Voice (Piper TTS)</label>
            <select
              value={localSettings.dmVoice}
              onChange={(e) => updateSetting('dmVoice', e.target.value)}
              className="input-field w-full"
              disabled={pythonStatus !== 'online'}
            >
              <option value="default">Default Narrator</option>
              <option value="narrator">Narrator (Clear)</option>
              <option value="male_deep">Male (Deep)</option>
              <option value="female">Female</option>
              <option value="elderly">Elderly (British)</option>
              <option value="young">Young</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Voice used for DM narration. NPC voices can be specified per-character.
            </p>
          </div>

          {/* Temperature Settings */}
          <div>
            <label className="block text-sm font-medium mb-2">LLM Temperature by Scene Mode</label>
            <div className="space-y-2">
              {(['combat', 'exploration', 'rp'] as const).map(mode => (
                <div key={mode} className="flex items-center gap-3">
                  <span className="text-sm capitalize w-24">{mode === 'rp' ? 'Roleplay' : mode}:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={localSettings.llmTemperature[mode]}
                    onChange={(e) => updateTemperature(mode, parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm w-10 text-right">
                    {localSettings.llmTemperature[mode].toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Higher = more creative, lower = more consistent.
            </p>
          </div>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Speaker Confidence Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={localSettings.confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">
                {(localSettings.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Below this confidence, you'll be asked to confirm speaker identity.
            </p>
          </div>

          {/* Intent Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1">
              DM Intent Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={localSettings.intentThreshold}
                onChange={(e) => updateSetting('intentThreshold', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm w-12 text-right">
                {(localSettings.intentThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Higher = DM responds less often, only when clearly needed.
            </p>
          </div>

          {/* Auto-save Interval */}
          <div>
            <label className="block text-sm font-medium mb-1">Auto-save Interval (minutes)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={localSettings.autoSaveInterval}
              onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value) || 5)}
              className="input-field w-24"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-surface-light">
          <button onClick={handleReset} className="btn-secondary text-sm">
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  )
}
