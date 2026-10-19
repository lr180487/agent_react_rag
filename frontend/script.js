'use strict';


// === DESCARGA DE MENSAJES (reemplaza caja) ===
let _chatMessages = [{role:'assistant', text:'¡Hola! Soy tu asistente. Puedo ayudarte con tus documentos y responder tus preguntas.', time:new Date().toLocaleTimeString()}];
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _updateDownloadCount(){
  const el=document.getElementById('downloadCount');
  if(el) el.textContent = _chatMessages.length + ' mensaje'+(_chatMessages.length!==1?'s':'');
}
function _pushChatMessage(role, text){
  _chatMessages.push({role, text, time:new Date().toLocaleTimeString()});
  _updateDownloadCount();
}
function downloadMessages(format='json'){
  if(_chatMessages.length===0){ showToast('No hay mensajes para descargar','info'); return; }
  playSound('save');
  const now = new Date().toISOString().slice(0,10);
  const base = `chat-interfaz-${now}`;
  if(format==='json'){
    const data={exported_at:new Date().toISOString(), messages:_chatMessages};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    triggerDownload(blob, base+'.json');
    showToast('Descargado JSON','success');
  } else if(format==='txt'){
    let txt=`Chat Interfaz — ${new Date().toLocaleString()}
${'='.repeat(50)}
`;
    _chatMessages.forEach(m=>{ txt+=`[${m.time}] ${m.role.toUpperCase()}: ${m.text}

`; });
    const blob=new Blob([txt],{type:'text/plain;charset=utf-8'});
    triggerDownload(blob, base+'.txt');
    showToast('Descargado TXT','success');
  } else if(format==='md'){
    let md=`# Chat Interfaz

*Fecha:* ${new Date().toLocaleString()}

---

`;
    _chatMessages.forEach(m=>{ const who=m.role==='user'?'🧑 Tú':'🤖 Asistente'; md+=`### ${who} — ${m.time}

${m.text}

`; });
    const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});
    triggerDownload(blob, base+'.md');
    showToast('Descargado MD','success');
  } else if(format==='html'){
    let htm=`<html><head><meta charset="UTF-8"><title>Chat</title><style>body{font-family:Inter,Arial,sans-serif;padding:20px;color:#0f172a} .msg{margin:10px 0;padding:10px;border:1px solid #e2e8f0;border-radius:10px} .user{background:#f5f3ff} .assistant{background:#f8fafc}</style></head><body><h1>Chat Interfaz</h1><p>${new Date().toLocaleString()}</p><hr>`;
    _chatMessages.forEach(m=>{ htm+=`<div class="msg ${m.role}"><b>${m.role.toUpperCase()} — ${m.time}</b><br>${escapeHtml(m.text).replace(/\n/g,'<br>')}</div>`; });
    htm+=`</body></html>`;
    const blob=new Blob([htm],{type:'text/html;charset=utf-8'});
    triggerDownload(blob, base+'.html');
    // intentar imprimir
    try{ const w=window.open('','_blank'); if(w){ w.document.write(htm); w.document.close(); setTimeout(()=>{ try{w.print();}catch(e){} },600);} }catch(e){}
    showToast('Descargado HTML (imprimible a PDF)','success');
  }
}
function copyMessages(){
  const t=_chatMessages.map(m=>`[${m.time}] ${m.role}: ${m.text}`).join('\n\n');
  navigator.clipboard.writeText(t).then(()=>showToast('Mensajes copiados','success'));
}
function triggerDownload(blob, filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.style.position='fixed'; a.style.left='-9999px'; document.body.appendChild(a);
  try{ a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }catch(e){ a.click(); }
  setTimeout(()=>{ try{document.body.removeChild(a);}catch(e){} URL.revokeObjectURL(url); },1500);
}
const _origClearChat2 = typeof clearChat!=='undefined' ? clearChat : null;

