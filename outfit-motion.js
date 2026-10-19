/* Painted cloth is deformed as a waist-pinned surface; the hero stays an authored whole pose. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const materials={plate:{flex:.13,length:12,width:37,flare:.06},short:{flex:.4,length:15,width:38,flare:.10},skirt:{flex:.85,length:31,width:40,flare:.23}};
function target(state){
 const speed=Math.abs(state.vx||0),clock=state.clock||0,phase=(state.fullPhase||0)*Math.PI*2;
 let turn=0;const a=state.attack&&(root.CombatFeel?.animationAttack(state.attack)||state.attack);
 if(a){const u=clamp((a.time||0)/(a.duration||.7),0,1);turn=Math.sin(u*Math.PI*2)*(state.cls==='warrior'?10:4)*(a.combo===1?-1:1);}
 const gait=state.grounded!==false&&speed>10?Math.sin(phase*2)*Math.min(3,speed/100):0;
 const lift=state.grounded===false?-Math.min(7,Math.abs(state.vy||0)*.009):state.land>0?-7*Math.sin(clamp(state.land/.085,0,1)*Math.PI):0;
 return {tail:clamp(-speed/28+turn+gait,-18,14),lift,flutter:speed>10||state.grounded===false?1.8:.65,clock};
}
function advance(state,dt){
 const goal=target(state);let c=state.outfitMotion;
 if(!c)c=state.outfitMotion={tail:0,lift:0,tailV:0,liftV:0,dir:state.dir||'right'};
 if(state.dir&&state.dir!==c.dir){c.tail=-c.tail;c.tailV=-c.tailV;c.dir=state.dir;}
 // Bounded small steps make spring inertia independent of renderer frame rate.
 let remaining=clamp(dt||0,0,.1);while(remaining>0){const step=Math.min(1/120,remaining);for(const key of ['tail','lift']){const v=key+'V';c[v]+=((goal[key]-c[key])*170-c[v]*22)*step;c[key]+=c[v]*step;}remaining-=step;}
 c.tail=clamp(c.tail,-20,20);c.lift=clamp(c.lift,-9,8);return c;
}
// Measure the authored belt, rather than estimating anatomy from hip+7.
// Sampling uses canonical pose coordinates for both original and detail artwork.
function measure(raw,width,meta,{frame=0,columns=1,scale=1}={}){
 const ox=frame%columns*256*scale,oy=Math.floor(frame/columns)*256*scale,cx=meta.hip[0],hy=meta.hip[1];
 const rgb=(x,y)=>{const ix=Math.round(ox+x*scale),iy=Math.round(oy+y*scale),i=(iy*width+ix)*4;return ix<0||ix>=width||iy<0||i<0||i+3>=raw.length?[0,0,0,0]:[raw[i],raw[i+1],raw[i+2],raw[i+3]];};
 const blue=p=>p[3]>100&&p[2]>p[0]*1.35&&p[1]>p[0]*1.15&&p[2]>40;
 const leather=p=>p[3]>150&&p[0]>42&&p[0]<180&&p[0]>p[1]*1.20&&p[1]>p[2]*1.15;
 const gold=p=>p[3]>150&&p[0]>130&&p[0]>p[1]*1.15&&p[1]>p[2]*1.35;
 let best={score:-Infinity,y:hy+3,slope:0,xs:[]};
 for(let y=hy-8;y<=hy+13;y++)for(const slope of [-.45,-.3,-.15,0,.15,.3,.45]){
  let score=0;const xs=[];
  for(let x=cx-23;x<=cx+23;x++){
   const yy=y+slope*(x-cx),hit=[-1,0,1].some(d=>leather(rgb(x,yy+d)));
   if(hit){xs.push(x);score+=1;}else if(gold(rgb(x,yy)))score+=.35;
   if(blue(rgb(x,yy-7)))score+=.27;
  }
  score-=Math.abs(y-hy-3)*.10+Math.abs(slope)*.8;
  if(score>best.score)best={score,y,slope,xs};
 }
 // Sleeve cuffs share the belt's leather palette. Restrict the seam to the
 // central shirt directly above it, so cuffs cannot inflate or shift the waist.
 const above=[];for(let xx=cx-28;xx<=cx+28;xx++)if(blue(rgb(xx,best.y+best.slope*(xx-cx)-6)))above.push(xx);
 const groups=[];for(const xx of above){const last=groups.at(-1);if(last&&xx-last.at(-1)<=3)last.push(xx);else groups.push([xx]);}
 groups.sort((a,b)=>(b.length-Math.abs((b[0]+b.at(-1))/2-cx)*.35)-(a.length-Math.abs((a[0]+a.at(-1))/2-cx)*.35));
 const shirt=groups[0],xs=shirt?.length>7?shirt:best.xs.length>8?best.xs:[cx-18,cx+18],left=xs[0]-2,right=xs.at(-1)+2,x=clamp((left+right)/2,cx-12,cx+12),waistWidth=clamp(right-left+1,26,44),beltY=best.y+best.slope*(x-cx);
 const rows=[];for(let y=Math.round(beltY)-38;y<=beltY+15;y++){
  const occupied=[];for(let xx=Math.round(x)-26;xx<=x+26;xx++)if(blue(rgb(xx,y)))occupied.push(xx);
  if(occupied.length>7)rows.push({y,x:occupied.reduce((a,b)=>a+b,0)/occupied.length,width:occupied.at(-1)-occupied[0]+1});
 }
 const upper=rows.filter(r=>r.y<beltY-7&&r.y>beltY-36),top=upper.length?upper[0].y:beltY-28,torsoHeight=clamp(beltY-top,21,36);
 return {waist:[x,beltY+3],belt:[x,beltY],width:waistWidth,slope:best.slope,torsoHeight,rows,measured:true};
}
function color(r,g,b,outfit,x,y,track){
 // Retain the original pose's painted folds and sleeve shading. No complete
 // chest sprite, second collar or second belt is composited over the character.
 const base=outfit.dye,lum=Math.pow((r*.213+g*.715+b*.072)/86,.86),u=(x-track.waist[0])/track.width+.5,v=(y-track.belt[1]+track.torsoHeight)/track.torsoHeight;
 let light=1;
 if(outfit.shape==='plate')light=.84+.36*Math.exp(-(((u-.32)/.38)**2));
 else if(outfit.shape==='short')light=.97-.12*Math.min(1,Math.abs(u-.4));
 else light=.96+.045*Math.cos(u*9+v*1.5);
 const result=base.map(n=>clamp(Math.round(n*lum*light),0,255));
 // Construction details live in the same authored cloth pixels: articulated
 // shoulder rims, a chest plate seam, a leather cross strap, and robe piping.
 if(outfit.shape==='plate'){
  if(v>.13&&v<.92&&Math.abs(u-(.47+.055*v))<.025)return result.map(n=>Math.round(n*.64));
  if(v<.57&&u<.18&&Math.abs(v-(.28+.31*u))<.035)return result.map(n=>Math.round(n*.59));
  if([[.20,.37],[.81,.37]].some(([x,y])=>Math.hypot((u-x)*1.25,v-y)<.043))return [179,153,98].map(n=>Math.min(255,Math.round(n*Math.min(1.15,lum))));
 }
 if(outfit.shape==='short'&&v>.03&&v<1.02){const d=Math.abs(u-(.12+.82*v));if(d<.074)return [89,64,42].map(n=>Math.round(n*clamp(lum,.72,1.18)));if(d<.095)return [55,45,32];}
 if(outfit.shape==='skirt'&&v>.15&&v<1.03&&Math.abs(u-(.59-.12*v))<.027)return [179,153,97].map(n=>Math.round(n*clamp(lum,.75,1.1)));

 // Fine integrated seams sit inside authored cloth pixels, following the torso.
 if(v>.3&&v<.92&&Math.abs(u-(outfit.shape==='short'?.68:.53))<.015){
  const seam=outfit.shape==='plate'?[94,108,116]:outfit.shape==='short'?[154,142,95]:[169,142,97];
  return result.map((n,i)=>Math.round(n*.74+seam[i]*.26));
 }
 return result;
}
function geometry(state,meta,shape,track){
 const mat=materials[shape]||materials.short,goal=target(state),c=state.outfitMotion||goal,waist=track?.waist||[meta.hip[0],meta.hip[1]+7],slope=track?.slope||0;
 const tail=c.tail*mat.flex,lift=c.lift*mat.flex,width=track?.width||mat.width,available=Math.max(15,224-waist[1]-7),height=Math.min(mat.length*clamp((track?.torsoHeight||28)/28,.85,1.12),available),columns=4,rows=6,points=[];
 for(let j=0;j<=rows;j++){const v=j/rows,row=[];for(let i=0;i<=columns;i++){const u=i/columns,free=v*v,flutter=Math.sin(goal.clock*8+v*3+u*2.4)*goal.flutter*mat.flex*free,dx=(u-.5)*width*(1+mat.flare*v);
  row.push({x:waist[0]+dx+tail*free+flutter,y:waist[1]+slope*dx+v*height+lift*free+Math.sin(goal.clock*6+u*3)*mat.flex*free+tail*(u-.5)*.10*free,u,v});
 }points.push(row);}
 return {waist,width,height,tail,lift,slope,columns,rows,points};
}
function torso(meta,track){
 const waist=track.waist,width=track.width||38,height=track.torsoHeight||28,slope=track.slope||0,points=[];
 for(let j=0;j<=4;j++){const v=j/4,w=width*(1+.08*(1-v));points.push([0,1].map(u=>({x:waist[0]+(u-.5)*w,y:waist[1]-3-height*(1-v)+slope*(u-.5)*w,u,v})));}
 return {columns:1,rows:4,points};
}
function triangle(ctx,image,s,d){
 const sx1=s[1][0]-s[0][0],sy1=s[1][1]-s[0][1],sx2=s[2][0]-s[0][0],sy2=s[2][1]-s[0][1],det=sx1*sy2-sx2*sy1;
 if(Math.abs(det)<1e-6)return;
 const dx1=d[1].x-d[0].x,dy1=d[1].y-d[0].y,dx2=d[2].x-d[0].x,dy2=d[2].y-d[0].y;
 const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(sx1*dx2-sx2*dx1)/det,e=(sx1*dy2-sx2*dy1)/det;
 ctx.save();ctx.beginPath();const center={x:(d[0].x+d[1].x+d[2].x)/3,y:(d[0].y+d[1].y+d[2].y)/3};
 for(let i=0;i<3;i++){const dx=d[i].x-center.x,dy=d[i].y-center.y,scale=1+.3/(Math.hypot(dx,dy)||1);ctx[i?'lineTo':'moveTo'](center.x+dx*scale,center.y+dy*scale);}ctx.closePath();ctx.clip();
 ctx.transform(a,b,c,e,d[0].x-a*s[0][0]-c*s[0][1],d[0].y-b*s[0][0]-e*s[0][1]);ctx.drawImage(image,0,0);ctx.restore();
}
function drawHem(ctx,image,mesh){
 for(let j=0;j<mesh.rows;j++)for(let i=0;i<mesh.columns;i++){
  const a=mesh.points[j][i],b=mesh.points[j][i+1],c=mesh.points[j+1][i+1],d=mesh.points[j+1][i],uv=p=>[p.u*image.width,p.v*image.height*(mesh.crop||1)];
  triangle(ctx,image,[uv(a),uv(b),uv(c)],[a,b,c]);triangle(ctx,image,[uv(a),uv(c),uv(d)],[a,c,d]);
 }
}
const api={advance,target,measure,color,geometry,torso,drawHem,materials};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OutfitMotion=api;
})(typeof window!=='undefined'?window:globalThis);
