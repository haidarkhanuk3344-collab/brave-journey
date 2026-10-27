/* Cover, character selection, and saved journeys are separate destinations. */
let startTab='cover',startSelected=null,startBusy=false,startDraft=null,startPortraitSerial=0;
const START_HAIR_COLORS=[['brown','棕色','#795038'],['gold','金色','#d8bb73'],['violet','紫色','#9274b1']];
const START_SKIN_COLORS=[['peach','浅肤','#f4c69e'],['tan','小麦','#be855c'],['deep','深肤','#86573d']];
function startError(message){$('startError').textContent=message;$('startError').hidden=!message;}
function hideStart(){$('startScreen').hidden=true;document.body.classList.remove('starting');document.querySelector('.game-frame').inert=false;}
function resumeFromStart(){if(startBusy||!p||!ready)return;hideStart();modalType=null;preview=null;clearInputs();cv.focus();}
function backFromStart(){resumeFromStart();}
function showStart(view='cover'){
 if(startBusy)return;
 if(p&&ready)save();clearInputs();modalType='start';$('modal').hidden=true;$('startScreen').hidden=false;document.body.classList.add('starting');startTab=view;startError('');
 const cover=view==='cover';$('startScreen').dataset.view=view;$('startScreen').classList.toggle('is-cover',cover);$('startCover').hidden=!cover;$('startDetails').hidden=cover;
 document.querySelector('.game-frame').inert=true;$('returnGame').hidden=!p||!ready;$('returnGame').onclick=resumeFromStart;
 $('coverNew').onclick=()=>showStart('new');$('coverLoad').onclick=()=>showStart('load');
 $('startScreen').setAttribute('aria-label',cover?'开始游戏':view==='new'?'选择冒险者':'读取旅程');
 $('startViewTitle').textContent=view==='new'?'新的开始':'读取旅程';
 if(cover){preview=null;$('startBody').replaceChildren();$('coverNew').focus({preventScroll:true});}
 else if(view==='new'){renderNewStart();$('createName').focus({preventScroll:true});}
 else{renderSaveStart();($('loadGame').disabled?$('importFile'):$('loadGame')).focus({preventScroll:true});}
}
function showCreate(){showStart('new');}
function showCharacters(){showStart('load');}
function drawStartRole(role){
 const el=$('startPortrait');if(!el||!role)return;
 const token=++startPortraitSerial,candidate={...role,appearance:{...role.appearance},equipped:{...role.equipped}};
 const density=Math.min(3,window.devicePixelRatio||1),w=560,h=600;
 el.width=Math.round(w*density);el.height=Math.round(h*density);
 const c=el.getContext('2d'),state={action:'idle',clock:0,grounded:true};
 c.setTransform(density,0,0,density,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const current=()=>token===startPortraitSerial&&$('startPortrait')===el;
 const paint=()=>{
  if(!current())return;el.removeAttribute('aria-busy');c.clearRect(0,0,w,h);
  c.save();c.translate(280,540);c.scale(1,.16);
  const shadow=c.createRadialGradient(0,0,4,0,0,87);shadow.addColorStop(0,'#183b36a8');shadow.addColorStop(.5,'#24463c60');shadow.addColorStop(1,'#24463c00');
  c.fillStyle=shadow;c.fillRect(-90,-90,180,180);c.restore();
  M.draw(c,candidate,M.target(candidate.cls,state),280,540,2.7,'right',state);
  c.save();c.globalCompositeOperation='source-atop';const light=c.createLinearGradient(0,100,0,550);light.addColorStop(0,'#fff1ce0a');light.addColorStop(.5,'#bddbc604');light.addColorStop(1,'#34534f18');c.fillStyle=light;c.fillRect(0,0,w,h);c.restore();
 };
 if(FullFrameMotion.inspect(candidate,state)?.status==='ready'){paint();return;}
 el.setAttribute('aria-busy','true');c.fillStyle='#edf0ce';c.textAlign='center';c.font='18px sans-serif';c.fillText('读取外观…',280,350);
 prewarm(candidate).then(paint).catch(error=>{if(!current())return;el.removeAttribute('aria-busy');c.clearRect(0,0,w,h);c.fillText('外观读取失败',280,350);startError('外观读取失败：'+error.message);});
}
function startHeroMarkup(role,load=false){return `<aside class="hero-stage"><div class="hero-model"><canvas id="startPortrait" width="560" height="600" aria-label="${load?'存档角色':'角色外观'}预览"></canvas></div>${load?`<div class="journey-identity"><h2>${role?esc(role.name):'旅程待启'}</h2><p>${role?R.CLASSES[role.cls].name+' · Lv. '+role.level:'还没有冒险记录'}</p></div>`:''}</aside>`;}
function classChoices(){return `<div class="platform-classes" role="group" aria-label="选择职业">${Object.entries(R.CLASSES).map(([key,c],i)=>`<button type="button" class="class-medallion ${key===preview.cls?'selected':''}" data-class="${key}" aria-pressed="${key===preview.cls}"><span class="class-emblem" style="--emblem:${i}" aria-hidden="true"></span><span class="class-name">${c.name}</span></button>`).join('')}</div>`;}
function swatches(colors,key,selected){return `<div class="color-swatches" role="group" aria-label="${key==='color'?'发色':'肤色'}">${colors.map(([value,name,color])=>`<button type="button" data-${key}="${value}" title="${name}" aria-label="${name}" aria-pressed="${value===selected}" class="color-swatch ${value===selected?'selected':''}" style="--swatch:${color}"></button>`).join('')}</div>`;}
function renderNewStart(){
 if(!startDraft)startDraft={cls:'warrior',appearance:{gender:'male',hair:'short',color:'brown',skin:'peach'},name:'冒险者'};
 preview=startDraft;preview.appearance=R.normalizeAppearance(preview.appearance);const a=preview.appearance;
 $('startBody').innerHTML=`<div class="platform-create">${startHeroMarkup(preview)}${classChoices()}<div class="platform-options"><div class="stone-rail"><label for="createName">名字</label><input type="text" id="createName" maxlength="12" value="${esc(preview.name)}" autocomplete="off"></div><div class="stone-rail"><span class="rail-label" id="genderLabel">性别</span><div class="gender-picks" role="group" aria-labelledby="genderLabel"><button type="button" data-gender="male" aria-pressed="${a.gender==='male'}" class="${a.gender==='male'?'selected':''}"><span aria-hidden="true">♂</span> 男</button><button type="button" data-gender="female" aria-pressed="${a.gender==='female'}" class="${a.gender==='female'?'selected':''}"><span aria-hidden="true">♀</span> 女</button></div></div><div class="stone-rail"><span class="rail-label" id="hairLabel">发型</span><div class="hair-selector" role="group" aria-labelledby="hairLabel"><button type="button" id="hairPrev" aria-label="上一个发型">‹</button><span id="hairName">${R.HAIRSTYLES[a.gender].find(h=>h.id===a.hair).name}</span><button type="button" id="hairNext" aria-label="下一个发型">›</button></div></div><div class="stone-rail"><span class="rail-label">发色</span>${swatches(START_HAIR_COLORS,'color',a.color)}</div><div class="stone-rail"><span class="rail-label">肤色</span>${swatches(START_SKIN_COLORS,'skin',a.skin)}</div><button class="stone-action" id="createGo">开始冒险</button></div></div>`;
 const update=()=>{preview.name=$('createName').value;drawStartRole(preview);};
 const setAppearance=(key,value)=>{
  if(startBusy)return;const active=document.activeElement,focusId=active?.id,focusChoice=['gender','color','skin'].find(k=>active?.hasAttribute('data-'+k)),focusValue=focusChoice?active.getAttribute('data-'+focusChoice):null;
  update();preview.appearance=R.normalizeAppearance({...preview.appearance,[key]:value});renderNewStart();
  const next=focusId?$(focusId):focusChoice?document.querySelector('[data-'+focusChoice+'="'+focusValue+'"]'):null;next?.focus({preventScroll:true});
 };
 document.querySelectorAll('[data-class]').forEach(b=>b.onclick=()=>{if(startBusy)return;update();preview.cls=b.dataset.class;document.querySelectorAll('[data-class]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});drawStartRole(preview);});
 document.querySelectorAll('[data-gender]').forEach(b=>b.onclick=()=>setAppearance('gender',b.dataset.gender));
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>setAppearance('color',b.dataset.color));
 document.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>setAppearance('skin',b.dataset.skin));
 const hairStep=step=>{const styles=R.HAIRSTYLES[preview.appearance.gender],index=styles.findIndex(h=>h.id===preview.appearance.hair);setAppearance('hair',styles[(index+step+styles.length)%styles.length].id);};
 $('hairPrev').onclick=()=>hairStep(-1);$('hairNext').onclick=()=>hairStep(1);$('createName').oninput=update;
 $('createGo').onclick=async()=>{
  if(startBusy)return;update();startBusy=true;$('createGo').disabled=true;$('createGo').textContent='准备启程…';startError('');
  const previous=p,previousReady=ready,previousLastId=store.lastId,created=R.newCharacter(preview.name,preview.cls,structuredClone(preview.appearance));
  AdventureSaves.stamp(created,null);store.characters.push(created);
  try{
   if(!persist())throw Error('存档未能保存，请先导出备份或释放浏览器空间');
   await StartJourney.travel({source:$('startPortrait'),prepare:()=>Promise.all([prepareCombatAssets(created),img('town_user.webp')]),load:async()=>{await chooseCharacter(created.id);modalType='journey';},arrivalPoint:()=>{const r=cv.getBoundingClientRect();return{x:r.left+(hero.x-camera)/W*r.width,y:r.top+hero.y/H*r.height,width:180,height:220};}});
   startDraft=null;modalType=null;clearInputs();cv.focus();
  }catch(e){
   store.characters=store.characters.filter(c=>c.id!==created.id);store.lastId=previousLastId;p=previous;ready=previousReady;persist();
   startBusy=false;hideStart();showStart('new');startError('启程失败：'+e.message);$('loading').hidden=true;
  }finally{startBusy=false;if($('createGo')){$('createGo').disabled=false;$('createGo').textContent='开始冒险';}}
 };
 drawStartRole(preview);
}
function savedTime(c){return c.savedAt?new Date(c.savedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'已有存档';}
function renderSaveStart(){
 preview=null;const saves=AdventureSaves.sorted(store);
 if(!saves.some(c=>c.id===startSelected))startSelected=saves.find(c=>c.id===store.lastId)?.id||saves[0]?.id||null;
 const selected=saves.find(c=>c.id===startSelected);
 $('startBody').innerHTML=`<div class="platform-load">${startHeroMarkup(selected,true)}<section class="journey-ledger" aria-label="冒险记录"><header><h2>冒险记录</h2><span>${saves.length} 份</span></header><div class="save-list" aria-label="本地存档列表">${saves.length?saves.map(c=>`<button class="journey-slot ${c.id===startSelected?'selected':''}" data-save-id="${esc(c.id)}" aria-pressed="${c.id===startSelected}"><span class="save-class-emblem ${c.cls}" aria-hidden="true"></span><span><strong>${esc(c.name)}</strong><small>${R.CLASSES[c.cls].name} · ${savedTime(c)}</small></span><b>Lv. ${c.level}</b></button>`).join(''):'<div class="save-empty">还没有冒险记录</div>'}</div>${selected?`<div class="journey-progress"><span>${selected.regionComplete?'主线已通关':'探索 '+(selected.openMaps?.length||selected.unlocked)+' / 13'}</span><span>金币 ${selected.gold}</span></div>`:''}<div class="load-actions"><button id="loadGame" class="stone-action">${selected?'继续冒险':'创建冒险者'}</button><button id="deleteSave" class="stone-small danger-text" ${selected?'':'hidden'}>删除</button></div><div id="deleteConfirm" class="delete-confirm" hidden></div><div class="save-file-tools"><button id="importFile">导入存档</button><button id="exportFile" ${saves.length?'':'disabled'}>导出备份</button></div></section></div>`;
 if(selected)drawStartRole(selected);
 document.querySelectorAll('[data-save-id]').forEach(b=>b.onclick=()=>{if(startBusy)return;const scroll=document.querySelector('.save-list').scrollTop;startSelected=b.dataset.saveId;renderSaveStart();document.querySelector('.save-list').scrollTop=scroll;});
 $('loadGame').onclick=async()=>{
  if(startBusy)return;if(!selected){showStart('new');return;}startBusy=true;$('loadGame').disabled=true;$('loadGame').textContent='读取中…';
  try{await chooseCharacter(selected.id);}catch(e){startBusy=false;$('loading').hidden=true;showStart('load');startError('读取失败：'+e.message);}finally{startBusy=false;if($('loadGame')){$('loadGame').disabled=false;$('loadGame').textContent='继续冒险';}}
 };
 $('deleteSave').onclick=()=>{
  if(!selected||startBusy)return;const box=$('deleteConfirm');box.hidden=false;
  box.innerHTML=`<p>删除「${esc(selected.name)}」的全部进度？</p><div><button id="cancelDelete">取消</button><button class="danger" id="confirmDelete">确认删除</button></div>`;
  $('cancelDelete').onclick=()=>{box.hidden=true;$('deleteSave').focus();};
  $('confirmDelete').onclick=()=>{
   const prior={characters:[...store.characters],lastId:store.lastId,p,ready};AdventureSaves.remove(store,selected.id);if(p?.id===selected.id){p=null;ready=false;}
   if(!persist()){store.characters=prior.characters;store.lastId=prior.lastId;p=prior.p;ready=prior.ready;startError('删除未保存，请重试或先导出备份');return;}
   $('returnGame').hidden=!p||!ready;startSelected=null;renderSaveStart();($('loadGame').disabled?$('importFile'):$('loadGame')).focus();
  };$('cancelDelete').focus();
 };
 $('importFile').onclick=()=>{if(!startBusy)$('importSave').click();};$('exportFile').onclick=exportSave;
}
