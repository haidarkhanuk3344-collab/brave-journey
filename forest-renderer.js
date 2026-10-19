(function(root){
'use strict';
const BASE='environments/forest_region/';
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function bakeLegacy(scene,image){
 const out=document.createElement('canvas');out.width=scene.width;out.height=720;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;
 const tinted=(im,color,alpha)=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-atop';g.globalAlpha=alpha;g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c;};
 const tile=(name,x,y,w=64,h=64,interior=false)=>{const im=image(BASE+'tiles/'+name+'.png');if(interior){ctx.save();if(noise(x+y)>.5){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,2,8,60,54,0,0,w,h);}else ctx.drawImage(im,2,8,60,54,x,y,w,h);ctx.restore();}else ctx.drawImage(im,x,y,w,h);};
 for(const floor of scene.terrain){
  ctx.save();ctx.beginPath();ctx.rect(floor.x,floor.y,floor.width,720-floor.y);ctx.clip();
  for(let x=floor.x;x<floor.x+floor.width;x+=64){tile('ground_mid',x,floor.y);for(let y=floor.y+48;y<720;y+=54)tile(scene.id===4?'stone_floor':'soil_fill',x,y,64,54,true);}
  const depth=ctx.createLinearGradient(0,floor.y+20,0,720);depth.addColorStop(0,'#182c2100');depth.addColorStop(1,'#14242085');ctx.fillStyle=depth;ctx.fillRect(floor.x,floor.y+25,floor.width,720-floor.y);
  ctx.fillStyle='#728549';for(let x=floor.x+8;x<floor.x+floor.width;x+=13){const y=floor.y+1+noise(x)*5;ctx.globalAlpha=.35+noise(x+1)*.3;ctx.fillRect(x,y,3+noise(x+2)*4,2);}ctx.globalAlpha=1;ctx.restore();
 }
 const bridges=scene.props.filter(p=>p[0]==='bridge').map(p=>scene.platforms.reduce((a,b)=>Math.abs(a.x+a.width/2-p[1])<Math.abs(b.x+b.width/2-p[1])?a:b));
 for(const floor of scene.platforms){
  if(bridges.includes(floor)){const bridge=image(BASE+'props/bridge.png'),s=floor.width/bridge.width;ctx.drawImage(bridge,floor.x,floor.y-40*s,floor.width,bridge.height*s);}
  else for(let x=0;x<floor.width;x+=64)tile(x===0?'platform_left':x+64>=floor.width?'platform_right':'platform_mid',floor.x+x,floor.y,Math.min(64,floor.width-x),24);
  ctx.fillStyle='#132c274d';ctx.fillRect(floor.x+4,floor.y+18,floor.width-8,5);
 }
 if(scene.id===2)for(let x=1344;x<1920;x+=64)tile('water',x,660);
 const props=new Map();
 for(const [id,x,s] of [...scene.props,...scene.accents]){
  if(id==='bridge')continue;const tree=['oak','fir'].includes(id);let im=props.get(id);if(!im){im=tinted(image(BASE+'props/'+id+'.png'),'#5f7951',tree?.16:.09);props.set(id,im);}
  const y=LevelLayout.groundAt(scene,x),size=s*(tree?1.13:1);
  ctx.fillStyle='#14291b55';ctx.beginPath();ctx.ellipse(x,y+2,im.width*size*(tree?.2:.32),tree?6:3,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(im,x-im.width*size/2,y-im.height*size+3,im.width*size,im.height*size);
  if(tree){const fern=image(BASE+'props/fern.png'),f=.33;ctx.globalAlpha=.85;ctx.drawImage(fern,x-23,y-fern.height*f+3,fern.width*f,fern.height*f);ctx.globalAlpha=1;}
 }
 scene.background=out;
 function mist(source,start,end){const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const g=c.getContext('2d');g.drawImage(source,0,0);g.globalCompositeOperation='destination-in';const fade=g.createLinearGradient(0,start,0,end);fade.addColorStop(0,'#ffffffff');fade.addColorStop(1,'#ffffff00');g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);return c;}
 scene.far=mist(image(scene.layers.far),235,310);scene.mid=mist(image(scene.layers.mid),340,425);
 scene.distantImages=['fir','oak'].map(id=>tinted(image(BASE+'props/'+id+'.png'),'#4d6e63',.78));
 scene.distantTrees=[];for(let i=-1;i<Math.ceil(scene.width/270)+4;i++)scene.distantTrees.push({x:i*270+noise(i+7)*180,s:.78+noise(i+14)*.55,y:585+noise(i+32)*45,id:noise(i+56)>.55?1:0});
 scene.gates={closed:image(BASE+'props/gate_closed.png'),open:image(BASE+'props/gate_open.png')};
}
function drawLegacy(ctx,scene,camera,time,passed){
 const sky=ctx.createLinearGradient(0,0,0,680);sky.addColorStop(0,['#527a70','#4d7770','#42695e','#405e59'][scene.id-1]);sky.addColorStop(.55,['#8fac91','#84a799','#779b84','#77948a'][scene.id-1]);sky.addColorStop(1,'#526f5c');ctx.fillStyle=sky;ctx.fillRect(camera,0,1280,720);
 const layer=(im,ratio,alpha)=>{ctx.globalAlpha=alpha;const offset=camera*(1-ratio),start=Math.floor(camera*ratio/im.width)-1;for(let i=start;i<start+3;i++)ctx.drawImage(im,offset+i*im.width,80);ctx.globalAlpha=1;};
 layer(scene.far,.2,.6);layer(scene.mid,.46,.48);
 ctx.globalAlpha=.45;for(const tree of scene.distantTrees){const im=scene.distantImages[tree.id],x=tree.x+camera*.25;ctx.drawImage(im,x,tree.y-im.height*tree.s,im.width*tree.s,im.height*tree.s);}ctx.globalAlpha=1;
 const haze=ctx.createLinearGradient(0,415,0,635);haze.addColorStop(0,'#92ac9200');haze.addColorStop(.6,'#92ac9245');haze.addColorStop(1,'#92ac9200');ctx.fillStyle=haze;ctx.fillRect(camera,415,1280,220);
 ctx.save();const light=ctx.createLinearGradient(0,0,0,600);light.addColorStop(0,'#f6edbd12');light.addColorStop(1,'#f6edbd00');ctx.fillStyle=light;for(const x of [250+camera*.15,1280+camera*.15]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+45,0);ctx.lineTo(x-170,580);ctx.lineTo(x-270,580);ctx.closePath();ctx.fill();}ctx.restore();
 ctx.drawImage(scene.background,0,0);
 const gate=passed?scene.gates.open:scene.gates.closed,gx=scene.exitX,gy=LevelLayout.groundAt(scene,gx);ctx.drawImage(gate,gx-gate.width*.45,gy-gate.height*.9,gate.width*.9,gate.height*.9);
 ctx.fillStyle='#dce5b8';ctx.globalAlpha=.35;for(let i=0;i<12;i++){const x=(i*307+time*7)%scene.width,y=300+(Math.sin(time*.45+i)*.5+.5)*230;ctx.fillRect(x,y,i%3===0?3:2,2);}ctx.globalAlpha=1;
}
// The illustrated route changes drawing only; all solid/platform data stays in LevelLayout.
const ART='ui/v25/';
const artPaths=['forest-backdrop.png','forest-props.png','terrain-strip.png'].map(n=>ART+n);
const spriteCache=new WeakMap();
function artSprites(atlas){
 if(spriteCache.has(atlas))return spriteCache.get(atlas);
 // Measured v25 authored frames and foot anchors; source includes transparent padding.
 const frames={"oak":[2,1,607,563,271,556],"fir":[620,1,358,559,171,552],"boulder":[980,182,547,383,273,376],"shrub":[5,669,556,336,265,329],"sign":[606,569,349,442,174,435],"ruin_arch":[953,564,579,440,290,433]},result={};
 for(const [name,[x,y,w,h,fx,fy]] of Object.entries(frames)){
  const frame=document.createElement('canvas');frame.width=w;frame.height=h;frame.foot=[fx,fy];
  frame.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);result[name]=frame;
 }
 spriteCache.set(atlas,result);return result;
}
function illustratedSurface(ctx,texture,floor,height=720,platform=false){
 const depth=platform?27:height-floor.y;
 ctx.save();ctx.beginPath();ctx.rect(floor.x,floor.y,floor.width,depth);ctx.clip();
 // One broad painted strip replaces the dense repeating 64px pixel-soil grid.
 for(let x=floor.x;x<floor.x+floor.width;x+=512){
  const w=Math.min(512,floor.x+floor.width-x);
  ctx.drawImage(texture,0,30,texture.width*w/512,texture.height-30,x,platform?floor.y:floor.y-5,w,platform?50:Math.max(155,depth+5));
 }
 ctx.strokeStyle='#354328';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(floor.x,floor.y+1);ctx.lineTo(floor.x+floor.width,floor.y+1);ctx.stroke();
 if(platform){ctx.strokeStyle='#3b3525';ctx.lineWidth=1.5;ctx.strokeRect(floor.x+.75,floor.y+.75,floor.width-1.5,25.5);ctx.fillStyle='#3b3525';ctx.fillRect(floor.x,floor.y+24,floor.width,3);}
 ctx.restore();
}
function bake(scene,image){
 const backdrop=image(ART+'forest-backdrop.png'),atlas=image(ART+'forest-props.png'),soil=image(ART+'terrain-strip.png');
 if(!backdrop||!atlas||!soil)return bakeLegacy(scene,image);
 const out=document.createElement('canvas');out.width=scene.width;out.height=720;const c=out.getContext('2d');c.imageSmoothingEnabled=true;
 for(const floor of scene.terrain)illustratedSurface(c,soil,floor);
 const bridges=scene.props.filter(p=>p[0]==='bridge').map(p=>scene.platforms.reduce((a,b)=>Math.abs(a.x+a.width/2-p[1])<Math.abs(b.x+b.width/2-p[1])?a:b));
 for(const platform of scene.platforms){
  if(bridges.includes(platform)){
   c.fillStyle='#805637';c.strokeStyle='#473a28';c.lineWidth=3;c.fillRect(platform.x,platform.y,platform.width,22);c.strokeRect(platform.x,platform.y,platform.width,22);
   c.strokeStyle='#bd9460';for(let x=platform.x+18;x<platform.x+platform.width;x+=34){c.beginPath();c.moveTo(x,platform.y+3);c.lineTo(x,platform.y+18);c.stroke();}
  }else illustratedSurface(c,soil,platform,720,true);
 }
 if(scene.id===2){c.fillStyle='#72bac5';c.fillRect(1344,660,576,60);c.strokeStyle='#c8edf0';c.lineWidth=2;for(let x=1352;x<1910;x+=54){c.beginPath();c.moveTo(x,674);c.quadraticCurveTo(x+12,669,x+26,674);c.stroke();}}
 const sprites=artSprites(atlas),aliases={fern:'shrub',root:'shrub',mushrooms:'shrub',rune_stone:'boulder'};
 for(const [id,x,size] of [...scene.props,...scene.accents]){
  if(id==='bridge'||id==='stream')continue;
  const im=sprites[aliases[id]||id];if(!im)continue;
  const old=image(BASE+'props/'+id+'.png'),tree=id==='oak'||id==='fir';
  const h=(old?.height||im.height)*size*(tree?1:.8),w=h*im.width/im.height,y=LevelLayout.groundAt(scene,x);
  c.fillStyle='#283d2a2b';c.beginPath();c.ellipse(x,y+2,w*.25,tree?7:4,0,0,Math.PI*2);c.fill();
  const scale=h/im.height;c.drawImage(im,x-im.foot[0]*scale,y-im.foot[1]*scale+2,w,h);
 }
 scene.background=out;scene.illustratedArt={backdrop,gate:sprites.ruin_arch};
}
function draw(ctx,scene,camera,time,passed){
 if(!scene.illustratedArt)return drawLegacy(ctx,scene,camera,time,passed);
 ctx.save();ctx.imageSmoothingEnabled=true;
 const art=scene.illustratedArt;
 // Overscan plus a small drift keeps a single painting continuous without tile seams.
 ctx.drawImage(art.backdrop,camera-camera*.075,-62,1536,864);
 if(scene.id>1){ctx.fillStyle=['','#356c5810','#224b4320','#17382f3b'][scene.id-1];ctx.fillRect(camera,0,1280,720);}
 ctx.drawImage(scene.background,0,0);
 if(art.gate&&!scene.practice){const y=LevelLayout.groundAt(scene,scene.exitX),h=175,w=h*art.gate.width/art.gate.height;
  if(passed){ctx.fillStyle='#a8e5c34a';ctx.beginPath();ctx.ellipse(scene.exitX,y-72,38,72,0,0,Math.PI*2);ctx.fill();}
  const scale=h/art.gate.height;ctx.drawImage(art.gate,scene.exitX-art.gate.foot[0]*scale,y-art.gate.foot[1]*scale+2,w,h);
 }
 ctx.fillStyle='#fff4cb';ctx.globalAlpha=.45;for(let i=0;i<8;i++){const x=(i*463+time*5)%scene.width,y=260+(Math.sin(time*.4+i)*.5+.5)*210;ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();}ctx.restore();
}
root.ForestRenderer={bake,draw,assetPaths:artPaths};
})(window);
