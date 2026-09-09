/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/gestoria.js
   ═══════════════════════════════════════════════════════════════ */

let addMiembroOpen = false;
let editMiembroId  = null;
let activeTab      = 'vehiculos';
let gestoriaCarId  = null;
let verGestoriaId  = null;
let gFilterStatus  = '';
let gestoriaSearch = '';   // ← estado del buscador

const ROLES_SUGERIDOS = ['Administrador','Jefe de Ventas','Vendedor','Peritador','Recepcionista','Gestor','Otro'];

const GESTORIA_ITEMS = [
  { key: 'form08',          label: 'Formulario 08',                                   desc: 'Firmado en el registro correspondiente de radicación o ante escribano público y legalizado por el colegio (firma cónyuge si corresponde)' },
  { key: 'verificPolicial', label: 'Verificación policial',                           desc: '' },
  { key: 'multasNac',       label: 'Informe de multas nacionales',                    desc: 'Actualizado a la fecha solicitada' },
  { key: 'dominioHist',     label: 'Informe Estado Dominio Histórico de Titularidad', desc: 'Actualizado a la fecha solicitada' },
  { key: 'libreDeudas',     label: 'Libre deudas y multas municipales',               desc: 'Actualizado a la fecha solicitada' },
  { key: 'titulo',          label: 'Título automotor',                                desc: '' },
  { key: 'cedulas',         label: 'Cédulas de identificación',                       desc: '' },
  { key: 'identificacion',  label: 'Identificación (verde) Autorizados (azules)',     desc: '' },
];

/* ── Estilos del buscador ── */
function _inyectarEstilosBuscadorGestoria() {
  if (document.getElementById('neifert-gestoria-search-styles')) return;
  const st = document.createElement('style');
  st.id = 'neifert-gestoria-search-styles';
  st.textContent = `
    .gestoria-search-wrap { position:relative; margin-bottom:1rem; }
    .gestoria-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; line-height:1; opacity:.6; }
    .gestoria-search-input { width:100%; box-sizing:border-box; padding:10px 36px 10px 34px; border-radius:8px; border:1.5px solid var(--border,#555); background:var(--surface-2,#2a2a2a); color:var(--text,#fff); font-size:14px; outline:none; transition:border-color .15s; }
    .gestoria-search-input:focus { border-color:var(--blue,#378ADD); background:var(--surface-3,#333); }
    .gestoria-search-input::placeholder { color:var(--text-3,#666); }
    .gestoria-search-clear { position:absolute; right:9px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-3); font-size:20px; line-height:1; padding:2px 5px; border-radius:4px; display:none; opacity:.6; }
    .gestoria-search-clear.visible { display:block; }
    .gestoria-search-clear:hover { opacity:1; color:var(--text); }
  `;
  document.head.appendChild(st);
}

function getGestoria(car) {
  if (!car.gestoria) car.gestoria = { estado: 'pendiente', items: {}, notas: '', fechaInicio: '', fechaCierre: '' };
  return car.gestoria;
}

function gestoriaProgress(car) {
  const g    = getGestoria(car);
  const done = GESTORIA_ITEMS.filter(i => g.items[i.key]?.checked).length;
  return { done, total: GESTORIA_ITEMS.length, pct: Math.round((done / GESTORIA_ITEMS.length) * 100) };
}

function autoUpdateEstado(car) {
  const g = getGestoria(car);
  const { done, total } = gestoriaProgress(car);
  g.estado = done === total ? 'completa' : done > 0 ? 'en_proceso' : 'pendiente';
}

/* ── ¿El auto tiene gestoría iniciada/guardada? ── */
function tieneGestoriaIniciada(car) {
  const g = car.gestoria;
  if (!g) return false;
  const items = g.items || {};
  const algunItem = Object.values(items).some(i => i && i.checked);
  return algunItem
      || g.estado === 'en_proceso'
      || g.estado === 'completa'
      || !!g.ultimoGuardadoPor
      || (typeof g.notas === 'string' && g.notas.trim() !== '');
}

/* ── ITV ── */
async function setITVGestoria(carId, status) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  car.itv = status;
  if (status === 'si') car.itvVenc = '';
  try { await CRM.editVehiculo({ ...car }); renderGestoriaModal(); renderVehiculosList(); }
  catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function setITVDateGestoria(carId, date) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  car.itvVenc = date;
  try { await CRM.editVehiculo({ ...car }); } catch(err) { toast('Error: ' + err.message, 'error'); }
}

function solicitarTurnoDesdeGestoria(carId, itemKey, itemLabel) {
  const car = S.cars.find(c => c.id === carId);
  const contexto = {
    tipo: 'turno', titulo: 'Solicitar turno',
    info: car ? `Gestoría · ${car.brand} ${car.model} ${car.year}${car.patente ? ' · ' + car.patente : ''} · ${itemLabel}` : itemLabel,
  };
  sessionStorage.setItem('alertas_prefill', JSON.stringify(contexto));
  window.location.href = 'alertas.html';
}

/* ═══════════════════════════════════════════════════════════════
   MODAL VINCULAR COMPRADOR
   ═══════════════════════════════════════════════════════════════ */

let _vincularCarId          = null;
let _vincularSelectedClient = null;

