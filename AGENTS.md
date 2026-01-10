# AGENTS.md

AI SDK v6 provider that wraps the Goose CLI, enabling use of Goose through standard AI SDK interfaces (`generateText`, `streamText`).

## Structure

```
src/
  index.ts              # Main exports
  goose-provider.ts     # Provider factory (createGoose, goose)
  goose-language-model.ts # Core LanguageModelV3 implementation
  types.ts              # GooseSettings, GooseStreamEvent, etc.
  errors.ts             # Error utilities (APICallError wrappers)

examples/               # Usage examples (basic, streaming, tool-call, session)
test/                   # Vitest unit tests
```

## How It Works

1. User calls `goose('goose', settings)` to get a language model
2. `doGenerate()` or `doStream()` spawns Goose CLI: `goose run --output-format stream-json -t "prompt" [--system "..."] [--name session] [--resume]`
3. Parses JSONL output from CLI into AI SDK stream parts
4. Returns results in AI SDK format

## Key Types

**GooseSettings** - Configuration passed to provider/model:

- `binPath` - Path to goose binary (default: `'goose'`)
- `timeout` - Request timeout in ms (default: `120000`)
- `sessionName` - Named session for conversation continuity
- `resume` - Resume existing session
- `args` - Additional CLI arguments
- `env` - Environment variables for CLI
- `logger` - Optional debug logger

**GooseStreamEvent** - JSONL events from CLI: `message`, `complete`, `error`, `notification`

## Usage

```typescript
import { goose } from "ai-sdk-provider-goose";
import { generateText, streamText } from "ai";

// Basic
const { text } = await generateText({
  model: goose("goose"),
  prompt: "Hello",
});

// With settings
const model = goose("goose", {
  sessionName: "my-session",
  resume: true,
  timeout: 60000,
});
```

## Commands

```bash
npm run build    # Build with tsup (ESM + CJS)
npm test         # Run vitest tests
npm run examples # Run all examples
npm run ui       # Run the UI
```
