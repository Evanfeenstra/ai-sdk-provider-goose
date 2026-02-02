import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function gptExample() {
  console.log('=== GPT 5.1 Codex ===\n');

  // Use the full provider/org/model format
  const model = goose('openai/gpt-5.1-codex');

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
