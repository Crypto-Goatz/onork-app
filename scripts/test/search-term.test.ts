process.env.APP_JWT_SECRET = 'x'
import { BLAST_RADIUS, searchTerm, count } from '../../lib/burst/executor'

let pass = 0, fail = 0
const t = (n: string, got: string, want: string) => {
  const ok = got === want; ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  — got "${got}" want "${want}"`}`)
}

t('the real failure: SQL-ish equality', searchTerm("email = 'john.burst@example.com'"), 'john.burst@example.com')
t('double quotes', searchTerm('name = "Jane Doe"'), 'Jane Doe')
t('colon form', searchTerm('email: bob@x.com'), 'bob@x.com')
t('like form', searchTerm("firstName like 'Sam'"), 'Sam')
t('plain name untouched', searchTerm('Jane Doe'), 'Jane Doe')
t('plain email untouched', searchTerm('bob@x.com'), 'bob@x.com')
t('star means no filter', searchTerm('*'), '')
t('all means no filter', searchTerm('all'), '')
t('non-string is empty', searchTerm(42), '')
t("an apostrophe name isn't mangled", searchTerm("O'Brien"), "O'Brien")

// limit clamping — the planner really did send 0
const tn = (n: string, got: number, want: number) => {
  const ok = got === want; ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  — got ${got} want ${want}`}`)
}
tn('limit 0 clamps to 1', count(0, 20), 1)
tn('limit missing uses default', count(undefined, 20), 20)
tn('limit 5000 clamps to 100', count(5000, 20), 100)
tn('negative clamps to 1', count(-5, 20), 1)

console.log(`\nBLAST_RADIUS = ${BLAST_RADIUS}`)
console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
