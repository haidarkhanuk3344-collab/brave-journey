/* One painted wardrobe per action. Lazy loading never delegates to an older model. */
(function(root){
'use strict';
const PARTIAL_TEST=root.__WHOLEFRAME_PARTIAL_TEST__===true;
const PATH=PARTIAL_TEST&&root.__WHOLEFRAME_ASSET_PATH__?root.__WHOLEFRAME_ASSET_PATH__:'assets/characters/painted-v36/';
const defaults={warrior:['starter','sword_0'],archer:['tunic','bow_0'],mage:['robe','staff_0']};
const styles=['male-short','male-spiky','female-short','female-bob','female-pony'];
const helmets=['none','helmet_steel','helmet_leather'];
const sequences={idle:[0,1,2,3],hurt:[4,5,6,7],walk:[8,9,10,11,12,13,14,15],run:[16,17,18,19,20,21,22,23],jump:[24,25,26,27,28,29,30,31],attack0:[32,33,34,35,36,37,38,39],attack1:[40,40,41,41,42,42,43,43],attack2:[44,44,45,45,46,46,47,47]};
const BODY_LIMIT=4,FRAME_LIMIT=64,HEAD_LIMIT=48;
let manifest,loading,headImage,headMask,ready=false,loadError=null;
const bodies=new Map(),requests=new Map(),failures=new Map(),frameCache=new Map(),headCache=new Map();
const finitePair=a=>Array.isArray(a)&&a.length===2&&a.every(Number.isFinite);
const modulo=x=>((x%1)+1)%1;
function wardrobe(role){
 const d=defaults[role?.cls];if(!d)return null;
 const a=root.GameRules.normalizeAppearance(role.appearance),e=role.equipped||{};
 const clothes=e.clothes?.id||d[0],weapon=e.weapon?.id||d[1],helmet=e.helmet?.id||'none';
 if(!(['armor','tunic','robe'].includes(clothes)||(role.cls==='warrior'&&clothes==='starter'))||![d[1],d[1].replace('_0','_1')].includes(weapon)||!helmets.includes(helmet))return null;
 return {a,style:a.gender+'-'+a.hair,key:role.cls+'-'+clothes+'-'+weapon,helmet,clothes,weapon};
}
function supports(role){const w=wardrobe(role);return !!w&&(!manifest||!!manifest.bodies[w.key]);}
function image(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=async()=>{try{if(typeof im.decode==='function')await im.decode();if(!(im.naturalWidth||im.width)||!(im.naturalHeight||im.height))throw Error('空图片');resolve(im);}catch(error){reject(Error('角色素材解码失败：'+path+' · '+error.message));}};im.onerror=()=>reject(Error('角色素材读取失败：'+path));im.src=PATH+path;});}
function validate(m){
 if(m.version!==36||!Number.isInteger(m.cellSize)||m.cellSize<128||m.cellSize>2048||m.columns!==8||!finitePair(m.root)||(PARTIAL_TEST?Object.keys(m.bodies||{}).length<1:['warrior','archer','mage'].some(cls=>['armor','tunic','robe'].some(c=>[0,1].some(t=>!m.bodies?.[cls+'-'+c+'-'+{warrior:'sword',archer:'bow',mage:'staff'}[cls]+'_'+t]))))||m.heads?.length!==15)throw Error('角色素材清单不完整');
 if(!Number.isFinite(m.drawingScale)||m.drawingScale<=0||!Number.isFinite(m.headScale)||m.headScale<=0)throw Error('角色素材比例无效');
 for(const style of styles)for(const helmet of helmets){const h=m.heads.find(h=>h.style===style&&h.helmet===helmet);if(!h||!finitePair(h.neck)||h.rect?.length!==4||!h.rect.every(Number.isFinite))throw Error('缺少角色头部：'+style+'/'+helmet);}
 for(const [key,b] of Object.entries(m.bodies))if(!b.path||!b.maskPath||b.frames?.length!==48||b.frames.some(f=>f?(!finitePair(f.neck)||!finitePair(f.muzzle)||(f.root!==undefined&&!finitePair(f.root))||(f.headAngle!==undefined&&!Number.isFinite(f.headAngle))):!PARTIAL_TEST)||!b.frames.some(Boolean))throw Error('角色动作缺失：'+key);
 if(!m.headPath||!m.headMaskPath)throw Error('角色换色蒙版缺失');
}
function touch(map,key){const v=map.get(key);if(v){map.delete(key);map.set(key,v);}return v;}
function dropOldBodies(protect){while(bodies.size>BODY_LIMIT){const key=[...bodies.keys()].find(key=>key!==protect);if(!key)break;bodies.delete(key);}}
function requestBody(key){
 if(bodies.has(key))return Promise.resolve(touch(bodies,key));if(requests.has(key))return requests.get(key);
 const b=manifest.bodies[key];if(!b)return Promise.reject(Error('未知装备动作：'+key));
 const pending=Promise.all([image(b.path),image(b.maskPath)]).then(([image,mask])=>{
  if(image.width!==mask.width||image.height!==mask.height)throw Error('装备换色蒙版尺寸不匹配：'+key);
  if(image.width!==manifest.cellSize*8||image.height!==manifest.cellSize*6)throw Error('装备动作图集尺寸不匹配：'+key);
  const result={image,mask};bodies.set(key,result);dropOldBodies(key);failures.delete(key);return result;
 }).catch(error=>{failures.set(key,error);throw error;}).finally(()=>requests.delete(key));requests.set(key,pending);return pending;
}
function load(){return loading||(loading=(async()=>{
 loadError=null;const response=await fetch(PATH+'manifest.json?v=38');if(!response.ok)throw Error('角色动作清单读取失败');
 const raw=await response.json(),m=PARTIAL_TEST?{...raw,bodies:{...raw.bodies,...raw.candidates}}:raw;validate(m);manifest=m;
 [headImage,headMask]=await Promise.all([image(m.headPath),image(m.headMaskPath)]);
 if(headImage.width!==headMask.width||headImage.height!==headMask.height)throw Error('头部换色蒙版尺寸不匹配');
 for(const h of m.heads){const [x,y,w,hgt]=h.rect;if(x<0||y<0||w<=0||hgt<=0||x+w>headImage.width||y+hgt>headImage.height)throw Error('头部图集裁切范围无效：'+h.style+'/'+h.helmet);}
 await Promise.all(Object.entries(defaults).map(([cls,[clothes,weapon]])=>cls+'-'+clothes+'-'+weapon).filter(key=>m.bodies[key]).map(requestBody));ready=true;return true;
 })().catch(error=>{ready=false;loadError=error;loading=null;throw error;}));}
