/**
 * Promptfoo Configuration
 * Simple example configuration for the UI
 */

import type { UnifiedConfig, TestCase } from 'promptfoo';
import { getOpenRouterApiKey } from './src/lib/utils/env-validation.js';
import { MODEL_PROVIDERS } from './src/lib/constants/models.constants.js';

// Sample test scenarios
const scenarios = [
  {
    title: 'Basic Greeting',
    userInput: 'Hello, how are you?',
    expectedContains: 'hello'
  },
  {
    title: 'Question Response',
    userInput: 'What is the capital of France?',
    expectedContains: 'Paris'
  },
  {
    title: 'Multi-turn Context',
    userInput: 'Tell me about cats',
    expectedContains: 'cat'
  },
  {
    title: 'Code Request',
    userInput: 'Write a hello world in Python',
    expectedContains: 'print'
  },
  {
    title: 'Math Question',
    userInput: 'What is 2 + 2?',
    expectedContains: '4'
  }
];

// Convert scenarios to promptfoo test format
const tests: TestCase[] = scenarios.map((scenario) => ({
  description: `${scenario.title}: "${scenario.userInput.substring(0, 50)}${scenario.userInput.length > 50 ? '...' : ''}"`,
  vars: {
    prompt: scenario.userInput
  },
  assert: [
    {
      type: 'javascript',
      value: `
        // Check if output is not empty
        return output && output.length > 0;
      `
    },
    {
      type: 'icontains',
      value: scenario.expectedContains
    }
  ]
}));

const config: UnifiedConfig = {
  description: 'Sample LLM Evaluations',

  prompts: ['{{prompt}}'],

  providers: MODEL_PROVIDERS,

  outputPath: './tests/llm-evals/output.json',

  defaultTest: {
    options: {
      provider: {
        config: {
          apiKey: getOpenRouterApiKey()
        }
      }
    }
  },

  tests
};

export default config;
