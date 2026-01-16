/**
 * Shared conversion utilities for transforming Goose messages to AI SDK format.
 */

import type {
  ModelMessage,
  AssistantModelMessage,
  ToolModelMessage,
  UserModelMessage,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from '@ai-sdk/provider-utils';
import { generateId } from '@ai-sdk/provider-utils';

export type Audience = 'user' | 'assistant';

/**
 * Goose content annotations for audience filtering.
 */
interface ContentAnnotations {
  audience?: string[];
  priority?: number;
}

/**
 * Goose tool call structure.
 */
interface GooseToolCall {
  status: 'success' | 'error';
  value: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Goose tool result structure.
 */
interface GooseToolResult {
  status: 'success' | 'error';
  value: {
    content: Array<{
      type: string;
      text?: string;
      resource?: { text?: string };
      annotations?: ContentAnnotations;
      [key: string]: unknown;
    }>;
    isError: boolean;
  };
}

/**
 * Goose message content item types.
 */
export interface GooseTextContent {
  type: 'text';
  text: string;
  annotations?: ContentAnnotations;
}

export interface GooseToolRequestContent {
  type: 'toolRequest';
  id: string;
  toolCall: GooseToolCall;
  annotations?: ContentAnnotations;
}

export interface GooseToolResponseContent {
  type: 'toolResponse';
  id: string;
  toolResult: GooseToolResult;
  annotations?: ContentAnnotations;
}

export type GooseContentItem = GooseTextContent | GooseToolRequestContent | GooseToolResponseContent | {
  type: string;
  annotations?: ContentAnnotations;
  [key: string]: unknown;
};

/**
 * Goose message structure from session export.
 */
export interface GooseMessage {
  id: string;
  role: 'assistant' | 'user';
  created: number;
  content: GooseContentItem[];
  metadata?: {
    userVisible?: boolean;
    agentVisible?: boolean;
  };
}

/**
 * Checks if a content item should be visible to the specified audience.
 * Defensive: handles missing/malformed annotations gracefully.
 */
export function shouldIncludeForAudience(item: { annotations?: ContentAnnotations } | null | undefined, audience: Audience): boolean {
  try {
    if (!item?.annotations?.audience || !Array.isArray(item.annotations.audience)) {
      return true;
    }
    return item.annotations.audience.includes(audience);
  } catch {
    return true;
  }
}

/**
 * Extracts text from a Goose tool result content array.
 * Defensive: handles undefined/null/non-array content gracefully.
 */
export function extractToolResultText(
  content: GooseToolResult['value']['content'] | undefined | null,
  audience: Audience
): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }
  
  return content
    .filter((c) => c && typeof c === 'object' && shouldIncludeForAudience(c, audience))
    .map((c) => {
      try {
        if (c.type === 'text' && c.text) {
          return c.text;
        } else if (c.type === 'resource' && c.resource?.text) {
          return c.resource.text;
        }
        return JSON.stringify(c);
      } catch {
        return '';
      }
    })
    .join('\n');
}

/**
 * Converts a Goose text content item to an AI SDK TextPart.
 * Defensive: handles missing text gracefully.
 */
function convertTextContent(content: GooseTextContent): TextPart {
  return {
    type: 'text',
    text: content?.text ?? '',
  };
}

/**
 * Converts a Goose tool request to an AI SDK ToolCallPart.
 * Defensive: handles missing/malformed toolCall gracefully.
 */
function convertToolRequest(content: GooseToolRequestContent): ToolCallPart | null {
  try {
    return {
      type: 'tool-call',
      toolCallId: content?.id || generateId(),
      toolName: content?.toolCall?.value?.name ?? 'unknown',
      input: content?.toolCall?.value?.arguments ?? {},
    };
  } catch {
    return null;
  }
}

/**
 * Converts a Goose tool response to an AI SDK ToolResultPart.
 * Defensive: handles missing/malformed toolResult gracefully.
 */
