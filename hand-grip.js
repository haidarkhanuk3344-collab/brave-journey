/* A closed sword grip: fingers curl around the hilt and the thumb crosses them.
   Coordinates use a vertical hilt through (0, 0), with the blade toward -Y. */
(function(root){
'use strict';
const PALETTES={
 peach:{light:'#ffe0b0',base:'#ffc38b',shade:'#d88d5d',crease:'#965336',outline:'#39251e'},
 tan:{light:'#e8b180',base:'#c88a5c',shade:'#9f603e',crease:'#71412d',outline:'#34251e'},
 deep:{light:'#b9825c',base:'#925d3f',shade:'#6e402d',crease:'#512d23',outline:'#2d211d'}
};
function palette(skin){return PALETTES[skin]||PALETTES.peach;}
function localWrist(wrist,angle,size){
 const source=Array.isArray(wrist)?wrist:[-5,-14],cs=Math.cos(angle),sn=Math.sin(angle);
 return [(source[0]*cs+source[1]*sn)/size,(-source[0]*sn+source[1]*cs)/size];
}
function path(ctx,fn,fill,stroke,width=1.35){
 ctx.beginPath();fn(ctx);if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function draw(ctx,options={}){
 const angle=Number.isFinite(options.angle)?options.angle:0,size=Number.isFinite(options.size)?Math.max(.1,options.size):1,p=palette(options.skin);
 const wrist=localWrist(options.wrist,angle,size),side=wrist[0]>1?1:-1;
 // The thumb and palm follow the arm side, independently of blade rotation.
 // Keep the wrist seam in its source coordinates instead of rotating a fist.
 const wx=wrist[0]*-side,wy=wrist[1],reach=Math.min(19,Math.hypot(wx,wy)),len=Math.hypot(wx,wy)||1;
 const end=[wx/len*reach,wy/len*reach],perp=[-wy/len,wx/len];
 const seamA=[end[0]+perp[0]*4.15,end[1]+perp[1]*4.15],seamB=[end[0]-perp[0]*4.15,end[1]-perp[1]*4.15];
 ctx.save();ctx.rotate(angle);ctx.scale(size*-side,size);ctx.lineJoin='round';ctx.lineCap='round';
 // A tapered skin bridge connects the palm to the measured cuff seam.
 // Its seam itself is unoutlined so the original wrist artwork can meet it.
 const palm=ctx.createLinearGradient(-10,-10,8,10);palm.addColorStop(0,p.light);palm.addColorStop(.4,p.base);palm.addColorStop(1,p.shade);
 path(ctx,c=>{
  c.moveTo(...seamA);c.bezierCurveTo(-9,-7,-8,-10,-3.9,-10.1);
  c.bezierCurveTo(.2,-10.5,4.8,-8.9,6.3,-5.5);
  c.bezierCurveTo(7.9,-2.1,8.1,3.1,5.4,7.3);
  c.bezierCurveTo(3.6,10.2,-1.8,10.3,-5.8,7.9);
  c.bezierCurveTo(-9,6.1,-9.5,1.5,...seamB);c.closePath();
 },palm,null);
 // The palm's exposed contour ends at the sleeve; no black stripe across it.
 path(ctx,c=>{
  c.moveTo(...seamA);c.bezierCurveTo(-9,-7,-8,-10,-3.9,-10.1);
  c.bezierCurveTo(.2,-10.5,4.8,-8.9,6.3,-5.5);
  c.bezierCurveTo(7.9,-2.1,8.1,3.1,5.4,7.3);
  c.bezierCurveTo(3.6,10.2,-1.8,10.3,-5.8,7.9);
  c.bezierCurveTo(-9,6.1,-9.5,1.5,...seamB);
 },null,p.outline,1.65);
 // Four flexed finger pads. The outer knuckles form a stepped curve and
 // each inner tip folds back toward the handle, rather than straight digits.
 const fingers=[
  {top:-7.8,bottom:-3.55,outer:6.7,inner:-1.9},
  {top:-3.8,bottom:.4,outer:7.55,inner:-1.4},
  {top:.15,bottom:4.35,outer:7.15,inner:-1.0},
  {top:4.05,bottom:7.9,outer:5.85,inner:-.5}
 ];
 for(let i=0;i<fingers.length;i++){
  const f=fingers[i],mid=(f.top+f.bottom)/2,g=ctx.createLinearGradient(0,f.top,3,f.bottom+.8);
  g.addColorStop(0,p.light);g.addColorStop(.46,p.base);g.addColorStop(1,p.shade);
  path(ctx,c=>{
   c.moveTo(f.inner,f.top+.95);c.bezierCurveTo(.4,f.top-1,4.8,f.top-.2,f.outer,f.top+1.2);
   c.bezierCurveTo(f.outer+.65,mid,f.outer-.5,f.bottom-.35,4.8,f.bottom);
   c.bezierCurveTo(2.25,f.bottom+.85,.2,f.bottom-.15,f.inner,mid+.65);
   c.quadraticCurveTo(f.inner-1.2,mid,f.inner,f.top+.95);c.closePath();
  },g,null);
  // Short creases bend around the cylinder and stop before the silhouette.
  path(ctx,c=>{c.moveTo(f.inner+.4,f.bottom-.7);c.bezierCurveTo(1.5,f.bottom+.4,4.2,f.bottom+.05,5.6-i*.28,f.bottom-1.2);},null,p.crease,.75);
  if(i<3)path(ctx,c=>{c.moveTo(3.8,f.top+1.15);c.quadraticCurveTo(5.35,f.top+1.7,5.55,f.top+2.4);},null,'rgba(255,237,202,.35)',.7);
 }
 // The thumb sits across the index and middle fingers, with a narrow contact
 // shadow at its lower edge. The thumb's tip points inward toward the hilt.
 path(ctx,c=>{c.moveTo(-6.7,-8.7);c.bezierCurveTo(-2.1,-9.65,-.1,-6.6,2.4,-3.8);c.bezierCurveTo(4,-1.8,2.75,.2,1.25,.6);c.bezierCurveTo(-.7,.55,-2.1,-2.2,-4.4,-3.35);},null,p.crease,2.0);
 const thumb=ctx.createLinearGradient(-7,-10,3,1);thumb.addColorStop(0,p.light);thumb.addColorStop(.62,p.base);thumb.addColorStop(1,p.shade);
 path(ctx,c=>{
  c.moveTo(-7.45,-8.6);c.bezierCurveTo(-5.8,-10.8,-3.3,-10.3,-1.6,-8.6);
  c.bezierCurveTo(.15,-6.8,1.1,-5.1,2.6,-3.65);
  c.bezierCurveTo(3.95,-2.25,3.05,-.25,1.45,-.05);
  c.bezierCurveTo(-.65,.2,-2.0,-2.55,-4.1,-3.4);
  c.bezierCurveTo(-6.1,-4.2,-8.2,-5.45,-7.45,-8.6);c.closePath();
 },thumb,p.crease,.95);
 path(ctx,c=>{c.moveTo(-3.5,-7.4);c.quadraticCurveTo(-1.7,-6.5,-1.0,-5.1);},null,'rgba(255,237,202,.46)',.8);
 // A palm crease and restrained reflected light keep the skin hand-painted.
 path(ctx,c=>{c.moveTo(-6.3,1.6);c.quadraticCurveTo(-6.2,5.0,-3.9,6.15);},null,p.crease,.65);
 path(ctx,c=>{c.moveTo(-6.65,-1.1);c.quadraticCurveTo(-7.05,1.0,-6.6,2.1);},null,'rgba(255,237,202,.28)',.8);
 ctx.restore();
 return {size,angle,side,wrist:options.wrist||[-5,-14],fingers:4};
}
const api={draw,palette,localWrist};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HandGrip=api;
})(typeof window!=='undefined'?window:globalThis);
