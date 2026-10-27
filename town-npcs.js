/* Town residents share the existing service panels; no save data is stored here.
   Asset records are supplied only after the new painted NPC art is approved. */
(function(root){
 'use strict';
 const PATH='assets/town/npcs-v35/';let loading,art={};
 const residents=Object.freeze([
  {id:'blacksmith',name:'铁匠',x:240,panel:'forge',service:'强化与重铸',greeting:'把装备拿来看看，我帮你收拾结实。'},
  {id:'merchant',name:'商人',x:580,panel:'shop',service:'补给与材料',greeting:'出门前，药水和材料都备齐了吗？'},
  {id:'bounty_keeper',name:'公会接待员',x:1030,panel:'bounty',service:'赏金任务',greeting:'林地有新的委托，来看看吧。'},
  {id:'warehouse_keeper',name:'仓管',x:1390,panel:'storage',service:'装备收藏',greeting:'暂时用不上的装备，放我这里保管。'},
  {id:'guide',name:'向导',x:1650,panel:'map',service:'前往林地',greeting:'准备好就出发，前面的路要一步步走。'}
 ].map(Object.freeze));
 function load(){
  return loading||(loading=(async()=>{
   const response=await fetch(PATH+'manifest.json');if(!response.ok)throw Error('城镇居民素材读取失败');
   const manifest=await response.json(),next={};
   await Promise.all(residents.map(async npc=>{
    const rec=manifest.residents[npc.id];if(!rec)throw Error('缺少城镇居民：'+npc.name);
    const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('居民图片加载失败：'+npc.name));im.src=PATH+rec.path;});
    next[npc.id]={...rec,image};
   }));art=next;return art;
  })().catch(error=>{loading=null;throw error;}));
 }
 function create(scale,ground){
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(ground))throw Error('Invalid town dimensions');
  return residents.map(n=>({...n,x:n.x*scale,y:ground}));
 }
 function nearest(npcs,hero,radius=100){
  if(!hero||!Number.isFinite(hero.x)||!Number.isFinite(hero.y))return null;
  let found=null,distance=radius;
  for(const npc of npcs){const dx=Math.abs(npc.x-hero.x);if(Math.abs(npc.y-hero.y)<=48&&dx<distance){found=npc;distance=dx;}}
  return found;
 }
 // A complete painted figure is rendered at its authored foot anchor.
 // No limbs, face, clothes or hands are rotated or stretched independently.
 function draw(ctx,npcs,art,clock,hero){
  const active=nearest(npcs,hero);let drawn=0;
  for(const npc of npcs){
   const a=art[npc.id];if(!a?.image||!a.frames?.length)continue;
   const count=a.frames.length,frame=a.frames[Math.floor(Math.max(0,clock)*(a.fps||4))%count];
   if(!frame||frame.length!==4||!Number.isFinite(a.height)||a.height<=0||!a.anchor)continue;
   const [sx,sy,sw,sh]=frame,scale=a.height/sh;
   ctx.save();ctx.imageSmoothingEnabled=true;
   ctx.fillStyle='#16352d50';ctx.beginPath();ctx.ellipse(npc.x,npc.y+2,a.height*.17,3,0,0,Math.PI*2);ctx.fill();
   ctx.drawImage(a.image,sx,sy,sw,sh,npc.x-a.anchor[0]*scale,npc.y-a.anchor[1]*scale,sw*scale,sh*scale);
   if(active?.id===npc.id){ctx.textAlign='center';ctx.font='12px "PingFang SC", sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#253d35';ctx.fillStyle='#f5e3b7';ctx.strokeText(npc.name,npc.x,npc.y-a.height-10);ctx.fillText(npc.name,npc.x,npc.y-a.height-10);}
   ctx.restore();drawn++;
  }
  return drawn;
 }
 const api={residents,create,nearest,draw,load,drawScene:(ctx,npcs,clock,hero)=>draw(ctx,npcs,art,clock,hero),portrait:id=>PATH+id+'.webp'};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownNPCs=api;
})(typeof window!=='undefined'?window:globalThis);
