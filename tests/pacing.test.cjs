const assert=require('node:assert/strict');
const R=require('../rules.js'),C=require('../combat-feel.js');
const report=[];
for(const cls of Object.keys(R.CLASSES)){
 const p=R.newCharacter('测试',cls,{});
 p.equipped.weapon=R.makeItem(cls==='warrior'?'sword_0':cls==='archer'?'bow_0':'staff_0',0,1,()=>.5);
 p.equipped.clothes=R.makeItem(R.CLASSES[cls].clothes,0,1,()=>.5);
 const stats=R.stats(p),enemy=R.enemyStats('slime','normal',1);
 const hits=Math.ceil(enemy.hp/R.damage(stats.atk,enemy.def));
 assert(hits>=4&&hits<=7);
 const a=C.profile(cls,stats.speed),max=C.profile(cls,stats.speed*100);
 assert(max.cancelAt>=a.cancelAt/1.5-1e-9);
 report.push({cls,hits,firstWindup:a.hitAt,chain:a.cancelAt,maxSpeedChain:max.cancelAt});
 for(let map=1;map<=4;map++)for(const type of ['slime','wolf','goblin']){
  const e=R.enemyStats(type,'normal',map);
  assert(R.damage(1,e.def)>0);
  if(map>1)assert(e.atk>R.enemyStats(type,'normal',map-1).atk);
 }
}
const p=R.newCharacter('进度','warrior',{}),firstClear=8*R.enemyReward('normal',1).xp+R.enemyReward('elite',1).xp;
assert(firstClear<R.xpRequired(1));
assert(firstClear*2>=R.xpRequired(1));
assert.equal(R.addXP(p,firstClear).levels,0);
const result=R.addXP(p,firstClear);
assert.equal(result.levels,1);assert.equal(result.hpGain,16);assert(Math.abs(result.mpGain-5.5)<1e-9);
assert.equal(p.level,2);assert.equal(p.xp,28);
const mass=R.addXP(p,5000);assert(mass.levels>1);assert(p.xp<R.xpRequired(p.level));
for(let level=2;level<20;level++)assert(R.xpRequired(level)>R.xpRequired(level-1));
for(const category of ['normal','elite','boss']){
 const reward=R.enemyReward(category,1,()=>0);
 assert(reward.dropChance>0&&reward.dropChance<=1);
 assert.equal(reward.weights.reduce((a,b)=>a+b,0),100);
 if(category==='normal')assert.deepEqual(reward.weights.slice(2),[0,0,0]);
 if(category==='boss')assert.equal(reward.dropChance,1);
}
const before=R.enemyStats('boar','elite',1);const stronger=R.enemyStats('vine_guard','elite',3);
assert(stronger.atk>before.atk&&stronger.hp>before.hp);
console.log('PASS: fixed enemy progression, three-class cadence limits, ordinary kill time, two-clear level, incremental level recovery, slow experience curve, constrained equipment rewards');
console.log(JSON.stringify({firstClearXP:firstClear,firstLevelXP:R.xpRequired(1),classes:report},null,2));
