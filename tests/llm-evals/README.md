# Promptfoo Runner UI - Tests Directory

This directory is where your Promptfoo evaluation configuration should go.

## Required Files (You Need to Provide)

1. **`promptfoo.config.ts`** - Your Promptfoo configuration
2. **`prompts.ts`** - Your system prompts/instructions  
3. **Test scenarios** - Your test data (CSV, JSON, or inline in config)

## Setup Instructions

1. Copy your existing Promptfoo config files here, OR
2. Create new ones following the [Promptfoo docs](https://www.promptfoo.dev/docs/getting-started/)

### Example Structure

```
tests/llm-evals/
├── promptfoo.config.ts   # Your eval configuration
├── prompts.ts            # Your system prompts
├── scenarios/            # Your test data (optional)
├── reports/              # Generated HTML reports (auto-created)
└── output.json           # Latest eval results (auto-generated)
```

## Example promptfoo.config.ts

```typescript
export default {
  providers: [
    'openrouter:google/gemini-2.0-flash-exp:free',
    'openrouter:xiaomi/mimo-v2-flash:free',
  ],
  prompts: ['./prompts.ts'],
  tests: [
    {
      vars: { input: 'Hello' },
      assert: [{ type: 'contains', value: 'hi' }],
    },
  ],
};
```

See [Promptfoo configuration docs](https://www.promptfoo.dev/docs/configuration/guide/) for more details.

## Generated Files

The following files are auto-generated and gitignored:
- `output.json` - Latest eval results (JSON)
- `reports/*.html` - HTML reports with timestamps
- `.promptfoo/` - Promptfoo cache and database
