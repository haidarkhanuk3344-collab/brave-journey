const assert=require('node:assert/strict'),R=require('../rules.js'),S=require('../save-system.js');
for(const cls of Object.keys(R.CLASSES))for(const gender of ['male','female'])for(const hair of ['short','spiky','bob','pony']){
 const a={gender,hair,color:'gold',skin:'tan'},normalized=R.normalizeAppearance(a),c=R.newCharacter('外观测试',cls,a);
 assert.deepEqual(c.appearance,normalized);assert.equal(a.hair,hair,'normalization must not modify callers');
 assert(R.HAIRSTYLES[gender].some(x=>x.id===normalized.hair));assert.equal(c.appearance.gender,gender);
 assert(S.valid(c));assert.deepEqual(S.parse(JSON.stringify({version:1,characters:[c]})).characters[0].appearance,normalized);
}
for(const hair of ['short','bob','pony']){const legacy=R.newCharacter('旧角色','warrior',{});legacy.appearance={hair,color:'brown',skin:'peach'};const raw=JSON.stringify({version:1,characters:[legacy]});const c=S.parse(raw).characters[0];assert.equal(R.normalizeAppearance(c.appearance).gender,hair==='short'?'male':'female');assert.equal(JSON.stringify({version:1,characters:[c]}),raw,'legacy reading must not add fields or change real saves');}
console.log('PASS: gender hair restrictions, non-mutating legacy inference and appearance save round-trip for all classes.');
