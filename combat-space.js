/* Shared world proportions and local projectile limits. Coordinates use the 1280px stage. */
(function(root){
'use strict';
const PLAYER_SCALE=.58,PLAYER_HEIGHT=146*PLAYER_SCALE;
const bodies={
 slime:{height:78,nativeHeight:177,nativeWidth:182},wolf:{height:94,nativeHeight:111,nativeWidth:108},
 goblin:{height:90,nativeHeight:144,nativeWidth:159},boar:{height:118,nativeHeight:138,nativeWidth:173},
 stone_chief:{height:124,nativeHeight:165,nativeWidth:161},vine_guard:{height:126,nativeHeight:168,nativeWidth:156},
 ancient_tree:{height:178,nativeHeight:184,nativeWidth:159}
};
function body(e){if(globalThis.SourceEnemies?.supported(e))return globalThis.SourceEnemies.body(e);const b=bodies[e.type]||bodies.goblin,scale=b.height/b.nativeHeight;return {height:b.height,width:b.nativeWidth*scale,scale,half:b.nativeWidth*scale*.44};}
function projectile(cls,skill=-1){const range=cls==='archer'?[340,390,430,320][skill+1]:[260,310,220,280][skill+1],speed=cls==='archer'?640:skill<0?180:250;return {range,speed,life:range/speed+.08};}
function visible(e,camera,width){return e.x>=camera+12&&e.x<=camera+width-12;}
function inShotView(shot,camera,width){return shot.x>=Math.max(shot.viewLeft??-Infinity,camera+8)&&shot.x<=Math.min(shot.viewRight??Infinity,camera+width-8);}
function blocked(scene,from,to){
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/6));
 for(let i=1;i<=steps;i++){const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
  if(scene.sourceMap){if(globalThis.SourceWorld.solidAt(scene,x,y))return true;continue;}
  if(scene.terrain?.some(s=>x>=s.x&&x<s.x+s.width&&y>=s.y-2))return true;
  if(!scene.terrain&&y>=scene.ground-2)return true;
 }return false;
}
function intersects(from,to,e){const b=body(e),minX=e.x-b.half,maxX=e.x+b.half,minY=e.y-b.height+4,maxY=e.y-3;let lo=0,hi=1;
 for(const [a,d,min,max] of [[from.x,to.x-from.x,minX,maxX],[from.y,to.y-from.y,minY,maxY]]){if(Math.abs(d)<1e-9){if(a<min||a>max)return false;continue;}let l=(min-a)/d,h=(max-a)/d;if(l>h)[l,h]=[h,l];lo=Math.max(lo,l);hi=Math.min(hi,h);if(lo>hi)return false;}return true;
}
const api={PLAYER_SCALE,PLAYER_HEIGHT,bodies,body,projectile,visible,inShotView,blocked,intersects};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CombatSpace=api;
})(typeof window!=='undefined'?window:globalThis);
