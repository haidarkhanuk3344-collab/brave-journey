'use strict';
const R=GameRules, C=CombatFeel, S=GameSound, $=id=>document.getElementById(id), cv=$('game'), ctx=cv.getContext('2d',{alpha:false,desynchronized:true});
const SW=SourceWorld, SE=SourceEnemies, ME=MaterialEconomy;
const M=CharacterMotion, P=PlayerControls, L=LevelLayout, B=CombatSpace, E=EncounterWaves, K=SkillCombat, F=SkillEffects, N=EnemyCombat, EV=EnemyVisuals, NF=EnemyEffects, tapState=P.create();
const motion={phase:0,clock:0,pose:null,from:null,tag:null,elapsed:0,running:false};
const W=1280,H=720,SAVE_KEY='mountain-adventure-v1',icons=Object.fromEntries(ASSETS.icons.map(x=>[x.id,x.path]));
for(const [id,item] of Object.entries(EquipmentVisuals.items))if(item.path)icons[id]=item.path.replace(/^assets\//,'');
for(const d of ME.definitions)icons[d.icon]=d.path;
const itemIconUpdates={starter:'starter_clothes',sword_0:'starter_sword',sword_1:'steel_sword',bow_0:'starter_bow',bow_1:'steel_bow',staff_1:'steel_staff',tunic:'woodland_clothes',armor:'steel_clothes',helmet_steel:'steel_helmet',helmet_leather:'woodland_helmet'};
for(const [id,art]of Object.entries(itemIconUpdates))icons[id]='items/v38/'+art+'.webp';
const imageCache=new Map(),packCache=new Map(),enemyIndex=new Map(),charIndex=new Map(),fxIndex=new Map(ASSETS.effects.map(x=>[x.id,x]));
const sheetFrameCache=new Map();
const flashFrameCache=new Map();
const warmRoles=new WeakSet();
ASSETS.characters.forEach(a=>charIndex.set(`${a.character}.${a.action}.${a.direction}`,a));
ASSETS.enemies.forEach(a=>enemyIndex.set(`${a.enemy}.${a.action}.${a.direction}`,a));
let store={version:1,characters:[],lastId:null},p=null,scene=null,hero={x:400,y:570,vx:0,vy:0,dir:'right',grounded:true,attack:null,invuln:0,dash:0},enemies=[],shots=[],vfx=[],numbers=[],drops=[],camera=0,cameraY=0,t=0,last=0,modalType=null,selected=null,ready=false,preview=null,saveTimer=0,renderTimer=0,shopStock=[],keys=new Set(),pendingShots=[],sceneSerial=0;
const metrics={errors:[],images:0,attacks:0,skills:0,kills:0,jumps:0,interactions:0};
let inputBuffer=null,jumpBuffer=0,hitStop=0,shake=0,shakeTime=0,hurtScreen=0,particles=[],sweeps=[],attackSerial=0,simAccumulator=0;
let skillAreas=[],skillFx=[],enemyHazards=[];
const sourceMusic=new Audio();sourceMusic.loop=true;sourceMusic.volume=.22;let musicKey='';
function syncMusic(key=musicKey){if(key!==musicKey){musicKey=key;sourceMusic.src='assets/original/music/'+key+'.mp3';}if(S.inspect().enabled&&key&&!document.hidden)sourceMusic.play().catch(()=>{});else sourceMusic.pause();}
const combatLog=[];Object.assign(metrics,{hits:0,hitStops:0,buffered:0,practiceKills:0});
Object.assign(hero,{moveVelocity:0,stun:0,knock:0,coyote:0,comboIndex:-1,comboAt:-10,landPulse:0,animAction:null,animDir:null,animTime:0,dashCooldown:0,pendingDash:null,attackReadyAt:0,airDashed:false,dashDust:0,jumpCount:0,jumpAt:-10,jumpSerial:0});
window.addEventListener('error',e=>metrics.errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>metrics.errors.push(String(e.reason)));
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s?.version===1&&Array.isArray(s.characters)){store=s;store.characters.forEach(R.normalizeEquipment);}}catch(e){metrics.errors.push('读取存档：'+e.message);}
function img(path){if(!imageCache.has(path)){const im=new Image();const promise=new Promise((resolve,reject)=>{im.onload=async()=>{try{await im.decode();metrics.images++;resolve(im);}catch(e){reject(e);}};im.onerror=()=>{metrics.errors.push('素材未加载：'+path);reject(Error(path));};});im.src='assets/'+path;imageCache.set(path,{im,promise});}return imageCache.get(path).promise;}
function knownImage(path){const im=imageCache.get(path)?.im;return im?.complete&&im.naturalWidth?im:null;}
function cachedImage(path){if(!imageCache.has(path))img(path).catch(()=>{});return knownImage(path);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isInteger(v)?String(v):Number(v.toFixed(1)).toString();
const icon=id=>'assets/'+(icons[id]||icons.gold);
const labels={hp:'生命',mp:'蓝量',atk:'攻击',def:'防御',speed:'攻速'};
function toast(text,bad=false){const el=document.createElement('div');el.className='toast'+(bad?' bad':'');el.textContent=text;$('toasts').append(el);while($('toasts').children.length>4)$('toasts').firstElementChild.remove();setTimeout(()=>el.remove(),3600);}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(store));$('saveStatus').textContent='已保存';return true;}catch(e){$('saveStatus').textContent='保存失败';metrics.errors.push(e.message);return false;}}
function save(){if(p){store.lastId=p.id;AdventureSaves.stamp(p,ready&&scene&&!scene.practice?{scene:scene.id,x:hero.x,y:hero.y,hp:hero.hp,mp:hero.mp,wave:scene.waves?.index,worldVersion:44}:null);}return persist();}
function currentStats(){return R.stats(p);}function activeStats(){return R.combatStats(p,hero.hp);}
function keysFor(role){const c=role?.appearance||preview?.appearance||{skin:'peach',hair:'short',color:'brown'},equip=role?.equipped;const clothes=equip?.clothes?.id||R.CLASSES[role?.cls||preview?.cls||'warrior'].clothes,helmet=equip?.helmet?.id;return ['back','body_'+c.skin,'clothes_'+clothes,'hair_'+c.hair+'_'+c.color,...(helmet?['helmet_'+helmet.replace('helmet_','')]:[]),'weapon_'+(equip?.weapon?.id.endsWith('_1')?'1':'0'),'nocked_arrow','hand_'+c.skin];}
function getPack(role,action,dir){const record=charIndex.get(`${role.cls}.${action}.${dir}`)||charIndex.get(`${role.cls}.idle.${dir}`);const layerKeys=keysFor(role),key=record.sheet+'|'+layerKeys.join(',');if(!packCache.has(key)){
 const pack={record,canvas:null};packCache.set(key,pack);
 pack.ready=Promise.all(layerKeys.map(k=>img(record.layers[k]))).then(images=>{const out=document.createElement('canvas');out.width=record.sheet_columns*320;out.height=Math.ceil(record.frame_count/record.sheet_columns)*320;const c=out.getContext('2d',{willReadFrequently:true});images.forEach(im=>c.drawImage(im,0,0));pack.frames=Array.from({length:record.frame_count},(_,n)=>{const frame=document.createElement('canvas');frame.width=frame.height=320;frame.getContext('2d',{willReadFrequently:true}).drawImage(out,(n%record.sheet_columns)*320,Math.floor(n/record.sheet_columns)*320,320,320,0,0,320,320);return frame;});pack.canvas=out;out.width=out.height=1;layerKeys.forEach(k=>imageCache.delete(record.layers[k]));}).catch(e=>{metrics.errors.push('人物组合：'+e.message);});
 }const result=packCache.get(key);packCache.delete(key);packCache.set(key,result);while(packCache.size>30){const oldest=packCache.keys().next().value;packCache.delete(oldest);}return result;}
