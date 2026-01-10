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
 * Available models for each provider.
 * First model in each array is the default.
 */
export const MODELS: Record<GooseProviderName, readonly string[]> = {
  anthropic: [
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-opus-4-5',
    'claude-sonnet-4-0',
    'claude-opus-4-0',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'o1',
    'o3',
    'o4-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-3-pro-preview',
  ],
  xai: [
    'grok-3',
    'grok-3-fast',
    'grok-3-mini',
    'grok-3-mini-fast',
    'grok-2',
    'grok-2-vision',
  ],
  ollama: [
    'qwen3',
    'qwen3-coder:30b',
    'llama3.2',
    'mistral',
    'codellama',
  ],
} as const;

/**
 * Default model for each provider (first in the MODELS array).
 */
export const DEFAULT_MODELS: Record<GooseProviderName, string> = {
  anthropic: MODELS.anthropic[0],
  openai: MODELS.openai[0],
  google: MODELS.google[0],
  xai: MODELS.xai[0],
  ollama: MODELS.ollama[0],
};

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
 * Settings for configuring the Goose language model provider.
 */
export interface GooseSettings {
  /**
   * Path to the Goose binary.
   * @default 'goose'
   */
  binPath?: string;

  /**
   * Additional CLI arguments to pass to Goose.
   * @example ['--profile', 'custom']
   */
  args?: string[];

  /**
   * Timeout for the entire request in milliseconds.
   * @default 120000 (2 minutes)
   */
  timeout?: number;

  /**
   * Logger instance for debugging.
   */
  logger?: Logger;

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
   * @example { GOOSE_PROVIDER: 'anthropic' }
   */
  env?: Record<string, string>;

  /**
   * LLM provider to use.
   * @example 'anthropic'
   */
  provider?: GooseProviderName;

  /**
   * Model name to use with the provider.
   * @example 'claude-sonnet-4-5'
   */
  model?: string;

  /**
   * API key for the provider.
   * Will be mapped to the appropriate environment variable (e.g., ANTHROPIC_API_KEY).
   */
  apiKey?: string;

  /**
   * Maximum number of turns allowed without user input.
   * @default 1000
   */
  maxTurns?: number;
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
