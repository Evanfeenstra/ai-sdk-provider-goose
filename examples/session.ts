import { goose } from '../src/index.js';
import { generateText } from 'ai';

export async function sessionExample() {
  console.log('=== Session Resumption Example ===\n');

  const sessionName = `test-session-${Date.now()}`;

  try {
    // First call - creates new session
    console.log('First call - creating new session with name:', sessionName);
    const model1 = goose('goose', { sessionName });
    const result1 = await generateText({
      model: model1,
      prompt: 'My name is Alice. Remember this.',
    });

    console.log('Response:', result1.text);
    console.log();

    // Second call - resumes session
    console.log('Second call - resuming session:', sessionName);
    const model2 = goose('goose', { sessionName, resume: true });
    const result2 = await generateText({
      model: model2,
      prompt: 'What is my name?',
    });

    console.log('Response:', result2.text);
    console.log();
    console.log('Goose remembered the name from the previous session!');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sessionExample().catch(console.error);
}
