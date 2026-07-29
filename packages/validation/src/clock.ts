/** Internal deterministic clock seam. Production reads the system clock. */
export const ValidationClock = {
  read(): { seconds: bigint; nanos: number } {
    return clock();
  },
  set(replacement?: () => { seconds: bigint; nanos: number }): void {
    clock = replacement ?? ValidationClock.system;
  },
  system(): { seconds: bigint; nanos: number } {
    const milliseconds = BigInt(Date.now());
    const seconds = milliseconds >= 0n ? milliseconds / 1000n : (milliseconds - 999n) / 1000n;
    return { seconds, nanos: Number((milliseconds - seconds * 1000n) * 1_000_000n) };
  },
};

let clock: () => { seconds: bigint; nanos: number } = ValidationClock.system;
