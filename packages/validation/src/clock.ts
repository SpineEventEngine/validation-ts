/** Internal deterministic clock seam. Production reads the system clock. */
let clock: () => { seconds: bigint; nanos: number } = systemClock;

export function readValidationNow(): { seconds: bigint; nanos: number } {
  return clock();
}

/** @internal Test-only clock injection; intentionally not exported from the package root. */
export function setValidationClockForTesting(
  replacement?: () => { seconds: bigint; nanos: number },
): void {
  clock = replacement ?? systemClock;
}

function systemClock(): { seconds: bigint; nanos: number } {
  const milliseconds = BigInt(Date.now());
  return { seconds: milliseconds / 1000n, nanos: Number((milliseconds % 1000n) * 1_000_000n) };
}
