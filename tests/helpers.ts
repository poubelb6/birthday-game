export function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${String(expected)}\nReceived: ${String(actual)}`);
  }
}

export function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}
