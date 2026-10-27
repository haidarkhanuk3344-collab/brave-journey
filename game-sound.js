(function(root) {
  'use strict';
  let context, master, analyser, noise, enabled=true;
  const calls = {};
  try { enabled=localStorage.getItem('mountain-adventure-sound')!=='off'; } catch {}
  function create() {
    if(context) return;
    const Audio=root.AudioContext||root.webkitAudioContext;
    if(!Audio) return;
    context=new Audio();master=context.createGain();master.gain.value=enabled?.2:0;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=5;
    analyser=context.createAnalyser();analyser.fftSize=256;
    master.connect(limiter);limiter.connect(analyser);analyser.connect(context.destination);
    noise=context.createBuffer(1,Math.ceil(context.sampleRate*.35),context.sampleRate);
    const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  function unlock() {
    try {create();if(context?.state==='suspended')context.resume().catch(()=>{});} catch {}
  }
  function envelope(duration, volume) {
    const gain=context.createGain(),now=context.currentTime;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(master);return gain;
  }
  function tone(start,end,duration,volume,type='triangle') {
    const osc=context.createOscillator(),gain=envelope(duration,volume),now=context.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+duration);
    osc.connect(gain);osc.start(now);osc.stop(now+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function hiss(duration,volume,frequency) {
    const src=context.createBufferSource(),filter=context.createBiquadFilter(),gain=envelope(duration,volume);
    src.buffer=noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;
    src.connect(filter);filter.connect(gain);src.start();src.stop(context.currentTime+duration);
    src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }
  function play(kind, heavy=false) {
    if(!enabled||context?.state!=='running')return;
    calls[kind]=(calls[kind]||0)+1;
    if(kind==='skillCharge'){tone(95,heavy?550:360,heavy?.38:.22,.14,'sine');hiss(.15,.10,1700);}
    if(kind==='fireBlast'){hiss(.22,.55,650);tone(105,26,.25,.5,'sine');tone(210,42,.15,.18);}
    if(kind==='iceBreak'){hiss(.08,.3,3900);tone(950,210,.12,.16,'sine');tone(130,40,.12,.22);}
    if(kind==='skillFinish'){hiss(.23,.5,750);tone(78,23,.28,.45,'sine');tone(650,120,.18,.16);}
    if(kind==='swing'){hiss(heavy?.13:.09,heavy?.52:.36,1100);tone(heavy?140:210,65,.07,.1);}
    if(kind==='hit'){hiss(heavy?.16:.1,heavy?.65:.45,850);tone(heavy?110:150,38,heavy?.19:.12,.52);tone(heavy?64:88,28,heavy?.22:.14,.3,'sine');tone(1300,450,.045,.07,'sine');}
    if(kind==='arrow'){hiss(.055,.25,3100);tone(640,260,.06,.15);}
    if(kind==='arrowHit'){hiss(.06,.35,1850);tone(270,110,.05,.14);}
    if(kind==='cast'){tone(150,360,.16,.27,'sine');tone(80,54,.1,.18,'sine');hiss(.085,.14,1400);}
    if(kind==='magicHit'){tone(310,95,.14,.3,'sine');tone(90,32,.16,.25,'sine');hiss(.09,.28,1250);}
    if(kind==='jump'){hiss(.045,.17,700);tone(130,210,.05,.08,'sine');}
    if(kind==='land'){hiss(.065,.22,320);tone(75,40,.045,.12);}
    if(kind==='dash'){hiss(.10,.22,1650);tone(175,85,.08,.07,'sine');}
    if(kind==='enemyDown'){hiss(.15,.2,400);tone(90,32,.18,.17);}
    if(kind==='hurt'){hiss(.09,.5,500);tone(110,40,.13,.3);}
  }
  function toggle() {
    enabled=!enabled;unlock();if(master)master.gain.setTargetAtTime(enabled?.2:0,context.currentTime,.02);
    try{localStorage.setItem('mountain-adventure-sound',enabled?'on':'off');}catch{}
    return enabled;
  }
  function inspect() {
    let rms=0;if(analyser){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);}
    return {enabled,state:context?.state||'locked',calls:{...calls},rms};
  }
  root.addEventListener('keydown',unlock);root.addEventListener('pointerdown',unlock);
  root.GameSound={play,toggle,inspect,unlock};
})(window);