function frameAt(record,ms,loop=true){const total=record.durations_ms.reduce((a,b)=>a+b,0);let n=loop?ms%total:Math.min(ms,total-1);for(let i=0;i<record.frame_count;i++){if(n<record.durations_ms[i])return i;n-=record.durations_ms[i];}return 0;}
function drawCharacter(c,role,action,dir,x,y,scale,ms,progress=null,lean=0){let pack=getPack(role,action,dir);if(!pack.frames)pack=getPack(role,'idle',dir);if(!pack.frames)return;const fi=progress===null?frameAt(pack.record,ms):Math.min(pack.record.frame_count-1,Math.floor(progress*pack.record.frame_count));c.save();c.translate(x,y);c.rotate(lean);c.drawImage(pack.frames[fi],-160*scale,-256*scale,320*scale,320*scale);c.restore();}
async function prewarm(role){await M.load();await FullFrameMotion.prepare(role);}
function warmTextures(frames){ctx.save();ctx.setTransform(1,0,0,1,0,0);frames.forEach((frame,i)=>ctx.drawImage(frame,(i%24)*8,Math.floor(i/24)*8,8,8));ctx.getImageData(0,0,192,Math.ceil(frames.length/24)*8);ctx.restore();}
async function prepareCombatAssets(role){
 await prewarm(role);if(role.cls==='mage')await MageOrbEffects.load();const key=role;if(warmRoles.has(key))return;
 const ids=['hit_flash','pickup',...(role.cls==='warrior'?['sword_impact','warrior_skill']:role.cls==='archer'?['arrow_projectile','arrow_impact','archer_skill']:['magic_projectile','magic_impact','mage_control','mage_skill'])];
 const effects=ids.map(id=>fxIndex.get(id));await Promise.all(effects.map(fx=>img(fx.sheet)));
 const frames=[];
 for(const fx of effects)for(let n=0;n<fx.frame_count;n++)frames.push(sheetFrame(fx,n));warmTextures(frames);warmRoles.add(key);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
async function prewarmEnemies(){await WoodlandEnemies.load();await new Promise(resolve=>requestAnimationFrame(resolve));}
function bakeBackground(target){if(target.sourceMap)return;if(target.terrain)return ForestRenderer.bake(target,knownImage);const out=document.createElement('canvas');out.width=1920;out.height=720;const c=out.getContext('2d');c.fillStyle='#72afb6';c.fillRect(0,0,1920,720);for(const k of ['far','mid','ground','props'])c.drawImage(knownImage(target.layers[k]),0,80);c.fillStyle='#173f48';c.fillRect(0,0,1920,80);target.background=out;}
function clearInputs(){keys.clear();inputBuffer=null;jumpBuffer=0;hero.pendingDash=null;if(hero.dashKind==='move')hero.dash=0;P.reset(tapState);}
function openPanel(type,title,eyebrow='青岚镇 · 冒险手册'){modalType=type;$('modal').hidden=false;$('panelTitle').textContent=title;$('panel').dataset.kind=type;$('panel').setAttribute('aria-description',eyebrow);$('closePanel').hidden=!p;clearInputs();hero.vx=hero.moveVelocity=0;}
function closePanel(){if(modalType==='start'){backFromStart();return;}if(!p)return;$('modal').hidden=true;modalType=null;preview=null;clearInputs();cv.focus();save();}
function itemLines(item){if(!item)return '<p>选择一件装备查看详情。</p>';const quality=R.QUALITIES[item.q],available=R.TEMPLATES.find(t=>t.id===item.id)?.availableClasses,ownerClass=R.equipmentClass(item);return `<h2 style="color:${quality.color}">${esc(item.name)}${item.enhance?' ＋'+item.enhance:''}</h2><p>${quality.name} · ${ownerClass?R.CLASSES[ownerClass].name+'专用':available?available.map(c=>R.CLASSES[c].name).join('、')+'可用':'全职业通用'}</p>${Object.entries(item.base).map(([k,v])=>`<div class="detail-line">${labels[k]} ＋${fmt(v*(1+.1*item.enhance))}${item.enhance?` <small class="muted">原始 ${v} · 强化 ＋${fmt(v*.1*item.enhance)}</small>`:''}</div>`).join('')}${item.affixes.map(a=>`<div class="detail-line affix">特殊词条 · ${labels[a.key]} ＋${a.key==='speed'?Math.round(a.value*100)+'%':a.value}</div>`).join('')}${item.passive?`<div class="detail-line passive">被动 · ${R.PASSIVES[item.passive].name}<br><small>${R.PASSIVES[item.passive].text}</small></div>`:''}`;}
function allItems(){return [...Object.values(p.equipped).filter(Boolean),...p.bag];}function findItem(uid){return allItems().find(i=>i.uid===uid);}
function itemCells(items){return items.length?items.map(i=>{const worn=Object.values(p.equipped).some(e=>e?.uid===i.uid),q=R.QUALITIES[i.q];return `<button class="item-cell ${selected===i.uid?'selected':''}" style="--quality:${q.color};border-color:${q.color}" data-select="${i.uid}" title="${esc(i.name)} · ${q.name}${worn?' · 已穿戴':''}" aria-label="${esc(i.name)} · ${q.name}${worn?' · 已穿戴':''}" aria-pressed="${selected===i.uid}"><img src="${icon(i.icon)}" alt=""><span style="color:${q.color}">${esc(i.name)}${i.enhance?' ＋'+i.enhance:''}</span><small>${q.name}${worn?' · 已穿戴':''}</small>${worn?'<b class="worn-mark">穿戴</b>':''}${i.enhance?`<b class="enhance-mark">+${i.enhance}</b>`:''}</button>`;}).join(''):'<div class="empty">暂时没有装备</div>';}

function bindSelections(render){document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select;render();});}
async function chooseCharacter(id){const role=store.characters.find(c=>c.id===id);if(!role)throw Error('找不到这份存档');const checkpoint=role.checkpoint?{...role.checkpoint}:null;shopStock=[];p=R.normalizeEquipment(ME.normalize(SW.migrate(role)));preview=null;ready=false;$('loading').hidden=false;save();await prepareCombatAssets(p);if(p.id!==id)return;hideStart();$('modal').hidden=true;modalType=null;clearInputs();const s=currentStats();hero.hp=s.hp;hero.mp=s.mp;hero.invuln=0;hero.cooldowns=[0,0,0];hero.potionCd=0;await enterScene(checkpoint&&checkpoint.scene>=0&&SW.allowed(p,checkpoint.scene)?checkpoint.scene:0);if(checkpoint&&scene.id===checkpoint.scene){hero.x=Math.max(50,Math.min(scene.width-100,Number.isFinite(checkpoint.x)?checkpoint.x:hero.x));if(scene.sourceMap){if([37,44].includes(checkpoint.worldVersion)&&Number.isInteger(checkpoint.wave)&&checkpoint.wave>=0&&checkpoint.wave<=scene.waves.waves.length){scene.waves.index=checkpoint.wave;if(checkpoint.wave===scene.waves.waves.length){scene.waves.phase='complete';scene.rewarded=true;}else hero.x=Math.min(hero.x,E.limit(scene.waves,scene.width));hero.y=SW.safeSurface(scene,hero.x,checkpoint.y||scene.startY).y;}else{hero.x=scene.startX;hero.y=scene.startY;}camera=Math.max(0,Math.min(scene.width-W,hero.x-W*.43));cameraY=Math.max(0,Math.min(scene.height-H,hero.y-H*.72));}hero.hp=Math.max(1,Math.min(s.hp,checkpoint.hp||s.hp));hero.mp=Math.max(0,Math.min(s.mp,checkpoint.mp??s.mp));}save();}
let equipmentChangeSerial=0,equipmentPending=false;
function showInventory(){if(!p)return;openPanel('inventory','背包与装备','武器按职业 · 衣服与头盔通用');const s=currentStats();if(!findItem(selected))selected=p.bag[0]?.uid||p.equipped.weapon?.uid;
 const gear=slot=>{const e=p.equipped[slot],name={weapon:'武器',clothes:'衣服',helmet:'头盔'}[slot];return `<button class="paperdoll-slot gear-${slot} ${e?'filled':''} ${e?.uid===selected?'selected':''}" ${e?`data-select="${e.uid}" style="--quality:${R.QUALITIES[e.q].color}"`:'disabled'} aria-label="${name} · ${e?esc(e.name):'未穿戴'}" title="${name} · ${e?esc(e.name)+(e.enhance?' ＋'+e.enhance:''):'未穿戴'}">${e?`<img src="${icon(e.icon)}" alt="">`:AdventureUI.sigil(slot)}<small>${name}</small>${e?.enhance?`<b class="gear-enhance">＋${e.enhance}</b>`:''}${!e?'<span class="gear-empty">未穿戴</span>':''}</button>`;};
 const selectedItem=findItem(selected),items=p.bag,blanks=Math.max(0,12-items.length),worn=selectedItem&&Object.values(p.equipped).some(e=>e?.uid===selectedItem.uid);
 $('panelBody').innerHTML=`<div class="gear-workbench"><section class="bag-compartment"><div class="bag-heading"><h2>未穿戴装备</h2><span>${items.length} 件</span></div><div class="inventory-list inventory-grid">${items.length?itemCells(items):'<p class="bag-empty">背包暂时没有装备</p>'}${Array.from({length:blanks},()=>'<div class="empty-slot" aria-hidden="true"></div>').join('')}</div>${items.length>12?'<small class="bag-scroll-hint">滚动查看其余装备</small>':''}<div class="bag-purse"><img src="${icon('gold')}" alt="金币"><strong>${p.gold}</strong><span>金币</span></div><div class="material-pouch">${materialContents()}</div></section><aside class="hero-equipment"><div class="hero-identity"><h2>${esc(p.name)}</h2><span>${R.CLASSES[p.cls].name} · 等级 ${p.level}</span></div><div class="paperdoll"><canvas id="equipmentPreview" width="320" height="320"></canvas><div class="paperdoll-slots" aria-label="已穿戴装备">${['helmet','clothes','weapon'].map(gear).join('')}</div><span class="equipped-caption">已穿戴</span></div><dl class="hero-stats">${['hp','mp','atk','def','speed'].map(k=>`<div><dt>${labels[k]}</dt><dd>${fmt(s[k])}${k==='speed'?'×':''}</dd></div>`).join('')}</dl></aside><section class="item-detail equipment-detail">${selectedItem?`<div class="detail-art" style="--quality:${R.QUALITIES[selectedItem.q].color}"><img src="${icon(selectedItem.icon)}" alt=""></div>`:''}${itemLines(selectedItem)}<div class="small-buttons"><button class="primary" id="equipItem">${worn?'已穿戴':'穿戴'}</button><button id="sellItem">出售</button><button id="recycleItem">回收</button>${scene?.id===0?'<button id="forgeItem">前往锻造</button>':''}</div><p class="detail-note">${worn?'当前穿戴中的装备。':selectedItem&&!R.canEquip(p,selectedItem)?'当前职业无法穿戴这件装备。':'出售获得金币，回收获得少量锻造材料。'}</p></section></div>`;bindSelections(showInventory);
 const item=findItem(selected),isEquipped=item&&Object.values(p.equipped).some(e=>e?.uid===item.uid);$('equipItem').disabled=equipmentPending||!item||isEquipped||!R.canEquip(p,item);$('equipItem').onclick=async()=>{
  if(equipmentPending)return;equipmentPending=true;
  const owner=p,serial=++equipmentChangeSerial,button=$('equipItem'),candidate={...owner,equipped:{...owner.equipped,[item.slot]:item}};
  button.disabled=true;button.textContent='准备装备…';
  try{
   await prewarm(candidate);
   // Commit equipment and inventory together only after its entire painted wardrobe is ready.
   if(serial!==equipmentChangeSerial||p!==owner||!owner.bag.includes(item)||!R.canEquip(owner,item))return;
   const old=owner.equipped[item.slot],at=owner.bag.indexOf(item);owner.bag.splice(at,1);if(old)owner.bag.push(old);owner.equipped[item.slot]=item;
   const stats=currentStats();hero.hp=Math.min(hero.hp,stats.hp);hero.mp=Math.min(hero.mp,stats.mp);save();toast('已穿戴 '+item.name);
  }catch(error){if(serial===equipmentChangeSerial&&p===owner)toast('装备读取失败：'+error.message,true);}
  finally{if(serial===equipmentChangeSerial){equipmentPending=false;if(p===owner&&modalType==='inventory')showInventory();}}
 };
 $('sellItem').disabled=!item||isEquipped;$('recycleItem').disabled=!item||isEquipped;
 $('sellItem').onclick=()=>{p.bag.splice(p.bag.indexOf(item),1);const value=12+item.q*28+item.enhance*12;p.gold+=value;save();toast('变卖装备，金币 ＋'+value);showInventory();};
 $('recycleItem').onclick=()=>{p.bag.splice(p.bag.indexOf(item),1);const tier=item.q>=4?'high':item.q>=3?'mid':'basic',n=1+Math.floor(item.q/2);p.materials[tier]+=n;save();toast('回收装备，'+tierName(tier)+' ＋'+n);showInventory();};if($('forgeItem'))$('forgeItem').onclick=()=>showForge('enhance');
}
function showSkills(){openPanel('skills','职业技能','技能点成长 · 技能消耗蓝量');const skills=R.SKILLS[p.cls];$('panelBody').innerHTML=`<div class="resource-line">可用技能点：${p.points}　·　金币：${p.gold}　·　升级获得1点</div><div class="cards skill-track">${skills.map((s,i)=>`<div class="card skill-card"><img src="${icon(p.cls+'_skill_0'+(i+1))}" alt=""><h3>${s.name}<small>${p.skills[i]}/5级</small></h3><p>${s.desc}</p><p>蓝耗 ${s.mp} · 冷却 ${s.cd}秒<br>${i?'前置：上一个技能至少1级':'基础技能'}</p><button class="primary" data-learn="${i}" ${p.points<=0||p.skills[i]>=5||(i>0&&p.skills[i-1]===0)?'disabled':''}>${p.skills[i]?'提升技能':'学习技能'} · 1点</button></div>`).join('')}</div><div class="panel-actions"><span class="muted">在城镇重置，返还已投入技能点</span><button id="resetSkills" ${scene.id!==0||p.skills.every(n=>n===0)?'disabled':''}>重置技能 · ${p.level*80}金币</button></div>`;
 document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.learn;if(p.points>0&&p.skills[i]<5&&(i===0||p.skills[i-1]>0)){p.points--;p.skills[i]++;save();showSkills();updateDock();}});
 $('resetSkills').onclick=()=>{const cost=p.level*80;if(p.gold<cost)return toast('金币不足',true);p.gold-=cost;p.points+=p.skills.reduce((a,b)=>a+b,0);p.skills=[0,0,0];save();toast('技能点已返还');showSkills();updateDock();};
}
let mapFocus=1;
function showMap(focus){SW.migrate(p);mapFocus=Number.isInteger(focus)?focus:scene?.id||1;mapFocus=Math.max(1,Math.min(13,mapFocus));const m=SW.info(mapFocus),locked=!SW.allowed(p,mapFocus),complete=p.clearedMaps.includes(mapFocus);openPanel('map','勇者行路图');
 const positions=[[9,56],[23,48],[37,48],[49,36],[62,30],[77,28],[88,43],[78,60],[65,68],[50,73],[24,20],[25,77],[37,87]];
 const edges=SW.names.flatMap((_,i)=>SW.info(i+1).next.map(n=>{const a=positions[i],b=positions[n-1];return `<path d="M${a[0]*10},${a[1]*6} L${b[0]*10},${b[1]*6}" class="${p.openMaps.includes(n)?'route-open':'route-locked'}"/>`;})).join('');
 $('panelBody').innerHTML=`<div class="expedition"><div class="route-map"><div class="route-landscape source-route"><img class="route-art" src="assets/ui/v25/forest-route.webp" alt="勇者行路图"><svg class="route-line" viewBox="0 0 1000 600">${edges}</svg>${SW.names.map((name,i)=>`<button class="source-node ${p.openMaps.includes(i+1)?'open':'locked'} ${mapFocus===i+1?'selected':''}" style="left:${positions[i][0]}%;top:${positions[i][1]}%" data-route="${i+1}"><b>${p.clearedMaps.includes(i+1)?'✓':i+1}</b><span>${name}</span></button>`).join('')}</div></div><aside class="route-detail"><div class="route-status">${locked?'尚未解锁':complete?'已通过 · 可重刷':'可挑战'}</div><h2>${m.name}</h2><div class="guard-entry"><div><small>${m.boss?'守关敌人':'连续战斗'}</small><strong>${SE.names[m.boss]||'清理全部波次'}</strong></div></div><dl class="route-facts"><div><dt>波次</dt><dd>${m.waves}</dd></div><div><dt>路线</dt><dd>${m.next.map(n=>SW.info(n).name).join(' / ')||'返回城镇'}</dd></div></dl><button class="primary embark" data-map="${mapFocus}" ${locked?'disabled':''}>${locked?'道路尚未开放':complete?'再次挑战':'启程'}</button><button class="back-to-town" id="mapTown">返回青岚镇</button></aside></div><div class="map-note">已通过 ${p.clearedMaps.length} / 13<span>解锁永久保留</span></div>`;
 document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>showMap(+b.dataset.route));document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{closePanel();enterScene(+b.dataset.map);});$('mapTown').onclick=()=>{closePanel();enterScene(0);};}

function tierName(tier){return ME.name(tier);}
function materialContents(){return ME.definitions.map(d=>`<div class="material-entry ${d.boss?'boss-material':''}" title="${esc(d.source+' · '+d.use)}"><img src="${icon(d.icon)}" alt=""><span>${d.name}<b>× ${p.materials[d.id]||0}</b></span></div>`).join('');}
function showShop(){if(scene.id!==0)return toast('请先返回城镇',true);openPanel('shop','青岚商城','金币购买 · 补给与锻造材料');const shopRank=Math.max(...(p.openMaps||[1]).map(id=>SW.info(id).rank)),shopPrice=100+(shopRank-1)*35;if(!shopStock.length||shopStock[0]?.stage!==shopRank)shopStock=R.TEMPLATES.filter(x=>R.canEquip(p,x)).slice(0,p.cls==='warrior'?7:6).map(t=>R.makeItem(t.id,1,shopRank));const goods=[{id:'hp',name:'生命药水',desc:'恢复最大生命的45%',price:18,icon:'hp_potion'},{id:'mp',name:'蓝量药水',desc:'恢复最大蓝量的50%',price:18,icon:'mp_potion'},...ME.definitions.filter(d=>d.price).map(d=>({id:d.id,name:d.name,desc:d.use,price:d.price,icon:d.icon}))];
 $('panelBody').innerHTML=`<div class="resource-line">金币 ${p.gold}　·　材料 ${p.materials.basic} / ${p.materials.mid} / ${p.materials.high}</div><div class="cards">${goods.map(g=>`<div class="card"><img src="${icon(g.icon)}" alt=""><h3>${g.name}</h3><p>${g.desc}</p><div class="price">${g.price} 金币 / 个</div><button data-buy="${g.id}" ${p.gold<g.price?'disabled':''}>购买1个</button></div>`).join('')}${shopStock.map((i,n)=>`<div class="card" style="border-color:${R.QUALITIES[i.q].color}"><img src="${icon(i.icon)}" alt=""><h3>${i.name}</h3><p>优秀品质 · ${Object.entries(i.base).map(([k,v])=>labels[k]+'＋'+v).join(' / ')}</p><div class="price">${shopPrice} 金币</div><button data-buy-equip="${n}" ${p.gold<shopPrice?'disabled':''}>购买装备</button></div>`).join('')}</div>`;
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const g=goods.find(g=>g.id===b.dataset.buy);if(p.gold<g.price)return;p.gold-=g.price;if(g.id==='hp'||g.id==='mp')p.potions[g.id]++;else p.materials[g.id]++;save();showShop();});document.querySelectorAll('[data-buy-equip]').forEach(b=>b.onclick=()=>{if(p.gold<shopPrice)return;p.gold-=shopPrice;const it=structuredClone(shopStock[+b.dataset.buyEquip]);it.uid=crypto.randomUUID();p.bag.push(it);save();toast('已购买 '+it.name);showShop();});
}
function showStorage(){if(scene.id!==0)return toast('仓库位于城镇',true);openPanel('storage','装备仓库','保留值得收藏的装备');$('panelBody').innerHTML=`<div class="split"><div><h2>背包</h2><div class="inventory-list">${p.bag.map(i=>`<button class="item-cell" data-store="${i.uid}"><img src="${icon(i.icon)}" alt=""><span style="color:${R.QUALITIES[i.q].color}">${esc(i.name)}</span><small>点击存入</small></button>`).join('')||'<div class="empty">背包为空</div>'}</div></div><div><h2>仓库</h2><div class="inventory-list">${p.storage.map(i=>`<button class="item-cell" data-take="${i.uid}"><img src="${icon(i.icon)}" alt=""><span style="color:${R.QUALITIES[i.q].color}">${esc(i.name)}</span><small>点击取出</small></button>`).join('')||'<div class="empty">仓库为空</div>'}</div></div></div>`;
 document.querySelectorAll('[data-store]').forEach(b=>b.onclick=()=>{const i=p.bag.findIndex(i=>i.uid===b.dataset.store);p.storage.push(p.bag.splice(i,1)[0]);save();showStorage();});document.querySelectorAll('[data-take]').forEach(b=>b.onclick=()=>{const i=p.storage.findIndex(i=>i.uid===b.dataset.take);p.bag.push(p.storage.splice(i,1)[0]);save();showStorage();});}
