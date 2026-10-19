/* Pixel-edged, simulation-timed skill silhouettes. Artwork is original Canvas geometry. */
(function(root){'use strict';
const colors={cleave:['#d47e33','#ffd67c','#fff6cc'],crosscut:['#bc6c31','#ffe2a0','#fff9db'],vortex:['#c58640','#ffe3a0','#fff7d2'],wind:['#388d81','#8cedcc','#efffd9'],pierce:['#a5a63f','#ffe48c','#fffbe1'],rain:['#397e91','#a7efdd','#fffcd8'],fire:['#df5939','#ffbc66','#fff8c4'],frost:['#478fac','#98e5fa','#edffff'],meteor:['#7465ba','#c5b8ff','#f2f5ff']};
const clamp=n=>Math.max(0,Math.min(1,n)),snap=n=>Math.round(n/2)*2;
function pixel(c,x,y,w,h=w){c.fillRect(snap(x),snap(y),snap(w),snap(h));}
function line(c,points,color,width=2,alpha=1){c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(snap(x),snap(y)):c.moveTo(snap(x),snap(y)));c.stroke();}
function ring(c,x,y,r,color,alpha=1,flat=.32){c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=2;c.beginPath();for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,px=snap(x+Math.cos(a)*r),py=snap(y+Math.sin(a)*r*flat);i?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
function shards(c,x,y,r,color,clock,seed=0,count=12){c.fillStyle=color;for(let i=0;i<count;i++){const a=i*2.399+seed*1.7,d=r*(.35+(i%4)*.16);pixel(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.65+clock*clock*35,i%3?3:5);}}
function crystal(c,x,y,h,w,color,alpha=1){c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.moveTo(snap(x-w/2),snap(y));c.lineTo(snap(x-w*.4),snap(y-h*.65));c.lineTo(snap(x),snap(y-h));c.lineTo(snap(x+w*.45),snap(y-h*.6));c.lineTo(snap(x+w/2),snap(y));c.fill();line(c,[[x,y-3],[x,y-h*.85]],'#edffff',2,alpha*.7);}
function crescent(c,x,y,dir,r,time,reverse,palette){const p=clamp(time/.3),a=(reverse?1.45:-1.4)+(reverse?-1:1)*p*2.8;c.save();c.translate(x,y);c.scale(dir,1);for(let layer=0;layer<3;layer++){const outer=r-layer*5,width=[20,12,4][layer],span=2.1;c.globalAlpha=(1-p)**.75*[.28,.9,1][layer];c.fillStyle=palette[layer];c.beginPath();for(let i=0;i<=20;i++){const aa=a-(reverse?-1:1)*span*(1-i/20);const xx=Math.cos(aa)*outer,yy=Math.sin(aa)*outer*.66;i?c.lineTo(snap(xx),snap(yy)):c.moveTo(snap(xx),snap(yy));}for(let i=20;i>=0;i--){const aa=a-(reverse?-1:1)*span*(1-i/20),rr=outer-width*Math.sin(i/20*Math.PI);c.lineTo(snap(Math.cos(aa)*rr),snap(Math.sin(aa)*rr*.66));}c.closePath();c.fill();}c.restore();}
function charge(c,a,hero,hand){const visual=root.CombatFeel.animationAttack(a);if(visual.time>=visual.hitAt)return;const kind=root.SkillCombat.definition(a.cls,a.skill).kind,pal=colors[kind],p=clamp(visual.time/visual.hitAt),dir=a.dir==='right'?1:-1,x=hand.x,y=hand.y;
 c.save();c.globalAlpha=.35+p*.55;
 if(a.cls==='warrior'){line(c,[[hero.x-dir*24,hero.y-10],[hero.x-dir*16,hero.y-40],[hero.x-dir*8,hero.y-66]],pal[1],2,.25+p*.55);for(let i=0;i<6;i++){const d=(1-p)*50+8,angle=i*1.05+a.time*2;c.fillStyle=pal[i%3];pixel(c,x+Math.cos(angle)*d,y+Math.sin(angle)*d,3);}}
 else if(kind==='pierce'){for(let i=0;i<4;i++)line(c,[[x-dir*(54-i*8),y+(i-1.5)*12*(1-p)],[x-dir*5,y]],pal[i%3],i===2?3:2,.25+p*.7);c.fillStyle=pal[2];pixel(c,x-4,y-4,8);}
 else{ring(c,hero.x,hero.y-3,22+p*(a.skill===2?31:12),pal[1],p*.8);ring(c,x,y,7+p*14,pal[2],.65,1);shards(c,x,y,36*(1-p)+12,pal[1],0,2,6);}
 c.restore();}
function draw(c,fx){const pal=colors[fx.kind]||colors.fire,q=clamp(fx.time/fx.life),fade=(1-q)**.65,dir=fx.dir||1;c.save();
 if(fx.kind==='cleave'||fx.kind==='crosscut'){
  crescent(c,fx.x,fx.y-43,dir,fx.range*.7,fx.time,fx.kind==='crosscut'&&fx.index===1,pal);
  if(fx.kind==='cleave'||fx.index===2){const reach=fx.range*.84;line(c,[[fx.x,fx.y-4],[fx.x+dir*reach*.25,fx.y-9],[fx.x+dir*reach*.5,fx.y-3],[fx.x+dir*reach*.75,fx.y-8],[fx.x+dir*reach,fx.y-5]],pal[1],4,fade);for(let i=1;i<=6;i++){const h=(1-q)*[14,23,36,28,20,12][i-1];crystal(c,fx.x+dir*(i*reach/6),fx.y,h,9,pal[0],fade*.65);}}
 }else if(fx.kind==='vortex'){
  const r=fx.range*.74,turn=fx.time*13+fx.index*1.6;for(let j=0;j<3;j++){c.globalAlpha=fade*(.7-j*.15);c.strokeStyle=pal[j];c.lineWidth=j===0?9:3;c.beginPath();for(let i=0;i<=20;i++){const a=turn+j*1.3+i/20*3.4,x=fx.x+Math.cos(a)*r,y=fx.y-36-j*16+Math.sin(a)*r*.3;i?c.lineTo(snap(x),snap(y)):c.moveTo(snap(x),snap(y));}c.stroke();}
  if(fx.index===3){ring(c,fx.x,fx.y-3,fx.range*(.25+q*.75),pal[1],fade);shards(c,fx.x,fx.y-35,45+q*140,pal[1],fx.time,3,16);}
 }else if(fx.kind==='wind'||fx.kind==='pierce'){
  const length=fx.kind==='pierce'?100:50;line(c,[[fx.x-dir*length,fx.y-8],[fx.x-dir*12,fx.y]],pal[1],fx.kind==='pierce'?4:2,fade);line(c,[[fx.x-dir*length,fx.y+8],[fx.x-dir*12,fx.y]],pal[2],2,fade);shards(c,fx.x,fx.y,14+q*35,pal[1],fx.time,fx.index,6);
 }else if(fx.kind==='rain'){
  const radius=fx.radius;ring(c,fx.x,fx.y-3,radius,pal[1],fade*.7);line(c,[[fx.x-radius,fx.y-1],[fx.x+radius,fx.y-1]],pal[0],3,fade*.45);
  for(let i=0;i<6;i++)for(let j=-1;j<=1;j++){const at=.28+i*.14,local=fx.time-at;if(local<-.23||local>.25)continue;const x=fx.x+j*radius*.7+Math.sin(i*2+j)*radius*.1,progress=clamp((local+.23)/.23),y=fx.y-195*(1-progress)-8;if(local<0){line(c,[[x-15,y-48],[x,y]],pal[1],3,.85);line(c,[[x-6,y-14],[x,y],[x+6,y-15]],pal[2],2,1);}else{line(c,[[x-14,fx.y-20],[x,fx.y-3],[x+14,fx.y-20]],pal[1],3,1-local/.25);shards(c,x,fx.y-8,local*150,pal[2],local,i+j,5);}}

 }else if(fx.kind==='frost'){
  ring(c,fx.x,fx.y-3,fx.radius,pal[1],fade*.7);for(let i=0;i<9;i++){const local=fx.time-i*.045;if(local<0)continue;const p=clamp(local/.22),x=fx.x-fx.radius+fx.radius*2*i/8,h=[26,45,62,44,70,51,60,40,25][i];crystal(c,x,fx.y,h*p,16+5*(i%2),pal[i%2],fade*.75);}shards(c,fx.x,fx.y-28,fx.radius*(.3+q*.7),pal[2],fx.time,4,14);
 }else if(fx.kind==='meteor'){
  ring(c,fx.x,fx.y-3,fx.radius,pal[1],fade*.8);ring(c,fx.x,fx.y-3,fx.radius*.65,pal[0],fade*.6);
  for(let i=0;i<3;i++){const at=[.35,.65,.95][i],local=fx.time-at,x=fx.x+(i-1)*fx.radius*.5;if(local<-.32||local>.55)continue;if(local<0){const y=fx.y-260*clamp(-local/.32);crystal(c,x,y+4,44+i*8,24,pal[1],1);line(c,[[x,y-110],[x,y-45]],pal[0],6,.5);}else{const p=clamp(local/.18),r=(i===2?fx.radius:fx.radius*.58)*(1+local*.25);ring(c,x,fx.y-4,r,pal[2],(1-local/.55)*.9);for(let j=-2;j<=2;j++)crystal(c,x+j*18,fx.y,(40+(2-Math.abs(j))*24)*p,18,pal[j%2?0:1],(1-local/.55)*.8);shards(c,x,fx.y-45,30+local*180,pal[2],local,i,16);}}
 }else if(fx.kind==='fire'){
  const r=fx.radius*(.25+Math.min(1,q*3)*.75);c.globalAlpha=fade*.42;c.fillStyle=pal[0];c.beginPath();for(let i=0;i<20;i++){const a=i/20*Math.PI*2,rr=r*(i%2?.8:1);i?c.lineTo(snap(fx.x+Math.cos(a)*rr),snap(fx.y+Math.sin(a)*rr)):c.moveTo(snap(fx.x+rr),snap(fx.y));}c.closePath();c.fill();ring(c,fx.x,fx.y,r,pal[1],fade,.9);ring(c,fx.x,fx.y,r*.55,pal[2],fade*.7,.95);for(let j=0;j<8;j++){const a=j*Math.PI/4,x=fx.x+Math.cos(a)*r*.5,y=fx.y+Math.sin(a)*r*.5;line(c,[[x,y],[fx.x+Math.cos(a)*r*.95,fx.y+Math.sin(a)*r*.95]],pal[j%2?1:2],5,fade*.8);}shards(c,fx.x,fx.y,r*1.2,pal[1],fx.time,5,18);
 }
 c.restore();}
function projectile(c,s){const kind=s.skillKind,pal=colors[kind],dir=Math.sign(s.vx)||1;c.save();if(kind==='fire'){
 const r=19+Math.sin((s.age||0)*15)*1.5,clock=s.age||0;
 function flameShape(radius,cx,cy,color){c.fillStyle=color;c.beginPath();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,rr=radius*(i%2?.94:1),x=snap(cx+Math.cos(a)*rr),y=snap(cy+Math.sin(a)*rr);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();}
 for(let i=3;i>=0;i--){const x=s.x-dir*(18+i*9),y=s.y+Math.sin(clock*18+i*2)*3;c.globalAlpha=.28+(3-i)*.12;flameShape(13-i*2,x,y,pal[0]);}
 c.globalAlpha=1;flameShape(r,s.x,s.y,pal[0]);flameShape(r*.76,s.x+dir*3,s.y-1,pal[1]);flameShape(r*.46,s.x+dir*6,s.y-2,pal[2]);c.fillStyle=pal[1];for(let i=0;i<5;i++){const a=i*1.257+clock*3,x=s.x+Math.cos(a)*(r+5),y=s.y+Math.sin(a)*(r+5);pixel(c,x,y,4);}

 }else{const length=kind==='pierce'?54:30;c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));line(c,[[-length*1.6,0],[0,0]],pal[0],kind==='pierce'?9:5,.25);line(c,[[-length,0],[0,0]],pal[1],kind==='pierce'?5:3,.9);line(c,[[-10,-7],[2,0],[-10,7]],pal[2],3,1);if(kind==='pierce'){line(c,[[-46,-9],[-28,-4],[-14,-10],[1,0]],pal[1],2,.8);}}
 c.restore();}
function status(c,e,body,clock){if(!(e.freeze>0||e.slow>0))return;c.save();if(e.freeze>0){for(let i=-1;i<=1;i++)crystal(c,e.x+i*body.width*.17,e.y,body.height*(i===0?.9:.63),body.width*.3,'#89d0e5',.38);shards(c,e.x,e.y-body.height*.5,body.width*.38,'#deffff',0,1,6);}else{ring(c,e.x,e.y-2,body.width*.35,'#8de5fa',.55);for(let i=0;i<4;i++){const a=i*1.57+clock*.9;c.fillStyle='#c6f4ff';pixel(c,e.x+Math.cos(a)*body.width*.3,e.y-8-Math.abs(Math.sin(a))*20,3);}}c.restore();}
const api={charge,draw,projectile,status,colors};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SkillEffects=api;
})(typeof window!=='undefined'?window:globalThis);
