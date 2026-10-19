/* Pixel silhouettes for warnings and actual attacks. Same hazard radius drives both. */
(function(root){
'use strict';
const color={root:'#9ed779',fruit:'#ec9471',slam:'#e9bb75',wave:'#e9bb75',thorn:'#9ed779'};
function ring(c,x,y,r,p,ink){c.save();c.fillStyle=ink+'25';c.strokeStyle=ink;c.lineWidth=2;c.setLineDash([7,5]);c.beginPath();c.ellipse(x,y-2,r,6+p*3,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.fillStyle=ink;c.fillRect(x-2,y-6,4,4);c.restore();}
function telegraph(c,e,b,t){const m=e.eliteMove;if(!m)return;const pre=m.clock<m.windup,p=Math.min(1,m.clock/m.windup),ink=m.color;
 c.save();
 if(pre&&(m.key==='charge'||m.key==='shield'||m.key==='stones'||m.key==='thorns')){
  const end=m.key==='charge'?Math.max(e.patrolMin,Math.min(e.patrolMax,m.targetX+m.dir*70)):e.x+m.dir*(m.key==='thorns'?178:310),lo=Math.min(e.x,end),hi=Math.max(e.x,end);
  c.fillStyle=ink+'30';c.fillRect(lo,e.y-8,hi-lo,8);c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(lo,e.y-2);c.lineTo(hi,e.y-2);c.stroke();
  for(let x=lo+20;x<hi;x+=34){c.fillStyle=ink+'b0';c.beginPath();c.moveTo(x+m.dir*7,e.y-12);c.lineTo(x-m.dir*5,e.y-17);c.lineTo(x-m.dir*5,e.y-7);c.closePath();c.fill();}
 }
 if(e.guard>0){c.strokeStyle='#e7d695';c.lineWidth=4;c.beginPath();c.ellipse(e.x+m.dir*b.width*.35,e.y-b.height*.48,10,35,0,-Math.PI/2,Math.PI/2);c.stroke();c.fillStyle='#f7e4a5';for(let i=0;i<e.guard;i++)c.fillRect(e.x-12+i*8,e.y-b.height-32,5,5);}
 if(e.exposed>0||m.key==='roots'&&pre){c.strokeStyle='#f8d78c';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y-b.height*.45,b.width*.2,b.height*.2,0,0,Math.PI*2);c.stroke();c.fillStyle='#fff0b1';c.fillRect(e.x-2,e.y-b.height*.45-2,4,4);}
 if(m.key==='awaken'){ring(c,e.x,e.y,b.width*.65,p,'#e89667');c.fillStyle='#e9a466aa';for(let i=0;i<9;i++)c.fillRect(e.x-b.width*.4+i*b.width*.1,e.y-15-p*70-(i%3)*8,3,6);}
 if(pre){c.font='bold 12px "PingFang SC"';c.textAlign='center';c.strokeStyle='#23322b';c.lineWidth=3;c.strokeText(m.label,e.x,e.y-b.height-43);c.fillStyle=ink;c.fillText(m.label,e.x,e.y-b.height-43);}
 c.restore();
}
function status(c,e,b,t){if(e.exposed<=0||e.eliteMove)return;c.save();c.fillStyle='#f8d78c';for(let i=0;i<3;i++){const a=t*3+i*Math.PI*2/3;c.fillRect(e.x+Math.cos(a)*b.width*.25,e.y-b.height-18+Math.sin(a)*4,3,3);}c.restore();}
function hazard(c,h){const ink=color[h.kind]||'#e9bb75',age=h.age||0;c.save();
 if(h.warning>0){const p=Math.min(1,age/(age+h.warning));ring(c,h.x,h.y,h.radius,p,ink);
  if(h.kind==='fruit'){const y=h.y-185*(1-p)-30;c.fillStyle='#632d2b';c.beginPath();c.arc(h.x,y,13,0,Math.PI*2);c.fill();c.fillStyle='#d56243';c.fillRect(h.x-8,y-8,16,16);c.fillStyle='#ffc176';c.fillRect(h.x-5,y-7,4,5);c.fillStyle='#87a95c';c.fillRect(h.x+2,y-15,8,4);}
  else if(h.kind==='root'){c.strokeStyle='#73974d';c.lineWidth=2;c.beginPath();c.moveTo(h.x-8,h.y-3);c.lineTo(h.x-1,h.y-9);c.lineTo(h.x+9,h.y-4);c.stroke();}
  c.restore();return;
 }
 const p=Math.min(1,-h.warning/(h.active||.3)),fade=Math.max(0,Math.min(1,h.life/.28));c.globalAlpha=fade;
 if(h.kind==='root'||h.kind==='thorn'){
  const height=(h.kind==='thorn'?55:76)*Math.min(1,(-h.warning+.025)/.08);c.strokeStyle='#253c24';c.lineWidth=9;
  for(let i=0;i<3;i++){const x=h.x+(i-1)*h.radius*.65;c.beginPath();c.moveTo(x,h.y);c.bezierCurveTo(x-20,h.y-height*.4,x+20,h.y-height*.7,x+(i-1)*12,h.y-height);c.stroke();c.strokeStyle=i===1?'#adc875':'#748e48';c.lineWidth=5;c.stroke();c.strokeStyle='#253c24';c.lineWidth=9;c.fillStyle='#aecb73';c.beginPath();c.moveTo(x-5,h.y-height*.55);c.lineTo(x-17,h.y-height*.72);c.lineTo(x+2,h.y-height*.66);c.fill();}
  c.fillStyle='#527039';c.fillRect(h.x-h.radius,h.y-4,h.radius*2,6);
 }else if(h.kind==='fruit'){
  const r=h.radius*(.45+p*.8);c.fillStyle='#e4884535';c.beginPath();c.ellipse(h.x,h.y-17,r,r*.5,0,0,Math.PI*2);c.fill();c.strokeStyle='#ffd29a';c.lineWidth=4*(1-p)+1;c.beginPath();c.ellipse(h.x,h.y-20,r,r*.48,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillStyle=i%2?'#e9a86c':'#d96844';c.fillRect(h.x+Math.cos(a)*r-3,h.y-25+Math.sin(a)*r*.5-3,6,6);}
 }else{
  c.fillStyle='#a4784d';c.beginPath();c.moveTo(h.x-h.radius,h.y);for(let i=0;i<=8;i++){const x=h.x-h.radius+i*h.radius/4,high=(i%2?24:9)*(h.kind==='wave'?1:1-p*.7);c.lineTo(x,h.y-high);}c.lineTo(h.x+h.radius,h.y);c.closePath();c.fill();c.strokeStyle='#ffe0a1';c.lineWidth=3;c.beginPath();c.moveTo(h.x-h.radius,h.y-2);c.lineTo(h.x+h.radius,h.y-2);c.stroke();
  c.fillStyle='#dcb58190';for(let i=0;i<5;i++)c.fillRect(h.x-h.radius+i*h.radius*.4,h.y-10-(i%3)*11,3,3);
 }
 c.restore();}
const api={telegraph,status,hazard};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EnemyEffects=api;
})(typeof window!=='undefined'?window:globalThis);
