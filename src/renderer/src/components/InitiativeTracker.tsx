import { useInitiative, useAppStore } from '../store'

export function InitiativeTracker() {
  const initiative = useInitiative()
  const currentTurnIndex = useAppStore((state) => state.currentTurnIndex)
  const nextTurn = useAppStore((state) => state.nextTurn)
  const resetCombat = useAppStore((state) => state.resetCombat)
  const setSceneMode = useAppStore((state) => state.setSceneMode)

  const handleEndCombat = () => {
    resetCombat()
    setSceneMode('exploration')
  }

  return (
    <div className="p-3 bg-surface">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-error flex items-center gap-2">
          ⚔️ Initiative Tracker
        </h3>
        <div className="flex gap-2">
          <button onClick={nextTurn} className="btn-secondary text-sm py-1">
            Next Turn →
          </button>
          <button onClick={handleEndCombat} className="btn-danger text-sm py-1">
            End Combat
          </button>
        </div>
      </div>

      {initiative.length === 0 ? (
        <div className="flex items-center gap-4 py-2">
          <p className="text-sm text-text-secondary">
            No combatants. Add characters to initiative.
          </p>
          <button className="text-sm text-accent hover:underline">
            + Add Combatant
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {initiative.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all flex-shrink-0 ${
                index === currentTurnIndex
                  ? 'bg-error/20 border-error'
                  : 'bg-surface-light border-transparent'
              }`}
            >
              <span className="font-bold text-sm text-text-secondary">
                {entry.value}
              </span>
              <span className={`text-sm ${index === currentTurnIndex ? 'font-bold' : ''}`}>
                {entry.name}
              </span>
              {index === currentTurnIndex && (
                <span className="text-xs text-error">← Current</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
