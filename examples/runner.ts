import { basicExample } from './basic.js';
import { fullStreamTest } from './fullstream.js';
import { streamingExample } from './streaming.js';
import { sessionExample } from './session.js';
import { toolCallExample } from './tool-call.js';
import { haikuExample } from './haiku.js';

async function main() {
  console.log('Running Goose CLI Provider Examples\n');
  console.log('='.repeat(50));
  console.log();

  // Check for specific example argument
  const arg = process.argv[2];

  if (arg === 'haiku') {
    await haikuExample();
    return;
  }

  try {
    await basicExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await fullStreamTest();
    console.log('\n' + '='.repeat(50) + '\n');

    await streamingExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await sessionExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await toolCallExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await haikuExample();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

main();
