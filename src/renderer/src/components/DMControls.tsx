import { useState } from 'react'
import { useIsListening, useSceneMode } from '../store'
import { KnowledgeModal } from './KnowledgeModal'

export function DMControls() {
  const isListening = useIsListening()
  const sceneMode = useSceneMode()
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)

  const handleForceResponse = () => {
    // TODO: Trigger LLM response
    console.log('Force DM response')
  }

  const handleAddKnowledge = () => {
    setShowKnowledgeModal(true)
  }

  const handleSaveCheckpoint = () => {
    // TODO: Save checkpoint
    console.log('Save checkpoint')
  }

  const modeColors = {
    combat: 'text-error',
    exploration: 'text-success',
    rp: 'text-accent'
  }

  const modeLabels = {
    combat: 'Combat',
    exploration: 'Exploration',
    rp: 'Roleplay'
  }

  return (
    <>
      <div className="p-3 bg-surface flex items-center gap-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-success animate-pulse' : 'bg-text-secondary'}`} />
          <span className="text-sm text-text-secondary">
            Listening: <span className={isListening ? 'text-success' : 'text-text-secondary'}>{isListening ? 'ON' : 'OFF'}</span>
          </span>
        </div>

        <div className="w-px h-5 bg-surface-light" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Mode:</span>
          <span className={`text-sm font-medium ${modeColors[sceneMode]}`}>
            {modeLabels[sceneMode]}
          </span>
        </div>

        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleForceResponse}
            className="btn-secondary text-sm"
            title="Force the DM to respond now"
          >
            🎲 Force Response
          </button>
          <button 
            onClick={handleAddKnowledge}
            className="btn-secondary text-sm"
            title="Add campaign knowledge"
          >
            📚 Add Knowledge
          </button>
          <button 
            onClick={handleSaveCheckpoint}
            className="btn-secondary text-sm"
            title="Save a checkpoint"
          >
            💾 Checkpoint
          </button>
        </div>
      </div>

      {showKnowledgeModal && (
        <KnowledgeModal onClose={() => setShowKnowledgeModal(false)} />
      )}
    </>
  )
}
