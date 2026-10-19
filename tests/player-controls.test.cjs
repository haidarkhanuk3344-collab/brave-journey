const assert=require('node:assert/strict'),P=require('../player-controls.js');
let s=P.create();assert.equal(P.tap(s,'KeyD',1),0);P.release(s,'KeyD');assert.equal(P.tap(s,'KeyD',1.16),1);
assert.equal(P.tap(s,'KeyD',1.18,true),0);assert.equal(P.tap(s,'KeyD',1.19,false,true),0);
s=P.create();P.tap(s,'KeyA',2);assert.equal(P.tap(s,'KeyA',2.1),0);P.release(s,'KeyA');assert.equal(P.tap(s,'KeyA',2.22),-1);
s=P.create();P.tap(s,'KeyD',3);P.release(s,'KeyD');assert.equal(P.tap(s,'KeyA',3.1),0);
s=P.create();P.tap(s,'KeyD',4);P.release(s,'KeyD');assert.equal(P.tap(s,'KeyD',4.4),0);
P.reset(s);P.release(s,'KeyD');assert.equal(P.tap(s,'KeyD',4.5),0);
assert(P.isJump('KeyK'));assert(P.isJump('Space'));assert(!P.isJump('KeyI'));
assert(P.DASH_SPEED*P.DASH_TIME>80&&P.DASH_COOLDOWN>P.DASH_TIME);
console.log('PASS: A/D released double taps, timeout, reversal, repeat rejection, focus reset, K jump and bounded dash');
P.latchRun(s,1);assert(P.running(s,1));assert(P.running(s,1));assert(!P.running(s,-1));
P.latchRun(s,-1);P.release(s,'KeyD');assert(P.running(s,-1));P.release(s,'KeyA');assert(!P.running(s,-1));
P.latchRun(s,1);P.reset(s);assert(!P.running(s,1));P.latchRun(s,1);assert(!P.running(s,0));
const air={grounded:false,coyote:0,jumpCount:1,jumpAt:1};assert.equal(P.jumpKind(air,1.05),0);assert.equal(P.jumpKind(air,1.12),2);assert.equal(P.jumpKind(air,1.32),2);assert.equal(P.jumpKind(air,1.41),0);assert.equal(P.jumpKind({...air,jumpCount:2},1.12),0);assert.equal(P.jumpKind({...air,grounded:true},1.32),1);
function trajectory(secondAt=null,cutAt=null){let y=0,vy=-P.JUMP_SPEED,min=0,now=0;for(;now<2;now+=1/120){if(secondAt!==null&&now>=secondAt&&now<secondAt+1/120)vy=-P.SECOND_JUMP_SPEED;if(cutAt!==null&&now>=cutAt&&now<cutAt+1/120)vy=P.cutJump(vy);({y,vy}=P.verticalStep(y,vy,1/120));min=Math.min(min,y);if(now>.05&&y>=0)break;}return {height:-min,time:now};}
const basic=trajectory(),short=trajectory(null,.025),double=trajectory(.20);
assert(basic.height>=80&&basic.height<=104&&basic.time<.55);assert(short.height<basic.height*.55&&short.time<basic.time);assert(double.height>basic.height+50&&double.height<190&&double.time<.84);
console.log('PASS: latched run exits, compact weighted jump, short-hop cutoff and bounded double jump', {basic,short,double});