function showBounty(){if(scene.id!==0)return toast('赏金公告板位于公会',true);openPanel('bounty','公会赏金','可以反复领取 · 通关之外的目标');const b=p.bounties,done=b.kills>=8&&b.elites>=1;$('panelBody').innerHTML=`<div class="card"><img src="${icon('bounty')}" alt=""><h2>林地清剿</h2><p>击败8只普通怪与1名精英或区域Boss。</p><p>普通怪 ${Math.min(8,b.kills)}/8　·　精英/Boss ${Math.min(1,b.elites)}/1</p><div class="price">奖励：220金币＋60经验</div><button class="primary" id="bountyButton" ${b.active&&!done?'disabled':''}>${!b.active?'接受赏金':done?'领取奖励':'进行中'}</button></div><p>完成后可以再次接取。死亡与回城保留已完成的任务计数。</p>`;$('bountyButton').onclick=()=>{if(!b.active){p.bounties={active:true,kills:0,elites:0};toast('已接受林地清剿赏金');}else if(done){p.gold+=220;gainXP(60);p.bounties={active:false,kills:0,elites:0};toast('赏金已领取，金币 ＋220');}save();showBounty();};}
function pay(cost){const missing=ME.missing(p,cost);if(missing.length){toast(missing.join('、')+'不足',true);return false;}return ME.pay(p,cost);}
function costText(cost){return cost?`${cost.gold}金币 ＋ ${Object.entries(ME.amounts(cost)||{}).map(([id,n])=>n+'个'+tierName(id)).join(' ＋ ')}`:'已达到上限或没有可刷新效果';}
function showForge(tab='enhance'){
 if(scene.id!==0)return toast('锻造需要返回城镇',true);if(p.pendingReforge)return showReforgeResult();openPanel('forge',tab==='enhance'?'装备强化':'装备重铸','铁匠铺 · 每件装备最高＋10');if(!findItem(selected))selected=p.equipped.weapon?.uid;const item=findItem(selected),cost=item?R.enhanceCost(item):null;
 $('panelBody').innerHTML=`<div class="panel-tabs"><button id="tabEnhance" class="${tab==='enhance'?'active':''}">强化</button><button id="tabReforge" class="${tab==='reforge'?'active':''}">重铸</button></div><div class="resource-line">金币 ${p.gold}</div><div class="material-pouch forge-materials">${materialContents()}</div><div class="split"><div class="inventory-list">${itemCells(allItems())}</div><div class="item-detail">${itemLines(item)}${tab==='enhance'?`<p>必定成功，每级增加原始基础属性的10%。词条与被动独立保留。</p><div class="price">${costText(cost)}</div><div class="panel-actions"><button class="primary" id="doEnhance" ${!cost?'disabled':''}>${cost?'强化至 ＋'+(item.enhance+1):'已达＋10'}</button></div>`:`<p>锁定的效果保留，其他效果一起刷新。保留旧结果也不退还费用。</p><div class="lock-list">${item?.affixes.map((a,i)=>`<label><input type="checkbox" class="reforge-lock" value="${i}">锁定：${labels[a.key]} ＋${a.key==='speed'?Math.round(a.value*100)+'%':a.value}</label>`).join('')||''}${item?.passive?`<label><input type="checkbox" class="reforge-lock" value="passive">锁定：${R.PASSIVES[item.passive].text}</label>`:''}</div><p id="reforgeCost"></p><div class="panel-actions"><button class="primary" id="doReforge">支付并重铸</button></div>`}</div></div>`;
 $('tabEnhance').onclick=()=>showForge('enhance');$('tabReforge').onclick=()=>showForge('reforge');bindSelections(()=>showForge(tab));
 if(tab==='enhance')$('doEnhance').onclick=()=>{if(cost&&pay(cost)){item.enhance++;save();toast(item.name+' 强化成功：＋'+item.enhance);effect('enhance_success',hero.x,hero.y-65);showForge(tab);}};
 else{const locks=()=>Array.from(document.querySelectorAll('.reforge-lock:checked')).map(x=>x.value),update=()=>{const c=item?R.reforgeCost(item,locks()):null;$('reforgeCost').textContent=costText(c);$('doReforge').disabled=!c;};document.querySelectorAll('.reforge-lock').forEach(x=>x.onchange=update);update();$('doReforge').onclick=()=>{const ls=locks(),c=R.reforgeCost(item,ls);if(c&&pay(c)){p.pendingReforge={uid:item.uid,old:structuredClone(item),next:R.reforge(item,ls),cost:c};save();showReforgeResult();}};}
}
function showReforgeResult(){const pending=p.pendingReforge;openPanel('reforge-result','选择重铸结果','材料与金币已消耗 · 保留原结果也不退款');$('panelBody').innerHTML=`<div class="banner">已支付 ${costText(pending.cost)}。基础属性与强化等级保持一致。</div><div class="recast-compare"><div class="item-detail"><p>原结果</p>${itemLines(pending.old)}<div class="panel-actions"><button id="keepReforge">保留原结果</button></div></div><div class="item-detail"><p>新结果</p>${itemLines(pending.next)}<div class="panel-actions"><button class="primary" id="acceptReforge">采用新结果</button></div></div></div>`;
 const finish=accept=>{const current=findItem(pending.uid);if(current&&accept)Object.assign(current,pending.next);p.pendingReforge=null;save();toast(accept?'已采用新结果':'已保留原结果，消耗不返还');showForge('reforge');};$('keepReforge').onclick=()=>finish(false);$('acceptReforge').onclick=()=>finish(true);}
