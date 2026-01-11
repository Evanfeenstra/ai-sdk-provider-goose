# AGENTS.md

AI SDK v6 provider that wraps the Goose CLI, enabling use of Goose through standard AI SDK interfaces (`generateText`, `streamText`).

## Structure

```
src/
  index.ts              # Main exports
  goose-provider.ts     # Provider factory (createGoose, goose)
  goose-language-model.ts # Core LanguageModelV3 implementation
  types.ts              # GooseProviderSettings, GooseModelSettings, GooseModels, etc.
  errors.ts             # Error utilities (APICallError wrappers)

examples/               # Usage examples (basic, streaming, tool-call, session)
test/                   # Vitest unit tests
```

## How It Works

1. User calls `goose(modelId, settings)` to get a language model
2. `doGenerate()` or `doStream()` spawns Goose CLI: `goose run --output-format stream-json -t "prompt" [--system "..."] [--name session] [--resume]`
3. Parses JSONL output from CLI into AI SDK stream parts
4. Returns results in AI SDK format

## Key Types

**GooseProviderSettings** - Provider-level configuration (passed to `createGoose`), extends `GooseModelSettings`:

- `binPath` - Path to goose binary (default: `'goose'`)
- `timeout` - Request timeout in ms (default: `600000`)
- `args` - Additional CLI arguments
- `logger` - Optional debug logger
- Plus all `GooseModelSettings` fields as defaults for all models

**GooseModelSettings** - Model-level configuration (passed per-model call):

- `sessionName` - Named session for conversation continuity
- `resume` - Resume existing session
- `env` - Environment variables for CLI
- `apiKey` - API key for the provider
- `maxTurns` - Maximum number of turns

**GooseModels** - Model shortcuts for common models (e.g., `GooseModels['claude-sonnet-4-5']`)

**GooseStreamEvent** - JSONL events from CLI: `message`, `complete`, `error`, `notification`

## Usage

```typescript
import { goose, GooseModels } from "ai-sdk-provider-goose";
import { generateText, streamText } from "ai";

// Use locally configured goose (no provider override)
const { text } = await generateText({
  model: goose("goose"),
  prompt: "Hello",
});

// Using provider/model format
const { text } = await generateText({
  model: goose("anthropic/claude-sonnet-4-5"),
  prompt: "Hello",
});

// Using model shortcuts
const { text } = await generateText({
  model: goose(GooseModels["gpt-4o"]),
  prompt: "Hello",
});

// With model settings
const model = goose("openai/gpt-4o", {
  sessionName: "my-session",
  resume: true,
  maxTurns: 500,
});

// Custom provider instance
import { createGoose } from "ai-sdk-provider-goose";

const customGoose = createGoose({
  binPath: "/custom/path/goose",
  timeout: 60000,
  maxTurns: 100,
});

const model = customGoose("google/gemini-2.5-pro");
```

## Supported Providers

- `anthropic` - Claude models (claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-5, etc.)
- `openai` - GPT models (gpt-4o, gpt-4o-mini, o1, o3, etc.)
- `google` - Gemini models (gemini-2.5-pro, gemini-2.5-flash, etc.)
- `xai` - Grok models (grok-3, grok-3-fast, grok-3-mini, etc.)
- `ollama` - Local models (qwen3, llama3.2, mistral, codellama, etc.)

## Commands

```bash
npm run build    # Build with tsup (ESM + CJS)
npm test         # Run vitest tests
npm run examples # Run all examples
npm run ui       # Run the UI
```
