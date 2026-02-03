import { useState } from 'react'
import { useAppStore } from '../store'
import { generateId } from '@shared/utils'
import type { SessionState } from '@shared/types'

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [campaignName, setCampaignName] = useState('')
  const [campaignSetting, setCampaignSetting] = useState('')
  
  const setSession = useAppStore((state) => state.setSession)
  const setShowOnboarding = useAppStore((state) => state.setShowOnboarding)

  const handleComplete = () => {
    const session: SessionState = {
      id: generateId(),
      campaignName: campaignName || 'New Campaign',
      currentScene: campaignSetting || 'Your adventure begins...',
      sceneMode: 'exploration',
      createdAt: new Date(),
      lastSaved: new Date()
    }

    setSession(session)
    setShowOnboarding(false)
  }

  const handleSkip = () => {
    const session: SessionState = {
      id: generateId(),
      campaignName: 'Quick Session',
      currentScene: 'An adventure awaits...',
      sceneMode: 'exploration',
      createdAt: new Date(),
      lastSaved: new Date()
    }

    setSession(session)
    setShowOnboarding(false)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-accent' : 'bg-surface-light'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <span className="text-6xl mb-6 block">🎲</span>
            <h1 className="text-3xl font-bold mb-4">Welcome to AI DM Listener</h1>
            <p className="text-text-secondary text-lg mb-8">
              Your intelligent dungeon master assistant that listens to your D&D sessions
              and responds as the DM.
            </p>
            <button onClick={() => setStep(2)} className="btn-primary text-lg px-8 py-3">
              Get Started →
            </button>
            <button 
              onClick={handleSkip}
              className="block mx-auto mt-4 text-text-secondary hover:text-text-primary text-sm"
            >
              Skip setup
            </button>
          </div>
        )}

        {/* Step 2: Campaign Name */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Name Your Campaign</h2>
            <p className="text-text-secondary mb-6">
              Give your adventure a memorable name.
            </p>
            
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., The Lost Mines of Phandelver"
              className="input-field w-full text-lg py-3 mb-6"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Campaign Setting */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Describe Your World</h2>
            <p className="text-text-secondary mb-6">
              Provide a brief description of your campaign setting. This helps the AI DM 
              understand the context of your adventure.
            </p>
            
            <textarea
              value={campaignSetting}
              onChange={(e) => setCampaignSetting(e.target.value)}
              placeholder="e.g., A high fantasy world where ancient dragons have returned after 1000 years of slumber. The party starts in the coastal city of Neverwinter..."
              rows={6}
              className="textarea-field w-full mb-6"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                ← Back
              </button>
              <button onClick={handleComplete} className="btn-primary flex-1">
                Start Adventure 🎲
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
