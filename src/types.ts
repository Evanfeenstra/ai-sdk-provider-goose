/**
 * Provider-level settings for configuring the Goose provider.
 * Extends GooseModelSettings - all model settings can be set as defaults here.
 */
export interface GooseProviderSettings extends GooseModelSettings {
  /**
   * Path to the Goose binary.
   * @default 'goose'
   */
  binPath?: string;

  /**
   * Timeout for the entire request in milliseconds.
   * @default 600000 (10 minutes)
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
  input_tokens?: number;
  output_tokens?: number;
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
