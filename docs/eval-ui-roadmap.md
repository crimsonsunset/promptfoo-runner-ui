# Eval UI Roadmap - Simple Run Configurator

**Last Updated:** January 16, 2026

## Overview

Build a minimal single-page UI for configuring and executing Promptfoo evaluations. Users select run type, configure options, execute, and view the generated HTML report. No need to reinvent the results viewer - just leverage the HTML reports we already generate.

---

## Core Principle

**Keep it simple:** One form page + existing HTML reports = 90% of the value with 10% of the complexity.

---

## Phase 1: MVP - Single Page Form (1-2 days)

### Goal
Replace `npm run eval:run -- <command>` with a web form.

### Features

#### Run Type Selector
Dropdown with options:
- `smoke` - Quick test (5 tests, fastest model)
- `model` - All tests against one model
- `full` - Full suite (all tests, all models)
- `pattern` - Filter tests by description
- `first` - Run first N tests
- `retry` - Retry failures from last run

#### Dynamic Form Fields
Form fields change based on selected run type:

**smoke:**
- No additional fields needed

**model:**
- Model dropdown: `xiaomi`, `gemini`, `gpt-oss-20b`, `gpt-oss-120b`

**full:**
- No additional fields needed

**pattern:**
- Text input for regex pattern

**first:**
- Number input for count
- Optional: Model dropdown

**retry:**
- No additional fields needed

#### Options (Checkboxes)
- `--no-cache` - Force fresh API calls
- `--verbose` - Extra logging
- `--no-html` - Skip HTML report generation

#### Execute Button
- Shows estimated test count and model count
- Displays warning for `full` runs (236 evaluations)
- Disabled while eval is running

#### Progress Indicator
- Show spinner during execution
- Stream terminal output in collapsible section
- Show elapsed time

#### Results Summary
When complete, show:
- Pass rate percentage
- Total tests / passed / failed
- Model breakdown
- Link to open HTML report
- Button to run another eval

---

## Technical Architecture

### Stack
**SvelteKit + DaisyUI + Superforms + Zod**
- **Framework**: SvelteKit (SSR, form actions, progressive enhancement)
- **Styling**: DaisyUI with garden theme (lightweight, CSS-only components)
- **Form Handling**: Superforms (server + client validation, type-safe)
- **Validation**: Zod (schema validation, type inference)

### Backend
```
- Node.js/TypeScript
- Spawn `tsx scripts/run-eval.ts` as child process
- Stream stdout/stderr to client (WebSockets or SSE)
- Parse output.json for summary
- Serve HTML reports
```

### File Structure (Proposed)
```
scripts/
└── run-eval.ts            # CLI runner (already built)

tests/llm-evals/
├── promptfoo.config.ts    # Promptfoo config (user provides)
├── prompts.ts             # System prompts (user provides)
└── reports/               # Generated HTML reports

[frontend TBD]/
├── pages or routes/
│   └── index              # Main UI page
├── components/
│   ├── RunTypeSelector    # Dropdown for run types
│   ├── DynamicFormFields  # Conditional form fields
│   ├── ExecuteButton      # Run button with state
│   ├── ProgressDisplay    # Loading + terminal output
│   └── ResultsSummary     # Pass/fail summary + link
└── api or server/
    └── execute-eval       # Endpoint to spawn run-eval.ts
```

### Data Flow
```
1. User selects run type → form fields update
2. User fills options → form validates
3. User clicks Execute → API/Server Action spawns run-eval.ts
4. Child process streams output → UI updates in real-time
5. Process completes → Parse output.json + HTML path
6. Display summary → Link to open HTML report
```

---

## Implementation Status

### ✅ Completed
- [x] CLI runner script (`run-eval.ts`)
- [x] HTML report generation
- [x] All run types working (smoke, model, full, pattern, first, retry)
- [x] Dry-run preview
- [x] Report management commands

### 🔜 To Build
- [x] Frontend framework selection (SvelteKit + DaisyUI + Superforms)
- [x] Web UI for run configuration
- [x] Form actions for executing evals
- [ ] Real-time progress streaming (future enhancement)
- [x] Results display component
- [x] Report viewing integration

