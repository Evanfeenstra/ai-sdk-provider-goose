/**
 * AI SDK provider for Goose CLI.
 *
 * @module ai-sdk-provider-goose
 *
 * @example
 * ```typescript
 * import { goose, GooseModels } from 'ai-sdk-provider-goose';
 * import { generateText } from 'ai';
 *
 * // Use locally configured goose (no provider override)
 * const result = await generateText({
 *   model: goose('goose'),
 *   prompt: 'What is 2+2?',
 * });
 *
 * // Using provider/model ID format
 * const result = await generateText({
 *   model: goose('anthropic/claude-sonnet-4-5'),
 *   prompt: 'What is 2+2?',
 * });
 *
 * // Using model shortcuts
 * const result = await generateText({
 *   model: goose(GooseModels['gpt-4o']),
 *   prompt: 'What is 2+2?',
 * });
 *
 * // With session management
 * const model = goose('anthropic/claude-sonnet-4-5', {
 *   sessionName: 'my-session',
 *   resume: true,
 * });
 * ```
 */

// Provider exports
export { createGoose, goose } from './goose-provider.js';
export type { GooseProvider } from './goose-provider.js';

// Language model exports
export { GooseLanguageModel } from './goose-language-model.js';
export type { GooseModelId } from './goose-language-model.js';

// Type exports
export type {
  GooseProviderSettings,
  GooseModelSettings,
  GooseProviderName,
  GooseModelShortcut,
  Logger,
} from './types.js';

// Provider/model constants
export {
  PROVIDERS,
  API_KEY_ENV_VARS,
  GooseModels,
} from './types.js';

// Error utilities
export {
  createAPICallError,
  createTimeoutError,
  createProcessError,
} from './errors.js';
export type { GooseErrorMetadata } from './errors.js';
