/**
 * Standalone E2E Test Runner for Interstellar Gesture Experience
 * 
 * Executes all 4 test tiers:
 * - Tier 1: Feature Coverage (>=125 tests)
 * - Tier 2: Boundary & Corner Cases (>=125 tests)
 * - Tier 3: Cross-Feature Combinations (>=25 tests)
 * - Tier 4: Real-World Scenarios (>=5 tests)
 * 
 * Output: ANSI colored summary report, tier statistics, error traces, and exit code.
 */

import { setupTestEnvironment, teardownTestEnvironment, registeredSuites } from './e2e_harness.js';

// ANSI colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const MAGENTA = '\x1b[35m';

interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

async function runRunner() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   INTERSTELLAR GESTURE EXPERIENCE — E2E TEST RUNNER                   ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  setupTestEnvironment();

  // Dynamically import test suites to populate registeredSuites
  console.log(`${GRAY}Loading test suites...${RESET}`);
  const startTime = Date.now();

  try {
    await import('./tier1_features.test.js');
    await import('./tier2_boundaries.test.js');
    await import('./tier3_combinations.test.js');
    await import('./tier4_scenarios.test.js');
    await import('./milestone2_scenes.test.js');
    await import('./worker_m3_gestures.test.js');
    await import('./worker_m4_audio.test.js');
    await import('./milestone5_ui.test.js');
    await import('./milestone6_adversarial.test.js');
  } catch (loadErr: any) {
    console.error(`${RED}${BOLD}FATAL ERROR: Failed to load test suites:${RESET}`, loadErr);
    process.exit(1);
  }

  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  console.log(`${GRAY}Executing ${registeredSuites.length} test suites...\n${RESET}`);

  for (const suite of registeredSuites) {
    console.log(`${BOLD}${MAGENTA}▶ ${suite.name}${RESET}`);

    for (const test of suite.tests) {
      const testStart = Date.now();
      let passed = true;
      let error: Error | undefined;

      try {
        // Run beforeEach hooks
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }

        // Run test
        await test.fn();

        // Run afterEach hooks
        for (const hook of suite.afterEachHooks) {
          await hook();
        }
      } catch (err: any) {
        passed = false;
        error = err;
      }

      const durationMs = Date.now() - testStart;

      if (passed) {
        passedCount++;
        console.log(`  ${GREEN}✓${RESET} ${test.name} ${GRAY}(${durationMs}ms)${RESET}`);
      } else {
        failedCount++;
        console.log(`  ${RED}✗${RESET} ${BOLD}${test.name}${RESET} ${GRAY}(${durationMs}ms)${RESET}`);
        if (error) {
          console.log(`    ${RED}Error: ${error.message}${RESET}`);
          if (error.stack) {
            const stackLines = error.stack.split('\n').slice(1, 4).join('\n    ');
            console.log(`    ${GRAY}${stackLines}${RESET}`);
          }
        }
      }

      results.push({
        suiteName: suite.name,
        testName: test.name,
        passed,
        durationMs,
        error
      });
    }
    console.log('');
  }

  teardownTestEnvironment();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = passedCount + failedCount;

  // Breakdown by Tier
  const tierCounts: Record<string, { total: number; passed: number; failed: number }> = {
    'Tier 1: Feature Coverage': { total: 0, passed: 0, failed: 0 },
    'Tier 2: Boundary & Corner Cases': { total: 0, passed: 0, failed: 0 },
    'Tier 3: Cross-Feature Interactions': { total: 0, passed: 0, failed: 0 },
    'Tier 4: Real-World Scenarios': { total: 0, passed: 0, failed: 0 },
    'Other': { total: 0, passed: 0, failed: 0 }
  };

  for (const r of results) {
    let matchedTier = 'Other';
    for (const key of Object.keys(tierCounts)) {
      if (r.suiteName.includes(key) || (key.startsWith('Tier 1') && r.suiteName.includes('Tier 1')) ||
          (key.startsWith('Tier 2') && r.suiteName.includes('Tier 2')) ||
          (key.startsWith('Tier 3') && r.suiteName.includes('Tier 3')) ||
          (key.startsWith('Tier 4') && r.suiteName.includes('Tier 4'))) {
        matchedTier = key;
        break;
      }
    }
    tierCounts[matchedTier].total++;
    if (r.passed) tierCounts[matchedTier].passed++;
    else tierCounts[matchedTier].failed++;
  }

  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   TEST EXECUTION SUMMARY                                               ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`Total Suites:    ${registeredSuites.length}`);
  console.log(`Total Tests:     ${totalTests}`);
  console.log(`Passed:          ${GREEN}${passedCount}${RESET}`);
  console.log(`Failed:          ${failedCount > 0 ? RED : GREEN}${failedCount}${RESET}`);
  console.log(`Duration:        ${totalTime}s\n`);

  console.log(`${BOLD}Tier Breakdown:${RESET}`);
  for (const [tier, stats] of Object.entries(tierCounts)) {
    if (stats.total > 0) {
      const statusColor = stats.failed === 0 ? GREEN : RED;
      console.log(`  • ${tier.padEnd(38)}: ${statusColor}${stats.passed}/${stats.total} passed${RESET}`);
    }
  }

  if (failedCount > 0) {
    console.log(`\n${RED}${BOLD}FAILED TESTS (${failedCount}):${RESET}`);
    for (const r of results) {
      if (!r.passed) {
        console.log(`  - [${r.suiteName}] ${r.testName}: ${r.error?.message}`);
      }
    }
    console.log(`\n${RED}${BOLD}❌ E2E TEST RUN COMPLETED WITH FAILURES${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✨ ALL E2E TESTS PASSED SUCCESSFULLY (100% PASS RATE)${RESET}\n`);
    process.exit(0);
  }
}

runRunner();
