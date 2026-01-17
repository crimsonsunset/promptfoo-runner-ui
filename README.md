# Promptfoo Runner UI

A simple web UI for configuring and running Promptfoo LLM evaluations.

## Status

**Work in Progress** - Currently just the CLI runner is functional. Web UI coming soon.

## What Works Now

### CLI Runner Script

The `run-eval.ts` script provides a simplified interface for running Promptfoo evals with multiple modes:

```bash
npm run eval:run -- smoke              # Quick 5-test smoke test
npm run eval:run -- model xiaomi       # All tests on one model
npm run eval:run -- full               # Full suite (all tests, all models)
npm run eval:run -- pattern "incomplete"  # Filter by pattern
npm run eval:run -- first 10           # First N tests
npm run eval:run -- retry              # Retry failures
npm run eval:run -- report             # Open latest HTML report
```

**Features:**
- Multiple run modes (smoke, model, full, pattern, first, retry)
- Automatic HTML report generation with timestamps
- Auto-open reports in browser after completion
- Dry-run preview mode
- Report management (list, open latest)
- Progress indicators and result summaries

## Setup

### Prerequisites

1. **Promptfoo config and test scenarios**
   - You need to provide your own `tests/llm-evals/promptfoo.config.ts`
   - You need to provide your own `tests/llm-evals/prompts.ts`
   - See [Promptfoo docs](https://www.promptfoo.dev/docs/getting-started/) for setup

2. **Environment variables**
   - Create `.env` file with your API keys:
     ```
     OPENROUTER_API_KEY=your_key_here
     ```

3. **Dependencies**
   ```bash
   npm install
   ```

### Installation

```bash
git clone <repo>
cd promptfoo-runner-ui
npm install
```

### Running Evals

```bash
# Smoke test
npm run eval:run -- smoke

# Test specific model
npm run eval:run -- model gemini

# Full suite
npm run eval:run -- full

# View latest report
npm run eval:report
```

## Project Structure

```
promptfoo-runner-ui/
├── docs/
│   └── eval-ui-roadmap.md     # Development roadmap
├── scripts/
│   └── run-eval.ts            # CLI runner (working)
├── tests/
│   └── llm-evals/
│       ├── promptfoo.config.ts  # Your config (not included)
│       ├── prompts.ts           # Your prompts (not included)
│       └── reports/             # Generated HTML reports
├── package.json
└── README.md
```

## What's Next

See [docs/eval-ui-roadmap.md](docs/eval-ui-roadmap.md) for the full development plan.

**Phase 1 - Web UI (Coming Soon):**
- Single-page form for run configuration
- Real-time progress display
- Results summary with links to HTML reports
- No framework chosen yet - TBD

## Contributing

This is a work in progress. The CLI runner is stable and working. The web UI is planned but not started yet.

## License

MIT
