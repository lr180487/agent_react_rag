'use strict';
/* sounds.js — v2.2 Configuración completa de sonidos y alertas
   Corrige: autoplay suspendido, volumen maestro, iconos duales, alarmas cancelables,
   vibración configurable, persistencia y panel de configuración */
let audioCtx = null;
let masterGain = null;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let soundVolume = parseFloat(localStorage.getItem('soundVolume') || '0.75');
if (isNaN(soundVolume)) soundVolume = 0.75;
soundVolume = Math.max(0, Math.min(1, soundVolume));
let alertConfig = (()=>{ try{ return JSON.parse(localStorage.getItem('alertConfig')||'{}'); }catch(e){ return {}; } })();
alertConfig = {
  defaultAlarm: alertConfig.defaultAlarm || 'alarm_phone',
  loops: alertConfig.loops != null ? alertConfig.loops : 3,
  vibration: alertConfig.vibration !== false,
  alertVolume: alertConfig.alertVolume != null ? alertConfig.alertVolume : 0.9
};
let alarmTimers = [];
let activeOscs = [];

function saveAlertConfig(){ localStorage.setItem('alertConfig', JSON.stringify(alertConfig)); }
function getAlertConfig(){ return {...alertConfig}; }
function setAlertConfig(patch){
  Object.assign(alertConfig, patch);
  if(alertConfig.loops) alertConfig.loops = Math.max(1, Math.min(6, parseInt(alertConfig.loops)||3));
  if(alertConfig.alertVolume!=null) alertConfig.alertVolume = Math.max(0, Math.min(1, parseFloat(alertConfig.alertVolume)));
  saveAlertConfig();
  syncSoundConfigUI();
}
function setSoundEnabled(v){
  soundEnabled = !!v;
  localStorage.setItem('soundEnabled', String(soundEnabled));
  if(!soundEnabled) stopAlarms();
  updateSoundIcon();
  syncSoundConfigUI();
  if(soundEnabled){ initAudio(); playSound('success'); }
  else { try{ if(navigator.vibrate) navigator.vibrate(0); }catch(e){} if(typeof showToast==='function') showToast('🔇 Sonidos desactivados','info'); }
}
function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = soundVolume;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  } catch(e) { console.warn('[sounds] initAudio failed', e); }
}
function updateSoundIcon() {
  ['soundToggle','soundToggle2'].forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.textContent = soundEnabled ? '🔊' : '🔇';
      b.style.opacity = soundEnabled ? '1' : '0.55';
      b.title = soundEnabled ? `Sonidos activados · Vol ${Math.round(soundVolume*100)}% (clic para silenciar)` : 'Sonidos silenciados (clic para activar)';
    }
  });
  const s=document.getElementById('soundVolume');
  if(s) s.value = Math.round(soundVolume*100);
  const l=document.getElementById('soundVolumeLabel');
  if(l) l.textContent = Math.round(soundVolume*100)+'%';
  const s2=document.getElementById('soundVolume2');
  if(s2) s2.value = Math.round(soundVolume*100);
  const l2=document.getElementById('soundVolumeLabel2');
  if(l2) l2.textContent = Math.round(soundVolume*100)+'%';
}
function syncSoundConfigUI(){
  const en=document.getElementById('cfgSoundEnabled');
  if(en) en.checked = soundEnabled;
  const st=document.getElementById('cfgSoundStatus');
  if(st){ st.textContent = soundEnabled ? '● Activado' : '○ Silenciado'; st.style.background = soundEnabled ? 'var(--success)' : '#94a3b8'; st.style.color='white'; }
  const mv=document.getElementById('cfgMasterVol');
  if(mv) mv.value = Math.round(soundVolume*100);
  const ml=document.getElementById('cfgVolLabel');
  if(ml) ml.textContent = Math.round(soundVolume*100)+'%';
  const mv2=document.getElementById('cfgMasterVol2');
  if(mv2) mv2.value = Math.round(soundVolume*100);
  const ml2=document.getElementById('cfgVolLabel2');
  if(ml2) ml2.textContent = Math.round(soundVolume*100)+'%';
  const da=document.getElementById('cfgDefaultAlarm');
  if(da) da.value = alertConfig.defaultAlarm;
  const lo=document.getElementById('cfgLoops');
  if(lo) lo.value = alertConfig.loops;
  const vib=document.getElementById('cfgVibration');
  if(vib) vib.checked = !!alertConfig.vibration;
  const av=document.getElementById('cfgAlertVol');
  if(av) av.value = Math.round(alertConfig.alertVolume*100);
  const avl=document.getElementById('cfgAlertVolLabel');
  if(avl) avl.textContent = Math.round(alertConfig.alertVolume*100)+'%';
  updateSoundIcon();
}
function setVolume(v){
  const n = typeof v === 'string' ? parseInt(v,10) : v;
  soundVolume = Math.max(0, Math.min(1, (isNaN(n)?75:n)/100));
  localStorage.setItem('soundVolume', String(soundVolume));
  if(masterGain) try{ masterGain.gain.setValueAtTime(soundVolume, audioCtx.currentTime); }catch(e){ masterGain.gain.value = soundVolume; }
  updateSoundIcon();
  syncSoundConfigUI();
  if(soundEnabled){ initAudio(); tone(880,0.10,'sine',0.10); }
}
function setAlertVolume(v){
  const n = typeof v === 'string' ? parseInt(v,10) : v;
  alertConfig.alertVolume = Math.max(0, Math.min(1, (isNaN(n)?90:n)/100));
  saveAlertConfig();
  syncSoundConfigUI();
}
function toggleSound(){
  setSoundEnabled(!soundEnabled);
}
['click','keydown','touchstart'].forEach(ev=>{
  document.addEventListener(ev, ()=>{
    if(!audioCtx) initAudio();
    else if(audioCtx.state==='suspended') audioCtx.resume().catch(()=>{});
  }, {once:true, passive:true});
});
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden && audioCtx && audioCtx.state==='suspended' && soundEnabled) audioCtx.resume().catch(()=>{});
});
window.addEventListener('storage', (e)=>{
  if(e.key==='soundEnabled'){ soundEnabled = e.newValue !== 'false'; if(!soundEnabled) stopAlarms(); updateSoundIcon(); syncSoundConfigUI(); }
  if(e.key==='soundVolume'){ const v=parseFloat(e.newValue||'0.75'); if(!isNaN(v)){ soundVolume=Math.max(0,Math.min(1,v)); if(masterGain && audioCtx) try{ masterGain.gain.setValueAtTime(soundVolume, audioCtx.currentTime);}catch(_){ masterGain.gain.value=soundVolume; } updateSoundIcon(); syncSoundConfigUI(); } }
  if(e.key==='alertConfig'){ try{ const c=JSON.parse(e.newValue||'{}'); Object.assign(alertConfig, c); syncSoundConfigUI(); }catch(_){} }
});

