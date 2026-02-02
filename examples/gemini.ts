import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function geminiExample() {
  console.log('=== Gemini 3 Pro Preview ===\n');

  // Use the full provider/org/model format
  const model = goose('google/gemini-3-pro-preview');

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
