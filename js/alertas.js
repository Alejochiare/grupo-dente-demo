/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/alertas.js
   VERSIÓN CON ASIGNACIÓN DE USUARIOS + ALERTAS POR HORA
   El watcher de hora está en js/alerta-watcher.js (global)
   ═══════════════════════════════════════════════════════════════ */

let addAlertaOpen = false;
let activeTab = 'activas';
let alertasSort = 'proximas';
let alertasFiltro = 'todas';

let _prefillTurno = null;

const ICON_MAP  = { birthday: '🎉', itv: '⚠️', turno: '📅', general: '🔔' };
const COLOR_MAP = { birthday: 'purple', itv: 'red', turno: 'gold', general: 'blue' };

function _diffDays(isoDate) {
  if (!isoDate) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoDate + 'T00:00:00');
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}
function _calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date(), nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}
function _diasHastaCumple(fechaNac) {
  if (!fechaNac) return null;
  return typeof daysUntil === 'function' ? daysUntil(fechaNac) : _calcDiasHastaCumple(fechaNac);
}
function _calcDiasHastaCumple(fechaNac) {
  const d = new Date(fechaNac), n = new Date();
  let next = new Date(n.getFullYear(), d.getMonth(), d.getDate());
  if (next < n) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next - n) / (1000 * 60 * 60 * 24));
}
function _loadTareasAlertas() { return window._alertasTareas || []; }

/* ── Guardar alertas en localStorage para el watcher global ───── */
function _guardarCacheAlertas() {
  try {
    const soloActivas = (S.alertas || []).filter(a => !a.done);
    localStorage.setItem('crm_alertas_cache', JSON.stringify(soloActivas));
  } catch(e) {}
}

function _checkPrefill() {
  try {
    const raw = sessionStorage.getItem('alertas_prefill');
    if (!raw) return;
    sessionStorage.removeItem('alertas_prefill');
    _prefillTurno = JSON.parse(raw);
    addAlertaOpen = true;
  } catch (e) { _prefillTurno = null; }
}

