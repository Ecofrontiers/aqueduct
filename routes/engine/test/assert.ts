/** Minimal zero-dependency test harness (Node native; no jest/vitest). */
let passed = 0;
let failed = 0;
const failures: string[] = [];

export function ok(cond: unknown, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.log(`  FAIL  ${msg}`);
  }
}

export function eq<T>(a: T, b: T, msg: string): void {
  ok(a === b, `${msg}  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

export function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

export function summary(): { passed: number; failed: number } {
  console.log(`\n----------------------------------------`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("Failures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  return { passed, failed };
}

export function exitWithSummary(): void {
  const { failed } = summary();
  process.exit(failed > 0 ? 1 : 0);
}