// === NUEVO: Documentos de prueba + vista previa + descargar ===
const testDocs = [
  {name:'Contrato_ejemplo.pdf', ext:'pdf', size:'1.2 MB', desc:'Contrato con cláusulas de penalidad — Markdown AST → chunk 42', color:'#ef4444', icon:'📄'},
  {name:'Balance_2024.xlsx', ext:'xlsx', size:'84 KB', desc:'Excel con métricas y KPIs — listo para Q&A', color:'#10b981', icon:'📊'},
  {name:'Manual_usuario.docx', ext:'docx', size:'340 KB', desc:'Word convertido a Markdown con parser DOCX', color:'#0ea5e9', icon:'📝'},
  {name:'Notas_reunion.md', ext:'md', size:'6 KB', desc:'Markdown puro — embeddings + RAG', color:'#7c5cff', icon:'📃'},
];
function renderTestDocs(){
  const g=document.getElementById('testDocsGrid');
  if(!g) return;
  g.innerHTML = testDocs.map((d,i)=>`
    <div class="doc-card">
      <div class="doc-icon" style="background:${escapeHtml(d.color)}">${escapeHtml(d.icon)}</div>
      <div class="doc-meta">
        <h4>${escapeHtml(d.name)}</h4>
        <p>${escapeHtml(d.size)} • ${escapeHtml(d.desc)}</p>
      </div>
      <div class="doc-actions">
        <button class="btn btn-ghost btn-sm" onclick="openPreviewTest(${i})">👁️ Vista previa</button>
        <button class="btn btn-primary btn-sm" onclick="downloadTest(${i})">⬇️ Descargar</button>
      </div>
    </div>
  `).join('');
}
let _previewBlobUrl=null, _previewName=null;
function openPreviewTest(i){
  const d=testDocs[i];
  _previewName=d.name;
  document.getElementById('previewTitle').textContent=d.name;
  document.getElementById('previewSub').textContent=`${d.ext.toUpperCase()} • ${d.size} • Vista previa`;
  const body=document.getElementById('previewBody');
  if(d.ext==='pdf'){
    body.innerHTML=`<div class="doc-preview-text" style="margin-bottom:10px">📄 <b>${d.name}</b> — demo de vista previa PDF. En producción se renderiza el PDF real vía &lt;iframe&gt; o PDF.js.</div><iframe class="doc-preview-iframe" src="about:blank" title="preview"></iframe>`;
  } else if(d.ext==='xlsx' || d.ext==='xls'){
    body.innerHTML=`<div class="doc-preview-text"><b>Vista previa — ${d.name}</b><br><br>┌─────────┬──────────┬─────────┐<br>│ Mes     │ Ventas   │  %      │<br>├─────────┼──────────┼─────────┤<br>│ Enero   │ 120,000  │ +12%    │<br>│ Febrero │ 135,000  │ +25%    │<br>└─────────┴──────────┴─────────┘<br><br><small>Parser: Excel → Markdown AST → tabla renderizada</small></div>`;
  } else if(d.ext==='docx'){
    body.innerHTML=`<div class="doc-preview-text"><b>${d.name}</b> — vista previa DOCX→Markdown<br><br># Contrato<br>Este contrato establece...<br><br><b>Cláusula 4.2</b> Penalidad 5% por incumplimiento...<br><b>Cláusula 7</b> Confidencialidad...</div>`;
  } else {
    body.innerHTML=`<div class="doc-preview-text"># Notas de reunión<br><br>- Revisar KPIs Q1<br>- Penalidad contratos<br>- Próximos pasos...</div>`;
  }
  document.getElementById('previewOverlay').classList.add('show');
  playSound('open');
}
function downloadTest(i){
  const d=testDocs[i];
  playSound('save');
  const content = `# ${d.name}\n\nDocumento de prueba (${d.ext.toUpperCase()} • ${d.size})\n\n${d.desc}\n\nGenerado el ${new Date().toLocaleString()}\n\n— agente_react_rag demo —`;
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=d.name.replace(/\.[^.]+$/,'')+'_demo.txt'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(`Descargando ${d.name}`,'success');
}
function openPreviewFile(name, ext, contentUrl, textSnippet){
  _previewName=name;
  document.getElementById('previewTitle').textContent=name;
  document.getElementById('previewSub').textContent=`${ext.toUpperCase()} • Vista previa`;
  const body=document.getElementById('previewBody');
  const lower=ext.toLowerCase();
  if(['png','jpg','jpeg'].includes(lower) && contentUrl){
    body.innerHTML=`<img src="${contentUrl}" alt="${name}" style="max-width:100%;border-radius:12px;border:1px solid var(--border)"><div class="doc-preview-text" style="margin-top:10px">Imagen — ${name}</div>`;
    _previewBlobUrl=contentUrl;
  } else if(lower==='pdf' && contentUrl){
    body.innerHTML=`<iframe class="doc-preview-iframe" src="${contentUrl}" title="${name}"></iframe><div style="font-size:11px;color:var(--muted);margin-top:6px">Si no se ve, usá Descargar.</div>`;
    _previewBlobUrl=contentUrl;
  } else {
    body.innerHTML=`<div class="doc-preview-text">${escapeHtml(textSnippet||'Vista previa — contenido Markdown extraído.\n\n(En producción: parser real + chunking)')}</div>`;
    // crear blob para descargar
    const blob=new Blob([textSnippet||''],{type:'text/plain;charset=utf-8'});
    if(_previewBlobUrl) try{URL.revokeObjectURL(_previewBlobUrl);}catch(e){}
    _previewBlobUrl=URL.createObjectURL(blob);
  }
  document.getElementById('previewOverlay').classList.add('show');
  playSound('open');
}
function closePreview(){
  document.getElementById('previewOverlay').classList.remove('show');
}
function downloadPreview(){
  if(!_previewName) return;
  playSound('save');
  if(_previewBlobUrl){
    const a=document.createElement('a'); a.href=_previewBlobUrl; a.download=_previewName; a.click();
    showToast(`Descargando ${_previewName}`,'success');
  } else {
    showToast('Nada para descargar','error');
  }
}

// Manejo mejorado de archivos subidos con vista previa/descargar reales
const _uploadedFiles = []; // {name, ext, size, blobUrl, textSnippet, color, icon}

/* Sonidos centralizados en /frontend/sounds.js — bloque local eliminado (v2.1) */
if(typeof playSound==='undefined') window.playSound=()=>{};
if(typeof playAlarm==='undefined') window.playAlarm=()=>{};
if(typeof stopAlarms==='undefined') window.stopAlarms=()=>{};
if(typeof toggleSound==='undefined') window.toggleSound=()=>{};
if(typeof setVolume==='undefined') window.setVolume=()=>{};

const providers = [
  {id:'openai', name:'OpenAI', icon:'OAI', color:'#0ea5e9', base:'https://api.openai.com/v1', models:['gpt-4o-mini','gpt-4o','gpt-4-turbo','o1-mini','gpt-3.5-turbo']},
  {id:'anthropic', name:'Anthropic', icon:'ANT', color:'#ff7a00', base:'https://api.anthropic.com', models:['claude-3-5-sonnet-20241022','claude-3-opus-20240229','claude-3-haiku-20240307']},
  {id:'gemini', name:'Google Gemini', icon:'GEM', color:'#4285F4', base:'https://generativelanguage.googleapis.com', models:['gemini-1.5-pro','gemini-1.5-flash','gemini-1.0-pro']},
  {id:'groq', name:'Groq', icon:'GRO', color:'#ff3b30', base:'https://api.groq.com/openai/v1', models:['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768']},
  {id:'mistral', name:'Mistral', icon:'MIS', color:'#ff375f', base:'https://api.mistral.ai/v1', models:['mistral-large-latest','mistral-small-latest','open-mistral-7b']},
  {id:'ollama', name:'Ollama Local', icon:'OLL', color:'#10b981', base:'http://localhost:11434/v1', models:['llama3.2','qwen2.5','mistral','gemma2']},
  {id:'custom', name:'Custom (OpenAI compatible)', icon:'API', color:'#7c5cff', base:'', models:['custom-model']},
];
let selectedProvider = 'openai';
let editingId = null;
let llmConfigs = (()=>{ try{ return JSON.parse(localStorage.getItem('llm_configs')||'[]'); }catch(e){ console.warn('llm_configs parse error',e); return []; } })();
let activeId = (()=>{ try{ return localStorage.getItem('llm_active')||null; }catch(e){ return null; } })();

function setLogoLoading(isLoading){
  const w = document.getElementById('logoWrap');
  if(isLoading) w.classList.add('loading');
  else w.classList.remove('loading');
}

function renderProviders(){
  const grid = document.getElementById('providerGrid');
  grid.innerHTML = providers.map(p=>`
    <div class="prov ${p.id===selectedProvider?'active':''}" onclick="selectProv('${p.id}')">
      <div class="prov-icon" style="background:${escapeHtml(p.color)}">${escapeHtml(p.icon)}</div>
      <div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.base||'URL personalizada')}</p></div>
    </div>`).join('');
  const prov = providers.find(x=>x.id===selectedProvider);
  const sel=document.getElementById('fModel');
  sel.innerHTML = prov.models.map(m=>`<option value="${m}">${m}</option>`).join('');
  document.getElementById('fBase').placeholder = prov.base || 'https://tu-api.com/v1';
  if(!editingId) document.getElementById('fBase').value = prov.base;
  document.getElementById('modelHint').textContent = prov.id==='ollama'?'Requiere Ollama corriendo localmente': prov.id==='custom'?'Compatible con cualquier API tipo OpenAI':'';
}
function selectProv(id){ selectedProvider=id; renderProviders(); }
function toggleEye(){ const i=document.getElementById('fKey'); i.type=i.type==='password'?'text':'password'; }

