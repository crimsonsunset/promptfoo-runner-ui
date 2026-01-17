# Refactoring Suggestions & Code Quality Improvements

This document contains additional refactoring suggestions beyond the critical security, process management, and state management fixes that have been implemented.

---

## 🔴 **CRITICAL Issues** (Already Addressed)

✅ **Issue #1: Security - Exposed Credentials Risk** - FIXED
✅ **Issue #4: Process Management Anti-Pattern** - FIXED  
✅ **Issue #5: State Management Chaos** - FIXED

---

## 🟠 **HIGH Priority Issues**

### 6. **Code Duplication - Massive DRY Violation**

**Problem:**
- Model display names defined in **4 different places**:
  - `+page.svelte` (lines 160-167)
  - `+page.server.ts` (lines 18-23)
  - `run-eval.ts` (lines 27-39)
  - `promptfoo.config.ts` (providers array)
- Parsing logic duplicated between server and script
- **Impact**: Maintenance nightmare, high bug risk when updating models

**Solution:**
1. Create `src/lib/constants/models.ts`:
   ```typescript
   export const MODEL_OPTIONS = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'] as const;
   
   export const MODEL_DISPLAY_NAMES: Record<string, string> = {
     xiaomi: 'xiaomi/mimo-v2-flash:free',
     gemini: 'google/gemini-2.0-flash-exp:free',
     'gpt-oss-20b': 'openai/gpt-oss-20b:free',
     'gpt-oss-120b': 'openai/gpt-oss-120b:free'
   };
   
   export const MODEL_PROVIDERS = [
     'openrouter:xiaomi/mimo-v2-flash:free',
     'openrouter:google/gemini-2.0-flash-exp:free',
     'openrouter:openai/gpt-oss-20b:free',
     'openrouter:openai/gpt-oss-120b:free'
   ];
   ```

2. Update all files to import from this single source
3. Extract parsing logic into shared utility functions

---

### 7. **Type Safety Issues**

**Problem:**
- Excessive `any` type assertions throughout:
  - `evalFormSchema as any` (multiple files)
  - `(form.errors as any)[field]` pattern repeated
  - `zodClient(evalFormSchema as any)` - line 24 of +page.svelte
- Unsafe type casting in run-eval.ts (lines 276-288 with eslint-disable comments)
- **Impact**: Defeats TypeScript's purpose, runtime errors likely

**Solution:**
1. Fix Zod schema types properly - ensure `evalFormSchema` is properly typed
2. Create proper error type for form errors:
   ```typescript
   type FormErrors = Record<string, string[]>;
   ```
3. Remove all `as any` casts and fix underlying type issues
4. Enable stricter TypeScript settings in `tsconfig.json`

---

### 8. **No Error Handling Architecture**

**Problem:**
- Generic error messages: "Failed to execute evaluation"
- No error boundaries in Svelte components
- Silent failures in preview loading (line 126-128)
- Child process errors not properly surfaced to user
- **Impact**: Poor UX, hard to debug production issues

**Solution:**
1. Create error handling utility:
   ```typescript
   // src/lib/utils/error-handling.ts
   export class EvaluationError extends Error {
     constructor(
       message: string,
       public code: string,
       public details?: unknown
     ) {
       super(message);
       this.name = 'EvaluationError';
     }
   }
   ```

2. Add error boundaries in Svelte components
3. Create error display component for consistent error UI
4. Add error logging/monitoring integration points
5. Surface specific error types to users (timeout, API error, validation error, etc.)

---

### 9. **Hard-coded Business Logic**

**Problem:**
- Test count estimates hard-coded (line 255: `testCount = 236`)
- Time estimates arbitrary (5s per test everywhere)
- Model-specific knowledge scattered
- **Impact**: Brittle, breaks when config changes

**Solution:**
1. Move all estimates to `app.config.ts` (partially done)
2. Calculate test counts dynamically from actual config
3. Create estimation utilities:
   ```typescript
   // src/lib/utils/estimations.ts
   export function estimateTestCount(runType: RunType, config: TestConfig): number {
     // Calculate from actual test config
   }
   ```

