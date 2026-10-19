/* Shared skill timing and local targeting. No save-schema or normal-attack changes. */
(function(root){'use strict';
const specs={
 warrior:[
  {kind:'cleave',duration:.94,cancelAt:.83,times:[.28],weights:[1],poses:[2],range:166,knock:390,stun:.42,stop:.06},
  {kind:'crosscut',duration:1.12,cancelAt:1.02,times:[.2,.46,.76],weights:[.26,.3,.44],poses:[0,1,2],range:178,knock:135,stun:.22,stop:.024,lunge:30},
  {kind:'vortex',duration:1.38,cancelAt:1.27,times:[.25,.5,.76,1.03],weights:[.17,.19,.24,.4],poses:[1,0,1,2],range:202,knock:90,stun:.25,stop:.025}
 ],
 archer:[
  {kind:'wind',duration:1.0,cancelAt:.9,times:[.19,.4,.63],weights:[1/3,1/3,1/3],range:370,knock:45,stun:.1,stop:.013},
  {kind:'pierce',duration:1.08,cancelAt:.98,times:[.51],weights:[1],range:425,knock:155,stun:.3,stop:.035},
  {kind:'rain',duration:1.18,cancelAt:1.07,times:[.39],weights:[1],range:305,knock:35,stun:.14,stop:.016}
 ],
 mage:[
  {kind:'fire',duration:1.1,cancelAt:1,times:[.39],weights:[1],range:320,knock:155,stun:.35,stop:.045},
  {kind:'frost',duration:1.2,cancelAt:1.09,times:[.34],weights:[1],range:270,knock:25,stun:.17,stop:.018},
  {kind:'meteor',duration:1.42,cancelAt:1.31,times:[.51],weights:[1],range:300,knock:35,stun:.25,stop:.025}
 ]
};
function definition(cls,slot){return specs[cls]?.[slot];}
function profile(cls,slot,factor=1){const s=definition(cls,slot);if(!s)return null;return {...s,duration:s.duration*factor,cancelAt:s.cancelAt*factor,hitAt:s.times[0]*factor,active:.08*factor,lunge:s.lunge||0,
 strikes:s.times.map((at,i)=>({at:at*factor,start:i?((s.times[i-1]+.11)*factor):0,active:.08*factor,weight:s.weights[i],damageFraction:s.weights[i],combo:s.poses?.[i]??0,poseCombo:s.poses?.[i],range:s.range,knock:i===s.times.length-1?(s.kind==='vortex'?340:s.knock*1.3):s.knock,stun:s.stun,stop:i===s.times.length-1&&s.times.length>1?.042:s.stop,lunge:s.lunge?s.lunge/s.times.length:0}))};}
// Destination never lies beyond the cast viewport or a raised solid shelf.
function zone(scene,origin,dir,range,camera,width,blocked){let reach=0;for(let distance=8;distance<=range;distance+=8){if(origin.x+dir*distance<camera+16||origin.x+dir*distance>camera+width-16||blocked(scene,{x:origin.x,y:origin.y-42},{x:origin.x+dir*distance,y:origin.y-42}))break;reach=distance;}
 const radius=Math.min(range*.38,reach*.46),x=origin.x+dir*Math.max(0,reach-radius);return {x,y:origin.y,radius,reach,left:camera+12,right:camera+width-12,origin:{x:origin.x,y:origin.y-42}};
}
function areaContains(zone,e,camera,width,body,blocked,scene){return e.x>=Math.max(zone.left,camera+12)&&e.x<=Math.min(zone.right,camera+width-12)&&Math.abs(e.x-zone.x)<=zone.radius+Math.min(20,body(e).half)&&Math.abs(e.y-zone.y)<78&&!blocked(scene,zone.origin,{x:e.x,y:e.y-42});}
function ticks(kind){return kind==='rain'?{times:[.28,.42,.56,.7,.84,.98],weights:[1/6,1/6,1/6,1/6,1/6,1/6]}:kind==='frost'?{times:[.06,.3,.55],weights:[.25,.3,.45]}:{times:[.35,.65,.95],weights:[.2,.25,.55]};}
const api={definition,profile,zone,areaContains,ticks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SkillCombat=api;
})(typeof window!=='undefined'?window:globalThis);
