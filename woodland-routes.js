/* Authored landscape routes. A safe lower road plus optional upper exploration. */
(function(root){
'use strict';
const CELL=48,VERSION=44;
// Hills: start cell, plateau length, rise in cells. Each rise has a two-cell ramp.
const designs=[
 {art:'canopy',hills:[[25,7,1],[47,8,2]],ledges:[34,64],spur:10},
 {art:'canopy',hills:[[23,10,2],[51,9,1],[73,6,2]],ledges:[37,62,83],spur:11},
 {art:'ravine',hills:[[24,8,2],[49,7,1]],ledges:[37,59,67],spur:9},
 {art:'valley',hills:[[26,7,1],[45,11,2],[72,8,1]],ledges:[35,59,81],spur:12},
 {art:'ravine',hills:[[25,8,2],[50,7,1],[75,10,2]],ledges:[37,63,91],spur:10},
 {art:'ravine',hills:[[26,10,1],[51,10,2],[82,9,1],[106,7,2]],ledges:[41,67,96,115],spur:12},
 {art:'sanctuary',hills:[[23,11,1],[48,8,2],[74,9,1]],ledges:[37,62,87],spur:9},
 {art:'sanctuary',hills:[[28,7,2],[51,12,1],[80,10,2],[106,6,1]],ledges:[40,67,94,115],spur:13},
 {art:'valley',hills:[[24,13,1],[52,9,2],[80,9,1],[105,7,2]],ledges:[40,65,94,115],spur:10},
 {art:'sanctuary',hills:[[26,9,2],[51,12,1],[82,11,2]],ledges:[39,67,98,113],spur:12},
 {art:'canopy',hills:[[25,6,1]],ledges:[34,39],spur:9},
 {art:'ravine',hills:[[25,5,2]],ledges:[35,40],spur:9},
 {art:'sanctuary',hills:[[25,6,1],[44,5,2]],ledges:[34,54],spur:10}
];
function refresh(scene){scene.platforms=[];scene.raw.bgCell.forEach((row,r)=>row.forEach((v,c)=>{if(v===1||v===4)scene.platforms.push({x:c*CELL,y:(r+1)*CELL,width:CELL,height:2,kind:'platform'});}));}
function build(id,original){
 const d=designs[id-1],raw=structuredClone(original),rows=original.bgCell.length,cols=original.bgCell[0].length,base=(rows-4)*CELL;
 const heights=Array(cols+1).fill(base),grid=Array.from({length:rows},()=>Array(cols).fill(0));
 for(const [start,len,rise] of d.hills){const ramp=rise*2;if(start+len+ramp*2>=cols-4)continue;for(let c=start;c<=start+2*ramp+len;c++){const lift=c<start+ramp?(c-start)*24:c<=start+ramp+len?rise*CELL:(start+2*ramp+len-c)*24;heights[c]=Math.min(heights[c],base-lift);}}
 for(let c=1;c<cols-1;c++){
  const y0=heights[c],y1=heights[c+1],low=Math.max(y0,y1),high=Math.min(y0,y1);
  for(let r=Math.ceil(low/CELL);r<rows;r++)grid[r][c]=2;
  if(y0===y1)grid[y0/CELL-1][c]=1;
  else{const r=Math.floor(high/CELL);grid[r][c]=y1>y0?(y0%CELL===0?15:13):(y1%CELL===0?16:14);}
 }
 grid[0].fill(2);for(const row of grid){row[0]=2;row[cols-1]=2;}
 const groundAt=col=>Math.min(heights[Math.max(1,Math.min(cols-2,col))],heights[Math.max(2,Math.min(cols-1,col+1))]);
 const ledges=[];
 function shelf(col,y,len,ladder=true){
  if(col<2||col+len>=cols-2)return;
  const row=y/CELL-1;for(let x=col;x<col+len;x++)if(grid[row][x]===0)grid[row][x]=1;
  ledges.push({x:col*CELL,y,width:len*CELL});
  if(ladder){const x=col+1,end=Math.floor(groundAt(x)/CELL);for(let r=row;r<end;r++){if(grid[r][x]===1)grid[r][x]=4;else if(grid[r][x]===0)grid[r][x]=3;}}
 }
 // Each map has a clearly reachable switch/bridge/chest side route near its start.
 const start=d.spur,y=base-2*CELL;
 shelf(start,y,4);shelf(start+7,y,5,false);
 for(const [i,col] of d.ledges.entries()){const y=Math.floor((groundAt(col+2)-CELL*2)/CELL)*CELL;shelf(col,y,i%2?5:4);}
 raw.bgCell=grid;raw.doorPoint=[original.doorPoint[0],Math.floor(groundAt(original.doorPoint[0])/CELL)-1];
 const bridge={id:`${id}:bridge`,x:(start+4)*CELL,y,width:3*CELL,open:false};
 const objects=[{id:`${id}:lever`,kind:'lever',x:(start+2)*CELL,y,used:false,bridgeId:bridge.id,label:'放下藤桥'},
 {id:`${id}:chest`,kind:'chest',x:(start+10)*CELL,y,used:false,label:'打开遗迹宝箱'}];
 return {raw,routeVersion:VERSION,biome:d.art,objects,bridges:[bridge],routeLedges:ledges};
}
function openBridge(scene,bridge){if(bridge.open)return;bridge.open=true;const row=bridge.y/CELL-1;for(let c=bridge.x/CELL;c<(bridge.x+bridge.width)/CELL;c++)if(scene.raw.bgCell[row][c]===0)scene.raw.bgCell[row][c]=1;refresh(scene);}
function ladderGeometry(grid,col,row){
 let first=row,last=row;while([3,4].includes(grid[first-1]?.[col]))first--;while([3,4].includes(grid[last+1]?.[col]))last++;
 const top=(first+(grid[first][col]===4?1:0))*CELL,base=(last+1)*CELL,type=grid[last+1]?.[col];
 const bottomAt=dx=>type>=9&&type<=16?base+[24+dx/2,48-dx/2,dx/2,24-dx/2][(type-9)%4]:base;
 return {top,bottom:bottomAt(24),bottomLeft:bottomAt(11),bottomRight:bottomAt(37),first,last};
}
function restore(scene,player){const saved=player?.worldObjects||{};for(const o of scene.objects||[]){o.used=saved['v44:'+o.id]===true;if(o.used&&o.kind==='lever'){const b=scene.bridges.find(b=>b.id===o.bridgeId);if(b)openBridge(scene,b);}}}
function nearby(scene,hero){return (scene.objects||[]).filter(o=>!o.used&&Math.abs(o.x-hero.x)<70&&Math.abs(o.y-hero.y)<50).sort((a,b)=>Math.abs(a.x-hero.x)-Math.abs(b.x-hero.x))[0]||null;}
function interact(scene,hero,player){
 const o=nearby(scene,hero);if(!o)return null;
 if(!player.worldObjects||typeof player.worldObjects!=='object'||Array.isArray(player.worldObjects))player.worldObjects={};
 const key='v44:'+o.id;if(player.worldObjects[key]===true){o.used=true;return null;}
 if(o.kind==='lever'){const b=scene.bridges.find(b=>b.id===o.bridgeId);if(!b)return null;openBridge(scene,b);o.used=true;player.worldObjects[key]=true;return {kind:'bridge',text:'藤桥已放下',x:o.x,y:o.y};}
 const gold=35+(scene.rank||1)*5;
 o.used=true;player.worldObjects[key]=true;player.gold+=gold;
 return {kind:'chest',text:`金币 ＋${gold}`,gold,x:o.x,y:o.y};
}
const api={VERSION,designs,build,refresh,ladderGeometry,restore,nearby,interact};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WoodlandRoutes=api;
})(globalThis);
