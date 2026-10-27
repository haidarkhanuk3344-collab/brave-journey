(function(root) {
  'use strict';
  const BUFFER = .24, COYOTE = .12, JUMP_BUFFER = .15;
  const MAGE_NORMAL = Object.freeze({damage:1.15,thirdMultiplier:1.3,splashRadius:70,splashFraction:.6,manaOnHit:4,followThrough:.045});
  const baseSpeed = {warrior:.95, archer:1.75, mage:1.2};
  const melee = [
    {duration:.66, hitAt:.13, active:.09, cancelAt:.56, range:125, knock:215, stun:.18, stop:.025, lunge:10, mult:1},
    {duration:.79, hitAt:.17, active:.09, cancelAt:.68, range:135, knock:255, stun:.22, stop:.032, lunge:13, mult:1.12},
    {duration:.94, hitAt:.17, active:.065, cancelAt:.83, range:145, knock:355, stun:.3, stop:.05, lunge:18, mult:1.5}
  ];
  const ranged = {
    archer:{duration:.64, hitAt:.18, active:.045, cancelAt:.56, knock:55, stun:.065, stop:.02, mult:1, lunge:0},
    mage:{duration:.9, hitAt:.28, active:.065, cancelAt:.82, knock:70, stun:.16, stop:.045, mult:1, lunge:0}
  };
  function profile(cls, speed, combo=0, skill=-1) {
    const a = {...(cls === 'warrior' ? melee[combo % 3] : ranged[cls]), cls, combo, skill};
    if(skill<0&&cls==='archer'&&combo%3===1)Object.assign(a,{duration:.7,hitAt:.21,cancelAt:.62});
    if(skill<0&&cls==='archer'&&combo%3===2)Object.assign(a,{duration:.67,hitAt:.2,cancelAt:.59});
    if(skill<0&&cls==='mage')Object.assign(a,[{duration:.9,hitAt:.28,cancelAt:.82},{duration:.95,hitAt:.31,cancelAt:.87},{duration:1.04,hitAt:.38,cancelAt:.96,stun:.2,stop:.05,slowRatio:.3,slowDuration:2}][combo%3]);
    const ratio = Math.max(.6, Math.min(cls==='warrior'?1.5:1.25, speed/baseSpeed[cls]));
    const factor = 1/ratio;
    if(skill>=0){const skills=typeof module!=='undefined'&&module.exports?require('./skill-combat.js'):root.SkillCombat;return {...a,...skills.profile(cls,skill,factor),mult:1};}
    if(cls==='mage'){a.mult=MAGE_NORMAL.damage*(combo%3===2?MAGE_NORMAL.thirdMultiplier:1);a.normalOrb=true;a.followThrough=MAGE_NORMAL.followThrough*factor;if(combo%3===2)Object.assign(a,{splashRadius:MAGE_NORMAL.splashRadius,splashFraction:MAGE_NORMAL.splashFraction,manaOnHit:MAGE_NORMAL.manaOnHit});}
    for (const k of ['duration','hitAt','active','cancelAt']) a[k] *= factor;
    if(cls==='warrior'&&skill<0&&combo%3===2)a.strikes=[
      {at:.17*factor,active:.065*factor,start:0,weight:.55/1.5,combo:0,range:135,knock:155,stun:.12,stop:.023,lunge:6},
      {at:.40*factor,active:.085*factor,start:.285*factor,weight:.95/1.5,combo:2,range:145,knock:355,stun:.3,stop:.045,lunge:12}
    ];
    if(cls==='archer'&&skill<0&&combo%3===2){
      a.strikes=[{at:.2*factor,active:.04*factor,start:0,weight:.5,damageFraction:.5,combo:2,lunge:0},
        {at:.37*factor,active:.045*factor,start:.285*factor,weight:.5,damageFraction:.5,combo:2,lunge:0}];
      a.cyclePause=.4;a.readyAt=Math.max(a.cancelAt,a.strikes[1].at+a.cyclePause);
    }
    return a;
  }
  function hitWindows(a){return a.strikes||[{at:a.hitAt,active:a.active,start:0,weight:1,combo:a.combo,range:a.range,knock:a.knock,stun:a.stun,stop:a.stop,lunge:a.lunge}];}
  function animationAttack(a){
    if(!a.strikes)return a;
    let index=0;for(let i=1;i<a.strikes.length;i++)if(a.time>=a.strikes[i].start)index=i;
    const event=a.strikes[index],end=a.strikes[index+1]?.start??a.duration;
    return {...a,strikes:null,time:Math.max(0,a.time-event.start),hitAt:event.at-event.start,active:event.active,duration:end-event.start,combo:event.combo,poseCombo:event.poseCombo,segment:index};
  }
  function pose(a, time, count=16, hitFrame=8) {
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi,n));
    const start = 0;
    const follow = Math.min(count-1, hitFrame+3);
    let n;
    if (time < a.hitAt) {
      const progress=clamp(time/a.hitAt,0,1), anticipation=Math.max(0,hitFrame-3);
      n=progress<.55?start+(anticipation-start)*(progress/.55):progress<.75?anticipation:anticipation+(hitFrame-anticipation)*((progress-.75)/.25);
    }
    else if (time < a.hitAt+a.active) n = hitFrame+(follow-hitFrame)*((time-a.hitAt)/a.active);
    else n = follow+(count-1-follow)*clamp((time-a.hitAt-a.active)/(a.duration-a.hitAt-a.active),0,1);
    return clamp(Math.floor(n+1e-7),0,count-1);
  }
  const crossed = (before, after, event) => before < event && after >= event;
  const nextCombo = (previous, since, window=1.15) => since <= window ? (previous+1)%3 : 0;
  const isBuffered = (input, now) => !!input && now <= input.expires;
  function buffer(previous, skill, now, readyIn=0) {
    if (isBuffered(previous,now) && previous.skill>=0 && skill<0) return previous;
    return {skill, expires:now+Math.max(BUFFER,Math.min(1.5,readyIn+.1))};
  }
  const knockScale = kind => ({normal:1,elite:.3,boss:.07}[kind] ?? 1);
  const stagger = (kind, time, skill=-1) => kind === 'boss' ? 0 : time*(kind === 'elite' ? skill>=0?.7:.1 : 1);
  function feedback(cls, hit, combo=0) {
    if (!hit) return {stop:0, shake:0, sparks:0};
    return {stop:cls==='warrior'?melee[combo%3].stop:cls==='archer'?.02:.045,
      shake:cls==='warrior'?(combo===2?6.5:3.2):cls==='archer'?1:2.3,
      sparks:cls==='warrior'?(combo===2?16:10):cls==='archer'?6:12};
  }
  function lungeAt(a,time){return hitWindows(a).reduce((sum,e)=>{const progress=Math.max(0,Math.min(1,(time-e.at+.04)/(.04+e.active)));return sum+e.lunge*(1-(1-progress)**2);},0);}
  function recoveryAt(a){const last=hitWindows(a).at(-1);return last.at+(a.normalOrb?a.followThrough:last.active+.035);}
  function canMoveCancel(a){return !!a&&a.hit&&a.time>=recoveryAt(a);}
  function movementScale(a,grounded){if(!a||!grounded)return 1;const visual=animationAttack(a);return visual.time<visual.hitAt+visual.active?.72:.94;}
  // A swing hitting several targets requests one brief world pause. Recoil is local.
  function impactPause(a){if(a.impactPaused)return 0;a.impactPaused=true;return a.stop;}
  function recoil(remaining,heavy=false,category='normal',dir=1){
    const p=Math.max(0,Math.min(1,1-remaining/.24)),strength=(category==='boss'?.16:category==='elite'?.45:1)*(heavy?1.25:1);
    const n=Math.sin(Math.min(1,p/.12)*Math.PI/2)*(1-p)**2*strength;
    return {angle:dir*n*.105,sx:1+n*.085,sy:1-n*.07,lift:n*(heavy?7:3)};
  }
  const api={MAGE_NORMAL,BUFFER,COYOTE,JUMP_BUFFER,profile,hitWindows,animationAttack,pose,crossed,nextCombo,buffer,isBuffered,knockScale,stagger,feedback,lungeAt,recoveryAt,canMoveCancel,movementScale,impactPause,recoil};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CombatFeel=api;
})(typeof window!=='undefined'?window:globalThis);
