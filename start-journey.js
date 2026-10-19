/* The departure must finish and assets must be ready before the scene changes. */
(function(root){
'use strict';
let busy=false;
async function sequence({prepare,depart,load,reveal,reset,phase=()=>{}}){
 if(busy)throw Error('正在启程，请稍候');
 busy=true;
 try{
  phase('departing');
  await Promise.all([Promise.resolve().then(prepare),Promise.resolve().then(depart)]);
  phase('loading');await load();
  phase('arriving');await reveal();phase('complete');
 }finally{try{reset();}finally{busy=false;}}
}
function paint(ctx,point,elapsed,arriving,width,height){
 ctx.clearRect(0,0,width,height);
 const progress=Math.min(1,elapsed/(arriving?650:1550));
 const strength=arriving?1-progress:Math.min(1,progress*3);
 const radius=Math.max(45,Math.min(125,point.width*.32));
 ctx.save();ctx.translate(point.x,point.y);ctx.globalAlpha=strength;
 const glow=ctx.createRadialGradient(0,0,0,0,0,radius*1.8);
 glow.addColorStop(0,'#dafff6a0');glow.addColorStop(.4,'#64ebef70');glow.addColorStop(1,'#4cdbf000');
 ctx.fillStyle=glow;ctx.save();ctx.scale(1,.35);ctx.fillRect(-radius*2,-radius*2,radius*4,radius*4);ctx.restore();
 ctx.shadowColor='#76fff2';ctx.shadowBlur=18;ctx.strokeStyle='#c3fff1';ctx.lineWidth=2;
 for(const size of [1,.78]){ctx.beginPath();ctx.ellipse(0,0,radius*size,radius*.27*size,0,0,Math.PI*2);ctx.stroke();}
 const spin=elapsed*.0012;
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6+spin,x=Math.cos(a)*radius*.9,y=Math.sin(a)*radius*.24;
  ctx.beginPath();ctx.moveTo(x-3,y-4);ctx.lineTo(x+3,y+4);ctx.moveTo(x+3,y-4);ctx.lineTo(x-3,y+4);ctx.stroke();
 }
 if(!arriving){
  const beam=ctx.createLinearGradient(0,-point.height,0,0);
  beam.addColorStop(0,'#c6fff000');beam.addColorStop(.6,'#c6fff025');beam.addColorStop(1,'#dbfff3a0');
  ctx.globalAlpha=strength*Math.min(1,progress*2);ctx.fillStyle=beam;
  ctx.beginPath();ctx.moveTo(-radius*.65,0);ctx.lineTo(-radius*.27,-point.height);ctx.lineTo(radius*.27,-point.height);ctx.lineTo(radius*.65,0);ctx.closePath();ctx.fill();
 }
 for(let i=0;i<28;i++){
  const cycle=(elapsed*.00065+i*.137)%1,x=Math.sin(i*12.7)*radius*.75,y=-cycle*point.height*.95;
  ctx.globalAlpha=strength*Math.sin(cycle*Math.PI)*.9;ctx.fillStyle=i%3?'#e0fff2':'#8deaff';
  const size=i%5===0?3:1.5;ctx.fillRect(x-size/2,y-size/2,size,size);
 }
 ctx.restore();
}
async function travel({source,prepare,load,arrivalPoint}){
 const screen=document.getElementById('startScreen'),veil=document.getElementById('journeyVeil'),canvas=document.getElementById('journeyFx'),status=document.getElementById('journeyStatus');
 const context=canvas.getContext('2d'),wasInert=screen.inert,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const rect=source.getBoundingClientRect(),point={x:rect.left+rect.width*.5,y:rect.top+rect.height*.9,width:rect.width,height:rect.height*.76};
 let frame=0,animation=null,arrival=false,epoch=performance.now();
 const tick=now=>{const ratio=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(innerWidth*ratio)||canvas.height!==Math.round(innerHeight*ratio)){canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);}context.setTransform(ratio,0,0,ratio,0,0);paint(context,point,now-epoch,arrival,innerWidth,innerHeight);frame=requestAnimationFrame(tick);};
 const animate=(frames,duration)=>{animation=veil.animate(frames,{duration,fill:'forwards',easing:'ease-in-out'});return animation.finished;};
 return sequence({prepare,
  phase:value=>{document.body.dataset.journey=value;status.textContent=value==='departing'?'传送阵已开启':value==='loading'?'正在前往青岚镇':value==='arriving'?'抵达青岚镇':'';},
  depart:async()=>{screen.inert=true;screen.classList.add('is-departing');veil.hidden=false;canvas.hidden=false;epoch=performance.now();frame=requestAnimationFrame(tick);await animate([{opacity:0,offset:0},{opacity:0,offset:.58},{opacity:1,offset:1}],reduced?200:1550);},
  load,
  reveal:async()=>{arrival=true;Object.assign(point,arrivalPoint?.()||point);epoch=performance.now();await animate([{opacity:1},{opacity:0}],reduced?180:700);},
  reset:()=>{cancelAnimationFrame(frame);animation?.cancel();veil.hidden=true;canvas.hidden=true;context.clearRect(0,0,canvas.width,canvas.height);screen.classList.remove('is-departing');screen.inert=wasInert;delete document.body.dataset.journey;status.textContent='';}
 });
}
const api={sequence,travel,inspect:()=>({busy})};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StartJourney=api;
})(typeof window!=='undefined'?window:globalThis);
