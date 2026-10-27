/* 48px collision cells; authored woodland terrain replaces source ground.
 * Map dimensions, branch progression and encounter rosters remain compatible. */
(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./source-world-data.js'):root.SourceWorldData;
const Woodland=typeof module!=='undefined'&&module.exports?require('./woodland-world.js'):root.WoodlandWorld;
const Routes=typeof module!=='undefined'&&module.exports?require('./woodland-routes.js'):root.WoodlandRoutes;
const SCALE=1.2,CELL=48;
const names=['林缘遗径','藤根石径','苔桥溪谷','守望遗庭','风蚀石阶','断桥高地','幽叶林境','古树围庭','苔冠外庭','遗迹长廊','林间隐径','石窟试炼','林心圣所'];
const ranks=[1,2,3,4,5,6,7,8,9,10,3,4,11];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function info(id){const raw=D.levels[id-1];return {id,name:names[id-1],rank:ranks[id-1],next:raw.nextMap.map(Number).filter(n=>n>0),boss:raw.bossName,waves:raw.enemyArr.length};}
function migrate(p){if(!Array.isArray(p.openMaps)){const n=clamp(p.unlocked||1,1,4);p.openMaps=Array.from({length:n},(_,i)=>i+1);p.clearedMaps=Array.from({length:p.regionComplete?4:n-1},(_,i)=>i+1);if(p.regionComplete)p.openMaps.push(5);p.regionComplete=false;}p.openMaps=[...new Set([1,...p.openMaps.filter(n=>Number.isInteger(n)&&n>=1&&n<=13)])];p.clearedMaps=[...new Set((p.clearedMaps||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=13))];p.worldVersion=44;return p;}
function clear(p,id){migrate(p);const first=!p.clearedMaps.includes(id);if(first)p.clearedMaps.push(id);const next=info(id).next,added=next.filter(n=>!p.openMaps.includes(n));p.openMaps.push(...added);p.unlocked=Math.max(...p.openMaps);p.regionComplete=p.clearedMaps.includes(13);return {first,added};}
function allowed(p,id){migrate(p);return id===0||p.openMaps.includes(id);}
function build(id){const original=D.levels[id-1];if(!original)throw Error('Unknown map '+id);const route=Routes.build(id,original),raw=route.raw,meta=info(id);const scene={...meta,...route,sourceMap:true,raw,width:raw.bgCell[0].length*CELL,height:raw.bgCell.length*CELL,ground:(raw.bgCell.length-1)*CELL,terrain:[],platforms:[],enemies:[],props:[],accents:[],zones:[],exitX:(raw.doorPoint[0]+.5)*CELL,exitY:(raw.doorPoint[1]+1)*CELL,layers:{}};
 for(const [kind,key] of [['near','bgnPic'],['far','bgfPic'],['front','bguPic']])if(raw[key])scene.layers[kind]=D.layers[raw[key]];
 for(let row=0;row<raw.bgCell.length;row++)for(let col=0;col<raw.bgCell[row].length;col++){const type=raw.bgCell[row][col];if(type===1||type===4)scene.platforms.push({x:col*CELL,y:(row+1)*CELL,width:CELL,height:2,kind:'platform'});}
 scene.startX=3*CELL;scene.startY=floorAt(scene,scene.startX,9*CELL);return scene;
}
function cell(scene,x,y){return scene.raw.bgCell[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]||0;}
function surface(type,row,x){const dx=((x%CELL)+CELL)%CELL;if(type===2)return row*CELL;if(type===1||type===4)return (row+1)*CELL;if(type>=9&&type<=16){const k=(type-9)%4;return row*CELL+[CELL/2+dx/2,CELL-dx/2,dx/2,CELL/2-dx/2][k];}return null;}
function floors(scene,x){const c=clamp(Math.floor(x/CELL),1,scene.raw.bgCell[0].length-2),out=[];for(let r=1;r<scene.raw.bgCell.length;r++){const type=scene.raw.bgCell[r][c],y=surface(type,r,x);if(y!==null&&(type!==2||![2,13,14,15,16].includes(scene.raw.bgCell[r-1][c])))out.push({x:c*CELL,width:CELL,y,type});}return out;}
function floorAt(scene,x,from=0){const list=floors(scene,x).filter(v=>v.y>=from-2);return list.length?list[0].y:scene.height-CELL;}
function safeSurface(scene,x,near){const list=floors(scene,x);if(!list.length)return {x,y:scene.height-CELL};return {x,y:list.reduce((a,b)=>Math.abs(a.y-near)<Math.abs(b.y-near)?a:b).y};}
function solidAt(scene,x,y){const type=cell(scene,x,y);if(type===2)return true;if(type>=13&&type<=16)return y>=surface(type,Math.floor(y/CELL),x);return false;}
function move(scene,actor,oldX,oldY,dt,opts={}){
 const h=opts.height||80,half=opts.half||12,dir=Math.sign(actor.x-oldX),was=opts.grounded;
 // Small slope changes follow the exact half-cell gradient; walls require a jump.
 if(was&&actor.vy>=0){const nearest=safeSurface(scene,actor.x,oldY);if(Math.abs(nearest.y-oldY)<=CELL*.55){actor.y=nearest.y;actor.vy=0;actor.grounded=true;}}
 if(dir){const side=actor.x+dir*half;for(let y=oldY-h+8;y<oldY-8;y+=12)if(solidAt(scene,side,y)){actor.x=oldX;actor.vx=0;break;}}
 if(actor.vy<0){for(const x of [actor.x-half+2,actor.x+half-2])if(solidAt(scene,x,actor.y-h)){actor.y=(Math.floor((actor.y-h)/CELL)+1)*CELL+h+.1;actor.vy=0;break;}}
 if(actor.vy>=0){const list=floors(scene,actor.x);for(const floor of list){if(opts.drop&&[1,4,9,10,11,12].includes(floor.type))continue;if(oldY<=floor.y+2&&actor.y>=floor.y){actor.y=floor.y;actor.vy=0;actor.grounded=true;break;}}}
 actor.x=clamp(actor.x,CELL+half,scene.width-CELL-half);
 if(actor.y>scene.height+80){const safe=safeSurface(scene,actor.x,scene.ground);actor.y=safe.y;actor.vy=0;actor.grounded=true;}
}
function ladderSpan(scene,x,y){
 const grid=scene.raw.bgCell,col=Math.floor(x/CELL);
 let row=[Math.floor((y-5)/CELL),Math.floor((y-40)/CELL)].find(r=>[3,4].includes(grid[r]?.[col]));
 if(row===undefined)return null;
 const {top,bottom}=Routes.ladderGeometry(grid,col,row);
 return y>=top-1&&y<=bottom+40&&bottom>top?{top,bottom}:null;
}
function ladder(scene,x,y){return !!ladderSpan(scene,x,y);}
function climb(scene,actor,direction,dt){
 const span=ladderSpan(scene,actor.x,actor.y);if(!span)return false;
 actor.y=clamp(actor.y+direction*175*dt,span.top,span.bottom);actor.vy=0;
 actor.grounded=direction<0&&actor.y===span.top||direction>0&&actor.y===span.bottom;
 return true;
}
function spawn(scene,type,x,category='normal',near=scene.ground){const pos=safeSurface(scene,clamp(x,2*CELL,scene.width-2*CELL),near);return {...pos,type,category,patrolMin:CELL+24,patrolMax:scene.width-CELL-24,detect:560,vy:0,grounded:true,sourceEnemy:true};}
function plan(scene){return scene.raw.enemyArr.map((row,index)=>{const trigger=(row[0]*40+10)*SCALE+500;const end=Math.min(scene.width-CELL-24,(row[2]||row[0]+24)*CELL);return {trigger:Math.min(trigger,end-180),boundary:end,left:Math.max(CELL,(row[1]||row[0])*CELL),members:row[3].map((type,i)=>({type,x:Math.min(end-90,trigger+240+i%3*72),category:type[0]==='b'?(type===scene.raw.bossName?'boss':'elite'):type===scene.raw.bossName?'elite':'normal'}))};});}
function paths(scene){return Woodland.pathsFor(scene);}
function draw(ctx,scene,camera,cameraY,image,front=false){Woodland.draw(ctx,scene,camera,cameraY,image,front);}

const api={D,SCALE,CELL,names,ranks,info,migrate,clear,allowed,build,cell,floors,floorAt,safeSurface,solidAt,move,ladder,ladderSpan,climb,spawn,plan,paths,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SourceWorld=api;
})(globalThis);
