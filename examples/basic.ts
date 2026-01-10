import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function basicExample() {
  console.log('=== Basic Text Generation ===\n');

  const model = goose('goose');

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
