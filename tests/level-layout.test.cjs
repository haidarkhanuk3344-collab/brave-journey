const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),L=require('../level-layout.js'),P=require('../player-controls.js');
for(let id=1;id<=4;id++){
 const scene=L.build(id);assert(scene.width>=3400&&scene.width<=3900);assert.equal(scene.terrain[0].x,0);
 assert.equal(scene.terrain[0].y,600);assert.equal(scene.terrain.at(-1).x+scene.terrain.at(-1).width,scene.width);
 assert.equal(scene.enemies.length,id===4?5:7+id);
 let end=0,previous=600;
 for(const floor of scene.terrain){assert.equal(floor.x,end);assert(Math.abs(floor.y-previous)<=112);end+=floor.width;previous=floor.y;}
 assert(scene.exitX>scene.guard[1]&&scene.exitX<scene.width);
 const spawns=scene.enemies.map(([type,x])=>L.spawn(scene,type,x));
 assert(Math.min(...spawns.map(x=>x.x))>=850);
 for(const enemy of spawns){
  assert.equal(enemy.y,L.groundAt(scene,enemy.x));assert(!L.canDetect(enemy,110,600));
  assert(enemy.patrolMin<=enemy.x&&enemy.patrolMax>=enemy.x);
  assert(!L.inLeash(enemy,110));assert(L.canDetect(enemy,enemy.x-40,enemy.y));
  const left=L.groundAt(scene,enemy.patrolMin),right=L.groundAt(scene,enemy.patrolMax);assert.equal(left,enemy.y);assert.equal(right,enemy.y);
 }
 for(const p of scene.platforms){assert(p.y<L.groundAt(scene,p.x+p.width/2));assert(L.groundAt(scene,p.x+p.width/2)-p.y<=225);assert(p.x+p.width<scene.width);}
 for(let i=1;i<scene.platforms.length;i++){
  const from=scene.platforms[i-1],to=scene.platforms[i],rise=from.y-to.y;
  let y=from.y,vy=-P.JUMP_SPEED,landed=false,usedSecond=false,x=from.x+from.width-12;
  for(let time=0;time<1.2;time+=1/120){
   if(time>=.2&&!usedSecond){vy=-P.SECOND_JUMP_SPEED;usedSecond=true;}
   const oldY=y;({y,vy}=P.verticalStep(y,vy,1/120));x=Math.min(to.x+to.width/2,x+280/120);
   if(vy>=0&&oldY<=to.y&&y>=to.y&&x>=to.x-10&&x<=to.x+to.width+10){landed=true;break;}
  }
  assert(landed,'upper route reachable with timely double jump and run: '+id+'/'+i);
 }
 for(let x=0;x<scene.width;x+=200)assert(spawns.filter(e=>Math.abs(e.x-x)<150).length<=2);
 assert(L.zoneAt(scene,110));assert(L.zoneAt(scene,scene.guard[1]));
 const clone=L.build(id);scene.terrain[0].y=123;assert.equal(clone.terrain[0].y,600);
}
for(const asset of L.assetPaths)assert(fs.existsSync(path.join(__dirname,'../assets',asset)),asset);
console.log('PASS: four connected stepped maps, quiet entries, separated encounters, bounded support/leash, feasible upper routes, retained enemy counts and dynamic exits');