async function addAlerta(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    tipo:        f.tipoAlerta.value,
    titulo:      f.titulo.value.trim(),
    descripcion: f.descripcion.value.trim(),
    fecha:       f.fecha.value,
    hora:        f.hora ? f.hora.value : null,
    asignadoA:   f.asignadoA ? f.asignadoA.value : null,
    refId:       f.refId?.value    || null,
    refName:     f.refName?.value  || null,
    refPhone:    f.refPhone?.value || null,
  };
  try {
    const res = await CRM.addAlerta(data);
    data.id         = res.id;
    data.done       = false;
    data.creado_por = getSession()?.nombre || '';
    data.asignado_a = data.asignadoA;
    data.hora       = data.hora || null;
    S.alertas.unshift(data);
    addAlertaOpen = false;
    _prefillTurno = null;
    _guardarCacheAlertas();
    render();
    const paraOtro = data.asignadoA && data.asignadoA !== data.creado_por;
    toast(paraOtro ? `Alerta asignada a ${data.asignadoA}` : 'Alerta creada', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function marcarAlerta(id, done) {
  const a = S.alertas.find(x => x.id === id);
  if (!a) return;
  try {
    await CRM.toggleAlerta(id, done ? 1 : 0);
    a.done = done;
    _guardarCacheAlertas();
    render();
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function delAlerta(id) {
  if (!confirm('¿Eliminar esta alerta?')) return;
  try {
    await CRM.delAlerta(id);
    S.alertas = S.alertas.filter(a => a.id !== id);
    _guardarCacheAlertas();
    render();
    toast('Alerta eliminada', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   BÚSQUEDA DE CLIENTE PARA ASOCIAR A ALERTA
   ═══════════════════════════════════════════════════════════════ */
function _alertaClienteSearch(q) {
  const results = document.getElementById('alerta-cliente-results');
  if (!results) return;
  if (!q || q.trim().length < 1) { results.innerHTML = ''; return; }
  const matches = S.clients
    .filter(c => c.status === 'activo')
    .filter(c => (c.name || '').toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q))
    .slice(0, 5);
  if (matches.length === 0) {
    results.innerHTML = `<div style="font-size:12px;color:var(--text-3);padding:6px">Sin resultados</div>`;
    return;
  }
  results.innerHTML = matches.map(c => `
    <div onclick="_alertaClienteSeleccionar('${c.id}','${esc(c.name)}','${esc(c.phone)}')"
      style="padding:8px 10px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;font-size:13px;display:flex;gap:8px;align-items:center;transition:background .1s"
      onmouseover="this.style.background='var(--surface-3)'" onmouseout="this.style.background='var(--surface-2)'">
      <span style="font-weight:600;color:var(--text)">${esc(c.name)}</span>
      <span style="color:var(--text-3);font-size:12px">${esc(c.phone)}</span>
    </div>`).join('');
}

function _alertaClienteSeleccionar(id, nombre, phone) {
  document.getElementById('alerta-cliente-id').value     = id;
  document.getElementById('alerta-cliente-nombre').value = nombre;
  document.getElementById('alerta-cliente-phone').value  = phone;
  document.getElementById('alerta-cliente-results').innerHTML = '';
  document.getElementById('alerta-cliente-search').value = '';
  const sel = document.getElementById('alerta-cliente-selected');
  document.getElementById('alerta-cliente-selected-label').textContent = `👤 ${nombre}  ·  ${phone}`;
  sel.style.display = 'flex';
}

function _alertaClienteDesvincular() {
  document.getElementById('alerta-cliente-id').value     = '';
  document.getElementById('alerta-cliente-nombre').value = '';
  document.getElementById('alerta-cliente-phone').value  = '';
  document.getElementById('alerta-cliente-selected').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════
   FORMULARIO
   ═══════════════════════════════════════════════════════════════ */
function rAlertaForm() {
  const pTipo    = _prefillTurno?.tipo || 'general';
  const pInfo    = _prefillTurno?.info || '';
  const miNombre = getSession()?.nombre || '';
  const usuarios = window._usuariosCRM || [];

  const opcionesTipo = [
    { val: 'general',  label: '🔔 General'    },
    { val: 'birthday', label: '🎉 Cumpleaños' },
    { val: 'itv',      label: '⚠️ ITV'        },
    { val: 'turno',    label: '📅 Turno'      },
  ].map(o => `<option value="${o.val}"${o.val === pTipo ? ' selected' : ''}>${o.label}</option>`).join('');

  const optsUsuarios = usuarios.length ? [
    `<option value="todos">👥 Todos</option>`,
    ...usuarios.map(u => `<option value="${esc(u.nombre)}"${u.nombre === miNombre ? ' selected' : ''}>${esc(u.nombre)}${u.nombre === miNombre ? ' (yo)' : ''}</option>`)
  ].join('') : '';

  return `
  <div class="form-section">
    <div class="form-title">Nueva alerta / recordatorio</div>
    <form onsubmit="addAlerta(event)">
      <div class="fg2">
        <div class="fg"><label>Tipo</label><select name="tipoAlerta">${opcionesTipo}</select></div>
        <div class="fg"><label>Fecha</label><input type="date" name="fecha" value="${todayISO()}"></div>
      </div>
      <div class="fg2">
        <div class="fg">
          <label>Hora (opcional)</label>
          <input type="time" name="hora" placeholder="ej. 17:00">
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">
            Si ponés una hora, el sistema te avisará cuando llegue ese momento.
          </div>
        </div>
      </div>
      <div class="fg"><label>Título *</label>
        <input type="text" name="titulo" placeholder="Descripción corta de la alerta" required
          value="${pTipo === 'turno' && pInfo ? 'Turno gestoría' : ''}">
      </div>
      <div class="fg"><label>Descripción / detalles</label>
        <textarea name="descripcion" placeholder="Información adicional, contexto...">${pInfo ? esc(pInfo) : ''}</textarea>
      </div>
      ${optsUsuarios ? `
      <div class="fg">
        <label>Asignar a</label>
        <select name="asignadoA">${optsUsuarios}</select>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">Podés asignarla a otro integrante, a todos, o dejarla para vos.</div>
      </div>` : ''}

      <div class="hint-box" style="margin-top:10px">
        <div class="hint-label">Cliente asociado (opcional)</div>
        <div class="fg">
          <label>Buscar cliente</label>
          <input type="text" id="alerta-cliente-search"
            placeholder="Escribí nombre o teléfono..."
            autocomplete="off"
            oninput="_alertaClienteSearch(this.value)">
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">Escribí al menos 1 letra para buscar. Dejá vacío si no aplica.</div>
          <div id="alerta-cliente-results" style="margin-top:6px;display:flex;flex-direction:column;gap:4px"></div>
          <input type="hidden" id="alerta-cliente-id"     name="refId">
          <input type="hidden" id="alerta-cliente-nombre" name="refName">
          <input type="hidden" id="alerta-cliente-phone"  name="refPhone">
          <div id="alerta-cliente-selected"
            style="display:none;margin-top:6px;padding:8px 10px;background:rgba(55,138,221,.1);border:1px solid rgba(55,138,221,.3);border-radius:7px;font-size:13px;align-items:center;gap:8px">
            <span id="alerta-cliente-selected-label" style="flex:1;color:var(--text)"></span>
            <button type="button" onclick="_alertaClienteDesvincular()"
              style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:16px;line-height:1">×</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button type="button" class="btn" onclick="addAlertaOpen=false;_prefillTurno=null;render()">Cancelar</button>
        <button type="submit" class="btn primary">Crear alerta</button>
      </div>
    </form>
  </div>`;
}

const _TIPO_BORDER = {
  birthday: 'var(--purple-border)',
  itv:      'rgba(224,85,85,0.45)',
  turno:    'var(--gold-border)',
  general:  'rgba(85,130,224,0.35)',
};

function rAlertItem(a) {
  const dias    = _diffDays(a.fecha);
  const urgente = dias !== null && dias >= 0 && dias <= 2;
  const vencida = dias !== null && dias < 0;

  const borderColor = vencida ? 'var(--red)' : urgente ? 'var(--orange, #e09055)' : (_TIPO_BORDER[a.tipo] || 'var(--border)');
  const urgBg = urgente ? 'background:rgba(224,144,85,0.06);' : vencida ? 'background:rgba(224,85,85,0.05);' : '';

  let urgBadge = '';
  if (!a.done) {
    if (vencida) {
      urgBadge = `<span class="badge bg-red" style="font-size:10px">⚠️ Vencida hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}</span>`;
    } else if (urgente) {
      const horasLabel = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : 'En 2 días';
      urgBadge = `<span class="badge" style="background:rgba(224,144,85,0.18);color:var(--orange,#c97a30);border:1px solid rgba(224,144,85,0.4);font-size:10px">🔥 ${horasLabel}</span>`;
    }
  }

  const horaBadge = a.hora && !a.done
    ? `<span class="badge" style="background:rgba(85,130,224,0.15);color:#7aa0f0;border:1px solid rgba(85,130,224,0.35);font-size:10px">🕐 ${a.hora}</span>`
    : '';

  const miNombre  = getSession()?.nombre || '';
  const creadoPor = a.creado_por || a.creadoPor || '';
  const asignadoA = a.asignado_a || a.asignadoA || '';

  let asigHtml = '';
  if (asignadoA === 'todos') {
    asigHtml = ` · <span style="color:var(--gold)">👥 Para todos</span>`;
  } else if (asignadoA && asignadoA !== creadoPor) {
    asigHtml = asignadoA === miNombre
      ? ` · <span style="color:var(--gold);font-weight:600">📨 Asignada por ${esc(creadoPor)}</span>`
      : ` · <span style="color:var(--gold)">Para <strong>${esc(asignadoA)}</strong></span>`;
  }

  const clienteBadge = a.refName
    ? `<span style="font-size:11px;color:var(--blue);background:rgba(55,138,221,.12);border:1px solid rgba(55,138,221,.3);border-radius:20px;padding:2px 8px;display:inline-flex;align-items:center;gap:4px">👤 ${esc(a.refName)}</span>`
    : '';

  return `
  <div class="alert-item ${a.done ? 'done' : ''}" style="border-left:3px solid ${borderColor};${urgBg}">
    <div class="alert-icon ${a.tipo}" style="font-size:18px">${ICON_MAP[a.tipo] || '🔔'}</div>
    <div class="alert-body">
      <div class="alert-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${esc(a.titulo)} ${urgBadge} ${horaBadge} ${clienteBadge}
      </div>
      <div class="alert-sub">
        ${a.descripcion ? esc(a.descripcion) : ''}
        ${a.fecha ? ' · 📅 ' + a.fecha + (a.hora ? ' 🕐 ' + a.hora : '') : ''}
        · Creada por <strong>${esc(creadoPor)}</strong>${asigHtml}
        ${a.done && (a.marcadoPor||a.marcado_por) ? ' · Completada por <strong>' + esc(a.marcadoPor||a.marcado_por) + '</strong>' : ''}
      </div>
    </div>
    <div class="alert-actions">
      ${a.refPhone ? whatsappBtn(a.refPhone, a.refName || '', true) : ''}
      ${!a.done
        ? `<button class="btn sm success" onclick="marcarAlerta('${a.id}',true)">✓ Hecho</button>`
        : `<button class="btn sm" onclick="marcarAlerta('${a.id}',false)">Reabrir</button>`}
      <button class="btn sm danger" onclick="delAlerta('${a.id}')">×</button>
    </div>
  </div>`;
}

function _getTareasProximas() {
  return _loadTareasAlertas()
    .filter(t => { if (t.done) return false; const d = _diffDays(t.fecha); return d !== null && d >= 0 && d <= 1; })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

function rTareasProximas() {
  const tareas = _getTareasProximas();
  if (tareas.length === 0) return '';
  const miNombre = getSession()?.nombre || '';
  const items = tareas.map(t => {
    const d = _diffDays(t.fecha);
    const label = d === 0 ? 'Hoy' : 'Mañana';
    const color = d === 0 ? 'var(--gold)' : 'var(--green)';
    const badge = d === 0 ? 'bg-gold' : 'bg-green';
    const creadoPor = t.creado_por || t.creadoPor || '';
    const asignadoA = t.asignado_a || t.asignadoA || '';
    const asigHtml  = asignadoA && asignadoA !== creadoPor
      ? (asignadoA === miNombre
          ? ` · <span style="color:var(--gold)">Asignada por ${esc(creadoPor)}</span>`
          : ` · Para <strong>${esc(asignadoA)}</strong>`)
      : '';
    return `
    <div class="alert-item" style="border-left:3px solid ${color}">
      <div style="font-size:18px">📋</div>
      <div class="alert-body">
        <div class="alert-title">${esc(t.titulo)}</div>
        <div class="alert-sub">
          ${t.descripcion ? esc(t.descripcion) + ' · ' : ''}
          ${t.clienteNombre ? '👤 ' + esc(t.clienteNombre) + ' · ' : ''}
          Por <strong>${esc(creadoPor)}</strong>${asigHtml}
        </div>
      </div>
      <div class="alert-actions">
        ${t.clientePhone ? whatsappBtn(t.clientePhone, t.clienteNombre || '', true) : ''}
        <span class="badge ${badge}">${label}</span>
        <a href="tareas.html" class="btn sm">Ver tareas</a>
      </div>
    </div>`;
  }).join('');
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">
      📋 Tareas (hoy y mañana)
    </div>
    ${items}
  </div>`;
}

function _getCumpleaniosProximos() {
  return S.clients
    .filter(c => c.fechaCumple)
    .map(c => ({ ...c, diasHasta: _diasHastaCumple(c.fechaCumple), edad: _calcEdad(c.fechaCumple) }))
    .filter(c => c.diasHasta !== null && c.diasHasta >= 0 && c.diasHasta <= 1)
    .sort((a, b) => a.diasHasta - b.diasHasta);
}

function rCumpleanios() {
  const clientes = _getCumpleaniosProximos();
  if (clientes.length === 0) return '';
  const items = clientes.map(c => {
    const esHoy = c.diasHasta === 0;
    const label = esHoy ? '¡Hoy!' : 'Mañana';
    const badge = esHoy ? 'bg-purple' : 'bg-blue';
    const edad  = c.edad !== null ? `· Cumple ${c.edad} años` : '';
    return `
    <div class="alert-item${esHoy ? ' birthday-hoy' : ''}">
      <div style="font-size:18px">${esHoy ? '🎁' : '🎂'}</div>
      <div class="alert-body">
        <div class="alert-title">${esc(c.name)} ${esHoy ? '🎉' : ''}</div>
        <div class="alert-sub">${c.phone}${c.email ? ' · ' + esc(c.email) : ''} ${edad}</div>
      </div>
      <div class="alert-actions">
        ${whatsappBtn(c.phone, c.name, true)}
        ${esHoy ? `<button class="btn sm" style="border-color:var(--purple-border);color:var(--purple)"
            onclick="openWhatsAppBirthday('${esc(c.phone)}','${esc(c.name)}')">🎉 Felicitar</button>` : ''}
        <span class="badge ${badge}">${label}</span>
      </div>
    </div>`;
  }).join('');
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">
      🎂 Cumpleaños (hoy y mañana)
    </div>
    ${items}
  </div>`;
}

function render() {
  const pendientes  = S.alertas.filter(a => !a.done);
  const completadas = S.alertas.filter(a =>  a.done);
  const tipos = ['birthday', 'itv', 'turno', 'general'];
  const cntTipo = {};
  tipos.forEach(t => { cntTipo[t] = pendientes.filter(a => a.tipo === t).length; });
  const badgesConf = {
    birthday: { clase: 'bg-purple', label: (n) => `🎉 ${n} cumpleaños` },
    itv:      { clase: 'bg-red',    label: (n) => `⚠️ ${n} ITV` },
    turno:    { clase: 'bg-gold',   label: (n) => `📅 ${n} turno${n > 1 ? 's' : ''}` },
    general:  { clase: 'bg-blue',   label: (n) => `🔔 ${n} general${n > 1 ? 'es' : ''}` },
  };
  const badgesHtml = tipos.map(tipo => {
    const n = cntTipo[tipo]; if (n === 0) return '';
    return `<span class="badge ${badgesConf[tipo].clase}">${badgesConf[tipo].label(n)}</span>`;
  }).join('');
  const urgentes = pendientes.filter(a => { const d = _diffDays(a.fecha); return d !== null && d >= 0 && d <= 2; }).length;
  const cumpleHoy = _getCumpleaniosProximos().filter(c => c.diasHasta === 0);
  const miNombre  = getSession()?.nombre || '';
  const asignadasAMi = pendientes.filter(a => {
    const asig    = a.asignado_a || a.asignadoA || '';
    const creador = a.creado_por || a.creadoPor || '';
    return asig === miNombre && creador !== miNombre;
  }).length;

  const filtrosBtns = [
    { val: 'todas',    icon: '🔔', label: `Todas (${pendientes.length})` },
    { val: 'birthday', icon: '🎉', label: `Cumpleaños (${cntTipo.birthday})` },
    { val: 'itv',      icon: '⚠️', label: `ITV (${cntTipo.itv})` },
    { val: 'turno',    icon: '📅', label: `Turno (${cntTipo.turno})` },
    { val: 'general',  icon: '🔔', label: `General (${cntTipo.general})` },
  ]
    .filter(f => f.val === 'todas' || cntTipo[f.val] > 0)
    .map(f => `<button class="btn sm${alertasFiltro === f.val ? ' active' : ''}" onclick="alertasFiltro='${f.val}';render()">${f.icon} ${f.label}</button>`)
    .join('');

  let html = `
  <div class="section-head">
    <div class="section-title">Alertas y recordatorios</div>
    <button class="btn primary" onclick="addAlertaOpen=true;_prefillTurno=null;render()">+ Nueva alerta</button>
  </div>
  ${addAlertaOpen ? rAlertaForm() : ''}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem;align-items:center">
    ${badgesHtml}
    ${urgentes > 0 ? `<span class="badge" style="background:rgba(224,144,85,0.18);color:var(--orange,#c97a30);border:1px solid rgba(224,144,85,0.4)">🔥 ${urgentes} vence en 48 h</span>` : ''}
    ${asignadasAMi > 0 ? `<span class="badge" style="background:rgba(85,130,224,0.18);color:#5582e0;border:1px solid rgba(85,130,224,0.4)">📨 ${asignadasAMi} asignada${asignadasAMi > 1 ? 's' : ''} por otro</span>` : ''}
  </div>
  ${rCumpleanios()}
  ${rTareasProximas()}
  <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
              color:var(--text-3);margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid var(--border)">
    🔔 Alertas manuales
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn ${activeTab === 'activas' ? 'active' : ''}" onclick="activeTab='activas';render()">Activas (${pendientes.length})</button>
      <button class="tab-btn ${activeTab === 'done'    ? 'active' : ''}" onclick="activeTab='done';render()">Completadas (${completadas.length})</button>
    </div>
    <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-3)">
      Orden:
      <button class="btn sm${alertasSort === 'proximas' ? ' active' : ''}" onclick="alertasSort='proximas';render()">📅 Más próximas</button>
      <button class="btn sm${alertasSort === 'tipo'     ? ' active' : ''}" onclick="alertasSort='tipo';render()">🕐 Por tipo</button>
    </div>
  </div>
  ${activeTab === 'activas' && pendientes.length > 0 ? `
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 12px;
              background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
    <span style="font-size:11px;color:var(--text-3);font-weight:600;align-self:center;margin-right:2px">FILTRAR:</span>
    ${filtrosBtns}
  </div>` : ''}`;

  if (activeTab === 'activas') {
    let lista = alertasFiltro === 'todas' ? pendientes : pendientes.filter(a => a.tipo === alertasFiltro);
    if (alertasSort === 'proximas') {
      lista = [...lista].sort((a, b) => {
        const fa = a.fecha ? new Date(a.fecha + (a.hora ? 'T' + a.hora : 'T00:00')) : new Date('9999-12-31');
        const fb = b.fecha ? new Date(b.fecha + (b.hora ? 'T' + b.hora : 'T00:00')) : new Date('9999-12-31');
        return fa - fb;
      });
    } else {
      const orden = ['birthday', 'itv', 'turno', 'general'];
      lista = [...lista].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo));
    }
    if (lista.length === 0) {
      html += `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <strong>${alertasFiltro !== 'todas' ? 'Sin resultados para este filtro' : 'Sin alertas activas'}</strong>
        <div style="font-size:13px;margin-top:4px">${alertasFiltro !== 'todas' ? 'No hay alertas de ese tipo.' : '¡Todo al día!'}</div>
        ${alertasFiltro !== 'todas' ? `<button class="btn sm" style="margin-top:10px" onclick="alertasFiltro='todas';render()">Ver todas</button>` : ''}
      </div>`;
    } else {
      html += lista.map(a => rAlertItem(a)).join('');
    }
  } else {
    if (completadas.length === 0) {
      html += `<div class="empty"><div class="empty-icon">○</div><strong>Sin alertas completadas</strong></div>`;
    } else {
      html += completadas.map(a => rAlertItem(a)).join('');
    }
  }

  document.getElementById('view').innerHTML = html;
  if (cumpleHoy.length > 0) toast(`🎉 Cumpleaños hoy: ${cumpleHoy.map(c => c.name).join(', ')}`, 'success');
  if (_prefillTurno) toast('📅 Completá los datos del turno y guardá la alerta', 'info');
}

bootApp('alertas').then(async () => {
  try { window._alertasTareas = await CRM.getTareas()  || []; } catch(e) { window._alertasTareas = []; }
  try { window._usuariosCRM   = await CRM.getUsuarios() || []; } catch(e) { window._usuariosCRM = []; }
  _checkPrefill();
  render();
  _guardarCacheAlertas();
});