function openVincularModal(carId) {
  _vincularCarId          = carId;
  _vincularSelectedClient = null;
  const prev = document.getElementById('vincular-modal-overlay');
  if (prev) prev.remove();

  const car = S.cars.find(c => c.id === carId);
  if (!car) return;

  const clientes = S.clients;
  let listHtml = '';
  if (clientes.length === 0) {
    listHtml = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px">No hay clientes cargados.</div>`;
  } else {
    clientes.forEach(c => {
      const statusColor = c.status === 'vendido' ? 'var(--green)' : c.status === 'descartado' ? 'var(--text-3)' : 'var(--blue)';
      const statusLabel = c.status === 'vendido' ? 'Vendido' : c.status === 'descartado' ? 'Descartado' : 'Activo';
      listHtml += `
      <div id="vci-${c.id}" onclick="_vincularSelectCliente('${c.id}')" style="
        display:flex;align-items:center;gap:12px;padding:10px 12px;
        border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);
        cursor:pointer;margin-bottom:8px;transition:border-color .12s,background .12s"
        onmouseover="this.style.borderColor='var(--blue)';this.style.background='rgba(55,138,221,.07)'"
        onmouseout="if(!this.classList.contains('sel')){this.style.borderColor='var(--border)';this.style.background='var(--surface-2)'}">
        <div id="vcr-${c.id}" style="width:18px;height:18px;border-radius:50%;flex-shrink:0;border:2px solid var(--border-md);background:var(--surface-3);position:relative;transition:all .12s"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(c.name)}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:1px">${esc(c.phone)}</div>
        </div>
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;color:${statusColor};border:1px solid ${statusColor};opacity:.7">${statusLabel}</span>
      </div>`;
    });
  }

  const overlay = document.createElement('div');
  overlay.id = 'vincular-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem';
  overlay.innerHTML = `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:480px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px">🔗 Vincular comprador</div>
      <div style="font-size:12px;color:var(--text-3)">
        Vehículo: <strong style="color:var(--text-2)">${esc(car.brand)} ${esc(car.model)} ${car.year}</strong>
        ${car.patente ? `<span style="margin-left:6px">[${esc(car.patente)}]</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-top:3px">Seleccioná el cliente que compró este vehículo</div>
    </div>
    <div style="overflow-y:auto;flex:1;padding:1rem 1.5rem">${listHtml}</div>
    <div style="padding:.9rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
      <button class="btn" onclick="_vincularModalClose()">Cancelar</button>
      <button class="btn primary" id="vincular-confirm-btn" onclick="_vincularConfirmar()" disabled style="opacity:.45;cursor:not-allowed">🔗 Vincular</button>
    </div>
  </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) _vincularModalClose(); });
  document.body.appendChild(overlay);
}

