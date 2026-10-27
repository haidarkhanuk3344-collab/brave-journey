/* Smooth elemental silhouettes; all phases follow the existing combat clock. */
(function(root){'use strict';
const colors={cleave:['#d47e33','#ffd67c','#fff6cc'],crosscut:['#bc6c31','#ffe2a0','#fff9db'],vortex:['#c58640','#ffe3a0','#fff7d2'],wind:['#388d81','#8cedcc','#efffd9'],pierce:['#a5a63f','#ffe48c','#fffbe1'],rain:['#397e91','#a7efdd','#fffcd8'],fire:['#df5939','#ffbc66','#fff8c4'],frost:['#478fac','#98e5fa','#edffff'],meteor:['#7465ba','#c5b8ff','#f2f5ff']};
const clamp=n=>Math.max(0,Math.min(1,n)),snap=n=>n;
function pixel(c,x,y,w,h=w){c.beginPath();c.ellipse(x,y,Math.max(.2,w/2),Math.max(.2,h/2),0,0,Math.PI*2);c.fill();}
function glow(c,x,y,r,color,alpha=.2,flat=1){if(r<=0||alpha<=0)return;c.save();c.globalAlpha=clamp(alpha);c.translate(x,y);c.scale(1,flat);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,color);g.addColorStop(.35,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();}
function line(c,points,color,width=2,alpha=1){c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function ring(c,x,y,r,color,alpha=1,flat=.32){if(r<=0)return;c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r,r*flat,0,0,Math.PI*2);c.stroke();}
function shards(c,x,y,r,color,clock,seed=0,count=12){c.save();c.fillStyle=color;for(let i=0;i<count;i++){const a=i*2.399+seed*1.7,d=r*(.35+(i%4)*.16),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.65+clock*clock*35;c.save();c.translate(px,py);c.rotate(a+clock*3);const s=i%3?2:3.5;c.beginPath();c.moveTo(-s,0);c.quadraticCurveTo(0,-s*.7,s*1.9,0);c.quadraticCurveTo(0,s*.7,-s,0);c.fill();c.restore();}c.restore();}
function crystal(c,x,y,h,w,color,alpha=1){if(h<=0)return;c.save();c.globalAlpha=clamp(alpha);const g=c.createLinearGradient(x-w/2,y,x+w/2,y-h);g.addColorStop(0,color+'77');g.addColorStop(.48,color);g.addColorStop(.8,'#d4f7ff');g.addColorStop(1,'#ffffff');c.fillStyle=g;c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w*.4,y-h*.65);c.lineTo(x,y-h);c.lineTo(x+w*.45,y-h*.6);c.lineTo(x+w/2,y);c.closePath();c.fill();c.fillStyle=color+'99';c.beginPath();c.moveTo(x,y-h);c.lineTo(x-w/2,y);c.lineTo(x+w*.12,y-h*.24);c.fill();line(c,[[x+w*.12,y-h*.24],[x,y-h]],'#edffff',1.2,alpha*.9);c.restore();}
function dust(c,x,y,r,age,pal){const f=clamp(1-age/.4);for(let i=0;i<5;i++){const xx=x+(i-2)*r*.35;glow(c,xx,y-3-Math.sin(i*2)*3,r*.26,pal[0],f*.2,.3);}c.save();c.globalAlpha=f*.65;shards(c,x,y-5,r,pal[1],age,3,7);c.restore();}
function crescent(c,x,y,dir,r,time,reverse,palette){const p=clamp(time/.3);if(p>=1)return;const swing=1-Math.pow(1-p,2),a=(reverse?1.45:-1.4)+(reverse?-1:1)*swing*2.8,sign=reverse?-1:1;c.save();c.translate(x,y);c.scale(dir,1);glow(c,Math.cos(a)*r*.45,Math.sin(a)*r*.3,r*.65,palette[0],(1-p)*.2,.65);
 for(let layer=0;layer<3;layer++){const outer=r-layer*4,width=[24,14,3.5][layer],span=2.15,g=c.createLinearGradient(-r,0,r,0);g.addColorStop(0,palette[layer]+'00');g.addColorStop(.45,palette[layer]+'88');g.addColorStop(1,palette[layer]);c.globalAlpha=Math.pow(1-p,.7)*[.35,.95,1][layer];c.fillStyle=g;c.beginPath();for(let i=0;i<=36;i++){const aa=a-sign*span*(1-i/36),xx=Math.cos(aa)*outer,yy=Math.sin(aa)*outer*.66;i?c.lineTo(xx,yy):c.moveTo(xx,yy);}for(let i=36;i>=0;i--){const aa=a-sign*span*(1-i/36),rr=outer-width*Math.sin(i/36*Math.PI);c.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr*.66);}c.closePath();c.fill();}
 c.globalAlpha=(1-p)*.8;shards(c,Math.cos(a)*r*.8,Math.sin(a)*r*.55,8+p*30,palette[2],time,reverse?2:1,5);c.restore();}
