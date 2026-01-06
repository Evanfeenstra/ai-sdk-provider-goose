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
      const args = (model as any).buildCLIArgs('test prompt');

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

      const args = (model as any).buildCLIArgs('test prompt');

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

      const args = (model as any).buildCLIArgs('test prompt');

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

      const args = (model as any).buildCLIArgs('test prompt');

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

      const args = (model as any).buildCLIArgs('test prompt');

      expect(args).toContain('--custom-arg');
      expect(args).toContain('value');
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

      const args = (model as any).buildCLIArgs('prompt');

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

  describe('prompt conversion', () => {
    it('should convert string prompt', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).convertPromptToText('Hello');
      expect(result).toBe('Hello');
    });

    it('should convert array prompt with user message', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).convertPromptToText([
        { role: 'user', content: 'What is 2+2?' },
      ]);
      expect(result).toBe('What is 2+2?');
    });

    it('should handle system message', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).convertPromptToText([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ]);
      expect(result).toContain('System: You are helpful');
      expect(result).toContain('Hello');
    });

    it('should handle multi-part user content', () => {
      const model = new GooseLanguageModel({ id: 'goose' });
      const result = (model as any).convertPromptToText([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: 'Part 2' },
          ],
        },
      ]);
      expect(result).toContain('Part 1');
      expect(result).toContain('Part 2');
    });
  });
});
