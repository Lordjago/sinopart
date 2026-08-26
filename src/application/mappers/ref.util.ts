/**
 * Reads the id out of a Mongoose reference field.
 *
 * A `ref` field is an ObjectId until someone calls `.populate()` on it, at
 * which point it becomes the whole referenced document. Both shapes reach the
 * mappers, and `String(populatedDoc)` yields "[object Object]", a silently
 * corrupt id. So unwrap the document case first.
 */
export function idOf(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object' && '_id' in value) return value._id?.toString();
  return value.toString();
}
