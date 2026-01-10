import { describe, it, expect } from 'vitest';
import { createGoose, goose } from '../src/goose-provider.js';
import { GooseLanguageModel } from '../src/goose-language-model.js';

describe('GooseProvider', () => {
  describe('createGoose', () => {
    it('should create a provider with default settings', () => {
      const provider = createGoose();
      expect(provider).toBeDefined();
      expect(typeof provider).toBe('function');
    });

    it('should create a provider with custom settings', () => {
      const provider = createGoose({
        binPath: '/custom/path/goose',
        timeout: 60000,
      });
      expect(provider).toBeDefined();
    });

    it('should create a provider with default model settings', () => {
      const provider = createGoose({
        defaultSettings: {
          maxTurns: 500,
          sessionName: 'default-session',
        },
      });
      expect(provider).toBeDefined();
    });

    it('should have languageModel method', () => {
      const provider = createGoose();
      expect(provider.languageModel).toBeDefined();
      expect(typeof provider.languageModel).toBe('function');
    });

    it('should have chat method', () => {
      const provider = createGoose();
      expect(provider.chat).toBeDefined();
      expect(typeof provider.chat).toBe('function');
    });
  });

  describe('goose (default instance)', () => {
    it('should be a callable provider', () => {
      expect(goose).toBeDefined();
      expect(typeof goose).toBe('function');
    });

    it('should create a model with "goose" for local config', () => {
      const model = goose('goose');
      expect(model).toBeInstanceOf(GooseLanguageModel);
      expect(model.modelId).toBe('goose');
    });

    it('should create a model when called with provider/model format', () => {
      const model = goose('anthropic/claude-sonnet-4-5');
      expect(model).toBeInstanceOf(GooseLanguageModel);
      expect(model.modelId).toBe('anthropic/claude-sonnet-4-5');
    });

    it('should create a model with settings', () => {
      const model = goose('openai/gpt-4o', {
        sessionName: 'test-session',
        maxTurns: 100,
      });
      expect(model).toBeInstanceOf(GooseLanguageModel);
      expect(model.modelId).toBe('openai/gpt-4o');
    });
  });

  describe('model creation', () => {
    it('should merge provider and model settings', () => {
      const provider = createGoose({
        binPath: '/provider/path',
        timeout: 30000,
        defaultSettings: {
          maxTurns: 500,
        },
      });

      const model = provider('anthropic/claude-sonnet-4-5', {
        sessionName: 'my-session',
      });

      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should create model via languageModel method', () => {
      const provider = createGoose();
      const model = provider.languageModel('google/gemini-2.5-pro');
      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should create model via chat method', () => {
      const provider = createGoose();
      const model = provider.chat('xai/grok-3');
      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should support ollama provider', () => {
      const model = goose('ollama/llama3.2');
      expect(model).toBeInstanceOf(GooseLanguageModel);
      expect(model.modelId).toBe('ollama/llama3.2');
    });
  });

  describe('unsupported model types', () => {
    it('should throw error for embeddingModel', () => {
      const provider = createGoose();
      expect(() => provider.embeddingModel('test')).toThrow();
    });

    it('should throw error for imageModel', () => {
      const provider = createGoose();
      expect(() => provider.imageModel('test')).toThrow();
    });
  });

  describe('V3 specification', () => {
    it('should have specificationVersion v3', () => {
      const provider = createGoose();
      expect(provider.specificationVersion).toBe('v3');
    });
  });
});
