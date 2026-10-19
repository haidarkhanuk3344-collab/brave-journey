/* One character, one independent adventure slot. Keep the original v1 format. */
(function(root){
'use strict';
const classes=['warrior','archer','mage'];
function valid(c){return !!c&&typeof c.id==='string'&&typeof c.name==='string'&&classes.includes(c.cls)&&Number.isInteger(c.level)&&c.level>=1&&Number.isFinite(c.gold)&&Number.isInteger(c.unlocked)&&c.unlocked>=1&&c.unlocked<=4&&Array.isArray(c.bag)&&Array.isArray(c.storage)&&c.equipped&&c.appearance&&Array.isArray(c.skills)&&c.skills.length===3&&c.materials&&c.potions&&c.bounties;}
function parse(raw){const data=JSON.parse(raw);if(data?.version!==1||!Array.isArray(data.characters)||data.characters.some(c=>!valid(c)))throw Error('存档内容不完整，请选择原先导出的存档文件');const ids=new Set();for(const c of data.characters){if(ids.has(c.id))throw Error('存档包含重复的角色');ids.add(c.id);}return data;}
function stamp(c,checkpoint,now=Date.now()){if(!c)return;c.createdAt=c.createdAt||now;c.savedAt=now;if(checkpoint)c.checkpoint={...checkpoint};}
function sorted(store){return [...store.characters].sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}
function remove(store,id){const index=store.characters.findIndex(c=>c.id===id);if(index<0)return false;store.characters.splice(index,1);if(store.lastId===id)store.lastId=sorted(store)[0]?.id||null;return true;}
function merge(store,incoming,idFactory){const checked=parse(JSON.stringify(incoming));const ids=new Set(store.characters.map(c=>c.id));for(const c of checked.characters){if(ids.has(c.id))c.id=idFactory();ids.add(c.id);store.characters.push(c);}return checked.characters.length;}
const api={valid,parse,stamp,sorted,remove,merge};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AdventureSaves=api;
})(typeof window!=='undefined'?window:globalThis);