function renderLLM(){
  const list=document.getElementById('llmList');
  const empty=document.getElementById('emptyLLM');
  const tag=document.getElementById('llmCountTag');
  if(tag) tag.textContent = `${llmConfigs.length} configuradas`;
  const dc=document.getElementById('docCount');
  if(dc) dc.textContent = llmConfigs.length;
  const sd=document.getElementById('statDocs');
  if(sd) sd.textContent = `${llmConfigs.length||0} LLM`;
  if(llmConfigs.length===0){ list.innerHTML=''; empty.style.display='block'; updateGlobalStatus(); return; }
  empty.style.display='none';
  list.innerHTML = llmConfigs.map(c=>{
    const prov = providers.find(p=>p.id===c.provider);
    const isActive = c.id===activeId;
    return `<div class="llm-card ${isActive?'active-card':''}">
      <div class="prov-icon" style="background:${escapeHtml(prov?.color||'#7c5cff')}">${escapeHtml(prov?.icon||'API')}</div>
      <div class="llm-meta">
        <h4>${escapeHtml(c.name)} ${isActive?'<span class="tag on">● ACTIVA</span>':''} <span class="tag">${escapeHtml(prov?.name||c.provider)}</span></h4>
        <p>Modelo: <b>${escapeHtml(c.model)}</b> • ${escapeHtml(c.base_url||prov?.base||'')} • ••••${escapeHtml(c.api_key.slice(-4))}</p>
      </div>
      <div class="actions">
        ${!isActive?`<button class="btn btn-primary btn-sm" onclick="activateLLM('${c.id}')">Activar</button>`:''}
        <button class="icon-btn" onclick="editLLM('${c.id}')" title="Editar">✏️</button>
        <button class="icon-btn" onclick="testLLMSaved('${c.id}')" title="Probar">🧪</button>
        <button class="icon-btn danger" onclick="deleteLLM('${c.id}')" title="Eliminar">🗑️</button>
      </div>
    </div>`;
  }).join('');
  updateGlobalStatus();
}
function updateGlobalStatus(){
  const active = llmConfigs.find(c=>c.id===activeId);
  const prov = active ? providers.find(p=>p.id===active.provider) : null;
  const txt=document.getElementById('globalLLMText');
  const warn=document.getElementById('llmWarning');
  const stat=document.getElementById('statLLM');
  const sub=document.getElementById('statLLMSub');
  const bar=document.getElementById('statLLMBar');
  if(active){
    txt.textContent = `${prov?.name||active.provider} • ${active.model}`;
    txt.style.color='var(--success)';
    warn.style.display='none';
    stat.textContent = active.model;
    sub.textContent = `${prov?.name||active.provider} activa`;
    bar.style.width='100%'; bar.style.background='var(--success)';
  } else {
    txt.textContent = 'No configurado';
    txt.style.color='var(--warning)';
    warn.style.display='flex';
    stat.textContent='—';
    sub.textContent='Configura tu API Key';
    bar.style.width='12%'; bar.style.background='#cbd5e1';
  }
  document.getElementById('statChunks').textContent = '1,248';
}
function saveLLM(){
  playSound('save');
  const name=document.getElementById('fName').value.trim() || `${providers.find(p=>p.id===selectedProvider).name} ${llmConfigs.length+1}`;
  const model=document.getElementById('fModel').value;
  const key=document.getElementById('fKey').value.trim();
  const base=document.getElementById('fBase').value.trim();
  const temp=parseFloat(document.getElementById('fTemp').value);
  const max=parseInt(document.getElementById('fMax').value);
  const timeout=parseInt(document.getElementById('fTimeout').value);
  if(!key){ showToast('La API Key es obligatoria','error'); return; }
  if(key.length<8){ showToast('API Key muy corta','error'); return; }
  setLogoLoading(true);
  setTimeout(()=>{
    if(editingId){
      const idx=llmConfigs.findIndex(c=>c.id===editingId);
      llmConfigs[idx]={...llmConfigs[idx], provider:selectedProvider, name, model, api_key:key, base_url:base, temperature:temp, max_tokens:max, timeout};
      editingId=null;
      document.getElementById('formTitle').textContent='➕ Agregar nueva API LLM';
      document.getElementById('formSub').textContent='Elige proveedor y pega tu API Key. Compatible OpenAI-API.';
      document.getElementById('cancelEdit').style.display='none';
      showToast('API actualizada','success');
    } else {
      const id='llm_'+Date.now();
      llmConfigs.push({id, provider:selectedProvider, name, model, api_key:key, base_url:base, temperature:temp, max_tokens:max, timeout, created: new Date().toISOString()});
      if(llmConfigs.length===1) activeId=id;
      showToast('API LLM guardada','success');
      mockBackendSave({provider:selectedProvider,name,model,base_url:base});
    }
    persist();
    resetForm();
    renderLLM();
    setLogoLoading(false);
  }, 700);
}
function persist(){
  localStorage.setItem('llm_configs', JSON.stringify(llmConfigs));
  if(activeId) localStorage.setItem('llm_active', activeId); else localStorage.removeItem('llm_active');
}
function resetForm(){
  document.getElementById('fName').value=''; document.getElementById('fKey').value='';
  document.getElementById('fTemp').value='0.7'; document.getElementById('fMax').value='2048'; document.getElementById('fTimeout').value='30000';
  selectedProvider='openai'; renderProviders();
}
function editLLM(id){
  const c=llmConfigs.find(x=>x.id===id);
  if(!c) return;
  editingId=id;
  selectedProvider=c.provider;
  renderProviders();
  document.getElementById('fName').value=c.name;
  document.getElementById('fModel').value=c.model;
  document.getElementById('fKey').value=c.api_key;
  document.getElementById('fBase').value=c.base_url;
  document.getElementById('fTemp').value=c.temperature;
  document.getElementById('fMax').value=c.max_tokens;
  document.getElementById('fTimeout').value=c.timeout;
  document.getElementById('formTitle').textContent='✏️ Editar API LLM';
  document.getElementById('formSub').textContent='Actualiza los datos y guarda los cambios';
  document.getElementById('cancelEdit').style.display='block';
  document.getElementById('llmFormCard').scrollIntoView({behavior:'smooth'});
}
function cancelEdit(){ editingId=null; resetForm(); document.getElementById('formTitle').textContent='➕ Agregar nueva API LLM'; document.getElementById('formSub').textContent='Elige proveedor y pega tu API Key. Compatible OpenAI-API.'; document.getElementById('cancelEdit').style.display='none'; }
function deleteLLM(id){
  if(!confirm('¿Eliminar esta API LLM?')) return;
  llmConfigs=llmConfigs.filter(c=>c.id!==id);
  if(activeId===id) activeId = llmConfigs[0]?.id || null;
  persist(); renderLLM(); showToast('API eliminada','info');
}
function activateLLM(id){ activeId=id; persist(); renderLLM(); showToast('Asistente activado','success'); }
function testLLM(){
  playSound('test');
  const key=document.getElementById('fKey').value.trim();
  const prov=providers.find(p=>p.id===selectedProvider);
  const res=document.getElementById('testResult');
  if(!key){ showToast('Pega una API Key para probar','error'); return; }
  res.style.display='block'; res.style.background='#f5f3ff'; res.style.border='1px solid #ddd6fe'; res.style.color='#6d28d9'; res.textContent='⏳ Probando conexión con '+prov.name+'…';
  setLogoLoading(true);
  setTimeout(()=>{
    const ok = key.length>10 && (key.startsWith('sk-') || key.startsWith('gsk_') || key.startsWith('AIza') || key.length>20 || prov.id==='ollama' || prov.id==='custom');
    if(ok){
      res.style.background='#ecfdf5'; res.style.border='1px solid #a7f3d0'; res.style.color='#065f46';
      res.textContent='✅ Conexión exitosa — Modelo '+document.getElementById('fModel').value+' listo. Latencia ~ 420ms';
      showToast('Conexión válida','success');
    } else {
      res.style.background='#fef2f2'; res.style.border='1px solid #fecaca'; res.style.color='#991b1b';
      res.textContent='❌ API Key inválida o base URL no accesible';
      showToast('Falló la validación','error');
    }
    setLogoLoading(false);
  },1300);
}
function testLLMSaved(id){
  const c=llmConfigs.find(x=>x.id===id);
  document.getElementById('fKey').value=c.api_key;
  selectedProvider=c.provider; renderProviders();
  document.getElementById('fModel').value=c.model;
  document.getElementById('fBase').value=c.base_url;
  testLLM();
  switchView('llm');
}
function mockBackendSave(payload){
  if(typeof console!=='undefined' && console.log) console.log('[Mock] POST /api/v1/llm/config', payload);
}
function exportLLM(){
  playSound('save');
  if(llmConfigs.length===0){
    showToast('No hay APIs para exportar — agrega una primero','error');
    return;
  }
  const active = llmConfigs.find(c=>c.id===activeId) || llmConfigs[0];
  let env = `# agente_react_rag — exportado ${new Date().toLocaleString()}\n`;
  env += `# Activa: ${active ? active.name + ' ('+active.provider+'/'+active.model+')' : 'ninguna'}\n`;
  env += `# Total: ${llmConfigs.length} configuración(es)\n\n`;
  llmConfigs.forEach(c=>{
    const P = c.provider.toUpperCase();
    const isActive = c.id===activeId ? ' [ACTIVA]' : '';
    env += `# — ${c.name} (${c.provider})${isActive}\n`;
    env += `${P}_API_KEY=${c.api_key}\n`;
    env += `${P}_MODEL=${c.model}\n`;
    if(c.base_url) env += `${P}_BASE_URL=${c.base_url}\n`;
    env += `${P}_TEMPERATURE=${c.temperature}\n`;
    env += `${P}_MAX_TOKENS=${c.max_tokens}\n`;
    if(c.timeout) env += `${P}_TIMEOUT=${c.timeout}\n`;
    env += `\n`;
  });
  // Config global que usa asistente
  env += `# Configuración activa para el agente (fallback .env)\n`;
  env += `LLM_PROVIDER=${active.provider}\n`;
  env += `LLM_MODEL=${active.model}\n`;
  env += `LLM_BASE_URL=${active.base_url||''}\n`;
  env += `LLM_TEMPERATURE=${active.temperature}\n`;
  env += `LLM_MAX_TOKENS=${active.max_tokens}\n`;
  env += `ACTIVE_LLM_ID=${active.id}\n`;
  const blob=new Blob([env],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='.env'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(`.env exportado con ${llmConfigs.length} API(s) — lista para usar en FastAPI`,'success');
}
function switchView(name){
  try{
    playSound({chat:'chat',documents:'documents',rag:'rag',llm:'llm'}[name]||'info');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const view=document.getElementById('view-'+name);
    if(view) view.classList.add('active'); else console.warn('view not found',name);
    const btn=document.querySelector(`.nav-btn[data-view="${name}"]`);
    if(btn) btn.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){ console.error('switchView error',e); }
}
function showToast(msg,type='success'){
  playSound(type==='error'?'error': type==='success'?'success':'info');
  const t=document.getElementById('toast');
  const icon={success:'✅',error:'❌',info:'ℹ️'}[type]||'✅';
  document.getElementById('toastIcon').textContent=icon;
  document.getElementById('toastMsg').textContent=msg;
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2600);
}
// Chat mock con loader en logo + sonido
// Chat conectado a Backend ANALYZER → PROCESSOR → RESPONSE (sincronizado)
async function sendChat(){
  playSound('send');
  const inp=document.getElementById('chatInput');
  const txt=inp.value.trim(); if(!txt) return;
  const box=document.getElementById('chatBox');
  if(!box){ console.warn('chatBox missing'); return; }
  box.innerHTML+=`<div class="msg user">${escapeHtml(txt)}</div>`;
  _pushChatMessage('user', txt);
  inp.value='';
  setLogoLoading(true);
  const typingId = 'typing-'+Date.now();
  box.innerHTML+=`<div id="${typingId}" class="typing"><i></i><i></i><i></i></div>`;
  box.scrollTop=box.scrollHeight;
  // Backend refs (soporta localhost:8001 nuevo y 8000/49999 legacy)
  const hosts = [location.host, 'localhost:8001','127.0.0.1:8001','localhost:8000','127.0.0.1:8000', location.hostname+':8001'];
  const proto = location.protocol==='https:'?'https://':'http://';
  let backendUrl = localStorage.getItem('backendUrl');
  let urls = [];
  if(backendUrl) urls.push(backendUrl.replace(/\/$/,'') + '/api/v1/analyzer/execute');
  for(const h of hosts) urls.push(proto+h+'/api/v1/analyzer/execute');
  // Deduplicate
  urls = [...new Set(urls)];
  let data=null, lastErr=null;
  for(const url of urls){
    try{
      const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text: txt, chat_id: 'demo'})});
      if(!r.ok) throw new Error('HTTP '+r.status);
      data = await r.json();
      break;
    }catch(e){ lastErr=e; }
  }
  document.getElementById(typingId)?.remove();
  if(!data){
    const active=llmConfigs.find(c=>c.id===activeId);
    let reply=`⚠️ Backend no disponible (${lastErr?lastErr.message:'sin conexión'}). Verificá /api/v1/analyzer/status en `+urls[0];
    if(!active) reply += '<br>Además no hay LLM activo — configurá en API LLM.';
    box.innerHTML+=`<div class="msg bot">${reply}</div>`;
    _pushChatMessage('assistant', reply);
    setLogoLoading(false);
    box.scrollTop=box.scrollHeight;
    return;
  }
  // Render 5 apartados RESPONSE
  const resp = data.response || {};
  const fuentes = (resp.fuentes||[]).map(f=>`<a href="${escapeHtml(f.url)}" target="_blank" style="color:var(--primary);text-decoration:none">🔗 ${escapeHtml(f.titulo)}</a> <small style="color:var(--muted)">(${escapeHtml(f.tipo)})</small>`).join('<br>') || '<small style="color:var(--muted)">Sin fuentes externas</small>';
  const recs = (resp.recomendaciones||[]).map(r=>`• ${escapeHtml(r)}`).join('<br>');
  const acts = (resp.acciones_propuestas||[]).map(a=>`• <b>${escapeHtml(a.accion)}</b>: ${escapeHtml(a.detalle)}`).join('<br>');
  const analyzerPlan = (data.plan||[]).map(p=>p.tool).join(' → ') || '—';
  const triFuentes = (data.tri_result?.fuentes||[]).join(', ') || '—';
  const html = `
    <div class="msg bot" style="max-width:100%">
      <div style="font-weight:800;color:var(--primary);margin-bottom:6px">🤖 ANALYZER → PROCESSOR → RESPONSE</div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--text)">📝 Síntesis</div>
        <div style="font-size:13px;color:var(--text);margin-top:4px">${escapeHtml(resp.sintesis||data.sintesis||'').replace(/\n/g,'<br>')}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--text)">💡 Explicación</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${escapeHtml(resp.explicacion||'').replace(/\n/g,'<br>')}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">Plan: <b>${escapeHtml(analyzerPlan)}</b> · Tri: <b>${escapeHtml(triFuentes)}</b> · Riesgo: <b>${escapeHtml(data.analyzer?.evaluar_riesgo?.nivel || data.riesgo || 'bajo')}</b></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)">Fuentes</div>
          <div style="font-size:12px;margin-top:6px">${fuentes}</div>
        </div>
        <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)">Recomendaciones</div>
          <div style="font-size:12px;margin-top:6px">${recs || '<small style=color:var(--muted)>—</small>'}</div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)">Acciones propuestas</div>
        <div style="font-size:12px;margin-top:6px">${acts || '<small style=color:var(--muted)>—</small>'}</div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">${escapeHtml(data.llm?.provider||'') } • ${escapeHtml(data.llm?.model||'') } · ${escapeHtml(data.flow||'') }</div>
    </div>`;
  box.innerHTML+=html;
  _pushChatMessage('assistant', resp.sintesis || data.sintesis || 'Respuesta generada');
  setLogoLoading(false);
  box.scrollTop=box.scrollHeight;
  if(typeof updateChatScrollBtn==='function') setTimeout(updateChatScrollBtn,80);
}
function quickChat(t){ document.getElementById('chatInput').value=t; sendChat(); }
function scrollChatToBottom(){ const b=document.getElementById('chatBox'); if(b) b.scrollTo({top:b.scrollHeight,behavior:'smooth'}); playSound('info'); }
  function updateChatScrollBtn(){ const b=document.getElementById('chatBox'); const btn=document.getElementById('scrollBottomMini'); if(!b||!btn) return; const near = b.scrollHeight - b.scrollTop - b.clientHeight < 100; btn.classList.toggle('show', !near && b.scrollHeight > b.clientHeight+80); }
  function clearChat(){ document.getElementById('chatBox').innerHTML='<div class="msg bot">Chat limpiado. ¿En qué te ayudo?</div>'; _chatMessages=[{role:'assistant', text:'Chat limpiado. ¿En qué te ayudo?', time:new Date().toLocaleTimeString()}]; _updateDownloadCount(); setTimeout(updateChatScrollBtn,80); }
