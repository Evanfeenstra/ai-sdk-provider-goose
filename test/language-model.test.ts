import { describe, it, expect } from 'vitest';
import { GooseLanguageModel } from '../src/goose-language-model.js';

describe('GooseLanguageModel', () => {
  describe('constructor', () => {
    it('should create a model with default settings', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
      });

      expect(model.modelId).toBe('goose');
      expect(model.provider).toBe('goose');
      expect(model.specificationVersion).toBe('v3');
    });

    it('should create a model with custom settings', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          binPath: '/custom/path',
          timeout: 60000,
          sessionName: 'test-session',
          resume: true,
        },
      });

      expect(model.modelId).toBe('goose');
    });
  });

  describe('CLI args building', () => {
    it('should build basic args without session', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
      });

      // Access private method via any cast for testing
      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toEqual([
        'run',
        '--output-format',
        'stream-json',
        '-t',
        'test prompt',
      ]);
    });

    it('should include --name flag when sessionName is provided', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          sessionName: 'my-session',
        },
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--name');
      expect(args).toContain('my-session');
    });

    it('should include --resume flag when resume is true', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          sessionName: 'my-session',
          resume: true,
        },
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--resume');
      expect(args).toContain('--name');
      expect(args).toContain('my-session');
    });

    it('should not include --resume when resume is false', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          sessionName: 'my-session',
          resume: false,
        },
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).not.toContain('--resume');
      expect(args).toContain('--name');
    });

    it('should include additional args', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          args: ['--custom-arg', 'value'],
        },
      });

      const args = (model as any).buildCLIArgs(undefined, 'test prompt');

      expect(args).toContain('--custom-arg');
      expect(args).toContain('value');
    });

    it('should include --system flag when system prompt is provided', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
      });

      const args = (model as any).buildCLIArgs('You are helpful', 'test prompt');

      expect(args).toContain('--system');
      expect(args).toContain('You are helpful');
      expect(args).toContain('-t');
      expect(args).toContain('test prompt');
    });

    it('should store env settings when provided', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          env: {
            GOOSE_API_KEY: 'test-key',
            CUSTOM_VAR: 'value',
          },
        },
      });

      const settings = (model as any).settings;
      expect(settings.env).toEqual({
        GOOSE_API_KEY: 'test-key',
        CUSTOM_VAR: 'value',
      });
    });

    it('should order flags correctly', () => {
      const model = new GooseLanguageModel({
        id: 'goose',
        settings: {
          sessionName: 'session1',
          resume: true,
          args: ['--extra'],
        },
      });

      const args = (model as any).buildCLIArgs(undefined, 'prompt');

      // Base command comes first
      expect(args[0]).toBe('run');
      expect(args[1]).toBe('--output-format');
      expect(args[2]).toBe('stream-json');
      expect(args[3]).toBe('-t');
      expect(args[4]).toBe('prompt');

      // Session flags in middle
      const nameIndex = args.indexOf('--name');
      expect(nameIndex).toBeGreaterThan(4);
      expect(args[nameIndex + 1]).toBe('session1');
      expect(args).toContain('--resume');

      // Extra args at end
      expect(args[args.length - 1]).toBe('--extra');
    });
  });

  describe('prompt extraction', () => {
    it('should extract string prompt', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).extractPromptParts('Hello');
      expect(result).toEqual({
        prompt: 'Hello',
      });
    });

    it('should extract array prompt with user message', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).extractPromptParts([
        { role: 'user', content: 'What is 2+2?' },
      ]);
      expect(result).toEqual({
        system: undefined,
        prompt: 'What is 2+2?',
      });
    });

    it('should separate system and user messages', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
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
      const model = new GooseLanguageModel({ id: 'goose' });
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
      const model = new GooseLanguageModel({ id: 'goose' });
      const controller = new AbortController();
      controller.abort();

      await expect(
        model.doGenerate({
          prompt: 'test',
          abortSignal: controller.signal,
        })
      ).rejects.toThrow('Request aborted');
    });

    it('should reject doStream when signal is already aborted', async () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const controller = new AbortController();
      controller.abort();

      const result = await model.doStream({
        prompt: 'test',
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
        id: 'goose',
        settings: {
          binPath: 'sleep', // Use 'sleep' command as a long-running process
          timeout: 10000,
        },
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
