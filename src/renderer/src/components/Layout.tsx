import { TopBar } from './TopBar'
import { SpeakerPanel } from './SpeakerPanel'
import { TranscriptFeed } from './TranscriptFeed'
import { CharacterPanel } from './CharacterPanel'
import { InitiativeTracker } from './InitiativeTracker'
import { DMControls } from './DMControls'
import { KnowledgePanel } from './KnowledgePanel'
import { useAppStore, useSceneMode } from '../store'

export function Layout() {
  const sceneMode = useSceneMode()
  const sidebarTab = useAppStore((state) => state.sidebarTab)

  return (
    <div className="h-screen flex flex-col bg-background text-text-primary">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Speaker Profiles */}
        <aside className="w-64 bg-surface border-r border-surface-light flex flex-col">
          <div className="p-3 border-b border-surface-light">
            <div className="flex gap-1">
              <TabButton 
                active={sidebarTab === 'speakers'} 
                onClick={() => useAppStore.getState().setSidebarTab('speakers')}
              >
                Speakers
              </TabButton>
              <TabButton 
                active={sidebarTab === 'knowledge'} 
                onClick={() => useAppStore.getState().setSidebarTab('knowledge')}
              >
                Knowledge
              </TabButton>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'speakers' && <SpeakerPanel />}
            {sidebarTab === 'knowledge' && <KnowledgePanel />}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <TranscriptFeed />
        </main>

        {/* Right Sidebar - Character Sheets */}
        <aside className="w-72 bg-surface border-l border-surface-light flex flex-col">
          <CharacterPanel />
        </aside>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-surface-light">
        {/* Initiative Tracker (only visible in combat mode) */}
        {sceneMode === 'combat' && (
          <div className="border-b border-surface-light">
            <InitiativeTracker />
          </div>
        )}
        
        {/* DM Controls */}
        <DMControls />
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active 
          ? 'bg-accent text-background' 
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
      }`}
    >
      {children}
    </button>
  )
}