function showHelp(){openPanel('help','冒险操作','键盘操作 · 随时自动存档');$('panelBody').innerHTML=`<div class="help-grid"><p><kbd>← → / A D</kbd> 移动<br><kbd>A A / D D</kbd> 双击冲刺，按住方向持续奔跑<br><kbd>K</kbd> 短促跳跃，松开降低高度；再次按下接二段<br><kbd>S＋K</kbd> 穿过平台下落<br><kbd>↑ / ↓</kbd> 沿梯子攀爬</p><p><kbd>J</kbd> 普通攻击，战士按住：单刀、单刀、快双刀<br><kbd>Q / W / E</kbd> 三个职业技能<br><kbd>1 / 2</kbd> 生命药水 / 蓝量药水</p><p><kbd>F</kbd> 与附近建筑交互<br><kbd>B</kbd> 背包与装备<br><kbd>I</kbd> 技能点<br><kbd>M</kbd> 已解锁关卡</p><p><kbd>T</kbd> 返回城镇<br><kbd>Esc</kbd> 关闭窗口<br>死亡返回城镇，保留进度与所得物品。<br>技能重置需要金币，城镇内进行。</p></div><p>城镇从左至右：锻造、商城、公会赏金、仓库、关卡入口。精英与Boss出招前会显示预警，跳跃和换平台可以躲避。解锁后的关卡能直接重刷。右上角“练习”可试用所有职业技能，靶子会复原，不产生奖励；“音效”可静音。</p>`;}
function exportSave(){save();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(store,null,2)],{type:'application/json'}));a.download='勇者旅途_存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('存档已导出');}
async function enterScene(id){
 if(!Number.isInteger(id)||id<0||id>13||!SW.allowed(p,id))return toast('请先击败前一关精英，解锁这张地图。',true);
 const token=++sceneSerial;ready=false;clearInputs();hitStop=shake=shakeTime=hurtScreen=0;particles=[];sweeps=[];skillAreas=[];skillFx=[];enemyHazards=[];hero.rootSlow=0;$('loading').hidden=false;hero.attack=null;hero.vx=hero.vy=hero.moveVelocity=0;motion.runBlend=0;motion.outfitMotion=null;Object.assign(motion,{phase:0,clock:0,pose:null,from:null,tag:null,elapsed:0,fullPhase:0,fullLastAction:null,fullVisualTag:null,fullVisualHead:null,fullVisualAction:null,fullOffsetX:0,fullOffsetY:0,fullAirTime:0,fullGrounded:true,fullAttackId:null,fullAttackAir:false});hero.dash=hero.stun=hero.knock=hero.dashCooldown=0;hero.pendingDash=null;hero.attackReadyAt=t;hero.airDashed=false;hero.comboIndex=-1;hero.comboAt=-10;hero.comboWindow=1.15;hero.coyote=0;hero.jumpCount=0;hero.jumpAt=-10;hero.animAction=null;hero.animTime=0;simAccumulator=0;hero.grounded=true;shots=[];vfx=[];numbers=[];drops=[];pendingShots=[];camera=0;cameraY=0;
 if(id===0){const [im]=await Promise.all([img('town_user.webp'),TownNPCs.load()]);if(token!==sceneSerial)return;const scale=H/im.height;scene={id:0,name:'青岚镇',width:im.width*scale,ground:698*scale,image:im,scale,platforms:[],places:[{x:240*scale,name:'铁匠铺 · 强化与重铸',panel:'forge'},{x:580*scale,name:'商城 · 补给与材料',panel:'shop'},{x:1030*scale,name:'公会 · 赏金任务',panel:'bounty'},{x:1390*scale,name:'仓库 · 装备收藏',panel:'storage'},{x:1650*scale,name:'关卡 · 林地区域',panel:'map'}]};scene.npcs=TownNPCs.create(scale,scene.ground);scene.places=scene.npcs;hero.x=675*scale;hero.y=scene.ground;enemies=[];const s=currentStats();hero.hp=s.hp;hero.mp=s.mp;}
 else{scene={...SW.build(id),places:[],age:0};WoodlandRoutes.restore(scene,p);await Promise.all([...SW.paths(scene).map(img),SE.load([...scene.raw.enemyArr.flatMap(row=>row[3]),...(id===10?['b7_1']:[])])]);if(token!==sceneSerial)return;hero.x=scene.startX;hero.y=scene.startY;cameraY=Math.max(0,Math.min(scene.height-H,hero.y-H*.72));enemies=[];scene.waves=E.plan(scene);}

 if(id!==0){bakeBackground(scene);await prewarmEnemies();}if(token!==sceneSerial)return;$('loading').hidden=true;ready=true;syncMusic(scene.sourceMap?scene.raw.bgMusic:'musicBegin');save();updateDock();updateHUD();cv.focus();
}
async function enterPractice(){
 if(!p)return toast('先创建或选择一个角色，再进入练习场。');closePanel();await enterScene(0);
 const token=++sceneSerial;ready=false;$('loading').hidden=false;const map=ASSETS.maps[0];await Promise.all([...['far','mid','ground','props','foreground'].map(k=>img(map.layers[k])),...L.assetPaths.map(img),...(ForestRenderer.assetPaths||[]).map(img)]);if(token!==sceneSerial)return;
 scene={id:1,practice:true,name:'林间练习场',width:1920,ground:600,terrain:[{x:0,width:1920,y:600,kind:'solid'}],props:[['oak',100,.85],['sign',450,.7],['fir',1740,.8]],accents:[['shrub',580,.55],['boulder',1490,.7]],exitX:1800,layers:map.layers,platforms:map.collisions.filter(c=>c.kind==='platform').map(c=>({...c,y:c.y+80})),places:[]};hero.x=300;hero.y=600;hero.grounded=true;hero.cooldowns=[0,0,0];hero.invuln=0;enemyHazards=[];enemies=[];
 spawnEnemy('slime',425,600,'normal',1);spawnEnemy('wolf',875,600,'normal',1);spawnEnemy('boar',1230,600,'elite',1);spawnEnemy('ancient_tree',1620,600,'boss',1);
 for(const e of enemies){e.maxHp=e.hp=e.category==='normal'?400:2000;e.trainingLabel=e.category==='normal'?'连击练习靶':'韧性练习靶';}
 bakeBackground(scene);await prewarmEnemies();if(token!==sceneSerial)return;ready=true;$('loading').hidden=true;updateDock();updateHUD();cv.focus();toast('练习靶会自动复原。Q/W/E可试用全部技能；按T回城。');
}
function spawnEnemy(type,x,y,category,map,place={}){const stats=R.enemyStats(type,category,map);enemies.push({type,x,y,home:x,category,map,...stats,hp:stats.hp,maxHp:stats.hp,dir:'left',state:'idle',timer:Math.random()*1.4,attackTimer:0,attackDuration:1.25,attackKind:1,hit:false,cooldown:.45+Math.random()*.45,animTime:0,slow:0,freeze:0,hurt:0,flash:0,stun:0,knock:0,dead:0,enraged:false,aware:false,alert:0,hpTrail:stats.hp,impactDir:1,impactHeavy:false,patrolMin:Math.max(40,x-160),patrolMax:Math.min(scene.width-60,x+160),detect:250,...place});N.reset(enemies.at(-1));}
function effect(id,x,y,scale=1,dir=1){vfx.push({id,x,y,time:0,scale,dir});cachedImage(fxIndex.get(id)?.sheet);}
function damageNumber(value,x,y,color='#f6dfaa',heavy=false){numbers.push({text:typeof value==='number'?String(Math.round(value)):value,x,y,time:0,color,heavy});}
function burst(x,y,count,color,dir=1){for(let i=0;i<count;i++)particles.push({x,y,vx:dir*(60+Math.random()*220)+(Math.random()-.5)*120,vy:-70-Math.random()*200,size:2+Math.random()*4,life:.2+Math.random()*.2,max:.4,color});if(particles.length>160)particles.splice(0,particles.length-160);}
function feedback(stop,power){if(stop>hitStop){hitStop=stop;metrics.hitStops++;}shake=Math.max(shake,power);shakeTime=Math.max(shakeTime,.14);}
function gainXP(amount){const result=R.addXP(p,amount);if(result.levels){const n=currentStats();hero.hp=Math.min(n.hp,hero.hp+result.hpGain);hero.mp=Math.min(n.mp,hero.mp+result.mpGain);effect('level_up',hero.x,hero.y-65,1.2);toast('升级至 '+p.level+'级，获得技能点！');}save();}
function killEnemy(e){if(e.state==='death')return;e.hp=0;e.state='death';e.dead=.85;e.eliteMove=null;e.guard=0;enemyHazards=enemyHazards.filter(h=>h.owner!==e);if(scene.practice){metrics.practiceKills++;return;}metrics.kills++;p.kills++;const s=currentStats(),reward=(scene.sourceMap?R.sourceReward:R.enemyReward)(e.category,scene.id),gold=Math.round(reward.gold*s.gold);p.gold+=gold;gainXP(reward.xp);damageNumber('＋'+gold+'金币',e.x,e.y-90,'#f3cb72');
 if(p.bounties.active){if(e.category==='normal')p.bounties.kills++;else p.bounties.elites++;}
 if(e.category!=='normal'){
  if(e.category==='boss'){const loot=ME.bossReward(e.type,e.category,scene.rank||1);ME.grant(p,loot);toast(Object.entries(loot).map(([id,n])=>tierName(id)+' ＋'+n).join(' · '));}
 }
 if(Math.random()<reward.dropChance){const q=R.weighted(reward.weights),pool=R.TEMPLATES.filter(a=>R.canEquip(p,a)),item=R.makeItem(R.choose(pool).id,q,scene.rank||scene.id);p.bag.push(item);drops.push({item,x:e.x,y:e.y-10,time:0});toast('获得 '+R.QUALITIES[q].name+' · '+item.name);}
 save();
}
function logCombat(event){combatLog.push(event);if(combatLog.length>120)combatLog.shift();}
function targetable(e){return e.state!=='death'&&!(e.spawnTime>0);}
function hurtEnemy(e,damage,control=null,feel=null,damageFraction=1){
 if(!targetable(e))return;feel=feel||C.profile(p.cls,activeStats().speed);const dir=Math.sign(e.x-hero.x)||(hero.dir==='right'?1:-1),heavy=feel.combo===2&&p.cls==='warrior'||feel.skill>=0;
 const dealt=R.damage(damage*(N.supported(e)?N.modifier(e,hero.x):1),e.def)*damageFraction;e.hp-=dealt;e.hurt=.24;e.flash=.05;e.animTime=0;e.impactDir=dir;e.impactHeavy=heavy;e.aware=true;e.alert=0;e.stun=Math.max(e.stun,C.stagger(e.category,feel.stun,feel.skill));e.knock=dir*feel.knock*C.knockScale(e.category);
 if(N.receive(e,hero.x,feel.skill)){feedback(.02,2);logCombat({type:'shieldBreak',target:e.type,time:t});}
 if(e.guard>0||e.eliteMove?.key==='charge'&&e.attackTimer>=e.hitAt)e.stun=0;
 if(e.state==='attack'&&!e.hit&&(e.category==='normal'||e.category==='elite'&&feel.skill>=0&&!(e.guard>0))){
  if(N.supported(e)){N.cancel(e);enemyHazards=enemyHazards.filter(h=>h.owner!==e||h.warning<=0);}else{e.state='idle';e.cooldown=.2;}
 }
 damageNumber(dealt,e.x,e.y-B.body(e).height*.7,heavy?'#fff2bd':'#fff0d8',heavy);
 const fx=C.feedback(p.cls,true,feel.combo);feedback(C.impactPause(feel),heavy?Math.max(2.4,fx.shake*.7):fx.shake*.6);
 burst(e.x-dir*15,e.y-50,fx.sparks,p.cls==='mage'?'#b5deff':'#ffe0a3',dir);metrics.hits++;
 if(!feel.normalOrb)effect(p.cls==='warrior'?'sword_impact':p.cls==='archer'?'arrow_impact':'magic_impact',e.x,e.y-55,.45);
 if(!feel.sounded){S.play(p.cls==='warrior'?'hit':p.cls==='archer'?'arrowHit':'magicHit',heavy);feel.sounded=true;}
 logCombat({type:'hit',id:feel.id,time:t,wall:performance.now(),target:e.type,category:e.category,damage:dealt,combo:feel.chainCombo??feel.combo,strike:feel.index??0,knock:e.knock});
 if(control){if(control==='freeze'){e.freeze=e.category==='boss'?.3:e.category==='elite'?.8:1.6;e.knock=0;}else{const duration=control==='normalSlow'?(feel.slowDuration||2):3,ratio=control==='normalSlow'?.3:.6;e.slow=Math.max(e.slow,duration);e.slowRatio=Math.max(e.slowRatio||0,ratio);}}
 if(e.hp<=0){burst(e.x,e.y-45,8,'#f6dc99',dir);S.play('enemyDown');killEnemy(e);}
}
function hurtHero(amount,sourceX=hero.x-1){
 if(hero.invuln>0||modalType||scene.practice)return;const dealt=R.damage(amount,activeStats().def);hero.hp-=dealt;hero.invuln=.75;hero.stun=.16;hero.knock=(Math.sign(hero.x-sourceX)||-1)*220;hero.attack=null;
 damageNumber(dealt,hero.x,hero.y-B.PLAYER_HEIGHT,'#ffb5a9');effect('hit_flash',hero.x,hero.y-65,.6);burst(hero.x,hero.y-55,7,'#e99080',Math.sign(hero.knock));feedback(.035,3);hurtScreen=.2;S.play('hurt');
 if(hero.hp<=0){hero.hp=0;toast('挑战中断，返回青岚镇。所得物品与进度保留。',true);enterScene(0);}
}
function canStartAttack(skill=-1){return hero.stun<=0&&(hero.dash<=0||hero.dashKind==='move'&&hero.dash<=P.DASH_TIME-P.RUN_RAMP)&&(skill>=0?(!hero.attack||C.canMoveCancel(hero.attack)):t>=hero.attackReadyAt&&(!hero.attack||hero.attack.hit&&hero.attack.time>=hero.attack.cancelAt));}
function startDash(dir){
 if(!p||!ready||modalType||hero.stun>0||hero.dashCooldown>0||!hero.grounded&&hero.airDashed)return false;
 if(hero.attack&&!C.canMoveCancel(hero.attack)){hero.pendingDash={dir,expires:t+.35};return false;}
 hero.attack=null;hero.pendingDash=null;hero.dash=P.DASH_TIME;hero.dashStartVelocity=hero.moveVelocity;hero.dashVelocity=dir*P.DASH_SPEED;hero.dashCooldown=P.DASH_COOLDOWN;hero.dir=dir>0?'right':'left';
 P.latchRun(tapState,dir);hero.dashKind='move';hero.airDashed=!hero.grounded;hero.dashDust=0;S.play('dash');logCombat({type:'dash',dir,time:t,wall:performance.now()});return true;
}
function startAttack(skill=-1){
 if(!p||!ready||modalType||!canStartAttack(skill))return false;
 const s=activeStats(),def=skill>=0?R.SKILLS[p.cls][skill]:null;
 if(def){if(!p.skills[skill]&&!scene.practice||hero.cooldowns[skill]>0||hero.mp<def.mp)return false;hero.mp-=def.mp;hero.cooldowns[skill]=def.cd;metrics.skills++;}
 if(hero.dashKind==='move')hero.dash=0;
 const move=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);if(move)hero.dir=move>0?'right':'left';
 const combo=skill<0?C.nextCombo(hero.comboIndex,t-hero.comboAt,hero.comboWindow||1.15):0;
 const profile=C.profile(p.cls,s.speed,combo,skill);hero.attack={...profile,id:++attackSerial,time:0,hit:false,hitIds:new Set(),sounded:false,mult:profile.mult*(def?def.mult*(1+.16*(Math.max(1,p.skills[skill])-1)):1),dir:hero.dir};metrics.attacks++;
 hero.attack.hitEvents=C.hitWindows(profile).map((event,index)=>({...hero.attack,...event,strikes:null,hitAt:event.at,time:event.at,mult:hero.attack.mult*event.weight,hitIds:new Set(),released:false,index,chainCombo:combo}));
 hero.attackReadyAt=t+(profile.readyAt??profile.cancelAt);
 hero.comboIndex=skill<0?combo:-1;hero.comboAt=t;hero.comboWindow=(profile.readyAt??profile.cancelAt)+.55;
 logCombat({type:'start',id:hero.attack.id,time:t,wall:performance.now(),cls:p.cls,combo,skill,hitAt:profile.hitAt});
 if(skill>=0)S.play('skillCharge',skill===2);
 return true;
}
function attack(skill=-1){
 if(!p||!ready||modalType)return;
 if(skill<0&&C.isBuffered(inputBuffer,t)&&inputBuffer.skill>=0)return;
 if(skill>=0){const def=R.SKILLS[p.cls][skill];if(!p.skills[skill]&&!scene.practice)return toast('先用技能点学习这个技能',true);if(hero.mp<def.mp)return toast('蓝量不足，按2使用蓝量药水',true);if(hero.cooldowns[skill]>C.BUFFER)return;}
 if(startAttack(skill)){inputBuffer=null;return;}
 inputBuffer=C.buffer(inputBuffer,skill,t,hero.attack?hero.attack.cancelAt-hero.attack.time:Math.max(hero.stun,hero.attackReadyAt-t,hero.dash));metrics.buffered++;
}
function meleeHit(a){
 const s=activeStats(),dir=a.dir==='right'?1:-1;
 for(const e of enemies)if(targetable(e)&&!a.hitIds.has(e)&&Math.abs(e.y-hero.y)<125&&Math.abs(e.x-hero.x)<a.range&&(a.skill===2||(e.x-hero.x)*dir>-20)){
  a.hitIds.add(e);hurtEnemy(e,s.atk*a.mult*(e.category==='normal'?1:s.boss),null,a);
 }
}
function skillEffect(kind,x,y,values={}){skillFx.push({kind,x,y,time:0,life:.55,...values});if(skillFx.length>50)skillFx.shift();}
function skillMeleeHit(a){
 const s=activeStats(),dir=a.dir==='right'?1:-1;
 for(const e of enemies)if(targetable(e)&&!a.hitIds.has(e)&&B.visible(e,camera,W)&&Math.abs(e.y-hero.y)<85&&Math.abs(e.x-hero.x)<a.range&&(a.skill===2||(e.x-hero.x)*dir>-18)&&!B.blocked(scene,{x:hero.x,y:hero.y-42},{x:e.x,y:e.y-42})){
  a.hitIds.add(e);hurtEnemy(e,s.atk*a.mult/(a.damageFraction||1)*(e.category==='normal'?1:s.boss),null,a,a.damageFraction||1);
 }
}
function releaseSkill(a,hand,damage,dir){
 const kind=K.definition(p.cls,a.skill).kind;
 if(p.cls==='warrior'){
  skillEffect(kind,hero.x,hero.y,{dir,range:a.range,index:a.index||0,life:kind==='vortex'?.36:.48});S.play('swing',true);if(kind==='cleave'||a.index===K.definition(p.cls,a.skill).times.length-1)S.play('skillFinish');skillMeleeHit(a);return;
 }
 if(kind==='wind'||kind==='pierce'||kind==='fire'){
  const speed=kind==='pierce'?760:kind==='wind'?640:230,vector=CombatVector.launch(hand.x,hero.y-B.PLAYER_HEIGHT*.55,dir,0,speed,0);
  shots.push({...vector,age:0,life:a.range/speed+.08,remaining:a.range,viewLeft:camera+8,viewRight:camera+W-8,damage,damageFraction:a.damageFraction||1,pierce:kind==='pierce',hitIds:new Set(),type:p.cls==='archer'?'arrow_projectile':'magic_projectile',skillKind:kind,aoe:kind==='fire'?100:0,feel:{...a,sounded:false}});
  skillEffect(kind,hand.x,hand.y,{dir,index:a.index||0,life:.3,radius:30});S.play(kind==='fire'?'cast':'arrow',true);return;
 }
 const zone=K.zone(scene,{x:hero.x,y:hero.y},dir,a.range,camera,W,B.blocked,kind==='frost'),schedule=K.ticks(kind);
 if(zone.reach<24)return;
 const area={...zone,kind,time:0,life:schedule.times.at(-1)+.55,events:schedule.times.map((at,i)=>({at,weight:schedule.weights[i],done:false})),damage,feel:a,dir};
 skillAreas.push(area);skillEffect(kind,zone.x,zone.y,{radius:zone.radius,dir,life:area.life});S.play('cast',true);
}
function updateSkillAreas(dt){
 for(const area of skillAreas){area.time+=dt;area.life-=dt;
  for(let i=0;i<area.events.length;i++){const event=area.events[i];if(event.done||area.time<event.at)continue;event.done=true;const feel={...area.feel,index:i,sounded:false,impactPaused:false,knock:i===area.events.length-1?area.feel.knock:area.feel.knock*.4,stop:i===area.events.length-1?.045:.015};
   let count=0;for(const e of enemies)if(targetable(e)&&K.areaContains(area,e,camera,W,B.body,B.blocked,scene)){
    const control=area.kind==='frost'?'slow':area.kind==='meteor'?(i===area.events.length-1?'freeze':'slow'):null;
    hurtEnemy(e,area.damage*(e.category==='normal'?1:activeStats().boss),control,feel,event.weight);count++;
   }
   logCombat({type:'skillTick',id:feel.id,kind:area.kind,strike:i,time:t,targets:count});S.play(area.kind==='rain'?'arrowHit':area.kind==='meteor'&&i===2?'skillFinish':'iceBreak');
  }
 }skillAreas=skillAreas.filter(a=>a.life>0);
}

function releaseAttack(a){
 const hand=FullFrameMotion.muzzle(p,{...motion,action:'attack',attack:a},hero.x,hero.y,a.dir);
 const s=activeStats(),dir=a.dir==='right'?1:-1,damage=s.atk*a.mult/(a.damageFraction||1);
 logCombat({type:'release',id:a.id,time:t,wall:performance.now(),skill:a.skill,combo:a.chainCombo??a.combo,strike:a.index??0});
 if(a.skill>=0){releaseSkill(a,hand,damage,dir);return;}
 if(p.cls==='warrior'){
  sweeps.push({x:hero.x+dir*8,y:hero.y-46,dir,time:0,life:a.combo===2?.24:.2,combo:a.combo,skill:-1,range:a.range});S.play('swing',a.combo===2);meleeHit(a);
 }else if(p.cls==='archer'){
  S.play('arrow');const limit=B.projectile(p.cls);pendingShots.push({delay:0,shot:{x:hand.x,y:hand.y,vx:dir*limit.speed,vy:0,life:limit.life,remaining:limit.range,viewLeft:camera+8,viewRight:camera+W-8,damage,damageFraction:a.damageFraction||1,pierce:false,hitIds:new Set(),type:'arrow_projectile',aoe:0,feel:{...a,sounded:false}}});
 }else{
  S.play('cast');const limit=B.projectile(p.cls);shots.push({x:hand.x,y:hero.y-B.PLAYER_HEIGHT*.55,vx:dir*limit.speed,vy:0,life:limit.life,remaining:limit.range,viewLeft:camera+8,viewRight:camera+W-8,damage,pierce:false,hitIds:new Set(),type:'magic_projectile',orb:true,age:0,slowRatio:(a.chainCombo??a.combo)===2?.3:0,aoe:a.splashRadius||0,splashFraction:a.splashFraction||0,manaOnHit:a.manaOnHit||0,ownerId:p.id,feel:a});
 }
}

