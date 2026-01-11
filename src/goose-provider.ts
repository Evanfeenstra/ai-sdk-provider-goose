import type { LanguageModelV3, ProviderV3 } from '@ai-sdk/provider';
import { NoSuchModelError } from '@ai-sdk/provider';
import {
  GooseLanguageModel,
  type GooseModelId,
} from './goose-language-model.js';
import type {
  GooseProviderSettings,
  GooseModelSettings,
  GooseInternalSettings,
} from './types.js';

/**
 * Goose provider interface extending AI SDK ProviderV3.
 */
export interface GooseProvider extends ProviderV3 {
  /**
   * Create a language model (callable shorthand).
   *
   * @param modelId Model ID in 'providerID/modelID' format (e.g., 'anthropic/claude-sonnet-4-5')
   * @param settings Optional model-level settings
   *
   * @example
   * ```typescript
   * const model = goose('anthropic/claude-sonnet-4-5');
   * const model = goose('openai/gpt-4o', { sessionName: 'my-session' });
   * ```
   */
  (modelId: GooseModelId, settings?: GooseModelSettings): LanguageModelV3;

  /**
   * Create a language model.
   */
  languageModel(modelId: GooseModelId, settings?: GooseModelSettings): LanguageModelV3;

  /**
   * Alias for languageModel (follows AI SDK pattern).
   */
  chat(modelId: GooseModelId, settings?: GooseModelSettings): LanguageModelV3;

  /**
   * Embedding models are not supported.
   */
  embeddingModel(modelId: string): never;

  /**
   * Image models are not supported.
   */
  imageModel(modelId: string): never;
}

/**
 * Creates a Goose provider with the specified settings.
 *
 * @param settings Provider-level settings (also serves as defaults for all models)
 * @returns Goose provider instance
 *
 * @example
 * ```typescript
 * import { createGoose } from 'ai-sdk-provider-goose';
 *
 * // Custom provider with settings
 * const provider = createGoose({
 *   binPath: '/path/to/goose',
 *   timeout: 60000,
 *   maxTurns: 500,
 * });
 *
 * // Use provider/model format
 * const model = provider('anthropic/claude-sonnet-4-5');
 * ```
 */
export function createGoose(
  settings: GooseProviderSettings = {}
): GooseProvider {
  const {
    binPath = 'goose',
    timeout = 600000,
    args = [],
    logger,
    ...defaultModelSettings
  } = settings;

  const createModel = (
    modelId: GooseModelId,
    modelSettings?: GooseModelSettings
  ): LanguageModelV3 => {
    if (typeof modelId !== 'string' || !modelId) {
      throw new NoSuchModelError({
        modelId: String(modelId),
        modelType: 'languageModel',
      });
    }

    // Build internal settings: provider defaults merged with model-specific settings
    const internalSettings: GooseInternalSettings = {
      binPath,
      timeout,
      args,
      logger,
      ...defaultModelSettings,
      ...modelSettings,
    };

    return new GooseLanguageModel({
      modelId,
      settings: internalSettings,
    });
  };

  const provider = Object.assign(createModel, {
    specificationVersion: 'v3' as const,
    languageModel: createModel,
    chat: createModel,
    embeddingModel: (modelId: string): never => {
      throw new NoSuchModelError({
        modelId,
        modelType: 'embeddingModel',
      });
    },
    imageModel: (modelId: string): never => {
      throw new NoSuchModelError({
        modelId,
        modelType: 'imageModel',
      });
    },
  });

  return provider;
}

/**
 * Default Goose provider instance.
 *
 * @example
 * ```typescript
 * import { goose, GooseModels } from 'ai-sdk-provider-goose';
 * import { generateText } from 'ai';
 *
 * // Using full model ID
 * const result = await generateText({
 *   model: goose('anthropic/claude-sonnet-4-5'),
 *   prompt: 'Hello!',
 * });
 *
 * // Using model shortcuts
 * const result = await generateText({
 *   model: goose(GooseModels['claude-sonnet-4-5']),
 *   prompt: 'Hello!',
 * });
 *
 * // With model settings
 * const result = await generateText({
 *   model: goose('openai/gpt-4o', { sessionName: 'my-session', resume: true }),
 *   prompt: 'Hello!',
 * });
 * ```
 */
export const goose: GooseProvider = createGoose();
