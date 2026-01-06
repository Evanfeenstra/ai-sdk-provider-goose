import { APICallError } from '@ai-sdk/provider';

/**
 * Metadata attached to errors from the Goose CLI provider.
 */
export interface GooseErrorMetadata {
  binPath?: string;
  args?: string[];
  exitCode?: number;
  stderr?: string;
}

/**
 * Creates a general API call error.
 */
export function createAPICallError(
  message: string,
  metadata?: GooseErrorMetadata
): APICallError {
  return new APICallError({
    message,
    url: `goose://${metadata?.binPath || 'goose'}`,
    requestBodyValues: metadata?.args || [],
    data: metadata,
    isRetryable: false,
  });
}

/**
 * Creates a timeout error (retryable).
 */
export function createTimeoutError(
  timeoutMs: number,
  metadata?: GooseErrorMetadata
): APICallError {
  return new APICallError({
    message: `Goose CLI timed out after ${timeoutMs}ms`,
    url: `goose://${metadata?.binPath || 'goose'}`,
    requestBodyValues: metadata?.args || [],
    data: metadata,
    isRetryable: true,
  });
}

/**
 * Creates a process error for non-zero exit codes.
 */
export function createProcessError(
  message: string,
  exitCode: number,
  stderr: string,
  metadata?: GooseErrorMetadata
): APICallError {
  return new APICallError({
    message: `Goose CLI error: ${message}`,
    url: `goose://${metadata?.binPath || 'goose'}`,
    requestBodyValues: metadata?.args || [],
    data: { ...metadata, exitCode, stderr },
    isRetryable: false,
  });
}
