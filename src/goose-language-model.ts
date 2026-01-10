import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  LanguageModelV3StreamPart,
  SharedV3Warning,
} from '@ai-sdk/provider';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { generateId } from '@ai-sdk/provider-utils';
import type {
  GooseInternalSettings,
  GooseStreamEvent,
  Logger,
  GooseProviderName,
} from './types.js';
import { API_KEY_ENV_VARS, PROVIDERS } from './types.js';
import {
  createAPICallError,
  createTimeoutError,
  createProcessError,
} from './errors.js';

/**
 * Model ID - either 'goose' (use local config), or 'providerID/modelID' format.
 * @example 'goose' - uses locally configured goose
 * @example 'anthropic/claude-sonnet-4-5' - specific provider/model
 */
export type GooseModelId = 'goose' | `${GooseProviderName}/${string}` | (string & {});

export interface GooseLanguageModelOptions {
  modelId: GooseModelId;
  settings: GooseInternalSettings;
}

/**
 * Parse a model ID in the format 'providerID/modelID'.
 * Returns the provider and model name, or null if not in that format.
 */
function parseModelId(modelId: string): { provider: GooseProviderName; model: string } | null {
  const slashIndex = modelId.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }

  const providerName = modelId.slice(0, slashIndex);
  const modelName = modelId.slice(slashIndex + 1);

  if (providerName in PROVIDERS && modelName) {
    return {
      provider: providerName as GooseProviderName,
      model: modelName,
    };
  }

  return null;
}

/**
 * Goose CLI language model implementation for AI SDK.
 */
