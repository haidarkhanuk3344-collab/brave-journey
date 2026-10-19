const assert=require('node:assert/strict');
const R=require('../rules.js');
const p=R.newCharacter('测试','warrior',{hair:'short',color:'brown',skin:'peach'});
p.equipped={};
assert.equal(R.stats(p).hp,160);
p.level=10;assert.equal(R.stats(p).hp,304);
for(const key of ["hp","mp","atk","def","speed"])assert(Math.abs(R.stats(p)[key]-R.CLASSES.warrior[key]*1.9)<1e-9);
const gear=R.makeItem('tunic',0,1,()=>0);
assert.equal(gear.base.hp,15);assert.equal(gear.affixes.length,0);assert.equal(gear.passive,null);
gear.base.hp=20;gear.base.def=0;p.equipped.clothes=gear;
assert.equal(R.stats(p).hp,324);
gear.enhance=10;assert.equal(R.stats(p).hp,344);
p.level=11;assert.equal(R.stats(p).hp,360); // 等级增加16，装备不参与成长
for(let q=0;q<5;q++){
 const weapon=R.makeItem('sword_0',q,1,()=>.4);
 assert.equal(weapon.affixes.length,q===4?2:q>=2?1:0);
 assert(weapon.affixes.every(a=>['atk','speed'].includes(a.key)));
 if(q<3)assert.equal(weapon.passive,null);
 if(q===3)assert(['gold','xp'].includes(weapon.passive));
 if(q===4)assert(['boss','guard','power'].includes(weapon.passive));
}
const legendary=R.makeItem('sword_1',4,1,()=>.8);legendary.enhance=7;
const next=R.reforge(legendary,['0','passive'],()=>.1);
assert.deepEqual(next.base,legendary.base);assert.equal(next.enhance,7);assert.equal(next.q,4);
assert.deepEqual(next.affixes[0],legendary.affixes[0]);assert.equal(next.passive,legendary.passive);
assert.equal(next.affixes.length,2);
const unlocked=R.reforgeCost(legendary,[]),locked=R.reforgeCost(legendary,['0']);
assert(locked.gold>unlocked.gold);assert(unlocked.materials>locked.materials);
assert.equal(R.reforgeCost(legendary,['0','1','passive']),null);
const one=R.makeItem('sword_0');let prev=0;
for(let i=0;i<10;i++){one.enhance=i;const cost=R.enhanceCost(one);assert(cost.materials>=prev);prev=cost.materials;assert.equal(cost.tier,i<3?'basic':i<6?'mid':'high');}
one.enhance=10;assert.equal(R.enhanceCost(one),null);
assert(R.damage(1,1000)>0);assert(R.damage(10,200)<R.damage(10,10));
assert(!R.canEquip(p,R.makeItem('bow_0')));assert(R.canEquip(p,R.makeItem('robe')));
p.unlocked=1;R.unlock(p,1);assert.equal(p.unlocked,2);R.unlock(p,1);assert.equal(p.unlocked,2);R.unlock(p,3);assert.equal(p.unlocked,4);R.unlock(p,4);assert(p.regionComplete);
const another=R.newCharacter('另一角色','mage',{});assert.equal(another.unlocked,1);assert.equal(another.level,1);assert.equal(another.pendingReforge,null);
console.log('PASS: growth, quality, class equipment, guaranteed +10, reforge locks and costs, permanent progression, character isolation');
