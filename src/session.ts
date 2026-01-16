/**
 * Session export utilities for Goose.
 */

import { execSync } from 'child_process';
import type { ModelMessage } from '@ai-sdk/provider-utils';
import {
  convertGooseMessages,
  type GooseMessage,
  type Audience,
} from './convert.js';

export type { Audience, GooseMessage } from './convert.js';

/**
 * Exports a Goose session to AI SDK ModelMessage format.
 *
 * @param name - The name of the Goose session to export
 * @param audience - The audience to filter for ("user" or "assistant"), defaults to "user"
 * @returns Array of AI SDK ModelMessage objects
 *
 * @example
 * const messages = exportSession("my-session-name", "user");
 * // Returns AI SDK compatible messages filtered for user visibility
 */
export function exportSession(name: string, audience: Audience = 'user'): ModelMessage[] {
  const sanitizedName = sanitizeShellArg(name);
  const stdout = execSync(`goose session export --name "${sanitizedName}" --format json`, {
    encoding: 'utf-8',
  });

  const session = JSON.parse(stdout) as { conversation?: GooseMessage[] };

  return convertGooseMessages(session?.conversation ?? [], audience);
}

/**
 * Exports raw Goose session messages without conversion.
 * Useful when you need the original Goose format.
 *
 * @param name - The name of the Goose session to export
 * @returns Array of raw Goose messages
 */
export function exportSessionRaw(name: string): GooseMessage[] {
  const sanitizedName = sanitizeShellArg(name);
  const stdout = execSync(`goose session export --name "${sanitizedName}" --format json`, {
    encoding: 'utf-8',
  });

  const session = JSON.parse(stdout) as { conversation?: GooseMessage[] };
  return session?.conversation ?? [];
}

function sanitizeShellArg(arg: string): string {
  return arg
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/!/g, '\\!');
}
