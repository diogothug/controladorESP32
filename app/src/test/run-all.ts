
// === TEST RUNNER 2.0 ===
// Usage:
//   npx ts-node src/test/run-all.ts              - Run all tests
//   npx ts-node src/test/run-all.ts -v           - Verbose mode
//   npx ts-node src/test/run-all.ts -f "wifi"    - Filter by name
//   npx ts-node src/test/run-all.ts --report     - Generate HTML report
//   npx ts-node src/test/run-all.ts --fail-fast  - Stop on first failure

import { runTests, parseCliArgs } from './mini-test-framework';

// Import Test Suites
import './units/firmware-gen.test';
import './units/firmware-extra.test';
import './units/firmware-premium.test';
import './units/firmware-advanced.test';
import './units/firmware-integrations.test';
import './units/firmware-polish.test';
import './units/firmware-automation.test';
import './units/firmware-mock.test';
import './units/tide-visuals.test';

// Parse CLI args and run
const options = parseCliArgs();
runTests(options).catch(console.error);
