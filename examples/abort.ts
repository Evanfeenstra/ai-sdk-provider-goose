import { goose } from '../src/index.js';
import { generateText, streamText } from 'ai';

export async function abortExample() {
  console.log('=== Abort Controller Example ===\n');

  try {
    // Example 1: Abort non-streaming generation
    console.log('Example 1: Aborting non-streaming generation after 2 seconds...');
    const controller1 = new AbortController();

    // Set timeout to abort after 2 seconds
    setTimeout(() => {
      console.log('Aborting request...');
      controller1.abort();
    }, 2000);

    try {
      const model1 = goose('goose');
      await generateText({
        model: model1,
        prompt: 'Write a very long story about a robot',
        abortSignal: controller1.signal,
      });
      console.log('Generation completed (not expected)');
    } catch (error) {
      console.log('Request was aborted:', error.message);
    }

    console.log();

    // Example 2: Abort streaming generation
    console.log('Example 2: Aborting streaming generation after 2 seconds...');
    const controller2 = new AbortController();

    // Set timeout to abort after 2 seconds
    setTimeout(() => {
      console.log('Aborting stream...');
      controller2.abort();
    }, 2000);

    try {
      const model2 = goose('goose');
      const result = streamText({
        model: model2,
        prompt: 'Count from 1 to 100 slowly',
        abortSignal: controller2.signal,
      });

      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
      }
      console.log('\nStream completed (not expected)');
    } catch (error) {
      console.log('\nStream was aborted:', error.message);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  abortExample().catch(console.error);
}
