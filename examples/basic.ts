import { goose, GooseModels } from '../src/index.js';
import { generateText } from 'ai';

export async function basicExample() {
  console.log('=== Basic Text Generation ===\n');

  // Use the provider/model format
  const model = goose('anthropic/claude-sonnet-4-5');

  // Or use GooseModels shortcuts:
  // const model = goose(GooseModels['claude-sonnet-4-5']);

  try {
    const result = await generateText({
      model,
      prompt: 'What is 2+2? Answer in one word.',
    });

    console.log('Generated text:', result.text);
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  basicExample().catch(console.error);
}