export class GooseLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider = 'goose';
  readonly modelId: string;
  readonly supportedUrls = {};

  private settings: GooseInternalSettings;
  private logger?: Logger;
  private computedEnv?: Record<string, string>;
  private parsedProvider?: GooseProviderName;
  private parsedModel?: string;

  constructor(options: GooseLanguageModelOptions) {
    this.modelId = options.modelId;
    this.settings = options.settings;
    this.logger = this.settings.logger;

    // Parse provider/model from modelId (if in providerID/modelID format)
    const parsed = parseModelId(options.modelId);
    if (parsed) {
      this.parsedProvider = parsed.provider;
      this.parsedModel = parsed.model;
    }

    this.computedEnv = this.buildEnv();
  }

  /**
   * Build environment variables from settings.
   * If modelId is 'goose', uses locally configured goose (no env vars set).
   * If modelId is 'providerID/modelID', sets GOOSE_PROVIDER and GOOSE_MODEL.
   */
  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {
      // Skip goose configure prompt - allows using goose without setup
      CONFIGURE: 'false',
      ...this.settings.env,
    };

    // If we parsed a provider/model from modelId, set those env vars
    if (this.parsedProvider && this.parsedModel) {
      env.GOOSE_PROVIDER = this.parsedProvider;
      env.GOOSE_MODEL = this.parsedModel;

      // Set API key if provided
      if (this.settings.apiKey) {
        const apiKeyEnvVar = API_KEY_ENV_VARS[this.parsedProvider];
        if (apiKeyEnvVar) {
          env[apiKeyEnvVar] = this.settings.apiKey;
        }
      }
    }
    // If modelId is 'goose' or doesn't match format, use local goose config
    // (don't set GOOSE_PROVIDER or GOOSE_MODEL)

    if (this.settings.maxTurns !== undefined) {
      env.GOOSE_MAX_TURNS = String(this.settings.maxTurns);
    }

    return env;
  }

  async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    const { system, prompt } = this.extractPromptParts(options.prompt);
    const args = this.buildCLIArgs(system, prompt);

    this.logger?.debug('Starting Goose CLI generation', {
      binPath: this.settings.binPath,
      args,
    });

    const events = await this.spawnGooseProcess(args, options.abortSignal);
    return this.eventsToGenerateResult(events);
  }

  async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
    const { system, prompt } = this.extractPromptParts(options.prompt);
    const args = this.buildCLIArgs(system, prompt);

    this.logger?.debug('Starting Goose CLI streaming', {
      binPath: this.settings.binPath,
      args,
    });

    const generator = this.createStreamFromProcess(args, options.abortSignal);

    // Convert async generator to ReadableStream
    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        try {
          for await (const part of generator) {
            controller.enqueue(part);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
    };
  }

  private buildCLIArgs(system: string | undefined, prompt: string): string[] {
    const args = ['run', '--with-builtin', 'developer', '--output-format', 'stream-json'];

    if (system) {
      args.push('--system', system);
    }

    args.push('-t', prompt);

    if (this.settings.sessionName) {
      args.push('--name', this.settings.sessionName);
    }

    if (this.settings.resume) {
      args.push('--resume');
    }

    args.push(...this.settings.args);
    return args;
  }

  private async spawnGooseProcess(
    args: string[],
    abortSignal?: AbortSignal
  ): Promise<GooseStreamEvent[]> {
    return new Promise((resolve, reject) => {
      const events: GooseStreamEvent[] = [];
      let stderr = '';

      this.logger?.debug('Spawning Goose CLI', {
        binPath: this.settings.binPath,
        args,
      });

      const child = spawn(this.settings.binPath, args, {
        env: this.computedEnv && Object.keys(this.computedEnv).length > 0
          ? { ...process.env, ...this.computedEnv }
          : process.env,
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(
          createTimeoutError(this.settings.timeout, {
            binPath: this.settings.binPath,
            args,
          })
        );
      }, this.settings.timeout);

      // Handle abort signal
      const onAbort = () => {
        clearTimeout(timeout);
        child.kill('SIGTERM');
        reject(
          createAPICallError('Request aborted', {
            binPath: this.settings.binPath,
            args,
          })
        );
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      const cleanup = () => {
        clearTimeout(timeout);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
      };

      const rl = createInterface({ input: child.stdout });

      rl.on('line', (line) => {
        try {
          const event = JSON.parse(line) as GooseStreamEvent;
          events.push(event);
          this.logger?.debug('Received event', event);
        } catch (err) {
          this.logger?.warn('Failed to parse line', { line, err });
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        cleanup();
        reject(
          createAPICallError(`Failed to spawn Goose CLI: ${error.message}`, {
            binPath: this.settings.binPath,
            args,
          })
        );
      });

      child.on('close', (code) => {
        cleanup();

        if (code !== 0 && code !== null) {
          reject(
            createProcessError(
              `Goose CLI exited with code ${code}`,
              code,
              stderr,
              { binPath: this.settings.binPath, args }
            )
          );
        } else {
          resolve(events);
        }
      });
    });
  }

  private async *createStreamFromProcess(
    args: string[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<LanguageModelV3StreamPart> {
    const child = spawn(this.settings.binPath, args, {
      env: this.computedEnv && Object.keys(this.computedEnv).length > 0
        ? { ...process.env, ...this.computedEnv }
        : process.env,
    });
    const rl = createInterface({ input: child.stdout });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle abort signal
    const onAbort = () => {
      child.kill('SIGTERM');
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        child.kill('SIGTERM');
        throw createAPICallError('Request aborted', {
          binPath: this.settings.binPath,
          args,
        });
      }
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    let currentTextPartId: string | null = null;
    let textStartEmitted = false;

    try {
      for await (const line of rl) {
        try {
          const event = JSON.parse(line) as GooseStreamEvent;
          this.logger?.debug('Stream event', event);

          if (event.type === 'message' && event.message) {
            const msg = event.message;

            if (msg.role === 'assistant') {
              for (const content of msg.content) {
                if (content.type === 'text' && content.text) {
                  if (!textStartEmitted) {
                    currentTextPartId = generateId();
                    yield {
                      type: 'text-start',
                      id: currentTextPartId,
                    };
                    textStartEmitted = true;
                  }
                  if (currentTextPartId) {
                    yield {
                      type: 'text-delta',
                      id: currentTextPartId,
                      delta: content.text,
                    };
                  }
                } else if (content.type === 'toolRequest') {
                  textStartEmitted = false;
                  currentTextPartId = null;

                  if (content.toolCall?.value) {
                    yield {
                      type: 'tool-call',
                      toolCallId: content.id || generateId(),
                      toolName: content.toolCall.value.name,
                      input: JSON.stringify(content.toolCall.value.arguments),
                    };
                  }
                }
              }
            } else if (msg.role === 'user') {
              for (const content of msg.content) {
                if (content.type === 'toolResponse' && content.toolResult) {
                  const result = content.toolResult.value;
                  const resultText = Array.isArray(result.content)
                    ? result.content
                        .filter((c: any) => {
                          // Include if no audience defined, or if audience includes "user"
                          const audience = c.annotations?.audience;
                          return !audience || audience.includes('user');
                        })
                        .map((c: any) => {
                          if (c.type === 'text' && c.text) {
                            return c.text;
                          } else if (c.type === 'resource' && c.resource?.text) {
                            return c.resource.text;
                          }
                          return JSON.stringify(c);
                        })
                        .join('\n')
                    : JSON.stringify(result.content);

                  yield {
                    type: 'tool-result',
                    toolCallId: content.id || generateId(),
                    toolName: 'unknown',
                    result: resultText,
                  };
                }
              }
            }
          } else if (event.type === 'complete') {
            // Close text part if it was opened
            if (currentTextPartId && textStartEmitted) {
              yield {
                type: 'text-end',
                id: currentTextPartId,
              };
            }
            yield {
              type: 'finish',
              finishReason: {
                unified: 'stop',
                raw: 'stop',
              },
              usage: {
                inputTokens: {
                  total: 0,
                  noCache: undefined,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {
                  total: event.total_tokens || 0,
                  text: event.total_tokens || 0,
                  reasoning: undefined,
                },
              },
            };
          } else if (event.type === 'error') {
            throw createAPICallError(event.error || 'Unknown error', {
              binPath: this.settings.binPath,
              args,
            });
          }
        } catch (err) {
          if (err instanceof Error && 'isRetryable' in err) {
            throw err;
          }
          this.logger?.warn('Failed to parse stream line', { line, err });
        }
      }
    } catch (err) {
      child.kill();
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      throw err;
    }

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => resolve(code || 0));
    });

    if (abortSignal) {
      abortSignal.removeEventListener('abort', onAbort);
    }

    if (exitCode !== 0) {
      throw createProcessError(
        `Goose CLI exited with code ${exitCode}`,
        exitCode,
        stderr,
        { binPath: this.settings.binPath, args }
      );
    }
  }

  private extractPromptParts(
    prompt: LanguageModelV3CallOptions['prompt']
  ): { system?: string; prompt: string } {
    if (Array.isArray(prompt)) {
      let system: string | undefined;
      const userMessages: string[] = [];

      for (const message of prompt) {
        if (!message || typeof message !== 'object') continue;

        switch (message.role) {
          case 'system':
            if (typeof message.content === 'string') {
              system = message.content;
            }
            break;
          case 'user':
            if (typeof message.content === 'string') {
              userMessages.push(message.content);
            } else if (Array.isArray(message.content)) {
              for (const part of message.content) {
                if (part.type === 'text') {
                  userMessages.push(part.text);
                }
              }
            }
            break;
        }
      }

      return {
        system,
        prompt: userMessages.join('\n\n'),
      };
    }

    return { prompt: String(prompt) };
  }

  private eventsToGenerateResult(
    events: GooseStreamEvent[]
  ): LanguageModelV3GenerateResult {
    let text = '';
    let totalTokens = 0;
    const warnings: SharedV3Warning[] = [];

    for (const event of events) {
      if (event.type === 'message' && event.message) {
        const msg = event.message;

        if (msg.role === 'assistant') {
          for (const content of msg.content) {
            if (content.type === 'text' && content.text) {
              text += content.text;
            }
          }
        }
      } else if (event.type === 'complete') {
        totalTokens = event.total_tokens || 0;
      } else if (event.type === 'error') {
        throw createAPICallError(event.error || 'Unknown error', {
          binPath: this.settings.binPath,
        });
      }
    }

    return {
      content: [{ type: 'text' as const, text }],
      finishReason: {
        unified: 'stop',
        raw: 'stop',
      },
      usage: {
        inputTokens: {
          total: 0,
          noCache: undefined,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: totalTokens,
          text: totalTokens,
          reasoning: undefined,
        },
      },
      warnings,
    };
  }
}
