const assert=require('node:assert/strict'),N=require('../enemy-combat.js'),B=require('../combat-space.js');
const make=(type,values={})=>({type,category:type==='ancient_tree'?'boss':'elite',x:800,y:600,hp:1000,maxHp:1000,atk:40,state:'idle',patrolMin:500,patrolMax:1100,dir:'left',...values});
const hero={x:620,y:600};const world={hero,min:0,max:1600,groundAt:()=>600,half:e=>B.body(e).half};
function simulate(type,key,values={},target=hero,dt=1/120){const e=make(type,values);N.reset(e);Object.assign(e,values);N.begin(e,target,key);let events=[];for(let t=0;t<4;t+=dt)events.push(...N.step(e,dt,{...world,hero:target}));return {e,events};}
for(const type of ['boar','stone_chief','vine_guard','ancient_tree']){
 const e=make(type);N.reset(e);const keys=[];for(let i=0;i<6;i++){N.begin(e,hero);keys.push(e.eliteMove.key);assert(e.hitAt>=.64,'every move retains readable windup');assert(e.attackDuration>e.hitAt+.9);N.cancel(e);}assert.equal(new Set(keys).size,type==='ancient_tree'?3:2,'elite rotation must contain different attacks');
}
for(const dt of [1/60,1/120]){
 const r=simulate('boar','charge',{},hero,dt);assert(r.events.some(e=>e.kind==='contact'));assert(r.e.x<800);assert.equal(r.events.filter(e=>e.kind==='contact').length,1);assert(r.e.exposed>0,'dodged charge must expose the boar');
 const jumped=simulate('boar','charge',{}, {x:620,y:500},dt);assert(!jumped.events.some(e=>e.kind==='contact'),'jump clears the charge hit volume');
}
let e=make('stone_chief');N.reset(e);N.begin(e,hero,'shield');assert.equal(N.modifier(e,620),.45);assert.equal(N.modifier(e,920),1,'rear bypasses shield');assert(!N.receive(e,920,1));assert.equal(e.guard,4);assert(!N.receive(e,620,0));assert.equal(e.guard,2);assert(N.receive(e,620,0));assert.equal(e.state,'idle');assert(e.exposed>0);assert.equal(N.modifier(e,620),1.25);
e=make('boar');N.reset(e);N.begin(e,hero,'charge');const opening=N.step(e,1.25,world);assert(opening.some(x=>x.kind==='opening')&&e.exposed>0&&e.state==='attack','recovery is vulnerable before the next attack');
const stone=simulate('stone_chief','stones');assert.equal(stone.events.filter(e=>e.kind==='wave').length,2);assert.equal(stone.events.filter(e=>e.kind==='recovery').length,1);
const vine=simulate('vine_guard','roots');const roots=vine.events.filter(e=>e.kind==='root');assert.equal(roots.length,3);assert(roots.every(h=>h.warning>=.9));assert.deepEqual(roots.map(h=>h.x),[620,510,730]);
function hazards(list,target,dt=1/120){let damage=0,slows=0,impacts=0,firstAt=Infinity;for(let t=0;t<4;t+=dt){list=N.stepHazards(list,dt,target,{groundAt:()=>600,hurt:amount=>{damage+=amount;firstAt=Math.min(firstAt,t+dt);return true;},slow:()=>slows++,impact:()=>impacts++});}return {list,damage,slows,impacts,firstAt};}
let result=hazards([{...roots[0]}],hero);assert.equal(result.damage,34);assert.equal(result.slows,1);assert(result.firstAt>=.89,'prewarning must never deal damage');assert.equal(result.list.length,0,'hazards expire');
result=hazards([{...roots[0],hit:false}],{x:800,y:600});assert.equal(result.damage,0,'moving clear of the locked location avoids root');
result=hazards([{...roots[0],hit:false}],{x:620,y:500});assert.equal(result.damage,0,'weighted jump clears the root');
const wave=stone.events.find(e=>e.kind==='wave');result=hazards([{...wave}],{x:600,y:600});assert(result.damage>0);result=hazards([{...wave,hit:false}],{x:600,y:500});assert.equal(result.damage,0,'ground wave can be jumped');
result=hazards([{...wave,hit:false}],{x:100,y:600});assert.equal(result.damage,0,'wave cannot travel beyond its bounded range');
result=hazards([{...wave,owner:{state:'death'}}],hero);assert.equal(result.damage,0,'death removes owner hazards immediately');
let boss=make('ancient_tree',{hp:500});N.reset(boss);assert(N.transition(boss,hero));assert.equal(boss.phase,2);assert.equal(boss.eliteMove.key,'awaken');assert(!N.transition(boss,hero),'phase changes exactly once');
const phase1=simulate('ancient_tree','rootline').events.filter(e=>e.kind==='root'),phase2=simulate('ancient_tree','rootline',{enraged:true,phase:2}).events.filter(e=>e.kind==='root');assert.equal(phase1.length,3);assert.equal(phase2.length,5);
assert.equal(simulate('ancient_tree','slam',{enraged:true}).events.filter(e=>e.kind==='wave').length,2,'second phase combines forward and reverse waves');
assert.equal(simulate('ancient_tree','fruit',{enraged:true}).events.filter(e=>e.kind==='fruit').length,3);assert.equal(simulate('ancient_tree','fruit').events.filter(e=>e.kind==='fruit').length,2);
for(const h of phase2)assert(h.x>=36&&h.x<=1564);
const corner=simulate('vine_guard','roots',{}, {x:5,y:600});assert(corner.events.filter(h=>h.kind==='root').every(h=>h.x>=36));
// Distinct generated poses must fit their cells and match physical body sizes.
const manifest=require('../assets/enemies/v14/manifest.json');for(const [type,rec] of Object.entries(manifest.types)){assert.equal(rec.metadata.length,4);assert.equal(B.bodies[type].nativeHeight,rec.nativeHeight);for(const m of rec.metadata){assert(m.bounds[0]>0&&m.bounds[2]<256&&m.bounds[1]>0&&m.bounds[3]===232);}}
console.log('PASS: deterministic elite rotations, telegraph timing, charge dodge/exposure, directional shield and skill break, roots/slow, jumpable bounded waves, single hazard damage, boss phase combos, death cleanup and unclipped sprite bounds.');
