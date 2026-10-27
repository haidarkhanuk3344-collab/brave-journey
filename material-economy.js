/* Material inventory and atomic forge payment. Existing saves retain their counts. */
(function(root){
'use strict';
const definitions=[
 {id:'basic',name:'锻铁碎片',price:22,source:'Boss掉落 · 装备回收 · 商城',use:'＋1～＋3强化与基础重铸'},
 {id:'mid',name:'精炼矿晶',price:55,source:'Boss掉落 · 装备回收 · 商城',use:'＋4～＋6强化与进阶重铸'},
 {id:'high',name:'星辉锻晶',price:125,source:'高阶Boss掉落 · 装备回收 · 商城',use:'＋7～＋10强化与高阶重铸'},
 {id:'mushroom_resin',name:'菌王凝露',boss:'b1',source:'蘑菇领主',use:'对应来源装备的＋7～＋10强化'},
 {id:'stone_heart',name:'岩心结晶',boss:'b6',source:'石像巨人',use:'对应来源装备的＋7～＋10强化'},
 {id:'sword_soul',name:'剑魂碎片',boss:'b7',source:'魔殿剑主',use:'对应来源装备的＋7～＋10强化'},
 {id:'sanctum_core',name:'圣殿核心',boss:'b11',source:'圣殿之主',use:'对应来源装备的＋7～＋10强化'}
].map(d=>Object.freeze({...d,icon:'material_'+d.id,path:'items/v38/material_'+d.id+'.webp'}));
const byId=Object.fromEntries(definitions.map(d=>[d.id,d]));
const count=n=>Number.isFinite(n)&&n>=0?Math.floor(n):0;
function normalize(p){const prior=p.materials&&typeof p.materials==='object'&&!Array.isArray(p.materials)?p.materials:{};p.materials={...prior};for(const d of definitions)p.materials[d.id]=count(prior[d.id]);return p;}
function name(id){return byId[id]?.name||id;}
// The 13-map source ranks are nonlinear; these milestones match actual boss access.
// This tag is forge provenance only, never a substitute for an authored wearable model.
function sourceMaterial(rank){return rank>=11?'sanctum_core':rank>=10?'sword_soul':rank>=9?'stone_heart':rank>=2?'mushroom_resin':null;}
function enhanceExtras(item,next){return next>=7&&byId[item.forgeMaterial]?.boss?{[item.forgeMaterial]:next<=8?1:2}:{};}
function amounts(cost){if(!cost||!Number.isSafeInteger(cost.gold)||cost.gold<0||!Number.isSafeInteger(cost.materials)||cost.materials<0||!byId[cost.tier])return null;const result={[cost.tier]:cost.materials};for(const [id,n] of Object.entries(cost.extras||{})){if(!byId[id]||!Number.isSafeInteger(n)||n<0)return null;result[id]=(result[id]||0)+n;}return result;}
function missing(p,cost){const needed=amounts(cost);if(!needed)return ['费用无效'];const list=[];if(!Number.isFinite(p.gold)||p.gold<cost.gold)list.push('金币');for(const [id,n]of Object.entries(needed))if(count(p.materials?.[id])<n)list.push(name(id));return list;}
function pay(p,cost){if(missing(p,cost).length)return false;normalize(p);p.gold-=cost.gold;for(const [id,n]of Object.entries(amounts(cost)))p.materials[id]-=n;return true;}
function bossReward(type,category,rank,rng=Math.random){if(category!=='boss')return {};const random=(lo,hi)=>lo+Math.min(hi-lo,Math.floor(Math.max(0,rng())*(hi-lo+1))),out={basic:random(4,6),mid:random(1,3)};if(rank>=6)out.high=random(1,2);const special=definitions.find(d=>d.boss===type);if(special)out[special.id]=1;return out;}
function grant(p,reward){normalize(p);for(const [id,n]of Object.entries(reward))if(byId[id]&&Number.isSafeInteger(n)&&n>0)p.materials[id]+=n;}
const api={definitions,byId,normalize,name,sourceMaterial,enhanceExtras,amounts,missing,pay,bossReward,grant};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaterialEconomy=api;
})(typeof window!=='undefined'?window:globalThis);