---

## Design Mockup (Text-based)

```
┌─────────────────────────────────────────────────────┐
│  🧪 LLM Evaluation Runner                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Run Type: [Smoke Test ▼]                         │
│                                                     │
│  Options:                                          │
│  □ Force fresh API calls (--no-cache)             │
│  □ Extra logging (--verbose)                      │
│  □ Skip HTML report (--no-html)                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Estimated:                                   │  │
│  │ • Tests: 5                                   │  │
│  │ • Models: 1 (xiaomi/mimo-v2-flash:free)     │  │
│  │ • Time: ~25 seconds                          │  │
│  │ • Cost: Free                                 │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [▶ Run Evaluation]  [👁 Preview (Dry Run)]        │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Recent Reports:                                    │
│  • eval-smoke-2026-01-16_14-30-45.html (85% pass) │
│  • eval-model-gemini-2026-01-16_13-02-12.html...  │
│  • eval-full-2026-01-15_16-45-33.html (78% pass)  │
└─────────────────────────────────────────────────────┘
```

**During Execution:**
```
┌─────────────────────────────────────────────────────┐
│  🧪 Running Evaluation... ⏱ 12s                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━      ] 75%           │
│                                                     │
│  ▼ Terminal Output                                 │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🧪 Running LLM Evaluations                   │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │  │
│  │ Mode:     Quick test                         │  │
│  │ Tests:    5                                   │  │
│  │ Models:   1 (xiaomi/mimo-v2-flash:free)     │  │
│  │ Cache:    Enabled                            │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │  │
│  │                                              │  │
│  │ Starting evaluation...                       │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [⏹ Cancel]                                        │
└─────────────────────────────────────────────────────┘
```

**After Completion:**
```
┌─────────────────────────────────────────────────────┐
│  ✓ Evaluation Complete                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Results:                                          │
│  ┌─────────────────────────────────────────────┐  │
│  │ Pass Rate: 85% (17/20 passed)               │  │
│  │                                              │  │
│  │ Model Results:                               │  │
│  │ ✓ xiaomi/mimo-v2-flash:free                 │  │
│  │   • 17/20 passed                            │  │
│  │   • 12,543 tokens used                      │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  [📊 Open HTML Report]  [🔄 Run Another]           │
└─────────────────────────────────────────────────────┘
```

---

## Key Decisions

### Why NOT build a results viewer?
- **HTML reports are already great** - Interactive, filterable, sortable
- **Don't reinvent the wheel** - Promptfoo spent time making good UI
- **Faster to MVP** - Focus on the config pain point
- **Less maintenance** - One less thing to keep in sync

### Why spawn run-eval.ts vs direct promptfoo CLI?
- **Reuse logic** - All the filtering, validation already built
- **Consistent behavior** - Same output as CLI usage
- **HTML reports** - Already integrated in run-eval.ts
- **Error handling** - Already handles edge cases

---

## Success Criteria

### MVP is successful if:
- [ ] Can execute all run types from UI
- [ ] Progress is visible during execution
- [ ] HTML report opens automatically (or provides link)
- [ ] Faster than typing CLI commands
- [ ] Works across different platforms

---

## Time Estimate

**MVP (Phase 1):** 1-2 days (depends on framework choice)
**Phase 2 (Polish):** 1 day  
**Phase 3 (History):** 1 day

**Total:** ~3-4 days of focused work

---

## Next Steps

1. Choose frontend stack
2. Set up project structure
3. Build basic form UI
4. Create API endpoint for executing evals
5. Implement real-time progress streaming
6. Build results display
7. Test and iterate

---

## Open Questions

- [x] What frontend framework to use? **SvelteKit + DaisyUI + Superforms**
- [ ] How to handle authentication (if any)? (Not needed for MVP)
- [x] Should it be a local-only tool or deployable web app? **Local-only for MVP**
- [ ] How to handle concurrent eval executions? (Future enhancement - queue system)
- [x] Should we bundle promptfoo or require it as peer dependency? **Peer dependency**
