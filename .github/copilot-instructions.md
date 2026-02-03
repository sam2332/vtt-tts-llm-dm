# AI DM Listener - Copilot Instructions

## Architecture Overview

This is an Electron + React + Python hybrid desktop app for D&D dungeon mastering with real-time speech recognition and AI responses.

**Three-layer architecture:**
1. **Renderer (React/TypeScript)** - UI in `src/renderer/src/` using Zustand for state
2. **Main (Electron/Node.js)** - Backend in `src/main/` orchestrating services
3. **Python Flask Service** - ML backend in `python/service.py` (port 5000)

**Data flow:**
```
Microphone → Renderer → IPC → Main → Python Service (Whisper/Pyannote)
                                  ↓
                              Ollama LLM → Python TTS → Audio Output
```

## Key Patterns

### IPC Communication
All renderer↔main communication uses Electron IPC via preload bridge:
- Define handlers in `src/main/*.ts` using `ipcMain.handle('channel', handler)`
- Expose in `src/preload/index.ts` via `contextBridge.exposeInMainWorld`
- Access in renderer via `window.electronAPI.methodName()`
- Type declarations in `src/renderer/src/electron.d.ts`

### State Management
Zustand store at `src/renderer/src/store/appStore.ts`:
- Persisted to localStorage via `persist` middleware
- Access pattern: `const value = useAppStore((state) => state.value)`
- All actions defined in store interface, not external functions

### Shared Types
Canonical types live in `src/shared/types.ts` - import as `@shared/types` via path alias.
Key interfaces: `SpeakerProfile`, `TranscriptSegment`, `KnowledgeEntry`, `CharacterSheet`, `SessionState`

### Python Service Pattern
`src/main/pythonService.ts` spawns Python process and communicates via HTTP REST:
- Lazy-loads ML models (Whisper, Pyannote, ChromaDB, TTS) on first use
- Health check at `/health` - always verify before calling other endpoints
- Returns base64-encoded audio data for TTS responses

## Development Commands

```bash
npm run dev        # Start Electron + Vite dev server (hot reload)
npm run build      # Production build
npm run typecheck  # TypeScript validation
npx @electron/rebuild -f -w better-sqlite3  # After npm install (native module)
```

**Python setup (required for ML features):**
```bash
cd python && python -m venv venv && .\venv\Scripts\activate
pip install -r requirements.txt
# Requires: HUGGINGFACE_TOKEN env var for Pyannote speaker diarization
```

**External dependencies (must run locally):**
- Ollama on port 11434: `ollama serve` (pull `mistral:7b-instruct-q4_K_M`)
- FFmpeg in PATH for audio processing

## Project-Specific Conventions

### Component Structure
Components in `src/renderer/src/components/` - each is self-contained, no nested folders.
Modal naming: `*Modal.tsx` (e.g., `CharacterSheetModal.tsx`, `ConfirmSpeakerModal.tsx`)

### Database Schema
SQLite via better-sqlite3 at `src/main/database.ts`. Tables: `speakers`, `sessions`, `transcripts`, `characters`, `knowledge`. WAL mode enabled.

### Scene Modes
Three modes affect LLM temperature: `'combat' | 'exploration' | 'rp'` (defined in `SceneMode` type).
Combat: 0.7 temp, Exploration: 0.9, RP: 0.8

### Path Aliases
```
@shared/* → src/shared/*
@main/*   → src/main/*
@renderer/* → src/renderer/*
```

## Critical Files

- [src/main/index.ts](src/main/index.ts) - Main process entry, audio pipeline orchestration
- [src/main/pythonService.ts](src/main/pythonService.ts) - Python ML service bridge
- [src/main/ollamaService.ts](src/main/ollamaService.ts) - LLM integration with tool-use prompts
- [src/preload/index.ts](src/preload/index.ts) - IPC API surface definition
- [src/renderer/src/store/appStore.ts](src/renderer/src/store/appStore.ts) - All app state
- [python/service.py](python/service.py) - Flask endpoints for Whisper/Pyannote/ChromaDB/TTS
