# AI DM Listener - Complete Design Document & Implementation Plan

Thank you for the detailed responses! This is an ambitious and technically sophisticated project. I'll now create your comprehensive design package.

---

# **DESIGN DOCUMENT**

## **Executive Summary**

**Project Name**: AI DM Listener  
**Version**: 1.0  
**Document Status**: Final Requirements  
**Created**: February 2, 2026  
**Platform**: Windows Desktop (Electron)  

**Purpose**: An intelligent dungeon master assistant that listens to live D&D gameplay through a single microphone, identifies individual speakers, maintains campaign context through a RAG knowledge base, and responds as DM through high-quality text-to-speech when appropriate.

**Key Innovation**: Fully local, privacy-first AI system combining speaker diarization, speech recognition, semantic understanding, and LLM-driven storytelling with zero cloud dependencies.

---

## **1. Project Overview**

### **Problem Statement**
Traditional D&D sessions require a human DM to manage world-building, NPC interactions, narrative flow, and player actions. This creates bottlenecks for groups without a dedicated DM and limits play opportunities.

### **Proposed Solution**
An Electron desktop application that:
- Captures audio from a single microphone
- Identifies and labels 4 individual speakers through neural voice analysis
- Transcribes speech to text in real-time using Whisper
- Maintains campaign context through vector embeddings and RAG
- Uses a local LLM to make DM decisions and generate responses
- Outputs narrative through high-quality TTS with multiple NPC voices
- Provides a Discord-like UI for session management

### **Success Metrics**
- Speaker identification accuracy ≥80%
- Transcription latency <3 seconds
- DM response generation <10 seconds
- Session state persistence across restarts
- Zero external API calls (fully local)

---

## **2. System Architecture**