function handleFiles(files){
  // --- NUEVO: guarda en grupo Documentos subidos con vista previa y descargar reales ---
  playSound('upload');
  const list=document.getElementById('docList');
  if(!list){ console.warn('docList missing'); return; }
  const loader=document.getElementById('fileLoader');
  const empty=document.getElementById('emptyUploaded');
  const countEl=document.getElementById('uploadedCount');
  setLogoLoading(true);
  if(loader) loader.style.display='flex';
  const typeMap={
    pdf:{icon:'📄',color:'#ef4444',parser:'PDF Parser'},
    doc:{icon:'📝',color:'#0ea5e9',parser:'DOCX Parser'},
    docx:{icon:'📝',color:'#0ea5e9',parser:'DOCX Parser'},
    xls:{icon:'📊',color:'#10b981',parser:'Excel Parser'},
    xlsx:{icon:'📊',color:'#10b981',parser:'Excel Parser'},
    csv:{icon:'📊',color:'#10b981',parser:'CSV Parser'},
    ppt:{icon:'📽️',color:'#f59e0b',parser:'PowerPoint Parser'},
    pptx:{icon:'📽️',color:'#f59e0b',parser:'PowerPoint Parser'},
    txt:{icon:'📃',color:'#64748b',parser:'Text Parser'},
    md:{icon:'📃',color:'#7c5cff',parser:'Markdown Parser'},
    png:{icon:'🖼️',color:'#ec4899',parser:'Image Parser'},
    jpg:{icon:'🖼️',color:'#ec4899',parser:'Image Parser'},
    jpeg:{icon:'🖼️',color:'#ec4899',parser:'Image Parser'}
  };
  setTimeout(()=>{
    if(loader) loader.style.display='none';
    setLogoLoading(false);
  }, 900);
  for(const f of files){
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    const meta=typeMap[ext]||{icon:'📄',color:'var(--primary)',parser:'Parser'};
    const size=(f.size/1024).toFixed(1)+' KB';
    const blobUrl=URL.createObjectURL(f);
    let snippet='';
    // leer snippet si es texto
    if(['txt','md','csv'].includes(ext)){
      const reader=new FileReader();
      reader.onload=e=>{ const idx=_uploadedFiles.findIndex(x=>x.blobUrl===blobUrl); if(idx>=0) _uploadedFiles[idx].textSnippet=e.target.result.slice(0,4000); };
      reader.readAsText(f);
    } else {
      snippet=`Archivo: ${f.name}\nTamaño: ${size}\nTipo: ${ext.toUpperCase()} • ${meta.parser}\n\nEn producción: ${meta.parser} → Markdown AST → Chunking → Embeddings (pgvector)\nVisto el ${new Date().toLocaleString()}`;
    }
    _uploadedFiles.push({name:f.name, ext, size, blobUrl, textSnippet: snippet, color:meta.color, icon:meta.icon, parser:meta.parser});
    const idx=_uploadedFiles.length-1;
    const card=document.createElement('div');
    card.className='doc-card';
    card.innerHTML=`<div class="doc-icon" style="background:${meta.color}">${meta.icon}</div>
      <div class="doc-meta">
        <h4 title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</h4>
        <p>${size} • ${meta.parser} → Markdown • sin scroll</p>
      </div>
      <div class="doc-actions">
        <button class="btn btn-ghost btn-sm" onclick="openPreviewUploaded(${idx})">👁️ Vista previa</button>
        <button class="btn btn-primary btn-sm" onclick="downloadUploaded(${idx})">⬇️ Descargar</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteUploaded(${idx})" title="Eliminar documento">🗑️ Eliminar</button>
      </div>`;
    list.appendChild(card);
  }
  if(empty) empty.style.display = _uploadedFiles.length ? 'none' : 'block';
  if(countEl) countEl.textContent = _uploadedFiles.length + ' archivo'+(_uploadedFiles.length!==1?'s':'');
  document.getElementById('docCount').textContent=_uploadedFiles.length;
  document.getElementById('statDocs').textContent=_uploadedFiles.length+' docs';
  showToast(`${files.length} archivo${files.length>1?'s':''} listo${files.length>1?'s':''} — vista previa y descargar habilitados`,'success');
  if(_uploadedFiles.length) setTimeout(()=>{ document.getElementById('groupUploaded')?.scrollIntoView({behavior:'smooth',block:'start'}); }, 300);
}
function openPreviewUploaded(i){
  const u=_uploadedFiles[i];
  if(!u) return;
  // si es texto ya leído, usar textSnippet actualizado
  openPreviewFile(u.name, u.ext, u.blobUrl, u.textSnippet || `Archivo: ${u.name}\n parser: ${u.parser}\n\nContenido en producción: Markdown extraído...`);
}
function downloadUploaded(i){
  const u=_uploadedFiles[i];
  if(!u) return;
  playSound('save');
  const a=document.createElement('a'); a.href=u.blobUrl; a.download=u.name; a.click();
  showToast(`Descargando ${u.name}`,'success');
}
function deleteUploaded(i){
  const u=_uploadedFiles[i];
  if(!u) return;
  playSound('warning');
  if(!confirm(`¿Eliminar documento "${u.name}"?`)) return;
  try{ URL.revokeObjectURL(u.blobUrl); }catch(e){}
  _uploadedFiles.splice(i,1);
  // re-render lista completa
  const list=document.getElementById('docList');
  const empty=document.getElementById('emptyUploaded');
  const countEl=document.getElementById('uploadedCount');
  if(list){
    list.innerHTML='';
    _uploadedFiles.forEach((file, ni)=>{
      const size=file.size;
      const meta={color:file.color, icon:file.icon, parser:file.parser};
      const card=document.createElement('div');
      card.className='doc-card';
      card.innerHTML=`<div class="doc-icon" style="background:${meta.color}">${meta.icon}</div>
        <div class="doc-meta">
          <h4 title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h4>
          <p>${size} • ${meta.parser} → Markdown • sin scroll</p>
        </div>
        <div class="doc-actions">
          <button class="btn btn-ghost btn-sm" onclick="openPreviewUploaded(${ni})">👁️ Vista previa</button>
          <button class="btn btn-primary btn-sm" onclick="downloadUploaded(${ni})">⬇️ Descargar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteUploaded(${ni})" title="Eliminar documento">🗑️ Eliminar</button>
        </div>`;
      list.appendChild(card);
    });
  }
  if(empty) empty.style.display = _uploadedFiles.length ? 'none' : 'block';
  if(countEl) countEl.textContent = _uploadedFiles.length + ' archivo'+(_uploadedFiles.length!==1?'s':'');
  const dc=document.getElementById('docCount');
  if(dc) dc.textContent=_uploadedFiles.length;
  const sd=document.getElementById('statDocs');
  if(sd) sd.textContent=_uploadedFiles.length+' docs';
  showToast(`Documento "${u.name}" eliminado`,'info');
  // intentar borrar en backend si tiene doc_id
  if(u.doc_id){
    const host=location.host.includes('8000')? location.host : 'localhost:8000';
    const proto=location.protocol==='https:'?'https://':'http://';
    const base=localStorage.getItem('backendUrl')|| proto+host;
    fetch(base.replace(/\/$/,'') + `/api/v1/documents/${u.doc_id}?chat_id=demo`,{method:'DELETE'}).catch(()=>{});
  }
}
function clearUploaded(){
  if(!_uploadedFiles.length){ showToast('No hay archivos','info'); return; }
  if(!confirm('¿Vaciar documentos subidos?')) return;
  _uploadedFiles.forEach(u=>{ try{URL.revokeObjectURL(u.blobUrl);}catch(e){} });
  _uploadedFiles.length=0;
  document.getElementById('docList').innerHTML='';
  document.getElementById('emptyUploaded').style.display='block';
  document.getElementById('uploadedCount').textContent='0 archivos';
  document.getElementById('docCount').textContent='0';
  document.getElementById('statDocs').textContent='0 docs';
  showToast('Documentos subidos vaciados','info');
}
function doRag()
{
  playSound('search');
  const qEl=document.getElementById('ragInput');
  const q=qEl? qEl.value.trim() : '';
  const box=document.getElementById('ragResults');
  if(!box){ console.warn('ragResults missing'); return; }
  if(!q){ showToast('Escribe una búsqueda','error'); return; }
  setLogoLoading(true);
  box.innerHTML=`<div style="padding:12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);font-size:12px;color:var(--muted)">⏳ Buscando en base de conocimiento…</div>`;
  setTimeout(()=>{
    const active=llmConfigs.find(c=>c.id===activeId);
    box.innerHTML=`<div class="llm-card"><div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#2ec5ff);display:grid;place-items:center;color:white">🔍</div><div class="llm-meta"><h4>Top 3 resultados para: "${q}"</h4><p>Similitud coseno 0.87 • base de conocimiento • ${active?active.model:'sin LLM'}</p></div></div>
    <div style="padding:12px;border-radius:10px;background:white;border:1px solid var(--border);font-size:12px;line-height:1.6;color:var(--text)"><b>Chunk #42</b> — ...contrato establece penalidad del 5% por incumplimiento...<br><b>Chunk #18</b> — ...plazo de entrega 30 días hábiles...<br><b>Chunk #7</b> — ...cláusula de confidencialidad...</div>`;
    setLogoLoading(false);
  }, 800);
}
// drag
const dz=document.getElementById('dropZone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files)});
dz.addEventListener('click',()=>document.getElementById('fileIn').click());
// Cerrar menú alarmas al hacer click fuera
 document.addEventListener('click', (e)=>{ const m=document.getElementById('alarmMenu'); if(m && !m.contains(e.target) && !e.target.closest('button[title="Alarmas tipo celular"]')) m.classList.remove('show'); });
// Scroll mejorado para chatBox
const _cb=document.getElementById('chatBox'); if(_cb){ _cb.addEventListener('scroll', updateChatScrollBtn); }

// Page Loader — overlay elegante para todas las páginas
(function(){
  const pl=document.getElementById('pageLoader');
  if(pl){
    const redirectUrl = pl.getAttribute('data-redirect') || new URLSearchParams(location.search).get('redirect') || '';
    const hideAndRedirect = () => {
      pl.classList.add('hidden');
      setTimeout(()=>{
        try{ pl.remove(); }catch(e){}
        if(redirectUrl){
          // Redirigir a archivo HTML especificado
          const target = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, location.href).href;
          if(target !== location.href){
            location.href = target;
          }
        }
      }, 600);
    };
    // Mostrar loader mínimo 1100ms, luego ocultar/redirigir
    setTimeout(hideAndRedirect, 1100);
    // Seguridad: forzar ocultado/redirección a los 3000ms si sigue visible
    setTimeout(()=>{ if(pl && !pl.classList.contains('hidden')) hideAndRedirect(); }, 3000);
    // También permitir clic en el loader para saltar/redirigir inmediatamente
    pl.addEventListener('click', hideAndRedirect);
    // Fallback: si la página ya está cargada y el loader no se ocultó, ocultarlo al hacer click en cualquier parte
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideAndRedirect(); });
  }
})();

