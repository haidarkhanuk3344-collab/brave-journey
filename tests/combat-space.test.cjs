const assert=require('node:assert/strict'),B=require('../combat-space.js'),M=require('../character-motion.js'),C=require('../combat-feel.js'),R=require('../rules.js');
assert.equal(M.SCALE,B.PLAYER_SCALE);
assert(B.PLAYER_HEIGHT>=82&&B.PLAYER_HEIGHT<=88);
for(const type of ['slime','wolf','goblin']){const b=B.body({type});assert(b.height/B.PLAYER_HEIGHT>=.9&&b.height/B.PLAYER_HEIGHT<=1.15);}
assert(B.body({type:'ancient_tree'}).height/B.PLAYER_HEIGHT>=2&&B.body({type:'ancient_tree'}).height/B.PLAYER_HEIGHT<=2.2);
assert(B.projectile('mage').speed>=160&&B.projectile('mage').speed<=220);
for(const cls of ['archer','mage'])for(const skill of [-1,0,1,2]){const p=B.projectile(cls,skill);assert(p.range>200&&p.range<=430);assert(p.life*p.speed<500);}
assert(B.projectile('archer').range>B.projectile('mage').range);
assert(!B.inShotView({x:300,viewLeft:0,viewRight:280},0,1280));
assert(!B.inShotView({x:300,viewLeft:0,viewRight:1280},350,1280));
const shelf={terrain:[{x:0,width:100,y:600},{x:100,width:100,y:500}],ground:600};
assert(B.blocked(shelf,{x:90,y:540},{x:110,y:540}));
assert(!B.blocked(shelf,{x:90,y:480},{x:110,y:480}));
assert(B.blocked(shelf,{x:95,y:540},{x:205,y:540}),'swept steps must catch a shelf crossed in a long update');
const e={type:'goblin',x:200,y:600};
assert(B.intersects({x:130,y:550},{x:270,y:550},e),'fast arrow crosses the visible body');
assert(!B.intersects({x:130,y:470},{x:270,y:470},e),'shots above the body miss');
assert(!B.intersects({x:130,y:610},{x:270,y:610},e));
assert(!B.visible({...e,x:1500},0,1280));
assert(B.visible(e,0,1280));
for(const cls of ['warrior','archer','mage']){const p=R.newCharacter('balance',cls,{hair:'short'}),s=R.stats(p),normal=R.enemyStats('slime','normal',1),hit=R.damage(s.atk,normal.def),swings=Math.ceil(normal.hp/hit);assert(swings>=4&&swings<=9);const damage=R.damage(normal.atk,s.def);assert(damage>10&&damage<s.hp*.25);}
for(const cls of ['archer','mage']){assert(C.profile(cls,100).cancelAt>=(cls==='archer'?.44:.60));}
console.log('PASS: proportional silhouettes, short ranges, viewport bounds, swept terrain/body collision, starting gear survival and attack-speed floor');
