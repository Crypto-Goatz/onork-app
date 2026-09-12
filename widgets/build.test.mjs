/**
 * Proves the </script> guard actually fires. esbuild escapes the sequence in
 * real source, so without this test the guard would be a branch nobody has ever
 * seen execute — indistinguishable from a broken one.
 *
 *   node widgets/build.test.mjs
 */
import { assertNoScriptClose } from './build.mjs'

let failures = 0
const check = (label, fn) => {
  try { fn(); console.log(`  ok    ${label}`) }
  catch (e) { failures++; console.log(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`) }
}

check('fires on a bundle containing the raw sequence', () => {
  let threw = null
  try { assertNoScriptClose('poisoned_widget', 'var a=1;\nvar usage="</' + 'script>";') }
  catch (e) { threw = e }
  if (!threw) throw new Error('guard did NOT fire on a poisoned bundle')
  if (!threw.message.includes('poisoned_widget')) throw new Error('error does not name the widget')
  if (!threw.message.includes('line 2')) throw new Error('error does not locate the line')
})

check('stays silent on the escaped form', () => {
  assertNoScriptClose('clean_widget', 'var usage="<\\/script>";')
})

check('stays silent on an ordinary bundle', () => {
  assertNoScriptClose('clean_widget', 'export function x(){return 1}')
})

console.log(failures ? `\n${failures} FAILED` : '\n3 passed')
process.exit(failures ? 1 : 0)
