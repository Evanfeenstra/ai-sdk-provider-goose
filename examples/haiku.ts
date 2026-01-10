import { goose, MODELS } from '../src/index.js';
import { generateText } from 'ai';

/**
 * Example using claude-haiku-4-5 model via provider settings.
 * Demonstrates the new provider/model/apiKey configuration.
 */
export async function haikuExample() {
  console.log('=== Haiku Model Example ===\n');
  console.log('Available Anthropic models:', MODELS.anthropic);
  console.log('Using: claude-haiku-4-5\n');

  // Use the provider settings to configure Anthropic with Haiku model
  // API key will be read from ANTHROPIC_API_KEY env var if not provided
  const model = goose('goose', {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    // apiKey: process.env.ANTHROPIC_API_KEY, // optional - uses env var by default
    maxTurns: 10,
  });

  try {
    const result = await generateText({
      model,
      prompt: 'Write a haiku about programming. Just the haiku, nothing else.',
    });

    console.log('Generated haiku:\n');
    console.log(result.text);
    console.log('\nUsage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  haikuExample().catch(console.error);
}
