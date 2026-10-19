(function(root){
'use strict';
const FILES=['ground_mid','ground_left','ground_right','soil_fill','platform_left','platform_mid','platform_right','stone_floor','water'];
const PROPS=['oak','fir','shrub','fern','mushrooms','sign','boulder','root','bridge','stream','rune_stone','ruin_arch','gate_closed','gate_open','portal_open','portal_closed'];
const assetPaths=[...FILES.map(x=>'environments/forest_region/tiles/'+x+'.png'),...PROPS.map(x=>'environments/forest_region/props/'+x+'.png')];
const terrain=(rows)=>rows.map(([x,width,y])=>({x,width,y,kind:'solid'}));
const platforms=rows=>rows.map(([x,y,width])=>({x,y,width,height:24,kind:'platform'}));
const configs=[
 {width:3456,terrain:[[0,768,600],[768,512,552],[1280,704,616],[1984,384,552],[2368,448,600],[2816,640,576]],
  platforms:[[416,488,256],[704,440,192],[1024,416,256],[1312,456,192],[1536,488,256],[1856,432,256],[2176,408,192],[2432,456,256],[2720,432,192],[2944,448,256]],
  enemies:[['slime',880],['slime',1100],['wolf',1500],['goblin',1740],['slime',2130],['wolf',2480],['goblin',2700],['slime',2920]],guard:['boar',3170],
  zones:[[0,680,'林口'],[680,1280,'薄苔坡'],[1280,1984,'溪间空地'],[1984,2816,'高枝小径'],[2816,3456,'野猪林地']],
  props:[['oak',225,1.05],['sign',560,.85],['fir',1190,1],['boulder',1370,.8],['stream',1880,.85],['bridge',1840,.85],['oak',2290,1.1],['root',2560,.7],['fir',2820,.9]],
  accents:[['shrub',50,.8],['fern',340,.7],['mushrooms',720,.7],['fern',1240,.65],['shrub',1950,.8],['mushrooms',2390,.7],['fern',2780,.7]]},
 {width:3712,terrain:[[0,768,600],[768,576,576],[1344,576,632],[1920,448,552],[2368,576,600],[2944,768,576]],
  platforms:[[448,488,256],[736,456,192],[1088,440,256],[1440,520,384],[1800,448,256],[2080,400,192],[2304,416,256],[2688,472,256],[2976,440,192],[3280,456,192]],
  enemies:[['slime',880],['wolf',1120],['goblin',1480],['slime',1740],['wolf',2040],['goblin',2240],['slime',2510],['wolf',2800],['goblin',3100]],guard:['stone_chief',3390],
  zones:[[0,680,'溪谷入口'],[680,1344,'河岸'],[1344,1920,'浅溪木桥'],[1920,2944,'石岸回廊'],[2944,3712,'守桥者']],
  props:[['oak',220,1],['sign',570,.85],['fir',1230,.9],['stream',1460,1],['stream',1780,.95],['bridge',1600,1],['boulder',1980,.9],['oak',2380,1.05],['fir',2910,.95],['ruin_arch',3600,.8]],
  accents:[['fern',70,.75],['shrub',400,.7],['mushrooms',770,.65],['fern',1350,.65],['fern',1950,.7],['shrub',2560,.7],['root',3000,.75]]},
 {width:3840,terrain:[[0,768,600],[768,512,552],[1280,576,616],[1856,512,520],[2368,512,584],[2880,960,600]],
  platforms:[[448,488,256],[736,464,192],[1056,416,256],[1344,456,128],[1504,480,256],[1760,384,256],[2048,416,128],[2192,392,256],[2600,456,256],[2960,440,256],[3272,440,192]],
  enemies:[['slime',880],['wolf',1090],['goblin',1380],['slime',1710],['wolf',1960],['goblin',2260],['slime',2490],['wolf',2700],['goblin',3050],['slime',3290]],guard:['vine_guard',3510],
  zones:[[0,680,'古树入口'],[680,1280,'盘根坡'],[1280,1856,'林荫凹地'],[1856,2880,'树冠与旧道'],[2880,3840,'藤蔓遗迹']],
  props:[['oak',240,1.25],['sign',555,.9],['root',755,.9],['fir',1200,1.1],['oak',1540,1.2],['root',1820,.9],['oak',2330,1.15],['root',2830,.9],['ruin_arch',2940,.9],['rune_stone',3350,.8]],
  accents:[['fern',60,.8],['mushrooms',400,.7],['shrub',710,.7],['root',1310,.75],['fern',1850,.7],['shrub',2380,.75],['fern',2840,.8],['mushrooms',3220,.8]]},
 {width:3712,terrain:[[0,768,600],[768,512,576],[1280,512,616],[1792,448,552],[2240,1472,600]],
  platforms:[[416,488,256],[704,456,192],[1024,440,256],[1312,496,128],[1504,488,256],[1808,456,128],[1970,424,256],[2256,432,128],[2440,472,256]],
  enemies:[['wolf',880],['goblin',1120],['slime',1410],['wolf',1660],['goblin',2050]],guard:['ancient_tree',3120],
  zones:[[0,680,'遗迹入口'],[680,1280,'残墙'],[1280,1792,'下沉旧路'],[1792,2540,'石门前庭'],[2540,3712,'古树祭坛']],
  props:[['fir',220,1.1],['sign',550,.9],['rune_stone',770,.8],['ruin_arch',1230,1],['root',1780,.85],['ruin_arch',2190,1.1],['rune_stone',2630,.8],['oak',3580,1.2]],
  accents:[['fern',70,.7],['shrub',400,.7],['mushrooms',1290,.7],['root',2230,.8],['fern',3650,.7]]}
];
function build(id){const config=JSON.parse(JSON.stringify(configs[id-1]));return {...config,id,ground:600,terrain:terrain(config.terrain),platforms:platforms(config.platforms),exitX:config.width-135};}
function groundAt(scene,x){return scene.terrain?.find(s=>x>=s.x&&x<s.x+s.width)?.y??scene.ground;}
function surfaceAt(scene,x,y){return scene.platforms.find(s=>x>s.x&&x<s.x+s.width&&Math.abs(y-s.y)<2)||scene.terrain?.find(s=>x>=s.x&&x<s.x+s.width)||{x:0,width:scene.width,y:scene.ground};}
function spawn(scene,type,x,category='normal'){
 const y=groundAt(scene,x),floor=surfaceAt(scene,x,y),radius=category==='boss'?470:category==='elite'?230:155;
 return {type,x,y,category,patrolMin:Math.max(floor.x+35,x-radius),patrolMax:Math.min(floor.x+floor.width-35,x+radius),detect:category==='boss'?390:category==='elite'?310:type==='goblin'?285:type==='wolf'?270:220};
}
function canDetect(e,x,y){return Math.abs(e.x-x)<=e.detect&&Math.abs(e.y-y)<185&&x>=e.patrolMin-95&&x<=e.patrolMax+95;}
function inLeash(e,x){return x>=e.patrolMin-125&&x<=e.patrolMax+125;}
function zoneAt(scene,x){return scene.zones?.find(z=>x>=z[0]&&x<z[1])?.[2]||'';}
const api={build,groundAt,surfaceAt,spawn,canDetect,inLeash,zoneAt,assetPaths};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LevelLayout=api;
})(typeof window!=='undefined'?window:globalThis);
