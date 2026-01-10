import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function toolCallExample() {
  console.log('=== Tool Call Example ===\n');

  const model = goose('anthropic/claude-sonnet-4-5');

  try {
    const result = await generateText({
      model,
      prompt: 'Read the README.md file and summarize it in one sentence.',
    });

    console.log('Result:', result.text);
    console.log('\nUsage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  toolCallExample().catch(console.error);
}
