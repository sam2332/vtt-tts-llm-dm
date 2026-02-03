import { useState } from 'react'
import { useInitiative, useAppStore, useCharacters, useSpeakers } from '../store'
import { generateId } from '@shared/utils'
import type { InitiativeEntry } from '@shared/types'

export function InitiativeTracker() {
  const initiative = useInitiative()
  const characters = useCharacters()
  const speakers = useSpeakers()
  const currentTurnIndex = useAppStore((state) => state.currentTurnIndex)
  const nextTurn = useAppStore((state) => state.nextTurn)
  const resetCombat = useAppStore((state) => state.resetCombat)
  const setSceneMode = useAppStore((state) => state.setSceneMode)
  const addToInitiative = useAppStore((state) => state.addToInitiative)
  const removeFromInitiative = useAppStore((state) => state.removeFromInitiative)
  const setInitiative = useAppStore((state) => state.setInitiative)

  const [showAddModal, setShowAddModal] = useState(false)
  const [combatantName, setCombatantName] = useState('')
  const [initiativeValue, setInitiativeValue] = useState(10)
  const [isPlayer, setIsPlayer] = useState(true)

  const handleEndCombat = () => {
    if (confirm('End combat and clear initiative?')) {
      resetCombat()
      setSceneMode('exploration')
    }
  }

  const handleAddCombatant = () => {
    if (!combatantName.trim()) return

    const entry: InitiativeEntry = {
      id: generateId(),
      name: combatantName.trim(),
      value: initiativeValue,
      isPlayer
    }

    addToInitiative(entry)
    setCombatantName('')
    setInitiativeValue(10)
    setShowAddModal(false)
  }

  const handleRemoveCombatant = (id: string) => {
    removeFromInitiative(id)
  }

  const handleRollAll = () => {
    // Roll initiative for all characters
    const newEntries: InitiativeEntry[] = characters.map(char => ({
      id: generateId(),
      name: char.name,
      value: Math.floor(Math.random() * 20) + 1 + Math.floor((char.stats.dex - 10) / 2),
      isPlayer: true,
      speakerId: char.playerId || undefined
    }))
    setInitiative(newEntries)
  }

  const handleQuickAdd = (name: string, isPlayerChar: boolean) => {
    const dexMod = 0 // Default, could look up from character
    const roll = Math.floor(Math.random() * 20) + 1 + dexMod
    
    addToInitiative({
      id: generateId(),
      name,
      value: roll,
      isPlayer: isPlayerChar
    })
  }

  return (
    <div className="p-3 bg-surface">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-error flex items-center gap-2">
          ⚔️ Initiative Tracker
        </h3>
        <div className="flex gap-2">
          {initiative.length > 0 && (
            <button onClick={nextTurn} className="btn-secondary text-sm py-1">
              Next Turn →
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary text-sm py-1"
          >
            + Add
          </button>
          {initiative.length > 0 && (
            <button onClick={handleEndCombat} className="btn-danger text-sm py-1">
              End Combat
            </button>
          )}
        </div>
      </div>

      {initiative.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 py-2">
          <p className="text-sm text-text-secondary">
            No combatants.
          </p>
          {characters.length > 0 && (
            <button 
              className="text-sm text-accent hover:underline"
              onClick={handleRollAll}
            >
              🎲 Roll for all players
            </button>
          )}
          <span className="text-text-secondary">|</span>
          <button 
            className="text-sm text-accent hover:underline"
            onClick={() => setShowAddModal(true)}
          >
            + Add manually
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {initiative.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all flex-shrink-0 group ${
                index === currentTurnIndex
                  ? 'bg-error/20 border-error'
                  : entry.isPlayer 
                    ? 'bg-surface-light border-transparent'
                    : 'bg-red-900/20 border-red-800/30'
              }`}
            >
              <span className="font-bold text-sm text-text-secondary w-6 text-center">
                {entry.value}
              </span>
              <span className={`text-sm ${index === currentTurnIndex ? 'font-bold' : ''}`}>
                {entry.name}
              </span>
              {!entry.isPlayer && (
                <span className="text-xs text-red-400">👹</span>
              )}
              {index === currentTurnIndex && (
                <span className="text-xs text-error animate-pulse">◀</span>
              )}
              <button 
                className="text-xs opacity-0 group-hover:opacity-100 text-text-secondary hover:text-error transition-all"
                onClick={() => handleRemoveCombatant(entry.id)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Combatant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-4 w-96 shadow-xl animate-fade-in">
            <h3 className="font-bold mb-4">Add Combatant</h3>
            
            {/* Quick add from existing */}
            {(characters.length > 0 || speakers.length > 0) && (
              <div className="mb-4">
                <p className="text-xs text-text-secondary mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {characters.map(char => (
                    <button
                      key={char.id}
                      className="btn-secondary text-xs py-1"
                      onClick={() => {
                        handleQuickAdd(char.name, true)
                        setShowAddModal(false)
                      }}
                    >
                      {char.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t border-surface-light pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={combatantName}
                  onChange={(e) => setCombatantName(e.target.value)}
                  placeholder="Goblin, Orc Warchief..."
                  className="input-field w-full"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Initiative</label>
                  <input
                    type="number"
                    value={initiativeValue}
                    onChange={(e) => setInitiativeValue(parseInt(e.target.value) || 0)}
                    className="input-field w-full"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select 
                    value={isPlayer ? 'player' : 'enemy'}
                    onChange={(e) => setIsPlayer(e.target.value === 'player')}
                    className="input-field w-full"
                  >
                    <option value="player">Player/Ally</option>
                    <option value="enemy">Enemy</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button 
                className="btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddCombatant}
                disabled={!combatantName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
