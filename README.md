# AI DM Listener

An intelligent D&D Dungeon Master assistant that listens to your tabletop sessions, identifies players by voice, transcribes gameplay, and responds as the DM through natural text-to-speech.

![Electron](https://img.shields.io/badge/Electron-40-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)

## Features

- 🎤 **Real-time Speech Recognition** - Transcribes player speech using OpenAI Whisper
- 👥 **Speaker Identification** - Recognizes individual players using Pyannote.audio voice embeddings
- 🧠 **Intelligent DM Responses** - Uses local LLM (Mistral via Ollama) for contextual responses
- 🗣️ **Text-to-Speech** - Responds as the DM with natural voice synthesis (Coqui TTS)
- 📚 **Campaign Knowledge** - Stores and retrieves campaign lore using ChromaDB embeddings
- ⚔️ **Combat Support** - Initiative tracking and scene mode switching
- 💾 **Session Management** - Auto-saves progress with checkpoint support

## Prerequisites

Before running the app, ensure you have:

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Python 3.10+** - [Download](https://www.python.org/)
3. **Ollama** - [Download](https://ollama.ai/)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ai-dm-listener.git
cd ai-dm-listener

# Install Node dependencies
npm install

# Rebuild native modules for Electron
npx @electron/rebuild -f -w better-sqlite3
```

### 2. Setup Python Environment

```bash
cd python

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Pyannote (Required for Speaker ID)

Pyannote.audio requires a HuggingFace token:

1. Create account at [huggingface.co](https://huggingface.co/)
2. Accept the model terms at [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
3. Create an access token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. Set the token in your environment:

```bash
# Windows PowerShell
$env:HUGGINGFACE_TOKEN = "your_token_here"

# Windows CMD
set HUGGINGFACE_TOKEN=your_token_here

# macOS/Linux
export HUGGINGFACE_TOKEN="your_token_here"
```

### 4. Setup Ollama LLM

```bash
# Install Ollama from https://ollama.ai/

# Pull the recommended model
ollama pull mistral:7b-instruct-q4_K_M

# Start Ollama server (runs on port 11434)
ollama serve
```

### 5. Run the App

```bash
# Development mode
npm run dev

# Or build for production
npm run build
npm run start
```

## Project Structure

```
ai-dm-listener/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry, IPC handlers
│   │   ├── database.ts # SQLite database
│   │   ├── pythonService.ts  # Python bridge
│   │   ├── audioCapture.ts   # Audio processing
│   │   └── ollamaService.ts  # LLM integration
│   ├── preload/        # Electron preload scripts
│   ├── renderer/       # React frontend
│   │   └── src/
│   │       ├── components/  # UI components
│   │       ├── hooks/       # Custom React hooks
│   │       └── store/       # Zustand state
│   └── shared/         # Shared types
├── python/             # Python ML services
│   ├── service.py      # Flask API server
│   └── requirements.txt
└── DEsign-Document.md  # Full design specification
```

## Tech Stack

### Frontend
- **Electron 40** - Desktop app framework
- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Tailwind CSS 4** - Styling
- **Zustand 5** - State management

### Backend (Electron Main Process)
- **better-sqlite3** - Database
- **Ollama API** - Local LLM

### Python ML Service
- **Flask** - API server
- **OpenAI Whisper** - Speech-to-text
- **Pyannote.audio** - Speaker diarization
- **ChromaDB** - Vector embeddings
- **Coqui TTS** - Text-to-speech

## Configuration

Access settings via the ⚙️ button in the top bar:

| Setting | Description | Default |
|---------|-------------|---------|
| Whisper Model | Speech recognition accuracy | `base` |
| LLM Model | Local language model | `mistral:7b-instruct-q4_K_M` |
| Temperature | Creativity per scene mode | Combat: 0.7, Explore: 0.9, RP: 0.8 |
| Confidence Threshold | Speaker ID confirmation | 60% |
| Intent Threshold | DM response trigger | 75% |
| Auto-save | Session backup interval | 5 min |

## Usage

### Starting a Session

1. Launch the app
2. Complete the onboarding wizard (campaign name, speaker enrollment)
3. Click **Start** to begin listening

### Enrolling Speakers

Each player records a 10-second voice sample for identification:

1. Click **+ Add Speaker** in the left panel
2. Enter the player's name
3. Click **Record** and have them speak naturally for 10 seconds
4. The voice embedding is saved for future recognition

### Scene Modes

Switch modes to adjust DM behavior:

- ⚔️ **Combat** - Quick tactical responses, initiative tracking
- 🗺️ **Exploration** - Environmental descriptions, discovery
- 🎭 **Roleplay** - NPC voices, dialogue-focused

### Adding Knowledge

Feed the DM context about your campaign:

1. Click **📚 Knowledge** button
2. Add entries for NPCs, locations, plot points, etc.
3. The AI uses this context for relevant responses

## Development

```bash
# Run with hot reload
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Package for distribution
npm run package
```

## Troubleshooting

### Python service not starting
- Ensure Python 3.10+ is in your PATH
- Check that all pip dependencies installed correctly
- Verify HuggingFace token is set for Pyannote

### Ollama connection failed
- Run `ollama serve` to start the server
- Ensure it's running on port 11434
- Pull the model: `ollama pull mistral:7b-instruct-q4_K_M`

### better-sqlite3 error
```bash
npx @electron/rebuild -f -w better-sqlite3
```

### No audio capture
- Check microphone permissions in system settings
- Ensure the correct audio device is selected

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Pyannote.audio](https://github.com/pyannote/pyannote-audio) - Speaker diarization
- [Ollama](https://ollama.ai/) - Local LLM inference
- [Coqui TTS](https://github.com/coqui-ai/TTS) - Text-to-speech
