# AI SDK Provider for Goose CLI

![Goose Chat UI](examples/ui/static/ui.png)

An [AI SDK](https://sdk.vercel.ai) provider for the [Goose CLI](https://github.com/block/goose).

## Installation

```bash
npm install ai-sdk-provider-goose
```

## Usage

```typescript
import { goose } from "ai-sdk-provider-goose";
import { generateText } from "ai";

const result = await generateText({
  model: goose("goose"), // uses your locally configured goose
  prompt: "What is 2+2?",
});

console.log(result.text);
```

## Configuration

### Model Settings

```typescript
// Use provider/model format
const model = goose("anthropic/claude-sonnet-4-5", {
  sessionName: "my-session", // Optional session name
  resume: true, // Resume previous session
  maxTurns: 500, // Max turns without user input
});
```

### Custom Provider Instance

```typescript
import { createGoose } from "ai-sdk-provider-goose";

const customGoose = createGoose({
  binPath: "/path/to/goose", // Default: 'goose'
  timeout: 600000, // Default: 600000ms
  maxTurns: 100, // Default for all models
});

const model = customGoose("openai/gpt-4o");
```

### UI

`npm run ui`

### License

MIT
