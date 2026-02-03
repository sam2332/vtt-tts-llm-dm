import { useState, useEffect } from 'react'
import { useIsListening, useSceneMode, useAppStore } from '../store'
import { KnowledgeModal } from './KnowledgeModal'

export function DMControls() {
  const isListening = useIsListening()
  const sceneMode = useSceneMode()
  const setSceneMode = useAppStore((state) => state.setSceneMode)
  const characters = useAppStore((state) => state.characters)
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)
  const [isForcing, setIsForcing] = useState(false)

  // Sync scene mode with main process when it changes
  useEffect(() => {
    window.electronAPI?.setSceneMode(sceneMode)
  }, [sceneMode])

  // Sync character stats with main process when characters change
  useEffect(() => {
    if (characters.length > 0) {
      const statsText = characters.map(c => 
        `${c.name} (${c.class} Lv${c.level}): STR ${c.stats.str}, DEX ${c.stats.dex}, CON ${c.stats.con}, INT ${c.stats.int}, WIS ${c.stats.wis}, CHA ${c.stats.cha}`
      ).join('\n')
      window.electronAPI?.setCharacterStats(statsText)
    }
  }, [characters])

  const handleForceResponse = async () => {
    if (isForcing) return
    setIsForcing(true)
    try {
      const result = await window.electronAPI?.forceDMResponse()
      if (!result?.success && result?.error) {
        console.error('Force response failed:', result.error)
      }
    } catch (error) {
      console.error('Force DM response error:', error)
    } finally {
      setIsForcing(false)
    }
  }

  const handleModeChange = (mode: 'combat' | 'exploration' | 'rp') => {
    setSceneMode(mode)
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
          <div className="flex gap-1">
            {(['combat', 'exploration', 'rp'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sceneMode === mode 
                    ? `${modeColors[mode]} bg-surface-light font-medium` 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleForceResponse}
            disabled={isForcing}
            className={`btn-secondary text-sm ${isForcing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Force the DM to respond now"
          >
            {isForcing ? '⏳ Generating...' : '🎲 Force Response'}
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