### **High-Level Components**

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON APP                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Frontend   │◄────►│   Backend    │               │
│  │   (React)    │      │   (Node.js)  │               │
│  └──────────────┘      └──────┬───────┘               │
│         │                      │                        │
│         │              ┌───────▼────────┐              │
│         │              │  Audio Pipeline │              │
│         │              │  - Capture      │              │
│         │              │  - VAD          │              │
│         │              │  - Chunking     │              │
│         │              └───────┬────────┘              │
│         │                      │                        │
│         │      ┌───────────────┴─────────────┐         │
│         │      │                             │         │
│         │  ┌───▼────────┐         ┌─────────▼──────┐  │
│         │  │  Speaker    │         │    Whisper     │  │
│         │  │ Diarization │         │      STT       │  │
│         │  │ (Pyannote)  │         │   (local)      │  │
│         │  └───┬────────┘         └─────────┬──────┘  │
│         │      │                             │         │
│         │      └──────────┬──────────────────┘         │
│         │                 │                            │
│         │         ┌───────▼────────┐                   │
│         │         │  Transcript    │                   │
│         │         │  Manager       │                   │
│         │         └───────┬────────┘                   │
│         │                 │                            │
│         │         ┌───────▼────────┐                   │
│         │         │  Intent        │                   │
│         │         │  Detector      │                   │
│         │         │  (Embeddings)  │                   │
│         │         └───────┬────────┘                   │
│         │                 │                            │
│         │         ┌───────▼────────┐                   │
│         │         │   LLM Engine   │◄──────────────┐   │
│         │         │   (Ollama)     │               │   │
│         │         └───────┬────────┘               │   │
│         │                 │                        │   │
│         │         ┌───────▼────────┐      ┌────────┴─┐ │
│         │         │   DM Decision  │      │   RAG    │ │
│         │         │     System     │◄────►│Knowledge │ │
│         │         └───────┬────────┘      │   Base   │ │
│         │                 │                └──────────┘ │
│         │                 │                             │
│         │         ┌───────▼────────┐                    │
│         │         │   TTS Engine   │                    │
│         │         │  (Coqui/Piper) │                    │
│         │         └────────────────┘                    │
│         │                                               │
└─────────┴───────────────────────────────────────────────┘
```

### **Technology Stack**

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Desktop Framework | Electron | Cross-platform, rich UI capabilities, Node.js backend access |
| Frontend | React + TypeScript | Component-based UI, type safety |
| UI Framework | Tailwind CSS + shadcn/ui | Modern Discord-like appearance |
| Audio Capture | node-mic / node-speaker | Native audio I/O for Windows |
| Voice Activity Detection | @ricky0123/vad-node | Efficient speech segmentation |
| Speaker Diarization | Pyannote.audio (Python) | State-of-art speaker identification |
| Speech-to-Text | Whisper (local) | Accurate offline transcription |
| LLM | Ollama (Mistral/Llama) | Local inference, no API costs |
| Embedding Model | sentence-transformers | Semantic search, intent detection |
| Vector Database | ChromaDB | RAG knowledge storage |
| TTS | Coqui TTS / Piper | High-quality, multi-voice synthesis |
| State Management | Zustand | Simple React state management |
| IPC | Electron IPC | Frontend ↔ Backend communication |
| Database | SQLite | Session persistence, character data |

---

## **3. Functional Requirements**

### **FR-001: Audio Capture & Processing**
**Priority**: Critical  
**Description**: Continuously capture audio from system default microphone

**Acceptance Criteria**:
- [ ] Detects and uses default Windows microphone
- [ ] Samples at 16kHz mono (optimized for speech)
- [ ] Implements Voice Activity Detection (VAD) to reduce processing
- [ ] Buffers audio in 2-second chunks for processing
- [ ] Handles microphone disconnection gracefully

**Dependencies**: None

---

### **FR-002: Speaker Diarization**
**Priority**: Critical  
**Description**: Identify which of 4 players is speaking in each audio segment

**Acceptance Criteria**:
- [ ] Pre-session voice enrollment (30-60 seconds per player)
- [ ] Manual labeling interface for first-time speaker identification
- [ ] 80%+ accuracy in speaker classification
- [ ] Confidence score output for each classification
- [ ] Popup alert when confidence <60%
- [ ] Ability to manually override incorrect identifications

**Dependencies**: FR-001

---

### **FR-003: Speech-to-Text Transcription**
**Priority**: Critical  
**Description**: Convert speech to text using local Whisper model

**Acceptance Criteria**:
- [ ] Transcription latency <3 seconds
- [ ] Uses Whisper medium or small model (balance speed/accuracy)
- [ ] Handles D&D-specific vocabulary (character names, spells, locations)
- [ ] Outputs timestamped transcription segments
- [ ] Editable transcriptions in UI

**Dependencies**: FR-001

---

### **FR-004: Speaker Identity Management**
**Priority**: High  
**Description**: Manage speaker profiles with flexible naming

**Acceptance Criteria**:
- [ ] Store voice embeddings per speaker
- [ ] Allow user-defined display names (player name, character name, or both)
- [ ] Persist speaker profiles across sessions
- [ ] Re-enrollment capability if voice model degrades
- [ ] Color-coding assignment (unique color per speaker)

**Dependencies**: FR-002

---

### **FR-005: Intent Detection System**
**Priority**: Critical  
**Description**: Determine when player speech requires DM response

**Acceptance Criteria**:
- [ ] Embedding-based semantic similarity search
- [ ] Detects direct questions to DM
- [ ] Identifies action statements requiring narrative response
- [ ] Recognizes keywords: "I want to roll", "What do I see", "I attack", etc.
- [ ] Configurable trigger threshold
- [ ] Manual "Continue DM" button override

**Dependencies**: FR-003

---

### **FR-006: RAG Knowledge Base**
**Priority**: Critical  
**Description**: Vector database for campaign world-building and context

**Acceptance Criteria**:
- [ ] Stores campaign setting initialization
- [ ] Embeddings for locations, NPCs, plot points, lore
- [ ] Cosine similarity search for relevant context retrieval
- [ ] User can inject new knowledge during session
- [ ] Knowledge versioning/checkpointing
- [ ] Export/import campaign knowledge bases

**Dependencies**: None

---

### **FR-007: LLM Decision Engine**
**Priority**: Critical  
**Description**: Local LLM makes DM decisions with tool use

**Acceptance Criteria**:
- [ ] Two tools available: `tts_respond` and `wait_ignore`
- [ ] Receives context: recent transcription, speaker info, campaign knowledge, character stats
- [ ] Adapts tone based on scene mode (combat/exploration/RP)
- [ ] Generates narrative responses aligned with 5e freeform style
- [ ] Maintains conversation history context window
- [ ] Temperature settings per scene mode

**Dependencies**: FR-003, FR-005, FR-006

---

### **FR-008: Multi-Voice TTS System**
**Priority**: High  
**Description**: Generate speech output with multiple distinct voices

**Acceptance Criteria**:
- [ ] High-quality base DM voice (user chooses male/female)
- [ ] 5+ distinct NPC voices
- [ ] Voice assignment to specific NPCs/characters
- [ ] Adjustable speech rate
- [ ] Audio output queuing (no overlap)
- [ ] Volume normalization

**Dependencies**: FR-007

---

### **FR-009: Scene Mode Management**
**Priority**: Medium  
**Description**: Track and adapt to different gameplay modes

**Acceptance Criteria**:
- [ ] Three modes: Combat, Exploration, RP
- [ ] Manual mode switching via UI
- [ ] Auto-detection based on keywords (optional)
- [ ] Different LLM prompt templates per mode:
  - Combat: Short, tactical descriptions
  - Exploration: Broad, atmospheric narration
  - RP: Close-up, character-focused dialogue
- [ ] Visual indicator of current mode

**Dependencies**: FR-007

---

### **FR-010: Character Sheet Viewer**
**Priority**: Medium  
**Description**: Display player character stats and abilities

**Acceptance Criteria**:
- [ ] Input fields for D&D 5e stats (STR, DEX, CON, INT, WIS, CHA)
- [ ] Skills list with proficiency markers
- [ ] Abilities/spells text area
- [ ] Simple inventory list
- [ ] Visible to DM LLM for decision-making
- [ ] Editable during session

**Dependencies**: None

---

### **FR-011: Initiative Tracker**
**Priority**: Medium  
**Description**: Combat turn order management

**Acceptance Criteria**:
- [ ] Manual initiative value input per character
- [ ] Drag-and-drop reordering
- [ ] "Current turn" highlight
- [ ] Next turn button
- [ ] Add/remove combatants
- [ ] Only active during Combat mode

**Dependencies**: FR-009

---

### **FR-012: Session Persistence**
**Priority**: High  
**Description**: Auto-save and resume campaign state

**Acceptance Criteria**:
- [ ] Auto-save every 5 minutes
- [ ] Save on app close
- [ ] Restore on app launch
- [ ] Saves: transcripts, speaker profiles, campaign knowledge, character sheets, scene mode
- [ ] Manual checkpoint creation
- [ ] Load from specific checkpoint

**Dependencies**: All core features

---

### **FR-013: Discord-like Chat UI**
**Priority**: High  
**Description**: Threaded conversation display

**Acceptance Criteria**:
- [ ] Scrollable message feed
- [ ] Color-coded by speaker
- [ ] Avatar/icon per speaker
- [ ] Timestamp per message
- [ ] DM messages visually distinct (different styling)
- [ ] Auto-scroll to latest (with manual scroll lock)
- [ ] Search/filter functionality

**Dependencies**: FR-003, FR-004

---

### **FR-014: DM Control Panel**
**Priority**: Medium  
**Description**: Manual controls for DM oversight

**Acceptance Criteria**:
- [ ] Pause/Resume listening button
- [ ] "Force DM Response" button
- [ ] Speaker ID correction dropdown
- [ ] Transcript edit mode
- [ ] Knowledge injection text input
- [ ] Save checkpoint button
- [ ] Session reset/new campaign

**Dependencies**: All core features

---

### **FR-015: Overlapping Speech Detection**
**Priority**: Low  
**Description**: Handle multiple simultaneous speakers

**Acceptance Criteria**:
- [ ] Detect when multiple speakers overlap
- [ ] Display as "[Multiple speakers]" in transcript
- [ ] No attempt to transcribe overlapping portions
- [ ] Visual warning in UI

**Dependencies**: FR-002

---

## **4. Non-Functional Requirements**

### **NFR-001: Performance**
- Audio processing latency: <3 seconds end-to-end
- LLM response generation: <10 seconds
- UI responsiveness: 60fps
- Memory usage: <4GB RAM
- CPU usage: <50% on modern quad-core

### **NFR-002: Privacy**
- Zero network calls except optional LLM model downloads
- All data stored locally
- No telemetry or analytics
- User data encrypted at rest (optional feature)

### **NFR-003: Reliability**
- Graceful degradation if microphone unavailable
- Automatic recovery from LLM inference errors
- Session state recovery after crash
- Model fallback if primary fails to load

### **NFR-004: Usability**
- Onboarding wizard for first launch
- Tooltips and help text throughout UI
- Keyboard shortcuts for common actions
- One-click model installation

### **NFR-005: Maintainability**
- Modular architecture (replaceable components)
- Comprehensive logging
- Version-controlled model configurations
- Clear separation of concerns

---

## **5. Data Models**

### **Speaker Profile**
```typescript
interface SpeakerProfile {
  id: string;
  displayName: string; // e.g., "Alice (Elara the Elf)"
  voiceEmbedding: Float32Array; // Neural voice fingerprint
  colorCode: string; // Hex color for UI
  enrollmentDate: Date;
  accuracy: number; // Running average
}
```

### **TranscriptSegment**
```typescript
interface TranscriptSegment {
  id: string;
  speakerId: string;
  text: string;
  timestamp: Date;
  confidence: number;
  edited: boolean;
  embedding?: Float32Array; // For semantic search
}
```

### **CampaignKnowledge**
```typescript
interface KnowledgeEntry {
  id: string;
  category: 'location' | 'npc' | 'plot' | 'lore' | 'item';
  title: string;
  content: string;
  embedding: Float32Array;
  tags: string[];
  createdAt: Date;
  source: 'user_input' | 'dm_generated';
}
```

### **CharacterSheet**
```typescript
interface CharacterSheet {
  id: string;
  playerId: string;
  name: string;
  class: string;
  level: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  skills: Array<{name: string; proficient: boolean}>;
  abilities: string[]; // Freeform text
  inventory: string[]; // Simple list
}
```

### **SessionState**
```typescript
interface SessionState {
  id: string;
  campaignName: string;
  currentScene: string;
  sceneMode: 'combat' | 'exploration' | 'rp';
  transcript: TranscriptSegment[];
  speakers: SpeakerProfile[];
  characters: CharacterSheet[];
  initiative: Array<{name: string; value: number}>;
  knowledge: KnowledgeEntry[];
  checkpoints: Checkpoint[];
  lastSaved: Date;
}
```

---

## **6. System Workflows**

### **Workflow 1: Session Initialization**

```
1. User launches app
2. If existing campaign → Load saved state
3. If new campaign:
   a. Create campaign name
   b. Upload/paste campaign setting brief
   c. Generate embeddings for knowledge base
   d. Speaker enrollment wizard
      - Play prompt: "Please introduce yourself"
      - Record 30-60 seconds per player
      - Extract voice embedding
      - Assign display name and color
   e. Create/import character sheets
