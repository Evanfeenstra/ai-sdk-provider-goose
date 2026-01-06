import type { LanguageModelV3, ProviderV3 } from '@ai-sdk/provider';
import { NoSuchModelError } from '@ai-sdk/provider';
import {
  GooseLanguageModel,
  type GooseModelId,
} from './goose-language-model.js';
import type { GooseSettings } from './types.js';

/**
 * Goose provider interface extending AI SDK ProviderV3.
 */
export interface GooseProvider extends ProviderV3 {
  /**
   * Create a language model (callable shorthand).
   */
  (modelId: GooseModelId, settings?: GooseSettings): LanguageModelV3;

  /**
   * Create a language model.
   */
  languageModel(modelId: GooseModelId, settings?: GooseSettings): LanguageModelV3;

  /**
   * Alias for languageModel (follows AI SDK pattern).
   */
  chat(modelId: GooseModelId, settings?: GooseSettings): LanguageModelV3;

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
 * Provider-level settings for Goose.
 */
export interface GooseProviderSettings extends GooseSettings {}

/**
 * Creates a Goose provider with the specified settings.
 *
 * @param settings Provider-level settings
 * @returns Goose provider instance
 *
 * @example
 * ```typescript
 * import { createGoose } from 'ai-sdk-provider-goose';
 *
 * const provider = createGoose({
 *   binPath: '/path/to/goose',
 *   timeout: 60000,
 * });
 *
 * const model = provider('goose');
 * ```
 */
export function createGoose(
  settings: GooseProviderSettings = {}
): GooseProvider {
  const createModel = (
    modelId: GooseModelId,
    modelSettings?: GooseSettings
  ): LanguageModelV3 => {
    if (modelId !== 'goose' && typeof modelId !== 'string') {
      throw new NoSuchModelError({
        modelId: String(modelId),
        modelType: 'languageModel',
      });
    }

    const mergedSettings: GooseSettings = {
      ...settings,
      ...modelSettings,
    };

    return new GooseLanguageModel({
      id: modelId,
      settings: mergedSettings,
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
 * import { goose } from 'ai-sdk-provider-goose';
 * import { generateText } from 'ai';
 *
 * const result = await generateText({
 *   model: goose('goose'),
 *   prompt: 'Hello!',
 * });
 * ```
 */
export const goose: GooseProvider = createGoose();