function charge(c,a,hero,hand){const visual=root.CombatFeel.animationAttack(a);if(visual.time>=visual.hitAt)return;const kind=root.SkillCombat.definition(a.cls,a.skill).kind,pal=colors[kind],p=clamp(visual.time/visual.hitAt),dir=a.dir==='right'?1:-1,x=hand.x,y=hand.y;
 c.save();glow(c,x,y,12+p*20,pal[1],p*.25);c.globalAlpha=.35+p*.55;
 if(a.cls==='warrior'){line(c,[[hero.x-dir*24,hero.y-10],[hero.x-dir*16,hero.y-40],[hero.x-dir*8,hero.y-66]],pal[1],2,.25+p*.55);for(let i=0;i<6;i++){const d=(1-p)*50+8,angle=i*1.05+a.time*2;c.fillStyle=pal[i%3];pixel(c,x+Math.cos(angle)*d,y+Math.sin(angle)*d,3);}}
 else if(kind==='pierce'){for(let i=0;i<4;i++)line(c,[[x-dir*(54-i*8),y+(i-1.5)*12*(1-p)],[x-dir*5,y]],pal[i%3],i===2?3:2,.25+p*.7);c.fillStyle=pal[2];pixel(c,x-4,y-4,8);}
 else{ring(c,hero.x,hero.y-3,22+p*(a.skill===2?31:12),pal[1],p*.8);ring(c,x,y,7+p*14,pal[2],.65,1);shards(c,x,y,36*(1-p)+12,pal[1],0,2,6);}
 c.restore();}
