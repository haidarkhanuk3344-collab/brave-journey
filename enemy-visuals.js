/* Generated forest poses share fixed foot anchors; combat feedback remains in the renderer. */
(function(root){
'use strict';
let manifest,loading;const images={},flashes={},PATH='assets/enemies/v14/';
function load(){return loading||(loading=fetch(PATH+'manifest.json').then(r=>{if(!r.ok)throw Error('怪物清单读取失败');return r.json();}).then(async m=>{manifest=m;await Promise.all(Object.entries(m.types).map(([type,rec])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[type]=im;flashes[type]=Array.from({length:4},(_,n)=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.drawImage(im,n*256,0,256,256,0,0,256,256);x.globalCompositeOperation='source-atop';x.fillStyle='#ffe5b380';x.fillRect(0,0,256,256);return c;});resolve();};im.onerror=()=>reject(Error('怪物素材读取失败：'+type));im.src=PATH+rec.path;})));return true;}));}
function frame(e){if(e.state==='death')return 3;if(e.state==='attack'){const m=e.eliteMove,timer=e.attackTimer||0,windup=m?.windup||e.hitAt||.5,active=m?.active||.16;return timer<windup*.28?0:timer<windup?2:timer<windup+active?3:0;}return e.state==='move'?Math.floor(e.animTime*7)%2:0;}
function draw(ctx,e,body){const im=images[e.type],rec=manifest?.types[e.type];if(!im||!rec)return false;const scale=body.height/rec.nativeHeight,n=frame(e);ctx.save();ctx.scale(e.dir==='left'?-1:1,1);ctx.imageSmoothingEnabled=true;
 const pulse=e.state==='idle'?Math.sin(e.animTime*3)*.007:0;ctx.scale(1-pulse,1+pulse);
 ctx.drawImage(e.flash>0?flashes[e.type][n]:im,e.flash>0?0:n*256,0,256,256,-128*scale,-232*scale,256*scale,256*scale);
 ctx.restore();return true;}
const api={load,draw,frame};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EnemyVisuals=api;
})(typeof window!=='undefined'?window:globalThis);
