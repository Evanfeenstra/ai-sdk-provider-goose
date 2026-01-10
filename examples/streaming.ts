import { goose } from '../src/index.js';
import { streamText } from 'ai';

export async function streamingExample() {
  console.log('=== Streaming Text Generation ===\n');

  const model = goose('anthropic/claude-sonnet-4-5');

  try {
    const result = streamText({
      model,
      prompt: 'Count from 1 to 5.',
    });

    console.log('Streaming response:');
    for await (const textPart of result.textStream) {
      process.stdout.write(textPart);
    }
    console.log('\n');

    console.log('Final usage:', await result.usage);
    console.log('Finish reason:', await result.finishReason);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  streamingExample().catch(console.error);
}
