/* Complete-frame locomotion delegates to FullFrameMotion; modular parts retain other actions/outfits. */
(function(root){
'use strict';
const SCALE=.58, WALK_SPEED=190, RUN_SPEED=280;
const C=root.CombatFeel||(typeof module!=='undefined'&&module.exports?require('./combat-feel.js'):null);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
function blend(a,b,t){const p={};for(const k of Object.keys(b))p[k]=Array.isArray(b[k])?b[k].map((v,i)=>Array.isArray(v)?v.map((w,j)=>mix(a[k][i][j],w,t)):mix(a[k][i],v,t)):mix(a[k],b[k],t);return p;}
function base(cls){return {hip:[128,174],lean:0,headTilt:0,feet:[[118,215],[141,215]],back:[112,182],front:[153,174],angle:cls==='warrior'?.52:cls==='mage'?.08:0,draw:0,cape:0};}
function key(cls,values){return {...base(cls),...values};}
const cuts=[
 // Diagonal cut: gather behind shoulder, drive chest and lead foot, follow low.
 [ {front:[146,142],angle:-.65,hip:[125,173],lean:-.10,feet:[[113,215],[139,215]],back:[109,167]},
   {front:[145,121],angle:-1.0,hip:[124,170],lean:-.16,feet:[[113,215],[137,215]],back:[111,163]},
   {front:[170,153],angle:1.55,hip:[136,179],lean:.23,feet:[[114,215],[157,215]],back:[117,160]},
   {front:[163,181],angle:2.3,hip:[135,180],lean:.16,feet:[[118,215],[155,215]],back:[119,168]} ],
 // Rising cut uses its own hand, trunk and foot tracks.
 [ {front:[159,185],angle:2.15,hip:[124,180],lean:-.12,feet:[[112,215],[146,215]],back:[111,166]},
   {front:[153,190],angle:2.4,hip:[123,183],lean:-.18,feet:[[111,215],[147,215]],back:[106,164]},
   {front:[169,149],angle:.75,hip:[135,173],lean:.18,feet:[[120,215],[156,215]],back:[118,162]},
   {front:[148,124],angle:-.50,hip:[133,170],lean:.08,feet:[[124,215],[150,215]],back:[112,155]} ],
 // Finisher: lift, compress, then drive down through the stance.
 [ {front:[151,136],angle:-.1,hip:[126,171],lean:-.06,feet:[[112,215],[147,215]],back:[132,141]},
   {front:[146,113],angle:-.35,hip:[125,168],lean:-.18,feet:[[110,215],[144,215]],back:[129,124]},
   {front:[173,161],angle:1.80,hip:[140,183],lean:.32,feet:[[113,215],[161,215]],back:[130,152]},
   {front:[169,183],angle:2.3,hip:[138,184],lean:.23,feet:[[121,215],[161,215]],back:[124,163]} ]
];
function attackPose(cls,a){
 a=C?.animationAttack(a)||a;
 const b=base(cls),q=clamp(a.time/a.hitAt),r=clamp((a.time-a.hitAt)/a.active),z=clamp((a.time-a.hitAt-a.active)/(a.duration-a.hitAt-a.active));
 let gather,wind,hit,follow;
 if(cls==='warrior') [gather,wind,hit,follow]=cuts[(a.poseCombo??(a.skill===0?2:a.skill===1?0:a.skill===2?1:a.combo))%3].map(v=>key(cls,v));
 else if(cls==='archer'){
  gather=key(cls,{front:[158,158],back:[130,157],hip:[125,176],lean:-.04,feet:[[113,215],[145,215]],draw:5});
  wind=key(cls,{front:[171,141],back:[122,141],hip:[123,177],lean:-.07,feet:[[111,215],[147,215]],draw:25});
  hit=key(cls,{front:[173,141],back:[126,139],hip:[127,175],lean:.03,feet:[[113,215],[150,215]],draw:0});
  follow=key(cls,{front:[169,145],back:[115,144],hip:[128,173],lean:.05,feet:[[116,215],[149,215]],draw:0});
 }else{
  gather=key(cls,{front:[148,155],angle:-.08,back:[135,143],hip:[124,176],lean:-.08,feet:[[113,215],[146,215]]});
  wind=key(cls,{front:[146,130],angle:-.25,back:[136,128],hip:[122,173],lean:-.13,feet:[[111,215],[145,215]]});
  hit=key(cls,{front:[169,151],angle:1.05,back:[145,137],hip:[134,177],lean:.17,feet:[[115,215],[153,215]]});
  follow=key(cls,{front:[171,158],angle:1.2,back:[142,148],hip:[135,179],lean:.15,feet:[[118,215],[155,215]]});
 }
 let out;
 if(a.time<a.hitAt){if(q<.48)out=blend(b,gather,smooth(q/.48));else if(q<.72)out=blend(gather,wind,smooth((q-.48)/.24));else out=blend(wind,hit,smooth((q-.72)/.28));}
 else if(a.time<a.hitAt+a.active)out=blend(hit,follow,smooth(r));
 else{ // Do not hold one pose for most of recovery: settle feet, wrist and shoulders.
  const settle=blend(follow,b,.36);out=z<.30?blend(follow,settle,smooth(z/.30)):blend(settle,b,smooth((z-.30)/.70));
 }
 out.headTilt=-out.lean*.35;out.cape=-out.lean*.45;return out;
}
function gait(cls,phase,run=false){
 const b=base(cls),stance=run?.36:.5,A=run?28:26;
 const feet=[0,.5].map(offset=>{const p=((phase+offset)%1+1)%1;
  if(p<stance)return [128+A-2*A*p/stance,215];
  const q=(p-stance)/(1-stance);return [128-A+2*A*smooth(q),215-(run?23:14)*Math.sin(q*Math.PI)];
 });
 const wave=Math.sin(phase*Math.PI*2),bob=Math.cos(phase*Math.PI*4);
 b.hip=[run?131:128,174+(run?2:1.5)*bob];b.feet=feet;b.lean=run?.18:.025;
 b.back=[112+(run?15:11)*wave,176-(run?7:3)*Math.abs(wave)];
 // Equipped arm still swings. Bow/staff kept at a controlled angle.
 b.front=[153-(run?10:7)*wave,171-(run?6:3)*Math.abs(wave)];
 b.angle+=(run?.22:.12)*wave;b.headTilt=-b.lean*.25+.015*wave;b.cape=.18*wave;return b;
}
function target(cls,state){
 if(state.attack)return attackPose(cls,state.attack);
 const b=base(cls);
 if(state.action==='walk'||state.action==='run')return gait(cls,state.phase,state.action==='run');
 if(state.action==='jump'){
  const rise=clamp(-state.vy/690),fall=clamp(state.vy/760);b.hip=[130,176];b.lean=.10;
  b.feet=[[112,215-18*rise-6*fall],[145,215-25*rise-12*fall]];b.front=[155,167];b.back=[111,163];b.angle+=.15;return b;
 }
 if(state.action==='hurt'){b.hip=[125,178];b.lean=-.18;b.front=[143,158];b.back=[109,158];b.headTilt=-.07;return b;}
 const breathe=Math.sin(state.clock*2.8);b.hip[1]-=breathe*.75;b.front[1]-=breathe*.75;b.cape=.02*breathe;
 if(state.land>0){const squish=Math.sin(clamp(state.land/.12)*Math.PI)*5;b.hip[1]+=squish;b.lean+=.035;}
 return b;
}
// Stance distance is the foot track's backward travel. World-foot speed is zero.
function stride(run=false){return 2*(run?28:26)*SCALE/(run?.36:.5);}
function advance(state,cls,dt){
 const action=state.attack?'attack':state.stun>0?'hurt':!state.grounded?'jump':Math.abs(state.vx)>6?(state.running&&(state.runBlend===undefined||state.runBlend>=.85)?'run':'walk'):'idle';
 const tag=action+(state.attack?':'+state.attack.id:'');
 state.phase=(state.phase+Math.abs(state.travel||0)/stride(state.running))%1;
 const goal=target(cls,{action,attack:state.attack,phase:state.phase,vy:state.vy,clock:state.clock,land:state.land});
 if(state.tag!==tag){state.from=state.pose||goal;state.elapsed=0;state.tag=tag;}
 state.elapsed+=dt;state.pose=blend(state.from,goal,smooth(state.elapsed/(action==='attack'?.055:action==='jump'?.06:.09)));
 state.action=action;state.cls=cls;root.FullFrameMotion?.advance(state,dt);return state.pose;
}
function ik(a,b,l1,l2,bend){
 const dx=b[0]-a[0],dy=b[1]-a[1],raw=Math.hypot(dx,dy),d=clamp(raw,1,l1+l2-.01),angle=Math.atan2(dy,dx)+bend*Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
 return [a[0]+l1*Math.cos(angle),a[1]+l1*Math.sin(angle)];
}
const parts={},palettes=new Map();let loading;
const names=['head','hair_short','hair_pony','hair_bob','under_torso','upper_arm','forearm','thigh','boot','cape','quiver','armor','tunic','robe','helmet_steel','helmet_leather','sleeve_armor','sleeve_tunic','sleeve_robe','sword_0','sword_1','bow_0','bow_1','staff_0','staff_1'];
function load(){if(root.WholeFrameCharacter)return root.FullFrameMotion.load();return loading||(loading=Promise.all(names.map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{parts[name]=im;resolve();};im.onerror=()=>reject(Error('角色部件读取失败: '+name));im.src='assets/customization/parts/'+name+'.webp';}))).then(async()=>{const boot=parts.boot;parts.calf=crop(boot,0,0,19,21);parts.foot=crop(boot,0,21,19,15);parts.hand=crop(parts.forearm,0,parts.forearm.height-7,parts.forearm.width,7);await root.FullFrameMotion?.load();return true;}));}
function crop(im,x,y,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);return c;}
function colored(name,color,skin){
 const id=name+color;if(palettes.has(id))return palettes.get(id);
 const im=parts[name],c=crop(im,0,0,im.width,im.height),ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height);
 const target=(skin?{peach:[245,180,137],tan:[192,127,87],deep:[133,82,58]}:{brown:[110,68,44],gold:[194,154,65],violet:[126,67,158]})[color];
 let sum=0,count=0;
 if(!skin)for(let i=0;i<data.data.length;i+=4){if(data.data[i+3]&&Math.max(...data.data.slice(i,i+3))>45){sum+=data.data[i]+data.data[i+1]+data.data[i+2];count+=3;}}
 const ref=skin?(245+180+137)/3:sum/count||74;
 for(let i=0;i<data.data.length;i+=4){const d=data.data,r=d[i],g=d[i+1],b=d[i+2];if(!d[i+3]||(skin?!(r>135&&r>g+18&&g>b+10):Math.max(r,g,b)<=45))continue;const lum=(r+g+b)/3/ref;for(let j=0;j<3;j++)d[i+j]=clamp(target[j]*lum,0,255);}
 ctx.putImageData(data,0,0);palettes.set(id,c);return c;
}
function at(c,im,p,anchor,angle=0,s=1){c.save();c.translate(...p);c.rotate(angle);c.scale(s,s);c.drawImage(im,-anchor[0],-anchor[1]);c.restore();}
function limb(c,im,a,b,width=im.width){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);c.save();c.translate(...a);c.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);c.drawImage(im,-width/2,-2,width,length+5);c.restore();}
function draw(c,role,p,x,y,scale=SCALE,dir='right',state=null){
 if(root.WholeFrameCharacter)return root.FullFrameMotion.draw(c,role,state||{action:'idle',clock:0},x,y,scale,dir);
 if(state&&root.FullFrameMotion?.draw(c,role,state,x,y,scale,dir))return true;
 if(!parts.hand)return false;
 const appearance=role.appearance||{skin:'peach',hair:'short',color:'brown'},skin=appearance.skin,clothes=role.equipped?.clothes?.id||({warrior:'armor',archer:'tunic',mage:'robe'}[role.cls]),helm=role.equipped?.helmet?.id;
 const hip=p.hip,shift=Math.sin(p.lean)*30,shoulder=[hip[0]+14+shift,hip[1]-30],rear=[hip[0]-13+shift,hip[1]-28],head=[hip[0]+Math.sin(p.lean)*43,hip[1]-Math.cos(p.lean)*43];
 const ef=ik(shoulder,p.front,21,24,-1),eb=ik(rear,p.back,21,24,1),ua=colored('upper_arm',skin,true),fa=colored('forearm',skin,true);
 c.save();c.translate(x,y);c.scale(dir==='left'?-scale:scale,scale);c.translate(-128,-224);c.imageSmoothingEnabled=false;
 if(role.cls==='warrior')at(c,parts.cape,[hip[0]-9,hip[1]-35],[20,0],-.08-p.lean*.6+p.cape);
 if(role.cls==='archer')at(c,parts.quiver,[hip[0]-17,hip[1]-43],[12,0],-.12+p.lean);
 limb(c,ua,rear,eb);limb(c,fa,eb,p.back);
 for(let i=0;i<2;i++){const h=[hip[0]+(i?8:-7),hip[1]],f=p.feet[i],k=ik(h,f,25,29,-1);limb(c,colored('thigh',skin,true),h,k);limb(c,parts.calf,k,f,15);at(c,parts.foot,f,[8,6],f[1]>=214.8?0:(f[0]<128?.25:-.20));}
 at(c,parts.under_torso,hip,[21.5,42],p.lean);
 const torso=parts[clothes],sleeve=parts['sleeve_'+clothes];limb(c,sleeve,rear,eb);at(c,torso,hip,[torso.width/2,clothes==='robe'?43:42],p.lean);
 limb(c,ua,shoulder,ef);limb(c,fa,ef,p.front);limb(c,sleeve,shoulder,ef);
 const headAngle=p.lean*.5+p.headTilt;at(c,colored('head',skin,true),head,[28,55],headAngle,.86);
 const hair=parts['hair_'+appearance.hair];at(c,colored('hair_'+appearance.hair,appearance.color,false),[head[0]-1,head[1]-2],[hair.width*(appearance.hair==='pony'?.54:.5),hair.height-2],headAngle,.86);
 if(helm){const im=parts[helm];at(c,im,[head[0]-1,head[1]-3],[im.width/2,im.height-2],headAngle,.86);}
 const type={warrior:'sword',archer:'bow',mage:'staff'}[role.cls],wp=parts[type+'_'+(role.equipped?.weapon?.id.endsWith('_1')?1:0)],anchor=type==='sword'?[wp.width/2,wp.height-11]:type==='bow'?[wp.width-5,wp.height/2]:[wp.width/2,wp.height*.69];at(c,wp,p.front,anchor,p.angle);
 if(type==='bow'){
  c.save();c.translate(...p.front);c.rotate(p.angle);c.strokeStyle='#dcccae';c.lineWidth=1;c.beginPath();c.moveTo(-10,-wp.height/2+3);c.lineTo(-p.draw-3,0);c.lineTo(-10,wp.height/2-3);c.stroke();
  if(p.draw>2){c.strokeStyle='#b99a65';c.lineWidth=2;c.beginPath();c.moveTo(-p.draw-3,0);c.lineTo(37,0);c.stroke();c.fillStyle='#c6cbc8';c.beginPath();c.moveTo(43,0);c.lineTo(36,-3);c.lineTo(36,3);c.fill();}c.restore();
 }
 at(c,colored('hand',skin,true),p.front,[6.5,5],0);c.restore();return true;
}
function attachment(p,x,y,dir,scale=SCALE){const sign=dir==='left'?-1:1;return {x:x+sign*(p.front[0]-128)*scale,y:y+(p.front[1]-224)*scale};}
function muzzle(cls,p,x,y,dir,scale=SCALE){
 const offset=cls==='mage'?[70*Math.sin(p.angle),-70*Math.cos(p.angle)]:[43*Math.cos(p.angle),43*Math.sin(p.angle)];
 return attachment({...p,front:p.front.map((v,i)=>v+offset[i])},x,y,dir,scale);
}
const api={SCALE,WALK_SPEED,RUN_SPEED,base,blend,target,gait,attackPose,advance,stride,ik,load,draw,attachment,muzzle};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CharacterMotion=api;
})(typeof window!=='undefined'?window:globalThis);
