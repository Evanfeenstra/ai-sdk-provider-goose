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

    it('should create a model when called', () => {
      const model = goose('goose');
      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should create a model with settings', () => {
      const model = goose('goose', {
        binPath: '/test/path',
        sessionName: 'test-session',
      });
      expect(model).toBeInstanceOf(GooseLanguageModel);
      expect(model.modelId).toBe('goose');
    });
  });

  describe('model creation', () => {
    it('should merge provider and model settings', () => {
      const provider = createGoose({
        binPath: '/provider/path',
        timeout: 30000,
      });

      const model = provider('goose', {
        sessionName: 'my-session',
      });

      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should create model via languageModel method', () => {
      const provider = createGoose();
      const model = provider.languageModel('goose');
      expect(model).toBeInstanceOf(GooseLanguageModel);
    });

    it('should create model via chat method', () => {
      const provider = createGoose();
      const model = provider.chat('goose');
      expect(model).toBeInstanceOf(GooseLanguageModel);
    });
  });

  describe('unsupported model types', () => {
    it('should throw error for textEmbeddingModel', () => {
      const provider = createGoose();
      expect(() => provider.textEmbeddingModel('test')).toThrow();
    });

    it('should throw error for imageModel', () => {
      const provider = createGoose();
      expect(() => provider.imageModel('test')).toThrow();
    });
  });
});
