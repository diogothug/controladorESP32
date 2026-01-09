
// ============================================================================
// TEST FRAMEWORK 2.1 — Apple Design Philosophy
// ============================================================================
//
// Design Principles:
// 1. SIMPLICITY     — API so intuitive it needs no documentation
// 2. BEAUTY         — Output that's a pleasure to read
// 3. RELIABILITY    — It just works, every time
// 4. PROGRESSIVE    — Simple by default, powerful when needed
// 5. ACCESSIBILITY  — Color-blind safe, screen-reader friendly
//
// ============================================================================

type TestFn = () => void | Promise<void>;

// === CONFIGURATION ===
interface Config {
    quiet: boolean;           // Minimal output
    verbose: boolean;         // Show all details
    filter: string | null;    // Filter tests by name
    bail: boolean;            // Stop on first failure
    timeout: number;          // Default timeout (ms)
    retries: number;          // Default retries
    report: boolean;          // Generate HTML report
    watch: boolean;           // Watch mode (future)
}

const config: Config = {
    quiet: false,
    verbose: false,
    filter: null,
    bail: false,
    timeout: 5000,
    retries: 0,
    report: false,
    watch: false
};

// === THEME (Apple-style) ===
const theme = {
    // Symbols that work in any terminal
    pass: '●',      // Filled circle
    fail: '○',      // Empty circle  
    skip: '◌',      // Dashed circle
    arrow: '→',
    bullet: '•',

    // Colors (ANSI)
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    white: '\x1b[37m',

    // Semantic
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    muted: '\x1b[90m'
};

// === INTERNAL STATE ===
interface TestCase {
    name: string;
    fn: TestFn;
    timeout?: number;
    retries?: number;
    skip?: boolean;
    only?: boolean;
}

interface Suite {
    name: string;
    tests: TestCase[];
    beforeAll?: TestFn;
    afterAll?: TestFn;
    beforeEach?: TestFn;
    afterEach?: TestFn;
}

interface Result {
    name: string;
    suite: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error?: string;
    attempts: number;
}

const suites: Suite[] = [];
let currentSuite: Suite | null = null;
let hasOnly = false;

// Store original console
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// === PRETTY PRINTING ===
function print(msg: string = '') {
    originalLog(msg);
}

function printc(color: string, msg: string) {
    originalLog(`${color}${msg}${theme.reset}`);
}

function formatDuration(ms: number): string {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(str: string, len: number): string {
    if (str.length <= len) return str;
    return str.slice(0, len - 1) + '…';
}

// === API: DESCRIBE / IT ===
export function describe(name: string, fn: () => void) {
    const suite: Suite = { name, tests: [] };
    currentSuite = suite;
    suites.push(suite);
    fn();
    currentSuite = null;
}

export function it(name: string, fn: TestFn) {
    if (!currentSuite) throw new Error(`it() must be inside describe()`);
    currentSuite.tests.push({ name, fn });
}

// Aliases — Apple loves consistency
export const test = it;

// Skip and Only
export function xit(name: string, fn: TestFn) {
    if (!currentSuite) throw new Error(`xit() must be inside describe()`);
    currentSuite.tests.push({ name, fn, skip: true });
}

export function fit(name: string, fn: TestFn) {
    if (!currentSuite) throw new Error(`fit() must be inside describe()`);
    currentSuite.tests.push({ name, fn, only: true });
    hasOnly = true;
}

it.skip = xit;
it.only = fit;
test.skip = xit;
test.only = fit;

// Lifecycle hooks
export function beforeAll(fn: TestFn) {
    if (currentSuite) currentSuite.beforeAll = fn;
}

export function afterAll(fn: TestFn) {
    if (currentSuite) currentSuite.afterAll = fn;
}

export function beforeEach(fn: TestFn) {
    if (currentSuite) currentSuite.beforeEach = fn;
}

export function afterEach(fn: TestFn) {
    if (currentSuite) currentSuite.afterEach = fn;
}

// === EXPECT — Fluent, Precise, Helpful ===
class AssertionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AssertionError';
    }
}

function fail(message: string): never {
    throw new AssertionError(message);
}

