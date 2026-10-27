/* Painted A/B magic. Tail geometry is independent of core size, reach and hitboxes. */
(function(root){'use strict';
const PATH='assets/effects/mage-v40/',TAIL_SCALE=.70,BASE_TAIL_LENGTH=46;
const bounds={
 'soft-core':[97,147,289,290],'soft-tail':[21,184,540,238],'soft-impact':[17,72,478,423],
 'frost-core':[79,66,316,303],'frost-tail':[39,116,521,201],'frost-impact':[12,13,492,414]
};
const textures=new Map();let pending=null,ready=false;
function load(){if(ready)return Promise.resolve();if(pending)return pending;
 pending=Promise.all(Object.keys(bounds).map(key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=async()=>{try{if(im.decode)await im.decode();if(!im.width||!im.height)throw Error('empty image');textures.set(key,im);resolve();}catch(e){reject(e);}};im.onerror=()=>reject(Error('法球特效载入失败：'+key));im.src=PATH+key+'.webp';}))).then(()=>{ready=true;}).catch(e=>{pending=null;throw e;});return pending;
}
function sprite(c,key,x,y,w,h,alpha=1){const im=textures.get(key);if(!im)return false;c.globalAlpha*=alpha;c.drawImage(im,...bounds[key],x,y,w,h);return true;}
function geometry(frost=false){return {coreDiameter:frost?22:20,baseTailLength:BASE_TAIL_LENGTH,tailScale:TAIL_SCALE,tailLength:BASE_TAIL_LENGTH*TAIL_SCALE};}
function projectile(c,s){if(!ready)return false;const frost=!!s.slowRatio,kind=frost?'frost':'soft',g=geometry(frost),age=s.age||0,charge=Math.max(0,Math.min(1,s.charge??1)),size=g.coreDiameter*(.4+.6*charge),r=size/2,dir=Math.sign(s.vx),pulse=1+Math.sin(age*11)*.035;
 c.save();c.imageSmoothingEnabled=true;c.translate(s.x,s.y);if(dir)c.scale(dir,1);
 if(dir){const len=g.tailLength;c.save();c.translate(0,Math.sin(age*9)*.8);sprite(c,kind+'-tail',-r-len,-size*.32,len+size*.4,size*.64,.86);c.restore();}
 c.save();c.rotate(Math.sin(age*7)*(frost?.025:.065));sprite(c,kind+'-core',-r*pulse,-r*pulse,size*pulse,size*pulse);c.restore();
 // Tiny orbiting motes share the same painted texture; no procedural replacement orb.
 if(!dir&&charge>.25)for(let i=0;i<2;i++){const a=age*3+i*Math.PI,d=(1-charge)*18+8;c.save();sprite(c,kind+'-core',Math.cos(a)*d-1.3,Math.sin(a)*d-1.3,2.6,2.6,.45*charge);c.restore();}
 c.restore();return true;
}
function impact(c,fx){if(!ready)return false;const p=Math.max(0,Math.min(1,fx.time/fx.life));if(p>=1)return false;const frost=fx.kind==='orb-frost',kind=frost?'frost':'soft',radius=fx.radius||28,size=radius*2*(.35+.65*(1-Math.pow(1-p,3))),alpha=p<.12?Math.min(1,.6+p/.3):Math.pow((1-p)/.88,1.4);
 c.save();c.imageSmoothingEnabled=true;c.translate(fx.x,fx.y);if(fx.dir<0)c.scale(-1,1);c.rotate((frost?.04:.12)*p);sprite(c,kind+'-impact',-size/2,-size/2,size,size,alpha);c.restore();return true;
}
const api={load,projectile,impact,geometry,inspect:()=>({ready,textures:textures.size,tailScale:TAIL_SCALE})};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MageOrbEffects=api;
})(typeof window!=='undefined'?window:globalThis);
