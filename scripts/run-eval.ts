#!/usr/bin/env tsx

/**
 * LLM Evaluation Runner
 * 
 * Simplified interface for running promptfoo evaluations with multiple modes.
 * Abstracts away promptfoo CLI complexity.
 */

import { spawn, exec } from 'child_process';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const EVALS_DIR = join(PROJECT_ROOT, 'tests/llm-evals');
const REPORTS_DIR = join(EVALS_DIR, 'reports');

// Load .env
loadEnv({ path: join(PROJECT_ROOT, '.env') });

// Model name mappings
const MODEL_MAP: Record<string, string> = {
  xiaomi: 'xiaomi',
  gemini: 'gemini',
  'gpt-oss-20b': 'gpt-oss-20b',
  'gpt-oss-120b': 'gpt-oss-120b',
};

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  xiaomi: 'xiaomi/mimo-v2-flash:free',
  gemini: 'google/gemini-2.0-flash-exp:free',
  'gpt-oss-20b': 'openai/gpt-oss-20b:free',
  'gpt-oss-120b': 'openai/gpt-oss-120b:free',
};

const ALL_MODELS = ['xiaomi', 'gemini', 'gpt-oss-20b', 'gpt-oss-120b'];

interface CommandConfig {
  filters: string[];
  description: string;
  testCount: number | 'all';
  modelCount: number;
  models: string[];
  htmlOutput?: string; // Path to HTML report
}

/**
 * Parse CLI arguments
 */
function parseArgs(): {
  command: string;
  args: string[];
  flags: {
    dryRun: boolean;
    noCache: boolean;
    verbose: boolean;
    noHtml: boolean;
  };
} {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: false,
    noCache: false,
    verbose: false,
    noHtml: false,
  };

  const commandArgs: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === 'dry-run') {
      flags.dryRun = true;
    } else if (arg === '--no-cache') {
      flags.noCache = true;
    } else if (arg === '--verbose' || arg === '-v') {
      flags.verbose = true;
    } else if (arg === '--no-html') {
      flags.noHtml = true;
    } else if (!arg.startsWith('--')) {
      commandArgs.push(arg);
    }

    i++;
  }

  return {
    command: commandArgs[0] || '',
    args: commandArgs.slice(1),
    flags,
  };
}

/**
 * Generate timestamp for report filename
 */
function generateTimestamp(): string {
  const now = new Date();
  return now
    .toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
}

/**
 * Generate HTML output path
 */
function generateHtmlPath(command: string, noHtml: boolean): string | undefined {
  if (noHtml) return undefined;

  // Ensure reports directory exists
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const timestamp = generateTimestamp();
  const sanitizedCommand = command.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return join(REPORTS_DIR, `eval-${sanitizedCommand}-${timestamp}.html`);
}

/**
 * Build command configuration based on parsed args
 */
function buildCommandConfig(
  command: string,
  args: string[],
  flags: { dryRun: boolean; noCache: boolean; verbose: boolean; noHtml: boolean }
): CommandConfig | null {
  const filters: string[] = [];
  let description = '';
  let testCount: number | 'all' = 'all';
  let models: string[] = ALL_MODELS;
  const htmlOutput = generateHtmlPath(command, flags.noHtml);

  switch (command) {
    case 'smoke':
      filters.push('--filter-first-n', '5');
      filters.push('--filter-providers', 'xiaomi');
      description = 'Quick smoke test - 5 tests, fastest model';
      testCount = 5;
      models = ['xiaomi'];
      break;

    case 'model':
      if (!args[0]) {
        console.error('❌ Error: Model name required');
        console.error('\nAvailable models:');
        ALL_MODELS.forEach((m) => console.error(`  • ${m}`));
        console.error(`\nExample: npm run eval:run -- model xiaomi`);
        process.exit(1);
      }

      const modelName = args[0].toLowerCase();
      if (!MODEL_MAP[modelName]) {
        console.error(`❌ Error: Unknown model "${args[0]}"`);
        console.error('\nAvailable models:');
        ALL_MODELS.forEach((m) => console.error(`  • ${m}`));
        console.error(`\nExample: npm run eval:run -- model ${ALL_MODELS[0]}`);
        process.exit(1);
      }

      filters.push('--filter-providers', MODEL_MAP[modelName]);
      description = `All tests against ${modelName}`;
      models = [modelName];
      break;

    case 'full':
      description = 'Full suite - all tests, all models';
      break;

    case 'pattern':
      if (!args[0]) {
        console.error('❌ Error: Pattern required');
        console.error('\nExample: npm run eval:run -- pattern "incomplete"');
        process.exit(1);
      }
      filters.push('--filter-pattern', args[0]);
      description = `Tests matching pattern '${args[0]}'`;
      break;

    case 'retry':
      const outputPath = join(EVALS_DIR, 'output.json');
      if (!existsSync(outputPath)) {
        console.error('❌ Error: No previous evaluation found');
        console.error(`Expected: ${outputPath}`);
        process.exit(1);
      }
      filters.push('--retry-errors');
      description = 'Retrying failures from last run';
      break;

    case 'first':
      if (!args[0] || isNaN(Number(args[0]))) {
        console.error('❌ Error: Number required');
        console.error('\nExample: npm run eval:run -- first 10');
        process.exit(1);
      }
      const count = Number(args[0]);
      filters.push('--filter-first-n', count.toString());
      description = `First ${count} tests`;
      testCount = count;

      // Check if model is also specified
      if (args[1] === 'model' && args[2]) {
        const modelName2 = args[2].toLowerCase();
        if (!MODEL_MAP[modelName2]) {
          console.error(`❌ Error: Unknown model "${args[2]}"`);
          process.exit(1);
        }
        filters.push('--filter-providers', MODEL_MAP[modelName2]);
        models = [modelName2];
        description += `, ${modelName2} model`;
      }
      break;

    case '':
      showUsage();
      process.exit(0);

    default:
      console.error(`❌ Error: Unknown command "${command}"`);
      showUsage();
      process.exit(1);
  }

  if (flags.noCache) {
    filters.push('--no-cache');
  }

  if (flags.verbose) {
    filters.push('-v');
  }

  // Add HTML output path if not disabled
  if (htmlOutput) {
    filters.push('--output', htmlOutput);
  }

  return {
    filters,
    description,
    testCount,
    modelCount: models.length,
    models,
    htmlOutput,
  };
}