function _vincularSelectCliente(clienteId) {
  if (_vincularSelectedClient) {
    const prev = document.getElementById('vci-' + _vincularSelectedClient);
    if (prev) { prev.style.borderColor = 'var(--border)'; prev.style.background = 'var(--surface-2)'; prev.classList.remove('sel'); }
    const prevR = document.getElementById('vcr-' + _vincularSelectedClient);
    if (prevR) { prevR.style.borderColor = 'var(--border-md)'; prevR.style.background = 'var(--surface-3)'; prevR.innerHTML = ''; }
  }
  _vincularSelectedClient = clienteId;
  const item = document.getElementById('vci-' + clienteId);
  if (item) { item.style.borderColor = 'var(--green)'; item.style.background = 'rgba(76,175,125,.1)'; item.classList.add('sel'); }
  const radio = document.getElementById('vcr-' + clienteId);
  if (radio) {
    radio.style.borderColor = 'var(--green)'; radio.style.background = 'var(--green)';
    radio.innerHTML = '<div style="width:7px;height:7px;border-radius:50%;background:#fff;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>';
  }
  const btn = document.getElementById('vincular-confirm-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
}

function _vincularModalClose() {
  const el = document.getElementById('vincular-modal-overlay');
  if (el) el.remove();
  _vincularCarId          = null;
  _vincularSelectedClient = null;
}

async function _vincularConfirmar() {
  if (!_vincularCarId || !_vincularSelectedClient) return;
  const car     = S.cars.find(c => c.id === _vincularCarId);
  const cliente = S.clients.find(c => c.id === _vincularSelectedClient);
  if (!car || !cliente) return;
  const btn = document.getElementById('vincular-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    const carData = { ...car, ventaClienteId: cliente.id, fechaVenta: car.fechaVenta || todayISO() };
    await CRM.editVehiculo(carData);
    Object.assign(car, carData);
    const clienteData = { ...cliente, status: 'vendido', ventaCarId: car.id, fechaVenta: car.fechaVenta || todayISO() };
    await CRM.editCliente(clienteData);
    Object.assign(cliente, clienteData);
    _vincularModalClose();
    renderVehiculosList();
    toast(`✓ Vinculado: ${cliente.name} → ${car.brand} ${car.model}`, 'success');
  } catch(err) {
    toast('Error al vincular: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Vincular'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   MODAL EDITAR GESTORÍA
   ═══════════════════════════════════════════════════════════════ */

function openGestoriaModal(carId) { gestoriaCarId = carId; renderGestoriaModal(); }

function closeGestoriaModal() {
  gestoriaCarId = null;
  const el = document.getElementById('gestoria-modal-overlay');
  if (el) el.remove();
}

function renderGestoriaModal() {
  const existing = document.getElementById('gestoria-modal-overlay');
  if (existing) existing.remove();
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;

  const g         = getGestoria(car);
  const prog      = gestoriaProgress(car);
  const progColor = prog.pct === 100 ? 'var(--green)' : prog.pct > 0 ? 'var(--orange)' : 'var(--text-3)';
  const comprador = car.ventaClienteId ? S.clients.find(c => c.id === car.ventaClienteId) : null;

  const itemRows = GESTORIA_ITEMS.map(item => {
    const iv      = g.items[item.key] || { checked: false, fecha: '', obs: '' };
    const checked = !!iv.checked;
    return `
    <div id="grow-${item.key}" style="display:flex;align-items:flex-start;gap:14px;padding:14px 16px;margin-bottom:8px;border-radius:var(--radius);border:1px solid ${checked ? 'rgba(76,175,125,0.25)' : 'var(--border)'};background:${checked ? 'rgba(76,175,125,0.04)' : 'var(--surface-2)'};transition:all .2s">
      <div data-checkbox onclick="toggleItem('${item.key}')" style="width:22px;height:22px;border-radius:5px;flex-shrink:0;margin-top:2px;background:${checked ? 'var(--green)' : 'var(--surface-3)'};border:2px solid ${checked ? 'var(--green)' : 'var(--border-md)'};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;font-size:12px;font-weight:800;color:#fff;user-select:none">${checked ? '✓' : ''}</div>
      <div style="flex:1;min-width:0">
        <div data-label onclick="toggleItem('${item.key}')" style="font-size:13px;font-weight:600;color:${checked ? 'var(--green)' : 'var(--text)'};margin-bottom:${item.desc ? '3px' : '10px'};cursor:pointer;user-select:none">${esc(item.label)}</div>
        ${checked && iv.marcadoPor ? `<div style="font-size:10px;color:var(--green);margin-top:-6px;margin-bottom:4px">✓ Marcado por <strong>${esc(iv.marcadoPor)}</strong>${iv.fecha ? ' · ' + iv.fecha : ''}</div>` : ''}
        ${item.desc ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${esc(item.desc)}</div>` : ''}
        <div data-btn-turno style="margin-bottom:7px;display:${checked ? 'none' : 'block'}">
          <button class="btn sm" onclick="solicitarTurnoDesdeGestoria('${car.id}','${item.key}','${esc(item.label)}')" style="font-size:11px;padding:4px 12px;display:inline-flex;align-items:center;gap:5px">📅 Solicitar turno</button>
        </div>
        <input type="text" placeholder="Observación (opcional)…" value="${esc(iv.nota || iv.obs || '')}" onchange="setItemObs('${item.key}',this.value)"
          style="width:100%;font-size:12px;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font)">
      </div>
    </div>`;
  }).join('');

  const html = `
  <div class="modal-overlay" id="gestoria-modal-overlay" onclick="if(event.target.id==='gestoria-modal-overlay')closeGestoriaModal()">
    <div class="modal modal-wide" style="max-width:660px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:92vh">
      <div style="padding:1.4rem 1.75rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:600;margin-bottom:4px">Gestoría del vehículo</div>
            <div class="modal-title" style="margin-bottom:4px;font-size:20px">${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3);font-size:16px;font-weight:400">${car.year}</span></div>
            ${car.patente ? `<div style="font-size:12px;color:var(--text-3)">Patente: <strong style="color:var(--text-2)">${esc(car.patente)}</strong></div>` : ''}
            ${comprador ? `
            <div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(76,175,125,.08);border:1px solid rgba(76,175,125,.25);border-left:3px solid var(--green);border-radius:6px;font-size:12px">
              <span>🧑</span>
              <div>
                <div style="font-weight:600;color:var(--text-2)">${esc(comprador.name)}</div>
                <div style="color:var(--text-3);font-size:11px">${esc(comprador.phone)}${car.fechaVenta ? ' · Vendido el ' + car.fechaVenta : ''}</div>
              </div>
              <button class="btn sm" onclick="closeGestoriaModal();openVincularModal('${car.id}')" style="font-size:11px;padding:3px 8px;margin-left:4px">Cambiar</button>
            </div>` : `
            <div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:var(--surface-3);border:1px solid var(--border);border-radius:6px;font-size:12px">
              <span style="color:var(--text-3)">Sin comprador vinculado</span>
              <button class="btn sm" onclick="closeGestoriaModal();openVincularModal('${car.id}')" style="font-size:11px;padding:3px 8px;border-color:var(--blue);color:var(--blue)">🔗 Vincular</button>
            </div>`}
          </div>
          <button class="btn sm" onclick="closeGestoriaModal()">✕ Cerrar</button>
        </div>
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em">Progreso de documentación</span>
            <span id="gestoria-prog-count" style="font-size:13px;font-weight:700;color:${progColor}">${prog.done}/${prog.total} ítems</span>
          </div>
          <div style="height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden">
            <div id="gestoria-prog-bar" style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:3px;transition:width .4s ease"></div>
          </div>
        </div>
      </div>

      <div style="padding:1.25rem 1.75rem;overflow-y:auto;flex:1">
        ${(()=>{
          const itvOk = car.itv === 'si', itvNo = car.itv === 'no';
          const dITV = itvNo && car.itvVenc ? Math.ceil((new Date(car.itvVenc)-new Date())/(1000*60*60*24)) : null;
          const itvVencida = dITV!==null && dITV<=0, itvProxima = dITV!==null && dITV>0 && dITV<=30;
          const borde = itvVencida?'rgba(224,85,85,0.45)':itvProxima?'rgba(224,144,85,0.4)':itvOk?'rgba(76,175,125,0.3)':'var(--border-md)';
          const fondo = itvVencida?'rgba(224,85,85,0.05)':itvProxima?'rgba(224,144,85,0.05)':itvOk?'rgba(76,175,125,0.04)':'var(--surface-2)';
          return `
        <div style="padding:14px 16px;border-radius:var(--radius);border:1px solid ${borde};background:${fondo};margin-bottom:1.25rem">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600;margin-bottom:10px">🚗 Estado ITV</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <button onclick="setITVGestoria('${car.id}','si')" class="btn sm${itvOk?' success':''}">✓ Al día</button>
            <button onclick="setITVGestoria('${car.id}','no')" class="btn sm" style="${itvNo?'border-color:var(--red);color:var(--red);font-weight:700':''}">⚠️ Vencida / Pendiente</button>
            ${itvNo?`<input type="date" value="${car.itvVenc||''}" onchange="setITVDateGestoria('${car.id}',this.value)" style="font-size:12px;padding:5px 9px;border:1px solid var(--border-md);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-family:var(--font)">
            <button onclick="solicitarTurnoITV('${car.id}')" class="btn sm" style="border-color:var(--gold-border);color:var(--gold)">📅 Solicitar turno ITV</button>`:''}
          </div>
          ${itvVencida?`<div style="font-size:11px;color:var(--red);margin-top:8px">⚠️ ITV vencida hace ${Math.abs(dITV)} día${Math.abs(dITV)>1?'s':''}.</div>`:''}
          ${itvProxima?`<div style="font-size:11px;color:var(--orange);margin-top:8px">⏳ Vence en ${dITV} día${dITV>1?'s':''}.</div>`:''}
        </div>`;
        })()}
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600;margin-bottom:10px">
          Documentación requerida &nbsp;·&nbsp; <span style="color:var(--text-3);font-weight:400;text-transform:none;letter-spacing:0">hacé clic en cada ítem para marcarlo</span>
        </div>
        <div id="gestoria-checklist">${itemRows}</div>
        <div style="margin-top:1rem">
          <label style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:5px">Notas generales</label>
          <textarea placeholder="Notas, aclaraciones, referencias…" onchange="setGestoriaNotas(this.value)"
            style="width:100%;font-family:var(--font);font-size:13px;padding:9px 12px;background:var(--surface-2);border:1px solid var(--border-md);border-radius:var(--radius);color:var(--text);resize:vertical;min-height:70px">${esc(g.notas || '')}</textarea>
        </div>
      </div>

      <div style="padding:1rem 1.75rem;border-top:1px solid var(--border);flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <span id="gestoria-guardado-info" style="font-size:12px;color:var(--text-3)"></span>
        <div style="display:flex;gap:8px">
          <button class="btn" onclick="closeGestoriaModal()">Cerrar</button>
          <button class="btn primary" onclick="guardarGestoria()">💾 Guardar gestoría</button>
        </div>
      </div>
    </div>
  </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el.firstElementChild);
}

async function guardarGestoria() {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  autoUpdateEstado(car);
  try {
    await CRM.saveGestoria({ vehiculoId: car.id, estado: g.estado, items: g.items||{}, notas: g.notas||'', fechaInicio: g.fechaInicio||'', fechaCierre: g.fechaCierre||'' });
    toast('Gestoría guardada por ' + getSession().nombre, 'success');
    closeGestoriaModal();
    renderVehiculosList();
  } catch(err) { toast('Error al guardar: ' + err.message, 'error'); }
}

function toggleItem(key) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  if (!g.items[key]) g.items[key] = { checked: false, fecha: '', obs: '' };
  g.items[key].checked = !g.items[key].checked;
  if (g.items[key].checked) {
    if (!g.items[key].fecha) g.items[key].fecha = todayISO();
    g.items[key].marcadoPor = getSession().nombre;
  } else { g.items[key].marcadoPor = null; }
  autoUpdateEstado(car);
  const checked = g.items[key].checked;
  const row = document.getElementById('grow-' + key);
  if (row) {
    row.style.border = '1px solid ' + (checked ? 'rgba(76,175,125,0.25)' : 'var(--border)');
    row.style.background = checked ? 'rgba(76,175,125,0.04)' : 'var(--surface-2)';
    const cb = row.querySelector('[data-checkbox]');
    if (cb) { cb.style.background=checked?'var(--green)':'var(--surface-3)'; cb.style.border='2px solid '+(checked?'var(--green)':'var(--border-md)'); cb.textContent=checked?'✓':''; }
    const lbl = row.querySelector('[data-label]');
    if (lbl) lbl.style.color = checked ? 'var(--green)' : 'var(--text)';
    const bt = row.querySelector('[data-btn-turno]');
    if (bt) bt.style.display = checked ? 'none' : 'block';
  }
  const prog = gestoriaProgress(car);
  const pc = prog.pct===100?'var(--green)':prog.pct>0?'var(--orange)':'var(--text-3)';
  const pb = document.getElementById('gestoria-prog-bar');
  if (pb) { pb.style.width=prog.pct+'%'; pb.style.background=pc; }
  const pct = document.getElementById('gestoria-prog-count');
  if (pct) { pct.textContent=prog.done+'/'+prog.total+' ítems'; pct.style.color=pc; }
  renderVehiculosList();
  if (verGestoriaId) renderVerGestoria();
}

function setItemObs(key, val) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  if (!g.items[key]) g.items[key] = { checked:false, fecha:'', nota:'', obs:'' };
  g.items[key].nota = val;
  g.items[key].obs  = val;
}

function setGestoriaNotas(val) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  getGestoria(car).notas = val;
}

async function marcarTodosListo() {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  GESTORIA_ITEMS.forEach(item => {
    if (!g.items[item.key]) g.items[item.key] = { checked:false, fecha:'', obs:'' };
    g.items[item.key].checked = true;
    if (!g.items[item.key].fecha) g.items[item.key].fecha = todayISO();
  });
  autoUpdateEstado(car);
  try {
    await CRM.saveGestoria({ vehiculoId: car.id, estado: g.estado, items: g.items, notas: g.notas||'' });
    renderGestoriaModal(); renderVehiculosList();
    if (verGestoriaId) renderVerGestoria();
    toast('Todos los ítems marcados como listos', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   MODAL VER GESTORÍA
   ═══════════════════════════════════════════════════════════════ */

function openVerGestoria(carId) { verGestoriaId = carId; renderVerGestoria(); }

function closeVerGestoria() {
  verGestoriaId = null;
  const el = document.getElementById('ver-gestoria-overlay');
  if (el) el.remove();
}

function renderVerGestoria() {
  const existing = document.getElementById('ver-gestoria-overlay');
  if (existing) existing.remove();
  const car = S.cars.find(c => c.id === verGestoriaId);
  if (!car) return;
  const g         = getGestoria(car);
  const prog      = gestoriaProgress(car);
  const progColor = prog.pct===100?'var(--green)':prog.pct>0?'var(--orange)':'var(--text-3)';
  const eColor    = g.estado==='completa'?'var(--green)':g.estado==='en_proceso'?'var(--orange)':'var(--text-3)';
  const eBg       = g.estado==='completa'?'var(--green-bg)':g.estado==='en_proceso'?'var(--orange-bg)':'var(--surface-3)';
  const eBord     = g.estado==='completa'?'var(--green-border)':g.estado==='en_proceso'?'rgba(224,144,85,0.3)':'var(--border)';
  const eLabel    = g.estado==='completa'?'✓ Completa':g.estado==='en_proceso'?'⏳ En proceso':'— Sin iniciar';
  const comprador = car.ventaClienteId ? S.clients.find(c => c.id === car.ventaClienteId) : null;

  const itemRows = GESTORIA_ITEMS.map(item => {
    const iv = g.items[item.key] || {};
    const checked = !!iv.checked;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--border)">
      <div style="width:20px;height:20px;border-radius:4px;flex-shrink:0;background:${checked?'var(--green)':'var(--surface-3)'};border:2px solid ${checked?'var(--green)':'var(--border-md)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff">${checked?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <span style="font-size:13px;color:${checked?'var(--text)':'var(--text-3)'};font-weight:${checked?'500':'400'}">${esc(item.label)}</span>
        ${checked&&iv.marcadoPor?`<div style="font-size:10px;color:var(--green);margin-top:2px">por <strong>${esc(iv.marcadoPor)}</strong>${iv.fecha?' · '+iv.fecha:''}</div>`:''}
        ${iv.obs?`<div style="font-size:11px;color:var(--text-3);margin-top:2px;font-style:italic">"${esc(iv.obs)}"</div>`:''}
      </div>
      <span style="font-size:10px;font-weight:600;flex-shrink:0;padding:2px 8px;border-radius:100px;background:${checked?'var(--green-bg)':'var(--surface-3)'};color:${checked?'var(--green)':'var(--text-3)'};border:1px solid ${checked?'var(--green-border)':'var(--border)'}">${checked?'Listo':'Pendiente'}</span>
    </div>`;
  }).join('');

  const pendientes = GESTORIA_ITEMS.filter(i => !g.items[i.key]?.checked);

  const html = `
  <div class="modal-overlay" id="ver-gestoria-overlay" onclick="if(event.target.id==='ver-gestoria-overlay')closeVerGestoria()">
    <div class="modal modal-wide" style="max-width:580px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:92vh">
      <div style="padding:1.4rem 1.75rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:600;margin-bottom:4px">Estado de gestoría</div>
            <div class="modal-title" style="margin-bottom:4px;font-size:20px">${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3);font-size:16px;font-weight:400">${car.year}</span></div>
            ${car.patente?`<div style="font-size:12px;color:var(--text-3)">Patente: <strong style="color:var(--text-2)">${esc(car.patente)}</strong></div>`:''}
            ${comprador?`
            <div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(76,175,125,.08);border:1px solid rgba(76,175,125,.25);border-left:3px solid var(--green);border-radius:6px;font-size:12px">
              <span>🧑</span>
              <div>
                <div style="font-weight:600;color:var(--text-2)">${esc(comprador.name)}</div>
                <div style="color:var(--text-3);font-size:11px">${esc(comprador.phone)}${car.fechaVenta?' · Vendido el '+car.fechaVenta:''}</div>
              </div>
            </div>`:`
            <div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:var(--surface-3);border:1px solid var(--border);border-radius:6px;font-size:12px">
              <span style="color:var(--text-3)">Sin comprador vinculado</span>
              <button class="btn sm" onclick="closeVerGestoria();openVincularModal('${car.id}')" style="font-size:11px;padding:3px 8px;border-color:var(--blue);color:var(--blue)">🔗 Vincular</button>
            </div>`}
          </div>
          <button class="btn sm" onclick="closeVerGestoria()">✕ Cerrar</button>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;background:${eBg};color:${eColor};border:1px solid ${eBord}">${eLabel}</span>
          <div style="flex:1;min-width:100px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em">Documentación</span>
              <span style="font-size:12px;font-weight:700;color:${progColor}">${prog.done}/${prog.total}</span>
            </div>
            <div style="height:5px;background:var(--surface-3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:3px"></div>
            </div>
          </div>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1;padding:1rem 1.75rem">
        ${prog.pct===100?`
        <div style="padding:10px 14px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:var(--radius);margin-bottom:1rem">
          <div style="font-size:13px;font-weight:600;color:var(--green)">✓ Gestoría completa — toda la documentación está lista.</div>
        </div>`:pendientes.length>0?`
        <div style="padding:10px 14px;background:var(--orange-bg);border:1px solid rgba(224,144,85,0.25);border-radius:var(--radius);margin-bottom:1rem">
          <div style="font-size:11px;font-weight:600;color:var(--orange);margin-bottom:4px">⚠ ${pendientes.length} documento${pendientes.length>1?'s':''} pendiente${pendientes.length>1?'s':''}</div>
          <div style="font-size:12px;color:var(--text-2)">${pendientes.map(p=>esc(p.label)).join(' · ')}</div>
        </div>`:''}
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1rem">
          <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600">Documentación requerida</div>
          ${itemRows}
        </div>
        ${g.notas?`
        <div style="padding:12px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius)">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:600;margin-bottom:6px">Notas</div>
          <div style="font-size:13px;color:var(--text-2);font-style:italic">"${esc(g.notas)}"</div>
        </div>`:''}
      </div>
      <div style="padding:1rem 1.75rem;border-top:1px solid var(--border);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeVerGestoria()">Cerrar</button>
        <button class="btn primary" onclick="closeVerGestoria();openGestoriaModal('${car.id}')">✏ Editar gestoría</button>
      </div>
    </div>
  </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el.firstElementChild);
}

/* ═══════════════════════════════════════════════════════════════
   BUSCADOR DE GESTORÍA
   ═══════════════════════════════════════════════════════════════ */

function _gestoriaSearchUpdate(val) {
  gestoriaSearch = val;
  const clearBtn = document.getElementById('gestoria-search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
  _renderGestoriaCards();
}

function _gestoriaSearchClear() {
  gestoriaSearch = '';
  const inp = document.getElementById('gestoria-search-input');
  if (inp) { inp.value = ''; inp.focus(); }
  const clearBtn = document.getElementById('gestoria-search-clear');
  if (clearBtn) clearBtn.classList.remove('visible');
  _renderGestoriaCards();
}

function _gestoriaMatch(car) {
  if (!gestoriaSearch) return true;
  const q = gestoriaSearch.toLowerCase();
  const comprador = car.ventaClienteId ? S.clients.find(c => c.id === car.ventaClienteId) : null;
  return (
    (car.brand   || '').toLowerCase().includes(q) ||
    (car.model   || '').toLowerCase().includes(q) ||
    (car.patente || '').toLowerCase().includes(q) ||
    (car.color   || '').toLowerCase().includes(q) ||
    String(car.year || '').includes(q) ||
    (comprador?.name  || '').toLowerCase().includes(q) ||
    (comprador?.phone || '').includes(q)
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB VEHÍCULOS — vendidos + cualquiera con gestoría iniciada
   ═══════════════════════════════════════════════════════════════ */

function renderVehiculosList() {
  _inyectarEstilosBuscadorGestoria();
  const container = document.getElementById('tab-vehiculos-content');
  if (!container) return;

  const cars = S.cars.filter(c => c.status === 'vendido' || tieneGestoriaIniciada(c));

  if (cars.length === 0) {
    container.innerHTML = `
    <div class="empty">
      <div class="empty-icon">🚗</div>
      <strong>Sin ventas registradas</strong>
      <div style="font-size:13px;margin-top:4px">Cuando un cliente compre un vehículo aparecerá aquí para gestionar su documentación.</div>
    </div>`;
    return;
  }

  const sinIniciar = cars.filter(c => !c.gestoria || c.gestoria.estado === 'pendiente').length;
  const enProceso  = cars.filter(c => c.gestoria?.estado === 'en_proceso').length;
  const completa   = cars.filter(c => c.gestoria?.estado === 'completa').length;

  let html = `
  <div style="display:flex;gap:6px;margin-bottom:1rem;flex-wrap:wrap">
    <button class="btn sm${gFilterStatus===''?' primary':''}" onclick="gFilterStatus='';renderVehiculosList()">Todos (${cars.length})</button>
    <button class="btn sm" onclick="gFilterStatus='sin_iniciar';renderVehiculosList()" style="${gFilterStatus==='sin_iniciar'?'color:var(--text);border-color:var(--border-hover);background:var(--surface-3)':''}">Sin iniciar (${sinIniciar})</button>
    <button class="btn sm" onclick="gFilterStatus='en_proceso';renderVehiculosList()" style="${gFilterStatus==='en_proceso'?'color:var(--orange);border-color:rgba(224,144,85,0.4);background:var(--orange-bg)':''}">En proceso (${enProceso})</button>
    <button class="btn sm" onclick="gFilterStatus='completa';renderVehiculosList()" style="${gFilterStatus==='completa'?'color:var(--green);border-color:var(--green-border);background:var(--green-bg)':''}">Completa (${completa})</button>
  </div>
  <div class="gestoria-search-wrap">
    <input
      id="gestoria-search-input"
      class="gestoria-search-input"
      type="text"
      placeholder="Buscar por marca, modelo, patente, comprador…"
      value="${esc(gestoriaSearch)}"
      oninput="_gestoriaSearchUpdate(this.value)"
      autocomplete="off"
    >
    <button id="gestoria-search-clear" class="gestoria-search-clear${gestoriaSearch ? ' visible' : ''}" onclick="_gestoriaSearchClear()" title="Limpiar búsqueda">×</button>
  </div>
  <div id="gestoria-cards-wrap"></div>`;

  container.innerHTML = html;
  _renderGestoriaCards();
}

function _renderGestoriaCards() {
  const wrap = document.getElementById('gestoria-cards-wrap');
  if (!wrap) return;

  let cars = S.cars.filter(c => c.status === 'vendido' || tieneGestoriaIniciada(c));

  if (gFilterStatus === 'sin_iniciar') cars = cars.filter(c => !c.gestoria || c.gestoria.estado === 'pendiente');
  if (gFilterStatus === 'en_proceso')  cars = cars.filter(c => c.gestoria?.estado === 'en_proceso');
  if (gFilterStatus === 'completa')    cars = cars.filter(c => c.gestoria?.estado === 'completa');

  const filtered = cars.filter(_gestoriaMatch);

  let html = '';

  if (gestoriaSearch && filtered.length === 0 && cars.length > 0) {
    html = `
    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-3)">
      <div style="font-size:2rem;margin-bottom:.5rem">🔍</div>
      <div style="font-size:14px">No se encontraron resultados para "<strong style="color:var(--text-2)">${esc(gestoriaSearch)}</strong>"</div>
    </div>`;
    wrap.innerHTML = html;
    return;
  }

  if (filtered.length === 0) {
    html = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px">No hay vehículos en este estado.</div>`;
    wrap.innerHTML = html;
    return;
  }

  filtered.forEach(car => {
    const prog        = gestoriaProgress(car);
    const g           = car.gestoria;
    const progColor   = prog.pct===100?'var(--green)':prog.pct>0?'var(--orange)':'var(--text-3)';
    const borderColor = !g||g.estado==='pendiente'?'var(--border)':g.estado==='en_proceso'?'rgba(224,144,85,0.25)':'rgba(76,175,125,0.25)';
    const faltantes   = g ? GESTORIA_ITEMS.filter(i=>!g.items[i.key]?.checked).map(i=>i.label) : GESTORIA_ITEMS.map(i=>i.label);
    const comprador   = car.ventaClienteId ? S.clients.find(c => c.id === car.ventaClienteId) : null;

    const esZeroKm  = car.km === 0;
    const tieneDuenio = !esZeroKm && car.duenioNombre;
    const duenioNombreCompleto = tieneDuenio
      ? [car.duenioNombre, car.duenioApellido].filter(Boolean).map(s => esc(s)).join(' ')
      : '';

    // ── PATENTE: siempre visible, con placeholder si está vacía ──
    const patenteHtml = car.patente
      ? ` · <strong style="color:var(--text-2);background:var(--surface-3);padding:1px 6px;border-radius:4px;font-size:11px;letter-spacing:.05em">${esc(car.patente)}</strong>`
      : ` · <span style="color:var(--text-3);font-size:11px;font-style:italic">Sin patente</span>`;

    html += `
    <div style="background:var(--surface);border:1px solid ${borderColor};border-radius:var(--radius-lg);padding:1.2rem 1.4rem;margin-bottom:10px;transition:border-color .15s">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
        <div style="display:flex;gap:14px;align-items:start;flex:1;min-width:0">
          <div style="width:44px;height:44px;border-radius:var(--radius);background:var(--gold-bg);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🚗</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;color:var(--text)">${esc(car.brand)} ${esc(car.model)}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:1px">
              ${car.year}${patenteHtml}${car.tipo?` · ${esc(car.tipo)}`:''}${tieneDuenio ? ` · <span style="color:var(--text-2)">Dueño: <strong>${duenioNombreCompleto}</strong>${car.duenioContacto ? ` · ${esc(car.duenioContacto)}` : ''}</span>` : ''}
            </div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              ${car.status === 'vendido'
                ? `<span class="badge bg-green">✓ Vendido</span>${car.fechaVenta?`<span style="font-size:11px;color:var(--text-3)">${car.fechaVenta}</span>`:''}`
                : car.status === 'reservado'
                  ? `<span class="badge bg-orange">Reservado</span>`
                  : `<span class="badge bg-gray">En stock</span>`}
            </div>
            ${comprador ? `
            <div style="margin-top:8px;padding:8px 12px;background:rgba(76,175,125,.06);border:1px solid rgba(76,175,125,.2);border-left:3px solid var(--green);border-radius:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-size:16px">🧑</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--text-2)">${esc(comprador.name)}</div>
                <div style="font-size:12px;color:var(--text-3)">${esc(comprador.phone)}</div>
              </div>
              <button class="btn sm" onclick="openVincularModal('${car.id}')" style="font-size:11px;padding:3px 8px;flex-shrink:0">Cambiar</button>
            </div>` : `
            <div style="margin-top:8px;padding:7px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:12px;color:var(--text-3)">Sin comprador vinculado</span>
              <button class="btn sm" onclick="openVincularModal('${car.id}')" style="font-size:11px;padding:3px 10px;border-color:var(--blue);color:var(--blue)">🔗 Vincular comprador</button>
            </div>`}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:600;color:${progColor};line-height:1">${prog.done}/${prog.total} items</div>
            ${g&&g.ultimoGuardadoPor
              ?`<div style="font-size:10px;color:var(--text-3);margin-top:3px">por <strong style="color:var(--text-2)">${esc(g.ultimoGuardadoPor)}</strong>${g.fechaUltimoGuardado?' · '+g.fechaUltimoGuardado:''}</div>`
              :`<div style="font-size:10px;color:var(--text-3);margin-top:3px">Sin gestión guardada</div>`}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn sm" onclick="openVerGestoria('${car.id}')">👁 Ver</button>
            <button class="btn primary sm" onclick="openGestoriaModal('${car.id}')">📋 Gestionar</button>
          </div>
        </div>
      </div>
      <div style="margin-top:12px;height:4px;background:var(--surface-3);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:2px;transition:width .4s"></div>
      </div>
      ${faltantes.length>0&&prog.pct<100?`
      <div style="margin-top:10px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
        <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-right:2px">Pendiente:</span>
        ${faltantes.slice(0,3).map(l=>`<span style="font-size:10px;color:var(--text-3);background:var(--surface-2);border:1px solid var(--border);border-radius:100px;padding:2px 8px">⬜ ${esc(l)}</span>`).join('')}
        ${faltantes.length>3?`<span style="font-size:10px;color:var(--text-3)">+${faltantes.length-3} más</span>`:''}
      </div>`:''}
    </div>`;
  });

  wrap.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════
   CRUD EQUIPO
   ═══════════════════════════════════════════════════════════════ */

async function addMiembro(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    nombre: f.jnombre.value.trim(), apellido: f.japellido.value.trim(),
    rol: f.jrol.value.trim(), telefono: f.jtelefono.value.trim(),
    email: f.jemail.value.trim(), fechaTurno: f.fechaTurno.value,
    notas: f.jnotas.value.trim(),
  };
  try {
    const res = await CRM.addMiembro(data);
    data.id = res.id; S.jerarquia.push(data);
    addMiembroOpen = false; render();
    toast('Miembro agregado', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function saveEditMiembro(e) {
  e.preventDefault();
  const f = e.target;
  const m = S.jerarquia.find(j => j.id === editMiembroId);
  if (!m) return;
  const data = {
    id: editMiembroId,
    nombre: f.jnombre.value.trim(), apellido: f.japellido.value.trim(),
    rol: f.jrol.value.trim(), telefono: f.jtelefono.value.trim(),
    email: f.jemail.value.trim(), fechaTurno: f.fechaTurno.value,
    notas: f.jnotas.value.trim(),
  };
  try {
    await CRM.editMiembro(data); Object.assign(m, data);
    editMiembroId = null; render();
    toast('Miembro actualizado', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

function editMiembro(id)    { editMiembroId = id; addMiembroOpen = false; render(); }
function cancelEditMiembro(){ editMiembroId = null; render(); }

async function delMiembro(id) {
  if (!confirm('¿Eliminar este miembro del equipo?')) return;
  try {
    await CRM.delMiembro(id);
    S.jerarquia = S.jerarquia.filter(j => j.id !== id);
    render(); toast('Miembro eliminado', 'success');
  } catch(err) { toast('Error al eliminar: ' + err.message, 'error'); }
}

function rMiembroForm(m) {
  const edit = !!m;
  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar miembro' : 'Agregar miembro al equipo'}</div>
    <form onsubmit="${edit ? 'saveEditMiembro(event)' : 'addMiembro(event)'}">
      <div class="hint-box">
        <div class="hint-label">Datos personales</div>
        <div class="fg2">
          <div class="fg"><label>Nombre *</label><input type="text" name="jnombre" required placeholder="Juan" value="${edit?esc(m.nombre):''}"></div>
          <div class="fg"><label>Apellido *</label><input type="text" name="japellido" required placeholder="Pérez" value="${edit?esc(m.apellido):''}"></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Rol / Cargo</label>
            <input type="text" name="jrol" placeholder="Vendedor" value="${edit?esc(m.rol||''):''}" list="roles-list">
            <datalist id="roles-list">${ROLES_SUGERIDOS.map(r=>`<option value="${r}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Teléfono</label><input type="tel" name="jtelefono" placeholder="351 555-0000" value="${edit?esc(m.telefono||''):''}"></div>
          <div class="fg"><label>Email</label><input type="email" name="jemail" placeholder="juan@grupodente.com" value="${edit?esc(m.email||''):''}"></div>
        </div>
      </div>
      <div class="hint-box">
        <div class="hint-label">Turno y verificación</div>
        <div class="fg2">
          <div class="fg"><label>Fecha de turno</label><input type="date" name="fechaTurno" value="${edit&&m.fechaTurno?m.fechaTurno:''}"></div>
          <div class="fg"><label>Verificación policial</label>
            <select name="verificPolicial">
              <option value="">— sin datos —</option>
              <option value="pendiente"${edit&&m.verificPolicial==='pendiente'?' selected':''}>⏳ Pendiente</option>
              <option value="aprobada"${edit&&m.verificPolicial==='aprobada'?' selected':''}>✓ Aprobada</option>
              <option value="rechazada"${edit&&m.verificPolicial==='rechazada'?' selected':''}>✗ Rechazada</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Notas</label>
          <textarea name="jnotas" placeholder="Información adicional, horarios, observaciones...">${edit&&m.notas?esc(m.notas):''}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit?'cancelEditMiembro()':'addMiembroOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit?'Guardar cambios':'Guardar miembro'}</button>
      </div>
    </form>
  </div>`;
}

function renderEquipoTab() {
  const container = document.getElementById('tab-equipo-content');
  if (!container) return;
  let html = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
    <button class="btn primary" onclick="addMiembroOpen=true;editMiembroId=null;render()">+ Agregar miembro</button>
  </div>
  ${addMiembroOpen ? rMiembroForm() : ''}
  ${editMiembroId  ? rMiembroForm(S.jerarquia.find(j => j.id === editMiembroId)) : ''}`;
  if (S.jerarquia.length === 0 && !addMiembroOpen) {
    html += `
    <div class="empty">
      <div class="empty-icon">◈</div>
      <strong>Sin miembros cargados</strong>
      <div style="font-size:13px;margin-top:4px">Agregá miembros del equipo para gestionar roles, turnos y verificaciones.</div>
    </div>`;
  }
  S.jerarquia.forEach(j => {
    if (editMiembroId === j.id) return;
    const vPolOk  = j.verificPolicial === 'aprobada';
    const vPolBad = j.verificPolicial === 'rechazada';
    const diasTurno    = j.fechaTurno ? Math.ceil((new Date(j.fechaTurno)-new Date())/(1000*60*60*24)) : null;
    const turnoProximo = diasTurno !== null && diasTurno >= 0 && diasTurno <= 7;
    html += `
    <div class="jerarq-card">
      <div class="jerarq-header">
        <div>
          <div class="jerarq-name">${esc(j.nombre)} ${esc(j.apellido)}</div>
          <div class="jerarq-role">${esc(j.rol||'—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${j.verificPolicial?`<span class="badge ${vPolOk?'bg-green':vPolBad?'bg-red':'bg-orange'}">${vPolOk?'✓ Verificado':vPolBad?'✗ Rechazado':'⏳ Pendiente'}</span>`:''}
          ${turnoProximo?`<span class="badge ${diasTurno===0?'bg-red':'bg-gold'}">Turno ${diasTurno===0?'HOY':'en '+diasTurno+'d'}</span>`:''}
          ${j.telefono?whatsappBtn(j.telefono,j.nombre+' '+j.apellido,true):''}
          <button class="btn sm" onclick="editMiembro('${j.id}')">Editar</button>
          <button class="btn sm danger" onclick="delMiembro('${j.id}')">Eliminar</button>
        </div>
      </div>
      <div class="jerarq-body">
        ${j.telefono?`<div class="jerarq-field"><div class="jerarq-field-label">Teléfono</div><div class="jerarq-field-val">${esc(j.telefono)}</div></div>`:''}
        ${j.email?`<div class="jerarq-field"><div class="jerarq-field-label">Email</div><div class="jerarq-field-val">${esc(j.email)}</div></div>`:''}
        ${j.verificPolicial?`<div class="jerarq-field"><div class="jerarq-field-label">Verif. policial</div><div class="jerarq-field-val" style="color:${vPolOk?'var(--green)':vPolBad?'var(--red)':'var(--orange)'}">${j.verificPolicial}</div></div>`:''}
        ${j.fechaTurno?`<div class="jerarq-field"><div class="jerarq-field-label">Fecha de turno</div><div class="jerarq-field-val" style="color:${turnoProximo?'var(--gold)':'var(--text-2)'}">${j.fechaTurno}</div></div>`:''}
        ${j.creadoPor?`<div class="jerarq-field"><div class="jerarq-field-label">Cargado por</div><div class="jerarq-field-val">${esc(j.creadoPor)}</div></div>`:''}
        ${j.notas?`<div class="jerarq-field" style="grid-column:1/-1"><div class="jerarq-field-label">Notas</div><div class="jerarq-field-val">${esc(j.notas)}</div></div>`:''}
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function render() {
  document.getElementById('view').innerHTML = `
  <div class="section-head">
    <div class="section-title">Gestoría</div>
  </div>
  <div id="tab-vehiculos-content"></div>`;
  renderVehiculosList();
}

bootApp('gestoria');
render();

(function() {
  const params = new URLSearchParams(window.location.search);
  const carid  = params.get('carid');
  if (!carid) return;

  const tryOpen = (tries) => {
    const car = S.cars && S.cars.find(c => c.id === carid);
    if (car) {
      const tieneGestoria = car.gestoria && Object.keys(car.gestoria.items || {}).length > 0;
      if (tieneGestoria) {
        openGestoriaModal(carid);
      } else {
        toast('Este vehículo aún no tiene gestoría iniciada. Podés comenzarla ahora.', 'info');
        openGestoriaModal(carid);
      }
    } else if (tries > 0) {
      setTimeout(() => tryOpen(tries - 1), 150);
    } else {
      toast('No se encontró el vehículo indicado.', 'error');
    }
  };
  tryOpen(20);
})();