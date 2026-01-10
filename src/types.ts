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
