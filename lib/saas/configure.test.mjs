import { pricePlan, planFromProposal, meaningfulOmissions, CATALOGUE, keyOf } from '/Users/rocketopp/Github/onork-app/lib/saas/configure.ts'
let pass=0, fail=[]
const t=(n,f)=>{try{f();pass++;console.log('  ✓ '+n)}catch(e){fail.push(n);console.log('  ✗ '+n+' — '+e.message)}}
const eq=(a,b,m)=>{if(a!==b)throw new Error(`${m}: ${a} !== ${b}`)}

console.log(`catalogue: ${CATALOGUE.addons.length} add-ons, base $${CATALOGUE.basePriceMonthly}\n`)

t('prices come from the catalogue, not the caller', ()=>{
  const p = pricePlan(['Call Tracking','Smart Triggers'])
  eq(p.monthlyTotal, 45+40, 'total')
})
t('annual discount applies to the WHOLE bill including base', ()=>{
  const p = pricePlan(['Email Marketing'])
  eq(p.annualMonthlyTotal, Math.round(40*0.85), 'annual')
  eq(p.annualSaving, (40-Math.round(40*0.85))*12, 'saving')
})
t('duplicates collapse', ()=>{
  eq(pricePlan(['Email Marketing','email-marketing','Email Marketing']).lines.length, 1, 'lines')
})
t('a hallucinated add-on is dropped, not priced', ()=>{
  const p = pricePlan(['Email Marketing','Quantum Teleportation'])
  eq(p.lines.length, 1, 'lines')
  eq(p.monthlyTotal, 40, 'total')
})
t('model-supplied prices are ignored entirely', ()=>{
  const p = planFromProposal({ addons:['call-tracking'], reasons:{'call-tracking':'You said you lose after-hours calls.'} })
  eq(p.lines[0].priceMonthly, 45, 'price')
  eq(p.lines[0].because, 'You said you lose after-hours calls.', 'reason')
})
t('an unjustified line is FLAGGED, not quietly included', ()=>{
  const p = planFromProposal({ addons:['call-tracking','communities'], reasons:{'call-tracking':'You said you lose calls.'} })
  if(!p.notes.some(n=>/Communities/.test(n))) throw new Error('no note for the unjustified line')
})
t('omissions are carried through', ()=>{
  const p = planFromProposal({ addons:['email-marketing'], omitted:[{name:'E-commerce & Products',because:"You don't sell online."}] })
  eq(p.omitted.length,1,'omitted'); eq(p.omitted[0].name,'E-commerce & Products','name')
})
t('empty selection costs nothing — base is free', ()=>{ eq(pricePlan([]).monthlyTotal, 0, 'base is free') })
t('all-in matches the published $749', ()=>{
  eq(pricePlan(CATALOGUE.addons.map(a=>a.name)).monthlyTotal, 749, 'all-in')
})

// ── omission noise ──
t('generic "no mention of" omissions are dropped', ()=>{
  const kept = meaningfulOmissions([
    {name:'E-commerce & Products', because:"You mentioned you don't sell anything online."},
    {name:'Email Marketing', because:"There's no mention of needing email campaigns."},
    {name:'Social Media Manager', because:"There's no specific mention of needing to schedule posts."},
    {name:'Membership & Courses', because:"You mentioned you don't run courses."},
  ])
  eq(kept.length, 2, 'kept')
  if(kept.some(k=>/no.*mention/i.test(k.because))) throw new Error('padding survived')
})
t('omissions are capped', ()=>{
  const many = Array.from({length:9},(_,i)=>({name:'A'+i, because:'You said you do not need this.'}))
  eq(meaningfulOmissions(many).length, 3, 'capped')
})

console.log(`\n${pass} passed, ${fail.length} failed`)
process.exit(fail.length?1:0)
