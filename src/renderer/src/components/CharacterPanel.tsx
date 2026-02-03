import { useCharacters } from '../store'

export function CharacterPanel() {
  const characters = useCharacters()

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-surface-light">
        <h2 className="font-bold text-sm">Character Sheets</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {characters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm mb-3">No characters yet</p>
            <button className="btn-secondary text-sm">
              + Add Character
            </button>
          </div>
        ) : (
          characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))
        )}

        {characters.length > 0 && (
          <button className="w-full py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light rounded-lg transition-colors">
            + Add Character
          </button>
        )}
      </div>
    </div>
  )
}

function CharacterCard({ character }: { character: ReturnType<typeof useCharacters>[0] }) {
  const statLabels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
  const statValues = [
    character.stats.str,
    character.stats.dex,
    character.stats.con,
    character.stats.int,
    character.stats.wis,
    character.stats.cha
  ]

  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm">{character.name}</h3>
          <p className="text-xs text-text-secondary">
            Level {character.level} {character.class}
          </p>
        </div>
        <button className="btn-icon text-xs">✏️</button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        {statLabels.map((label, i) => (
          <div key={label} className="text-center">
            <div className="text-xs text-text-secondary">{label}</div>
            <div className="font-bold text-sm">{statValues[i]}</div>
            <div className="text-xs text-accent">{getModifier(statValues[i])}</div>
          </div>
        ))}
      </div>

      {/* Skills (compact) */}
      {character.skills.filter(s => s.proficient).length > 0 && (
        <div className="border-t border-surface-light pt-2">
          <p className="text-xs text-text-secondary mb-1">Proficiencies:</p>
          <p className="text-xs">
            {character.skills
              .filter(s => s.proficient)
              .map(s => s.name)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