4. System ready → Green indicator
```

### **Workflow 2: Real-Time Gameplay Loop**

```
┌─── Continuous Audio Capture ◄────────────────┐
│                                              │
├─► VAD Detection                              │
│    ├─► Speech detected? ───No──┐            │
│    └─► Yes                      │            │
│         │                       │            │
│         ├─► Speaker Diarization │            │
│         │    ├─► Confidence >60%? ─No─► Popup Alert
│         │    └─► Yes                         │
│         │         │                          │
│         ├─► Whisper Transcription            │
│         │    └─► Generate embedding          │
│         │                                    │
│         ├─► Intent Detection                 │
│         │    ├─► Trigger detected? ──No─────┤
│         │    └─► Yes                         │
│         │         │                          │
│         └─► LLM Decision Engine              │
│              ├─► Retrieve campaign context (RAG)
│              ├─► Retrieve character stats    │
│              ├─► Apply scene mode template   │
│              ├─► Generate response           │
│              └─► Tool selection              │
│                   ├─► tts_respond → TTS Engine → Audio Out
│                   └─► wait_ignore → (Silent) │
│                                              │
└──────────────────────────────────────────────┘
```

### **Workflow 3: Knowledge Injection**

```
1. DM clicks "Add Knowledge" button
2. Modal appears with form:
   - Category dropdown
   - Title field
   - Content textarea
   - Tags (comma-separated)
3. User submits
4. System generates embedding
5. Stores in ChromaDB
6. Available immediately for RAG retrieval
```

### **Workflow 4: Combat Mode**

```
1. User clicks "Start Combat" or LLM detects initiative roll
2. Initiative tracker appears
3. Players manually enter initiative values
4. System sorts combatants
5. Scene mode switches to "Combat"
6. LLM uses combat prompt template (short, tactical)
7. Current turn highlighted
8. User clicks "Next Turn" to advance
9. Exit combat → Return to previous mode
```

---

## **7. Technical Specifications**

### **Audio Pipeline**

**Input Format**: 16kHz, mono, 16-bit PCM  
**Chunk Size**: 2 seconds (32,000 samples)  
**VAD Model**: Silero VAD (fast, accurate)  
**Processing Queue**: FIFO with max 10 chunks (20 seconds buffer)

### **Speaker Diarization**

**Model**: Pyannote.audio 3.1 (segmentation + embedding)  
**Approach**: 
1. Voice enrollment creates reference embeddings (512-dim)
2. Runtime: Extract embedding from each speech segment
3. Cosine similarity vs. 4 reference embeddings
4. Argmax for speaker ID, confidence = max similarity score

**Confidence Threshold**:
- >80%: Auto-assign
- 60-80%: Assign with caution marker
- <60%: Popup for manual labeling

**Improvement Loop**: Correctly identified segments added to reference embedding pool (running average)

### **Whisper Configuration**

**Model Size**: `base.en` (74M params, 16GB RAM, ~1s latency)  
**Alternative**: `small.en` (244M params, better accuracy, ~2s latency)  
**Fine-tuning**: Custom vocabulary file for D&D terms  
**Beam Size**: 5  
**Language**: English only

### **Embedding Model**

**Model**: `all-MiniLM-L6-v2` (sentence-transformers)  
**Dimensions**: 384  
**Use Cases**:
- Intent detection (compare user input to trigger phrases)
- Knowledge base retrieval (semantic search)
- Transcript analysis

### **LLM Configuration**

**Model**: Mistral 7B Instruct (or Llama 3 8B)  
**Quantization**: Q4_K_M (4-bit, balance speed/quality)  
**Context Window**: 4096 tokens  
**Temperature by Mode**:
- Combat: 0.7 (focused)
- Exploration: 0.9 (creative)
- RP: 0.8 (character-driven)

**System Prompt Template**:
```
You are the Dungeon Master for a D&D 5e campaign. You have two tools:
- tts_respond(text): Speak narration/dialogue to players
- wait_ignore(): Remain silent

Context:
- Current Scene: {scene_description}
- Mode: {combat|exploration|rp}
- Recent Transcript: {last_5_messages}
- Active NPCs: {npc_list}
- Character Stats: {player_stats}

Respond in freeform narrative style. Be concise in combat, detailed in exploration, intimate in RP.
```

**Tool Definitions**:
```json
{
  "tools": [
    {
      "name": "tts_respond",
      "description": "Speak to the players as DM",
      "parameters": {
        "text": "string (narration or NPC dialogue)",
        "npc_voice": "string (optional, NPC name for voice selection)"
      }
    },
    {
      "name": "wait_ignore",
      "description": "Do not respond, wait for more player input"
    }
  ]
}
```

### **TTS System**

**Option 1: Coqui TTS** (VITS-based, high quality)  
**Option 2: Piper** (Lightweight, fast)

**Voice Bank**:
- Base DM voice: User selects from 4 presets (2 male, 2 female)
- NPC voices: 10 preset variations (pitch/speed modifications)
- Voice assignment UI: Map NPC names to voice IDs

**Audio Specs**: 22kHz, mono, MP3 compression  
**Queue**: FIFO, prevents overlapping speech

### **Vector Database**

**ChromaDB Configuration**:
```python
client = chromadb.PersistentClient(path="./campaign_db")
collection = client.create_collection(
    name="campaign_knowledge",
    embedding_function=SentenceTransformerEmbeddings(),
    metadata={"hnsw:space": "cosine"}
)
```

**Retrieval**: Top-5 results, min similarity 0.7

---

## **8. UI Design Specifications**

### **Layout Structure**

```
┌────────────────────────────────────────────────────────┐
│  🎲 AI DM Listener    [Pause] [Combat] [Save] [Help]  │ <- Top Bar
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────┐  ┌─────────────────────┐  ┌─────────┐ │
│  │  Speaker   │  │   Chat Transcript   │  │ Character│ │
│  │  Profiles  │  │                     │  │  Sheets  │ │
│  │            │  │  [Alice] I search   │  │          │ │
│  │  🔴 Alice  │  │   the room          │  │  Elara   │ │
│  │  🔵 Bob    │  │                     │  │  Level 5 │ │
│  │  🟢 Carol  │  │  [DM] You find a    │  │  STR: 14 │ │
│  │  🟡 Dave   │  │   hidden door       │  │  DEX: 18 │ │
│  │            │  │                     │  │  ...     │ │
│  │            │  │  [Bob] I open it    │  │          │ │
│  │            │  │                     │  │  [Edit]  │ │
│  └────────────┘  └─────────────────────┘  └─────────┘ │
│                                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Initiative Tracker  (Combat Mode Only)           │ │
│  │  1. Alice (17) ← Current Turn                      │ │
│  │  2. Goblin Chief (15)                              │ │
│  │  3. Bob (12)                                       │ │
│  │  [Next Turn]                                       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  DM Controls                                       │ │
│  │  [Force Response] [Add Knowledge] [Checkpoint]    │ │
│  │  Listening: 🟢 ON  |  Mode: Exploration           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### **Color Scheme** (Dark Mode)
- Background: #1e1e2e
- Surface: #2a2a3c
- Text Primary: #cdd6f4
- Text Secondary: #bac2de
- Accent: #89b4fa (blue)
- DM Messages: #f9e2af (gold/yellow tint)
- Error/Alert: #f38ba8 (red)

