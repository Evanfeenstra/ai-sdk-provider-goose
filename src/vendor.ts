/**
 * Supported Goose LLM providers.
 */
export const PROVIDERS = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  xai: 'xai',
  ollama: 'ollama',
  openrouter: 'openrouter',
} as const;

export type GooseProviderName = keyof typeof PROVIDERS;

/**
 * Model shortcuts for common models.
 * Use with: goose(GooseModels['claude-sonnet-4-6'])
 */
export const GooseModels = {
  // Anthropic Claude
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4-6',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4-5',
  'claude-opus-4-6': 'anthropic/claude-opus-4-6',
  'claude-sonnet-4-0': 'anthropic/claude-sonnet-4-0',
  'claude-opus-4-0': 'anthropic/claude-opus-4-0',

  // OpenAI GPT
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  o1: 'openai/o1',
  o3: 'openai/o3',
  'o4-mini': 'openai/o4-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'gpt-5.1-codex': 'openai/gpt-5.1-codex',

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
  qwen3: 'ollama/qwen3',
  'qwen3-coder:30b': 'ollama/qwen3-coder:30b',
  'llama3.2': 'ollama/llama3.2',
  mistral: 'ollama/mistral',
  codellama: 'ollama/codellama',

  // OpenRouter
  'kimi-k2.5': 'openrouter/moonshotai/kimi-k2.5',
} as const;

export type GooseModelShortcut = keyof typeof GooseModels;

/**
 * API key environment variable names for each provider.
 */
export const API_KEY_ENV_VARS: Record<GooseProviderName, string | null> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  ollama: null, // Ollama doesn't require an API key
  openrouter: 'OPENROUTER_API_KEY',
};

/**
 * Parse a model ID in the format 'providerID/modelID' or 'providerID/org/modelID'.
 * Returns the provider and model name, or null if not in that format.
 *
 * Handles multi-part models like OpenRouter: 'openrouter/moonshotai/kimi-k2.5'
 * where the model part includes the organization.
 */
export function parseModelId(modelId: string): { provider: GooseProviderName; model: string } | null {
  const slashIndex = modelId.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }

  const providerName = modelId.slice(0, slashIndex);
  // Everything after the first slash is the model ID
  // This handles formats like 'anthropic/claude-sonnet-4-6' and 'openrouter/moonshotai/kimi-k2.5'
  const modelName = modelId.slice(slashIndex + 1);

  if (providerName in PROVIDERS && modelName) {
    return {
      provider: providerName as GooseProviderName,
      model: modelName,
    };
  }

  return null;
}

export function buildProviderEnv(modelId: string, apiKey?: string) {
  const parsed = parseModelId(modelId);
  if (!parsed || !parsed.provider || !parsed.model) {
    return null;
  }
  const { provider, model } = parsed;

  const env: Record<string, string> = {
    GOOSE_PROVIDER: provider,
    GOOSE_MODEL: model,
  };

  // Set API key if provided
  if (apiKey) {
    const apiKeyEnvVar = API_KEY_ENV_VARS[provider];
    if (apiKeyEnvVar) {
      env[apiKeyEnvVar] = apiKey;
    }
  }

  return env;
}
