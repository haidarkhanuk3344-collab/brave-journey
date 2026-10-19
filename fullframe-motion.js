/* Painted whole-body poses, palette garments and data-driven equipment attachment. */
(function(root){
'use strict';
let manifest,fittings,detailManifest,detailSource,loading;const sheets={},limbs={},parts={},foregrounds=new WeakMap(),palms=new WeakMap(),palmTracks=new Map(),gripTracks=new Map(),faceTracks=new Map(),skinTracks=new Map(),helmetTracks=new Map(),details=new WeakMap(),detailImages=new WeakSet(),clothProfiles=new Map(),detailProfiles=new WeakMap(),detailHelmets=new WeakMap(),legLayers=new WeakMap(),hemTextures=new Map(),variants=new Map(),PATH='assets/characters/cartoon-v15/';
const modulo=x=>((x%1)+1)%1;
const headCorrections={
 'female-short:attack2:2':[146,131],
 'female-short:attack2:7':[145,135],
 'female-short:archer-attack:5':[137,132],
 'female-short:mage-attack:5':[137,132]
};
function correctHeads(){for(const [key,head] of Object.entries(headCorrections)){const [style,action,frame]=key.split(':');manifest.styles[style].animations[action].metadata[Number(frame)].head=[...head];}}
function supported(role){return ['warrior','archer','mage'].includes(role.cls);}
function frameAt(record,phase){let time=modulo(phase)*record.durations.reduce((a,b)=>a+b,0);for(let i=0;i<record.frames;i++){if(time<record.durations[i])return i;time-=record.durations[i];}return 0;}
function image(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('人物素材读取失败：'+path));im.src=path;});}
const rules=root.GameRules||(typeof module!=='undefined'&&module.exports?require('./rules.js'):null);
function appearance(role){return rules?rules.normalizeAppearance(role.appearance):(()=>{const a=role.appearance||{},gender=['male','female'].includes(a.gender)?a.gender:['pony','bob'].includes(a.hair)?'female':'male';return {...a,gender,hair:gender==='male'?a.hair==='spiky'?'spiky':'short':['short','pony','bob'].includes(a.hair)?a.hair:'bob'};})();}
function styleKey(role){const a=appearance(role);return a.gender+'-'+(role.equipped?.helmet?'short':a.hair);}
function record(action,role){return manifest.styles[styleKey(role)].animations[action];}
function load(){return loading||(loading=fetch(PATH+'manifest.json').then(r=>{if(!r.ok)throw Error('人物动作清单读取失败');return r.json();}).then(async data=>{manifest=data;correctHeads();for(const key of ['male-short','male-spiky','female-short','female-bob','female-pony'])if(!manifest.styles[key])throw Error('人物造型清单缺失：'+key);await Promise.all(Object.entries(data.styles).flatMap(([style,value])=>Object.entries(value.animations).map(async([action,rec])=>sheets[style+':'+action]=await image(PATH+rec.path))));fittings=await fetch('assets/characters/equipment-v16/manifest.json').then(r=>r.json());await Promise.all(Object.entries(fittings.styles).flatMap(([style,actions])=>Object.entries(actions).map(async([action,rec])=>limbs[style+':'+action]=await image('assets/characters/equipment-v16/'+rec.path))));await Promise.all(['helmet_steel','helmet_leather','sword_0','sword_1','bow_0','bow_1','staff_0','staff_1'].map(async name=>parts[name]=await image(root.EquipmentVisuals.items[name]?.path||'assets/customization/parts/'+name+'.png')));await Promise.all(['helmet_steel','helmet_leather'].flatMap(name=>['front','side'].map(async view=>parts[name+'-'+view]=await image('assets/characters/gear-v29/'+name+'-'+view+'.png'))));detailManifest=await fetch('assets/characters/detail-v29/manifest.json').then(r=>r.json());detailSource=await image('assets/characters/detail-v29/source.png');parts['robe-hem']=await image('assets/characters/outfit-v17/robe-hem.png');return true;}));}
function advance(state,dt=0){
 root.OutfitMotion?.advance(state,dt);
 state.fullAirTime=state.grounded?0:(state.fullGrounded===false?(state.fullAirTime||0)+dt:0);state.fullGrounded=state.grounded;
 if(state.jumpSerial!==undefined&&state.fullJumpSerial!==state.jumpSerial){state.fullJumpSerial=state.jumpSerial;state.fullAirTime=0;}
 if(state.attack&&state.fullAttackId!==state.attack.id){state.fullAttackId=state.attack.id;state.fullAttackAir=state.grounded===false;}
 if(!manifest)return;
 if(['walk','run'].includes(state.action)){if(state.fullLastAction==='idle')state.fullPhase=.25;state.fullPhase=modulo((state.fullPhase||0)+Math.abs(state.travel||0)/manifest.animations[state.action].stride);}
 state.fullLastAction=state.action;
 // Whole poses keep the foot/hand event exact. Only ease a tiny head offset at a transition.
 const info=select(state),head=manifest.animations[info.action]?.metadata[info.frame]?.head;
 if(head){const tag=info.action+(state.attack?':'+state.attack.id:''),decay=Math.exp(-dt/.035);state.fullOffsetX=(state.fullOffsetX||0)*decay;state.fullOffsetY=0;
  if(state.fullVisualTag!==tag&&state.fullVisualHead)state.fullOffsetX=Math.max(-6,Math.min(6,state.fullVisualHead[0]-head[0]));
  state.fullVisualTag=tag;state.fullVisualHead=[head[0]+state.fullOffsetX,head[1]];
 }
}
function attackFrame(a,count,contact){const time=Math.max(0,a.time||0);if(time<a.hitAt)return Math.min(contact-1,Math.floor(time/a.hitAt*contact));if(time<a.hitAt+a.active)return Math.min(contact+1,contact+Math.floor((time-a.hitAt)/a.active*2+1e-7));const phase=Math.max(0,Math.min(1,(time-a.hitAt-a.active)/(a.duration-a.hitAt-a.active)));return Math.min(count-1,contact+2+Math.floor(phase*(count-contact-2)));}
function select(state={},cls=state.cls||'warrior'){
 let action=state.action||'idle',frame=0,phase=0;
 if(action==='attack'&&state.attack){const a=root.CombatFeel?.animationAttack(state.attack)||state.attack;action=cls==='warrior'?'attack'+(a.poseCombo??(a.skill===0?2:a.skill===1?0:a.skill===2?1:a.combo%3)):cls+'-attack';const rec=manifest.animations[action];frame=attackFrame(a,rec.frames,rec.contactFrame);
 }else if(action==='hurt'){frame=Math.max(0,Math.min(3,Math.floor((.16-(state.stun||0))/.16*4)));
 }else if(action==='jump'){const vy=state.vy||0,elapsed=state.fullAirTime||0;frame=vy<-150?(elapsed<.055?0:elapsed<.15?1:2):vy<150?3:vy<420?4:5;
 }else if(state.land>0&&Math.abs(state.vx||0)<45){action='jump';frame=state.land>.04?6:7;
 }else{if(!['idle','walk','run'].includes(action))action='idle';phase=action==='idle'?(state.clock||0)/1.2:state.fullPhase||0;frame=frameAt(manifest.animations[action],phase);}
 return {action,frame,phase};
}
const gripCorrections={'female-short:walk:4':[158,174],'male-spiky:walk:4':[157,176],'male-spiky:attack2:3':[183,148]};
const wristCorrections={'male-spiky:walk:4':[-13,-7],'female-short:walk:4':[-13,-7]};
function handAt(info,meta){return gripCorrections[info.style+':'+info.action+':'+info.frame]||meta.hand;}
function behindBody(info){return info.style==='female-pony'&&info.action==='attack0'&&info.frame===2;}
function gripTrack(key,rec,raw,width){
 if(gripTracks.has(key))return gripTracks.get(key);
 const tracks=rec.metadata.map((meta,f)=>{
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256,[hx,hy]=gripCorrections[key+':'+f]||meta.hand,at=(x,y)=>((oy+y)*width+ox+x)*4;
  if(key==='female-pony:attack0'&&f===2)return {pixels:[],wrist:[-5,-12],size:1.07};
  const near=(x,y,r=18)=>x>=0&&x<256&&y>=0&&y<256&&Math.hypot(x-hx,y-hy)<=r;
  const skin=(x,y)=>{if(!near(x,y,17))return false;const i=at(x,y),r=raw[i],g=raw[i+1],b=raw[i+2];return raw[i+3]>80&&r>185&&g>120&&g<230&&b>80&&r>g*1.1&&g>b*1.2;};
  let seed=null,distance=Infinity;
  for(let y=hy-6;y<=hy+6;y++)for(let x=hx-6;x<=hx+6;x++)if(skin(x,y)&&Math.hypot(x-hx,y-hy)<distance){seed=y*256+x;distance=Math.hypot(x-hx,y-hy);}
  const pixels=[],seen=new Set();if(seed!==null){pixels.push(seed);seen.add(seed);}
  for(let n=0;n<pixels.length;n++){const v=pixels[n],x=v%256,y=Math.floor(v/256);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=ny*256+nx;if(!seen.has(k)&&skin(nx,ny)){seen.add(k);pixels.push(k);}}}
  // Painted finger creases can split a fist into several skin islands. Include
  // every island in the palm, while excluding the separate exposed forearm.
  for(let y=hy-17;y<=hy+17;y++)for(let x=hx-17;x<=hx+17;x++)if(Math.hypot(x-hx,y-hy)<=17&&skin(x,y)&&!seen.has(y*256+x)){
   const island=[y*256+x];seen.add(island[0]);for(let n=0;n<island.length;n++){const v=island[n],px=v%256,py=Math.floor(v/256);for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){const nk=ny*256+nx;if(!seen.has(nk)&&skin(nx,ny)){seen.add(nk);island.push(nk);}}}
   if(island.some(v=>Math.hypot(v%256-hx,Math.floor(v/256)-hy)<7))pixels.push(...island);
  }
  // Locate the actual leather cuff, independently of the changing blade angle.
  // Tiny fist creases and bronze decorations are not wrist seams.
  const leather=(x,y)=>{if(!near(x,y,22))return false;const i=at(x,y),r=raw[i],g=raw[i+1],b=raw[i+2];return raw[i+3]>160&&r>40&&r<155&&g>30&&b>18&&r>g*1.18&&r<g*1.85&&g>b*1.14;};
  const leatherSeen=new Set();let wrist=[-5,-12],best=0,cuff=[];
  for(let y=hy-22;y<=hy+22;y++)for(let x=hx-22;x<=hx+22;x++){
   const k=y*256+x;if(leatherSeen.has(k)||!leather(x,y))continue;const island=[k];leatherSeen.add(k);
   for(let n=0;n<island.length;n++){const v=island[n],px=v%256,py=Math.floor(v/256);for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){const nk=ny*256+nx;if(!leatherSeen.has(nk)&&leather(nx,ny)){leatherSeen.add(nk);island.push(nk);}}}
   if(island.length<15)continue;const dx=island.reduce((s,v)=>s+v%256-hx,0)/island.length,dy=island.reduce((s,v)=>s+Math.floor(v/256)-hy,0)/island.length,d=Math.hypot(dx,dy);
   if(d<7||d>21)continue;const inward=dx*(meta.hip[0]-hx)+dy*(meta.hip[1]-hy)>0?1.35:1,score=island.length/(d*d)*inward;
   if(score>best){best=score;wrist=[dx,dy];cuff=island;}
  }
  if(wristCorrections[key+':'+f])wrist=[...wristCorrections[key+':'+f]];
  const length=Math.hypot(...wrist),unit=wrist.map(v=>v/length),cuffKeep=new Set(),cuffEdge=new Set();
  for(const v of cuff){const x=v%256,y=Math.floor(v/256);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=4)cuffKeep.add((y+dy)*256+x+dx);}
  for(const v of cuff){const x=v%256,y=Math.floor(v/256);for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++)if(dx*dx+dy*dy<=36)cuffEdge.add((y+dy)*256+x+dx);}
  const palmPixels=pixels.filter(v=>(v%256-hx)*unit[0]+(Math.floor(v/256)-hy)*unit[1]<Math.min(8,length-4)),seam=Math.min(8,Math.max(3,...palmPixels.map(v=>(v%256-hx)*unit[0]+(Math.floor(v/256)-hy)*unit[1])));
  const remove=new Set();for(const v of skinEnvelope(palmPixels)){const x=v%256,y=Math.floor(v/256);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const nx=x+dx,ny=y+dy;if(!near(nx,ny,22)||dx*dx+dy*dy>16||(nx-hx)*unit[0]+(ny-hy)*unit[1]>seam+1||cuffKeep.has(ny*256+nx))continue;
   const i=at(nx,ny),wristward=(nx-hx)*unit[0]+(ny-hy)*unit[1];
   if(cuffEdge.has(ny*256+nx)&&wristward>2&&raw[i]<160&&raw[i+1]<110&&raw[i+2]<90)continue;
   if(raw[i+3]&&!(raw[i+2]>raw[i]*1.1&&raw[i+1]>raw[i]*1.05))remove.add(i);
  }}
  return {pixels:[...remove],wrist,size:1.07};
 });gripTracks.set(key,tracks);return tracks;
}
function skinEnvelope(points){
 if(points.length<3)return points;
 const ordered=points.map(v=>[v%256,Math.floor(v/256)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
 for(const p of ordered){while(lower.length>=2&&turn(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
 for(const p of [...ordered].reverse()){while(upper.length>=2&&turn(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
 const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),filled=[];
 const minX=ordered[0][0],maxX=ordered[ordered.length-1][0],minY=Math.min(...ordered.map(p=>p[1])),maxY=Math.max(...ordered.map(p=>p[1]));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(hull.every((p,i)=>turn(p,hull[(i+1)%hull.length],[x,y])>=0))filled.push(y*256+x);
 return filled;
}
function palmTrack(key,rec,raw,width){
 if(palmTracks.has(key))return palmTracks.get(key);
 const tracks=rec.metadata.map((meta,f)=>{
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256,[hx,hy]=gripCorrections[key+':'+f]||meta.hand;
  if(key==='female-pony:attack0'&&f===2)return {pixels:[]};
  const at=(x,y)=>((oy+y)*width+ox+x)*4;
  const skin=(x,y)=>{if(x<0||x>=256||y<0||y>=256||Math.hypot(x-hx,y-hy)>22)return false;const i=at(x,y),r=raw[i],g=raw[i+1],b=raw[i+2];return raw[i+3]>80&&r>185&&g>120&&g<230&&b>75&&r>g*1.1&&g>b*1.2;};
  // The wrist band can split the skin into separate islands. Keep all skin
  // islands of the gripping hand and nearby wrist, rather than only one seed.
  const queue=[];for(let y=Math.max(0,hy-22);y<=Math.min(255,hy+22);y++)for(let x=Math.max(0,hx-22);x<=Math.min(255,hx+22);x++)if(skin(x,y))queue.push(y*256+x);
  // The fist and exposed wrist are separate skin islands around a dark cuff.
  // Enclose their substantial islands so the authored cuff and black contour
  // occlude the weapon too. Tiny bronze garment highlights do not widen this area.
  const remaining=new Set(queue),arm=[];
  for(const seed of queue){if(!remaining.delete(seed))continue;const island=[seed];for(let n=0;n<island.length;n++){
   const v=island[n],x=v%256;for(const next of [v-1,v+1,v-256,v+256])if(Math.abs(next%256-x)<=1&&remaining.delete(next))island.push(next);
  }if(island.length>=12)arm.push(...island);}
  // The painted leather cuff flares wider than its skin islands. Include its
  // six-pixel border from the original pose, without widening tiny highlights.
  const cover=new Set();for(const [points,radius] of [[queue,3],[skinEnvelope(arm),6]])for(const v of points){const x=v%256,y=Math.floor(v/256);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<256&&ny>=0&&ny<256&&dx*dx+dy*dy<=radius*radius)cover.add(at(nx,ny));}}
  return {pixels:[...cover]};
 });palmTracks.set(key,tracks);return tracks;
}
function faceProtection(key,rec,raw,width){
 if(faceTracks.has(key))return faceTracks.get(key);
 const mask=new Uint8Array(raw.length/4);
 for(let f=0;f<rec.frames;f++){
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256,[hx,hy]=rec.metadata[f].head;
  // Preserve the authored face as a complete region, including dark eyes,
  // brows and outlines. Skin islands split at the eyes in these painted poses.
  for(let y=Math.max(0,hy-31);y<=Math.min(255,hy+31);y++)for(let x=Math.max(0,hx-34);x<=Math.min(255,hx+38);x++){
   if(((x-hx-2)/34)**2+((y-hy)/30)**2<=1)mask[(oy+y)*width+ox+x]=1;
  }
 }
 faceTracks.set(key,mask);return mask;
}
function skinProtection(key,rec,raw,width){
 if(skinTracks.has(key))return skinTracks.get(key);
 const mask=new Uint8Array(raw.length/4);
 for(let f=0;f<rec.frames;f++){
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const i=((oy+y)*width+ox+x)*4,r=raw[i],g=raw[i+1],b=raw[i+2];
   if(raw[i+3]<80||!(r>185&&g>120&&g<230&&b>75&&r>g*1.1&&g>b*1.2))continue;
   // Helmet hair removal must never erase authored skin or its shaded outline.
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const nx=x+dx,ny=y+dy;if(nx>=0&&nx<256&&ny>=0&&ny<256&&dx*dx+dy*dy<=9)mask[(oy+ny)*width+ox+nx]=1;
   }
  }
 }
 skinTracks.set(key,mask);return mask;
}
function restoreForearm(raw,front,width,ox,oy,seed){
 const at=(x,y)=>((oy+y)*width+ox+x)*4,seen=new Uint8Array(65536),queue=[seed[1]*256+seed[0]],cover=new Set();seen[queue[0]]=1;
 for(let n=0;n<queue.length;n++){
  const v=queue[n],x=v%256,y=Math.floor(v/256);
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<256&&ny>=0&&ny<256&&dx*dx+dy*dy<=9)cover.add(at(nx,ny));}
  for(const next of [v-1,v+1,v-256,v+256]){
   const nx=next%256,ny=Math.floor(next/256);if(next<0||next>=65536||Math.abs(nx-x)>1||seen[next])continue;seen[next]=1;
   const i=at(nx,ny),r=raw[i],g=raw[i+1],b=raw[i+2];if(raw[i+3]>80&&r>185&&g>95&&g<230&&r>g*1.1&&g>b*1.2)queue.push(next);
  }
 }
 for(const i of cover)for(let k=0;k<4;k++)front[i+k]=raw[i+k];
}
// The old arm atlas also contains golden hair clips, ears and loose hair.
// A component wholly inside the skull cannot be a foreground arm. True raised
// forearms cross the skull envelope, or contain the measured gripping palm.
function keyForHeadArm(rec,f,group){
 const h=rec.metadata[f].head,hand=rec.metadata[f].hand;
 if(hand[1]>h[1]+3)return false;
 return group.some(v=>Math.hypot(v%256-hand[0],Math.floor(v/256)-hand[1])<30);
}
function cleanHeadForeground(front,width,rec){
 for(let f=0;f<rec.frames;f++){
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256,h=rec.metadata[f].head,hand=rec.metadata[f].hand,seen=new Uint8Array(65536),at=v=>((oy+Math.floor(v/256))*width+ox+v%256)*4;
  for(let seed=0;seed<65536;seed++){
   if(seen[seed]||front[at(seed)+3]<30)continue;seen[seed]=1;const group=[seed];let onHead=true,onPalm=false;
   for(let n=0;n<group.length;n++){
    const v=group[n],x=v%256,y=Math.floor(v/256);if(Math.abs(x-h[0])>53||y<h[1]-39||y>h[1]+24)onHead=false;
    if(Math.hypot(x-hand[0],y-hand[1])<12)onPalm=true;
    for(const next of [v-1,v+1,v-256,v+256])if(next>=0&&next<65536&&Math.abs(next%256-x)<=1&&!seen[next]&&front[at(next)+3]>=30){seen[next]=1;group.push(next);}
   }
   if(onHead&&!onPalm&&!(keyForHeadArm(rec,f,group)))for(const v of group)front[at(v)+3]=0;
  }
 }
}
function measureHelmets(key,rec,raw,front,width){
 if(helmetTracks.has(key))return;
 const tracks=rec.metadata.map((meta,f)=>{
  const ox=f%rec.columns*256,oy=Math.floor(f/rec.columns)*256,[hx,hy]=meta.head,rows=[];let crown=hy-46;
  for(let y=Math.max(0,hy-60);y<hy-8;y++){
   const xs=[];for(let x=Math.max(0,hx-54);x<Math.min(256,hx+47);x++){
    const i=((oy+y)*width+ox+x)*4,r=raw[i],g=raw[i+1],b=raw[i+2];
    if(raw[i+3]>150&&!front[i+3]&&r<200&&r>g*1.17&&g>b*1.12)xs.push(x);
   }
   if(xs.length>12)rows.push({y,left:xs[0],right:xs[xs.length-1]});
  }
  if(!rows.length)return {x:hx-45,y:hy-49,width:73,view:''};
  crown=rows[0].y;const broad=rows.filter(r=>r.right-r.left>38).sort((a,b)=>(b.right-b.left)-(a.right-a.left)).slice(0,9);
  const center=broad.length?broad.reduce((v,r)=>v+(r.left+r.right)/2,0)/broad.length:hx-9;
  const span=broad.length?broad.reduce((v,r)=>v+r.right-r.left,0)/broad.length:75;
  const size=Math.max(68,Math.min(80,span*.99));
  // Both arms raised gives an almost frontal head; other authored poses are 3/4.
  const view=key.endsWith(':attack2')&&f===2?'-front':'';
  return {x:center-size/2,y:crown+1,width:size,view};
 });helmetTracks.set(key,tracks);
}
function profiles(key,rec,raw,width){
 if(!clothProfiles.has(key))clothProfiles.set(key,rec.metadata.map((meta,frame)=>root.OutfitMotion.measure(raw,width,meta,{frame,columns:rec.columns})));
 return clothProfiles.get(key);
}
function clothPixel(r,g,b,x,y,track){return b>r*1.35&&g>r*1.15&&b>40&&y<track.belt[1]+track.slope*(x-track.belt[0])+15;}
function fittedHem(image,mesh){
 let envelope=hemTextures.get(image);
 if(!envelope){
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data,rows=[];
  for(let y=0;y<c.height;y++){let left=c.width,right=-1,count=0;for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>150){left=Math.min(left,x);right=Math.max(right,x);count++;}rows.push({left,right,count});}
  const solid=rows.map((r,y)=>({...r,y})).filter(r=>r.count>c.width*.24),first=solid[0].y,last=solid.at(-1).y;envelope={rows,first,last,width:c.width,height:c.height};hemTextures.set(image,envelope);
 }
 // Use continuous UV bands through the original painted texture. Its empty
 // outer margins must not shrink the physical waistband or introduce row noise.
 for(let j=0;j<=mesh.rows;j++){
  const v=j/mesh.rows,y=envelope.first+v*(envelope.last-envelope.first),near=envelope.rows.slice(Math.max(envelope.first,Math.round(y)-3),Math.min(envelope.last+1,Math.round(y)+4)).filter(r=>r.count>image.width*.16),left=Math.max(0,Math.min(...near.map(r=>r.left))-.5),right=Math.min(image.width,Math.max(...near.map(r=>r.right))+1.5);
  for(let i=0;i<=mesh.columns;i++){const p=mesh.points[j][i];p.u=(left+(right-left)*i/mesh.columns)/image.width;p.v=y/image.height;}
 }
 return mesh;
}
function texture(action,role){
 const a=appearance(role),style=styleKey(role),clothes=root.EquipmentVisuals.appearance(role.equipped?.clothes,'clothes',role.cls),gripped=role.cls==='warrior'&&!!root.HandGrip&&!!root.EquipmentVisuals.appearance(role.equipped?.weapon,'weapon',role.cls),q=role.equipped?.clothes?.q||0,key=[action,style,a.skin,a.color,clothes?.shape,q,role.equipped?.helmet?.id,gripped].join(':');if(variants.has(key))return variants.get(key);
 const source=sheets[style+':'+action],c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data,authored=clothes?.shape==='skirt'?new Uint8ClampedArray(d):null,rec=record(action,role),limbCanvas=document.createElement('canvas');limbCanvas.width=c.width;limbCanvas.height=c.height;const limbCtx=limbCanvas.getContext('2d');limbCtx.drawImage(limbs[style+':'+action],0,0);const front=limbCtx.getImageData(0,0,c.width,c.height),fd=front.data;
 const headAlpha=role.equipped?.helmet?Uint8Array.from({length:fd.length/4},(_,i)=>fd[i*4+3]):null;
 if(role.equipped?.helmet)cleanHeadForeground(fd,c.width,rec);
 measureHelmets(style+':'+action,rec,d,fd,c.width);
 const clothing=profiles(style+':'+action,rec,d,c.width);
 const handTracks=palmTrack(style+':'+action,rec,d,c.width),faceMask=faceProtection(style+':'+action,rec,d,c.width),skinMask=skinProtection(style+':'+action,rec,d,c.width),handMask=new Uint8Array(d.length/4);
 const gripping=gripped?gripTrack(style+':'+action,rec,d,c.width):null;
 for(const track of handTracks)for(const i of track.pixels)handMask[i/4]=1;
 // The legacy foreground atlas omitted the raised forearms in this pose.
 // Recover the original skin and outlines; the hair between the arms stays behind the helmet.
 if(style==='female-short'&&action==='attack2'){
  const ox=2%rec.columns*256,oy=Math.floor(2/rec.columns)*256;
  for(const seed of [[117,110],[179,108]])restoreForearm(d,fd,c.width,ox,oy,seed);
 }
 const skin={tan:[192,127,87],deep:[133,82,58]}[a.skin],hair={gold:[194,154,65],violet:[126,67,158]}[a.color];
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i+3]<30)continue;const r=d[i],g=d[i+1],b=d[i+2],index=Math.floor(y/256)*rec.columns+Math.floor(x/256),head=rec.metadata[index]?.head;if(!head)continue;
  const lx=x%256,ly=y%256,isHair=!faceMask[i/4]&&ly<head[1]+20&&ly>head[1]-65&&Math.abs(lx-head[0])<55&&r<200&&r>g*1.19&&g>b*1.15;
  const keepPerson=faceMask[i/4]||handMask[i/4]||fd[i+3]>0;
  if(role.equipped?.helmet&&!keepPerson&&(isHair||Math.abs(lx-head[0])<52&&ly<head[1]-13&&ly>head[1]-68||lx<head[0]-23&&lx>head[0]-54&&ly<head[1]+24&&ly>head[1]-50||lx>head[0]+29&&lx<head[0]+54&&ly<head[1]+15&&ly>head[1]-50)){d[i+3]=0;continue;}
  // Removing misclassified head fragments must not reduce the original face's
  // combined edge coverage. Retain its source-over alpha, not a painted patch.
  if(headAlpha&&faceMask[i/4])d[i+3]=Math.round(d[i+3]+(255-d[i+3])*headAlpha[i/4]/255);
  if(clothes&&clothPixel(r,g,b,lx,ly,clothing[index])){
   const rgb=root.OutfitMotion.color(r,g,b,clothes,lx,ly,clothing[index]);rgb.forEach((v,j)=>d[i+j]=v);
  }
  else if(skin&&r>185&&r>g*1.1&&g>b*1.2){const lum=(r+g+b)/3/190;skin.forEach((v,j)=>d[i+j]=Math.min(255,v*lum));}
  else if(hair&&isHair){const lum=(r+g+b)/3/90;hair.forEach((v,j)=>d[i+j]=Math.min(255,v*lum));}
 }
 // Trimming the old hair can leave tiny disconnected fringe outlines. Drop those
 // inside the head envelope; authored raised palms are explicitly retained.
 if(role.equipped?.helmet)for(let f=0;f<rec.frames;f++){
  const sx=f%rec.columns*256,sy=Math.floor(f/rec.columns)*256,h=rec.metadata[f].head,palm=rec.metadata[f].hand,seen=new Uint8Array(65536);
  for(let ly=Math.max(0,h[1]-75);ly<Math.min(256,h[1]+38);ly++)for(let lx=Math.max(0,h[0]-75);lx<Math.min(256,h[0]+75);lx++){
   const seed=ly*256+lx,at=((sy+ly)*c.width+sx+lx)*4;
   if(seen[seed]||d[at+3]<30)continue;const queue=[seed];seen[seed]=1;let protectedPart=false;
   for(let n=0;n<queue.length;n++){const v=queue[n],x=v%256,y=Math.floor(v/256),i=(sy+y)*c.width+sx+x;if(faceMask[i]||handMask[i]||fd[i*4+3]||Math.hypot(x-palm[0],y-palm[1])<12||y>h[1]+37)protectedPart=true;
    for(const next of [v-1,v+1,v-256,v+256]){const nx=next%256,ny=Math.floor(next/256);if(next<0||next>=65536||Math.abs(nx-x)>1||seen[next])continue;const j=((sy+ny)*c.width+sx+nx)*4;if(d[j+3]>=30){seen[next]=1;queue.push(next);}}
   }
   if(queue.length<80&&!protectedPart)for(const v of queue)d[((sy+Math.floor(v/256))*c.width+sx+v%256)*4+3]=0;
  }
 }
 for(let i=0;i<fd.length;i+=4){if(!fd[i+3])continue;const r=fd[i],g=fd[i+1],b=fd[i+2];if(skin&&r>185&&r>g*1.1&&g>b*1.2){const lum=(r+g+b)/3/190;skin.forEach((v,j)=>fd[i+j]=Math.min(255,v*lum));}else if(clothes){const x=i/4%c.width,y=Math.floor(i/4/c.width),index=Math.floor(y/256)*rec.columns+Math.floor(x/256),track=clothing[index];if(clothPixel(r,g,b,x%256,y%256,track))root.OutfitMotion.color(r,g,b,clothes,x%256,y%256,track).forEach((v,j)=>fd[i+j]=v);}}
 // Remove the old round fist from both body and foreground. The wrist remains
 // authored artwork; a new thumb and four curled fingers replace only the palm.
 if(gripping)for(const track of gripping)for(const i of track.pixels){d[i+3]=0;fd[i+3]=0;}
 // Restore complete lower hand contours from the authored pose. A sleeve atlas
 // skin island can omit dark finger edges that must still occlude a robe.
 if(clothes?.shape==='skirt')for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(y*c.width+x)*4,index=Math.floor(y/256)*rec.columns+Math.floor(x/256),head=rec.metadata[index].head,track=clothing[index];
  if(skinMask[i/4]&&!faceMask[i/4]&&y%256>track.belt[1]-14&&y%256>head[1]+40)for(let k=0;k<4;k++)fd[i+k]=d[i+k];
 }
 limbCtx.putImageData(front,0,0);foregrounds.set(c,limbCanvas);ctx.putImageData(pixels,0,0);
 const palmCanvas=document.createElement('canvas');palmCanvas.width=c.width;palmCanvas.height=c.height;const pc=palmCanvas.getContext('2d'),pd=pc.createImageData(c.width,c.height);
 for(const track of handTracks)for(const i of track.pixels)for(let k=0;k<4;k++)pd.data[i+k]=d[i+k];
 pc.putImageData(pd,0,0);palms.set(c,palmCanvas);
 if(clothes?.shape==='skirt'){const legs=document.createElement('canvas');legs.width=c.width;legs.height=c.height;const lc=legs.getContext('2d'),ld=lc.createImageData(c.width,c.height);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(y*c.width+x)*4,index=Math.floor(y/256)*rec.columns+Math.floor(x/256),track=clothing[index],r=authored[i],g=authored[i+1],b=authored[i+2],below=y%256-track.belt[1]-track.slope*(x%256-track.belt[0]);
  const trousers=Math.max(r,g,b)-Math.min(r,g,b)<42&&b>=r*.84&&r<138,boot=r>g*1.17&&g>b*1.12&&r<185;
  if(below>7&&d[i+3]&&((trousers&&!clothPixel(r,g,b,x%256,y%256,track))||boot))for(let k=0;k<4;k++)ld.data[i+k]=d[i+k];
 }
 lc.putImageData(ld,0,0);legLayers.set(c,legs); }
 variants.set(key,c);while(variants.size>96)variants.delete(variants.keys().next().value);return c;
}
// A high-resolution painting of the SAME authored idle pose is registered to its
// original bounds. Original variant alpha governs helmet trims and hand cutouts;
// equipment and pose landmarks continue through the shared renderer.
// Portrait paintings have a narrower skull than the animation atlas. Measure
// the unmodified cheek/ear span before hair trimming or skin palette changes.
function portraitHelmet(raw,size,meta,factor){
 const [hx,hy]=meta.head,rows=[];
 for(let y=(hy-12)*factor;y<(hy+12)*factor;y++){
  const xs=[];
  for(let x=(hx-45)*factor;x<(hx+35)*factor;x++){
   const i=(y*size+x)*4,r=raw[i],g=raw[i+1],b=raw[i+2];
   if(raw[i+3]>150&&r>185&&r>g*1.1&&g>b*1.2)xs.push(x/factor);
  }
  if(xs.length>12*factor)rows.push({y:y/factor,left:xs[0],right:xs[xs.length-1]});
 }
 const broad=rows.sort((a,b)=>(b.right-b.left)-(a.right-a.left)).slice(0,9*factor);
 if(!broad.length)return null;
 const span=broad.reduce((s,r)=>s+r.right-r.left,0)/broad.length,center=broad.reduce((s,r)=>s+(r.right+r.left)/2,0)/broad.length,width=span*1.22;
 const cheekTop=Math.min(...broad.map(r=>r.y));
 return {x:center-width/2,y:cheekTop-width*.62,width,view:''};
}
function detailedTexture(base,role,info){
 if(details.has(base))return details.get(base);
 const factor=3,size=256*factor,c=document.createElement('canvas');c.width=size;c.height=size;const ctx=c.getContext('2d'),rec=record('idle',role),bounds=rec.metadata[0].bounds,crop=detailManifest[info.style].crop;
 ctx.drawImage(detailSource,...crop,bounds[0]*factor,bounds[1]*factor,(bounds[2]-bounds[0])*factor,(bounds[3]-bounds[1])*factor);
 const pixels=ctx.getImageData(0,0,size,size),d=pixels.data,track=root.OutfitMotion.measure(d,size,rec.metadata[0],{scale:factor}),helmetTrack=portraitHelmet(d,size,rec.metadata[0],factor),a=appearance(role),outfit=root.EquipmentVisuals.appearance(role.equipped?.clothes,'clothes',role.cls),skin={tan:[192,127,87],deep:[133,82,58]}[a.skin],hair={gold:[194,154,65],violet:[126,67,158]}[a.color];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,r=d[i],g=d[i+1],b=d[i+2];if(!d[i+3])continue;
  if(outfit&&clothPixel(r,g,b,x/factor,y/factor,track))root.OutfitMotion.color(r,g,b,outfit,x/factor,y/factor,track).forEach((v,k)=>d[i+k]=v);
  else if(skin&&r>185&&r>g*1.1&&g>b*1.2){const lum=(r+g+b)/3/190;skin.forEach((v,k)=>d[i+k]=Math.min(255,v*lum));}
  else if(hair&&y/factor<rec.metadata[0].head[1]+15&&r<200&&r>g*1.19&&g>b*1.15){const lum=(r+g+b)/3/90;hair.forEach((v,k)=>d[i+k]=Math.min(255,v*lum));}
 }
 // Keep the detailed neck and shoulders: the small atlas's broad helmet
 // hair cutout also crosses these differently proportioned portrait contours.
 const mask=document.createElement('canvas');mask.width=size;mask.height=size;const mc=mask.getContext('2d');mc.drawImage(base,0,0,256,256,0,0,size,size);
 if(role.equipped?.helmet){
  const bare=texture('idle',{...role,appearance:{...a,hair:'short'},equipped:{...role.equipped,helmet:null}}),neck=(rec.metadata[0].head[1]+10)*factor;
  mc.clearRect(0,neck,size,size-neck);mc.drawImage(bare,0,neck/factor,256,256-neck/factor,0,neck,size,size-neck);
  // Clip stray fringe beyond the fitted portrait helmet, keeping the face open.
  if(helmetTrack)for(let y=0;y<(rec.metadata[0].head[1]+10)*factor;y++)for(let x=0;x<size;x++){
   if(x/factor<helmetTrack.x||x/factor>helmetTrack.x+helmetTrack.width){const i=(y*size+x)*4;d[i+3]=0;}
  }
 }
 ctx.putImageData(pixels,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';
 for(const map of [foregrounds,palms]){const layer=document.createElement('canvas');layer.width=size;layer.height=size;const lc=layer.getContext('2d');lc.drawImage(c,0,0);lc.globalCompositeOperation='destination-in';lc.drawImage(map.get(base),0,0,256,256,0,0,size,size);map.set(c,layer);detailImages.add(layer);}
 detailProfiles.set(c,track);if(helmetTrack)detailHelmets.set(c,helmetTrack);detailImages.add(c);details.set(base,c);return c;
}
function drawPose(ctx,im,rec,frame){if(detailImages.has(im))ctx.drawImage(im,0,0,im.width,im.height,0,0,256,256);else ctx.drawImage(im,(frame%rec.columns)*256,Math.floor(frame/rec.columns)*256,256,256,0,0,256,256);}
function inspect(role,state){if(!manifest||!supported(role))return {renderer:'unavailable',action:state?.action||'idle'};const info=select(state||{},role.cls),rec=record(info.action,role);return {renderer:'cartoon-v15',outfit:'body-fitted-v30',helmet:'pose-fitted-v29',material:'painted-v29',style:styleKey(role),gender:appearance(role).gender,...info,frames:rec.frames,clothes:role.equipped?.clothes?.id,weapon:role.equipped?.weapon?.id};}
function weaponAngle(role,info,meta){
 if(['idle','walk','run','jump','hurt'].includes(info.action)){
  if(role.cls==='warrior')return .75+(info.action==='walk'?Math.sin(info.frame*Math.PI/4)*.1:info.action==='run'?.2:0);
  if(info.action==='run')return role.cls==='mage'?.65:1.15;
  if(role.cls==='mage')return ['idle','walk'].includes(info.action)?.35:meta.hand[0]<meta.head[0]-14?-.35:1.1;
  return info.action==='jump'&&meta.hand[1]<meta.head[1]+35?.85:.04;
 }
 if(role.cls==='warrior'&&(info.frame===0||info.frame>=6))return .75;
 if(info.frame===0||info.frame===7)return role.cls==='mage'?.35:0;
 return meta.angle;
}
// Every gender/hairstyle owns measured palms in its whole-body authored poses.
function gaitLean(info,state){const blend=Math.max(0,Math.min(1,state.runBlend??(info.action==='run'?1:0)));return info.action==='walk'?18*blend:info.action==='run'?-16*(1-blend):0;}
function drawWeapon(ctx,role,info,meta,weapon,q){
 const w=parts[weapon.image];ctx.save();ctx.translate(...handAt(info,meta));ctx.rotate(weaponAngle(role,info,meta));const s=weapon.scale;ctx.save();if(role.cls==='archer')ctx.scale(-1,1);
  if(weapon.blade){
   // Reshape only the blade. The guard, hilt and authored palm stay fixed.
   const b=weapon.blade,cut=w.height*b.end,guardY=(cut-w.height*weapon.grip[1])*s;
   ctx.drawImage(w,0,0,w.width,cut,-w.width*weapon.grip[0]*s*b.width,guardY-cut*s*b.length,w.width*s*b.width,cut*s*b.length);
   ctx.drawImage(w,0,cut,w.width,w.height-cut,-w.width*weapon.grip[0]*s,guardY,w.width*s,(w.height-cut)*s);
  }else ctx.drawImage(w,-w.width*weapon.grip[0]*s,-w.height*weapon.grip[1]*s,w.width*s,w.height*s);
  ctx.restore();
  if(q>=2){ctx.fillStyle=q>=4?'#ffe29a':q>=3?'#c6a4ed':'#a9d5ef';ctx.fillRect(-5,-5,q>=4?10:7,3);if(q>=4){ctx.fillRect(-2,-12,3,5);ctx.fillRect(-9,-8,3,3);}}
  if(role.cls==='archer'&&info.action==='archer-attack'&&info.frame>=2&&info.frame<=3){ctx.strokeStyle='#ecd8a0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,-w.height*s/2);ctx.lineTo(-22,0);ctx.lineTo(-8,w.height*s/2);ctx.stroke();}
  ctx.restore();
}
function draw(ctx,role,state,x,y,scale,dir){
 // Large inspection portraits hold the authored idle pose, avoiding detail LOD flicker.
 const info=inspect(role,scale>1.25&&state?.action==='idle'?{...state,clock:0}:state);if(info.renderer!=='cartoon-v15')return false;const rec=record(info.action,role),meta=rec.metadata[info.frame],base=texture(info.action,role),im=scale>1.25&&info.action==='idle'&&info.frame===0?detailedTexture(base,role,info):base,a=appearance(role),gear=role.equipped||{},V=root.EquipmentVisuals;
 ctx.save();ctx.translate(x,y);ctx.scale(dir==='left'?-scale:scale,scale);ctx.imageSmoothingEnabled=true;
ctx.translate((state.fullOffsetX||0)-128,-224);
 const lean=gaitLean(info,state);ctx.transform(1,0,-lean/100,1,lean*224/100,0);const head=meta.head,hip=meta.hip,weapon=V.appearance(gear.weapon,'weapon',role.cls),rear=behindBody(info);
 if(weapon&&rear)drawWeapon(ctx,role,info,meta,weapon,gear.weapon?.q||0);
 drawPose(ctx,im,rec,info.frame);
 const outfit=V.appearance(gear.clothes,'clothes',role.cls),quality=gear.clothes?.q||0;
 const clothingTrack=detailProfiles.get(im)||clothProfiles.get(info.style+':'+info.action)[info.frame];
 if(outfit?.shape==='skirt'){
  const image=parts['robe-hem'],mesh=fittedHem(image,root.OutfitMotion.geometry(state,meta,outfit.shape,clothingTrack));
  root.OutfitMotion.drawHem(ctx,image,mesh);
  if(outfit.shape==='skirt'&&((info.action==='jump'&&info.frame>=2&&info.frame<=5)||info.action==='run'))drawPose(ctx,legLayers.get(base),rec,info.frame);
 }
 if(quality>=2){ctx.save();ctx.translate(...clothingTrack.belt);ctx.rotate(Math.atan(clothingTrack.slope));ctx.fillStyle=quality>=4?'#ffe096':quality>=3?'#c9a7f3':'#b8d7e4';ctx.fillRect(3,-1,2,2);ctx.restore();}
 const helmet=V.appearance(gear.helmet,'helmet',role.cls);if(helmet){const track=detailHelmets.get(im)||helmetTracks.get(info.style+':'+info.action)[info.frame],h=parts[helmet.image+track.view],fit=fittings.styles[info.style][info.action].metadata[info.frame];ctx.save();ctx.translate(...head);ctx.rotate(headCorrections[info.style+':'+info.action+':'+info.frame]?0:fit.headTilt*.55);ctx.drawImage(h,track.x-head[0],track.y-head[1],track.width,track.width*h.height/h.width);ctx.restore();}
 // Real authored foreground arms pass in front of headgear and cloth hems.
 const front=foregrounds.get(im);drawPose(ctx,front,rec,info.frame);
 if(weapon&&!rear){drawWeapon(ctx,role,info,meta,weapon,gear.weapon?.q||0);const hand=handAt(info,meta);
  if(role.cls==='warrior'){
   if(root.HandGrip){const track=gripTracks.get(info.style+':'+info.action)[info.frame];ctx.save();ctx.translate(...hand);root.HandGrip.draw(ctx,{skin:a.skin,angle:weaponAngle(role,info,meta),size:track.size,wrist:track.wrist});ctx.restore();}
   // Preserve the cuff in front of the hand bridge and guard, while leaving the
   // new articulated palm visible where the original fist was removed.
   drawPose(ctx,palms.get(im),rec,info.frame);
  }else{ctx.fillStyle={tan:'#c08057',deep:'#855239'}[a.skin]||'#e7aa78';ctx.beginPath();ctx.arc(hand[0],hand[1],3,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();return true;
}
function muzzle(role,state,x,y,dir,scale=.58){const info=inspect(role,state),meta=record(info.action,role).metadata[info.frame],hand=handAt(info,meta),weapon=root.EquipmentVisuals.appearance(role.equipped?.weapon,'weapon',role.cls),im=parts[weapon.image],angle=weaponAngle(role,info,meta),local=role.cls==='mage'?[0,-im.height*weapon.grip[1]*weapon.scale]:[10,0],sign=dir==='left'?-1:1;return {x:x+sign*(hand[0]-128+(state.fullOffsetX||0)+gaitLean(info,state)*(224-hand[1]-local[0]*Math.sin(angle)-local[1]*Math.cos(angle))/100+local[0]*Math.cos(angle)-local[1]*Math.sin(angle))*scale,y:y+(hand[1]-224+local[0]*Math.sin(angle)+local[1]*Math.cos(angle))*scale};}
function outfitGeometry(role,state){const info=inspect(role,state),meta=record(info.action,role).metadata[info.frame];texture(info.action,role);const outfit=root.EquipmentVisuals.appearance(role.equipped?.clothes,'clothes',role.cls),track=clothProfiles.get(info.style+':'+info.action)[info.frame];return root.OutfitMotion.geometry(state,meta,outfit.shape,track);}
function prepare(role){for(const action of Object.keys(manifest.animations))texture(action,role);}
const api={load,prepare,advance,draw,inspect,supported,frameAt,attackFrame,muzzle,outfitGeometry};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FullFrameMotion=api;
})(typeof window!=='undefined'?window:globalThis);