### **Speaker Color Assignments**
Auto-assigned from palette:
- `#e74c3c` (red)
- `#3498db` (blue)
- `#2ecc71` (green)
- `#f39c12` (orange)

### **Component Specifications**

**Chat Message Component**:
```tsx
<div className="message">
  <div className="avatar" style={{backgroundColor: speakerColor}}>
    {speakerInitial}
  </div>
  <div className="content">
    <div className="header">
      <span className="name">{speakerName}</span>
      <span className="timestamp">{time}</span>
      {confidence < 60 && <WarningIcon />}
    </div>
    <div className="text">{transcriptText}</div>
  </div>
</div>
```

**Modal for Low Confidence**:
```
┌─────────────────────────────────┐
│  Speaker Identification         │
│                                 │
│  Confidence: 45%                │
│  Detected: Bob (?)              │
│                                 │
│  Who is actually speaking?      │
│  ( ) Alice                      │
│  (•) Bob                        │
│  ( ) Carol                      │
│  ( ) Dave                       │
│                                 │
│       [Confirm]  [Cancel]       │
└─────────────────────────────────┘
```

---

## **9. Implementation Phases**

### **Phase 1: Foundation (Weeks 1-2)**
- Set up Electron + React boilerplate
- Implement basic UI layout
- SQLite database setup
- State management (Zustand)

### **Phase 2: Audio Pipeline (Weeks 2-4)**
- Microphone capture
- VAD integration
- Audio chunking and buffering
- Python bridge for Pyannote/Whisper

### **Phase 3: Speaker Diarization (Weeks 4-6)**
- Pyannote.audio integration
- Voice enrollment wizard
- Embedding extraction & storage
- Speaker classification engine
- Confidence scoring & alerts

### **Phase 4: Transcription (Week 6)**
- Whisper model integration
- Custom vocabulary for D&D terms
- Real-time transcription display
- Transcript editing functionality

### **Phase 5: LLM Integration (Weeks 7-8)**
- Ollama setup & model management
- LLM prompt engineering
- Tool use implementation
- Context assembly from multiple sources

### **Phase 6: RAG Knowledge Base (Weeks 8-9)**
- ChromaDB setup
- Embedding generation pipeline
- Knowledge injection UI
- Semantic search & retrieval

### **Phase 7: TTS System (Week 10)**
- Coqui/Piper integration
- Voice bank creation
- NPC voice mapping
- Audio queue management

### **Phase 8: Game Features (Weeks 11-12)**
- Character sheet manager
- Initiative tracker
- Scene mode switching
- Dice roll display (passive listening)

### **Phase 9: Session Persistence (Week 13)**
- Auto-save system
- Checkpoint creation
- State restoration
- Export/import campaign data

### **Phase 10: Polish & Testing (Weeks 14-16)**
- Bug fixes
- Performance optimization
- Onboarding wizard
- Documentation
- User testing with real D&D sessions

**Total Estimated Time**: 16 weeks (4 months) for solo developer

---

## **10. Risk Assessment & Mitigation**

### **Risk 1: Speaker Diarization Accuracy Below 80%**
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Implement adaptive enrollment (continuous learning)
- Allow manual corrections that retrain the model
- Use longer enrollment samples (60+ seconds)
- Add background noise filtering

### **Risk 2: LLM Response Latency >10 Seconds**
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Use smaller quantized models (Q4_K_M)
- Limit context window to recent history only
- Parallel processing where possible
- GPU acceleration if available

### **Risk 3: High RAM Usage (>4GB)**
**Probability**: High  
**Impact**: Low  
**Mitigation**:
- Use smaller Whisper model (base vs small)
- Unload TTS models when not in use
- Limit vector DB in-memory cache
- Periodic garbage collection

### **Risk 4: TTS Voice Quality Insufficient**
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Test multiple TTS engines (Coqui, Piper, Tortoise)
- Allow user voice uploads/customization
- Provide quality vs speed toggle

### **Risk 5: Python-Node Integration Complexity**
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Use zerorpc or Flask for IPC
- Containerize Python services
- Robust error handling & logging
- Alternative: Rust bindings for critical paths

### **Risk 6: Model Download/Installation Friction**
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- One-click model installer in UI
- Progress bars for downloads
- Bundle smallest viable models with app
- Clear error messages & troubleshooting

---

## **11. Testing Strategy**

### **Unit Testing**
- Audio processing functions
- Speaker classification algorithm
- Embedding generation
- LLM tool parsing

### **Integration Testing**
- End-to-end audio → transcript → LLM → TTS flow
- Database CRUD operations
- IPC between Electron processes
- Python service communication

### **User Acceptance Testing**
- Real D&D session (4 players, 2+ hours)
- Speaker ID accuracy measurement
- Latency profiling
- User feedback on DM quality

### **Performance Testing**
- Stress test with 6-hour session
- Memory leak detection
- CPU profiling under load
- Concurrent model inference

---

# **TASK BREAKDOWN**

Now I'll create a detailed, actionable task list...

---

## **TASK LIST FOR IMPLEMENTATION**

### **Setup & Configuration Tasks**

#### **TASK-001: Project Initialization**
**Priority**: 1  
**Estimated Effort**: 4 hours  
**Assigned to**: Secondary AI Agent  

**Description**:
Set up the base Electron application with React, TypeScript, and Tailwind CSS.

**Prerequisites**: None

**Deliverables**:
- [ ] Electron app running with hot reload
- [ ] React + TypeScript configured
- [ ] Tailwind CSS + shadcn/ui installed
- [ ] Basic window management (minimize, maximize, close)
- [ ] Dark mode enabled by default

**Technical Notes**:
- Use `electron-vite` for fast builds
- Configure `tsconfig.json` for strict mode
- Set up ESLint + Prettier

**Resources**:
- Electron docs: https://www.electronjs.org/docs/latest/
- Vite Electron plugin: https://github.com/electron-vite/electron-vite-vue

---

#### **TASK-002: State Management Setup**
**Priority**: 1  
**Estimated Effort**: 3 hours  

**Description**:
Implement Zustand for global state management and define core state slices.

**Prerequisites**: TASK-001

