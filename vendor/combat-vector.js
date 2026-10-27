/* Adapted from Ourcade Faune.throwKnife (MIT, Copyright (c) 2019 ourcade).
 * Source: ourcade/phaser3-dungeon-crawler-starter/src/characters/Faune.ts
 * blob 9abc75d2bd1cda24e743bb561d96748bdda1624e. Full license: ourcade-LICENSE.
 * Removed Phaser dependency; added normalized arbitrary aim for skill projectiles. */
(function(root){'use strict';
function launch(x,y,dx,dy,speed,advance=0){const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;return {x:x+ux*advance,y:y+uy*advance,vx:ux*speed,vy:uy*speed,angle:Math.atan2(uy,ux)};}
const api={launch};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CombatVector=api;
})(typeof window!=='undefined'?window:globalThis);