---

### 10. **Poor Separation of Concerns**

**Problem:**
- Server action does both validation AND execution
- run-eval.ts is 694 lines doing everything
- Component has business logic mixed with UI
- **Impact**: Hard to test, maintain, extend

**Solution:**
1. Extract evaluation logic into service layer:
   ```typescript
   // src/lib/server/services/evaluation.service.ts
   export class EvaluationService {
     async runEvaluation(config: EvalConfig): Promise<EvalResult> {}
     async getPreview(config: EvalConfig): Promise<EvalPreview> {}
   }
   ```

2. Split run-eval.ts into smaller modules:
   - `commands/` - Command parsing and building
   - `execution/` - Process execution
   - `parsing/` - Output parsing
   - `reporting/` - Report generation

3. Move business logic out of components into hooks/services

---

## 🟡 **MEDIUM Priority Issues**

### 11. **No Loading/Progress Feedback**

**Problem:**
- Long-running evals (30min) have minimal feedback
- `isLoadingPreview` boolean insufficient (line 73)
- No percentage complete, ETA updates, or cancellation
- **Impact**: Poor UX, users don't know if app is working

**Solution:**
1. Implement WebSocket or Server-Sent Events for real-time updates
2. Add progress tracking:
   ```typescript
   interface EvaluationProgress {
     totalTests: number;
     completedTests: number;
     currentTest: string;
     elapsedTime: number;
     estimatedTimeRemaining: number;
   }
   ```

3. Add progress bar component
4. Show current test being executed
5. Add cancellation support (partially done with evalManager)

---

### 12. **Validation Logic Split Incorrectly**

**Problem:**
- Schema validation in one place (`eval-form.ts`)
- Custom validation in another (`validateEvalForm`)
- Client-side validation doesn't match server
- **Impact**: Confusing errors, validation bypassed easily

**Solution:**
1. Consolidate all validation into Zod schema using refinements:
   ```typescript
   export const evalFormSchema = z.object({
     runType: z.enum([...]),
     modelName: z.string().optional().refine(...),
     // Use .refine() or .superRefine() for complex validation
   });
   ```

2. Remove `validateEvalForm` function - use Zod only
3. Ensure client and server use same schema

---

### 13. **Inefficient Preview System**

**Problem:**
- Spawns entire tsx process for preview (dry-run)
- Preview updates on every form change (no debouncing) - **FIXED**
- Parses output with string manipulation instead of structured data
- **Impact**: Slow, wasteful, flaky

**Solution:**
1. Cache preview results based on form state hash
2. Load test config directly instead of spawning process:
   ```typescript
   // Load config directly from promptfoo.config.ts
   import config from '../../promptfoo.config.js';
   ```

3. Parse config structure directly instead of CLI output
4. Add preview result caching with TTL

---

### 14. **No Caching Strategy**

**Problem:**
- Repeated file reads without caching
- Config loaded fresh every time
- Reports list rebuilt on every request
- **Impact**: Unnecessary I/O, slower than needed

**Solution:**
1. Add in-memory cache for config loading
2. Cache reports list with file watcher for invalidation
3. Use SvelteKit's built-in caching where applicable
4. Add cache headers for static assets

---

### 15. **Test Configuration Not Normalized**

**Problem:**
- Parsing both structured (Venue:/User says:) and generic prompts
- Complex string parsing in `parseDryRunOutput` (lines 150-229)
- No schema for test format
- **Impact**: Fragile parsing, breaks with prompt changes

**Solution:**
1. Define TypeScript interfaces for test structure
2. Use structured data from promptfoo config instead of parsing CLI output
3. Create test parser utility with proper error handling
4. Add validation for test structure

---

## 🟢 **LOWER Priority (Still Important)**

### 16. **Missing Modern Patterns**

**Problem:**
- No request deduplication
- No optimistic updates
- No streaming responses for long operations
- No WebSocket consideration for real-time updates