**Deliverables**:
- [ ] Zustand store configured
- [ ] State slices: `sessionState`, `speakers`, `transcript`, `characters`, `knowledge`
- [ ] Persist middleware for auto-save
- [ ] DevTools integration

**Acceptance Criteria**:
- State updates trigger React re-renders
- Persisted state survives app restart

---

#### **TASK-003: SQLite Database Setup**
**Priority**: 1  
**Estimated Effort**: 4 hours  

**Description**:
Set up SQLite database for persistent storage with migrations.

**Prerequisites**: TASK-001

**Deliverables**:
- [ ] `better-sqlite3` installed and configured
- [ ] Database schema created (speakers, transcripts, characters, knowledge, sessions)
- [ ] Migration system (knex.js or custom)
- [ ] CRUD helpers for each table

**Schema Tables**:
```sql
CREATE TABLE speakers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  voice_embedding BLOB,
  color_code TEXT,
  enrollment_date DATETIME,
  accuracy REAL
);

CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  speaker_id TEXT,
  text TEXT,
  timestamp DATETIME,
  confidence REAL,
  edited BOOLEAN,
  embedding BLOB
);

-- Additional tables: characters, knowledge, sessions, checkpoints
```

---

### **Audio Pipeline Tasks**

#### **TASK-004: Microphone Capture**
**Priority**: 1  
**Estimated Effort**: 6 hours  

**Description**:
Implement real-time audio capture from system default microphone.

**Prerequisites**: TASK-001

**Deliverables**:
- [ ] `node-mic` or `audio-recorder-polyfill` integrated
- [ ] Capture at 16kHz mono
- [ ] Audio stream available to other components
- [ ] Pause/resume functionality
- [ ] Graceful handling of device disconnection

**Technical Notes**:
- Use Web Audio API for browser compatibility
- Implement ring buffer for continuous capture

---

#### **TASK-005: Voice Activity Detection**
**Priority**: 1  
**Estimated Effort**: 5 hours  

**Description**:
Integrate VAD to detect speech vs silence and reduce processing load.

**Prerequisites**: TASK-004

**Deliverables**:
- [ ] `@ricky0123/vad-node` or Silero VAD integrated
- [ ] Configurable sensitivity threshold
- [ ] Speech segment detection
- [ ] Non-speech audio discarded

**Acceptance Criteria**:
- Detects speech within 300ms
- False positive rate <5%

---

#### **TASK-006: Audio Chunking System**
**Priority**: 1  
**Estimated Effort**: 4 hours  

**Description**:
Buffer audio into 2-second chunks for processing.

**Prerequisites**: TASK-005

**Deliverables**:
- [ ] Chunk audio stream into 2-second segments
- [ ] FIFO queue with max 10 chunks
- [ ] Chunk metadata (timestamp, duration)
- [ ] Pass chunks to downstream processors

---

### **Speaker Diarization Tasks**

#### **TASK-007: Python Service Bridge**
**Priority**: 1  
**Estimated Effort**: 8 hours  

**Description**:
Create Python microservice for Pyannote and Whisper, communicable from Electron.

**Prerequisites**: TASK-001

**Deliverables**:
- [ ] Flask API with endpoints: `/enroll`, `/diarize`, `/transcribe`
- [ ] JSON request/response format
- [ ] Error handling and logging
- [ ] Auto-start with Electron app
- [ ] Health check endpoint

**Technical Notes**:
- Use `child_process` in Node to spawn Python server
- Alternative: zerorpc for better IPC

**Endpoints**:
```python
POST /enroll
{
  "speaker_id": "alice",
  "audio_data": "<base64>"
}
→ {"embedding": [0.123, ...], "success": true}

POST /diarize
{
  "audio_data": "<base64>",
  "reference_embeddings": {"alice": [...], "bob": [...]}
}
→ {"speaker_id": "alice", "confidence": 0.87}
```

---

#### **TASK-008: Pyannote.audio Integration**
**Priority**: 1  
**Estimated Effort**: 10 hours  

**Description**:
Implement speaker diarization using Pyannote.audio.

**Prerequisites**: TASK-007

**Deliverables**:
- [ ] Pyannote 3.1 installed
- [ ] Voice embedding extraction (512-dim)
- [ ] Cosine similarity comparison
- [ ] Speaker classification with confidence score
- [ ] Reference embedding storage

**Acceptance Criteria**:
- Enrollment creates stable embeddings
- Runtime classification <500ms per 2-second chunk

**Technical Notes**:
```python
from pyannote.audio import Model
from pyannote.audio.pipelines import SpeakerDiarization

model = Model.from_pretrained("pyannote/embedding")
embedding = model(audio_waveform)
```

---

#### **TASK-009: Voice Enrollment Wizard UI**
**Priority**: 2  
**Estimated Effort**: 6 hours  

**Description**:
Create multi-step wizard for enrolling player voices.

**Prerequisites**: TASK-008

**Deliverables**:
- [ ] Step-by-step enrollment flow (4 players)
- [ ] Audio recording indicator (30-60 seconds)
- [ ] Display name input
- [ ] Color picker for speaker
- [ ] Store embeddings in database
- [ ] Skip/retry options

**UI Flow**:
```
Step 1/4: Alice
"Please speak for 30-60 seconds. Introduce your character!"
[Recording... 45s] [🔴 Stop]
Display Name: [Alice (Elara)] Color: [🔴]
[Next]
```

---

#### **TASK-010: Speaker Confidence Alerts**
**Priority**: 2  
**Estimated Effort**: 4 hours  

**Description**:
Implement popup modal for low-confidence speaker identifications.

**Prerequisites**: TASK-008, TASK-009

**Deliverables**:
- [ ] Modal appears when confidence <60%
- [ ] Radio buttons for manual speaker selection
- [ ] "Confirm" updates speaker ID
- [ ] Adds corrected segment to reference embeddings
- [ ] Dismissed popups logged

---

### **Transcription Tasks**

#### **TASK-011: Whisper Model Integration**
**Priority**: 1  
**Estimated Effort**: 8 hours  

**Description**:
Integrate Whisper for local speech-to-text transcription.

**Prerequisites**: TASK-007

**Deliverables**:
- [ ] Whisper `base.en` model downloaded
- [ ] `/transcribe` endpoint in Python service
- [ ] Custom vocabulary for D&D terms
- [ ] Timestamped word-level output
- [ ] Handles 2-second audio chunks

**Technical Notes**:
```python
import whisper

model = whisper.load_model("base.en")
result = model.transcribe(
    audio_chunk,
    initial_prompt="D&D fantasy terms: Elara, Baldur's Gate, Fireball spell"
)
```

**Acceptance Criteria**:
- Latency <2 seconds per chunk
- Accuracy >85% on general speech

---

#### **TASK-012: Transcript Display Component**
**Priority**: 2  
**Estimated Effort**: 6 hours  

**Description**:
Create Discord-like chat UI for displaying transcripts.

**Prerequisites**: TASK-003, TASK-011

**Deliverables**:
- [ ] Scrollable message feed
- [ ] Color-coded messages by speaker
- [ ] Avatar with speaker initial
- [ ] Timestamp per message
- [ ] Auto-scroll to bottom
- [ ] Search/filter functionality