export function expect<T>(actual: T) {
    return {
        // Equality
        toBe(expected: T) {
            if (actual !== expected) {
                fail(`Expected ${theme.green}${JSON.stringify(expected)}${theme.reset} but got ${theme.red}${JSON.stringify(actual)}${theme.reset}`);
            }
        },

        toEqual(expected: T) {
            const a = JSON.stringify(actual);
            const e = JSON.stringify(expected);
            if (a !== e) {
                fail(`Objects not equal:\n  Expected: ${truncate(e, 100)}\n  Received: ${truncate(a, 100)}`);
            }
        },

        // Truthiness
        toBeTruthy() {
            if (!actual) fail(`Expected truthy, got ${JSON.stringify(actual)}`);
        },

        toBeFalsy() {
            if (actual) fail(`Expected falsy, got ${JSON.stringify(actual)}`);
        },

        toBeDefined() {
            if (actual === undefined || actual === null) {
                fail(`Expected defined value`);
            }
        },

        toBeUndefined() {
            if (actual !== undefined) {
                fail(`Expected undefined, got ${JSON.stringify(actual)}`);
            }
        },

        toBeNull() {
            if (actual !== null) {
                fail(`Expected null, got ${JSON.stringify(actual)}`);
            }
        },

        // Numbers
        toBeGreaterThan(n: number) {
            if (typeof actual !== 'number' || actual <= n) {
                fail(`Expected ${actual} > ${n}`);
            }
        },

        toBeLessThan(n: number) {
            if (typeof actual !== 'number' || actual >= n) {
                fail(`Expected ${actual} < ${n}`);
            }
        },

        toBeCloseTo(expected: number, precision: number = 2) {
            if (typeof actual !== 'number') fail(`Expected number`);
            const diff = Math.abs(actual - expected);
            const epsilon = Math.pow(10, -precision) / 2;
            if (diff > epsilon) {
                fail(`Expected ${actual} to be close to ${expected} (precision: ${precision})`);
            }
        },

        // Strings & Arrays
        toHaveLength(len: number) {
            const actualLen = (actual as any)?.length ?? -1;
            if (actualLen !== len) {
                fail(`Expected length ${len}, got ${actualLen}`);
            }
        },

        toContain(item: string | T) {
            if (typeof actual === 'string') {
                if (!actual.includes(item as string)) {
                    fail(`String missing: "${truncate(item as string, 50)}"\n  In: "${truncate(actual, 80)}"`);
                }
            } else if (Array.isArray(actual)) {
                if (!actual.includes(item)) {
                    fail(`Array missing: ${JSON.stringify(item)}`);
                }
            } else {
                fail(`toContain requires string or array`);
            }
        },

        toMatch(pattern: RegExp) {
            if (typeof actual !== 'string' || !pattern.test(actual)) {
                fail(`String does not match ${pattern}`);
            }
        },

        // Functions
        toThrow(expected?: string | RegExp) {
            if (typeof actual !== 'function') fail(`Expected function`);
            let threw = false;
            let error: any;
            try {
                (actual as Function)();
            } catch (e) {
                threw = true;
                error = e;
            }
            if (!threw) fail(`Expected function to throw`);
            if (expected) {
                const msg = error?.message || String(error);
                if (typeof expected === 'string' && !msg.includes(expected)) {
                    fail(`Expected error "${expected}", got "${msg}"`);
                }
                if (expected instanceof RegExp && !expected.test(msg)) {
                    fail(`Expected error matching ${expected}, got "${msg}"`);
                }
            }
        },

        // Object properties
        toHaveProperty(key: string, value?: any) {
            if (typeof actual !== 'object' || actual === null) {
                fail(`Expected object`);
            }
            if (!(key in (actual as object))) {
                fail(`Missing property: ${key}`);
            }
            if (value !== undefined && (actual as any)[key] !== value) {
                fail(`Property ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify((actual as any)[key])}`);
            }
        },

        // Negation
        not: {
            toBe(expected: T) {
                if (actual === expected) {
                    fail(`Expected not ${JSON.stringify(expected)}`);
                }
            },
            toEqual(expected: T) {
                if (JSON.stringify(actual) === JSON.stringify(expected)) {
                    fail(`Expected objects to differ`);
                }
            },
            toContain(item: string) {
                if (typeof actual === 'string' && actual.includes(item)) {
                    fail(`String should not contain "${item}"`);
                }
            },
            toBeDefined() {
                if (actual !== undefined && actual !== null) {
                    fail(`Expected undefined or null`);
                }
            },
            toThrow() {
                if (typeof actual !== 'function') fail(`Expected function`);
                try {
                    (actual as Function)();
                } catch {
                    fail(`Expected function not to throw`);
                }
            }
        },

        // Snapshot
        toMatchSnapshot(name: string) {
            const fs = require('fs');
            const path = require('path');
            const dir = path.resolve(__dirname, 'snapshots');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `${name}.snap.txt`);

            if (!fs.existsSync(file)) {
                fs.writeFileSync(file, actual);
                return; // New snapshot created
            }

            const expected = fs.readFileSync(file, 'utf8');
            if (actual !== expected) {
                fail(`Snapshot mismatch: ${name}\n  Expected: ${expected.length} chars\n  Received: ${(actual as string).length} chars`);
            }
        }
    };
}

