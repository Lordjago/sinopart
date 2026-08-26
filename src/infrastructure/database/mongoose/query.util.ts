/**
 * Shared query helpers for the mongoose adapters.
 */

/**
 * Filter values arrive straight from user-supplied query strings, so they are
 * escaped before going anywhere near $regex. Otherwise `.*` scans the whole
 * collection and a pattern like `(a+)+` is a ReDoS waiting to happen.
 */
export function contains(value: string) {
  return {
    $regex: escapeRegex(value),
    $options: 'i',
  };
}

/**
 * Whole-value match ignoring case and surrounding space, for uniqueness checks
 * on human-entered names, where "  toyota " and "Toyota" must collide even
 * though the unique index treats them as different strings.
 */
export function equalsIgnoreCase(value: string) {
  return {
    $regex: `^${escapeRegex(value.trim())}$`,
    $options: 'i',
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