**Component Structure**:
```tsx
<TranscriptFeed>
  <Message 
    speaker={speaker}
    text={text}
    time={timestamp}
    confidence={conf}
  />
</TranscriptFeed>
```

---

#### **TASK-013: Transcript Editing**
**Priority**: 3  
**Estimated Effort**: 5 hours  

**Description**:
Allow manual editing of transcriptions.

**Prerequisites**: TASK-012

**Deliverables**:
- [ ] Click to edit mode
- [ ] Inline text editor
- [ ] Save edited transcript to DB
- [ ] Mark as edited (visual indicator)
- [ ] Re-generate embedding if edited

---

### **LLM Integration Tasks**

#### **TASK-014: Ollama Setup & Model Management**
**Priority**: 1  
**Estimated Effort**: 6 hours  

**Description**:
Install Ollama, download models, create API client.

**Prerequisites**: TASK-001

**Deliverables**:
- [ ] Ollama installed (bundled or user-installed)
- [ ] Download Mistral 7B Instruct (Q4_K_M)
- [ ] Node.js Ollama client configured
- [ ] Model health check
- [ ] One-click model downloader in UI

**Technical Notes**:
```typescript
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });
const response = await ollama.chat({
  model: 'mistral:7b-instruct-q4_K_M',
  messages: [...],
  tools: [...]
});
```

---

#### **TASK-015: Intent Detection System**
**Priority**: 1  
**Estimated Effort**: 8 hours  

**Description**:
Implement embedding-based intent detection to trigger DM responses.

**Prerequisites**: TASK-011

**Deliverables**:
- [ ] `sentence-transformers` integrated in Python service
- [ ] Endpoint: `/detect_intent`
- [ ] Predefined trigger embeddings (questions, actions, keywords)
- [ ] Cosine similarity threshold (configurable)
- [ ] Returns: `should_respond: boolean`

**Trigger Phrases** (generate embeddings):
- "What do I see?"
- "I want to roll perception"
- "I attack the goblin"
- "Is there anything in the room?"
- "I search for traps"
- (20+ examples)

**Logic**:
```python
user_embedding = embed(transcript_text)
similarities = cosine_similarity(user_embedding, trigger_embeddings)
should_respond = max(similarities) > 0.75
```

---

#### **TASK-016: LLM Prompt Engineering**
**Priority**: 1  
**Estimated Effort**: 10 hours  

**Description**:
Design and test system prompts for each scene mode.

**Prerequisites**: TASK-014

**Deliverables**:
- [ ] System prompt templates (combat, exploration, RP)
- [ ] Tool definitions (tts_respond, wait_ignore)
- [ ] Context assembly function (recent transcript + knowledge + stats)
- [ ] Response parsing & validation

**System Prompt** (Exploration mode example):
```
You are an experienced Dungeon Master running a D&D 5e campaign in freeform narrative style.

CURRENT SCENE: {scene_description}
MODE: Exploration (describe environments broadly, encourage player curiosity)

RECENT CONVERSATION:
{last_10_transcript_segments}

RELEVANT CAMPAIGN KNOWLEDGE:
{rag_retrieved_context}

PLAYER CHARACTERS:
{character_stats_summary}

You have two tools:
1. tts_respond(text, npc_voice=null): Speak narration or NPC dialogue
2. wait_ignore(): Remain silent and wait for more player input

Respond with atmospheric descriptions. Ask clarifying questions if player intent is unclear.
```

**Testing**:
- Unit tests for prompt rendering
- Manual testing with sample scenarios

---

#### **TASK-017: Tool Use Implementation**
**Priority**: 1  
**Estimated Effort**: 6 hours  

**Description**:
Parse LLM tool calls and execute TTS or ignore actions.

**Prerequisites**: TASK-016

**Deliverables**:
- [ ] Tool call parser
- [ ] Route `tts_respond` to TTS engine
- [ ] Handle `wait_ignore` gracefully
- [ ] Log all tool calls
- [ ] Error handling for malformed calls

**Parsing Logic**:
```typescript
const toolCall = parseToolCall(llmResponse);
if (toolCall.name === 'tts_respond') {
  await synthesizeSpeech(toolCall.params.text, toolCall.params.npc_voice);
} else {
  // Silent, wait for next input
}
```

---

### **RAG Knowledge Base Tasks**

#### **TASK-018: ChromaDB Setup**
**Priority**: 1  
**Estimated Effort**: 5 hours  

**Description**:
Set up ChromaDB for campaign knowledge storage.

**Prerequisites**: TASK-007

**Deliverables**:
- [ ] ChromaDB installed in Python service
- [ ] Collection created: `campaign_knowledge`
- [ ] Endpoints: `/add_knowledge`, `/search_knowledge`
- [ ] Persistence to disk

**API**:
```python
POST /add_knowledge
{
  "category": "npc",
  "title": "Thorgrim the Blacksmith",
  "content": "Gruff dwarf who runs the forge...",
  "tags": ["ally", "shop"]
}

POST /search_knowledge
{
  "query": "Who can repair my sword?"
}
→ {results: [{title, content, similarity}]}
```

---

#### **TASK-019: Knowledge Injection UI**
**Priority**: 2  
**Estimated Effort**: 5 hours  

**Description**:
Create UI for adding campaign knowledge during session.

**Prerequisites**: TASK-018

**Deliverables**:
- [ ] "Add Knowledge" button in DM controls
- [ ] Modal with form (category, title, content, tags)
- [ ] Submit → stores in ChromaDB
- [ ] Display confirmation toast
- [ ] Knowledge list viewer

**Form Fields**:
- Category: dropdown (location, NPC, plot, lore, item)
- Title: text input
- Content: textarea (rich text optional)
- Tags: comma-separated text input

---

#### **TASK-020: RAG Context Retrieval**
**Priority**: 1  
**Estimated Effort**: 6 hours  

**Description**:
Integrate knowledge base retrieval into LLM context assembly.

**Prerequisites**: TASK-018, TASK-016

**Deliverables**:
- [ ] Query ChromaDB with player input
- [ ] Retrieve top-5 relevant knowledge entries
- [ ] Inject into system prompt
- [ ] Cache recent retrievals (avoid redundant searches)

**Logic**:
```typescript
const userQuery = lastTranscriptSegment.text;
const knowledgeResults = await searchKnowledge(userQuery);
const context = knowledgeResults.map(r => r.content).join('\n\n');
// Append to system prompt
```

---

### **TTS System Tasks**

#### **TASK-021: TTS Engine Integration**
**Priority**: 2  
**Estimated Effort**: 10 hours  

**Description**:
Integrate Coqui TTS or Piper for high-quality speech synthesis.

**Prerequisites**: TASK-007

**Deliverables**:
- [ ] Coqui TTS installed (or Piper as fallback)
- [ ] Base DM voice models (2 male, 2 female)
- [ ] Endpoint: `/synthesize_speech`
- [ ] Returns: audio file (WAV or MP3)
- [ ] Voice selection parameter

**Technical Notes**:
```python
from TTS.api import TTS

tts = TTS(model_name="tts_models/en/ljspeech/vits")
tts.tts_to_file(text="Welcome to the dungeon", file_path="output.wav")
```

