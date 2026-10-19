const assert=require('node:assert/strict'),C=require('../combat-feel.js');
for(const speed of [1.05,1.75,2.1875,100]){
 const last=C.profile('archer',speed,2),events=C.hitWindows(last);
 assert.equal(C.hitWindows(C.profile('archer',speed,0)).length,1);assert.equal(C.hitWindows(C.profile('archer',speed,1)).length,1);
 assert.equal(events.length,2);assert(events[1].at-events[0].at>=.13);assert.equal(events.reduce((n,e)=>n+e.weight,0),1);
 assert(events.every(e=>e.damageFraction===.5));assert(last.readyAt-events[1].at>=.3&&last.readyAt-events[1].at<=.5);
 assert(!C.canMoveCancel({...last,hit:true,time:events[0].at+.1}));assert(C.canMoveCancel({...last,hit:true,time:C.recoveryAt(last)}));
 for(const e of events){const visual=C.animationAttack({...last,time:e.at});assert(Math.abs(visual.time-visual.hitAt)<1e-9);}
}
for(let combo=0;combo<3;combo++){
 const a=C.profile('mage',1.2,combo);assert.equal(C.hitWindows(a).length,1);assert.equal(a.mult,1);assert.equal(a.slowRatio||0,combo===2?.3:0);assert(a.cancelAt>=.8);
}
for(const cls of ['archer','mage'])for(const skill of [0,1,2])assert.equal(C.hitWindows(C.profile(cls,cls==='mage'?1.2:1.75,2,skill)).length,cls==='archer'&&skill===0?3:1,'skill events remain independent of normal combo index');
console.log('PASS: archer 1/1/half+half release/pose/loop pause, protected second arrow, mage single third ball with 30% slow, skill isolation');
