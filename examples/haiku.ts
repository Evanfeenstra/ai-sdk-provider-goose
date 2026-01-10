import { goose, GooseModels } from '../src/index.js';
import { generateText } from 'ai';

/**
 * Example using claude-haiku-4-5 model via the provider/model format.
 */
export async function haikuExample() {
  console.log('=== Haiku Model Example ===\n');
  console.log('Using: anthropic/claude-haiku-4-5\n');

  // Use the provider/model format directly
  // API key will be read from ANTHROPIC_API_KEY env var
  const model = goose('anthropic/claude-haiku-4-5', {
    maxTurns: 10,
  });

  // Or use the GooseModels shortcut:
  // const model = goose(GooseModels['claude-haiku-4-5'], { maxTurns: 10 });

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