function draw(c,fx){const pal=colors[fx.kind]||colors.fire,q=clamp(fx.time/fx.life),fade=(1-q)**.65,dir=fx.dir||1;if(q>=1||fx.time<0)return;c.save();c.imageSmoothingEnabled=true;
 if(fx.kind==='cleave'||fx.kind==='crosscut'){
  crescent(c,fx.x,fx.y-43,dir,fx.range*.7,fx.time,fx.kind==='crosscut'&&fx.index===1,pal);
  if(fx.kind==='cleave'||fx.index===2){const reach=fx.range*.84;dust(c,fx.x+dir*reach*.55,fx.y,reach*.45,fx.time,pal);}
 }else if(fx.kind==='vortex'){
  const r=fx.range*.74,turn=fx.time*13+fx.index*1.6;glow(c,fx.x,fx.y-35,r,pal[0],fade*.18,.55);for(let j=0;j<3;j++){c.globalAlpha=fade*(.75-j*.15);const g=c.createLinearGradient(fx.x-r,0,fx.x+r,0);g.addColorStop(0,pal[j]+'00');g.addColorStop(.6,pal[j]);g.addColorStop(1,pal[2]);c.fillStyle=g;c.beginPath();for(let i=0;i<=32;i++){const a=turn+j*1.3+i/32*3.4,x=fx.x+Math.cos(a)*r,y=fx.y-36-j*16+Math.sin(a)*r*.3;i?c.lineTo(x,y):c.moveTo(x,y);}for(let i=32;i>=0;i--){const a=turn+j*1.3+i/32*3.4,w=Math.sin(i/32*Math.PI)*(j===0?16:9);c.lineTo(fx.x+Math.cos(a)*(r-w),fx.y-36-j*16+Math.sin(a)*r*.3+w*.35);}c.closePath();c.fill();}
  if(fx.index===3){ring(c,fx.x,fx.y-3,fx.range*(.25+q*.75),pal[1],fade);shards(c,fx.x,fx.y-35,45+q*140,pal[1],fx.time,3,16);}
 }else if(fx.kind==='wind'||fx.kind==='pierce'){
  const length=fx.kind==='pierce'?100:50;line(c,[[fx.x-dir*length,fx.y-8],[fx.x-dir*12,fx.y]],pal[1],fx.kind==='pierce'?4:2,fade);line(c,[[fx.x-dir*length,fx.y+8],[fx.x-dir*12,fx.y]],pal[2],2,fade);shards(c,fx.x,fx.y,14+q*35,pal[1],fx.time,fx.index,6);
 }else if(fx.kind==='rain'){
  const radius=fx.radius;ring(c,fx.x,fx.y-3,radius,pal[1],fade*.7);line(c,[[fx.x-radius,fx.y-1],[fx.x+radius,fx.y-1]],pal[0],3,fade*.45);
  for(let i=0;i<6;i++)for(let j=-1;j<=1;j++){const at=.28+i*.14,local=fx.time-at;if(local<-.23||local>.25)continue;const x=fx.x+j*radius*.7+Math.sin(i*2+j)*radius*.1,progress=clamp((local+.23)/.23),y=fx.y-195*(1-progress)-8;if(local<0){projectile(c,{skillKind:'wind',x,y,vx:170,vy:600,age:progress*.25});}else{glow(c,x,fx.y-6,13+local*65,pal[1],(1-local/.25)*.3,.45);c.globalAlpha=1-local/.25;shards(c,x,fx.y-8,local*150,pal[2],local,i+j,5);}}

 }else if(fx.kind==='frost'){
  glow(c,fx.x,fx.y-8,fx.radius,pal[0],fade*.24,.32);for(const at of [.06,.3,.55]){const dt=fx.time-at;if(dt>=0&&dt<.23){ring(c,fx.x,fx.y-3,fx.radius*(.4+dt/.23*.6),pal[2],(1-dt/.23)*.5);glow(c,fx.x,fx.y-20,fx.radius*.65,pal[1],(1-dt/.23)*.18,.45);}}for(let i=0;i<9;i++){const local=fx.time-i*.045;if(local<0)continue;const p=1-Math.pow(1-clamp(local/.22),3),x=fx.x+dir*(-fx.radius+fx.radius*2*i/8),h=[26,45,62,44,70,51,60,40,25][i];crystal(c,x,fx.y,h*p,16+5*(i%2),pal[i%2],fade*.75);}shards(c,fx.x,fx.y-28,fx.radius*(.3+q*.7),pal[2],fx.time,4,14);
 }else if(fx.kind==='meteor'){
  glow(c,fx.x,fx.y-8,fx.radius*1.08,pal[0],fade*.3,.4);ring(c,fx.x,fx.y-3,fx.radius,pal[1],fade*.6);ring(c,fx.x,fx.y-3,fx.radius*.65,pal[0],fade*.4);
  for(let i=0;i<3;i++){const at=[.35,.65,.95][i],local=fx.time-at,x=fx.x+(i-1)*fx.radius*.5;if(local<-.32||local>.55)continue;if(local<0){const y=fx.y-260*clamp(-local/.32);crystal(c,x,y+4,44+i*8,24,pal[1],1);line(c,[[x,y-110],[x,y-45]],pal[0],6,.5);}else{const p=1-Math.pow(1-clamp(local/.18),3),r=(i===2?fx.radius:fx.radius*.58)*(1+local*.25);glow(c,x,fx.y-35,r,pal[1],clamp(1-local/.22)*.5,.7);dust(c,x,fx.y,r,local,pal);ring(c,x,fx.y-4,r,pal[2],(1-local/.55)*.9);for(let j=-2;j<=2;j++)crystal(c,x+j*18,fx.y,(40+(2-Math.abs(j))*24)*p,18,pal[j%2?0:1],(1-local/.55)*.8);shards(c,x,fx.y-45,30+local*180,pal[2],local,i,16);}}
 }else if(fx.kind==='fire'){
  const r=fx.radius*(.25+(1-Math.pow(1-q,3))*.75);glow(c,fx.x,fx.y,r*1.2,pal[0],fade*.5);for(let i=0;i<7;i++){const a=i*Math.PI*2/7,rr=r*(.55+.07*Math.sin(i*4)),x=fx.x+Math.cos(a)*rr*.65,y=fx.y+Math.sin(a)*rr*.6;glow(c,x,y,rr,pal[i%2],fade*.38);}
  ring(c,fx.x,fx.y,r,pal[1],fade*.75,.9);glow(c,fx.x,fx.y,r*.45,pal[2],clamp(1-q*3)*.9);c.globalAlpha=fade;shards(c,fx.x,fx.y,r*1.1,pal[1],fx.time,5,14);
 }
 c.restore();}
