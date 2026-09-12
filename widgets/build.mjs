import { build } from 'esbuild'
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

/**
 * Build each widget into an uploadable bundle.
 *
 * THE CONSTRAINTS ARE THE PLATFORM'S, not preferences:
 *   • RELATIVE PATHS ONLY — an absolute /assets/… path resolves against the
 *     builder's origin, not the bundle, so the widget loads nothing.
 *   • .zip, never .rar — .rar is rejected on upload.
 *   • Self-contained — postmate is bundled in, because the iframe has no
 *     network origin of ours to fetch a dependency from.
 *
 * Everything is inlined into one index.html: a single file cannot have a broken
 * relative path, which removes the entire class of "works locally, blank in the
 * builder" failures.
 */


/**
 * A LITERAL `</script>` IN EMITTED CODE TRUNCATES THE WHOLE PAGE, SILENTLY.
 *
 * The CRM stores page custom-code inside a JavaScript string context, so the
 * first `</script>` sequence anywhere in the bundle closes the wrapper early
 * and everything after it is swallowed as script source. Confirmed in headless
 * Chromium: the unescaped form leaves the rest of the document unparsed and
 * throws NOTHING. It renders a fragment and reads like a CSS bug, which is how
 * it already bit lead0n.js.
 *
 * WHY THIS IS A BACKSTOP RATHER THAN A DAILY CATCH, stated plainly so nobody
 * mistakes its silence for proof: esbuild already escapes the sequence to
 * `<\/script>` inside string literals and strips ordinary comments, so source
 * code in THIS pipeline cannot currently produce one. Measured 2026-09-12 —
 * a string literal and a preserved `/*!` comment both came out escaped. The
 * guard exists for the day the pipeline changes: minification off, a different
 * bundler, a pre-built vendor file copied in, or raw HTML concatenated after
 * the bundle step. Its own firing is unit-tested in widgets/build.test.mjs,
 * because a guard nobody has watched fire is not a guard.
 *
 * The needle is built by concatenation so this file cannot trip itself.
 */
export function assertNoScriptClose(key, js) {
  const NEEDLE = '</' + 'script>'
  if (!js.includes(NEEDLE)) return
  const at = js.indexOf(NEEDLE)
  const line = js.slice(0, at).split('\n').length
  const excerpt = js.slice(Math.max(0, at - 60), at + 20).replace(/\s+/g, ' ')
  throw new Error(
    `widget "${key}" emits a literal ${NEEDLE} in its bundled JS (line ${line}) — the CRM would ` +
    `truncate the page at that point and no error would be thrown.\n    …${excerpt}…\n` +
    `    Fix: write it as "<\\/script>" in the source, including inside comments.`
  )
}

const root = path.dirname(new URL(import.meta.url).pathname)
const srcDir = path.join(root, 'src')
const outDir = path.join(root, 'dist')

const widgets = readdirSync(srcDir).filter((d) => !d.startsWith('_'))
if (existsSync(outDir)) rmSync(outDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

for (const key of widgets) {
  const entry = path.join(srcDir, key, 'index.js')
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2018'],
    write: false,
    logLevel: 'silent',
  })
  const js = result.outputFiles[0].text

  const dir = path.join(outDir, key)
  mkdirSync(dir, { recursive: true })

  writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${key}</title>
<style>html,body{margin:0;padding:0;background:transparent;font:400 14px/1.5 system-ui,-apple-system,sans-serif}</style>
</head>
<body><script>${js}</script></body>
</html>`)

  assertNoScriptClose(key, js)

  // Zip from INSIDE the folder so the archive has no wrapping directory —
  // an extra top level is a common reason an upload validates but never loads.
  execFileSync('zip', ['-q', '-r', path.join(outDir, `${key}.zip`), '.'], { cwd: dir })
  console.log(`  ${key}.zip  (${(js.length / 1024).toFixed(1)} KB js)`)
}
console.log(`\n${widgets.length} bundles in widgets/dist/`)
