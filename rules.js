(function(root){
'use strict';
const CLASSES={
 warrior:{name:'战士',hp:160,mp:55,atk:20,def:9,speed:.95,color:'#d79758',clothes:'armor',hair:'short',hairColor:'brown'},
 archer:{name:'射手',hp:95,mp:80,atk:13,def:5,speed:1.75,color:'#96c987',clothes:'tunic',hair:'pony',hairColor:'brown'},
 mage:{name:'法师',hp:125,mp:120,atk:17,def:7,speed:1.2,color:'#b7a4e7',clothes:'robe',hair:'bob',hairColor:'violet'}
};
const QUALITIES=[{name:'普通',color:'#c4ccce'},{name:'优秀',color:'#8dca7f'},{name:'精良',color:'#7ebbf4'},{name:'史诗',color:'#c49cef'},{name:'传说',color:'#f4c668'}];
const TEMPLATES=[
 {id:'sword_0',name:'训练短剑',slot:'weapon',cls:'warrior',base:{atk:[6,9]},icon:'sword_0'},
 {id:'sword_1',name:'金柄钢剑',slot:'weapon',cls:'warrior',base:{atk:[8,11]},icon:'sword_1'},
 {id:'bow_0',name:'林木短弓',slot:'weapon',cls:'archer',base:{atk:[6,9]},icon:'bow_0'},
 {id:'bow_1',name:'金饰长弓',slot:'weapon',cls:'archer',base:{atk:[8,11]},icon:'bow_1'},
 {id:'staff_0',name:'紫晶木杖',slot:'weapon',cls:'mage',base:{atk:[6,9]},icon:'staff_0'},
 {id:'staff_1',name:'蓝晶法杖',slot:'weapon',cls:'mage',base:{atk:[8,11]},icon:'staff_1'},
 {id:'tunic',name:'林地服',slot:'clothes',base:{hp:[15,20],def:[2,4]},icon:'tunic'},
 {id:'armor',name:'灰钢护甲',slot:'clothes',base:{hp:[18,24],def:[3,5]},icon:'armor'},
 {id:'robe',name:'紫纹长袍',slot:'clothes',base:{hp:[15,20],mp:[10,15]},icon:'robe'},
 {id:'helmet_steel',name:'灰钢头盔',slot:'helmet',base:{hp:[10,14],def:[2,4]},icon:'helmet_steel'},
 {id:'helmet_leather',name:'棕皮帽',slot:'helmet',base:{hp:[10,14],def:[1,3]},icon:'helmet_leather'}
];
const PASSIVES={gold:{name:'拾金',text:'金币收益提高10%'},xp:{name:'好学',text:'经验收益提高8%'},boss:{name:'破敌',text:'对精英与Boss伤害提高18%'},guard:{name:'坚守',text:'生命低于35%时防御提高40%'},power:{name:'蓄势',text:'生命高于80%时攻击提高15%'}};
const SKILLS={
 warrior:[{name:'裂地重斩',desc:'重斩震裂前方地面，强力击退与硬直',mp:12,cd:3,mult:2.4,range:166},{name:'破阵连斩',desc:'三段交叉斩击，向前压进，末段重击',mp:21,cd:6,mult:3.4,range:178},{name:'旋风裂空',desc:'四段环身斩击，最后一击震开周围敌人',mp:32,cd:10,mult:4.8,range:202}],
 archer:[{name:'疾风三连',desc:'三次独立出箭，疾风轨迹压制前方',mp:13,cd:3.5,mult:2.55},{name:'贯穿蓄力箭',desc:'蓄力发射强力光箭，贯穿前方敌人',mp:22,cd:6.5,mult:3.4},{name:'猎鹰箭雨',desc:'标记前方区域，六轮箭雨覆盖敌群',mp:34,cd:10,mult:4.8}],
 mage:[{name:'炎爆法球',desc:'火球水平推进，命中后爆炸波及周围',mp:17,cd:4,mult:2.6},{name:'冰霜涌流',desc:'三段冰晶涌起，减速60%，持续3秒',mp:28,cd:7.5,mult:3.6,range:270},{name:'星陨冰牢',desc:'三轮星陨冰晶，末轮冻结；精英与Boss控制缩短',mp:40,cd:12,mult:5.2,range:300}]
};
const randint=(lo,hi,rng=Math.random)=>Math.floor(lo+rng()*(hi-lo+1));
const choose=(a,rng=Math.random)=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
function effects(item,rng=Math.random){
 const n=item.q===4?2:item.q>=2?1:0, strength=[0,0,1,1.6,2.3][item.q];
 const keys=item.slot==='weapon'?['atk','speed']:Object.keys(item.base);
 const available=[...keys]; const affixes=[];
 for(let i=0;i<n;i++){
  const key=choose(available.length?available:keys,rng),at=available.indexOf(key);if(at>=0)available.splice(at,1);
  const range=key==='atk'?[4,7]:key==='hp'?[12,22]:key==='mp'?[10,20]:key==='def'?[2,4]:[3,6];
  let value=Math.round(randint(...range,rng)*strength);if(key==='speed')value/=100;
  affixes.push({key,value});
 }
 return {affixes,passive:item.q===3?choose(['gold','xp'],rng):item.q===4?choose(['boss','guard','power'],rng):null};
}
function makeItem(id,q=0,stage=1,rng=Math.random){
 const t=TEMPLATES.find(x=>x.id===id);if(!t)throw Error('Unknown equipment '+id);
 const multiplier=[1,1.5,2.15,3.1,4.5][q]*(1+(stage-1)*.15),base={};
 for(const [key,[lo,hi]] of Object.entries(t.base))base[key]=Math.round(randint(lo,hi,rng)*multiplier);
 const item={uid:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),id:t.id,name:t.name,slot:t.slot,cls:t.cls||null,icon:t.icon,q,base,enhance:0,stage};
 return Object.assign(item,effects(item,rng));
}
function stats(p){
 const c=CLASSES[p.cls],growth=1+.1*(p.level-1),s={hp:c.hp*growth,mp:c.mp*growth,atk:c.atk*growth,def:c.def*growth,speed:c.speed*growth,gold:1,xp:1,boss:1};
 for(const item of Object.values(p.equipped))if(item){
  for(const [k,v]of Object.entries(item.base))s[k]=(s[k]||0)+v*(1+.1*item.enhance);
  for(const a of item.affixes||[])if(a.key==='speed')s.speed*=1+a.value;else s[a.key]=(s[a.key]||0)+a.value;
  if(item.passive==='gold')s.gold+=.1;if(item.passive==='xp')s.xp+=.08;if(item.passive==='boss')s.boss+=.18;
 }
 return s;
}
function combatStats(p,hp){const s=stats(p);for(const item of Object.values(p.equipped))if(item){if(item.passive==='guard'&&hp<s.hp*.35)s.def*=1.4;if(item.passive==='power'&&hp>s.hp*.8)s.atk*=1.15;}return s;}
function damage(attack,defense){return Math.max(.5,attack*100/(100+Math.max(0,defense)));}
function xpRequired(level){const n=Math.max(0,level-1);return 260+90*n+20*n*n;}
function addXP(p,amount){const before=stats(p);p.xp+=Math.round(amount*before.xp);let levels=0;while(p.xp>=xpRequired(p.level)){p.xp-=xpRequired(p.level);p.level++;p.points++;levels++;}const after=stats(p);return {levels,hpGain:after.hp-before.hp,mpGain:after.mp-before.mp};}
function enemyStats(type,category,map){
 if(category==='boss')return {hp:2100,atk:52,def:22,moveSpeed:82};
 if(category==='elite')return {hp:[0,600,820,1060][map]||1060,atk:30+map*7,def:6+map*3,moveSpeed:type==='boar'?94:76};
 const base={slime:{hp:110,atk:18,moveSpeed:76},wolf:{hp:135,atk:23,moveSpeed:145},goblin:{hp:115,atk:20,moveSpeed:82}}[type]||{hp:110,atk:18,moveSpeed:76};
 return {...base,hp:base.hp+map*16,atk:base.atk+map*5,def:map*3};
}
function enemyReward(category,map,rng=Math.random){return category==='normal'?{xp:10+map*2,gold:randint(4,8,rng),dropChance:.18,weights:[88,12,0,0,0]}:category==='elite'?{xp:42+map*6,gold:70+map*10,dropChance:.8,weights:[42,39,17,2,0]}:{xp:140,gold:240,dropChance:1,weights:[5,32,43,19,1]};}
function enhanceCost(item){const n=item.enhance+1;if(n>10)return null;return {tier:n<=3?'basic':n<=6?'mid':'high',materials:Math.ceil((1.55**(n-1))*(1+item.q*.35)),gold:Math.round(18*n*(1+item.q*.45))};}
function reforgeCost(item,locks=[]){const total=item.affixes.length+(item.passive?1:0),unlocked=total-locks.length;if(!total||unlocked<=0)return null;return {tier:item.q>=4?'high':item.q>=3?'mid':'basic',materials:2+unlocked*2,gold:35*(item.q+1)+unlocked*25+locks.length*70};}
function reforge(item,locks=[],rng=Math.random){const next=structuredClone(item),roll=effects(item,rng);next.affixes=roll.affixes;next.passive=roll.passive;for(const lock of locks){if(lock==='passive')next.passive=item.passive;else next.affixes[Number(lock)]=structuredClone(item.affixes[Number(lock)]);}return next;}
function canEquip(p,item){return item.slot!=='weapon'||item.cls===p.cls;}
function unlock(p,map){if(map>=1&&map<=3)p.unlocked=Math.max(p.unlocked,map+1);if(map===4)p.regionComplete=true;}
function weighted(weights,rng=Math.random){let n=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1;}
const HAIRSTYLES={male:[{id:'short',name:'短发'},{id:'spiky',name:'刺发'}],female:[{id:'short',name:'短发'},{id:'bob',name:'长发'},{id:'pony',name:'马尾'}]};
// Old saves have no gender. Infer it without modifying their serialized data.
function normalizeAppearance(value={}){
 const a=value||{},gender=['male','female'].includes(a.gender)?a.gender:['pony','bob'].includes(a.hair)?'female':'male';
 return {gender,hair:HAIRSTYLES[gender].some(h=>h.id===a.hair)?a.hair:gender==='female'?'bob':'short',color:['brown','gold','violet'].includes(a.color)?a.color:'brown',skin:['peach','tan','deep'].includes(a.skin)?a.skin:'peach'};
}
function newCharacter(name,cls,appearance){
 appearance=normalizeAppearance(appearance);
 const p={id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:name.trim().slice(0,12)||'冒险者',cls,appearance,level:1,xp:0,gold:180,materials:{basic:0,mid:0,high:0},potions:{hp:3,mp:3},points:1,skills:[0,0,0],unlocked:1,regionComplete:false,equipped:{weapon:makeItem(CLASSES[cls].name==='战士'?'sword_0':cls==='archer'?'bow_0':'staff_0'),clothes:makeItem(CLASSES[cls].clothes),helmet:null},bag:[],storage:[],bounties:{active:false,kills:0,elites:0},kills:0,pendingReforge:null};return p;
}
const api={CLASSES,QUALITIES,TEMPLATES,PASSIVES,SKILLS,randint,choose,makeItem,stats,combatStats,damage,xpRequired,addXP,enemyStats,enemyReward,enhanceCost,reforgeCost,reforge,canEquip,unlock,weighted,newCharacter,normalizeAppearance,HAIRSTYLES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameRules=api;
})(typeof window!=='undefined'?window:globalThis);