// === TEST RUNNER ===
async function runTest(test: TestCase, suite: Suite): Promise<Result> {
    const start = performance.now();
    const maxAttempts = (test.retries ?? config.retries) + 1;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // beforeEach
            if (suite.beforeEach) await suite.beforeEach();

            // Run with timeout
            await Promise.race([
                test.fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), test.timeout ?? config.timeout)
                )
            ]);

            // afterEach
            if (suite.afterEach) await suite.afterEach();

            return {
                name: test.name,
                suite: suite.name,
                status: 'pass',
                duration: performance.now() - start,
                attempts: attempt
            };
        } catch (e: any) {
            lastError = e.message || String(e);
            if (attempt < maxAttempts && config.verbose) {
                print(`  ${theme.muted}↻ Retry ${attempt}/${maxAttempts - 1}${theme.reset}`);
            }
        }
    }

    return {
        name: test.name,
        suite: suite.name,
        status: 'fail',
        duration: performance.now() - start,
        error: lastError,
        attempts: maxAttempts
    };
}

function shouldRun(test: TestCase): boolean {
    if (test.skip) return false;
    if (hasOnly && !test.only) return false;
    if (config.filter && !test.name.toLowerCase().includes(config.filter.toLowerCase())) return false;
    return true;
}

export async function runTests(options: Partial<Config> = {}) {
    Object.assign(config, options);

    // Silence logs unless verbose
    if (!config.verbose) {
        console.log = () => { };
        console.warn = () => { };
        console.error = () => { };
    }

    const results: Result[] = [];
    const startTime = performance.now();
    let currentSuiteName = '';

    // Header
    print();
    printc(theme.bold, '  Tests');
    print();

    for (const suite of suites) {
        const testsToRun = suite.tests.filter(shouldRun);
        if (testsToRun.length === 0) continue;

        // Suite header (only if different)
        if (suite.name !== currentSuiteName) {
            print(`  ${theme.dim}${suite.name}${theme.reset}`);
            currentSuiteName = suite.name;
        }

        // beforeAll
        if (suite.beforeAll) await suite.beforeAll();

        for (const test of testsToRun) {
            if (test.skip) {
                results.push({
                    name: test.name,
                    suite: suite.name,
                    status: 'skip',
                    duration: 0,
                    attempts: 0
                });
                if (!config.quiet) {
                    print(`    ${theme.yellow}${theme.skip}${theme.reset} ${theme.muted}${test.name}${theme.reset}`);
                }
                continue;
            }

            const result = await runTest(test, suite);
            results.push(result);

            // Output
            if (result.status === 'pass') {
                const time = result.duration > 100 ? ` ${theme.muted}${formatDuration(result.duration)}${theme.reset}` : '';
                print(`    ${theme.green}${theme.pass}${theme.reset} ${test.name}${time}`);
            } else {
                print(`    ${theme.red}${theme.fail}${theme.reset} ${test.name}`);
                if (result.error && !config.quiet) {
                    print(`      ${theme.red}${result.error}${theme.reset}`);
                }

                if (config.bail) {
                    print(`\n  ${theme.yellow}Bailed after first failure${theme.reset}`);
                    break;
                }
            }
        }

        // afterAll
        if (suite.afterAll) await suite.afterAll();

        if (config.bail && results.some(r => r.status === 'fail')) break;
    }

    // Restore console
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skip').length;
    const duration = performance.now() - startTime;

    print();

    if (failed === 0) {
        printc(theme.green, `  ${theme.pass} ${passed} passed`);
    } else {
        printc(theme.red, `  ${theme.fail} ${failed} failed`);
        if (passed > 0) printc(theme.green, `  ${theme.pass} ${passed} passed`);
    }

    if (skipped > 0) {
        printc(theme.yellow, `  ${theme.skip} ${skipped} skipped`);
    }

    print(`  ${theme.muted}${formatDuration(duration)}${theme.reset}`);
    print();

    // HTML Report
    if (config.report) {
        generateReport(results, { passed, failed, skipped, duration });
    }

    // Exit
    process.exit(failed > 0 ? 1 : 0);
}

