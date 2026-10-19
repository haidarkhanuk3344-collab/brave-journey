/* Equipment data only. Future items reuse the painted pose and its attachment track. */
(function(root){
'use strict';
const items={
 sword_0:{slot:'weapon',image:'sword_0',grip:[.5,.81],scale:.88,blade:{end:.60,width:.72,length:1.18}},
 sword_1:{slot:'weapon',image:'sword_1',grip:[.5,.81],scale:.92,blade:{end:.60,width:.72,length:1.18}},
 bow_0:{slot:'weapon',image:'bow_0',grip:[.24,.5],scale:.68},
 bow_1:{slot:'weapon',image:'bow_1',grip:[.24,.5],scale:.70},
 staff_0:{slot:'weapon',image:'staff_0',grip:[.5,.72],scale:.83},
 staff_1:{slot:'weapon',image:'staff_1',grip:[.5,.72],scale:.85},
 armor:{slot:'clothes',dye:[129,146,154],shape:'plate'},
 tunic:{slot:'clothes',dye:[91,119,84],shape:'short'},
 robe:{slot:'clothes',dye:[116,87,139],shape:'skirt'},
 helmet_steel:{slot:'helmet',image:'helmet_steel',crop:[0,0,383,366],width:73,offset:[-9,-50],views:['helmet_steel-front','helmet_steel-side']},
 helmet_leather:{slot:'helmet',image:'helmet_leather',crop:[0,0,373,355],width:73,offset:[-9,-49],views:['helmet_leather-front','helmet_leather-side']}
};
for(const name of ['armor','tunic','robe'])items[name].path='assets/characters/outfit-v17/'+name+'-icon.png';
for(const item of Object.values(items))if(item.image)item.path='assets/characters/cartoon-v15/gear/'+item.image+'.png';
for(const name of ['helmet_steel','helmet_leather'])items[name].path='assets/characters/gear-v29/'+name+'.png';
function appearance(item,slot,cls){const fallback=slot==='weapon'?{warrior:'sword_0',archer:'bow_0',mage:'staff_0'}[cls]:slot==='clothes'?{warrior:'armor',archer:'tunic',mage:'robe'}[cls]:null;return items[item?.id||fallback]||items[fallback]||null;}
const api={items,appearance};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EquipmentVisuals=api;
})(typeof window!=='undefined'?window:globalThis);