function projectile(c,s){const kind=s.skillKind,pal=colors[kind],dir=Math.sign(s.vx)||1;if(!pal)return;c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy||0,s.vx||dir));const clock=s.age||0;
 if(kind==='fire'){
  const r=19+Math.sin(clock*15)*1.2;glow(c,0,0,r*2.2,pal[0],.3);const flame=(length,width,color,offset)=>{const g=c.createLinearGradient(-length,0,r,0);g.addColorStop(0,color+'00');g.addColorStop(.45,color+'99');g.addColorStop(1,color);c.fillStyle=g;c.beginPath();c.moveTo(r*.6,-width*.5);c.bezierCurveTo(-12,-width*1.2,-length*.6,-width*.2+Math.sin(clock*15+offset)*7,-length,Math.sin(clock*12+offset)*5);c.bezierCurveTo(-length*.55,width*.65,-8,width,r*.6,width*.5);c.closePath();c.fill();};
  flame(52,23,pal[0],0);flame(40,15,pal[1],2);const g=c.createRadialGradient(6,-4,1,0,0,r);g.addColorStop(0,pal[2]);g.addColorStop(.42,'#ffe7a4');g.addColorStop(.76,pal[1]);g.addColorStop(1,pal[0]);c.fillStyle=g;c.beginPath();c.ellipse(0,0,r,r*.9,0,0,Math.PI*2);c.fill();for(let i=0;i<4;i++){c.globalAlpha=.5;c.fillStyle=pal[1];pixel(c,-22-i*9,Math.sin(clock*11+i*2)*(8+i*2),2.5);}
 }else{
  const strong=kind==='pierce',length=strong?54:30;glow(c,-length*.3,0,length*.9,pal[1],strong?.22:.12,.25);
  const g=c.createLinearGradient(-length*1.4,0,5,0);g.addColorStop(0,pal[1]+'00');g.addColorStop(1,pal[1]);c.strokeStyle=g;c.lineWidth=strong?4:2.5;c.lineCap='round';c.beginPath();c.moveTo(-length*1.4,Math.sin(clock*17)*2);c.quadraticCurveTo(-length*.5,-3,4,0);c.stroke();line(c,[[-length*.5,0],[4,0]],pal[2],strong?2:1.2);
  c.fillStyle=pal[2];c.beginPath();c.moveTo(10,0);c.lineTo(-3,-(strong?5:3.5));c.lineTo(0,0);c.lineTo(-3,strong?5:3.5);c.closePath();c.fill();for(const side of [-1,1])line(c,[[-length*.7,side*4],[-length*.5,0]],pal[1],1.5,.8);
  if(strong){c.strokeStyle=pal[1];c.lineWidth=1.3;c.globalAlpha=.6;for(const side of [-1,1]){c.beginPath();c.moveTo(-60,side*7);c.bezierCurveTo(-37,side*16,-22,-side*8,2,0);c.stroke();}}
 }c.restore();}
function status(c,e,body,clock){if(!(e.freeze>0||e.slow>0))return;c.save();if(e.freeze>0){for(let i=-1;i<=1;i++)crystal(c,e.x+i*body.width*.17,e.y,body.height*(i===0?.9:.63),body.width*.3,'#89d0e5',.38);shards(c,e.x,e.y-body.height*.5,body.width*.38,'#deffff',0,1,6);}else{ring(c,e.x,e.y-2,body.width*.35,'#8de5fa',.55);for(let i=0;i<4;i++){const a=i*1.57+clock*.9;c.fillStyle='#c6f4ff';pixel(c,e.x+Math.cos(a)*body.width*.3,e.y-8-Math.abs(Math.sin(a))*20,3);}}c.restore();}
const api={charge,draw,projectile,status,colors};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SkillEffects=api;
})(typeof window!=='undefined'?window:globalThis);
