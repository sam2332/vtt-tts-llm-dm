import { useState } from 'react'
import { useAppStore } from '../store'
import { generateId } from '@shared/utils'
import { DND_SKILLS } from '@shared/types'
import type { CharacterSheet } from '@shared/types'

interface CharacterSheetModalProps {
  character?: CharacterSheet
  onClose: () => void
}

export function CharacterSheetModal({ character, onClose }: CharacterSheetModalProps) {
  const addCharacter = useAppStore((state) => state.addCharacter)
  const updateCharacter = useAppStore((state) => state.updateCharacter)
  const speakers = useAppStore((state) => state.speakers)

  const isEditing = !!character

  const [name, setName] = useState(character?.name || '')
  const [charClass, setCharClass] = useState(character?.class || '')
  const [level, setLevel] = useState(character?.level || 1)
  const [playerId, setPlayerId] = useState(character?.playerId || '')
  const [stats, setStats] = useState(character?.stats || {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
  })
  const [skills, setSkills] = useState<Record<string, boolean>>(
    character?.skills.reduce((acc, s) => ({ ...acc, [s.name]: s.proficient }), {}) || {}
  )
  const [abilities, setAbilities] = useState(character?.abilities.join('\n') || '')
  const [inventory, setInventory] = useState(character?.inventory.join('\n') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    const characterData: CharacterSheet = {
      id: character?.id || generateId(),
      playerId: playerId || null,
      name: name.trim(),
      class: charClass.trim(),
      level,
      stats,
      skills: DND_SKILLS.map(skill => ({
        name: skill,
        proficient: skills[skill] || false
      })),
      abilities: abilities.split('\n').filter(a => a.trim()),
      inventory: inventory.split('\n').filter(i => i.trim())
    }

    if (isEditing) {
      updateCharacter(character.id, characterData)
    } else {
      addCharacter(characterData)
    }

    onClose()
  }

  const updateStat = (stat: keyof typeof stats, value: number) => {
    setStats(prev => ({ ...prev, [stat]: Math.max(1, Math.min(30, value)) }))
  }

  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  const toggleSkill = (skill: string) => {
    setSkills(prev => ({ ...prev, [skill]: !prev[skill] }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-surface rounded-xl w-full max-w-2xl mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-light">
          <h2 className="font-bold text-lg">
            {isEditing ? 'Edit Character' : 'New Character'}
          </h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Character Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elara the Brave"
                className="input-field w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Player</label>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">-- Select Player --</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <input
                type="text"
                value={charClass}
                onChange={(e) => setCharClass(e.target.value)}
                placeholder="Fighter, Wizard, Rogue..."
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Level</label>
              <input
                type="number"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                min={1}
                max={20}
                className="input-field w-full"
              />
            </div>
          </div>

          {/* Stats */}
          <div>
            <label className="block text-sm font-medium mb-2">Ability Scores</label>
            <div className="grid grid-cols-6 gap-2">
              {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                <div key={stat} className="text-center">
                  <div className="text-xs text-text-secondary uppercase mb-1">
                    {stat}
                  </div>
                  <input
                    type="number"
                    value={stats[stat]}
                    onChange={(e) => updateStat(stat, parseInt(e.target.value) || 10)}
                    className="input-field w-full text-center font-bold"
                    min={1}
                    max={30}
                  />
                  <div className="text-xs text-accent mt-1">
                    {getModifier(stats[stat])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium mb-2">Skill Proficiencies</label>
            <div className="grid grid-cols-3 gap-2 bg-surface-light/50 rounded-lg p-3">
              {DND_SKILLS.map(skill => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skills[skill] || false}
                    onChange={() => toggleSkill(skill)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm">{skill}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Abilities & Spells (one per line)
            </label>
            <textarea
              value={abilities}
              onChange={(e) => setAbilities(e.target.value)}
              placeholder="Action Surge&#10;Second Wind&#10;Fighting Style: Defense"
              rows={4}
              className="textarea-field w-full"
            />
          </div>

          {/* Inventory */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Inventory (one per line)
            </label>
            <textarea
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              placeholder="Longsword&#10;Chain Mail&#10;50 gold pieces"
              rows={3}
              className="textarea-field w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={!name.trim()}
            >
              {isEditing ? 'Save Changes' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
