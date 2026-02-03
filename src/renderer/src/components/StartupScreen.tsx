import { useEffect, useState, useRef } from 'react'
import { useAppStore, useServiceStatus } from '../store'
import type { ServiceStatus } from '@shared/types'

interface ServiceItemProps {
  name: string
  status: 'starting' | 'checking' | 'ready' | 'error' | 'stopped'
  message?: string
  details?: Record<string, boolean>
}

function ServiceItem({ name, status, message, details }: ServiceItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'starting':
      case 'checking':
        return (
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )
      case 'ready':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'stopped':
        return (
          <div className="w-5 h-5 rounded-full bg-surface-light" />
        )
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'starting':
      case 'checking':
        return 'text-accent'
      case 'ready':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'stopped':
        return 'text-text-muted'
    }
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{name}</span>
          <span className={`text-sm ${getStatusColor()}`}>
            {status === 'starting' || status === 'checking' ? 'Loading...' : 
             status === 'ready' ? 'Ready' : 
             status === 'error' ? 'Error' : 'Waiting'}
          </span>
        </div>
        {message && (
          <p className="text-sm text-text-secondary mt-0.5 truncate">{message}</p>
        )}
        {details && status === 'ready' && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {Object.entries(details).map(([key, value]) => (
              <span 
                key={key}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {key}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function StartupScreen() {
  const serviceStatus = useServiceStatus()
  const setAppReady = useAppStore((state) => state.setAppReady)
  const setPythonStatus = useAppStore((state) => state.setPythonStatus)
  const setLLMStatus = useAppStore((state) => state.setLLMStatus)
  
  const initStartedRef = useRef(false)
  const [showContinue, setShowContinue] = useState(false)

  // Start service initialization
  useEffect(() => {
    // Use ref to prevent double initialization in StrictMode/HMR
    if (initStartedRef.current) return
    initStartedRef.current = true

    const api = window.electronAPI
    if (!api) {
      console.warn('electronAPI not available - running outside Electron?')
      setAppReady(true)
      return
    }

    console.log('Setting up service status listener...')
    
    // Listen for status updates - don't remove listeners on cleanup
    // since we need them for the entire initialization
    const handleStatusUpdate = (status: Partial<ServiceStatus>) => {
      console.log('Received service status update:', status)
      if (status.python) {
        setPythonStatus(status.python)
      }
      if (status.llm) {
        setLLMStatus(status.llm)
      }
    }
    
    api.onServiceStatus?.(handleStatusUpdate)

    // Trigger initialization
    console.log('Triggering service initialization...')
    api.initializeServices?.()
      .then(() => {
        console.log('initializeServices call completed')
      })
      .catch((err: Error) => {
        console.error('initializeServices failed:', err)
        setPythonStatus({ status: 'error', message: 'Failed to initialize' })
        setLLMStatus({ status: 'error', message: 'Failed to initialize' })
      })

    // No cleanup - we keep the listener active
  }, [setAppReady, setPythonStatus, setLLMStatus])

  // Check if we can show the continue button
  useEffect(() => {
    const pythonDone = serviceStatus.python.status === 'ready' || serviceStatus.python.status === 'error'
    const llmDone = serviceStatus.llm.status === 'ready' || serviceStatus.llm.status === 'error'
    
    if (pythonDone && llmDone) {
      // Small delay before showing continue
      const timer = setTimeout(() => setShowContinue(true), 500)
      return () => clearTimeout(timer)
    }
  }, [serviceStatus])

  // Auto-continue if all services are ready
  useEffect(() => {
    if (serviceStatus.python.status === 'ready' && serviceStatus.llm.status === 'ready') {
      const timer = setTimeout(() => setAppReady(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [serviceStatus, setAppReady])

  const handleContinue = () => {
    setAppReady(true)
  }

  const hasErrors = serviceStatus.python.status === 'error' || serviceStatus.llm.status === 'error'

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">AI DM Listener</h1>
          <p className="text-text-secondary">Initializing services...</p>
        </div>

        {/* Service Status */}
        <div className="bg-surface rounded-xl border border-surface-light p-4 mb-6">
          <ServiceItem
            name="Python ML Service"
            status={serviceStatus.python.status}
            message={serviceStatus.python.message}
            details={serviceStatus.python.services}
          />
          <div className="border-t border-surface-light" />
          <ServiceItem
            name="Ollama LLM"
            status={serviceStatus.llm.status}
            message={serviceStatus.llm.message}
          />
        </div>

        {/* Continue Button */}
        {showContinue && (
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                hasErrors
                  ? 'bg-surface-light text-text-primary hover:bg-surface-lighter'
                  : 'bg-accent text-background hover:bg-accent/90'
              }`}
            >
              {hasErrors ? 'Continue with limited features' : 'Continue'}
            </button>
            
            {hasErrors && (
              <p className="text-sm text-text-muted text-center">
                Some features may be unavailable. Check that all services are running.
              </p>
            )}
          </div>
        )}

        {/* Loading indicator when waiting */}
        {!showContinue && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
              <span className="text-sm">Please wait...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