**Acceptance Criteria**:
- Audio quality: natural, clear
- Latency: <5 seconds for 50-word response

---

#### **TASK-022: NPC Voice Bank**
**Priority**: 3  
**Estimated Effort**: 8 hours  

**Description**:
Create multiple distinct NPC voices through pitch/speed variations.

**Prerequisites**: TASK-021

**Deliverables**:
- [ ] 10 voice presets (combinations of pitch, speed, model)
- [ ] Voice assignment UI (map NPC name → voice ID)
- [ ] Store assignments in database
- [ ] Preview voice samples

**Voice Variations**:
- Deep male (pitch -20%, speed 0.9x)
- High female (pitch +15%, speed 1.1x)
- Elderly (speed 0.8x, add tremolo)
- Child (pitch +30%, speed 1.2x)
- etc.

---

#### **TASK-023: Audio Queue & Playback**
**Priority**: 2  
**Estimated Effort**: 5 hours  

**Description**:
Manage TTS audio output queue to prevent overlapping speech.

**Prerequisites**: TASK-021

**Deliverables**:
- [ ] FIFO queue for audio files
- [ ] Play one at a time
- [ ] Volume normalization
- [ ] Stop/skip controls in UI
- [ ] Visual indicator (waveform or speaker icon)

---

### **Game Features Tasks**

#### **TASK-024: Character Sheet Manager**
**Priority**: 2  
**Estimated Effort**: 8 hours  

**Description**:
Create UI for inputting and editing character sheets.

**Prerequisites**: TASK-003

**Deliverables**:
- [ ] Character sheet form (name, class, level, stats, skills, abilities, inventory)
- [ ] One sheet per player (linked to speaker ID)
- [ ] Display in sidebar panel
- [ ] Save to database
- [ ] Export/import JSON

**Form Layout**:
```
Name: [________]  Class: [_____] Level: [__]
STR: [__] DEX: [__] CON: [__]
INT: [__] WIS: [__] CHA: [__]

Skills:
☑ Acrobatics  ☐ Animal Handling ...

Abilities:
[Textarea for freeform abilities/spells]

Inventory:
- Sword
- 50 gold pieces
[+ Add Item]
```

---

#### **TASK-025: Initiative Tracker**
**Priority**: 2  
**Estimated Effort**: 6 hours  

**Description**:
Combat initiative tracker with manual input and turn management.

**Prerequisites**: TASK-003

**Deliverables**:
- [ ] Initiative list (sortable)
- [ ] Manual value input per combatant
- [ ] "Current Turn" highlight
- [ ] "Next Turn" button
- [ ] Add/remove combatants
- [ ] Only visible in Combat mode

**UI**:
```
Initiative Tracker
1. Alice (17) ← Current Turn
2. Goblin Chief (15)
3. Bob (12)
4. Carol (8)

[Next Turn] [End Combat]
```

---

#### **TASK-026: Scene Mode Switching**
**Priority**: 2  
**Estimated Effort**: 4 hours  

**Description**:
UI and logic for switching between Combat, Exploration, RP modes.

**Prerequisites**: TASK-016

**Deliverables**:
- [ ] Mode selector buttons (top bar)
- [ ] Visual indicator of current mode
- [ ] Change LLM temperature & prompt template on switch
- [ ] Save mode in session state

**Modes**:
- Combat: Red icon, short prompts
- Exploration: Green icon, broad descriptions
- RP: Blue icon, character-focused

---

### **Session Persistence Tasks**

#### **TASK-027: Auto-Save System**
**Priority**: 2  
**Estimated Effort**: 6 hours  

**Description**:
Implement periodic auto-save of session state.

**Prerequisites**: TASK-003, All core features

**Deliverables**:
- [ ] Save every 5 minutes (configurable)
- [ ] Save on app close
- [ ] Serialize state to SQLite
- [ ] Include: transcript, speakers, knowledge, characters, scene mode
- [ ] Toast notification on save

**State Serialization**:
```typescript
const sessionSnapshot = {
  id: sessionId,
  timestamp: Date.now(),
  transcript: zustandStore.transcript,
  speakers: zustandStore.speakers,
  characters: zustandStore.characters,
  sceneMode: zustandStore.sceneMode,
  // ...
};
saveToDatabase(sessionSnapshot);
```

---

#### **TASK-028: Checkpoint System**
**Priority**: 3  
**Estimated Effort**: 5 hours  

**Description**:
Manual checkpoint creation and loading.

**Prerequisites**: TASK-027

**Deliverables**:
- [ ] "Save Checkpoint" button
- [ ] Checkpoint name input
- [ ] List of checkpoints
- [ ] Load checkpoint → restores full state
- [ ] Confirm before overwriting current session

---

#### **TASK-029: Campaign Export/Import**
**Priority**: 3  
**Estimated Effort**: 6 hours  

**Description**:
Export campaign data to JSON for sharing or backup.

**Prerequisites**: TASK-027

**Deliverables**:
- [ ] Export button → downloads JSON file
- [ ] Import button → loads JSON and recreates state
- [ ] Include: knowledge base, characters, speaker profiles (no voice embeddings)
- [ ] Validation on import

---

### **Polish & UX Tasks**

#### **TASK-030: Onboarding Wizard**
**Priority**: 2  
**Estimated Effort**: 8 hours  

**Description**:
First-run wizard for campaign setup.

**Prerequisites**: All core features

**Deliverables**:
- [ ] Welcome screen
- [ ] Campaign name input
- [ ] Campaign setting upload/paste
- [ ] Speaker enrollment flow
- [ ] Model download/verification
- [ ] Tutorial tooltips

**Flow**:
```
1. Welcome to AI DM Listener
2. Name your campaign
3. Describe your world (paste setting info)
4. Enroll players (voice training)
5. Download models (if missing)
6. Ready to play!
```

---

#### **TASK-031: Help & Documentation**
**Priority**: 3  
**Estimated Effort**: 6 hours  

**Description**:
In-app help system and user guide.

**Prerequisites**: All features complete

**Deliverables**:
- [ ] Help button in top bar
- [ ] Modal with tabbed sections (Getting Started, Troubleshooting, FAQ)
- [ ] Tooltips on hover for UI elements
- [ ] External link to full documentation

---

#### **TASK-032: Error Handling & Logging**
**Priority**: 2  
**Estimated Effort**: 8 hours  

**Description**:
Comprehensive error handling and logging system.

**Prerequisites**: All core features

**Deliverables**:
- [ ] Try-catch blocks in all async operations
- [ ] User-friendly error messages (toasts)
- [ ] Log file output (`app.log`)
- [ ] Log levels: debug, info, warn, error
- [ ] Report generation for troubleshooting

**Error Scenarios**:
- Microphone not found
- Python service crash
- Model loading failure
- LLM timeout
- Database corruption

---

#### **TASK-033: Performance Optimization**
**Priority**: 3  
**Estimated Effort**: 10 hours  

**Description**:
Profile and optimize system performance.

**Prerequisites**: All features complete

**Deliverables**:
- [ ] CPU profiling (identify bottlenecks)
- [ ] Memory leak detection
- [ ] Reduce Whisper latency (model caching)
- [ ] Optimize React re-renders (memoization)
- [ ] Database query optimization

