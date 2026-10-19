const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('../player-controls.js'),M=require('../character-motion.js');
const code=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const movement=code.slice(code.indexOf(' const latchedRun='),code.indexOf(' hero.vx+=hero.knock'));
function simulate(dir=1,mode='double'){
 const hero={moveVelocity:dir*190,dash:mode==='double'?P.DASH_TIME:0,dashStartVelocity:dir*190,dashVelocity:dir*P.DASH_SPEED,dashKind:'move',dashDust:0,grounded:true,stun:0,rootSlow:0,x:0},tapState=P.create();if(mode==='double')P.latchRun(tapState,dir);
 const c={P,M,hero,tapState,move:dir,motion:{},keys:new Set(mode==='shift'?['ShiftLeft']:[]),C:{movementScale:()=>1,canMoveCancel:()=>true},dt:1/120,burst:()=>{}};vm.createContext(c);const trace=[];
 for(let i=0;i<96;i++){vm.runInContext('{'+movement+'}',c);trace.push({speed:hero.vx*dir,blend:c.motion.runBlend});}
 return {trace,c};
}
for(const dir of [1,-1])for(const mode of ['double','shift']){
 const {trace,c}=simulate(dir,mode);assert(trace[0].speed<210,'first frame continues walking velocity');assert(trace.some(s=>s.speed>220&&s.speed<260),'has acceleration bridge');assert.equal(trace.at(-1).speed,280,'settles into latched run');
 for(let i=1;i<trace.length;i++)assert(Math.abs(trace[i].speed-trace[i-1].speed)<25,'no instantaneous dash or end-speed jump');
 if(mode==='double'){assert(trace.some(s=>s.speed>350),'short acceleration still reaches a movement burst');assert(P.running(c.tapState,dir));c.move=0;P.release(c.tapState,dir>0?'KeyD':'KeyA');for(let i=0;i<10;i++)vm.runInContext('{'+movement+'}',c);assert.equal(c.hero.vx,0,'release stops and unlatches');}
}
for(const [move,stun] of [[0,0],[-1,0],[1,.1]]){const {c}=simulate();c.hero.dash=P.DASH_TIME;c.move=move;c.hero.stun=stun;vm.runInContext('{'+movement+'}',c);assert.equal(c.hero.dash,0,'release, reversal or hit must cancel movement burst');}
assert.equal(P.dashSpeed(190,370,280,0),190);assert.equal(P.dashSpeed(190,370,280,P.RUN_RAMP),370);assert.equal(P.dashSpeed(190,370,280,P.DASH_TIME),280);
console.log('PASS: actual game movement has continuous double-tap/Shift acceleration, steady run, cancellation and no end-speed jump.');
