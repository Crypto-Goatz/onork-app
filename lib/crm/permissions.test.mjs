import { featuresForPlan, ALWAYS_ON, TOGGLEABLE_FEATURES, ADDON_FEATURES } from '/Users/rocketopp/Github/onork-app/lib/crm/permissions.ts'
import { CATALOGUE, keyOf } from '/Users/rocketopp/Github/onork-app/lib/saas/configure.ts'
let pass=0, fail=[]
const t=(n,f)=>{try{f();pass++;console.log('  ✓ '+n)}catch(e){fail.push(n);console.log('  ✗ '+n+' — '+e.message)}}

t('every catalogue add-on maps to real features', ()=>{
  const missing = CATALOGUE.addons.filter(a=>!ADDON_FEATURES[keyOf(a.name)])
  if(missing.length) throw new Error('unmapped: '+missing.map(a=>a.name).join(', '))
})
t('every mapped feature is actually toggleable', ()=>{
  const bad=[]
  for(const [k,fs] of Object.entries(ADDON_FEATURES))
    for(const f of fs) if(!TOGGLEABLE_FEATURES.includes(f)) bad.push(`${k}→${f}`)
  if(bad.length) throw new Error('not a real feature: '+bad.join(', '))
})
t('empty plan still keeps the free base usable', ()=>{
  const f=featuresForPlan([])
  for(const a of ALWAYS_ON) if(!f.includes(a)) throw new Error('lost '+a)
})
t('picking SMS enables the whole thing, not one flag', ()=>{
  const f=featuresForPlan(['SMS & Text Marketing'])
  for(const need of ['2-way-text-messaging','missed-call-text-back','sms-email-templates'])
    if(!f.includes(need)) throw new Error('missing '+need)
})
t('NOT picking funnels leaves funnels off', ()=>{
  if(featuresForPlan(['Email Marketing']).includes('funnels')) throw new Error('funnels leaked in')
})
t('output is deterministic and ordered', ()=>{
  const a=featuresForPlan(['Sales Pipeline','Email Marketing']).join()
  const b=featuresForPlan(['Email Marketing','Sales Pipeline']).join()
  if(a!==b) throw new Error('order-dependent')
})
t('all 15 add-ons together stay within the 25 real features', ()=>{
  const f=featuresForPlan(CATALOGUE.addons.map(a=>a.name))
  if(f.some(x=>!TOGGLEABLE_FEATURES.includes(x))) throw new Error('invented a feature')
  console.log(`      → ${f.length}/25 features enabled on a full plan`)
})
console.log(`\n${pass} passed, ${fail.length} failed`)
process.exit(fail.length?1:0)
