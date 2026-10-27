/* Native enemy pose maps and relative attributes, adapted to three-class RPG combat.
 * Source events inform attack motifs; target selection/cooldowns are explicit adaptations. */
(function(root){
'use strict';
const node=typeof module!=='undefined'&&module.exports,D=node?require('./source-world-data.js'):root.SourceWorldData,A=node?require('./source-enemy-art.js'):root.SourceEnemyArt;
const WE=node?require('./woodland-enemies.js'):root.WoodlandEnemies;
const names=WE.names;
const supported=e=>!!D.enemies[e.type],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function stats(type,category,rank){const a=D.enemies[type],large=category!=='normal';return {hp:Math.round((large?340*(category==='boss'?1+rank*.13:1):78)*Math.pow(a.thisAllHp/100,.30)*(1+rank*(large?.10:.08))),atk:Math.round((12+rank*3.3+Math.sqrt(a.thisAtt)*1.3)*(large?1.2+rank*.035:1)),def:Math.round(rank*2+a.thisDef*.16),moveSpeed:clamp(a.thisSpeed*24*1.2,58,190)};}
function body(e){const a=A[e.type],height=e.category==='boss'?170:e.category==='elite'?130:clamp(a.visibleHeight*1.1,76,112),scale=height/a.visibleHeight;return {height,width:a.visibleWidth*scale,half:Math.min(60,a.visibleWidth*scale*.32),scale};}
async function load(types){await WE.load();}
function action(e,key){const all=D.animations[D.enemies[e.type].animationProfile].actions;let a=all[key]||(key==='run'?all.walk:null)||all.attack||all.wait;while(a.aliasOf)a=all[a.aliasOf];return a;}
function tickValue(v,e){return typeof v==='number'?v:v==='defHitSpd'?D.enemies[e.type].defHitSpd:0;}
function frame(e){const key=e.state==='death'?'dead':e.hurt>0?'behit':e.state==='attack'?(e.sourceAction||'attack'):e.state==='move'?'run':'wait',a=action(e,key);let tick=(e.state==='attack'?e.attackTimer/(e.sourceTimeScale||1):e.state==='death'?.85-e.dead:e.hurt>0?.24-e.hurt:e.animTime)*24;if(a.loopTicks)tick%=a.loopTicks;let n=a.frames?.[0]?.frame||1;for(const f of a.frames||[])if(tick>=tickValue(f.tick,e))n=f.frame;return clamp(n-1,0,A[e.type].count-1);}
function draw(ctx,e){return WE.draw(ctx,e,body(e));}
function drawEffect(ctx,key,x,y,age=0,width=110,dir=1,loop=false){return WE.effect(ctx,key,x,y,age,width,dir,loop);}
function begin(e,hero,forced){const all=D.animations[D.enemies[e.type].animationProfile].actions,keys=Object.keys(all).filter(k=>k.startsWith('attack'));e.attackIndex=(e.attackIndex||0)+1;e.sourceAction=forced&&all[forced]?forced:keys[(e.attackIndex-1)%keys.length];const a=action(e,e.sourceAction),events=(a.events||[]).filter(v=>/setHitObj|addSkill|changState/.test(v.code)),ticks=[...new Set(events.map(v=>v.tick==='unknown'&&e.sourceAction==='attack2'?e.type==='b7'?12:e.type==='b9'?10:tickValue(v.tick,e):tickValue(v.tick,e)))].sort((a,b)=>a-b);const first=ticks.find(t=>t>0)||D.enemies[e.type].defHitSpd||8;e.sourceTimeScale=Math.max(1,(e.category==='normal'?.32:.55)/(first/24));e.hitAt=first/24*e.sourceTimeScale;e.sourceEvents=(ticks.length?ticks:[first]).map(t=>Math.max(t,first)/24*e.sourceTimeScale);e.attackTimer=0;e.hit=false;e.state='attack';e.targetX=hero.x;e.targetY=hero.y;e.dir=hero.x>=e.x?'right':'left';e.attackDuration=Math.max(e.hitAt,e.sourceEvents.at(-1),Math.max(...(a.frames||[]).map(f=>tickValue(f.tick,e)))/24*e.sourceTimeScale)+(e.category==='normal'?.4:.8);e.fired=0;e.animTime=0;}
function range(e){return e.category==='normal'?(D.enemies[e.type].skillObj?260:100):['b2','b3','b4','b6','b7','b8','b11'].includes(e.type)?330:210;}
function strike(e,index,world){const dir=e.dir==='right'?1:-1,key=e.sourceAction,second=key!=='attack1'&&key!=='attack',h=world.hero;
 const zone=(kind,x,radius,delay=.25,mult=1)=>world.hazard({kind,x,y:world.floor(x,h.y),radius,height:kind==='root'?85:48,warning:delay,active:.3,life:delay+.65,damage:e.atk*mult,owner:e,sourceFx:e.type==='b3'?'s3mc':e.type==='b6'?'s7mc':e.type==='b11'?'s11mc':e.type==='b7'?'s8mc':null});
 const wave=(direction=dir)=>world.hazard({kind:'wave',x:e.x+direction*35,y:e.y,dir:direction,speed:260,radius:26,height:34,warning:0,active:1.7,life:1.7,remaining:420,damage:e.atk,owner:e,sourceFx:e.type==='b11'?'s12mc':'s1mc'});
 if(e.type==='b11'&&key==='call'){world.projectile(e,index%2?-dir:dir,'s10mc');return;}
 if(D.enemies[e.type].skillObj){world.projectile(e,dir);return;}
 if(e.type==='b8'&&second){const allies=world.enemies.filter(a=>a!==e&&a.state!=='death'&&Math.abs(a.x-e.x)<500),ally=allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally){ally.hp=Math.min(ally.maxHp,ally.hp+e.atk*2);world.number('治疗',ally.x,ally.y-100,'#a4e6a0');}else e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.025);return;}
 if(e.type==='b3'&&second||e.type==='b11'&&key==='attack2'){zone('root',e.targetX+index%2*60,45,.38);return;}
 if(e.type==='b6'&&!second){zone('slam',e.x-(50+index*100),48,.28);zone('slam',e.x+(50+index*100),48,.28);return;}
 if(['b2','b4','b6'].includes(e.type)&&second){world.projectile(e,dir);return;}
 if((e.type==='b1'||e.type==='b5'||e.type==='b11')&&second){wave();return;}
 if(e.type==='b7'&&key==='attack3'){zone('fruit',e.targetX,65,.55);return;}
 if(e.type==='b9'&&second||e.type==='b7'&&key==='attack2'){e.sourceCharge=(e.type==='b7'?14:20)/24;e.chargeDir=dir;return;}
 const r=e.category==='normal'?95:e.type==='b5'?240:175;if(Math.abs(h.x-e.x)<r&&(h.x-e.x)*dir>-25&&Math.abs(h.y-e.y)<90)world.hurt(e.atk,e.x);world.effect(e.x+dir*r*.5,e.y-35,e.category!=='normal');
}
function update(e,dt,w){
 if(e.state==='death')return;if(e.spawnTime>0){e.spawnTime=Math.max(0,e.spawnTime-dt);return;}e.slow=Math.max(0,e.slow-dt);if(!e.slow)e.slowRatio=0;if(e.freeze>0){e.freeze=Math.max(0,e.freeze-dt);return;}
 const ox=e.x,oy=e.y,grounded=e.grounded;e.vy=(e.vy||0)+2600*dt;e.y+=e.vy*dt;e.grounded=false;e.x+=e.knock*dt;e.knock*=Math.exp(-10*dt);e.stun=Math.max(0,e.stun-dt);e.cooldown-=dt;
 if(e.hp<e.maxHp*.5&&!e.enraged&&['b7','b11'].includes(e.type)){e.enraged=true;if(e.type==='b7')w.summon(e,'b7_1',3);else begin(e,w.hero,'call');}
 const dist=Math.abs(w.hero.x-e.x),dy=w.hero.y-e.y;
 if(e.stun<=0){
 if(e.state==='attack'){e.attackTimer+=dt;while(e.fired<e.sourceEvents.length&&e.attackTimer>=e.sourceEvents[e.fired]){strike(e,e.fired,w);e.fired++;e.hit=true;}if(e.sourceCharge>0){e.sourceCharge-=dt;e.x+=e.chargeDir*360*dt;if(Math.abs(e.x-w.hero.x)<55&&Math.abs(dy)<80)w.hurt(e.atk*1.2,e.x);}if(e.attackTimer>=e.attackDuration){e.state='idle';e.cooldown=e.enraged?.55:.85;e.exposed=.45;}}
 else if(dist<650){e.aware=true;e.dir=w.hero.x>e.x?'right':'left';if(dist<range(e)&&Math.abs(dy)<130&&e.cooldown<=0)begin(e,w.hero);else if(dist>range(e)*.65||Math.abs(dy)>110){e.state='move';e.x+=Math.sign(w.hero.x-e.x)*e.moveSpeed*(e.slow>0?1-(e.slowRatio||.6):1)*dt;if(grounded&&dy<-45&&dist<260&&e.cooldown<.3){e.vy=-700;e.grounded=false;e.cooldown=.8;}if(w.ladder(e.x,e.y)&&dy<-40){e.y-=150*dt;e.vy=0;}}else e.state='idle';}else e.state='idle';}
 w.move(e,ox,oy,dt,{grounded,height:body(e).height,half:Math.min(18,body(e).half)});
 if(Math.abs(e.x-ox)<.1&&e.state==='move'&&grounded&&e.cooldown<=0){e.vy=-700;e.cooldown=.75;}
}
const api={supported,names,stats,body,load,draw,drawEffect,frame,action,begin,range,update};if(node)module.exports=api;else root.SourceEnemies=api;
})(globalThis);