/**
 * Load test configuration for dry-run
 */
async function loadTestConfig(): Promise<{
  tests: Array<{
    description: string;
    prompt: string;
    assertions: Array<{ description: string }>;
  }>;
  totalTests: number;
}> {
  // Dynamically import the config from project root
  const configPath = join(PROJECT_ROOT, 'promptfoo.config.ts');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const configModule = await import(`file://${configPath}`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const config = configModule.default;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const tests = config.tests.map((test: { description: string; vars?: { prompt?: string }; assert?: Array<{ type: string }> }) => ({
    description: test.description,
    prompt: test.vars?.prompt || '',
    assertions: test.assert?.map((a: { type: string }) => ({
      description: a.type === 'javascript' ? 'Custom assertion' : a.type,
    })) || [],
  }));

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tests,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    totalTests: tests.length as number,
  };
}

/**
 * Show dry-run preview
 */
async function showDryRun(config: CommandConfig): Promise<void> {
  const testConfig = await loadTestConfig();

  const filteredTests =
    config.testCount === 'all'
      ? testConfig.tests
      : testConfig.tests.slice(0, config.testCount);

  const estimatedTime = filteredTests.length * config.modelCount * 5; // 5s per test avg
  const estimatedTokens = filteredTests.length * config.modelCount * 1000; // ~1000 tokens per test

  console.log(`\nDRY RUN: ${config.description}`);
  console.log('━'.repeat(60));
  console.log('\nConfiguration');
  console.log(`  Tests:           ${filteredTests.length} of ${testConfig.totalTests}`);
  console.log(`  Models:          ${config.modelCount} (${config.models.map((m) => MODEL_DISPLAY_NAMES[m]).join(', ')})`);
  console.log(`  Cache:           ${config.filters.includes('--no-cache') ? 'Disabled' : 'Enabled'}`);
  console.log(`  Estimated Time:  ~${estimatedTime}s (5s per test avg)`);
  console.log(`  Estimated Cost:  $0.00 (free tier)`);
  console.log(`  Total Tokens:    ~${estimatedTokens.toLocaleString()} (est)`);
  console.log('\n' + '━'.repeat(60) + '\n');

  filteredTests.forEach((test, idx) => {
    console.log(`Test #${idx + 1}: "${test.description}"`);
    console.log('━'.repeat(60));

    // Show prompt preview
    const promptLines = test.prompt.split('\n');
    const venueLine = promptLines.find((l) => l.startsWith('Venue:'));
    const userLine = promptLines.find((l) => l.startsWith('User says:'));

    console.log('Prompt:');
    if (venueLine || userLine) {
      // Structured prompt with Venue/User says
      if (venueLine) {
        console.log(`  ${venueLine}`);
      }
      if (userLine) {
        console.log(`  ${userLine}`);
      }
    } else {
      // Generic prompt - show first few lines
      const previewLines = promptLines.slice(0, 3);
      previewLines.forEach(line => {
        const truncated = line.length > 80 ? line.substring(0, 77) + '...' : line;
        console.log(`  ${truncated}`);
      });
      if (promptLines.length > 3) {
        console.log(`  ... (${promptLines.length - 3} more lines)`);
      }
    }
    console.log(`  (${test.prompt.length} characters total)`);

    // Show assertions
    console.log(`\nAssertions (${test.assertions.length}):`);
    test.assertions.forEach((assert, aIdx) => {
      console.log(`  ${aIdx + 1}. ${assert.description}`);
    });

    console.log(`\nModels to test: ${config.models.map((m) => MODEL_DISPLAY_NAMES[m]).join(', ')}`);
    console.log('\n' + '━'.repeat(60) + '\n');
  });

  console.log('Ready to run? Execute without \'dry-run\' prefix\n');
}

