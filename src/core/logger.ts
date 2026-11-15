export function logger(scope: string) {
  const prefix = `[Spiced:${scope}]`;
  return {
    debug: (...values: unknown[]) => { if (__DEV__) console.debug(prefix, ...values); },
    warn: (...values: unknown[]) => console.warn(prefix, ...values),
    error: (...values: unknown[]) => console.error(prefix, ...values),
  };
}
