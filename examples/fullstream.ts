import { goose } from '../src/index.js';
import { streamText } from 'ai';

export async function fullStreamTest() {
  console.log('=== Full Stream Test ===\n');

  const model = goose('anthropic/claude-sonnet-4-5');

  try {
    const result = streamText({
      model,
      prompt: 'Say hello in 3 words',
    });

    console.log('Testing fullStream (should not error):');
    for await (const part of result.fullStream) {
      console.log('part', JSON.stringify(part, null, 2));
    }
    console.log('\n✅ fullStream completed without errors!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}
