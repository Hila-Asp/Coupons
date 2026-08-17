export function assertNever(value: never, message = 'Unhandled value'): never {
  throw new Error(`${message}: ${String(value)}`);
}