**Targets**:
- <3 seconds transcription latency
- <50% CPU usage
- <4GB RAM

---

#### **TASK-034: UI Polish**
**Priority**: 3  
**Estimated Effort**: 8 hours  

**Description**:
Final UI refinements for professional appearance.

**Prerequisites**: All features complete

**Deliverables**:
- [ ] Consistent spacing and alignment
- [ ] Smooth animations (transitions, fades)
- [ ] Loading spinners for async operations
- [ ] Icon set (consistent style)
- [ ] Responsive layout (different window sizes)

---

### **Testing Tasks**

#### **TASK-035: Integration Testing**
**Priority**: 2  
**Estimated Effort**: 10 hours  

**Description**:
End-to-end testing of complete workflow.

**Prerequisites**: All features complete

**Deliverables**:
- [ ] Test: Audio capture → Transcript → LLM → TTS
- [ ] Test: Speaker enrollment → Classification
- [ ] Test: Knowledge injection → RAG retrieval
- [ ] Test: Session save/restore
- [ ] Automated test suite (Jest/Vitest)

---

#### **TASK-036: User Acceptance Testing**
**Priority**: 1  
**Estimated Effort**: 16 hours (includes test session)  

**Description**:
Conduct real D&D session with 4 players.

**Prerequisites**: TASK-035

**Deliverables**:
- [ ] Recruit 4 test players
- [ ] Run 2-4 hour session
- [ ] Measure speaker ID accuracy
- [ ] Measure latency at each stage
- [ ] Collect user feedback
- [ ] Document bugs and improvements

**Success Criteria**:
- ≥80% speaker accuracy
- <5 seconds average DM response time
- Players rate experience 7/10 or higher

---

## **TASK DEPENDENCIES MATRIX**

```
TASK-001 (Foundation)
├── TASK-002 (State Mgmt)
├── TASK-003 (Database)
├── TASK-004 (Mic Capture)
│   ├── TASK-005 (VAD)
│   │   └── TASK-006 (Chunking)
├── TASK-007 (Python Bridge)
│   ├── TASK-008 (Pyannote)
│   │   ├── TASK-009 (Enrollment UI)
│   │   └── TASK-010 (Confidence Alerts)
│   ├── TASK-011 (Whisper)
│   │   ├── TASK-012 (Transcript UI)
│   │   └── TASK-013 (Editing)
│   │   └── TASK-015 (Intent Detection)
│   ├── TASK-018 (ChromaDB)
│   │   ├── TASK-019 (Knowledge UI)
│   │   └── TASK-020 (RAG Retrieval)
│   └── TASK-021 (TTS)
│       ├── TASK-022 (NPC Voices)
│       └── TASK-023 (Audio Queue)
├── TASK-014 (Ollama)
│   ├── TASK-016 (Prompts)
│   │   └── TASK-017 (Tool Use)
├── TASK-024 (Character Sheets)
├── TASK-025 (Initiative)
├── TASK-026 (Scene Modes)
├── TASK-027 (Auto-Save)
│   ├── TASK-028 (Checkpoints)
│   └── TASK-029 (Export/Import)
├── TASK-030 (Onboarding)
├── TASK-031 (Help)
├── TASK-032 (Error Handling)
├── TASK-033 (Optimization)
├── TASK-034 (UI Polish)
├── TASK-035 (Integration Tests)
└── TASK-036 (UAT)
```

---

## **CRITICAL PATH TASKS** (Must complete for MVP)

1. TASK-001: Project Init
2. TASK-004: Mic Capture
3. TASK-005: VAD
4. TASK-006: Chunking
5. TASK-007: Python Bridge
6. TASK-008: Pyannote Diarization
7. TASK-011: Whisper Transcription
8. TASK-014: Ollama Setup
9. TASK-015: Intent Detection
10. TASK-016: LLM Prompts
11. TASK-017: Tool Use
12. TASK-018: ChromaDB
13. TASK-020: RAG Retrieval
14. TASK-021: TTS Integration
15. TASK-036: User Testing

**Total Critical Path Effort**: ~120 hours (~3 weeks full-time)

---

## **NICE-TO-HAVE TASKS** (Can defer to v1.1)

- TASK-022: NPC Voice Bank (can start with single voice)
- TASK-025: Initiative Tracker (manual tracking in chat)
- TASK-028: Checkpoints (auto-save sufficient for MVP)
- TASK-029: Export/Import (low priority initially)
- TASK-031: Help docs (can be external)
- TASK-034: UI Polish (functional > beautiful for MVP)

---

## **RESOURCE REQUIREMENTS**

### **Development Hardware**
- CPU: 8-core minimum (for parallel Whisper + LLM inference)
- RAM: 16GB (32GB recommended)
- Storage: 20GB for models
- GPU: Optional but recommended (NVIDIA for CUDA acceleration)

### **External Dependencies**
- Python 3.10+
- Node.js 18+
- Ollama (bundled or user-installed)
- FFmpeg (for audio conversion)

### **Model Downloads** (~10GB total)
- Whisper base.en: ~140MB
- Pyannote speaker embedding: ~17MB
- Mistral 7B Q4: ~4GB
- Coqui TTS models: ~100MB each

---

## **ESTIMATED TOTAL EFFORT**

| Phase | Tasks | Hours |
|-------|-------|-------|
| Foundation | 1-3 | 11 |
| Audio Pipeline | 4-6 | 15 |
| Speaker Diarization | 7-10 | 28 |
| Transcription | 11-13 | 19 |
| LLM Integration | 14-17 | 30 |
| RAG Knowledge Base | 18-20 | 16 |
| TTS System | 21-23 | 23 |
| Game Features | 24-26 | 18 |
| Session Persistence | 27-29 | 17 |
| Polish & UX | 30-34 | 40 |
| Testing | 35-36 | 26 |
| **TOTAL** | **36 tasks** | **243 hours** |

**Timeline**: 6-8 weeks for experienced developer working full-time  
**Or**: 12-16 weeks part-time (20 hrs/week)

---

# **CONCLUSION**

You now have:

1. ✅ **Comprehensive Design Document** covering architecture, requirements, workflows, and technical specifications
2. ✅ **36 Detailed Tasks** with clear deliverables, acceptance criteria, and dependencies
3. ✅ **Risk Assessment** with mitigation strategies
4. ✅ **Resource Requirements** and timeline estimates

## **Next Steps**

1. **Review & Validate**: Read through the design doc and confirm it matches your vision
2. **Prioritize**: Decide if you want to build MVP (critical path only) or full feature set
3. **Environment Setup**: Prepare development machine, install base dependencies
4. **Begin Phase 1**: Start with TASK-001 (Project Init)
5. **Iterate**: Build in phases, test incrementally, adjust design as needed

## **Questions to Consider**

- Do you have a preferred TTS engine? (Coqui vs Piper vs alternatives)
- Should the app support GPU acceleration from the start?
- Do you want to bundle models with the app or download on-demand?
- Any specific D&D campaign setting in mind for testing?

I'm ready to dive deeper into any specific task, create code scaffolds, or refine any aspect of the design. What would you like to tackle first?