function potion(kind){if(!p||modalType||hero.potionCd>0)return;if(p.potions[kind]<=0&&!scene.practice)return toast('药水用完了，可以回城购买',true);const s=currentStats();if(kind==='hp'&&hero.hp>=s.hp||kind==='mp'&&hero.mp>=s.mp)return;if(!scene.practice)p.potions[kind]--;if(kind==='hp')hero.hp=Math.min(s.hp,hero.hp+s.hp*.45);else hero.mp=Math.min(s.mp,hero.mp+s.mp*.5);hero.potionCd=8;effect('pickup',hero.x,hero.y-65,.7);save();}
function showNPC(npc){
 if(scene?.id!==0||!npc)return;
 openPanel('npc',npc.name,npc.service);
 $('panelBody').innerHTML=`<div class="npc-conversation"><img src="${TownNPCs.portrait(npc.id)}" alt="${esc(npc.name)}"><div><p>${esc(npc.greeting)}</p><div class="panel-actions"><button class="primary" id="npcService">${esc(npc.service)}</button><button id="npcLeave">下次再来</button></div></div></div>`;
 $('npcService').onclick=()=>{if(scene?.id!==0)return closePanel();({forge:showForge,shop:showShop,bounty:showBounty,storage:showStorage,map:showMap})[npc.panel]();};
 $('npcLeave').onclick=closePanel;
}
function interact(){if(!scene||modalType)return;if(scene.practice)return toast('练习场没有通关奖励。按T返回城镇。');const object=scene.sourceMap?WoodlandRoutes.interact(scene,hero,p):null;if(object){WoodlandWorld.invalidate(scene);metrics.interactions++;burst(object.x,object.y-25,14,'#c1d78b');toast(object.text);save();updateHUD();return;}if(scene.id===0){const npc=TownNPCs.nearest(scene.npcs||[],hero);if(npc){metrics.interactions++;showNPC(npc);}}
 else if(Math.abs(hero.x-scene.exitX)<85&&Math.abs(hero.y-scene.exitY)<150){if(scene.waves?.phase!=='complete')return toast('先清理本图全部敌人',true);const next=SW.info(scene.id).next;if(next.length===1)enterScene(next[0]);else if(next.length)showMap(next[0]);else enterScene(0);}}

function updateHero(dt){
 const move=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),wasGrounded=hero.grounded;
 scene.age=(scene.age||0)+dt;scene.focusY=hero.y;hero.dashCooldown=Math.max(0,hero.dashCooldown-dt);if(hero.grounded){hero.airDashed=false;hero.jumpCount=0;}
 hero.rootSlow=Math.max(0,(hero.rootSlow||0)-dt);hero.invuln=Math.max(0,hero.invuln-dt);hero.stun=Math.max(0,hero.stun-dt);hero.landPulse=Math.max(0,hero.landPulse-dt);hero.cooldowns=hero.cooldowns.map(c=>Math.max(0,c-dt));hero.potionCd=Math.max(0,hero.potionCd-dt);
 hero.coyote=hero.grounded?C.COYOTE:Math.max(0,hero.coyote-dt);
 const s=currentStats();hero.mp=Math.min(s.mp,hero.mp+dt*s.mp*(scene.practice?1.5:.008));
 const jumpKind=P.jumpKind(hero,t);
 if(jumpBuffer>0&&jumpBuffer>=t&&jumpKind&&hero.stun<=0&&!(hero.dropUntil>t)){
  if(C.canMoveCancel(hero.attack))hero.attack=null;
  hero.vy=-(jumpKind===2?P.SECOND_JUMP_SPEED:P.JUMP_SPEED);if(!keys.has('KeyK')&&!keys.has('Space'))hero.vy=P.cutJump(hero.vy);hero.jumpCount=jumpKind;if(jumpKind===1)hero.jumpAt=t;hero.jumpSerial++;hero.grounded=false;hero.coyote=0;jumpBuffer=0;metrics.jumps++;S.play('jump');burst(hero.x,hero.y-2,jumpKind===2?7:4,'#b1c5b0',0);logCombat({type:'jump',stage:jumpKind,time:t,y:hero.y});
 }
 if(hero.pendingDash){if(hero.pendingDash.expires<t)hero.pendingDash=null;else if(!hero.attack||C.canMoveCancel(hero.attack))startDash(hero.pendingDash.dir);}
 if(move&&C.canMoveCancel(hero.attack))hero.attack=null;
 const latchedRun=P.running(tapState,move),running=latchedRun||keys.has('ShiftLeft')||keys.has('ShiftRight')||hero.dash>0;
 const commit=C.movementScale(hero.attack,hero.grounded);
 const targetV=hero.stun>0?0:move*(running?M.RUN_SPEED:M.WALK_SPEED)*commit*(hero.rootSlow>0?.65:1);
 const accel=running&&move&&Math.abs(targetV)>Math.abs(hero.moveVelocity)&&Math.abs(hero.moveVelocity)>=M.WALK_SPEED&&Math.sign(targetV)===Math.sign(hero.moveVelocity)?(M.RUN_SPEED-M.WALK_SPEED)/P.RUN_RAMP:move&&Math.sign(targetV)===Math.sign(hero.moveVelocity||targetV)?3500:4500;
 hero.moveVelocity+=Math.max(-accel*dt,Math.min(accel*dt,targetV-hero.moveVelocity));
 hero.vx=hero.moveVelocity;motion.running=running;const oldX=hero.x;
 if(move&&(!hero.attack||C.canMoveCancel(hero.attack)))hero.dir=move>0?'right':'left';
 if(hero.dash>0){
  if(hero.dashKind==='move'&&(!move||Math.sign(move)!==Math.sign(hero.dashVelocity)||hero.stun>0)){hero.dash=0;}
  else{hero.dash=Math.max(0,hero.dash-dt);hero.vx=hero.dashKind==='move'?P.dashSpeed(hero.dashStartVelocity,hero.dashVelocity*(hero.rootSlow>0?.65:1),targetV,P.DASH_TIME-hero.dash):hero.dashVelocity;
   if(hero.dashKind==='move')hero.moveVelocity=hero.vx;
   hero.dashDust-=dt;if(hero.grounded&&hero.dashDust<=0&&Math.abs(hero.vx)>M.RUN_SPEED){hero.dashDust=.06;burst(hero.x,hero.y-3,2,'#b2c1a8',-Math.sign(hero.vx));}
  }
 }
 motion.runBlend=running?P.runBlend(hero.vx,M.WALK_SPEED,M.RUN_SPEED):0;
 hero.vx+=hero.knock;hero.knock*=Math.exp(-12*dt);
 hero.x=Math.max(24,Math.min(E.limit(scene.waves,scene.width),hero.x+hero.vx*dt));const oldY=hero.y,oldVy=hero.vy;Object.assign(hero,P.verticalStep(hero.y,hero.vy,dt));hero.grounded=false;
 if(scene.sourceMap){SW.move(scene,hero,oldX,oldY,dt,{grounded:wasGrounded&&oldVy>=0,height:B.PLAYER_HEIGHT,drop:hero.dropUntil>t});if((keys.has('ArrowUp')||keys.has('ArrowDown'))&&!hero.attack&&SW.climb(scene,hero,keys.has('ArrowUp')?-1:1,dt)){hero.jumpCount=0;hero.coyote=.12;}}
 else{ // Raised solid shelves have sides; one-way wooden branches remain jump-through.
 if(scene.terrain&&L.groundAt(scene,hero.x)<L.groundAt(scene,oldX)-2&&hero.y>L.groundAt(scene,hero.x)+2){hero.x=oldX;hero.vx=0;}
 if(hero.vy>=0){let floor=L.groundAt(scene,hero.x);for(const plat of scene.platforms)if(hero.x>plat.x-10&&hero.x<plat.x+plat.width+10&&oldY<=plat.y+2&&hero.y>=plat.y&&!(hero.dropUntil>t))floor=Math.min(floor,plat.y);if(hero.y>=floor){hero.y=floor;hero.vy=0;hero.grounded=true;if(!wasGrounded&&oldVy>160){hero.landPulse=.085;S.play('land');burst(hero.x,hero.y-2,7,'#b8c7ac',0);}}}}

 if(hero.attack){const a=hero.attack,before=a.time;a.time+=dt;
  if(hero.grounded&&a.lunge){const nextX=Math.max(24,Math.min(E.limit(scene.waves,scene.width),hero.x+(a.dir==='right'?1:-1)*(C.lungeAt(a,a.time)-C.lungeAt(a,before))));if(scene.sourceMap){const ox=hero.x;hero.x=nextX;SW.move(scene,hero,ox,hero.y,0,{grounded:hero.grounded,height:B.PLAYER_HEIGHT});}else if(!scene.terrain||hero.y<=L.groundAt(scene,nextX)+2)hero.x=nextX;}
  for(const event of a.hitEvents){if(!event.released&&C.crossed(before,a.time,event.at)){event.released=true;releaseAttack(event);}else if(event.released&&p.cls==='warrior'&&a.time<=event.at+event.active){if(a.skill>=0)skillMeleeHit(event);else meleeHit(event);}}
  a.hit=a.hitEvents.every(event=>event.released);if(a.time>=a.duration)hero.attack=null;}
 if(!C.isBuffered(inputBuffer,t))inputBuffer=null;
 if(inputBuffer&&canStartAttack(inputBuffer.skill)&&startAttack(inputBuffer.skill))inputBuffer=null;
 else if(!inputBuffer&&keys.has('KeyJ')&&canStartAttack())startAttack();
 motion.clock+=dt;Object.assign(motion,{travel:hero.x-oldX,vx:hero.vx,vy:hero.vy,grounded:hero.grounded,attack:hero.attack,stun:hero.stun,land:hero.landPulse,jumpSerial:hero.jumpSerial,dir:hero.dir});
 M.advance(motion,p.cls,dt);hero.animAction=motion.action;hero.animTime+=dt;
 camera+=(Math.max(0,Math.min(scene.width-W,hero.x-W*.43))-camera)*(1-Math.exp(-dt*12));if(scene.sourceMap)cameraY+=(Math.max(0,Math.min(scene.height-H,hero.y-H*.72))-cameraY)*(1-Math.exp(-dt*6));
}
function updateWaves(dt){if(!scene.waves)return;if(scene.sourceMap&&[10,13].includes(scene.id)&&scene.waves.index>=scene.waves.waves.length-1&&musicKey!=='music6')syncMusic('music6');E.step(scene.waves,dt,hero.x,enemies,member=>{const place=scene.sourceMap?SW.spawn(scene,member.type,Math.max(scene.waves.waves[scene.waves.index].left+45,Math.min(scene.waves.waves[scene.waves.index].boundary-60,hero.x+(member.serial%2?-1:1)*(330+member.serial%3*65))),member.category,hero.y):L.spawn(scene,member.type,member.x,member.category);spawnEnemy(member.type,place.x??member.x,place.y,member.category,scene.id,{...place,waveId:member.waveId,spawnTime:member.spawnTime});logCombat({type:'waveSpawn',wave:member.waveId,target:member.type,time:t});});if(scene.sourceMap&&scene.waves.phase==='complete'&&!scene.rewarded){scene.rewarded=true;const result=SW.clear(p,scene.id);if(result.first){p.gold+=50+(scene.rank||1)*12;gainXP(35+(scene.rank||1)*10);}toast(result.added.length?'道路已开放：'+result.added.map(n=>SW.info(n).name).join('、'):'本关已通过');save();}}

