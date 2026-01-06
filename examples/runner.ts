import { basicExample } from './basic.js';
import { streamingExample } from './streaming.js';
import { sessionExample } from './session.js';

async function main() {
  console.log('Running Goose CLI Provider Examples\n');
  console.log('='.repeat(50));
  console.log();

  try {
    await basicExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await streamingExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await sessionExample();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

main();
