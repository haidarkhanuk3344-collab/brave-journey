const assert=require('node:assert/strict'),O=require('../outfit-motion.js');
const meta={hip:[128,172]},track={waist:[130,179]};const idle={action:'idle',clock:0,grounded:true,vx:0,vy:0,dir:'right'};
function step(state,time){for(let i=0;i<time*120;i++){state.clock=(state.clock||0)+1/120;O.advance(state,1/120);}}
const run={...idle,action:'run',vx:280};O.advance(run,1/120);assert(Math.abs(run.outfitMotion.tail)<.3,'cloth must lag rather than instantly snap behind');step(run,.3);assert(run.outfitMotion.tail<-7,'run must trail cloth visibly');
const held=O.geometry(run,meta,'skirt',track);for(const p of held.points[0])assert.equal(p.y,179,'waist seam is pinned');assert(held.points.at(-1)[0].x<held.points[0][0].x-6,'free edge deforms separately from waist');
const plate=O.geometry(run,meta,'plate',track),leather=O.geometry(run,meta,'short',track);assert(Math.abs(plate.tail)<Math.abs(leather.tail)&&Math.abs(leather.tail)<Math.abs(held.tail),'metal, leather and fabric have different flexibility');
run.vx=0;run.action='idle';step(run,.8);assert(Math.abs(run.outfitMotion.tail)<.1,'cloth settles after stopping');
const jumping={...idle,action:'jump',grounded:false,vy:-640};step(jumping,.15);assert(O.geometry(jumping,meta,'skirt',track).lift<-2,'jump lifts and folds hem');
const attack={...idle,action:'attack',cls:'warrior',attack:{time:.14,duration:.56,combo:0}};step(attack,.12);assert(Math.abs(O.geometry(attack,meta,'skirt',track).tail)>3,'sword motion moves robe');
for(const shape of Object.keys(O.materials))for(const dt of [1/30,1/60,1/120]){const s={...idle,vx:400,grounded:false,vy:900};for(let i=0;i<240;i++)O.advance(s,dt);const g=O.geometry(s,meta,shape,track);for(const row of g.points)for(const p of row){assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(p.x>75&&p.x<175&&p.y<235,'cloth remains within hero silhouette bounds');}}
const restA=O.geometry({...idle,clock:0},meta,'skirt',track),restB=O.geometry({...idle,clock:.2},meta,'skirt',track);assert.notDeepEqual(restA.points.at(-1),restB.points.at(-1),'idle cloth has a subtle living fold');assert.deepEqual(restA.points[0],restB.points[0]);
console.log('PASS: waist pins, separate free-edge deformation, inertia/settling, distinct materials, jump/attack response and stable bounded cloth mesh.');
