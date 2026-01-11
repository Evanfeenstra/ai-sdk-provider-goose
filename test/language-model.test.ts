import { describe, it, expect } from 'vitest';
import { GooseLanguageModel } from '../src/goose-language-model.js';
import type { GooseInternalSettings } from '../src/types.js';

// Helper to create default internal settings
function createSettings(overrides: Partial<GooseInternalSettings> = {}): GooseInternalSettings {
  return {
    binPath: 'goose',
    timeout: 600000,
    args: [],
    ...overrides,
  };
}

describe('GooseLanguageModel', () => {
  describe('constructor', () => {
    it('should create a model with default settings', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });

      expect(model.modelId).toBe('anthropic/claude-sonnet-4-5');
      expect(model.provider).toBe('goose');
      expect(model.specificationVersion).toBe('v3');
    });

    it('should create a model with custom settings', () => {
      const model = new GooseLanguageModel({
        modelId: 'openai/gpt-4o',
        settings: createSettings({
          binPath: '/custom/path',
          timeout: 60000,
          sessionName: 'test-session',
          resume: true,
        }),
      });

      expect(model.modelId).toBe('openai/gpt-4o');
    });

    it('should parse provider and model from modelId', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-haiku-4-5',
        settings: createSettings(),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.GOOSE_PROVIDER).toBe('anthropic');
      expect(computedEnv.GOOSE_MODEL).toBe('claude-haiku-4-5');
    });

    it('should use local config when modelId is "goose"', () => {
      const model = new GooseLanguageModel({
        modelId: 'goose',
        settings: createSettings(),
      });

      expect(model.modelId).toBe('goose');
      const computedEnv = (model as any).computedEnv;
      // Should NOT set GOOSE_PROVIDER or GOOSE_MODEL for local config
      expect(computedEnv.GOOSE_PROVIDER).toBeUndefined();
      expect(computedEnv.GOOSE_MODEL).toBeUndefined();
      // Should still have CONFIGURE=false
      expect(computedEnv.CONFIGURE).toBe('false');
    });
  });

  describe('CLI args building', () => {
    it('should build basic args without session', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });

      // Access private method via any cast for testing
      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toEqual([
        'run',
        '--with-builtin',
        'developer',
        '--output-format',
        'stream-json',
        '-t',
        'test prompt',
      ]);
    });

    it('should include --name flag when sessionName is provided', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          sessionName: 'my-session',
        }),
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--name');
      expect(args).toContain('my-session');
    });

    it('should include --resume flag when resume is true', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          sessionName: 'my-session',
          resume: true,
        }),
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--resume');
      expect(args).toContain('--name');
      expect(args).toContain('my-session');
    });

    it('should not include --resume when resume is false', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          sessionName: 'my-session',
          resume: false,
        }),
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).not.toContain('--resume');
      expect(args).toContain('--name');
    });

    it('should include additional args', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          args: ['--custom-arg', 'value'],
        }),
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--custom-arg');
      expect(args).toContain('value');
    });

    it('should include --system flag when system prompt is provided', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });

      const args = (model as any).buildCLIArgs('You are helpful', 'test prompt');

      expect(args).toContain('--system');
      expect(args).toContain('You are helpful');
      expect(args).toContain('-t');
      expect(args).toContain('test prompt');
    });

    it('should store env settings when provided', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          env: {
            GOOSE_API_KEY: 'test-key',
            CUSTOM_VAR: 'value',
          },
        }),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.CONFIGURE).toBe('false');
      expect(computedEnv.GOOSE_API_KEY).toBe('test-key');
      expect(computedEnv.CUSTOM_VAR).toBe('value');
      // Also has provider/model from modelId
      expect(computedEnv.GOOSE_PROVIDER).toBe('anthropic');
      expect(computedEnv.GOOSE_MODEL).toBe('claude-sonnet-4-5');
    });

    it('should set provider env vars from modelId', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-opus-4-5',
        settings: createSettings({
          apiKey: 'sk-test-key',
        }),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.GOOSE_PROVIDER).toBe('anthropic');
      expect(computedEnv.GOOSE_MODEL).toBe('claude-opus-4-5');
      expect(computedEnv.ANTHROPIC_API_KEY).toBe('sk-test-key');
    });

    it('should use provider and model from modelId format', () => {
      const model = new GooseLanguageModel({
        modelId: 'openai/gpt-4-turbo',
        settings: createSettings({
          apiKey: 'sk-openai-key',
        }),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.GOOSE_PROVIDER).toBe('openai');
      expect(computedEnv.GOOSE_MODEL).toBe('gpt-4-turbo');
      expect(computedEnv.OPENAI_API_KEY).toBe('sk-openai-key');
    });

    it('should set maxTurns env var when specified', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          maxTurns: 500,
        }),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.GOOSE_MAX_TURNS).toBe('500');
    });

    it('should not set API key env var for ollama provider', () => {
      const model = new GooseLanguageModel({
        modelId: 'ollama/llama3.2',
        settings: createSettings({
          apiKey: 'ignored-key',
        }),
      });

      const computedEnv = (model as any).computedEnv;
      expect(computedEnv.GOOSE_PROVIDER).toBe('ollama');
      expect(computedEnv.GOOSE_MODEL).toBe('llama3.2');
      // Ollama doesn't use an API key env var
      expect(computedEnv.OLLAMA_API_KEY).toBeUndefined();
    });

    it('should order flags correctly', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          sessionName: 'session1',
          resume: true,
          args: ['--extra'],
        }),
      });

      const args = (model as any).buildCLIArgs(undefined, 'prompt');

      // Base command comes first
      expect(args[0]).toBe('run');
      expect(args[1]).toBe('--with-builtin');
      expect(args[2]).toBe('developer');
      expect(args[3]).toBe('--output-format');
      expect(args[4]).toBe('stream-json');
      expect(args[5]).toBe('-t');
      expect(args[6]).toBe('prompt');

      // Session flags in middle
      const nameIndex = args.indexOf('--name');
      expect(nameIndex).toBeGreaterThan(6);
      expect(args[nameIndex + 1]).toBe('session1');
      expect(args).toContain('--resume');

      // Extra args at end
      expect(args[args.length - 1]).toBe('--extra');
    });
  });

  describe('prompt extraction', () => {
    it('should extract string prompt', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const result = (model as any).extractPromptParts('Hello');
      expect(result).toEqual({
        prompt: 'Hello',
      });
    });

    it('should extract array prompt with user message', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const result = (model as any).extractPromptParts([
        { role: 'user', content: 'What is 2+2?' },
      ]);
      expect(result).toEqual({
        system: undefined,
        prompt: 'What is 2+2?',
      });
    });

    it('should separate system and user messages', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const result = (model as any).extractPromptParts([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ]);
      expect(result).toEqual({
        system: 'You are helpful',
        prompt: 'Hello',
      });
    });

    it('should handle multi-part user content', () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const result = (model as any).extractPromptParts([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' },
          ],
        },
      ]);
      expect(result.prompt).toContain('Part 1');
      expect(result.prompt).toContain('Part 2');
    });
  });

  describe('abort signal support', () => {
    it('should reject doGenerate when signal is already aborted', async () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const controller = new AbortController();
      controller.abort();

      await expect(
        model.doGenerate({
          prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
          abortSignal: controller.signal,
        })
      ).rejects.toThrow('Request aborted');
    });

    it('should reject doStream when signal is already aborted', async () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings(),
      });
      const controller = new AbortController();
      controller.abort();

      const result = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        abortSignal: controller.signal,
      });

      // The stream should throw when we try to read from it
      await expect(async () => {
        for await (const chunk of result.stream) {
          // Should not reach here
        }
      }).rejects.toThrow('Request aborted');
    });

    it('should kill process when abort is triggered during generation', async () => {
      const model = new GooseLanguageModel({
        modelId: 'anthropic/claude-sonnet-4-5',
        settings: createSettings({
          binPath: 'sleep', // Use 'sleep' command as a long-running process
          timeout: 10000,
        }),
      });

      const controller = new AbortController();

      // Abort after 100ms
      setTimeout(() => controller.abort(), 100);

      // Use sleep command args directly
      const sleepArgs = ['10'];

      await expect(
        (model as any).spawnGooseProcess(sleepArgs, controller.signal)
      ).rejects.toThrow('Request aborted');
    });
  });
});