// === HTML REPORT ===
function generateReport(results: Result[], stats: any) {
    const fs = require('fs');
    const path = require('path');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report</title>
    <style>
        :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --green: #3fb950; --red: #f85149; --yellow: #d29922; --blue: #58a6ff; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); padding: 40px; line-height: 1.5; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { font-weight: 600; font-size: 24px; margin-bottom: 24px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: 700; }
        .stat-value.green { color: var(--green); }
        .stat-value.red { color: var(--red); }
        .stat-value.yellow { color: var(--yellow); }
        .stat-label { font-size: 14px; color: #8b949e; margin-top: 4px; }
        .test-list { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .test { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
        .test:last-child { border-bottom: none; }
        .test-icon { width: 8px; height: 8px; border-radius: 50%; }
        .test-icon.pass { background: var(--green); }
        .test-icon.fail { background: var(--red); }
        .test-icon.skip { background: var(--yellow); }
        .test-name { flex: 1; font-size: 14px; }
        .test-duration { font-size: 13px; color: #8b949e; }
        .test-error { background: rgba(248, 81, 73, 0.1); padding: 12px 20px; font-family: 'SF Mono', monospace; font-size: 13px; color: var(--red); }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Report</h1>
        <div class="stats">
            <div class="stat"><div class="stat-value green">${stats.passed}</div><div class="stat-label">Passed</div></div>
            <div class="stat"><div class="stat-value red">${stats.failed}</div><div class="stat-label">Failed</div></div>
            <div class="stat"><div class="stat-value yellow">${stats.skipped}</div><div class="stat-label">Skipped</div></div>
            <div class="stat"><div class="stat-value">${formatDuration(stats.duration)}</div><div class="stat-label">Duration</div></div>
        </div>
        <div class="test-list">
            ${results.map(r => `
                <div class="test">
                    <div class="test-icon ${r.status}"></div>
                    <span class="test-name">${r.name}</span>
                    <span class="test-duration">${formatDuration(r.duration)}</span>
                </div>
                ${r.error ? `<div class="test-error">${r.error}</div>` : ''}
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const file = path.resolve(__dirname, 'test-report.html');
    fs.writeFileSync(file, html);
    print(`  ${theme.muted}Report: ${file}${theme.reset}`);
}

// === CLI ===
export function parseArgs(): Partial<Config> {
    const args = process.argv.slice(2);
    const opts: Partial<Config> = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-q':
            case '--quiet':
                opts.quiet = true;
                break;
            case '-v':
            case '--verbose':
                opts.verbose = true;
                break;
            case '-f':
            case '--filter':
                opts.filter = args[++i];
                break;
            case '--bail':
                opts.bail = true;
                break;
            case '--report':
                opts.report = true;
                break;
            case '-h':
            case '--help':
                printHelp();
                process.exit(0);
        }
    }

    return opts;
}

function printHelp() {
    print(`
  ${theme.bold}Test Framework 2.1${theme.reset}
  
  ${theme.dim}Usage:${theme.reset}
    npx ts-node run-all.ts [options]
  
  ${theme.dim}Options:${theme.reset}
    -q, --quiet     Minimal output
    -v, --verbose   Show all details
    -f, --filter    Filter tests by name
    --bail          Stop on first failure
    --report        Generate HTML report
    -h, --help      Show this message
  
  ${theme.dim}Examples:${theme.reset}
    npx ts-node run-all.ts
    npx ts-node run-all.ts -f "wifi"
    npx ts-node run-all.ts -v --report
`);
}

// Export for compatibility
export const parseCliArgs = parseArgs;
