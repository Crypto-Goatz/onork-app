/**
 * Resolve hooks so a plain `node tools/*.test.mjs` can import the app's .ts
 * modules directly.
 *
 * Node strips types natively, but it will not guess an extension: TypeScript
 * source writes `import … from './crm-apps'` and Node asks for a file with no
 * extension and gives up. Next/tsconfig do the guessing in the real build; this
 * does the same one thing for tests, and ONLY on a resolution that already
 * failed, so it can never shadow a real module.
 */
const CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx']

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:')) {
      for (const ext of CANDIDATES) {
        try { return await next(specifier + ext, context) } catch { /* try the next one */ }
      }
    }
    throw err
  }
}