async function prepare(role){await load();const w=wardrobe(role);if(!w)throw Error('角色装备外观无法识别');await requestBody(w.key);return true;}
function select(role,state={}){
 const w=wardrobe(role);if(!manifest||!w)throw Error('角色尚未加载');let action=state.action||'idle',frame=0;
 if(action==='attack'&&state.attack){const a=root.CombatFeel?.animationAttack(state.attack)||state.attack;const combo=a.poseCombo??(a.skill===0?2:a.skill===1?0:a.skill===2?1:(a.combo||0)%3);action='attack'+(role.cls==='warrior'||a.skill>=0?combo:0);const t=Math.max(0,a.time||0),hit=Math.max(.001,a.hitAt||.2),active=Math.max(.001,a.active||.1),duration=Math.max(hit+active+.001,a.duration||.7);frame=t<hit?Math.min(3,Math.floor(t/hit*4)):t<hit+active?4+Math.min(1,Math.floor((t-hit)/active*2)):Math.min(7,6+Math.floor((t-hit-active)/(duration-hit-active)*2));
 }else if(action==='jump'){const vy=state.vy||0,elapsed=state.fullAirTime||0;frame=vy<-150?(elapsed<.055?0:elapsed<.15?1:2):vy<150?3:vy<420?4:5;
 }else if(state.land>0&&Math.abs(state.vx||0)<45&&action!=='hurt'){action='jump';frame=state.land>.04?6:7;
 }else if(action==='hurt'){frame=Math.max(0,Math.min(3,Math.floor((.16-(state.stun||0))/.16*4)));
 }else{if(!sequences[action])action='idle';const phase=action==='idle'?(state.clock||0)/1.2:(state.fullPhase||0);frame=Math.floor(modulo(phase)*sequences[action].length);}
 const record=manifest.bodies[w.key],sequence=record.sequences?.[action]||manifest.sequences?.[role.cls]?.[action]||sequences[action];let slot=sequence[Math.min(sequence.length-1,frame)];
 if(Number.isInteger(state.qaFrame)&&state.qaFrame>=0&&state.qaFrame<48)slot=state.qaFrame;
 const pose=record.frames[slot];if(!pose)throw Error('候选动作帧尚未制作：'+w.key+'/'+slot);const head=manifest.heads.find(h=>h.style===w.style&&h.helmet===w.helmet);return {action,frame,slot,record,wardrobe:w,head,neck:pose.neck,pose};
}
function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function cached(map,key,limit,make){const old=touch(map,key);if(old)return old;const value=make();map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);return value;}
// Authored semantic masks protect eyes, outlines and equipment; runtime never guesses pixels by color or position.
function tint(surface,mask,a){
 if(a.color==='brown'&&a.skin==='peach')return surface;
 const ctx=surface.getContext('2d'),data=ctx.getImageData(0,0,surface.width,surface.height),d=data.data,md=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const coverage=Math.min(1,md[i+3]/d[i+3]),hair=a.color==='brown'?0:md[i]/255*coverage,skin=a.skin==='peach'?0:md[i+1]/255*coverage;if(!hair&&!skin)continue;const r=d[i],g=d[i+1],b=d[i+2];
  if(hair){const l=.3*r+.59*g+.11*b,target=a.color==='gold'?[l*1.45+25,l*1.08+14,l*.54+9]:[l*1.12+12,l*.67+8,l*1.33+18];for(let j=0;j<3;j++)d[i+j]=d[i+j]*(1-hair)+Math.min(255,target[j])*hair;}
  if(skin){const f=a.skin==='tan'?[.79,.68,.59]:[.50,.40,.34];for(let j=0;j<3;j++)d[i+j]*=1-skin+f[j]*skin;}
 }ctx.putImageData(data,0,0);return surface;
}
function crop(im,rect){const [x,y,w,h]=rect,c=canvas(w,h);c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);return c;}
function bodyTexture(info){const w=info.wardrobe,size=manifest.cellSize,loaded=touch(bodies,w.key);return cached(frameCache,w.key+'|'+info.slot+'|'+w.a.skin,FRAME_LIMIT,()=>{const rect=[info.slot%8*size,Math.floor(info.slot/8)*size,size,size],c=crop(loaded.image,rect);return w.a.skin==='peach'?c:tint(c,crop(loaded.mask,rect),{color:'brown',skin:w.a.skin});});}
function headTexture(info){const w=info.wardrobe;return cached(headCache,w.style+'|'+w.helmet+'|'+w.a.color+'|'+w.a.skin,HEAD_LIMIT,()=>tint(crop(headImage,info.head.rect),crop(headMask,info.head.rect),w.a));}
function loadingMark(ctx,x,y,scale,error){ctx.save();ctx.translate(x,y);ctx.fillStyle=error?'#bd6964':'#eddfa8';ctx.strokeStyle='#314c43';ctx.lineWidth=3;ctx.textAlign='center';ctx.font=Math.max(12,Math.min(18,scale*10))+'px sans-serif';const text=error?'装备读取失败':'装备读取中…';ctx.strokeText(text,0,-48);ctx.fillText(text,0,-48);ctx.restore();}
function draw(ctx,role,state,x,y,scale=.58,dir='right'){
 if(!supports(role)){loadingMark(ctx,x,y,scale,Error('未知装备'));return true;}const w=wardrobe(role);
 const info=manifest&&manifest.bodies[w.key]?select(role,state):null,frameKey=info&&w.key+'|'+info.slot+'|'+w.a.skin;
 if(!ready||(!bodies.has(w.key)&&!frameCache.has(frameKey))){if(ready&&!failures.has(w.key))requestBody(w.key).catch(()=>{});loadingMark(ctx,x,y,scale,failures.get(w.key)||loadError);return true;}
 const factor=manifest.drawingScale,hs=manifest.headScale,[rx,ry]=info.pose.root||manifest.root;
 ctx.save();ctx.translate(x,y);ctx.scale((dir==='left'?-1:1)*scale*factor,scale*factor);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(info.record.headInFront)ctx.drawImage(bodyTexture(info),-rx,-ry);
 ctx.save();ctx.translate(info.neck[0]-rx,info.neck[1]-ry);ctx.rotate(info.pose.headAngle||0);const head=headTexture(info);ctx.drawImage(head,-info.head.neck[0]*hs,-info.head.neck[1]*hs,head.width*hs,head.height*hs);ctx.restore();
 if(!info.record.headInFront)ctx.drawImage(bodyTexture(info),-rx,-ry);
 // Authored foreground parts (hands, arrows) can cross in front of the face.
 for(const polygon of info.pose.foregroundPolygons||[]){ctx.save();ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x-rx,y-ry):ctx.moveTo(x-rx,y-ry));ctx.closePath();ctx.clip();ctx.drawImage(bodyTexture(info),-rx,-ry);ctx.restore();}
 ctx.restore();return true;
}
function muzzle(role,state,x,y,dir,scale=.58){if(!supports(role)||!manifest)return null;const info=select(role,state),p=info.pose.muzzle,anchor=info.pose.root||manifest.root,factor=manifest.drawingScale;return {x:x+(dir==='left'?-1:1)*(p[0]-anchor[0])*scale*factor,y:y+(p[1]-anchor[1])*scale*factor};}
function inspect(role,state={}){const w=wardrobe(role);if(!w)return null;if(!manifest)return {renderer:'painted-v36',status:loadError?'error':'loading',body:w.key,error:loadError?.message};const i=select(role,state);return {renderer:'painted-v36',status:failures.has(w.key)||loadError?'error':ready&&(bodies.has(w.key)||frameCache.has(w.key+'|'+i.slot+'|'+w.a.skin))?'ready':'loading',partialTest:PARTIAL_TEST,action:i.action,frame:i.frame,slot:i.slot,body:w.key,style:w.style,gender:w.a.gender,hairColor:w.a.color,skin:w.a.skin,clothes:w.clothes,weapon:w.weapon,helmet:w.helmet,frames:48,cellSize:manifest.cellSize,bodyRoot:[...(i.pose.root||manifest.root)],headAnchor:[...i.neck]};}
function advance(state){if(['walk','run'].includes(state.action)){if(state.fullLastAction==='idle')state.fullPhase=.25;state.fullPhase=modulo((state.fullPhase||0)+Math.abs(state.travel||0)/(state.action==='run'?168:112));}state.fullLastAction=state.action;state.fullOffsetX=0;state.fullOffsetY=0;}
function cacheInfo(){return {ready,partialTest:PARTIAL_TEST,bodyLimit:BODY_LIMIT,bodies:[...bodies.keys()],pending:[...requests.keys()],frames:frameCache.size,heads:headCache.size,errors:[...failures.keys()]};}
root.WholeFrameCharacter={load,prepare,supports,select,draw,muzzle,inspect,advance,cacheInfo};
})(typeof window!=='undefined'?window:globalThis);
