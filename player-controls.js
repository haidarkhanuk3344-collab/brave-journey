(function(root){
'use strict';
const TAP_WINDOW=.24,DASH_TIME=.32,DASH_SPEED=370,DASH_COOLDOWN=.48;
const JUMP_SPEED=690,SECOND_JUMP_SPEED=640,JUMP_CUT=380,RISE_GRAVITY=2400,FALL_GRAVITY=3400;
const SECOND_JUMP_MIN=.07,SECOND_JUMP_MAX=.40;
function create(){return {lastTap:null,lastAt:-Infinity,released:true,runDir:0};}
function reset(state){Object.assign(state,create());}
function tap(state,code,now,repeat=false,alreadyDown=false){
 if(repeat||alreadyDown||!['KeyA','KeyD'].includes(code))return 0;
 const double=state.lastTap===code&&state.released&&now-state.lastAt<=TAP_WINDOW;
 state.lastTap=code;state.lastAt=now;state.released=false;
 if(double){state.lastTap=null;return code==='KeyD'?1:-1;}return 0;
}
function release(state,code){if(code===state.lastTap)state.released=true;if(code===(state.runDir>0?'KeyD':'KeyA'))state.runDir=0;}
function latchRun(state,dir){state.runDir=Math.sign(dir);}
function running(state,move){if(move!==state.runDir)state.runDir=0;return !!move&&state.runDir===move;}
// The movement burst starts at the current velocity, accelerates over 140ms,
// then settles directly into the held run. Endpoints have zero slope.
const RUN_RAMP=.14;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function dashSpeed(start,peak,end,elapsed){
 if(elapsed<RUN_RAMP)return start+(peak-start)*smooth(elapsed/RUN_RAMP);
 return peak+(end-peak)*smooth((elapsed-RUN_RAMP)/(DASH_TIME-RUN_RAMP));
}
function runBlend(speed,walk=190,run=280){return smooth((Math.abs(speed)-walk)/(run-walk));}
function jumpKind(hero,now){
 if(hero.grounded||hero.coyote>0)return 1;
 const elapsed=now-hero.jumpAt;
 return hero.jumpCount===1&&elapsed>=SECOND_JUMP_MIN&&elapsed<=SECOND_JUMP_MAX?2:0;
}
function cutJump(vy){return Math.max(vy,-JUMP_CUT);}
function verticalStep(y,vy,dt){vy+=(vy<0?RISE_GRAVITY:FALL_GRAVITY)*dt;return {y:y+vy*dt,vy};}
function isJump(code){return code==='KeyK'||code==='Space';}
const api={dashSpeed,runBlend,RUN_RAMP,create,reset,tap,release,latchRun,running,isJump,jumpKind,cutJump,verticalStep,TAP_WINDOW,DASH_TIME,DASH_SPEED,DASH_COOLDOWN,JUMP_SPEED,SECOND_JUMP_SPEED,JUMP_CUT,RISE_GRAVITY,FALL_GRAVITY,SECOND_JUMP_MIN,SECOND_JUMP_MAX};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlayerControls=api;
})(typeof window!=='undefined'?window:globalThis);
