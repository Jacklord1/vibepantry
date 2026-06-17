// Shared defensive-JSON helper for AI responses. The model is told to return
// ONLY a JSON object, but we never trust that — strip any ```json fences and
// grab the outermost {…} so a stray sentence around the JSON doesn't break the
// parse. Used by both the vision and recipe parsers.

export function extractJsonObject(text: string): string {
  let t = text.trim()
  // Remove a leading ```json / ``` and a trailing ``` if present.
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  // If prose still surrounds the object, slice to the outermost braces.
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    if (first > 0 || last < t.length - 1) {
      t = t.slice(first, last + 1)
    }
  }
  return t.trim()
}