function beginEnemyAttack(e){
 if(N.supported(e)){N.begin(e,hero);logCombat({type:'enemyWindup',target:e.type,time:t,hitAt:e.hitAt,kind:e.eliteMove.key});return;}
 e.state='attack';e.attackTimer=0;e.hit=false;e.followHit=false;e.targetX=hero.x;e.targetY=hero.y;e.dir=hero.x>e.x?'right':'left';
 e.attackKind=e.category==='boss'?R.randint(1,3):e.category==='elite'?R.randint(1,2):1;e.animTime=0;
 e.hitAt=e.category==='boss'?e.attackKind===3?.8:.65:e.category==='elite'?.58:e.type==='wolf'?.34:.46;
 const recovery=e.category==='boss'?.72:e.category==='elite'?.62:e.type==='wolf'?.4:.48;
 if(e.enraged)e.hitAt*=.85;e.attackDuration=e.hitAt+recovery;
 logCombat({type:'enemyWindup',target:e.type,time:t,hitAt:e.hitAt,kind:e.attackKind});
}
function enemyStrike(e,follow=false){e.hit=true;const dir=e.dir==='right'?1:-1;
 if((e.type==='goblin'||e.type==='stone_chief')||e.type==='ancient_tree'&&e.attackKind===2){const dx=e.targetX-e.x,dy=(e.targetY-60)-(e.y-90),vx=Math.sign(dx||dir)*(e.category==='normal'?390:430),travel=Math.max(.25,Math.abs(dx)/Math.abs(vx));shots.push({enemy:true,x:e.x+dir*25,y:e.y-90,vx,vy:dy/travel-180*travel,gravity:360,life:3,damage:e.atk,type:e.category==='normal'?'stone_projectile':'boulder_projectile'});}
 else if(e.type==='ancient_tree'&&e.attackKind===3){shots.push({enemy:true,area:true,x:e.targetX,y:L.groundAt(scene,e.targetX),radius:100,warning:.48,life:1.35,damage:e.atk*1.15,type:'root_area'});}
 else{const range=e.category==='boss'?195:e.category==='elite'?135:e.type==='wolf'?100:75;if(Math.abs(hero.x-e.x)<range&&(hero.x-e.x)*dir>-24&&Math.abs(hero.y-e.y)<60)hurtHero(e.atk*(e.attackKind===2?1.12:1),e.x);effect(e.category==='normal'?'sword_impact':'slam_wave',e.x+dir*50,e.y-15,e.category==='boss'?1.5:.8,dir);if(e.category!=='normal')feedback(0,e.category==='boss'?3.6:1.8);}
 logCombat({type:'enemyStrike',target:e.type,time:t,follow});
}
function updateEnemies(dt){for(const e of enemies){
 e.exposed=Math.max(0,(e.exposed||0)-dt);e.animTime+=dt;e.hurt=Math.max(0,e.hurt-dt);e.flash=Math.max(0,e.flash-dt);
 if(e.hurt<=.14)e.hpTrail=Math.max(e.hp,e.hpTrail-(e.hpTrail-e.hp)*(1-Math.exp(-dt*8)));
 if(e.state==='death'){e.dead-=dt;if(scene.practice&&e.dead<=0){N.reset(e);Object.assign(e,{hp:e.maxHp,hpTrail:e.maxHp,x:e.home,state:'idle',stun:0,knock:0,hurt:0,flash:0,freeze:0,slow:0,aware:false,alert:0});}continue;}
 if(scene.sourceMap&&SE.supported(e)){SE.update(e,dt,{hero,enemies,move:(...a)=>SW.move(scene,...a),ladder:(x,y)=>SW.ladder(scene,x,y),floor:(x,y)=>SW.safeSurface(scene,x,y).y,hurt:hurtHero,hazard:h=>enemyHazards.push(h),number:damageNumber,effect:(x,y,big)=>effect(big?'slam_wave':'sword_impact',x,y,big?.8:.4),projectile:(enemy,dir,sourceFx)=>shots.push({enemy:true,x:enemy.x+dir*30,y:enemy.y-55,vx:dir*240,vy:0,gravity:0,life:2.1,damage:enemy.atk,type:'stone_projectile',sourceFx:sourceFx||SW.D.enemies[enemy.type].skillObj?.sName||({b2:'s2mc',b4:'s5mc',b6:'s6mc'}[enemy.type])}),summon:(enemy,type,count)=>{for(let i=0;i<count;i++){const at=SW.spawn(scene,type,enemy.x+(i-(count-1)/2)*100,'normal',enemy.y);spawnEnemy(type,at.x,at.y,'normal',scene.id,{...at,waveId:enemy.waveId,spawnTime:.5});}}});continue;}
 if(e.spawnTime>0){e.spawnTime=Math.max(0,e.spawnTime-dt);continue;}
 e.slow=Math.max(0,e.slow-dt);if(e.slow===0)e.slowRatio=0;if(e.freeze>0){e.freeze=Math.max(0,e.freeze-dt);continue;}
 e.x=Math.max(e.patrolMin,Math.min(e.patrolMax,e.x+e.knock*dt));e.knock*=Math.exp(-10*dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;
 if(scene.practice){e.state='idle';continue;}
 if(N.transition(e,hero)){enemyHazards=enemyHazards.filter(h=>h.owner!==e);toast('腐果古树 · 腐根苏醒',true);feedback(0,3);logCombat({type:'enrage',target:e.type,time:t});}
 e.cooldown-=dt;
 if(e.alert>0){e.alert=Math.max(0,e.alert-dt);e.state='alert';if(e.alert===0){e.aware=true;e.state='idle';}continue;}
 if(!e.aware){
  if(scene.age>.75&&L.canDetect(e,hero.x,hero.y)){e.alert=e.category==='boss'?.5:.32;e.dir=hero.x>e.x?'right':'left';e.animTime=0;logCombat({type:'enemyAlert',target:e.type,time:t});continue;}
  // Gentle patrols stay close to home and do not drift toward the spawn point.
  e.timer-=dt;const nearMin=Math.max(e.patrolMin,e.home-32),nearMax=Math.min(e.patrolMax,e.home+32);
  if(e.timer<=0){e.timer=1.2+Math.random()*1.3;e.dir=e.dir==='left'?'right':'left';}
  if(e.category==='normal'){e.state='move';e.x=Math.max(nearMin,Math.min(nearMax,e.x+(e.dir==='right'?1:-1)*e.moveSpeed*.18*dt));}else e.state='idle';
  continue;
 }
 if(!L.inLeash(e,hero.x)&&e.state!=='attack'){
  const delta=e.home-e.x;e.state=Math.abs(delta)>4?'move':'idle';e.dir=delta>0?'right':'left';e.x+=Math.sign(delta)*Math.min(Math.abs(delta),e.moveSpeed*dt);
  if(Math.abs(delta)<5){e.aware=false;e.cooldown=.45;}continue;
 }
 if(e.state==='attack'){
  if(e.eliteMove){const events=N.step(e,dt,{hero,min:0,max:scene.width,groundAt:x=>L.groundAt(scene,x),half:e=>B.body(e).half});
   for(const event of events){if(event.kind==='contact')hurtHero(event.damage,event.x);else if(event.kind==='recovery'||event.kind==='opening')logCombat({type:'enemyRecovery',target:e.type,time:t});else{enemyHazards.push(event);if(event.warning===0){S.play('land');feedback(0,e.category==='boss'?2:1.2);}logCombat({type:'enemySkill',target:e.type,kind:event.kind,time:t});}}
   continue;
  }
  e.attackTimer+=dt;
  if((e.type==='wolf'||e.type==='boar'&&e.attackKind===1)&&e.attackTimer>=e.hitAt-.15&&e.attackTimer<e.hitAt+.08)e.x=Math.max(e.patrolMin,Math.min(e.patrolMax,e.x+(e.dir==='right'?1:-1)*(e.type==='wolf'?320:440)*(e.slow>0?1-(e.slowRatio||.6):1)*dt));
  if(!e.hit&&e.attackTimer>=e.hitAt)enemyStrike(e);
  const double=e.attackKind===2&&(e.category==='elite'||e.category==='boss'&&e.enraged);
  if(double&&!e.followHit&&e.attackTimer>=e.hitAt+.27){e.followHit=true;enemyStrike(e,true);}
  if(e.attackTimer>=e.attackDuration){e.state='idle';e.cooldown=(e.category==='normal'?.45:.32)*(e.enraged?.65:1);e.animTime=0;}
  continue;
 }
 e.dir=hero.x>e.x?'right':'left';const dist=Math.abs(hero.x-e.x),dy=Math.abs(hero.y-e.y);
 if(L.inLeash(e,hero.x)){const ranged=['goblin','stone_chief'].includes(e.type),range=N.supported(e)?N.range(e):ranged?300:e.type==='wolf'?125:85;
  if(dist<range&&e.cooldown<=0&&dy<230)beginEnemyAttack(e);
  else if(ranged&&dist<150){e.state='move';e.x-=(hero.x>e.x?1:-1)*e.moveSpeed*.65*(e.slow>0?1-(e.slowRatio||.6):1)*dt;}
  else if(dist>range*.7){e.state='move';e.x+=(hero.x>e.x?1:-1)*e.moveSpeed*(e.slow>0?1-(e.slowRatio||.6):1)*dt;}else e.state='idle';
 }else e.state='idle';
 e.x=Math.max(e.patrolMin,Math.min(e.patrolMax,e.x));
}}
function updateShots(dt){for(const pending of pendingShots)pending.delay-=dt;for(const pending of pendingShots.filter(x=>x.delay<=0))shots.push(pending.shot);pendingShots=pendingShots.filter(x=>x.delay>0);
 for(const shot of shots){shot.age=(shot.age||0)+dt;shot.life-=dt;if(shot.life<=0)continue;if(shot.area){shot.warning-=dt;if(shot.warning<=0&&Math.abs(hero.x-shot.x)<shot.radius&&Math.abs(hero.y-shot.y)<35)hurtHero(shot.damage,shot.x);continue;}
  const from={x:shot.x,y:shot.y},step=Math.min(Math.abs(shot.vx*dt),shot.remaining??Infinity);shot.x+=Math.sign(shot.vx)*step;shot.vy+=(shot.gravity||0)*dt;shot.y+=shot.vy*dt;
  if(shot.enemy){if(scene.sourceMap&&B.blocked(scene,from,{x:shot.x,y:shot.y})){shot.life=0;continue;}if(Math.abs(hero.x-shot.x)<14&&shot.y>hero.y-B.PLAYER_HEIGHT+5&&shot.y<hero.y+3){hurtHero(shot.damage,shot.x);shot.life=0;}continue;}
  shot.remaining-=Math.hypot(shot.x-from.x,shot.y-from.y);
  const to={x:shot.x,y:shot.y};if(!B.inShotView(shot,camera,W)||B.blocked(scene,from,to)){shot.life=0;continue;}
  const targets=enemies.filter(e=>targetable(e)&&!shot.hitIds.has(e)&&B.visible(e,camera,W)&&B.intersects(from,to,e)).sort((a,b)=>Math.abs(a.x-from.x)-Math.abs(b.x-from.x));
  for(const e of targets){shot.hitIds.add(e);hurtEnemy(e,shot.damage*(e.category==='normal'?1:activeStats().boss),shot.control||(shot.slowRatio?'normalSlow':null),shot.feel,shot.damageFraction||1);
   if(shot.orb){
    skillEffect(shot.slowRatio?'orb-frost':'orb-soft',e.x,e.y-42,{radius:shot.aoe||28,life:shot.slowRatio?.42:.32,dir:Math.sign(shot.vx)});
    if(shot.manaOnHit&&!shot.manaReturned&&shot.ownerId===p.id){shot.manaReturned=true;const before=hero.mp;hero.mp=Math.min(activeStats().mp,hero.mp+shot.manaOnHit);logCombat({type:'manaReturn',id:shot.feel.id,amount:hero.mp-before,time:t});}
   }
   if(shot.aoe){
    for(const other of enemies)if(other!==e&&!shot.hitIds.has(other)&&targetable(other)&&B.visible(other,camera,W)&&Math.abs(other.x-e.x)<shot.aoe&&Math.abs(other.y-e.y)<65&&!B.blocked(scene,{x:e.x,y:e.y-40},{x:other.x,y:other.y-40})){
     shot.hitIds.add(other);hurtEnemy(other,shot.damage*(shot.skillKind==='fire'?1:shot.splashFraction??.6)*(other.category==='normal'?1:activeStats().boss),shot.control||(shot.slowRatio?'normalSlow':null),shot.feel,shot.damageFraction||1);
    }
    if(shot.skillKind==='fire'){skillEffect('fire',e.x,e.y-40,{radius:100,life:.6});S.play('fireBlast');}else if(!shot.orb)effect('mage_skill',e.x,e.y-60,.8);
   }
   if(!shot.pierce){shot.life=0;break;}
  }
  if(shot.remaining<=0)shot.life=0;
 }shots=shots.filter(x=>x.life>0&&x.x>-200&&x.x<scene.width+200);
}
function updateEnemyHazards(dt){
 const token=sceneSerial,next=N.stepHazards(enemyHazards,dt,hero,{groundAt:(x,y)=>scene.sourceMap?SW.safeSurface(scene,x,y).y:L.groundAt(scene,x),hurt:(amount,x)=>{const before=hero.hp;hurtHero(amount,x);return hero.hp<before;},slow:duration=>{hero.rootSlow=Math.max(hero.rootSlow||0,duration);},impact:h=>{S.play(h.kind==='fruit'?'fireBlast':'land');feedback(0,h.owner.category==='boss'?2.8:1.5);burst(h.x,h.y-4,6,h.kind==='root'?'#a7c778':'#e7be7e',0);}});
 enemyHazards=token===sceneSerial?next:[];
}
function sheetFrame(record,n){const key=record.sheet+':'+n;if(!sheetFrameCache.has(key)){const im=cachedImage(record.sheet);if(!im)return null;const sz=record.canvas?.[0]||320,cols=record.sheet_columns||8,frame=document.createElement('canvas');frame.width=frame.height=sz;frame.getContext('2d',{willReadFrequently:true}).drawImage(im,n%cols*sz,Math.floor(n/cols)*sz,sz,sz,0,0,sz,sz);sheetFrameCache.set(key,frame);if(sheetFrameCache.size>320)sheetFrameCache.delete(sheetFrameCache.keys().next().value);}return sheetFrameCache.get(key);}
function flashFrame(record,n){const key=record.sheet+':'+n;if(!flashFrameCache.has(key)){const source=sheetFrame(record,n);if(!source)return null;const frame=document.createElement('canvas');frame.width=source.width;frame.height=source.height;const c=frame.getContext('2d');c.drawImage(source,0,0);c.globalCompositeOperation='source-atop';c.fillStyle='rgba(255,250,226,.72)';c.fillRect(0,0,frame.width,frame.height);flashFrameCache.set(key,frame);}return flashFrameCache.get(key);}
function drawSheet(c,record,x,y,scale,ms,fi=null,flash=false){const n=fi===null?frameAt(record,ms):fi,frame=flash?flashFrame(record,n):sheetFrame(record,n);if(!frame)return;const sz=frame.width;c.drawImage(frame,x-(record.pivot?.[0]||160)*scale,y-(record.pivot?.[1]||256)*scale,sz*scale,sz*scale);}
function drawSweep(fx){
 const progress=Math.min(1,fx.time/fx.life),reverse=fx.combo===1&&fx.skill<0,heavy=fx.combo===2||fx.skill>=0;
 const ease=1-Math.pow(1-progress,3),radius=Math.min(fx.range*.68,heavy?101:82),width=heavy?19:12;
 const angle=reverse?1.1-ease*2.15:-1.25+ease*(heavy?2.8:2.2),span=(heavy?2:1.5)*(1-progress*.45),flat=heavy?.63:.85;
 const alpha=Math.pow(1-progress,1.3);ctx.save();ctx.translate(fx.x,fx.y);ctx.scale(fx.dir,1);ctx.rotate(heavy?-.14:.04);
 function crescent(r,w,lag,color,opacity){ctx.globalAlpha=alpha*opacity;ctx.fillStyle=color;ctx.beginPath();const front=angle+lag;
  for(let i=0;i<=22;i++){const a=front+(reverse?1:-1)*span*(1-i/22),rr=r-(1-i/22)*7;const x=Math.cos(a)*rr,y=Math.sin(a)*rr*flat;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  for(let i=22;i>=0;i--){const a=front+(reverse?1:-1)*span*(1-i/22),thick=w*Math.sin(i/22*Math.PI*.85),rr=r-7*(1-i/22)-thick;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*flat);}ctx.closePath();ctx.fill();
 }
 // One directional fan with a short bright cutting edge; recovery leaves only thin streaks.
 crescent(radius+5,width+8,reverse?.18:-.18,heavy?'#cf9a4c':'#68a6a4',.23);
 crescent(radius,width,0,heavy?'#edbe66':'#a6dcce',.82);
 crescent(radius-1,width*.3,0,'#fff5d2',progress<.38?1:.62);
 for(let j=0;j<3;j++){ctx.globalAlpha=alpha*(.52-j*.13);ctx.strokeStyle=heavy?'#f6cf83':'#cbead8';ctx.lineWidth=j===0?2:1;ctx.beginPath();const r=radius-12-j*8;for(let i=0;i<=10;i++){const a=angle+(reverse?1:-1)*(.18+i/10*(span*.7)),x=Math.cos(a)*r,y=Math.sin(a)*r*flat;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
 if(progress<.45){ctx.globalAlpha=alpha;ctx.fillStyle='#fff7d6';const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*flat;ctx.fillRect(Math.round(x)-2,Math.round(y)-2,heavy?5:3,heavy?5:3);ctx.fillStyle=heavy?'#f4ca78':'#b8e6d6';for(let i=0;i<3;i++){const a=angle+(i-1)*.4,r=radius+8+progress*(28+i*11);ctx.fillRect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r*flat),2,2);}}
 ctx.restore();
}

function drawOrb(shot){MageOrbEffects.projectile(ctx,shot);}

function drawWaveArrival(){
 if(!scene.waves)return;const state=scene.waves;
 for(const member of E.pending(state)){const y=L.groundAt(scene,member.x),q=1-state.timer/E.WARNING;ctx.fillStyle='#263f3560';ctx.beginPath();ctx.ellipse(member.x,y+1,28+q*15,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c5d2a870';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(member.x,y-2,32+Math.sin(t*12)*3,7,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a9bca380';for(let i=0;i<4;i++)ctx.fillRect(member.x-20+i*13,y-10-q*(10+i*7),3,3);}
 if(state.phase!=='complete'){const x=E.limit(state,scene.width),y=L.groundAt(scene,x);ctx.strokeStyle='#657647b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-11,y+3);ctx.lineTo(x-5,y-17);ctx.lineTo(x+5,y-27);ctx.lineTo(x+2,y-4);ctx.moveTo(x-5,y-17);ctx.lineTo(x-15,y-25);ctx.stroke();}
}
function drawEnemyHealthBar(c,e,body){
 const width=e.category==='boss'?125:75,height=6,x=e.x-width/2,y=e.y-body.height-12;
 const ratio=value=>Math.max(0,Math.min(1,Number.isFinite(value)&&e.maxHp>0?value/e.maxHp:0));
 c.save();c.beginPath();c.roundRect(x,y,width,height,height/2);c.fillStyle='#173036e8';c.fill();c.clip();
 c.fillStyle='#e9ae73';c.fillRect(x,y,width*ratio(e.hpTrail),height);
 c.fillStyle=e.category==='normal'?'#c6cd9c':'#e3b56b';c.fillRect(x,y,width*ratio(e.hp),height);
 c.fillStyle='#fff4d52b';c.fillRect(x,y,width*ratio(e.hp),1.3);c.restore();
 c.save();c.beginPath();c.roundRect(x,y,width,height,height/2);c.strokeStyle='#c9bb883d';c.lineWidth=.8;c.stroke();c.restore();
}
function drawScene(){ctx.clearRect(0,0,W,H);if(!scene){ctx.fillStyle='#224149';ctx.fillRect(0,0,W,H);return;}ctx.save();const offset=CameraDamping.offset(shakeTime,.14,shake,performance.now()/1000);ctx.translate(-camera+offset.x,-cameraY+offset.y);ctx.imageSmoothingEnabled=false;
 if(scene.id===0){ctx.imageSmoothingEnabled=true;ctx.drawImage(scene.image,0,0,scene.width,H);TownNPCs.drawScene(ctx,scene.npcs||[],t,hero);ctx.imageSmoothingEnabled=false;}
 else{if(scene.sourceMap)SW.draw(ctx,scene,camera,cameraY,cachedImage);else if(scene.terrain)ForestRenderer.draw(ctx,scene,camera,t,p.unlocked>scene.id||scene.id===4&&p.regionComplete);else if(scene.background)ctx.drawImage(scene.background,0,0);else{ctx.fillStyle='#72afb6';ctx.fillRect(camera,0,W,H);}}
 ctx.fillStyle='#142c3180';ctx.beginPath();ctx.ellipse(hero.x,hero.y+2,14,3,0,0,Math.PI*2);ctx.fill();
 drawWaveArrival();
 for(const e of enemies){if(e.state==='death'&&e.dead<=0)continue;const action=e.state==='attack'?(e.category==='normal'?'attack':'attack_0'+e.attackKind):e.state==='death'?'death':e.hurt>0?'hurt':e.state==='move'?'move':'idle';const rec=enemyIndex.get(`${e.type}.${action}.${e.dir}`)||enemyIndex.get(`${e.type}.idle.${e.dir}`);const body=B.body(e),scale=body.scale;
  ctx.fillStyle='#142b2759';ctx.beginPath();ctx.ellipse(e.x,e.y+2,body.width*.3,4,0,0,Math.PI*2);ctx.fill();
  if(e.freeze>0||e.slow>0){ctx.strokeStyle=e.freeze>0?'#b1e7fab0':'#80c9e2b0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y-3,body.width*.35,5,0,0,Math.PI*2);ctx.stroke();}
  F.status(ctx,e,body,t);NF.status(ctx,e,body,t);NF.telegraph(ctx,e,body,t);
  if(e.alert>0){ctx.fillStyle='#f6d08b';ctx.font='bold 19px "PingFang SC"';ctx.textAlign='center';ctx.fillText('!',e.x,e.y-body.height-25);}
  if(e.state==='attack'&&!e.hit&&!N.supported(e)){ctx.fillStyle='#ebba4b55';ctx.strokeStyle='#f8d05d';ctx.lineWidth=2;const radius=e.category==='boss'?e.attackKind===3?92:210:e.category==='elite'?155:85,at=e.type==='ancient_tree'&&e.attackKind===3?e.targetX:e.x;ctx.fillRect(at-radius,e.y-10,radius*2,10);ctx.strokeRect(at-radius,e.y-10,radius*2,10);ctx.fillStyle='#ffe4a3';ctx.font='bold 22px "PingFang SC"';ctx.textAlign='center';ctx.fillText('!',e.x,e.y-body.height-25);}
  const progress=SE.supported(e)?null:e.state==='attack'?(C.pose({cls:'enemy',skill:0,combo:0,duration:e.attackDuration,hitAt:e.hitAt,active:.12},e.attackTimer,rec.frame_count,rec.events?.[0]?.frame??Math.floor(rec.frame_count*.58))+.001)/rec.frame_count:e.state==='death'?Math.min(.999,1-e.dead/.85):e.hurt>0?Math.min(.999,1-e.hurt/.24):null;
  const recoil=C.recoil(e.hurt,e.impactHeavy,e.category,e.impactDir);ctx.save();ctx.translate(e.x,e.y);if(e.state==='death')ctx.globalAlpha=Math.min(1,e.dead/.25);if(e.spawnTime>0){const arrival=1-e.spawnTime/E.EMERGE;ctx.globalAlpha=arrival;ctx.translate(0,(1-arrival)*16);}ctx.translate(0,-recoil.lift);ctx.rotate(recoil.angle);ctx.scale(recoil.sx,recoil.sy);if(!(SE.supported(e)?SE.draw(ctx,e):WoodlandEnemies.draw(ctx,e,body)))drawSheet(ctx,rec,0,0,scale,e.animTime*1000,progress===null?null:Math.floor(progress*rec.frame_count),e.flash>0);ctx.restore();
  if(e.state!=='death'&&(scene.practice||e.aware||e.alert>0||e.category!=='normal')){drawEnemyHealthBar(ctx,e,body);if(e.trainingLabel&&e.category==='normal'){ctx.fillStyle='#d0d9b4';ctx.font='11px \"PingFang SC\"';ctx.textAlign='center';ctx.fillText(e.trainingLabel,e.x,e.y-body.height-20);}if(e.category!=='normal'){ctx.fillStyle='#f0d696';ctx.font='12px "PingFang SC"';ctx.textAlign='center';ctx.fillText(e.category==='boss'?(e.enraged?'区域Boss · 震怒':'区域Boss'):'精英',e.x,e.y-body.height-20);}}
 }
 for(const hazard of enemyHazards){if(hazard.sourceFx&&hazard.warning<=0)SE.drawEffect(ctx,hazard.sourceFx,hazard.x,hazard.y,Math.max(0,-hazard.warning),hazard.radius*3,hazard.dir||1,hazard.kind==='wave');else NF.hazard(ctx,hazard);}
 for(const shot of shots){if(shot.area){ctx.fillStyle=shot.warning>0?'#f1c05288':'#d7ad6977';ctx.fillRect(shot.x-shot.radius,shot.y-8,shot.radius*2,8);if(shot.warning<=0){const fx=fxIndex.get(shot.type);drawSheet(ctx,fx,shot.x,shot.y-22,.85,(t*1000)%500);}continue;}if(shot.sourceFx){SE.drawEffect(ctx,shot.sourceFx,shot.x,shot.y,shot.age,80,shot.vx>=0?1:-1,true);continue;}if(shot.skillKind){F.projectile(ctx,shot);continue;}if(shot.orb){drawOrb(shot);continue;}const fx=fxIndex.get(shot.type);if(fx){ctx.save();ctx.translate(shot.x,shot.y);if(shot.vx<0)ctx.scale(-1,1);drawSheet(ctx,fx,0,0,shot.enemy?.5:.4,t*1000);ctx.restore();}}
 if(p){
  ctx.globalAlpha=hero.invuln>0&&Math.floor(t*20)%2?.6:1;
  if(p.cls==='mage'&&hero.attack&&hero.attack.skill<0&&hero.attack.time<hero.attack.hitAt){const a=hero.attack,charge=Math.min(1,a.time/a.hitAt),hand=FullFrameMotion.muzzle(p,{...motion,action:'attack',attack:a},hero.x,hero.y,a.dir);drawOrb({x:hand.x,y:hand.y,vx:0,age:t,charge,slowRatio:a.combo===2?.3:0});}
  if(hero.attack?.skill>=0){const hand=FullFrameMotion.muzzle(p,{...motion,action:'attack',attack:hero.attack},hero.x,hero.y,hero.attack.dir);F.charge(ctx,hero.attack,hero,hand);}
  const dir=hero.attack?.dir||hero.dir,pose=motion.pose||M.base(p.cls);
  if(!M.draw(ctx,p,pose,hero.x,hero.y,M.SCALE,dir,motion))drawCharacter(ctx,p,'idle',dir,hero.x,hero.y,M.SCALE,hero.animTime*1000);
  ctx.globalAlpha=1;ctx.textAlign='center';ctx.font='12px "PingFang SC"';ctx.fillStyle='#f9e8bf';ctx.strokeStyle='#18343a';ctx.lineWidth=3;
  ctx.strokeText(p.name,hero.x,hero.y-B.PLAYER_HEIGHT-12);ctx.fillText(p.name,hero.x,hero.y-B.PLAYER_HEIGHT-12);
 }
 for(const fx of skillFx){if(fx.kind==='orb-soft'||fx.kind==='orb-frost')MageOrbEffects.impact(ctx,fx);else F.draw(ctx,fx);}
 for(const fx of sweeps)drawSweep(fx);
 for(const fx of vfx){const rec=fxIndex.get(fx.id);if(rec){ctx.save();ctx.translate(fx.x,fx.y);ctx.scale(fx.dir,1);drawSheet(ctx,rec,0,0,fx.scale,fx.time*1000);ctx.restore();}}
 for(const d of drops){const im=cachedImage(icons[d.item.icon]);if(im){ctx.globalAlpha=Math.max(0,1-d.time/2);ctx.drawImage(im,d.x-18,d.y-30-d.time*20,36,36);ctx.globalAlpha=1;}}
 for(const part of particles){ctx.globalAlpha=Math.min(1,part.life/part.max);ctx.fillStyle=part.color;ctx.fillRect(Math.round(part.x),Math.round(part.y),part.size,part.size);}ctx.globalAlpha=1;
 for(const n of numbers){ctx.globalAlpha=Math.max(0,1-n.time/.85);const pop=1+Math.max(0,.12-n.time)*2;ctx.font=`bold ${Math.round((n.heavy?25:20)*pop)}px "PingFang SC"`;ctx.textAlign='center';ctx.strokeStyle='#173039';ctx.lineWidth=3;ctx.strokeText(n.text,n.x,n.y-n.time*60);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y-n.time*60);ctx.globalAlpha=1;}
 if(scene.sourceMap)SW.draw(ctx,scene,camera,cameraY,cachedImage,true);
 if(scene.id!==0){if(!scene.terrain){const im=cachedImage(scene.layers.foreground);if(im)ctx.drawImage(im,0,80);}ctx.fillStyle='#f2d69c';ctx.font='14px "PingFang SC"';ctx.textAlign='center';const exit=scene.exitX||1830;ctx.fillText(scene.practice?'T · 返回城镇':scene.waves?.phase==='complete'?'F · 前往下一站':'击败守关敌人后通行',exit,(scene.sourceMap?scene.exitY:L.groundAt(scene,exit))-120);}
 ctx.restore();
 if(hurtScreen>0){ctx.fillStyle=`rgba(180,53,42,${hurtScreen*.3})`;ctx.fillRect(0,0,W,H);}
}
function updateDock(){if(!p)return;drawUIPortraits(performance.now());$('attackIcon').src=icon(p.equipped.weapon?.icon);$('skillSlots').innerHTML=R.SKILLS[p.cls].map((s,i)=>`<button class="action-slot ${p.skills[i]||scene.practice?'':'locked'}" data-skill="${i}" title="${s.name} · ${s.mp}蓝量 · ${s.cd}秒" aria-label="${s.name} · ${s.desc}"><kbd>${['Q','W','E'][i]}</kbd><img src="${icon(p.cls+'_skill_0'+(i+1))}" alt=""><span>${s.name}${p.skills[i]||scene.practice?'':' · 未学'}</span><i class="cooldown" id="cooldown${i}" hidden></i></button>`).join('');document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{cv.focus();attack(+b.dataset.skill);});}
function updateHUD(){if(!p||!scene)return;const s=currentStats();$('heroName').textContent=p.name+' · '+R.CLASSES[p.cls].name;$('heroLevel').textContent='Lv. '+p.level;$('hpFill').style.width=Math.max(0,hero.hp/s.hp*100)+'%';$('mpFill').style.width=Math.max(0,hero.mp/s.mp*100)+'%';$('hpText').textContent=fmt(Math.max(0,hero.hp))+' / '+fmt(s.hp);$('mpText').textContent=Math.floor(hero.mp)+' / '+fmt(s.mp);$('xpFill').style.width=p.xp/R.xpRequired(p.level)*100+'%';$('goldText').textContent=p.gold;$('pointsText').textContent=p.points?'技能点 ＋'+p.points:'';$('hpCount').textContent='×'+p.potions.hp;$('mpCount').textContent='×'+p.potions.mp;$('areaName').textContent=scene.name+(!scene.sourceMap&&scene.terrain?' · '+L.zoneAt(scene,hero.x):'');$('footerNote').textContent=scene.practice?'练习场 · 无奖励 · 技能可试用':'离线单机 · 自动保存';$('areaGoal').textContent=scene.practice?'连击练习 · QWE试用 · T回城':scene.id===0?'准备装备，启程冒险':scene.waves&&scene.waves.phase!=='complete'?`第 ${scene.waves.index+1} 波 / ${scene.waves.waves.length}`:'前往出口 · F 继续';
 for(let i=0;i<3;i++){const el=$('cooldown'+i);if(el){el.hidden=hero.cooldowns[i]<=0;el.textContent=Math.ceil(hero.cooldowns[i]);}}
 const boss=enemies.find(e=>e.category!=='normal'&&e.state!=='death'&&(scene.practice||e.aware||Math.abs(hero.x-e.x)<520));$('bossBar').hidden=!boss;if(boss){$('bossName').textContent=(SE.names[boss.type]||N.names[boss.type])+(boss.enraged?' · 腐根苏醒':'');$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';}
 let prompt='';const object=scene.sourceMap?WoodlandRoutes.nearby(scene,hero):null;if(object)prompt='F · '+object.label;else if(scene.id===0){const n=TownNPCs.nearest(scene.npcs||[],hero);if(n)prompt='F · 与'+n.name+'交谈';}else if(Math.abs(hero.x-scene.exitX)<85&&Math.abs(hero.y-(scene.exitY||hero.y))<150&&!scene.practice)prompt='F · '+(scene.waves?.phase==='complete'?'继续旅程':'关卡出口');$('interaction').hidden=!prompt;$('interaction').textContent=prompt;
}
function handleAction(action){if(action==='sound'){const on=S.toggle();syncMusic();$('soundToggle').textContent='音效 '+(on?'开':'关');$('soundToggle').setAttribute('aria-pressed',String(on));return;}if(action==='practice'){enterPractice();return;}if(action==='fullscreen'){if(document.fullscreenElement)document.exitFullscreen();else $('stage').requestFullscreen();return;}if(action==='export'){exportSave();return;}if(action==='save'){if(p){const ok=save();toast(ok?'冒险已保存':'保存失败，请导出备份',!ok);}return;}if(action==='characters'){showStart('cover');return;}if(action==='help'){showHelp();return;}if(!p)return;if(action==='inventory')showInventory();if(action==='skills')showSkills();if(action==='map')showMap();if(action==='town'){closePanel();enterScene(0);}if(action==='attack')attack();if(action==='hp')potion('hp');if(action==='mp')potion('mp');cv.focus();}
document.querySelectorAll('.stage-tools [data-action]').forEach(b=>{const names={map:'行路图',inventory:'装备',skills:'技能',town:'回城'},key={map:'M',inventory:'B',skills:'I',town:'T'},sig={map:'map',inventory:'bag',skills:'skills',town:'town'};b.innerHTML=AdventureUI.sigil(sig[b.dataset.action])+`<span>${names[b.dataset.action]}</span><kbd>${key[b.dataset.action]}</kbd>`;});$('closePanel').innerHTML=AdventureUI.sigil('close');document.querySelector('[data-action=fullscreen]').innerHTML=AdventureUI.sigil('fullscreen');
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>handleAction(b.dataset.action));$('closePanel').onclick=closePanel;$('modal').querySelector('.modal-shade').onclick=()=>{if(!['create','characters','reforge-result'].includes(modalType))closePanel();};
$('importSave').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const incoming=AdventureSaves.parse(await file.text()),prior=[...store.characters];const count=AdventureSaves.merge(store,incoming,()=>crypto.randomUUID());if(!persist()){store.characters=prior;throw Error('本地空间不足，未导入');}showStart('load');if(!count)startError('文件中没有角色存档');}catch(err){startError('导入失败：'+err.message);}e.target.value='';};
document.addEventListener('visibilitychange',()=>syncMusic());
window.addEventListener('keydown',e=>{
 if(e.target.matches('input,select,textarea')||e.metaKey||e.ctrlKey)return;
 if(startBusy)return;
 if(['Space','KeyK','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'){closePanel();return;}if(modalType||!p||!ready)return;const wasDown=keys.has(e.code);keys.add(e.code);const dashDir=P.tap(tapState,e.code,performance.now()/1000,e.repeat,wasDown);if(dashDir)startDash(dashDir);if(e.repeat||wasDown)return;
 if(P.isJump(e.code)){
  if((keys.has('ArrowDown')||keys.has('KeyS'))&&hero.grounded&&scene.platforms.some(pl=>hero.x>pl.x-10&&hero.x<pl.x+pl.width+10&&Math.abs(hero.y-pl.y)<2)){hero.dropUntil=t+.22;hero.y+=4;hero.vy=90;hero.grounded=false;hero.coyote=0;hero.jumpCount=2;jumpBuffer=0;}
  else jumpBuffer=t+C.JUMP_BUFFER;
 }
 if(e.code==='KeyJ')attack();if(['KeyQ','KeyW','KeyE'].includes(e.code))attack(['KeyQ','KeyW','KeyE'].indexOf(e.code));
 if(e.code==='Digit1')potion('hp');if(e.code==='Digit2')potion('mp');if(e.code==='KeyF')interact();if(e.code==='KeyB')showInventory();if(e.code==='KeyI')showSkills();if(e.code==='KeyM')showMap();if(e.code==='KeyT')enterScene(0);
});
window.addEventListener('keyup',e=>{keys.delete(e.code);P.release(tapState,e.code);if(P.isJump(e.code)&&!keys.has('KeyK')&&!keys.has('Space')&&hero.vy<0)hero.vy=P.cutJump(hero.vy);});
window.addEventListener('blur',()=>{clearInputs();save();});window.addEventListener('beforeunload',save);
window.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();save();}});
function drawUIPortraits(now){
 if(!p)return;
 for(const [id,x,y,scale] of [['hudPortrait',48,129,.88],['equipmentPreview',160,278,1.55]]){const el=$(id);if(!el||id==='equipmentPreview'&&modalType!=='inventory')continue;const c=el.getContext('2d');c.clearRect(0,0,el.width,el.height);c.imageSmoothingEnabled=false;
 const state={action:'idle',clock:now/1000,grounded:true};if(!M.draw(c,p,M.target(p.cls,state),x,y,scale,'right',state))drawCharacter(c,p,'idle','right',x,y,scale,now);}
}
function tick(now){
 const rawDt=Math.min(.1,(now-last)/1000||.016);last=now;let available=rawDt;
 const playing=ready&&p&&scene&&!modalType&&$('loading').hidden&&!document.hidden;
 if(hitStop>0&&playing){const frozen=Math.min(hitStop,available);hitStop-=frozen;available-=frozen;}
 const STEP=1/120;let simulated=0;
 if(playing){simAccumulator=Math.min(.1,simAccumulator+available);while(simAccumulator>=STEP&&ready&&!modalType&&hitStop<=0){simAccumulator-=STEP;t+=STEP;simulated+=STEP;updateHero(STEP);if(ready){updateEnemies(STEP);if(ready){updateShots(STEP);if(ready)updateEnemyHazards(STEP);if(ready){updateSkillAreas(STEP);updateWaves(STEP);}}}if(!ready)break;}saveTimer+=simulated;if(saveTimer>5){saveTimer=0;save();}}
 else simAccumulator=0;
 const visualDt=modalType?0:rawDt;
 shakeTime=Math.max(0,shakeTime-visualDt);if(shakeTime===0)shake=0;hurtScreen=Math.max(0,hurtScreen-visualDt);
 for(const a of [vfx,numbers,drops])for(const fx of a)fx.time+=visualDt;
 for(const fx of skillFx)fx.time+=simulated;skillFx=skillFx.filter(f=>f.time<f.life);
 for(const fx of sweeps)fx.time+=simulated;sweeps=sweeps.filter(f=>f.time<f.life);
 for(const part of particles){part.life-=visualDt;part.x+=part.vx*visualDt;part.y+=part.vy*visualDt;part.vy+=600*visualDt;}particles=particles.filter(part=>part.life>0);
 vfx=vfx.filter(f=>f.time<.6);numbers=numbers.filter(f=>f.time<.85);drops=drops.filter(f=>f.time<2);if(ready||!p)drawScene();renderTimer+=rawDt;if(ready&&renderTimer>.07){updateHUD();renderTimer=0;}
 if(modalType==='create'&&preview&&$('createPreview')){const c=$('createPreview').getContext('2d');c.clearRect(0,0,320,320);c.imageSmoothingEnabled=false;if(!M.draw(c,preview,M.target(preview.cls,{action:'idle',clock:now/1000,land:0}),160,280,1.65,'right',{action:'idle',clock:now/1000}))drawCharacter(c,preview,'idle','right',160,280,1.7,now);}
 drawUIPortraits(now);
 requestAnimationFrame(tick);
}
function snapshot(){return {ready,camera,cameraY,worldVersion:44,renderer:p?window.WholeFrameCharacter?.inspect(p,motion):null,equipmentPending,scene:scene?.id,npcs:(scene?.npcs||[]).map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,panel:n.panel})),practice:!!scene?.practice,waves:scene?.waves?{index:scene.waves.index,count:scene.waves.waves.length,phase:scene.waves.phase,timer:scene.waves.timer}:null,hitStop,enemyHazards:enemyHazards.map(h=>({kind:h.kind,x:h.x,warning:h.warning,hit:!!h.hit})),skillAreas:skillAreas.length,skillFx:skillFx.map(f=>({kind:f.kind,time:f.time})),particles:particles.length,sweeps:sweeps.length,buffer:inputBuffer,combatLog:combatLog.slice(-40),sound:S.inspect(),hero:{x:hero.x,y:hero.y,vx:hero.vx,vy:hero.vy,running:motion.running,runDir:tapState.runDir,jumpCount:hero.jumpCount,jumpAt:hero.jumpAt,hp:hero.hp,mp:hero.mp,grounded:hero.grounded,dir:hero.dir,attacking:!!hero.attack,attack:hero.attack?{id:hero.attack.id,combo:hero.attack.combo,time:hero.attack.time,hitAt:hero.attack.hitAt,skill:hero.attack.skill}:null,stun:hero.stun,coyote:hero.coyote,invuln:hero.invuln,potionCd:hero.potionCd,cooldowns:hero.cooldowns,animTime:hero.animTime,motion:{action:motion.action,runBlend:motion.runBlend,phase:motion.phase,scale:M.SCALE,pose:motion.pose}},character:p?{name:p.name,cls:p.cls,level:p.level,xp:p.xp,xpRequired:R.xpRequired(p.level),gold:p.gold,openMaps:p.openMaps,clearedMaps:p.clearedMaps,unlocked:p.unlocked,regionComplete:p.regionComplete,skills:p.skills,bag:p.bag.length,materials:p.materials,equipped:p.equipped}:null,enemies:enemies.map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp,state:e.state,category:e.category,slow:e.slow,slowRatio:e.slowRatio||0,spawnTime:e.spawnTime||0,freeze:e.freeze,stun:e.stun,knock:e.knock,hurt:e.hurt,hitAt:e.hitAt,attackTimer:e.attackTimer,enraged:e.enraged,phase:e.phase,guard:e.guard,exposed:e.exposed,move:e.eliteMove?.key,maxHp:e.maxHp,atk:e.atk})),metrics,modal:modalType,assetsLoaded:metrics.images};}
window.Game={build:45,snapshot};$('soundToggle').textContent='音效 '+(S.inspect().enabled?'开':'关');$('soundToggle').setAttribute('aria-pressed',String(S.inspect().enabled));if(new URLSearchParams(location.search).has('qa'))window.Game.qa={enterScene,enterPractice,resetCombatLog:()=>{combatLog.length=0;},spawnItem:(id,q)=>{const i=R.makeItem(id,q);p.bag.push(i);save();return i.uid;},setGold:n=>{p.gold=n;},setMaterials:n=>{p.materials={basic:n,mid:n,high:n};},setHero:(x,y,vy=0)=>{hero.x=x;hero.y=y;hero.vy=vy;hero.grounded=y>=scene.ground||scene.platforms.some(pl=>x>pl.x-10&&x<pl.x+pl.width+10&&Math.abs(y-pl.y)<1);hero.coyote=0;},setVitals:(hp,mp)=>{hero.hp=hp;hero.mp=mp;},grantPoints:n=>{p.points+=n;},step:dt=>{updateHero(dt);updateWaves(dt);updateEnemies(dt);},unlockAll:()=>{p.openMaps=Array.from({length:13},(_,i)=>i+1);p.unlocked=13;},setEnemyHP:n=>enemies.forEach(e=>{e.hp=n;}),killAll:()=>enemies.forEach(killEnemy),showForge,showInventory,save,removeTestCharacters:ids=>{store.characters=store.characters.filter(c=>!ids.includes(c.id));if(p&&ids.includes(p.id))p=null;store.lastId=store.characters[0]?.id||null;save();},getPlayer:()=>p,setEnemy:(i,values)=>Object.assign(enemies[i],values),setEnemies:values=>enemies.forEach(e=>Object.assign(e,values)),gainXP,attack};
async function boot(){await Promise.all([M.load(),WoodlandEnemies.load()]);const im=await img('town_user.webp');scene={id:0,name:'青岚镇',width:im.width*H/im.height,ground:698*H/im.height,image:im,platforms:[],places:[]};$('loading').hidden=true;shopStock=[];showStart('cover');window.gameReady=true;requestAnimationFrame(tick);}
boot().catch(e=>{$('loading').innerHTML='<strong>读取失败</strong><small>'+esc(e.message)+'</small>';});