/**
 * Show pre-execution banner
 */
function showPreExecutionBanner(config: CommandConfig): void {
  console.log('\n🧪 Running LLM Evaluations');
  console.log('━'.repeat(30));
  console.log(`Mode:     ${config.description}`);
  console.log(`Tests:    ${config.testCount === 'all' ? 'All' : config.testCount}`);
  console.log(`Models:   ${config.modelCount} (${config.models.map((m) => MODEL_DISPLAY_NAMES[m]).join(', ')})`);
  console.log(`Cache:    ${config.filters.includes('--no-cache') ? 'Disabled' : 'Enabled'}`);
  console.log('━'.repeat(30));
  console.log('\nStarting evaluation...\n');
}

/**
 * Execute promptfoo command
 */
function executePromptfoo(config: CommandConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ['eval', '-c', 'promptfoo.config.ts', ...config.filters];
    const child = spawn('npx', ['promptfoo', ...cmd], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      // Exit code 0 = success, 100 = success with test failures (normal)
      if (code === 0 || code === 100) {
        resolve();
      } else {
        reject(new Error(`promptfoo exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Open HTML report in browser
 */
function openHtmlReport(htmlPath: string): Promise<void> {
  return new Promise((resolve) => {
    const command =
      process.platform === 'darwin'
        ? `open "${htmlPath}"`
        : process.platform === 'win32'
          ? `start "${htmlPath}"`
          : `xdg-open "${htmlPath}"`;

    exec(command, (error) => {
      if (error) {
        console.log(`\n⚠️  Could not auto-open report: ${error.message}`);
        console.log(`Manually open: ${htmlPath}`);
      }
      resolve();
    });
  });
}

/**
 * List recent HTML reports
 */
function listRecentReports(limit = 5): string[] {
  if (!existsSync(REPORTS_DIR)) {
    return [];
  }

  const files = readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({
      name: f,
      path: join(REPORTS_DIR, f),
      stat: existsSync(join(REPORTS_DIR, f))
        ? readdirSync(REPORTS_DIR, { withFileTypes: true }).find((d) => d.name === f)
        : null,
    }))
    .sort((a, b) => {
      // Sort by filename (which includes timestamp)
      return b.name.localeCompare(a.name);
    })
    .slice(0, limit)
    .map((f) => f.path);

  return files;
}

/**
 * Parse and show results summary
 */
function showResultsSummary(htmlOutput?: string): void {
  const outputPath = join(EVALS_DIR, 'output.json');
  if (!existsSync(outputPath)) {
    console.log('\n⚠️  No output.json found - evaluation may have failed\n');
    return;
  }

  try {
    const outputData = readFileSync(outputPath, 'utf-8');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const output = JSON.parse(outputData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const results = output.results?.results || [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (results.length === 0) {
      console.log('\n⚠️  No results found\n');
      return;
    }

    // Group by provider
    interface ProviderResult {
      success?: boolean;
      error?: unknown;
      provider?: { id?: string };
      response?: { tokenUsage?: { total?: number } };
    }

    const byProvider: Record<string, ProviderResult[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    results.forEach((r: ProviderResult) => {
      const provider = r.provider?.id || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = [];
      }
      byProvider[provider].push(r);
    });

    // Calculate totals
    let totalPassed = 0;
    let totalFailed = 0;
    let totalErrors = 0;

    Object.values(byProvider).forEach((providerResults: ProviderResult[]) => {
      providerResults.forEach((r: ProviderResult) => {
        if (r.success) {
          totalPassed++;
        } else if (r.error) {
          totalErrors++;
        } else {
          totalFailed++;
        }
      });
    });

    const total = totalPassed + totalFailed + totalErrors;
    const passRate = total > 0 ? Math.round((totalPassed / total) * 100) : 0;

    console.log('\n✓ Evaluation Complete');
    console.log('━'.repeat(30));
    console.log(`Total Tests:  ${total}`);
    console.log(`Pass Rate:    ${passRate}% (${totalPassed}/${total} passed)`);
    if (totalFailed > 0) {
      console.log(`Failed:       ${totalFailed}`);
    }
    if (totalErrors > 0) {
      console.log(`Errors:       ${totalErrors}`);
    }

    console.log('\nModel Results:');
    Object.entries(byProvider).forEach(([provider, providerResults]) => {
      const passed = providerResults.filter((r: ProviderResult) => r.success).length;
      const failed = providerResults.filter((r: ProviderResult) => !r.success && !r.error).length;
      const errors = providerResults.filter((r: ProviderResult) => r.error).length;
      const total = providerResults.length;

      const status = errors > 0 ? '✗' : failed > 0 ? '⚠' : '✓';
      console.log(`  ${status} ${provider}`);
      console.log(`    • ${passed}/${total} passed`);

      // Try to get token usage from first result
      const firstResult = providerResults[0];
      if (firstResult?.response?.tokenUsage) {
        const tokens = firstResult.response.tokenUsage.total || 0;
        console.log(`    • ${tokens.toLocaleString()} tokens used`);
      }
    });

    console.log('\n━'.repeat(30));
    console.log('View Options:');
    if (htmlOutput && existsSync(htmlOutput)) {
      console.log(`  📊 HTML Report:  ${htmlOutput}`);
      console.log('  🌐 Open Report:  npm run eval:report');
    }
    console.log('  🔍 Web UI:       npm run eval:view');
    console.log(`  📄 JSON Output:  ${outputPath}`);
    console.log('');
  } catch {
    console.log('\n⚠️  Could not parse results summary');
    console.log(`View output:  ${outputPath}\n`);
  }
}

/**
 * Handle 'report' command to open latest HTML report
 */
async function handleReportCommand(): Promise<void> {
  const reports = listRecentReports(1);

  if (reports.length === 0) {
    console.log('\n❌ No HTML reports found');
    console.log('Generate a report first: npm run eval:run -- smoke\n');
    process.exit(1);
  }

  const latestReport = reports[0];
  console.log('\n📊 Opening latest report...');
  console.log(`   ${latestReport}\n`);

  await openHtmlReport(latestReport);
}

/**
 * Handle 'reports' command to list recent reports
 */
function handleReportsCommand(): void {
  const reports = listRecentReports(10);

  if (reports.length === 0) {
    console.log('\n❌ No HTML reports found');
    console.log('Generate a report first: npm run eval:run -- smoke\n');
    process.exit(0);
  }

  console.log('\n📊 Recent HTML Reports:');
  console.log('━'.repeat(60));
  reports.forEach((report, idx) => {
    const filename = report.split('/').pop();
    console.log(`${idx + 1}. ${filename}`);
  });
  console.log('\nTo open latest: npm run eval:report\n');
}

/**
 * Show usage help
 */
function showUsage(): void {
  console.log(`
Usage: npm run eval:run -- <command> [options]

Commands:
  smoke                   Quick test (5 tests, fastest model)
  model <name>            All tests against one model
  full                    Full suite (all tests, all models)
  pattern <regex>         Filter tests by description
  retry                   Retry failures from last run
  first <n>               Run first N tests
  first <n> model <name>  First N tests against one model
  dry-run <command>       Preview without executing
  reports                 List recent HTML reports
  report                  Open latest HTML report

Options:
  --no-cache             Force fresh API calls
  --no-html              Skip HTML report generation
  --verbose, -v          Extra logging

Examples:
  npm run eval:run -- smoke
  npm run eval:run -- model xiaomi
  npm run eval:run -- full --no-cache
  npm run eval:run -- dry-run smoke
  npm run eval:run -- pattern "incomplete"
  npm run eval:run -- first 10 model gemini
  npm run eval:run -- report
`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const { command, args, flags } = parseArgs();

  // Handle special commands
  if (command === 'report') {
    await handleReportCommand();
    return;
  }

  if (command === 'reports') {
    handleReportsCommand();
    return;
  }

  // Handle dry-run
  if (flags.dryRun) {
    const dryRunCommand = command || args[0];
    const dryRunArgs = command ? args : args.slice(1);
    const dryRunConfig = buildCommandConfig(dryRunCommand, dryRunArgs, {
      ...flags,
      dryRun: false,
    });

    if (!dryRunConfig) {
      process.exit(1);
    }

    await showDryRun(dryRunConfig);
    return;
  }

  // Handle regular execution
  const config = buildCommandConfig(command, args, flags);
  if (!config) {
    process.exit(1);
  }

  showPreExecutionBanner(config);

  try {
    await executePromptfoo(config);
    showResultsSummary(config.htmlOutput);

    // Auto-open HTML report if generated
    if (config.htmlOutput && existsSync(config.htmlOutput)) {
      console.log('Opening HTML report in browser...\n');
      await openHtmlReport(config.htmlOutput);
    }
  } catch (error) {
    console.error('\n❌ Evaluation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
