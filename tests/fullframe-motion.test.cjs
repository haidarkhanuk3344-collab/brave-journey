const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const manifest=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../assets/characters/cartoon-v15/manifest.json')));
const C=require('../combat-feel.js'),V=require('../equipment-visuals.js');
const context={CombatFeel:C,EquipmentVisuals:V,fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'..',p)))}),Image:class{width=30;height=110;set src(value){queueMicrotask(()=>this.onload());}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../fullframe-motion.js'),'utf8'),context);
const F=context.FullFrameMotion;
const role={cls:'warrior',appearance:{hair:'short'},equipped:{clothes:{id:'armor'},weapon:{id:'sword_0'}}};
(async()=>{
 await F.load();
 for(const speed of [.6,.95,1.4])for(const skill of [-1,0,1,2])for(let combo=0;combo<3;combo++){
  const a={...C.profile('warrior',speed,combo,skill),id:100+combo,time:0};
  const state={action:'attack',grounded:true,attack:a};F.advance(state,.008);
  for(const time of [0,a.hitAt-1e-6,a.hitAt,a.hitAt+.001,a.duration,a.duration+1]){
   a.time=time;const result=F.inspect(role,state);
   assert.equal(result.renderer,'cartoon-v15');
   const record=manifest.animations[result.action];
   if(time===a.hitAt)assert.equal(result.frame,record.contactFrame);
   if(time>=a.duration)assert.equal(result.frame,record.frames-1);
   assert(result.frame>=0&&result.frame<record.frames);
  }
 }
 for(const speed of [.6,.95,1.4]){
  const a={...C.profile('warrior',speed,2),id:900,time:0},state={action:'attack',grounded:true,attack:a};F.advance(state,.008);
  for(const event of a.strikes){a.time=event.at;const result=F.inspect(role,state);assert.equal(result.action,'attack'+event.combo);assert.equal(result.frame,3);}
 }
 const air={action:'attack' ,grounded:false,attack:{...C.profile('warrior',.95),id:1,time:.01}};
 F.advance(air,.008);assert.equal(F.inspect(role,air).action,'attack0');
 air.grounded=true;air.attack.time=air.attack.hitAt;F.advance(air,.008);
 assert.equal(F.inspect(role,air).action,'attack0');assert.equal(F.inspect(role,air).frame,3);
 air.attack.time=air.attack.duration;assert.equal(F.inspect(role,air).action,'attack0');
 const jump={action:'jump',grounded:false,vy:-870};F.advance(jump,.008);assert.equal(F.inspect(role,jump).frame,0);
 F.advance(jump,.08);assert.equal(F.inspect(role,jump).frame,1);
 F.advance(jump,.15);assert.equal(F.inspect(role,jump).frame,2);
 for(const [vy,frame] of [[0,3],[220,4],[700,5]]){jump.vy=vy;assert.equal(F.inspect(role,jump).frame,frame);}
 for(const [land,frame] of [[.12,6],[.04,7]])assert.equal(F.inspect(role,{action:'walk',grounded:true,land}).frame,frame);
 assert.equal(F.inspect(role,{action:'walk',grounded:true,land:.08,vx:190}).action,'walk');
 const risingAttack={action:'attack',grounded:true,attack:{...C.profile('warrior',.95),id:45,time:.02}};
 F.advance(risingAttack,.008);assert.equal(F.inspect(role,risingAttack).action,'attack0');
 risingAttack.grounded=false;F.advance(risingAttack,.008);assert.equal(F.inspect(role,risingAttack).action,'attack0');
 const movement={action:'idle',grounded:true,clock:0,travel:0};F.advance(movement,.008);
 movement.action='run';movement.travel=0;F.advance(movement,.008);
 assert(Math.abs(movement.fullOffsetX)<=6);
 for(let i=0;i<30;i++)F.advance(movement,.008);assert(Math.abs(movement.fullOffsetX)<.03);
 movement.action='walk';movement.fullPhase=0;movement.travel=manifest.animations.walk.stride;F.advance(movement,.008);
 assert(Math.abs(movement.fullPhase)<1e-8,'walk completes one cycle per authored travel distance');
 assert(manifest.animations.run.durations[3]<100,'flight frames do not linger');
 jump.vy=-640;jump.jumpSerial=2;F.advance(jump,.008);assert.equal(F.inspect(role,jump).frame,0,'second jump restarts its launch pose');
 assert.equal(F.inspect({...role,cls:'mage'},jump).renderer,'cartoon-v15');
 assert.equal(F.inspect({...role,equipped:{weapon:{id:'sword_1'}}},jump).renderer,'cartoon-v15');
 for(const cls of ['warrior','archer','mage'])for(const hair of ['short','pony','bob'])for(const clothes of ['armor','tunic','robe'])for(const weapon of [0,1])for(const helmet of [null,'helmet_steel','helmet_leather']){const candidate={cls,appearance:{hair},equipped:{clothes:{id:clothes},weapon:{id:{warrior:'sword_',archer:'bow_',mage:'staff_'}[cls]+weapon},helmet:helmet?{id:helmet}:null}};for(const state of [{action:'walk'},{action:'run'},{action:'jump',vy:-640},{action:'attack',attack:{...C.profile(cls,{warrior:.95,archer:1.75,mage:1.2}[cls]),time:.105}}])assert.equal(F.inspect(candidate,state).renderer,'cartoon-v15');}
 for(const record of Object.values(manifest.animations)){
  assert.equal(record.frames,record.metadata.length);assert.equal(record.frames%record.columns,0);
  for(const m of record.metadata)assert(m.bounds[0]>0&&m.bounds[2]<256&&m.bounds[1]>0&&m.bounds[3]<=256);
 }
 for(const cls of ['archer','mage']){const role={cls,equipped:{weapon:{id:cls==='mage'?'staff_1':'bow_1'}}},a=C.profile(cls,cls==='mage'?1.2:1.75),state={action:'attack',attack:{...a,time:a.hitAt}};const right=F.muzzle(role,state,1000,500,'right'),left=F.muzzle(role,state,1000,500,'left');assert(Number.isFinite(right.x)&&Number.isFinite(right.y));assert(Math.abs(right.x+left.x-2000)<1e-8);assert.equal(right.y,left.y);}
 console.log('PASS: all combo/skill hit frames at three speeds, clamped recovery, airborne landing transition, jump phases, landing, unified outfit support, atlas bounds');
})().catch(e=>{console.error(e);process.exitCode=1;});
