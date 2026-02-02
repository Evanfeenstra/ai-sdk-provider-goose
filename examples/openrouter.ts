import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function openrouterExample() {
  console.log('=== OpenRouter (Kimi K2.5) ===\n');

  // Use the full provider/org/model format
  const model = goose('openrouter/moonshotai/kimi-k2.5');

  // Or use GooseModels shortcuts:
  // const model = goose(GooseModels['kimi-k2.5']);

  try {
    const result = await generateText({
      model,
      prompt: 'What is the capital of France? Answer in one sentence.',
    });

    console.log('Generated text:', result.text);
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
