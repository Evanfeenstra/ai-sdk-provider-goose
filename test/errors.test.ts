import { describe, it, expect } from 'vitest';
import {
  createAPICallError,
  createTimeoutError,
  createProcessError,
} from '../src/errors.js';

describe('Error utilities', () => {
  describe('createAPICallError', () => {
    it('should create an API call error', () => {
      const error = createAPICallError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.url).toBe('goose://goose');
    });

    it('should include metadata', () => {
      const error = createAPICallError('Test error', {
        binPath: '/custom/path',
        args: ['--test'],
      });
      expect(error.url).toBe('goose:///custom/path');
      expect(error.data).toEqual({
        binPath: '/custom/path',
        args: ['--test'],
      });
    });

    it('should not be retryable', () => {
      const error = createAPICallError('Test error');
      expect(error.isRetryable).toBe(false);
    });
  });

  describe('createTimeoutError', () => {
    it('should create a timeout error', () => {
      const error = createTimeoutError(30000);
      expect(error.message).toContain('30000ms');
      expect(error.message).toContain('timed out');
    });

    it('should be retryable', () => {
      const error = createTimeoutError(30000);
      expect(error.isRetryable).toBe(true);
    });

    it('should include metadata', () => {
      const error = createTimeoutError(30000, {
        binPath: '/test/path',
      });
      expect(error.data).toEqual({
        binPath: '/test/path',
      });
    });
  });

  describe('createProcessError', () => {
    it('should create a process error', () => {
      const error = createProcessError('Failed', 1, 'stderr output');
      expect(error.message).toContain('Goose CLI error');
      expect(error.message).toContain('Failed');
    });

    it('should include exit code and stderr', () => {
      const error = createProcessError('Failed', 1, 'error details', {
        binPath: '/path',
      });
      expect(error.data).toMatchObject({
        exitCode: 1,
        stderr: 'error details',
        binPath: '/path',
      });
    });

    it('should not be retryable', () => {
      const error = createProcessError('Failed', 1, 'stderr');
      expect(error.isRetryable).toBe(false);
    });
  });
});
