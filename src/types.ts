/**
 * Supported Goose LLM providers.
 */
export const PROVIDERS = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  xai: 'xai',
  ollama: 'ollama',
} as const;

export type GooseProviderName = keyof typeof PROVIDERS;

/**
 * API key environment variable names for each provider.
 */
export const API_KEY_ENV_VARS: Record<GooseProviderName, string | null> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  ollama: null, // Ollama doesn't require an API key
};

/**
 * Model shortcuts for common models.
 * Use with: goose(GooseModels['claude-sonnet-4-5'])
 */
export const GooseModels = {
  // Anthropic Claude
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4-5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4-5',
  'claude-opus-4-5': 'anthropic/claude-opus-4-5',
  'claude-sonnet-4-0': 'anthropic/claude-sonnet-4-0',
  'claude-opus-4-0': 'anthropic/claude-opus-4-0',

  // OpenAI GPT
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'o1': 'openai/o1',
  'o3': 'openai/o3',
  'o4-mini': 'openai/o4-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',

  // Google Gemini
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite',
  'gemini-3-pro-preview': 'google/gemini-3-pro-preview',

  // xAI Grok
  'grok-3': 'xai/grok-3',
  'grok-3-fast': 'xai/grok-3-fast',
  'grok-3-mini': 'xai/grok-3-mini',
  'grok-3-mini-fast': 'xai/grok-3-mini-fast',
  'grok-2': 'xai/grok-2',
  'grok-2-vision': 'xai/grok-2-vision',

  // Ollama (local models)
  'qwen3': 'ollama/qwen3',
  'qwen3-coder:30b': 'ollama/qwen3-coder:30b',
  'llama3.2': 'ollama/llama3.2',
  'mistral': 'ollama/mistral',
  'codellama': 'ollama/codellama',
} as const;

export type GooseModelShortcut = keyof typeof GooseModels;

/**
 * Provider-level settings for configuring the Goose provider.
 * These are applied to all model instances created by the provider.
 */
export interface GooseProviderSettings {
  /**
   * Path to the Goose binary.
   * @default 'goose'
   */
  binPath?: string;

  /**
   * Timeout for the entire request in milliseconds.
   * @default 120000 (2 minutes)
   */
  timeout?: number;

  /**
   * Additional CLI arguments to pass to Goose.
   * @example ['--profile', 'custom']
   */
  args?: string[];

  /**
   * Logger instance for debugging.
   */
  logger?: Logger;

  /**
   * Default settings applied to all model calls.
   */
  defaultSettings?: GooseModelSettings;
}

/**
 * Model-level settings for individual model instances.
 */
export interface GooseModelSettings {
  /**
   * Session name for the conversation.
   * When provided, adds --name flag to the CLI.
   * @example 'my-session'
   */
  sessionName?: string;

  /**
   * Whether to resume an existing session.
   * When true, adds --resume flag to the CLI.
   * Requires sessionName to be set.
   * @default false
   */
  resume?: boolean;

  /**
   * Environment variables to pass to the Goose CLI process.
   * These will be merged with the current process environment.
   * @example { CUSTOM_VAR: 'value' }
   */
  env?: Record<string, string>;

  /**
   * API key for the provider.
   * Will be mapped to the appropriate environment variable (e.g., ANTHROPIC_API_KEY).
   * If not provided, the key from the environment will be used.
   */
  apiKey?: string;

  /**
   * Maximum number of turns allowed without user input.
   * @default 1000
   */
  maxTurns?: number;

  /**
   * System prompt override.
   */
  systemPrompt?: string;
}

/**
 * Combined internal settings used by the language model.
 * @internal
 */
export interface GooseInternalSettings extends GooseModelSettings {
  binPath: string;
  timeout: number;
  args: string[];
  logger?: Logger;
}

/**
 * Logger interface for debugging.
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * JSONL event from Goose CLI stream.
 */
export interface GooseStreamEvent {
  type: 'message' | 'notification' | 'complete' | 'error';
  message?: GooseMessage;
  extension_id?: string;
  log?: { message: string };
  total_tokens?: number;
  error?: string;
}

/**
 * Message content in Goose CLI output.
 */
export interface GooseMessage {
  id: string;
  role: 'assistant' | 'user';
  created: number;
  content: GooseMessageContent[];
  metadata: {
    userVisible: boolean;
    agentVisible: boolean;
  };
}

/**
 * Content item within a message.
 */
export interface GooseMessageContent {
  type: 'text' | 'toolRequest' | 'toolResponse';
  text?: string;
  id?: string;
  toolCall?: {
    status: string;
    value: {
      name: string;
      arguments: any;
    };
  };
  toolResult?: {
    status: string;
    value: {
      content: any[];
      isError: boolean;
    };
  };
}