**Solution:**
- Implement request deduplication for preview calls
- Add optimistic UI updates
- Consider streaming for long-running evaluations
- Evaluate WebSocket for real-time progress

---

### 17. **Accessibility Issues**

**Problem:**
- No ARIA labels on form controls
- Loading states don't announce to screen readers
- Keyboard navigation not tested
- Color-only status indicators

**Solution:**
- Add ARIA labels to all form controls
- Use `aria-live` regions for dynamic content
- Test keyboard navigation
- Add text labels alongside color indicators
- Ensure proper focus management

---

### 18. **No Testing Infrastructure**

**Problem:**
- Zero unit tests
- No integration tests
- No E2E tests
- Architecture doesn't support testing

**Solution:**
- Set up Vitest for unit tests
- Add Playwright for E2E tests
- Create test utilities and fixtures
- Add CI/CD test pipeline
- Write tests for critical paths (evaluation flow, validation, etc.)

---

### 19. **Build/Deploy Concerns**

**Problem:**
- adapter-node and adapter-auto both in deps (line 33-34 package.json)
- No build validation
- No health check endpoints
- No production environment variables documented

**Solution:**
- Remove unused adapter
- Add build validation script
- Create `/health` endpoint
- Document production environment setup
- Add deployment checklist

---

### 20. **Documentation Gaps**

**Problem:**
- No JSDoc on most functions
- Type exports not documented
- API contract between client/server unclear
- No architecture diagram

**Solution:**
- Add JSDoc to all public functions
- Document type exports
- Create API documentation
- Add architecture diagram
- Document data flow

---

### 21. **UI/UX Polish Needed**

**Problem:**
- Hard-coded emojis in UI strings
- No dark mode consideration (using DaisyUI but not leveraging themes)
- Reset button behavior confusing (two reset functions) - **FIXED**
- No confirmation on long-running operations

**Solution:**
- Extract emojis to constants or remove
- Implement dark mode toggle
- Add confirmation dialogs for destructive/long-running actions
- Improve loading states and transitions
- Add toast notifications for success/error

---

### 22. **Package Management**

**Problem:**
- `dotenv` in regular deps but only used in dev script
- `promptfoo` in devDeps but needed at runtime
- Missing useful deps: lodash (per your style guide), zod refinements library

**Solution:**
- Move `dotenv` to devDependencies
- Move `promptfoo` to dependencies
- Add lodash if needed per style guide
- Review and optimize dependency tree

---

## 📋 **Implementation Priority**

### Phase 1: High Priority (Next Sprint)
1. Issue #6: Code Duplication (Model constants)
2. Issue #7: Type Safety (Remove `as any`)
3. Issue #8: Error Handling Architecture
4. Issue #12: Validation Consolidation

### Phase 2: Medium Priority
5. Issue #9: Hard-coded Logic
6. Issue #10: Separation of Concerns
7. Issue #11: Progress Feedback
8. Issue #13: Preview System Optimization

### Phase 3: Polish & Quality
9. Issue #14: Caching Strategy
10. Issue #15: Test Configuration Normalization
11. Issue #17: Accessibility
12. Issue #21: UI/UX Polish

### Phase 4: Infrastructure
13. Issue #18: Testing Infrastructure
14. Issue #19: Build/Deploy Concerns
15. Issue #20: Documentation
16. Issue #22: Package Management

---

## 🎯 **Quick Wins**

These can be done quickly for immediate improvement:

1. **Create model constants file** → Consolidate all model definitions (30 min)
2. **Remove `as any`** → Fix type definitions properly (1-2 hours)
3. **Add JSDoc comments** → Document public APIs (1 hour)
4. **Extract validation** → Single source of truth in Zod schema (1 hour)
5. **Add error types** → Create proper error classes (30 min)

---

## 📝 **Notes**

- All suggestions are independent and can be implemented incrementally
- Some improvements may require breaking changes - plan migration path
- Consider user impact when implementing changes
- Test thoroughly after each refactoring phase
- Update documentation as you go
