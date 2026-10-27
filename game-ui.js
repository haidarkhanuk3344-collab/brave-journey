/* Interface composition; no combat or save rules. */
(function(root){
'use strict';
const painted='fill="var(--icon-fill, #c6a575)"';
const marks={
 map:`<path ${painted} d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16 M15 5v16"/>`,
 bag:`<path ${painted} d="M5 8h14v12H5Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2 M9 12h6v4H9Z"/>`,
 skills:`<path ${painted} d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="M12 9v6 M9 12h6"/>`,
 town:`<path ${painted} d="M5 10v11h14V10L12 4Z"/><path d="m2 11 10-8 10 8 M10 21v-7h4v7"/>`,
 weapon:`<path ${painted} d="m7 17 10-12 4-2-1 5L9 19Z"/><path d="m4 15 6 6 M3 22l4-4"/>`,
 helmet:`<path ${painted} d="M4 17V11a8 8 0 0 1 16 0v6h-5v4H9v-4Z"/><path d="M12 3v10 M8 13h8"/>`,
 clothes:`<path ${painted} d="m8 4-6 5 4 5 2-2v9h8v-9l2 2 4-5-6-5-4 3Z"/>`,
 close:'<path d="m6 6 12 12 M18 6 6 18"/>',
 fullscreen:'<path d="M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5"/>',
 lock:`<rect ${painted} x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3 M12 14v3"/>`
};
const sigil=(name)=>`<svg class="adventure-sigil" data-game-icon="${marks[name]?name:'skills'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${marks[name]||marks.skills}</svg>`;
const points=[[14,42],[40,48],[65,62],[88,34]];
function route(maps,unlocked,selected,complete){
 const routePath=points.map((p,i)=>`${i?'L':'M'}${p[0]*10},${p[1]*5.625}`).join(' '),openPath=points.slice(0,unlocked).map((p,i)=>`${i?'L':'M'}${p[0]*10},${p[1]*5.625}`).join(' ');
 return `<div class="route-landscape"><img class="route-art" src="assets/ui/v25/forest-route.webp" alt="林地区域：林缘木门、溪谷石桥、古树遗迹和林心巨树"><svg class="route-line" viewBox="0 0 1000 562.5" aria-hidden="true"><path d="${routePath}" class="route-shadow"/><path d="${routePath}" class="route-locked"/><path d="${openPath}" class="route-open"/></svg><span class="town-label">青岚镇</span>${maps.map((m,i)=>{const locked=i+1>unlocked,cleared=i+1<unlocked||complete;return `<button class="route-node ${locked?'locked':''} ${selected===i+1?'selected':''} ${cleared?'cleared':''}" data-route="${i+1}" style="--x:${points[i][0]}%;--y:${points[i][1]}%" aria-label="${m.name_suggestion} · ${locked?'未解锁':cleared?'已通过':'可挑战'}" aria-pressed="${selected===i+1}"><span class="node-mark">${locked?sigil('lock'):i===3?sigil('skills'):`${i+1}`}</span><span class="node-name">${m.name_suggestion}<small>${locked?'未解锁':cleared?'已通过 · 可重刷':i===3?'区域 BOSS':'精英守关'}</small></span></button>`}).join('')}<div class="route-legend"><i></i> 已解锁路线 <b></b> 尚未通行</div></div>`;
}
root.AdventureUI={sigil,route};
})(window);
