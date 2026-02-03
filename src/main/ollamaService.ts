/**
 * Ollama LLM Service
 * Handles communication with local Ollama for DM responses
 */

import { ipcMain } from 'electron'

interface OllamaConfig {
  host: string
  model: string
  temperature: {
    combat: number
    exploration: number
    rp: number
  }
}

const DEFAULT_CONFIG: OllamaConfig = {
  host: 'http://localhost:11434',
  model: 'mistral:7b-instruct-q4_K_M',
  temperature: {
    combat: 0.7,
    exploration: 0.9,
    rp: 0.8
  }
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

interface LLMContext {
  sceneMode: 'combat' | 'exploration' | 'rp'
  sceneDescription: string
  recentTranscript: Array<{ speaker: string; text: string }>
  relevantKnowledge: string[]
  characterStats: string
  activeNPCs: string[]
}

class OllamaService {
  private config: OllamaConfig
  private conversationHistory: Message[] = []

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Check if Ollama is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.host}/api/version`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.host}/api/tags`)
      const data = await response.json()
      return data.models?.map((m: { name: string }) => m.name) || []
    } catch {
      return []
    }
  }

  /**
   * Build the system prompt based on context
   */
  private buildSystemPrompt(context: LLMContext): string {
    const modeDescriptions = {
      combat: 'Combat mode - Be tactical, concise, and action-focused. Describe attacks, damage, and combat outcomes briefly.',
      exploration: 'Exploration mode - Be descriptive and atmospheric. Paint vivid pictures of environments and encourage curiosity.',
      rp: 'Roleplay mode - Be character-driven and intimate. Focus on NPC personalities, emotions, and dialogue.'
    }

    return `You are an experienced Dungeon Master running a D&D 5e campaign in freeform narrative style.

CURRENT SCENE: ${context.sceneDescription}
MODE: ${modeDescriptions[context.sceneMode]}

RECENT CONVERSATION:
${context.recentTranscript.map(t => `[${t.speaker}]: ${t.text}`).join('\n')}

RELEVANT CAMPAIGN KNOWLEDGE:
${context.relevantKnowledge.join('\n\n')}

PLAYER CHARACTERS:
${context.characterStats}

ACTIVE NPCs: ${context.activeNPCs.join(', ') || 'None specified'}

You have two tools available:
1. tts_respond(text, npc_voice?): Speak narration or NPC dialogue to the players
2. wait_ignore(): Remain silent and wait for more player input

Guidelines:
- Only respond when players ask questions, declare actions, or need DM narration
- In combat: Keep responses under 2 sentences unless describing significant events
- In exploration: Describe environments with sensory details
- In RP: Give NPCs distinct personalities and speech patterns
- Never break character or mention game mechanics unless players ask about rules
- If unsure what players want, ask a clarifying question through tts_respond`
  }

  /**
   * Define the tools for the LLM
   */
  private getTools(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'tts_respond',
          description: 'Speak narration or NPC dialogue to the players through text-to-speech',
          parameters: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The narration or dialogue to speak'
              },
              npc_voice: {
                type: 'string',
                description: 'Optional: The name of an NPC whose voice to use'
              }
            },
            required: ['text']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'wait_ignore',
          description: 'Remain silent and wait for more player input. Use when players are discussing among themselves or when no DM response is needed.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ]
  }

  /**
   * Generate DM response based on context
   */
  async generateResponse(context: LLMContext): Promise<{
    action: 'respond' | 'wait'
    text?: string
    npcVoice?: string
  }> {
    const systemPrompt = this.buildSystemPrompt(context)
    const temperature = this.config.temperature[context.sceneMode]

    // Build the last player message
    const lastMessage = context.recentTranscript[context.recentTranscript.length - 1]
    const userContent = lastMessage 
      ? `[${lastMessage.speaker}]: ${lastMessage.text}` 
      : 'Players are waiting for your response.'

    try {
      const response = await fetch(`${this.config.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-10), // Keep last 10 messages
            { role: 'user', content: userContent }
          ],
          tools: this.getTools(),
          options: {
            temperature,
            num_ctx: 4096
          },
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Parse tool call from response
      const message = data.message
      
      // Add to history
      this.conversationHistory.push({ role: 'user', content: userContent })
      this.conversationHistory.push({ role: 'assistant', content: message.content || '' })

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0]
        const functionName = toolCall.function.name
        const args = toolCall.function.arguments

        if (functionName === 'tts_respond') {
          return {
            action: 'respond',
            text: args.text,
            npcVoice: args.npc_voice
          }
        } else if (functionName === 'wait_ignore') {
          return { action: 'wait' }
        }
      }

      // Fallback: if no tool call, use the message content as response
      if (message.content && message.content.trim()) {
        return {
          action: 'respond',
          text: message.content.trim()
        }
      }

      return { action: 'wait' }

    } catch (error) {
      console.error('LLM generation error:', error)
      throw error
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = []
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.config.model = model
  }
}

// Singleton instance
let ollamaService: OllamaService | null = null

export function getOllamaService(): OllamaService {
  if (!ollamaService) {
    ollamaService = new OllamaService()
  }
  return ollamaService
}

/**
 * Set up IPC handlers for LLM operations
 */
export function setupLLMIPC(): void {
  const ollama = getOllamaService()

  ipcMain.handle('llm-check-health', async () => {
    return ollama.checkHealth()
  })

  ipcMain.handle('llm-list-models', async () => {
    return ollama.listModels()
  })

  ipcMain.handle('llm-generate-response', async (_event, context: LLMContext) => {
    return ollama.generateResponse(context)
  })

  ipcMain.handle('llm-clear-history', () => {
    ollama.clearHistory()
    return { success: true }
  })

  ipcMain.handle('llm-set-model', (_event, model: string) => {
    ollama.setModel(model)
    return { success: true }
  })
}

export { OllamaService }
export type { LLMContext }
