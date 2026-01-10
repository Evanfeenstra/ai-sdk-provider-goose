/**
 * AI SDK provider for Goose CLI.
 *
 * @module ai-sdk-provider-goose
 *
 * @example
 * ```typescript
 * import { goose } from 'ai-sdk-provider-goose';
 * import { generateText } from 'ai';
 *
 * // Basic usage
 * const result = await generateText({
 *   model: goose('goose'),
 *   prompt: 'What is 2+2?',
 * });
 *
 * console.log(result.text);
 *
 * // Session management
 * const model1 = goose('goose', { sessionName: 'my-session' });
 * await generateText({ model: model1, prompt: 'My name is Alice' });
 *
 * const model2 = goose('goose', { sessionName: 'my-session', resume: true });
 * await generateText({ model: model2, prompt: 'What is my name?' });
 * ```
 */

// Provider exports
export { createGoose, goose } from './goose-provider.js';
export type {
  GooseProvider,
  GooseProviderSettings,
} from './goose-provider.js';

// Language model exports
export { GooseLanguageModel } from './goose-language-model.js';
export type {
  GooseModelId,
  GooseLanguageModelOptions,
} from './goose-language-model.js';

// Type exports
export type { GooseSettings, Logger, GooseProviderName } from './types.js';

// Provider/model constants
export { PROVIDERS, MODELS, DEFAULT_MODELS, API_KEY_ENV_VARS } from './types.js';

// Error utilities
export {
  createAPICallError,
  createTimeoutError,
  createProcessError,
} from './errors.js';
export type { GooseErrorMetadata } from './errors.js';
