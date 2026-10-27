/* Original woodland scenery. Collision cells are read, never changed by art. */
(function(root){
'use strict';
const CELL=48,PATHS=['environments/woodland-v42/valley.webp','ui/v25/terrain-strip.webp'];
const BACKGROUNDS={canopy:'environments/woodland-v44/canopy.webp',ravine:'environments/woodland-v44/ravine.webp',valley:PATHS[0],sanctuary:'environments/woodland-v44/sanctuary.webp'};
function pathsFor(scene){return [BACKGROUNDS[scene.biome]||PATHS[0],PATHS[1]];}
const Routes=typeof module!=='undefined'&&module.exports?require('./woodland-routes.js'):root.WoodlandRoutes;
const cache=new WeakMap();
function invalidate(scene){cache.delete(scene);}
const noise=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q);};
const themes=[
 {name:'林缘遗径',wash:'#b5c58b0d',stone:'#777b61',moss:'#7e9861'},
 {name:'藤根石径',wash:'#254f3d24',stone:'#626e59',moss:'#78945a'},
 {name:'苔桥溪谷',wash:'#4a839319',stone:'#6d8180',moss:'#839668'},
 {name:'守望遗庭',wash:'#193a4038',stone:'#6d756d',moss:'#87956b'}
];
function theme(id){return themes[(id-1)%4];}
function segments(scene){
 const grid=scene.raw.bgCell,out=[];
 for(let r=1;r<grid.length;r++)for(let c=1;c<grid[r].length-1;c++){
  const type=grid[r][c];
  if(type===1||type===4||type===2&&![1,2,4,13,14,15,16].includes(grid[r-1][c])){
   const y=(r+(type===2?0:1))*CELL,last=out[out.length-1];
   const solid=type===2||grid[r+1]?.[c]===2;
   if(last&&last.y===y&&last.x+last.width===c*CELL&&last.solid===solid)last.width+=CELL;
   else out.push({x:c*CELL,y,width:CELL,solid});
  }else if(type>=9&&type<=16){
   const k=(type-9)%4,ends=[[24,48],[48,24],[0,24],[24,0]][k];
   out.push({x:c*CELL,y:r*CELL+ends[0],endY:r*CELL+ends[1],width:CELL,solid:type>=13});
  }
 }
 // The outer collision wall is outside play. Extend its neighbouring ground skin
 // to the viewport boundary instead of exposing a 48px background gutter.
 const edges=[];for(const s of out){if(s.x===CELL){if(s.endY===undefined){s.x=0;s.width+=CELL;}else edges.push({x:0,y:s.y,width:CELL,solid:s.solid});}if(s.x+s.width===scene.width-CELL||s.solid&&scene.width-(s.x+s.width)<=CELL*2){if(s.endY===undefined)s.width=scene.width-s.x;else edges.push({x:scene.width-CELL,y:s.endY,width:CELL,solid:s.solid});}}
 return out.concat(edges);
}
function polygon(c,pts){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function stone(c,x,y,w,h,seed,palette){
 polygon(c,[[x+3,y+2],[x+w-6,y],[x+w,y+h-5],[x+w-4,y+h],[x+2,y+h-2],[x,y+6]]);
 const g=c.createLinearGradient(x,y,x+w*.4,y+h);g.addColorStop(0,palette);g.addColorStop(1,'#394c49');c.fillStyle=g;c.fill();c.strokeStyle='#283f3b';c.lineWidth=1.2;c.stroke();
 c.strokeStyle='#c0c5a85c';c.beginPath();c.moveTo(x+5,y+4);c.lineTo(x+w-9,y+3);c.stroke();
 for(let i=0;i<5;i++){c.fillStyle=i%2?'#e0d8b418':'#233e3a30';const xx=x+noise(seed+i)*w,yy=y+noise(seed+i+18)*h;c.fillRect(xx,yy,2+noise(seed+i+41)*7,1.5);}
 if(noise(seed)>.55){c.strokeStyle='#293e3c80';c.beginPath();c.moveTo(x+w*.62,y+2);c.lineTo(x+w*.51,y+h*.45);c.lineTo(x+w*.67,y+h*.63);c.stroke();}
}
function fern(c,x,y,size,seed,color){
 c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle='#4a6550';c.lineWidth=1.3;
 for(let branch=-2;branch<=2;branch++){
  const dx=branch*9,dy=-25+Math.abs(branch)*5;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(dx*.2,dy*.7,dx,dy);c.stroke();
  for(let i=1;i<5;i++){const q=i/5,bx=dx*q*q,by=dy*q;c.fillStyle=i%2?color:'#567654';
   for(const side of [-1,1]){c.beginPath();c.ellipse(bx+side*(5-q*2),by+2,6-q*3,2.2,side*.6+branch*.12,0,Math.PI*2);c.fill();}}
 }c.restore();
}
function moss(c,s,col){
 const ey=s.endY??s.y;c.strokeStyle='#253c2d';c.lineWidth=5;c.beginPath();c.moveTo(s.x,s.y+2);c.lineTo(s.x+s.width,ey+2);c.stroke();
 c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.moveTo(s.x,s.y+.5);c.lineTo(s.x+s.width,ey+.5);c.stroke();
 for(let x=s.x+4;x<s.x+s.width;x+=7){const y=s.y+(ey-s.y)*(x-s.x)/s.width;c.fillStyle=noise(x)>.5?'#a3ad70':col;c.beginPath();c.ellipse(x,y+1,3+noise(x+2)*4,1.5+noise(x+3)*3,.2,0,Math.PI*2);c.fill();}
}
function arch(c,x,y,width,height,col){
 // An open arch behind the playable floor; never a false collision platform.
 const thick=22,r=width/2;
 c.fillStyle='#41564b';for(const side of [-1,1])c.fillRect(x+side*r-thick/2+2,y-height+r,thick-4,Math.max(0,height-r));
 for(const side of [-1,1])for(let yy=0;yy<height-r;yy+=29)stone(c,x+side*r-thick/2,y-yy-29,thick,28,x+yy+side,col);
 for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/11,b=a+Math.PI/11-.018,cy=y-height+r;c.save();polygon(c,[[x+Math.cos(a)*(r+11),cy+Math.sin(a)*(r+11)],[x+Math.cos(b)*(r+11),cy+Math.sin(b)*(r+11)],[x+Math.cos(b)*(r-11),cy+Math.sin(b)*(r-11)],[x+Math.cos(a)*(r-11),cy+Math.sin(a)*(r-11)]]);c.fillStyle=i%3?col:'#8c947b';c.fill();c.strokeStyle='#334a42';c.lineWidth=1.5;c.stroke();c.restore();}
 fern(c,x-r,y-height+r,1.2,1,'#829663');fern(c,x+r,y-height+r+24,.8,2,'#829663');
}
function bake(scene,image,makeCanvas){
 if(cache.has(scene))return cache.get(scene);
 const terrain=image(PATHS[1]);if(!terrain)return null;
 const out=makeCanvas?makeCanvas(scene.width,scene.height):document.createElement('canvas');out.width=scene.width;out.height=scene.height;
 const c=out.getContext('2d'),pal=theme(scene.id),grid=scene.raw.bgCell,surfaces=segments(scene).flatMap(s=>{
  const b=(scene.bridges||[]).find(b=>b.open&&s.y===b.y&&s.endY===undefined&&s.x<b.x+b.width&&s.x+s.width>b.x);
  if(!b)return [s];const parts=[];if(s.x<b.x)parts.push({...s,width:b.x-s.x});parts.push({...s,x:Math.max(s.x,b.x),width:Math.min(s.x+s.width,b.x+b.width)-Math.max(s.x,b.x),rope:true});if(s.x+s.width>b.x+b.width)parts.push({...s,x:b.x+b.width,width:s.x+s.width-b.x-b.width});return parts;
 });c.imageSmoothingEnabled=true;
 // Solid cells are textured only inside their real collision outline.
 c.save();c.beginPath();for(let r=1;r<grid.length;r++)for(let col=1;col<grid[r].length-1;col++)if(grid[r][col]===2)c.rect(col===1?0:col*CELL,r*CELL,col===1||col===grid[r].length-2?CELL*2:CELL,CELL);c.clip();
 c.fillStyle='#35463a';c.fillRect(0,0,out.width,out.height);
 for(let x=0;x<out.width;x+=600)c.drawImage(terrain,0,150,terrain.width,terrain.height-150,x,0,600,scene.height);
 c.fillStyle='#254b4260';c.fillRect(0,0,out.width,out.height);c.restore();
 for(const s of surfaces){
  if(s.rope)continue;
  const ey=s.endY??s.y,depth=s.solid?Math.max(130,scene.height-Math.min(s.y,ey)):28;
  c.save();polygon(c,[[s.x,s.y],[s.x+s.width,ey],[s.x+s.width,ey+depth],[s.x,s.y+depth]]);c.clip();
  for(let x=s.x;x<s.x+s.width;x+=500)c.drawImage(terrain,0,150,terrain.width,terrain.height-150,x,Math.min(s.y,ey),500,Math.max(depth,170));
  c.fillStyle='#33554850';c.fillRect(s.x,Math.min(s.y,ey),s.width,depth+24);c.restore();
  // Raised walkways become old masonry bridges, with the exact floor line retained.
  if(!s.solid&&s.endY===undefined){for(let x=s.x;x<s.x+s.width;x+=44)stone(c,x,s.y+4,Math.min(44,s.x+s.width-x),25,x,pal.stone);
   if(s.width>190)for(let x=s.x+92;x<s.x+s.width-50;x+=180){const below=surfaces.filter(a=>a.solid&&a.y>s.y+90&&x>=a.x&&x<=a.x+a.width);const base=below.length?Math.min(...below.map(a=>a.y)):scene.height;c.save();c.globalAlpha=.7;arch(c,x,base,Math.min(142,Math.max(40,base-s.y-28)*1.7),Math.max(40,base-s.y-28),pal.stone);c.restore();}}
  moss(c,s,pal.moss);
  if(s.width>150){for(let x=s.x+55;x<s.x+s.width-30;x+=131)if(noise(x+scene.id)>.32)fern(c,x,s.y,.65+noise(x)*.35,x,pal.moss);}
 }
 // Draw one continuous ladder from its landing to its actual ground contact.
 for(let r=1;r<grid.length;r++)for(let col=1;col<grid[r].length-1;col++)if([3,4].includes(grid[r][col])&&![3,4].includes(grid[r-1][col])){
  const x=col*CELL+CELL/2,{top:y,bottomLeft,bottomRight}=Routes.ladderGeometry(grid,col,r),bottom=Math.min(bottomLeft,bottomRight);
  c.strokeStyle='#403e2c';c.lineWidth=5;c.beginPath();c.moveTo(x-13,y);c.lineTo(x-13,bottomLeft);c.moveTo(x+13,y);c.lineTo(x+13,bottomRight);c.stroke();
  c.strokeStyle='#b1a17a';c.lineWidth=3;for(let yy=y+7;yy<bottom-3;yy+=13){c.beginPath();c.moveTo(x-13,yy);c.lineTo(x+13,yy);c.stroke();}
  c.strokeStyle='#7e9362';c.lineWidth=2;c.beginPath();c.moveTo(x-13,y);c.bezierCurveTo(x-3,y+(bottom-y)*.25,x-24,y+(bottom-y)*.65,x-12,bottom);c.stroke();
 }
 // Exit and sparse ruined milestones belong to world coordinates, not the screen.
 arch(c,scene.exitX,scene.exitY,106,174,pal.stone);
 for(const s of surfaces.filter(s=>s.solid&&s.width>500))for(let x=s.x+340;x<s.x+s.width-150;x+=630){
  const h=38+noise(x+scene.id)*47;stone(c,x,s.y-h,34,h,x,pal.stone);stone(c,x-5,s.y-h-8,44,10,x+1,pal.stone);fern(c,x+26,s.y,1.8,x,pal.moss);
 }
 const result={canvas:out,surfaces};cache.set(scene,result);return result;
}
function drawObjects(c,scene){
 for(const b of scene.bridges||[]){
  c.save();c.strokeStyle='#536644';c.lineWidth=3;
  for(const end of [b.x,b.x+b.width]){stone(c,end-5,b.y-36,10,39,end,'#8c8762');}
  if(b.open){for(let x=b.x;x<b.x+b.width;x+=18){c.fillStyle='#877b52';c.fillRect(x,b.y,17,9);c.fillStyle='#c4b080';c.fillRect(x,b.y,17,2);}c.beginPath();c.moveTo(b.x,b.y-29);c.quadraticCurveTo(b.x+b.width/2,b.y-10,b.x+b.width,b.y-29);c.stroke();}
  else{c.beginPath();c.moveTo(b.x,b.y-29);c.quadraticCurveTo(b.x+24,b.y+25,b.x+7,b.y+64);c.stroke();for(let y=0;y<54;y+=15){c.fillStyle='#877b52';c.fillRect(b.x-7,b.y+y,16,9);}}
  c.restore();
 }
 for(const o of scene.objects||[]){c.save();c.translate(o.x,o.y);
  c.fillStyle='#172d3244';c.beginPath();c.ellipse(0,-1,28,5,0,0,Math.PI*2);c.fill();
  if(o.kind==='lever'){
   stone(c,-20,-15,40,15,o.x,'#8b9175');stone(c,-11,-35,22,24,o.x+1,'#7f8d76');
   c.strokeStyle='#3b4033';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(0,-26);c.lineTo(o.used?18:-17,-53);c.stroke();c.strokeStyle='#bca878';c.lineWidth=5;c.stroke();
   c.fillStyle=o.used?'#9cc580':'#dcbb72';c.beginPath();c.arc(o.used?18:-17,-53,7,0,Math.PI*2);c.fill();
  }else{
   const g=c.createLinearGradient(0,-37,0,0);g.addColorStop(0,'#ad8c58');g.addColorStop(1,'#4f4934');c.fillStyle=g;c.strokeStyle='#343f32';c.lineWidth=2.5;c.beginPath();c.roundRect(-25,-29,50,28,4);c.fill();c.stroke();
   c.fillStyle=o.used?'#263e35':'#b49c6a';c.beginPath();c.roundRect(-25,o.used?-47:-39,50,15,5);c.fill();c.stroke();
   if(o.used){c.fillStyle='#20322a';c.fillRect(-20,-28,40,8);}for(const x of [-17,12]){c.fillStyle='#798b66';c.fillRect(x,-37,5,34);c.fillStyle='#d1bf86';c.fillRect(x,-35,5,2);}if(!o.used){c.fillStyle='#e5c77d';c.fillRect(-4,-24,8,10);}
  }
  c.restore();
 }
}
function draw(c,scene,camera,cameraY,image,front=false){
 const pal=theme(scene.id),art=bake(scene,image);c.save();c.imageSmoothingEnabled=true;
 if(!front){
  c.fillStyle='#526e68';c.fillRect(camera,cameraY,1280,720);
  const bg=image(pathsFor(scene)[0]);if(bg){const height=820,width=height*bg.width/bg.height,travel=Math.max(1,scene.width-1280),drift=(width-1280)*camera/travel;c.drawImage(bg,camera-drift,cameraY-65-cameraY*.025,width,height);}
  c.fillStyle=pal.wash;c.fillRect(camera,cameraY,1280,720);
  // Independent drifting haze separates the distant painting from the ground.
  const haze=c.createLinearGradient(0,cameraY+340,0,cameraY+640);haze.addColorStop(0,'#b9cdc000');haze.addColorStop(.55,'#b9cdc017');haze.addColorStop(1,'#b9cdc000');c.fillStyle=haze;c.fillRect(camera,cameraY+340,1280,300);
  if(art)c.drawImage(art.canvas,0,0);
  drawObjects(c,scene);
  const open=scene.waves?.phase==='complete';const glow=c.createRadialGradient(scene.exitX,scene.exitY-66,3,scene.exitX,scene.exitY-66,65);glow.addColorStop(0,open?'#d5efba80':'#84bda91c');glow.addColorStop(1,'#88cab000');c.fillStyle=glow;c.fillRect(scene.exitX-65,scene.exitY-140,130,140);
 }else{
  // Small foliage below feet, so neither the hero nor attack warnings are obscured.
  if(art)for(const s of art.surfaces)if(s.solid&&s.width>150)for(let x=s.x+90;x<s.x+s.width;x+=289){if(x<camera-60||x>camera+1340)continue;fern(c,x,s.y+13,.9,x,'#425f49');}
 }
 c.restore();
}
const api={paths:[...new Set([...PATHS,...Object.values(BACKGROUNDS)])],pathsFor,invalidate,theme,segments,bake,draw,drawObjects};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WoodlandWorld=api;
})(globalThis);
