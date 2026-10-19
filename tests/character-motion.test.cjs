const assert=require('node:assert/strict');
const near=(a,b)=>{if(typeof a==='number')assert(Math.abs(a-b)<1e-8);else for(const k of Object.keys(a))near(a[k],b[k]);};
const M=require('../character-motion.js'),C=require('../combat-feel.js');
// On each planted portion, root travel and foot travel cancel in world space.
for(const run of [false,true]){
 const dt=.003,phase=.09,speed=run?M.RUN_SPEED:M.WALK_SPEED;
 const a=M.gait('warrior',phase,run),b=M.gait('warrior',phase+speed*dt/M.stride(run),run);
 assert(Math.abs((b.feet[0][0]-a.feet[0][0])*M.SCALE+speed*dt)<1e-9);
 assert.equal(a.feet[0][1],215);
 const end=M.gait('warrior',1,run),start=M.gait('warrior',0,run);
 near(end,start);
}
// Attack endpoints return to a shared stance; each combo has a different silhouette.
const hits=[];
for(const cls of ['warrior','archer','mage'])for(let combo=0;combo<(cls==='warrior'?3:1);combo++){
 const a=C.profile(cls,{warrior:.95,archer:1.75,mage:1.2}[cls],combo);
 near(M.attackPose(cls,{...a,time:0}),M.attackPose(cls,{...a,time:a.duration}));
 let before=M.attackPose(cls,{...a,time:0});
 for(let t=.001;t<a.duration;t+=.001){const pose=M.attackPose(cls,{...a,time:t});for(const point of ['hip','front','back']){
  assert(pose[point].every(Number.isFinite));assert(Math.hypot(...pose[point].map((v,i)=>v-before[point][i]))<5);
 }before=pose;}
 if(cls==='warrior')hits.push(M.attackPose(cls,{...a,time:a.hitAt}));
}
assert.notDeepEqual(hits[0],hits[1]);assert.notDeepEqual(hits[1],hits[2]);
// State changes retain their current joint position on the first sample.
const state={phase:.2,clock:1,pose:M.gait('warrior',.2),tag:'walk',elapsed:1,running:false,vx:135,vy:0,grounded:true,stun:0,travel:0};
const old=state.pose;state.attack={...C.profile('warrior',.95),time:0,id:1};
const now=M.advance(state,'warrior',0);assert.deepEqual(now,old);
const right=M.attachment(hits[0],100,600,'right'),left=M.attachment(hits[0],100,600,'left');
assert.equal(right.y,left.y);assert(Math.abs(right.x+left.x-200)<1e-9);
assert(M.SCALE<.7);
console.log('PASS: planted-foot velocity, loop closure, distinct combo tracks, continuous pose curves, action transition, mirrored projectile attachment');