const soundMap={
  nuevo:{freq:[392,523,659,880],dur:0.45,type:'sine',arpeggio:true,gain:0.15, label:'Nuevo chat', icon:'💬'},
  send:{freq:[840,1120],dur:0.18,type:'sine',chord:true,gain:0.15, label:'Enviar', icon:'📤'},
  upload:{freq:[550,750,1050],dur:0.32,type:'sine',arpeggio:true,gain:0.14, label:'Subir doc', icon:'📎'},
  success:{freq:[523,659,784,1046,1318],dur:0.62,type:'sine',arpeggio:true,gain:0.14, label:'Éxito', icon:'✅'},
  error:{freq:[340,280,220],dur:0.42,type:'triangle',arpeggio:true,gain:0.13, label:'Error', icon:'❌'},
  warning:{freq:[500,620],dur:0.34,type:'sine',chord:true,gain:0.13, label:'Advertencia', icon:'⚠️'},
  info:{freq:740,dur:0.14,type:'sine',gain:0.14,slide:40, label:'Info', icon:'ℹ️'},
  open:{freq:700,dur:0.14,type:'sine',gain:0.13,slide:60, label:'Abrir', icon:'📂'},
  edit:{freq:660,dur:0.15,type:'sine',gain:0.13,slide:30, label:'Editar', icon:'✏️'},
  delete:{freq:[220,180,140],dur:0.34,type:'triangle',arpeggio:true,gain:0.12, label:'Eliminar', icon:'🗑️'},
  save:{freq:[523,659,880],dur:0.42,type:'sine',arpeggio:true,gain:0.14, label:'Guardar', icon:'💾'},
  search:{freq:[620,820,1100,1480],dur:0.42,type:'sine',arpeggio:true,gain:0.14, label:'Buscar', icon:'🔍'},
  chat:{freq:[600,800,1000],dur:0.28,type:'sine',arpeggio:true,gain:0.15, label:'Chat', icon:'💬'},
  documents:{freq:[480,700,920],dur:0.30,type:'sine',arpeggio:true,gain:0.15, label:'Documentos', icon:'📄'},
  rag:{freq:[520,780,1050],dur:0.30,type:'sine',arpeggio:true,gain:0.14, label:'RAG', icon:'🧠'},
  llm:{freq:[523,659,880,1174],dur:0.38,type:'sine',arpeggio:true,gain:0.14, label:'LLM', icon:'🤖'},
  test:{freq:[540,720,960],dur:0.30,type:'sine',arpeggio:true,gain:0.14, label:'Prueba', icon:'🧪'},
  alarm_phone:{freq:1000,dur:0.18,type:'sine',gain:0.20, label:'Alarma teléfono', icon:'📱'},
  alarm_classic:{freq:880,dur:0.20,type:'sine',gain:0.18, label:'Alarma clásica', icon:'⏰'},
  alarm_urgent:{freq:1200,dur:0.18,type:'sine',gain:0.20, label:'Alarma urgente', icon:'🚨'},
  alarm_soft:{freq:700,dur:0.22,type:'sine',gain:0.16, label:'Alarma suave', icon:'🔔'},
  alarm_nokia:{freq:1318,dur:0.12,type:'sine',gain:0.18, label:'Alarma Nokia', icon:'🎵'}
};
function tone(freq,dur,type='sine',gain=0.14,slide=0){
  if(!soundEnabled || !audioCtx || !masterGain) return;
  if(audioCtx.state==='suspended') { audioCtx.resume().catch(()=>{}); }
  try{
    const now=audioCtx.currentTime;
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    const f=audioCtx.createBiquadFilter();
    f.type='lowpass'; f.frequency.value=3400; f.Q.value=0.5;
    o.type=type;
    o.frequency.setValueAtTime(freq, now);
    if(slide) o.frequency.linearRampToValueAtTime(freq+slide, now+dur*0.6);
    const isAlarm = gain>0.18;
    const volScale = isAlarm ? alertConfig.alertVolume : 1;
    const finalGain = Math.min(0.32, gain * (0.45 + soundVolume*0.75) * volScale);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(finalGain, now+0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now+dur);
    o.connect(f); f.connect(g); g.connect(masterGain);
    o.start(now); o.stop(now+dur+0.03);
    activeOscs.push(o);
    o.onended = ()=>{ activeOscs=activeOscs.filter(x=>x!==o); try{o.disconnect(); g.disconnect(); f.disconnect();}catch(_){} };
  }catch(e){}
}
function playSound(name){
  if(!soundEnabled) return;
  initAudio();
  if(!audioCtx || !masterGain) return;
  if(audioCtx.state==='suspended'){ audioCtx.resume().catch(()=>{}); }
  const c=soundMap[name]||soundMap.info;
  const g=c.gain||0.14;
  if(c.arpeggio && Array.isArray(c.freq)){
    c.freq.forEach((f,i)=> setTimeout(()=> tone(f, c.dur/c.freq.length+0.05, c.type, g), i*70));
  } else if(c.chord && Array.isArray(c.freq)){
    c.freq.forEach(f=> tone(f,c.dur,c.type,g*0.6));
  } else if(c.wobble){
    tone(c.freq, c.dur*0.6, c.type, g); setTimeout(()=> tone(c.freq-24,0.15,'sine',g*0.85),100);
  } else {
    tone(c.freq,c.dur,c.type,g,c.slide||0);
    if(c.rise) setTimeout(()=> tone(c.freq+c.rise,0.13,'sine',g*0.7), 80);
  }
}
function stopAlarms(){
  alarmTimers.forEach(t=>clearTimeout(t)); alarmTimers=[];
  activeOscs.forEach(o=>{ try{o.stop(); o.disconnect();}catch(_){} }); activeOscs=[];
  if(navigator.vibrate) try{ navigator.vibrate(0); }catch(_){}
}
function playAlarm(name, loops){
  if(name==null) name = alertConfig.defaultAlarm;
  if(loops==null) loops = alertConfig.loops;
  if(!soundEnabled){
    if(typeof showToast==='function') showToast('🔇 Activa el sonido para escuchar alarmas','info');
    return;
  }
  initAudio();
  if(!audioCtx || !masterGain){
    if(typeof showToast==='function') showToast('Audio no disponible en este navegador','error');
    return;
  }
  if(audioCtx.state==='suspended'){
    audioCtx.resume().then(()=> playAlarm(name, loops)).catch(()=>{});
    return;
  }
  stopAlarms();
  const patterns={
    alarm_phone:   {seq:[1000,1000,1000,1000], durs:[0.18,0.18,0.18,0.38], gap:0.18, pause:0.65},
    alarm_classic: {seq:[880,880,880], durs:[0.20,0.20,0.34], gap:0.14, pause:0.55},
    alarm_urgent:  {seq:[1200,900,1200,900,1200], durs:[0.14,0.14,0.14,0.14,0.28], gap:0.10, pause:0.40},
    alarm_soft:    {seq:[700,700], durs:[0.22,0.22], gap:0.20, pause:0.90},
    alarm_nokia:   {seq:[1318,987,1318,987,659,880], durs:[0.12,0.12,0.12,0.12,0.26,0.30], gap:0.08, pause:0.50}
  };
  const pat=patterns[name]||patterns.alarm_phone;
  let totalDelay=0;
  for(let l=0;l<loops;l++){
    for(let i=0;i<pat.seq.length;i++){
      const f=pat.seq[i], d=pat.durs[i];
      const t=setTimeout(()=> tone(f,d,'sine',0.22,0), totalDelay*1000);
      alarmTimers.push(t);
      totalDelay += d + pat.gap;
    }
    totalDelay += pat.pause;
  }
  if(alertConfig.vibration && navigator.vibrate) try{ navigator.vibrate([180,120,180,120,380]); }catch(_){}
  if(typeof showToast==='function') showToast('🔔 Alarma: '+name+' ×'+loops,'warning');
}
function renderSoundTestGrid(){
  const grid=document.getElementById('soundTestGrid');
  if(!grid) return;
  const order=['success','error','warning','info','nuevo','send','upload','save','open','edit','delete','search','chat','documents','rag','llm','test'];
  const alarms=['alarm_phone','alarm_classic','alarm_urgent','alarm_soft','alarm_nokia'];
  let html='';
  order.forEach(k=>{
    const c=soundMap[k];
    if(!c) return;
    html+=`<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;gap:8px" onclick="playSound('${k}')"><span>${c.icon||'🔊'}</span> ${c.label||k}</button>`;
  });
  html+=`<div style="grid-column:1/-1;height:1px;background:var(--border);margin:6px 0"></div>`;
  alarms.forEach(k=>{
    const c=soundMap[k];
    html+=`<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;gap:8px;border-style:dashed" onclick="playAlarm('${k}', document.getElementById('cfgLoops')?parseInt(document.getElementById('cfgLoops').value||3):3)"><span>${c.icon}</span> ${c.label}</button>`;
  });
  grid.innerHTML=html;
}
document.addEventListener('click', (e)=>{
  ['alarmMenu','alarmMenu2'].forEach(id=>{
    const m=document.getElementById(id);
    if(m && !m.contains(e.target) && !e.target.closest('[title="Alarmas tipo celular"]')) m.classList.remove('show');
  });
});
setTimeout(()=>{ updateSoundIcon(); syncSoundConfigUI(); renderSoundTestGrid(); }, 0);
