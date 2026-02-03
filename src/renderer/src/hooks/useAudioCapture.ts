/**
 * Audio capture hook for the renderer process
 * Uses Web Audio API to capture microphone input
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseAudioCaptureOptions {
  sampleRate?: number
  deviceId?: string // 'default' or specific device ID
  onAudioData?: (data: Float32Array) => void
}

interface AudioCaptureState {
  isCapturing: boolean
  hasPermission: boolean
  error: string | null
  deviceName: string | null
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const { sampleRate = 16000, deviceId = 'default', onAudioData } = options

  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    hasPermission: false,
    error: null,
    deviceName: null
  })

  // Use a ref to track capturing state for callbacks (avoids stale closure)
  const isCapturingRef = useRef(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  /**
   * Build audio constraints with optional device ID
   */
  const getAudioConstraints = useCallback((targetDeviceId?: string): MediaTrackConstraints => {
    const constraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: sampleRate }
    }
    
    // Only add deviceId constraint if not 'default'
    if (targetDeviceId && targetDeviceId !== 'default') {
      constraints.deviceId = { exact: targetDeviceId }
    }
    
    return constraints
  }, [sampleRate])

  /**
   * Request microphone permission and get device info
   */
  const requestPermission = useCallback(async () => {
    try {
      // First, ask for permission at the system level (important for Electron)
      const granted = await window.electronAPI?.askForMediaAccess?.()
      if (granted === false) {
        setState(prev => ({
          ...prev,
          hasPermission: false,
          error: 'Microphone access denied. Please enable microphone access in your system privacy settings.'
        }))
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: getAudioConstraints(deviceId)
      })
      
      // Get device name
      const tracks = stream.getAudioTracks()
      const deviceName = tracks[0]?.label || 'Unknown Microphone'
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      setState(prev => ({
        ...prev,
        hasPermission: true,
        deviceName,
        error: null
      }))
      
      return true
    } catch (error) {
      let errorMessage = 'Failed to access microphone'
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          // Provide platform-specific guidance
          const platform = await window.electronAPI?.getPlatform?.()
          if (platform === 'win32') {
            errorMessage = 'Microphone access denied. Please check Windows Settings > Privacy & Security > Microphone and ensure this app is allowed.'
          } else if (platform === 'darwin') {
            errorMessage = 'Microphone access denied. Please check System Preferences > Security & Privacy > Privacy > Microphone.'
          } else {
            errorMessage = 'Microphone access denied. Please check your system privacy settings.'
          }
        } else {
          errorMessage = error.message
        }
      }
      
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage
      }))
      return false
    }
  }, [deviceId, getAudioConstraints])

  /**
   * Start capturing audio
   */
  const startCapture = useCallback(async (overrideDeviceId?: string) => {
    if (isCapturingRef.current) return
    
    const targetDeviceId = overrideDeviceId || deviceId

    try {
      // Get microphone stream with specified device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(targetDeviceId)
      })

      mediaStreamRef.current = stream
      
      // Update device name from actual stream
      const tracks = stream.getAudioTracks()
      const currentDeviceName = tracks[0]?.label || 'Unknown Microphone'

      // Create audio context
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      // Create ScriptProcessor for audio data (worklet alternative for simplicity)
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        const audioData = new Float32Array(inputData)
        
        // Call callback
        if (onAudioData) {
          onAudioData(audioData)
        }
        
        // Send to main process
        window.electronAPI?.sendAudioData?.(audioData)
      }

      // Connect nodes
      source.connect(processor)
      processor.connect(audioContext.destination)

      // Update state and ref
      isCapturingRef.current = true
      setState(prev => ({
        ...prev,
        isCapturing: true,
        deviceName: currentDeviceName,
        error: null
      }))

      // Notify main process
      await window.electronAPI?.startAudioCapture?.()

    } catch (error) {
      console.error('Failed to start audio capture:', error)
      
      let errorMessage = 'Failed to start capture'
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          const platform = await window.electronAPI?.getPlatform?.()
          if (platform === 'win32') {
            errorMessage = 'Microphone access denied. Please check Windows Settings > Privacy & Security > Microphone and ensure this app is allowed.'
          } else if (platform === 'darwin') {
            errorMessage = 'Microphone access denied. Please check System Preferences > Security & Privacy > Privacy > Microphone.'
          } else {
            errorMessage = 'Microphone access denied. Please check your system privacy settings.'
          }
        } else {
          errorMessage = error.message
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
    }
  }, [deviceId, sampleRate, getAudioConstraints, onAudioData])

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(async () => {
    if (!isCapturingRef.current) return

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    workletNodeRef.current = null

    // Update state and ref
    isCapturingRef.current = false
    setState(prev => ({
      ...prev,
      isCapturing: false
    }))

    // Notify main process
    await window.electronAPI?.stopAudioCapture?.()
  }, [])

  /**
   * Get list of available audio input devices
   */
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(d => d.kind === 'audioinput')
    } catch {
      return []
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturingRef.current) {
        stopCapture()
      }
    }
  }, [stopCapture])

  return {
    ...state,
    startCapture,
    stopCapture,
    requestPermission,
    getDevices
  }
}
