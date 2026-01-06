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
import type { GooseSettings, GooseStreamEvent, Logger } from './types.js';
import {
  createAPICallError,
  createTimeoutError,
  createProcessError,
} from './errors.js';

export type GooseModelId = 'goose' | (string & {});

export interface GooseLanguageModelOptions {
  id: GooseModelId;
  settings?: GooseSettings;
}

/**
 * Goose CLI language model implementation for AI SDK.
 */
export class GooseLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly provider = 'goose';
  readonly modelId: string;
  readonly supportedUrls = {};

  private settings: Required<Omit<GooseSettings, 'sessionName' | 'resume' | 'logger'>> & {
    sessionName?: string;
    resume?: boolean;
    logger?: Logger;
  };
  private logger?: Logger;

  constructor(options: GooseLanguageModelOptions) {
    this.modelId = options.id;
    this.settings = {
      binPath: options.settings?.binPath || 'goose',
      args: options.settings?.args || [],
      timeout: options.settings?.timeout || 120000,
      sessionName: options.settings?.sessionName,
      resume: options.settings?.resume || false,
      logger: options.settings?.logger,
    };
    this.logger = this.settings.logger;
  }

  async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    const prompt = this.convertPromptToText(options.prompt);
    const args = this.buildCLIArgs(prompt);

    this.logger?.debug('Starting Goose CLI generation', {
      binPath: this.settings.binPath,
      args,
    });

    const events = await this.spawnGooseProcess(args);
    return this.eventsToGenerateResult(events);
  }

  async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
    const prompt = this.convertPromptToText(options.prompt);
    const args = this.buildCLIArgs(prompt);

    this.logger?.debug('Starting Goose CLI streaming', {
      binPath: this.settings.binPath,
      args,
    });

    const generator = this.createStreamFromProcess(args);

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

  private buildCLIArgs(prompt: string): string[] {
    const args = ['run', '--output-format', 'stream-json', '-t', prompt];

    if (this.settings.sessionName) {
      args.push('--name', this.settings.sessionName);
    }

    if (this.settings.resume) {
      args.push('--resume');
    }

    args.push(...this.settings.args);
    return args;
  }

  private async spawnGooseProcess(args: string[]): Promise<GooseStreamEvent[]> {
    return new Promise((resolve, reject) => {
      const events: GooseStreamEvent[] = [];
      let stderr = '';

      this.logger?.debug('Spawning Goose CLI', {
        binPath: this.settings.binPath,
        args,
      });

      const child = spawn(this.settings.binPath, args);

      const timeout = setTimeout(() => {
        child.kill();
        reject(
          createTimeoutError(this.settings.timeout, {
            binPath: this.settings.binPath,
            args,
          })
        );
      }, this.settings.timeout);

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
        clearTimeout(timeout);
        reject(
          createAPICallError(`Failed to spawn Goose CLI: ${error.message}`, {
            binPath: this.settings.binPath,
            args,
          })
        );
      });

      child.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(
            createProcessError(
              `Goose CLI exited with code ${code}`,
              code || 1,
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
    args: string[]
  ): AsyncGenerator<LanguageModelV3StreamPart> {
    const child = spawn(this.settings.binPath, args);
    const rl = createInterface({ input: child.stdout });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

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
                        .map((c: any) => c.text || JSON.stringify(c))
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
      throw err;
    }

    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => resolve(code || 0));
    });

    if (exitCode !== 0) {
      throw createProcessError(
        `Goose CLI exited with code ${exitCode}`,
        exitCode,
        stderr,
        { binPath: this.settings.binPath, args }
      );
    }
  }

  private convertPromptToText(
    prompt: LanguageModelV3CallOptions['prompt']
  ): string {
    if (Array.isArray(prompt)) {
      const messages: string[] = [];

      for (const message of prompt) {
        if (!message || typeof message !== 'object') continue;

        switch (message.role) {
          case 'system':
            if (typeof message.content === 'string') {
              messages.unshift(`System: ${message.content}`);
            }
            break;
          case 'user':
            if (typeof message.content === 'string') {
              messages.push(message.content);
            } else if (Array.isArray(message.content)) {
              for (const part of message.content) {
                if (part.type === 'text') {
                  messages.push(part.text);
                }
              }
            }
            break;
        }
      }

      return messages.join('\n\n');
    }

    return String(prompt);
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
