const assert=require('node:assert/strict'),E=require('../encounter-waves.js'),L=require('../level-layout.js');
for(let id=1;id<=4;id++){
 const scene=L.build(id),state=E.plan(scene),enemies=[],spawn=m=>enemies.push({...m,state:'idle'});
 assert.equal(state.waves.flatMap(w=>w.members).length,scene.enemies.length+1);
 assert.equal(state.waves.at(-1).members[0].category,id===4?'boss':'elite');
 assert(state.waves.every((w,i)=>i===state.waves.length-1?w.members.length===1:w.members.length<=3));
 E.step(state,4,110,enemies,spawn);assert.equal(state.phase,'waiting');assert.equal(enemies.length,0);
 for(let i=0;i<state.waves.length;i++){
  const wave=state.waves[i];assert(E.limit(state,scene.width)>=wave.members.at(-1).x);
  E.step(state,.01,wave.trigger,enemies,spawn);assert.equal(state.phase,'warning');
  assert.equal(E.pending(state).length,wave.members.length);
  E.step(state,.7,wave.trigger,enemies,spawn);assert(!enemies.some(e=>e.waveId===i));
  E.step(state,.11,wave.trigger,enemies,spawn);assert.equal(state.phase,'active');
  const active=enemies.filter(e=>e.waveId===i);assert.equal(active.length,wave.members.length);assert(active.every(e=>e.spawnTime===E.EMERGE));
  E.step(state,10,scene.width,enemies,spawn);assert.equal(state.index,i,'cannot skip living wave even from upper route');
  active[0].state='death';E.step(state,.01,scene.width,enemies,spawn);if(active.length>1)assert.equal(state.index,i);
  active.forEach(e=>e.state='death');E.step(state,.01,scene.width,enemies,spawn);
  if(i<state.waves.length-1){assert.equal(state.phase,'rest');const count=enemies.length;E.step(state,.8,scene.width,enemies,spawn);assert.equal(enemies.length,count);E.step(state,.3,scene.width,enemies,spawn);assert.equal(state.phase,'waiting');}
 }
 assert.equal(state.phase,'complete');assert.equal(E.limit(state,scene.width),scene.width-24);
 const serial=state.serial;E.step(state,10,scene.width,enemies,spawn);assert.equal(state.serial,serial);assert.equal(E.plan(L.build(id)).index,0);
}
console.log('PASS: four-map sequential waves, quiet entry, warning/emergence/rest, living-wave barrier, final guard, no duplicate spawn and clean replay');
