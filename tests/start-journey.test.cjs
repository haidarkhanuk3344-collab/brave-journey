const assert=require('node:assert/strict');
const journey=require('../start-journey.js');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
async function run(){
 const assets=deferred(),departure=deferred(),events=[];
 const pending=journey.sequence({prepare:()=>assets.promise,depart:()=>departure.promise,load:async()=>events.push('loaded'),reveal:async()=>events.push('revealed'),reset:()=>events.push('reset'),phase:s=>events.push(s)});
 await assert.rejects(journey.sequence({}),/正在启程/,'a rapid second launch cannot load or create another scene');
 assets.resolve();await new Promise(setImmediate);
 assert(!events.includes('loaded'),'fast assets must not skip the visible departure');
 departure.resolve();await pending;
 assert.deepEqual(events,['departing','loading','loaded','arriving','revealed','complete','reset']);
 assert.equal(journey.inspect().busy,false);
 const order=[],slowAssets=deferred();
 const second=journey.sequence({prepare:()=>slowAssets.promise,depart:async()=>order.push('departed'),load:async()=>order.push('loaded'),reveal:async()=>order.push('revealed'),reset:()=>order.push('reset')});
 await new Promise(setImmediate);assert.deepEqual(order,['departed'],'the scene must wait for slow assets');
 slowAssets.resolve();await second;assert.deepEqual(order,['departed','loaded','revealed','reset']);
 for(const failingStep of ['prepare','depart','load','reveal']){
  const steps={prepare:async()=>{},depart:async()=>{},load:async()=>{},reveal:async()=>{},reset:()=>steps.cleaned=true};
  steps[failingStep]=async()=>{throw Error(failingStep);};
  await assert.rejects(journey.sequence(steps),new RegExp(failingStep));
  assert.equal(steps.cleaned,true,'failed transitions must release overlays and controls');
  assert.equal(journey.inspect().busy,false,'failed transitions must allow retry');
 }
 console.log('PASS: departure/asset ordering, duplicate-launch guard, scene/reveal order, failure cleanup and retry');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
