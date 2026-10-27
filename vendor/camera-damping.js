/* Ported from GDQuest ShakingCamera._process (MIT, Copyright (c) 2019 Nathan Lovato).
 * godot-platformer-2d/game/src/Player/Camera/ShakingCamera.gd
 * blob 5e90e39e232964a630ed9591640844ba89237359. Full license: gdquest-LICENSE.
 * Timer-based amplitude damping ported to seconds; repeatable oscillation replaces random offset. */
(function(root){'use strict';
function offset(remaining,duration,amplitude,clock){const damping=Math.max(0,Math.min(1,remaining/duration));return {x:Math.sin(clock*93)*amplitude*damping,y:Math.cos(clock*71)*amplitude*damping*.65};}
const api={offset};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CameraDamping=api;
})(typeof window!=='undefined'?window:globalThis);