function convertToolResponse(content: GooseToolResponseContent, audience: Audience): ToolResultPart | null {
  try {
    const resultText = extractToolResultText(content?.toolResult?.value?.content, audience);
    
    return {
      type: 'tool-result',
      toolCallId: content?.id || generateId(),
      toolName: 'unknown', // Goose doesn't include tool name in response
      output: {
        type: 'text',
        value: resultText,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Converts a Goose assistant message to an AI SDK AssistantModelMessage.
 * Defensive: handles missing/malformed message content gracefully.
 */
function convertAssistantMessage(message: GooseMessage, audience: Audience): AssistantModelMessage | null {
  try {
    const content: (TextPart | ToolCallPart)[] = [];

    if (!message?.content || !Array.isArray(message.content)) {
      return null;
    }

    for (const item of message.content) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      
      if (!shouldIncludeForAudience(item, audience)) {
        continue;
      }

      if (item.type === 'text' && 'text' in item && item.text) {
        content.push(convertTextContent(item as GooseTextContent));
      } else if (item.type === 'toolRequest' && 'toolCall' in item) {
        const toolCall = convertToolRequest(item as GooseToolRequestContent);
        if (toolCall) {
          content.push(toolCall);
        }
      }
    }

    if (content.length === 0) {
      return null;
    }

    return {
      role: 'assistant',
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Converts a Goose user message to AI SDK messages.
 * User messages in Goose can contain tool responses, which become ToolModelMessage in AI SDK,
 * or text content which becomes UserModelMessage.
 * Defensive: handles missing/malformed message content gracefully.
 */
function convertUserMessage(message: GooseMessage, audience: Audience): ModelMessage[] {
  try {
    const messages: ModelMessage[] = [];
    const textParts: TextPart[] = [];
    const toolResults: ToolResultPart[] = [];

    if (!message?.content || !Array.isArray(message.content)) {
      return [];
    }

    for (const item of message.content) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      
      if (!shouldIncludeForAudience(item, audience)) {
        continue;
      }

      if (item.type === 'text' && 'text' in item && item.text) {
        textParts.push(convertTextContent(item as GooseTextContent));
      } else if (item.type === 'toolResponse' && 'toolResult' in item) {
        const result = convertToolResponse(item as GooseToolResponseContent, audience);
        if (result) {
          toolResults.push(result);
        }
      }
    }

    // Add text content as UserModelMessage
    if (textParts.length > 0) {
      const userMessage: UserModelMessage = {
        role: 'user',
        content: textParts,
      };
      messages.push(userMessage);
    }

    // Add tool results as ToolModelMessage
    if (toolResults.length > 0) {
      const toolMessage: ToolModelMessage = {
        role: 'tool',
        content: toolResults,
      };
      messages.push(toolMessage);
    }

    return messages;
  } catch {
    return [];
  }
}

/**
 * Converts a single Goose message to AI SDK ModelMessage(s).
 * May return multiple messages since Goose combines tool results with user messages.
 * Defensive: handles missing/malformed messages gracefully.
 */
export function convertGooseMessage(message: GooseMessage, audience: Audience): ModelMessage[] {
  try {
    if (!message || typeof message !== 'object') {
      return [];
    }
    
    if (message.role === 'assistant') {
      const converted = convertAssistantMessage(message, audience);
      return converted ? [converted] : [];
    } else if (message.role === 'user') {
      return convertUserMessage(message, audience);
    }
    
    // Unknown role, skip
    return [];
  } catch {
    return [];
  }
}

/**
 * Converts an array of Goose messages to AI SDK ModelMessage format.
 * Filters content by audience and removes empty messages.
 * Defensive: handles missing/malformed messages array gracefully.
 */
export function convertGooseMessages(messages: GooseMessage[], audience: Audience): ModelMessage[] {
  try {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    const result: ModelMessage[] = [];

    for (const message of messages) {
      const converted = convertGooseMessage(message, audience);
      result.push(...converted);
    }

    return result;
  } catch {
    return [];
  }
}
