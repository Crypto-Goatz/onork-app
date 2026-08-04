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

  // Zip from INSIDE the folder so the archive has no wrapping directory —
  // an extra top level is a common reason an upload validates but never loads.
  execFileSync('zip', ['-q', '-r', path.join(outDir, `${key}.zip`), '.'], { cwd: dir })
  console.log(`  ${key}.zip  (${(js.length / 1024).toFixed(1)} KB js)`)
}
console.log(`\n${widgets.length} bundles in widgets/dist/`)
