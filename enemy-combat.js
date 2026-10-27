/* Readable, deterministic forest elite attacks. Warnings and damage share one geometry. */
(function(root){
'use strict';
const names={slime:'苔芽团',wolf:'灰棘狼',goblin:'蘑菇斥候',boar:'猛獠野猪',stone_chief:'岩骨统领',vine_guard:'荆棘守卫',ancient_tree:'腐果古树'};
const specs={
 charge:{label:'獠牙冲锋',windup:.78,active:.46,recovery:1.05,range:330,color:'#f0a358'},
 stomp:{label:'践踏',windup:.64,active:.16,recovery:.9,range:180,color:'#f0a358'},
 shield:{label:'举盾重砸',windup:1.05,active:.2,recovery:1.1,range:310,color:'#e1c27c'},
 stones:{label:'双重震波',windup:.82,active:.46,recovery:1,range:310,color:'#e1c27c'},
 roots:{label:'缠根突刺',windup:.9,active:.42,recovery:1.1,range:370,color:'#9ed779'},
 thorns:{label:'荆棘横扫',windup:.7,active:.2,recovery:1.05,range:180,color:'#9ed779'},
 slam:{label:'古木重砸',windup:.9,active:.36,recovery:1.15,range:370,color:'#e5b366'},
 rootline:{label:'追地根刺',windup:.86,active:.8,recovery:1.05,range:370,color:'#9ed779'},
 fruit:{label:'腐果爆弹',windup:.85,active:.55,recovery:1.3,range:370,color:'#e98867'},
 awaken:{label:'腐根苏醒',windup:1,active:.1,recovery:.65,range:370,color:'#d88462'}
};
const supported=e=>e.category!=='normal'&&['boar','stone_chief','vine_guard','ancient_tree'].includes(e.type);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function reset(e){e.eliteMove=null;e.attackIndex=0;e.guard=0;e.exposed=0;e.phase=1;e.enraged=false;}
function begin(e,hero,forced){
 if(!supported(e))return false;
 const rotation=e.type==='boar'?['charge','stomp']:e.type==='stone_chief'?['shield','stones']:e.type==='vine_guard'?['roots','thorns']:['slam','rootline','fruit'];
 const key=forced||rotation[(e.attackIndex||0)%rotation.length],spec=specs[key];e.attackIndex=(e.attackIndex||0)+1;
 const direction=hero.x>=e.x?1:-1,combo=e.type==='ancient_tree'&&e.enraged;
 const active=combo&&key==='slam'?.82:combo&&key==='rootline'?1.05:spec.active;
 e.exposed=0;e.eliteMove={key,...spec,active,startX:e.x,dir:direction,targetX:hero.x,targetY:hero.y,clock:0,done:new Set(),combo};
 e.state='attack';e.attackTimer=0;e.hitAt=spec.windup;e.attackDuration=spec.windup+active+spec.recovery;e.hit=false;e.animTime=0;e.dir=direction>0?'right':'left';e.attackKind=key==='charge'||key==='shield'||key==='slam'?1:key==='stomp'||key==='stones'||key==='fruit'?2:3;e.guard=key==='shield'?4:0;
 return true;
}
function transition(e,hero){
 if(e.type!=='ancient_tree'||e.state==='death'||e.enraged||e.hp>e.maxHp*.5)return false;
 e.phase=2;e.enraged=true;e.attackIndex=0;begin(e,hero,'awaken');e.attackIndex=0;return true;
}
function cancel(e){e.eliteMove=null;e.guard=0;e.state='idle';e.cooldown=.6;}
function range(e){return e.type==='boar'?330:e.type==='stone_chief'?310:e.type==='vine_guard'?370:370;}
function modifier(e,x){if(e.exposed>0)return 1.25;if(e.type==='vine_guard'&&e.eliteMove?.key==='roots'&&e.attackTimer<e.hitAt)return 1.2;return e.guard>0&&e.eliteMove?.key==='shield'&&(x-e.x)*e.eliteMove.dir>=-10?.45:1;}
function receive(e,x,skill){if(e.guard<=0||!e.eliteMove||(x-e.x)*e.eliteMove.dir<-10)return false;e.guard-=skill>=0?2:1;if(e.guard>0)return false;cancel(e);e.exposed=1.65;e.cooldown=1.65;return true;}
function step(e,dt,world){
 const m=e.eliteMove;if(!m||e.state!=='attack')return [];
 m.clock+=dt;e.attackTimer=m.clock;const events=[];
 const emit=(id,at,value)=>{if(m.clock>=at&&!m.done.has(id)){m.done.add(id);events.push(value);}};
 const ground=x=>world.groundAt(x),bound=x=>clamp(x,world.min+36,world.max-36),x=m.targetX,y=e.y,at=m.windup;
 const zone=(kind,px,radius,warning,damage,height=50)=>({kind,x:bound(px),y:ground(bound(px)),radius,height,warning,active:kind==='root'?.32:.22,life:warning+.65,damage:e.atk*damage,owner:e});
 if(m.key==='charge'&&m.clock>=at&&m.clock<at+m.active){
  const end=clamp(x+m.dir*70,e.patrolMin,e.patrolMax),next=m.startX+(end-m.startX)*clamp((m.clock-at)/m.active,0,1);
  if(Math.abs(ground(next)-e.y)<9)e.x=next;e.hit=true;
  if(!m.done.has('chargeHit')&&Math.abs(world.hero.x-e.x)<world.half(e)+18&&Math.abs(world.hero.y-e.y)<55){m.done.add('chargeHit');events.push({kind:'contact',damage:e.atk*1.08,x:e.x});}
 }
 if(m.key==='stomp')emit('stomp',0,zone('slam',e.x,115,at,1.05,38));
 if(m.key==='shield'||m.key==='stones'){
  emit('wave',at,{kind:'wave',x:e.x+m.dir*45,y,dir:m.dir,speed:240,radius:25,height:32,warning:0,active:1.35,life:1.35,remaining:310,damage:e.atk,owner:e});
  if(m.key==='stones')emit('wave2',at+.36,{kind:'wave',x:e.x+m.dir*45,y,dir:m.dir,speed:250,radius:25,height:32,warning:0,active:1.25,life:1.25,remaining:300,damage:e.atk*.85,owner:e});
 }
 if(m.key==='roots')for(let i=0;i<3;i++)emit('root'+i,0,zone('root',x+[0,-110,110][i],36,at+i*.2,.85,62));
 if(m.key==='thorns')emit('sweep',0,zone('thorn',e.x+m.dir*78,100,at,1,65));
 if(m.key==='slam'){
  emit('slam',0,zone('slam',e.x+m.dir*110,110,at,1.12,42));
  emit('wave',at,{kind:'wave',x:e.x+m.dir*55,y,dir:m.dir,speed:260,radius:28,height:30,warning:0,active:1.4,life:1.4,remaining:340,damage:e.atk*.8,owner:e});
  if(m.combo)emit('reverse',at+.55,{kind:'wave',x:e.x-m.dir*50,y,dir:-m.dir,speed:235,radius:28,height:30,warning:0,active:1.3,life:1.3,remaining:300,damage:e.atk*.8,owner:e});
 }
 if(m.key==='rootline')for(let i=0;i<(m.combo?5:3);i++)emit('root'+i,0,zone('root',x+[0,-100,100,-200,200][i],34,at+i*.22,.9,65));
 if(m.key==='fruit')for(let i=0;i<(m.combo?3:2);i++)emit('fruit'+i,0,zone('fruit',x+[-105,105,0][i],58,at+i*.25,1.05,85));
 if(m.clock>=at){e.hit=true;e.guard=0;}
 if(m.key!=='awaken'&&m.clock>=at+m.active&&!m.done.has('opening')){m.done.add('opening');e.exposed=m.recovery+(e.type==='ancient_tree'?.75:.65);events.push({kind:'opening',x:e.x});}
 if(m.clock>=e.attackDuration){e.state='idle';e.eliteMove=null;e.guard=0;e.cooldown=e.type==='ancient_tree'?.75:.65;e.exposed=m.key==='awaken'?0:e.type==='ancient_tree'?1.2:.9;events.push({kind:'recovery',x:e.x});}
 return events;
}
function intersects(h,hero,from=h.x){
 if(h.kind==='wave'){const left=Math.min(from,h.x)-h.radius,right=Math.max(from,h.x)+h.radius;return hero.x+12>=left&&hero.x-12<=right&&hero.y>=h.y-h.height&&hero.y-84<h.y+4;}
 return Math.abs(hero.x-h.x)<h.radius+10&&hero.y>=h.y-h.height&&hero.y-84<h.y+8;
}
function stepHazards(hazards,dt,hero,world){
 for(const h of hazards){
  if(h.owner.state==='death'){h.life=0;continue;}
  const previousWarning=h.warning;h.age=(h.age||0)+dt;h.life-=dt;h.warning=Math.max(-1,h.warning-dt);if(h.life<=0)continue;
  const from=h.x;
  if(h.kind==='wave'){const travel=Math.min(h.remaining,h.speed*dt),next=h.x+h.dir*travel;if(Math.abs(world.groundAt(next,h.y)-h.y)>12){h.life=0;continue;}h.x=next;h.remaining-=travel;if(h.remaining<=0)h.life=0;}
  if(previousWarning>0&&h.warning<=0)world.impact?.(h);
  const elapsed=Math.max(0,-h.warning);if(!h.hit&&h.warning<=0&&elapsed<=h.active&&intersects(h,hero,from)){
   if(world.hurt(h.damage,h.x)){h.hit=true;if(h.kind==='root')world.slow?.(.65,.35);}
  }
 }
 return hazards.filter(h=>h.life>0&&h.owner.state!=='death');
}
const api={names,specs,supported,reset,begin,transition,cancel,range,modifier,receive,step,intersects,stepHazards};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EnemyCombat=api;
})(typeof window!=='undefined'?window:globalThis);
