/* Scene-local encounters: approach, warning, emergence, clear, breathing space. */
(function(root){
'use strict';
const WARNING=.8,REST=1.05,EMERGE=.38;
function plan(scene){
 if(scene.sourceMap)return {waves:globalThis.SourceWorld.plan(scene),source:true,index:0,phase:'waiting',timer:0,serial:0,cursor:0,spawnClock:0};
 const waves=[];
 for(let i=0;i<scene.enemies.length;i+=2){const members=scene.enemies.slice(i,i+2).map(([type,x])=>({type,x,category:'normal'}));
  waves.push({members,trigger:members[0].x-320,boundary:Math.min(scene.width-24,members.at(-1).x+170)});
 }
 const [type,x]=scene.guard;waves.push({members:[{type,x,category:scene.id===4?'boss':'elite'}],trigger:x-350,boundary:Math.min(scene.width-24,x+200)});
 return {waves,index:0,phase:'waiting',timer:0,serial:0};
}
function step(state,dt,heroX,enemies,spawn){
 if(state.phase==='complete')return;
 const wave=state.waves[state.index];
 if(state.source&&state.phase==='active'){
  const live=enemies.filter(e=>e.waveId===state.index&&e.state!=='death');state.spawnClock-=dt;
  if(state.cursor<wave.members.length&&live.length<4&&state.spawnClock<=0){const member=wave.members[state.cursor];spawn({...member,serial:state.cursor++,waveId:state.index,spawnTime:EMERGE});state.spawnClock=10/24;return;}
  if(state.cursor<wave.members.length||live.length)return;
  state.index++;state.serial++;state.cursor=0;state.timer=REST;state.phase=state.index>=state.waves.length?'complete':'rest';return;
 }
 if(state.phase==='active'){
  if(enemies.some(e=>e.waveId===state.index&&e.state!=='death'))return;
  state.index++;state.serial++;state.timer=REST;state.phase=state.index>=state.waves.length?'complete':'rest';return;
 }
 if(state.phase==='rest'){state.timer=Math.max(0,state.timer-dt);if(state.timer===0)state.phase='waiting';return;}
 if(state.phase==='waiting'){if(heroX>=wave.trigger){state.phase='warning';state.timer=WARNING;}return;}
 if(state.phase==='warning'){state.timer=Math.max(0,state.timer-dt);if(state.timer===0){if(state.source){state.phase='active';state.spawnClock=0;return;}wave.members.forEach(member=>spawn({...member,waveId:state.index,spawnTime:EMERGE}));state.phase='active';}}
}
function limit(state,width){return !state||state.phase==='complete'?width-24:state.waves[state.index].boundary;}
function pending(state){return state?.phase==='warning'?state.waves[state.index].members.slice(0,state.source?1:Infinity):[];}
const api={WARNING,REST,EMERGE,plan,step,limit,pending};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EncounterWaves=api;
})(typeof window!=='undefined'?window:globalThis);
