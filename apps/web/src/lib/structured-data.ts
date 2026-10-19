/**
 * Serialize JSON for an inline script element without allowing attacker text to
 * terminate the element. JSON.parse still accepts the resulting unicode escapes.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
