/* Original whole-body enemy frames. Gameplay events remain in SourceEnemies. */
(function(root){
'use strict';
const families={
 beast:['l1','l7','l8','l9','l10','slime','wolf'],
 spirit:['l2','l4','l5','l13','fl2','goblin'],
 warden:['l3','l6','l11','l12','l14','fl1','b1','b2','b4','b6','b7','b7_1','b9','b10','boar','stone_chief'],
 ancient:['l15','b3','b5','b8','b11','vine_guard','ancient_tree']
};
const names={l1:'苔石幼兽',l2:'枝叶精灵',l3:'苔岩守卫',l4:'棘叶猎手',l5:'藤枝斥候',l6:'遗石重卫',l7:'苔石巡游兽',l8:'裂岩猎兽',l9:'苔石疾行兽',l10:'巨苔岩兽',l11:'遗庭重卫',l12:'石庭守卫',l13:'枯叶猎手',l14:'岩甲精兵',l15:'枝角守卫',fl1:'林心近卫',fl2:'林心叶语者',b1:'苔冠石卫',b2:'溪谷石灵',b3:'古枝守望者',b4:'断桥岩主',b5:'幽叶领主',b6:'遗迹石像',b7:'裂岩战将',b7_1:'岩灵分身',b8:'古枝祭司',b9:'石窟战将',b10:'林心门卫',b11:'苍枝古王',slime:'苔石幼兽',wolf:'苔石猎兽',goblin:'枝叶精灵',boar:'苔岩重卫',stone_chief:'遗迹石卫',vine_guard:'古枝守卫',ancient_tree:'苍枝古王'};
const rows=Object.keys(families),lookup=Object.fromEntries(Object.entries(families).flatMap(([k,ids])=>ids.map(id=>[id,k])));
const PATH='assets/enemies/woodland-v43/actors.webp';
let atlas,loading;
function family(e){return lookup[typeof e==='string'?e:e.type];}
function load(){return loading||(loading=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{atlas=im;resolve(true);};im.onerror=()=>{loading=null;reject(Error('林地怪物图集加载失败'));};im.src=PATH;}));}
function frame(e){
 if(e.state==='death'||e.hurt>0)return 5;
 if(e.state==='attack'){
  const hit=e.hitAt||e.eliteMove?.windup||.5,time=e.attackTimer||0;
  if(Array.isArray(e.sourceEvents)&&e.sourceEvents.length>1){for(const at of e.sourceEvents){if(time>=at&&time<at+.2)return 4;if(time>=at-.25&&time<at)return 3;}}
  if(time<hit*.16)return 0;
  if(time<hit)return 3;
  if(time<Math.min(e.attackDuration||hit+.4,hit+.28))return 4;
  return 0;
 }
 if(e.state==='move')return 1+Math.floor((e.animTime||0)*7)%2;
 return 0;
}
function draw(c,e,body){
 const f=family(e);if(!f||!atlas)return false;
 const row=rows.indexOf(f),n=frame(e),height=body?.height||(e.category==='boss'?170:e.category==='elite'?130:90),scale=height/180;
 const time=e.animTime||0,idle=e.state==='idle',walking=e.state==='move',breath=idle?Math.sin(time*2.6)*.008:0;
 c.save();c.imageSmoothingEnabled=true;c.scale(e.dir==='left'?-1:1,1);
 c.translate(0,walking?-Math.abs(Math.sin(time*7*Math.PI))*1.7:0);c.scale(1-breath,1+breath);
 if(e.state==='death'){const p=Math.max(0,Math.min(1,1-(e.dead||0)/.85));c.rotate(p*.6);c.scale(1,p*.25+1-p);}
 if(e.flash>0)c.filter='brightness(1.55)';
 c.drawImage(atlas,n*320,row*320,320,320,-160*scale,-292*scale,320*scale,320*scale);
 c.restore();return true;
}
// Replace the extracted enemy spell paintings with local woodland motifs.
function effect(c,key,x,y,age=0,width=110,dir=1,loop=false){
 const roots=['s3mc','s11mc'].includes(key),stone=['s1mc','s7mc','s8mc','s12mc'].includes(key);
 const p=Math.min(1,Math.max(0,age/.45)),r=Math.min(110,width*.4),fade=loop?1:Math.max(0,1-age/.75);
 c.save();c.translate(x,y);c.scale(dir,1);c.globalAlpha*=fade;
 if(roots){for(let i=-1;i<=1;i++){
  const h=(60+18*(1-Math.abs(i)))*Math.min(1,(age+.04)/.16),xx=i*r*.55;
  c.beginPath();c.moveTo(xx,0);c.bezierCurveTo(xx-16,-h*.3,xx+19,-h*.7,xx+8,-h);c.strokeStyle='#293f32';c.lineWidth=9;c.stroke();c.strokeStyle='#a5b679';c.lineWidth=5;c.stroke();
  c.fillStyle='#6d935c';for(let j=1;j<4;j++){c.beginPath();c.ellipse(xx+(j%2?6:-5),-h*j/4,9,3,j%2?-.7:.7,0,Math.PI*2);c.fill();}
 }}else if(stone){
  c.strokeStyle='#c6c59b';c.lineWidth=2;c.beginPath();c.ellipse(0,-3,r*(.4+p*.7),7+p*10,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<6;i++){const xx=(i-2.5)*r*.33,h=(i%2?24:37)*(1-p*.5);c.beginPath();c.moveTo(xx-9,0);c.lineTo(xx-7,-h*.7);c.lineTo(xx+2,-h);c.lineTo(xx+9,-h*.4);c.lineTo(xx+11,0);c.closePath();c.fillStyle=i%2?'#6b7c66':'#899880';c.fill();c.strokeStyle='#c4c8a4';c.lineWidth=1.2;c.stroke();}
 }else{
  const rr=Math.min(19,width*.2),glow=c.createRadialGradient(0,0,1,0,0,rr*1.8);glow.addColorStop(0,'#e8d39bb0');glow.addColorStop(1,'#a8c67a00');c.fillStyle=glow;c.fillRect(-rr*2,-rr*2,rr*4,rr*4);
  for(let i=0;i<5;i++){const a=age*5+i*Math.PI*2/5;c.save();c.rotate(a);c.fillStyle=i%2?'#b7c78f':'#7d9a69';c.beginPath();c.ellipse(rr*.55,0,rr*.7,rr*.22,-.3,0,Math.PI*2);c.fill();c.restore();}
 }c.restore();return true;
}
const api={load,draw,frame,effect,family,names,families,path:PATH};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WoodlandEnemies=api;
})(globalThis);
