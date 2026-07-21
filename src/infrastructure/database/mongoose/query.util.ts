/**
 * Shared query helpers for the mongoose adapters.
 */

/**
 * Filter values arrive straight from user-supplied query strings, so they are
 * escaped before going anywhere near $regex — otherwise `.*` scans the whole
 * collection and a pattern like `(a+)+` is a ReDoS waiting to happen.
 */
export function contains(value: string) {
  return {
    $regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    $options: 'i',
  };
}
