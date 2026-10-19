const assert = require('node:assert/strict');
const C = require('../combat-feel.js');

for (const cls of ['warrior', 'archer', 'mage']) {
  for (const speed of [.3, .95, 1.75, 10]) {
    const a = C.profile(cls, speed, 0, -1);
    assert(a.hitAt > 0 && a.hitAt < a.cancelAt && a.cancelAt <= a.duration);
    assert(a.active > 0 && a.hitAt + a.active <= a.duration);
    assert(a.duration >= (cls==='warrior'?.44:cls==='archer'?.26:.39));
    assert.equal(C.pose(a, a.hitAt, 16, cls === 'warrior' ? 8 : 10), cls === 'warrior' ? 8 : 10);
    assert(C.pose(a, a.duration, 16, 8) < 16);
  }
}
const first = C.profile('warrior', .95, 0, -1);
assert(first.hitAt >= .11 && first.hitAt <= .15);
assert(first.cancelAt >= .5 && first.duration < .8);
assert(C.profile('archer',1.75).cancelAt < C.profile('mage',1.2).cancelAt);
assert(C.profile('mage',1.2).cancelAt > first.cancelAt);
assert(C.profile('archer',1.75).cancelAt >= .55);
assert(C.profile('mage',1.2).cancelAt >= .75);
assert(C.profile('archer',10).cancelAt >= .44);
assert(C.profile('mage',10).cancelAt >= .60);
const finisher = C.profile('warrior', .95, 2, -1);
assert(finisher.knock > first.knock);
assert(finisher.stop > first.stop);
assert.equal(C.nextCombo(0, .2, .6), 1);
assert.equal(C.nextCombo(2, .2, .6), 0);
assert.equal(C.nextCombo(1, .7, .6), 0);

let buffered = C.buffer(null, 1, 0);
buffered = C.buffer(buffered, -1, .02);
assert.equal(buffered.skill, 1); // 普攻不能覆盖正在排队的技能
assert(C.isBuffered(buffered, .15));
assert(!C.isBuffered(buffered, .4));
buffered = C.buffer(buffered, -1, .4);
assert.equal(buffered.skill, -1);
const earlySkill = C.buffer(null, 0, 0, first.cancelAt);
assert(C.isBuffered(earlySkill, first.cancelAt)); // 起手时提前按技能，也能接上
assert.equal(C.lungeAt(first,0),0);
assert(C.lungeAt(first,first.hitAt)>0 && C.lungeAt(first,first.hitAt)<first.lunge);
assert.equal(C.lungeAt(first,first.duration),first.lunge);
assert(C.stagger('elite',.3,0)>C.stagger('elite',.3,-1));

assert(C.crossed(.07, .14, .08)); // 低帧率也不会跨过命中事件
assert(!C.crossed(.14, .2, .08));
assert.equal(C.feedback('warrior', false, 2).stop, 0);
assert(C.feedback('warrior', true, 2).stop > 0);
assert(C.knockScale('normal') > C.knockScale('elite'));
assert(C.knockScale('elite') > C.knockScale('boss'));
assert.equal(C.stagger('boss', .2), 0);
assert(C.movementScale({...first,time:0},true)>=.7);
assert.equal(C.movementScale({...first,time:0},false),1);
assert(!C.canMoveCancel({...first,hit:false,time:first.duration}));
assert(C.canMoveCancel({...first,hit:true,time:C.recoveryAt(first)}));
assert(C.recoveryAt(first)<first.cancelAt);
const impact={...first};assert.equal(C.impactPause(impact),first.stop);assert.equal(C.impactPause(impact),0);
assert(first.stop<=.03&&finisher.stop<=.055);
for(const cat of ['normal','elite','boss']){
 assert.deepEqual(C.recoil(0,true,cat),{angle:0,sx:1,sy:1,lift:0});
 const recoil=C.recoil(.2,true,cat);assert(recoil.angle>0&&recoil.sx>1&&recoil.sy<1);
 assert.equal(C.recoil(.2,true,cat,-1).angle,-recoil.angle);
}
assert(C.recoil(.2,true,'boss').angle<C.recoil(.2,true,'normal').angle);
console.log('PASS: responsive windup, retained cadence, one pause per swing, movement recovery, local recoil, buffers, enemy poise');
for(const speed of [.6,.95,1.4]){
 const double=C.profile('warrior',speed,2),events=C.hitWindows(double),factor=.95/speed;
 assert.equal(events.length,2);assert(Math.abs(events[0].at-.17*factor)<1e-9);assert(Math.abs(events[1].at-.40*factor)<1e-9);
 assert(events[1].at-events[0].at<C.profile('warrior',speed).cancelAt*.55);assert(Math.abs(events.reduce((sum,e)=>sum+double.mult*e.weight,0)-1.5)<1e-9);
 assert(!C.canMoveCancel({...double,hit:true,time:events[0].at+events[0].active+.04}));
 assert(C.canMoveCancel({...double,hit:true,time:events[1].at+events[1].active+.04}));
 for(const e of events){const visual=C.animationAttack({...double,time:e.at});assert.equal(visual.combo,e.combo);assert(Math.abs(visual.time-visual.hitAt)<1e-9);}
 assert.equal(C.hitWindows(C.profile('warrior',speed,2,0)).length,1);
 assert.equal(C.hitWindows(C.profile('archer',speed)).length,1);assert.equal(C.hitWindows(C.profile('mage',speed)).length,1);
 assert.equal(events.filter(e=>C.crossed(0,double.duration,e.at)).length,2);
}
console.log('PASS: 1/1/12 hit windows, conserved finisher damage, attack-speed scaling, both visual contacts and protected second strike');