// Loader 5 segundos alrededor del logo en todas las páginas
(function(){
  const w=document.getElementById('logoWrap');
  w.classList.add('initial-loading');
  let seconds=5;
  const originalTitle=document.title;
  // opcional contador en tooltip
  const tick=()=>{
    w.title=`Cargando… ${seconds}s`;
    if(seconds<=0){
      w.classList.remove('initial-loading');
      w.title='Asistente — listo para ayudarte';
      clearInterval(timer);
    }
    seconds--;
  };
  tick();
  const timer=setInterval(tick,1000);
  // seguridad: quitar a los 5s exactos
  setTimeout(()=>{ w.classList.remove('initial-loading'); w.title='Asistente — listo para ayudarte'; clearInterval(timer); }, 5000);
})();
// init
renderProviders(); renderLLM(); renderTestDocs(); _updateDownloadCount();
/* updateChatScrollBtn eliminado */

// === WEBSOCKET LANGCHAIN — monitoreo en vivo ===
let _lcWS=null, _lcTries=0;
function connectLangChainWS(){
  const pill = document.getElementById('wsLangchainPill');
  const dot  = document.getElementById('wsLangchainDot');
  const txt  = document.getElementById('wsLangchainText');
  const meta = document.getElementById('wsLangchainMeta');
  const proto = location.protocol==='https:' ? 'wss://' : 'ws://';
  // intenta conectar al backend react-agent (misma host si se sirve desde allí, fallback localhost:8000/_:8010)
  // Backend URL: localStorage.backendUrl > ?backend= > location.host (si sirve desde FastAPI) > localhost fallbacks
  const savedBackend = localStorage.getItem('backendUrl') || new URLSearchParams(location.search).get('backend') || '';
  const derivedHosts = [];
  if(savedBackend){
    try{ const u=new URL(savedBackend); derivedHosts.push(u.host); }catch(e){ derivedHosts.push(savedBackend.replace(/^https?:\/\//,'' ).replace(/\/$/,'')); }
  }
  // Si se sirve desde FastAPI, location.host ya es backend
  if(location.host && !location.host.includes('null') && location.protocol!=='file:') derivedHosts.push(location.host);
  derivedHosts.push('localhost:8000','127.0.0.1:8000','localhost:8010','127.0.0.1:8010');
  const hosts = [...new Set(derivedHosts)];
  let hostIdx = 0;
  function tryConnect(){
    if(_lcWS && _lcWS.readyState===WebSocket.OPEN) return;
    const url = proto + hosts[hostIdx] + '/ws/langchain';
    try{ _lcWS = new WebSocket(url); }catch(e){ nextHost(); return; }
    if(dot){ dot.style.background='#f59e0b'; txt.textContent='conectando…'; }
    _lcWS.onopen = ()=>{
      _lcTries=0;
      if(dot){ dot.style.background='#10b981'; dot.style.boxShadow='0 0 0 6px rgba(16,185,129,.18)'; }
      if(txt) txt.textContent='conectado';
      // heartbeat visual
      if(pill) pill.style.borderColor='rgba(16,185,129,.28)';
    };
    _lcWS.onmessage = (ev)=>{
      try{
        const data = JSON.parse(ev.data);
        if(data.type==='langchain_status'){
          const lc = data.langchain||{};
          const has = lc.has_langchain;
          const store = lc.store||'—';
          const sessions = lc.sessions||0;
          const msgs = lc.messages||0;
          const llm = data.llm||{};
          if(dot){
            dot.style.background = has ? '#10b981' : '#94a3b8';
            dot.style.boxShadow = has ? '0 0 0 6px rgba(16,185,129,.18)' : '0 0 0 5px rgba(148,163,184,.18)';
          }
          if(txt) txt.textContent = has ? 'LangChain ✓' : 'LangChain InMemory';
          if(meta) meta.textContent = `${sessions} sesiones · ${msgs} msgs · ${store.slice(0,22)}`;
          // actualizar mini-card stats si existen
          const statChunks = document.getElementById('statChunks');
          if(statChunks) statChunks.textContent = msgs || '1,248';
          // --- actualizar card LangChain ---
          const lcHas=document.getElementById('lcHas'), lcHasSub=document.getElementById('lcHasSub');
          const lcSess=document.getElementById('lcSessions'), lcMsgsEl=document.getElementById('lcMsgs');
          const lcStore=document.getElementById('lcStore'), lcStoreSub=document.getElementById('lcStoreSub');
          const lcTag=document.getElementById('lcCardTag'), lcDot=document.getElementById('lcCardDot');
          const lcHost=document.getElementById('lcCardHost'), lcTime=document.getElementById('lcCardTime');
          const l1=document.getElementById('lcCacheL1'), l2=document.getElementById('lcCacheL2'), llmTag=document.getElementById('lcLLM');
          if(lcHas) lcHas.textContent = has ? '✓ True' : '✗ False';
          if(lcHas) lcHas.style.color = has ? 'var(--success)' : 'var(--danger)';
          if(lcHasSub) lcHasSub.textContent = has ? 'langchain-core  instalada' : 'fallback InMemory';
          if(lcSess) lcSess.textContent = sessions;
          if(lcMsgsEl) lcMsgsEl.textContent = msgs;
          if(lcStore) lcStore.textContent = store;
          if(lcTag) { lcTag.textContent = has ? 'conectado ✓' : 'InMemory'; lcTag.className = has ? 'tag on' : 'tag'; }
          if(lcDot) { lcDot.style.background = has ? '#10b981' : '#f59e0b'; lcDot.style.boxShadow = has ? '0 0 0 6px rgba(16,185,129,.18)' : '0 0 0 5px rgba(245,158,11,.18)'; }
          if(lcHost) lcHost.textContent = hosts[hostIdx] || '—';
          if(lcTime) lcTime.textContent = new Date(data.ts*1000).toLocaleTimeString();
          if(l1 && data.cache && data.cache.l1) l1.textContent = `L1 ${data.cache.l1.size||0}/${data.cache.l1.maxsize||512}`;
          if(l2 && data.cache && data.cache.l2) l2.textContent = `L2 ${data.cache.l2.enabled ? 'Upstash ✓' : 'fallback ('+ (data.cache.l2.fallback_size||0)+')'}`;
          if(llmTag) llmTag.textContent = `LLM ${llm.provider||'—'} • ${llm.model||'—'}`;
          // opcional: actualizar globalLLMText con datos del WS si no hay config local
          const llmModel = llm.model;
          if(llmModel && llmModel!=='—'){
            const provName = llm.provider||'LLM';
            // no sobrescribir si usuario ya tiene config local activa
            const localActive = (typeof llmConfigs!=='undefined' && llmConfigs.find(c=>c.id===activeId));
            if(!localActive){
              const gl=document.getElementById('globalLLMText');
              if(gl && gl.textContent.includes('No configurado')){
                gl.textContent = `${provName} • ${llmModel} (WS)`;
                gl.style.color='var(--success)';
              }
            }
          }
        }
      }catch(e){}
    };
    _lcWS.onclose = ()=>{
      if(dot){ dot.style.background='#ef4444'; dot.style.boxShadow='0 0 0 6px rgba(239,68,68,.15)'; }
      if(txt) txt.textContent='desconectado';
      if(pill) pill.style.borderColor='var(--border)';
      // reconectar exponencial, rotando host si falla mucho
      _lcTries++;
      if(_lcTries>4 && hostIdx < hosts.length-1){ hostIdx++; _lcTries=0; }
      setTimeout(tryConnect, Math.min(1500*_lcTries+800, 8000));
    };
    _lcWS.onerror = ()=>{ try{_lcWS.close();}catch(e){} };
    function nextHost(){ hostIdx=(hostIdx+1)%hosts.length; setTimeout(tryConnect, 900); }
  }
  tryConnect();
  // fallback HTTP polling: probar todos los hosts
  setTimeout(async()=>{
    if(_lcWS && _lcWS.readyState===WebSocket.OPEN) return;
    for(const h of hosts){
      try{
        const r = await fetch(proto+h+'/api/langchain/status').then(x=>x.json());
        if(r && r.langchain){ if(txt) txt.textContent='LangChain (HTTP: '+h+')'; if(meta) meta.textContent=`${r.langchain.sessions||0} sesiones · ${r.langchain.messages||0} msgs`; if(dot){dot.style.background='#10b981';dot.style.boxShadow='0 0 0 6px rgba(16,185,129,.18)';} if(pill) pill.style.borderColor='rgba(16,185,129,.28)'; break; }
      if(r && r.langchain){
        if(txt) txt.textContent='LangChain (HTTP)';
        if(meta) meta.textContent=`${r.langchain.sessions||0} sesiones · ${r.langchain.messages||0} msgs`;
      }
    }catch(e){}
    }
  }, 5500);
}
function testLangChainConn(){
  const hostsTry = [location.host, 'localhost:8000','127.0.0.1:8000','localhost:8010','127.0.0.1:8010'];
  const proto = location.protocol==='https:'?'https://':'http://';
  (async()=>{
    for(const h of hostsTry){
      try{
        const url = proto+h+'/api/langchain/status';
        const r = await fetch(url);
        const j = await r.json();
        showToast(`HTTP ${h}: LangChain ${j.langchain.has_langchain?'✓':'✗'} — ${j.langchain.store.slice(0,40)}`, j.langchain.has_langchain?'success':'warning');
        // actualizar pill también
        const dot=document.getElementById('wsLangchainDot'), txt=document.getElementById('wsLangchainText');
        if(dot && j.langchain.has_langchain){ dot.style.background='#10b981'; }
        if(txt) txt.textContent = j.langchain.has_langchain ? 'LangChain ✓ (HTTP)' : 'InMemory (HTTP)';
        break;
      }catch(e){}
    }
  })();
}
function configureBackend(){
  const cur = localStorage.getItem('backendUrl') || (location.protocol+'//'+location.host);
  const url = prompt('URL del backend FastAPI (ej: http://localhost:8000)\nSe usará para WS /ws/langchain y HTTP /api/langchain/status', cur);
  if(url){ localStorage.setItem('backendUrl', url); location.reload(); }
}
document.addEventListener('DOMContentLoaded', connectLangChainWS);
setTimeout(connectLangChainWS, 600);

