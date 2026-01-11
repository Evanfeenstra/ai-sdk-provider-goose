import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Examples to exclude from "run all" (e.g., destructive or long-running)
const EXCLUDE_FROM_ALL = ['abort'];

interface ExampleModule {
  [key: string]: () => Promise<void>;
}

async function discoverExamples(): Promise<string[]> {
  const files = await readdir(__dirname);
  return files
    .filter((f) => f.endsWith('.ts') && f !== 'runner.ts')
    .map((f) => f.replace('.ts', ''))
    .sort();
}

async function runExample(name: string): Promise<void> {
  const modulePath = join(__dirname, `${name}.js`);
  const mod: ExampleModule = await import(modulePath);

  // Find the example function (e.g., basicExample, streamingExample)
  const fnName = Object.keys(mod).find((k) => k.endsWith('Example'));
  if (!fnName || typeof mod[fnName] !== 'function') {
    throw new Error(`No *Example function found in ${name}.ts`);
  }

  await mod[fnName]();
}

async function main() {
  const arg = process.argv[2];
  const examples = await discoverExamples();

  // Show help
  if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run example [name]\n');
    console.log('Available examples:');
    examples.forEach((e) => {
      const excluded = EXCLUDE_FROM_ALL.includes(e) ? ' (excluded from "all")' : '';
      console.log(`  ${e}${excluded}`);
    });
    console.log('\nRun all: npm run example');
    console.log('Run one: npm run example basic');
    return;
  }

  // Run specific example
  if (arg) {
    if (!examples.includes(arg)) {
      console.error(`Unknown example: ${arg}`);
      console.error(`Available: ${examples.join(', ')}`);
      process.exit(1);
    }
    await runExample(arg);
    return;
  }

  // Run all examples (excluding special ones)
  console.log('Running Goose CLI Provider Examples\n');
  console.log('='.repeat(50));
  console.log();

  const toRun = examples.filter((e) => !EXCLUDE_FROM_ALL.includes(e));

  for (const name of toRun) {
    try {
      await runExample(name);
      console.log('\n' + '='.repeat(50) + '\n');
    } catch (error) {
      console.error(`Example "${name}" failed:`, error);
      process.exit(1);
    }
  }

  console.log('All examples completed successfully!');
}

main().catch((error) => {
  console.error('Runner failed:', error);
  process.exit(1);
});
