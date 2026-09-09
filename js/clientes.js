/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/clientes.js
   ═══════════════════════════════════════════════════════════════ */

let addClientOpen = false;
let editClientId  = null;
let clienteSearch = '';

let _filtroFechaDesde  = '';
let _filtroFechaHasta  = '';
let _filtroPresupDesde = '';
let _filtroPresupHasta = '';
let _filtroMarca       = '';
let _filtrosOpen       = false;

const CANALES = [
  { val: 'salon',      label: 'Salón',          icon: '🏪' },
  { val: 'llamada',    label: 'Llamada',         icon: '📞' },
  { val: 'instagram',  label: 'Instagram',       icon: '📸' },
  { val: 'facebook',   label: 'Facebook',        icon: '👤' },
  { val: 'whatsapp',   label: 'WhatsApp',        icon: '💬' },
  { val: 'reventa',    label: 'Reventa',         icon: '🔄' },
  { val: 'ya_cliente', label: 'Ya era cliente',  icon: '⭐' },
  { val: 'otro',       label: 'Otro',            icon: '➕' },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function _fmtMilesInput(input) {
  if (!input) return;
  const v = input.value.replace(/\D/g, '');
  if (v === '') { input.value = ''; return; }
  input.value = parseInt(v, 10).toLocaleString('es-AR');
}

function _parseMiles(val) {
  if (val == null) return null;
  const v = String(val).replace(/\D/g, '');
  return v === '' ? null : parseInt(v, 10);
}

function _fmtFecha(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function _inyectarEstilosMultiMarca() {
  if (document.getElementById('neifert-styles-v2')) return;
  const st = document.createElement('style');
  st.id = 'neifert-styles-v2';
  const old = document.getElementById('multi-marca-styles');
  if (old) old.remove();
  st.textContent = `
    .marca-extra-row { display:flex; gap:6px; margin-bottom:6px; align-items:center; }
    .marca-extra-row input { flex:1; min-width:0; }
    .marca-extra-remove { background:none; border:none; color:var(--text-3); cursor:pointer; font-size:20px; padding:0 4px; line-height:1; opacity:.6; flex-shrink:0; }
    .marca-extra-remove:hover { opacity:1; color:var(--text); }
    .marca-display-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 9px; border-radius:20px; background:rgba(55,138,221,.15); border:1px solid rgba(55,138,221,.4); color:var(--blue,#378ADD); }
    .canal-btns { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
    .canal-btn { padding:6px 12px; border-radius:8px; font-size:12px; cursor:pointer; border:1.5px solid var(--border,#444); background:var(--bg2,#2a2a2a); color:var(--text-2,#aaa); transition:all .12s; }
    .canal-btn:hover { border-color:rgba(200,200,200,.5); }
    .canal-btn.selected { border-color:var(--blue,#378ADD); background:rgba(55,138,221,.18); color:var(--blue,#378ADD); font-weight:600; }
    .compra-car-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; border:1.5px solid var(--border); background:var(--surface-2); cursor:pointer; margin-bottom:8px; transition:border-color .12s,background .12s; }
    .compra-car-item:hover { border-color:var(--blue); background:rgba(55,138,221,.07); }
    .compra-car-item.selected { border-color:var(--green); background:rgba(76,175,125,.1); }
    .compra-car-radio { width:18px; height:18px; border-radius:50%; flex-shrink:0; border:2px solid var(--border-md); background:var(--surface-3); position:relative; transition:all .12s; }
    .compra-car-item.selected .compra-car-radio { border-color:var(--green); background:var(--green); }
    .compra-car-item.selected .compra-car-radio::after { content:''; width:7px; height:7px; border-radius:50%; background:#fff; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); }
    .cliente-search-wrap { position:relative; margin-bottom:0; }
    .cliente-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; line-height:1; opacity:.6; }
    .cliente-search-input { width:100%; box-sizing:border-box; padding:10px 80px 10px 34px; border-radius:8px; border:1.5px solid var(--border,#555); background:var(--surface-2,#2a2a2a); color:var(--text,#fff); font-size:14px; outline:none; transition:border-color .15s; }
    .cliente-search-input:focus { border-color:var(--blue,#378ADD); background:var(--surface-3,#333); }
    .cliente-search-input::placeholder { color:var(--text-3,#666); }
    .cliente-search-clear { position:absolute; right:44px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-3); font-size:20px; line-height:1; padding:2px 5px; border-radius:4px; display:none; opacity:.6; }
    .cliente-search-clear.visible { display:block; }
    .cliente-search-clear:hover { opacity:1; color:var(--text); }
    .filtros-toggle-btn { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:1px solid var(--border-md); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:11px; font-weight:600; color:var(--text-3); font-family:var(--font); transition:all .15s; display:flex; align-items:center; gap:4px; white-space:nowrap; }
    .filtros-toggle-btn:hover { color:var(--text-2); border-color:var(--border-hover); }
    .filtros-toggle-btn.active { color:var(--gold); border-color:var(--gold-border); background:var(--gold-bg); }
    .filtros-panel { background:var(--surface); border:1px solid var(--border-md); border-top:none; border-radius:0 0 8px 8px; padding:12px 14px; margin-bottom:1rem; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .filtros-group { display:flex; flex-direction:column; gap:4px; }
    .filtros-group-label { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--text-3); margin-bottom:2px; }
    .filtros-row { display:flex; gap:6px; align-items:center; }
    .filtros-row input { flex:1; font-size:12px !important; padding:6px 8px !important; }
    .filtros-row span { font-size:11px; color:var(--text-3); flex-shrink:0; }
    .filtros-active-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; background:var(--gold-bg); color:var(--gold); border:1px solid var(--gold-border); margin-left:6px; }
    .cero-toggle-wrap { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--surface-2); border:1.5px solid var(--border-md); border-radius:8px; cursor:pointer; transition:border-color .15s,background .15s; user-select:none; }
    .cero-toggle-wrap:hover { border-color:var(--gold-border); }
    .cero-toggle-wrap.active { border-color:var(--gold); background:var(--gold-bg); }
    .cero-toggle-icon { font-size:18px; }
    .cero-toggle-label { font-size:13px; font-weight:600; color:var(--text-2); flex:1; }
    .cero-toggle-wrap.active .cero-toggle-label { color:var(--gold); }
    .cero-toggle-check { width:18px; height:18px; border-radius:50%; border:2px solid var(--border-md); background:var(--surface-3); position:relative; flex-shrink:0; transition:all .15s; }
    .cero-toggle-wrap.active .cero-toggle-check { border-color:var(--gold); background:var(--gold); }
    .cero-toggle-wrap.active .cero-toggle-check::after { content:''; width:7px; height:7px; border-radius:50%; background:#0D0D0D; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); }
    .cero-detail-wrap { margin-top:12px; padding:14px; background:var(--gold-bg); border:1px solid var(--gold-border); border-radius:8px; }
    .cliente-expand-wrap { padding-top:6px; }
    .ae-auto-block { border:1px solid var(--border-md); border-radius:8px; padding:12px; margin-bottom:10px; }
    .ae-auto-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .ae-auto-title { font-size:12px; font-weight:700; color:var(--orange); }
  `;
  document.head.appendChild(st);
}

/* ═══════════════════════════════════════════════════════════════
   MODAL COMPRA
   ═══════════════════════════════════════════════════════════════ */
let _compraPendienteClienteId = null;
let _compraSelectedCarId      = null;

function openCompraModal(clienteId) {
  _compraPendienteClienteId = clienteId;
  _compraSelectedCarId      = null;
  const prev = document.getElementById('compra-modal-overlay');
  if (prev) prev.remove();
  const cliente    = S.clients.find(c => c.id === clienteId);
  if (!cliente) return;
  const disponibles = S.cars.filter(c => c.status === 'disponible' || c.status === 'reservado');
  let carsHtml = '';
  if (disponibles.length === 0) {
    carsHtml = `<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px">No hay vehículos disponibles en el stock.</div>`;
  } else {
    disponibles.forEach(car => {
      const precio = car.precioContado
        ? `${car.monedaContado || 'ARS'} ${Number(car.precioContado).toLocaleString('es-AR')}`
        : car.precioCanje
          ? `${car.monedaCanje || 'ARS'} ${Number(car.precioCanje).toLocaleString('es-AR')} (canje)`
          : 'Sin precio';
      carsHtml += `
      <div class="compra-car-item" id="cci-${car.id}" onclick="_compraSelectCar('${car.id}')">
        <div class="compra-car-radio"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">
            ${esc(car.brand)} ${esc(car.model)}
            <span style="color:var(--text-3);font-weight:400;font-size:12px">${car.year}</span>
            ${car.version ? `<span style="color:var(--text-3);font-size:11px"> · ${esc(car.version)}</span>` : ''}
          </div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">
            ${car.tipo || ''}${car.trans ? ' · ' + car.trans : ''}${car.km != null ? ' · ' + fk(car.km) : ''}${car.color ? ' · ' + esc(car.color) : ''}${car.patente ? ` · <strong style="color:var(--text-2)">${esc(car.patente)}</strong>` : ''}
          </div>
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--green);flex-shrink:0;text-align:right">${precio}</div>
      </div>`;
    });
  }
  const overlay = document.createElement('div');
  overlay.id = 'compra-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem';
  overlay.innerHTML = `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px">🤝 Registrar compra</div>
      <div style="font-size:12px;color:var(--text-3)">Cliente: <strong style="color:var(--text-2)">${esc(cliente.name)}</strong> · Seleccioná el vehículo que compró</div>
    </div>
    <div style="overflow-y:auto;flex:1;padding:1rem 1.5rem">${carsHtml}</div>
    <div style="padding:.9rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
      <button class="btn" onclick="_compraModalClose()">Cancelar</button>
      <button class="btn primary" id="compra-confirm-btn" onclick="_compraConfirmar()" disabled style="opacity:.45;cursor:not-allowed">✓ Confirmar venta</button>
    </div>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) _compraModalClose(); });
  document.body.appendChild(overlay);
}

function _compraSelectCar(carId) {
  if (_compraSelectedCarId) {
    const prev = document.getElementById('cci-' + _compraSelectedCarId);
    if (prev) prev.classList.remove('selected');
  }
  _compraSelectedCarId = carId;
  const item = document.getElementById('cci-' + carId);
  if (item) item.classList.add('selected');
  const btn = document.getElementById('compra-confirm-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = ''; }
}

function _compraModalClose() {
  const el = document.getElementById('compra-modal-overlay');
  if (el) el.remove();
  _compraPendienteClienteId = null;
  _compraSelectedCarId      = null;
}

async function _compraConfirmar() {
  if (!_compraPendienteClienteId || !_compraSelectedCarId) return;
  const cliente = S.clients.find(c => c.id === _compraPendienteClienteId);
  const car     = S.cars.find(c => c.id === _compraSelectedCarId);
  if (!cliente || !car) return;
  const btn = document.getElementById('compra-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    const clienteData = { ...cliente, status: 'vendido', ventaCarId: car.id, fechaVenta: todayISO() };
    await CRM.editCliente(clienteData);
    Object.assign(cliente, clienteData);
    const carData = { ...car, status: 'vendido', ventaClienteId: cliente.id, fechaVenta: todayISO() };
    await CRM.editVehiculo(carData);
    Object.assign(car, carData);
    _compraModalClose();
    render();
    toast(`✓ Venta registrada: ${cliente.name} compró ${car.brand} ${car.model}`, 'success');
  } catch(err) {
    toast('Error al registrar la venta: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '✓ Confirmar venta'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   GUARDAR Y CREAR TAREA
   ═══════════════════════════════════════════════════════════════ */
async function addClientYTarea(formEl) {
  const f = formEl;
  const tieneAuto = f.tieneAutoEntrega && f.tieneAutoEntrega.value === 'si';
  const autosEntrega = tieneAuto ? _leerAutosEntrega(f) : [];
  const marcas = _leerMarcas(f);
  const primeraMarca = marcas.length > 0 ? (typeof marcas[0] === 'string' ? marcas[0] : marcas[0].marca) : '';
  const ceroKm = f.querySelector('#cero-hidden')?.value === 'si';
  const data = {
    name:          f.cname.value.trim(),
    phone:         f.phone.value.trim(),
    fechaCumple:   f.fechaCumple.value,
    fechaCreacion: f.fechaCreacion.value || todayISO(),
    localidad:     f.localidad?.value.trim() || '',
    status:        'activo',
    brands: marcas, brand: primeraMarca,
    model: '', tipo: f.tipo.value,
    budget: _parseMiles(f.budget.value),
    trans:  f.trans.value,
    yearMin: f.yearMin.value ? +f.yearMin.value : null,
    yearMax: f.yearMax.value ? +f.yearMax.value : null,
    notes:  f.notes.value.trim(),
    canal:  f.querySelector('#canal-hidden')?.value || '',
    tieneAutoEntrega: autosEntrega.length > 0,
    autosEntrega:     autosEntrega,
    autoEntrega:      autosEntrega.length ? autosEntrega[0] : null,
    interesCeroKm: ceroKm,
    ceroKm: ceroKm ? {
      brand:   f.ckBrand?.value.trim()   || '',
      model:   f.ckModel?.value.trim()   || '',
      version: f.ckVersion?.value.trim() || '',
      budget:  _parseMiles(f.ckBudget?.value),
      trans:   f.ckTrans?.value          || '',
      color:   f.ckColor?.value.trim()   || '',
      notas:   f.ckNotas?.value.trim()   || '',
    } : null,
    creadoPor: getSession()?.nombre || getSession()?.email || 'Desconocido',
  };
  if (!data.name || !data.phone) {
    toast('Completá nombre y teléfono antes de continuar', 'warning');
    return;
  }
  try {
    const res = await CRM.addCliente(data);
    data.id = res.id;
    S.clients.unshift(data);
    await _alertaCumpleanios(data, false);
    const prefill = { clienteId: data.id, clienteNombre: data.name, clientePhone: data.phone };
    try { sessionStorage.setItem('tareas_prefill_cliente', JSON.stringify(prefill)); } catch(e) {}
    toast('Cliente guardado. Redirigiendo a tareas…', 'success');
    setTimeout(() => { window.location.href = 'tareas.html'; }, 700);
  } catch(err) {
    toast('Error al guardar: ' + err.message, 'error');
  }
}

function _crearTareaCliente(id) {
  const c = S.clients.find(x => x.id === id);
  if (!c) return;
  const prefill = { clienteId: c.id, clienteNombre: c.name, clientePhone: c.phone };
  try { sessionStorage.setItem('tareas_prefill_cliente', JSON.stringify(prefill)); } catch(e) {}
  window.location.href = 'tareas.html';
}

/* ═══════════════════════════════════════════════════════════════
   MÚLTIPLES AUTOS A ENTREGAR
   ═══════════════════════════════════════════════════════════════ */
function _aeBlockHTML(idx, ae) {
  ae = ae || {};
  return `
  <div class="ae-auto-block" data-ae-block>
    <div class="ae-auto-head">
      <span class="ae-auto-title">🚗 Auto #<span class="ae-auto-num">${idx + 1}</span></span>
      <button type="button" class="btn sm danger" onclick="_aeQuitarAuto(this)" title="Quitar este auto">✕ Quitar</button>
    </div>
    <div class="fg3">
      <div class="fg"><label>Marca</label><input type="text" class="ae-brand" placeholder="Ford, Fiat..." list="ml-ae" value="${esc(ae.brand||'')}"></div>
      <div class="fg"><label>Modelo</label><input type="text" class="ae-model" placeholder="Ka, Cronos..." value="${esc(ae.model||'')}"></div>
      <div class="fg"><label>Versión</label><input type="text" class="ae-version" placeholder="Trendline, Confortline..." value="${esc(ae.version||'')}"></div>
    </div>
    <div class="fg3">
      <div class="fg"><label>Año</label><input type="number" class="ae-year" placeholder="2018" min="1990" max="2030" value="${ae.year||''}"></div>
      <div class="fg"><label>Kilometraje</label><input type="text" inputmode="numeric" class="ae-km" placeholder="80.000" value="${ae.km ? Number(ae.km).toLocaleString('es-AR') : ''}" oninput="_fmtMilesInput(this)"></div>
      <div class="fg"><label>Color</label><input type="text" class="ae-color" placeholder="Blanco, Rojo..." value="${esc(ae.color||'')}"></div>
    </div>
    <div class="fg">
      <label>Transmisión</label>
      <select class="ae-trans">
        <option value="">— cualquiera —</option>
        <option value="manual"${ae.trans === 'manual' ? ' selected' : ''}>Manual</option>
        <option value="automático"${ae.trans === 'automático' ? ' selected' : ''}>Automático</option>
      </select>
    </div>
    <div class="fg"><label>Observaciones del auto</label>
      <textarea class="ae-notas" placeholder="Estado general, detalles, historial...">${esc(ae.notas||'')}</textarea>
    </div>
  </div>`;
}

function _aeAgregarAuto(ae) {
  const list = document.getElementById('autoEntregaList');
  if (!list) return;
  const idx = list.querySelectorAll('[data-ae-block]').length;
  const tmp = document.createElement('div');
  tmp.innerHTML = _aeBlockHTML(idx, ae || {});
  list.appendChild(tmp.firstElementChild);
  _aeRenumerar();
}

function _aeQuitarAuto(btn) {
  const block = btn.closest('[data-ae-block]');
  if (block) block.remove();
  _aeRenumerar();
}

function _aeRenumerar() {
  const list = document.getElementById('autoEntregaList');
  if (!list) return;
  list.querySelectorAll('[data-ae-block]').forEach((bl, i) => {
    const num = bl.querySelector('.ae-auto-num');
    if (num) num.textContent = i + 1;
  });
}

function _aeToggleEntrega(sel) {
  const wrap = document.getElementById('autoEntregaWrap');
  if (!wrap) return;
  const show = sel.value === 'si';
  wrap.style.display = show ? 'block' : 'none';
  if (show) {
    const list = document.getElementById('autoEntregaList');
    if (list && list.querySelectorAll('[data-ae-block]').length === 0) _aeAgregarAuto();
  }
}

function _leerAutosEntrega(f) {
  const autos = [];
  f.querySelectorAll('#autoEntregaList [data-ae-block]').forEach(bl => {
    const g = s => bl.querySelector(s);
    const brand   = g('.ae-brand')?.value.trim()   || '';
    const model   = g('.ae-model')?.value.trim()   || '';
    const version = g('.ae-version')?.value.trim() || '';
    const yearRaw = g('.ae-year')?.value           || '';
    const kmRaw   = g('.ae-km')?.value             || '';
    const color   = g('.ae-color')?.value.trim()   || '';
    const trans   = g('.ae-trans')?.value          || '';
    const notas   = g('.ae-notas')?.value.trim()   || '';
    if (!brand && !model && !version && !yearRaw && !kmRaw && !color && !trans && !notas) return;
    autos.push({ brand, model, version, year: yearRaw ? +yearRaw : null, km: kmRaw ? _parseMiles(kmRaw) : null, color, trans, notas });
  });
  return autos;
}

/* ═══════════════════════════════════════════════════════════════
   MARCAS — SISTEMA SIMPLIFICADO
   - Marca + Modelo principal: inputs directos en el form
   - Marcas extra: filas adicionales con "+ Agregar otra marca"
   - Se guardan todas al submit sin necesidad de ningún botón
   ═══════════════════════════════════════════════════════════════ */

/* Agrega una fila extra de marca+modelo */
function _marcaExtraAgregar(marca, modelo) {
  const wrap = document.getElementById('marcas-extra-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'marca-extra-row';
  div.innerHTML = `
    <input type="text" class="marca-extra-brand" placeholder="Marca (Toyota, Ford...)" list="ml1" value="${esc(marca || '')}" autocomplete="off">
    <input type="text" class="marca-extra-model" placeholder="Modelo (Hilux, Ranger...)" value="${esc(modelo || '')}" autocomplete="off">
    <button type="button" class="marca-extra-remove" onclick="this.closest('.marca-extra-row').remove()" title="Quitar">×</button>`;
  wrap.appendChild(div);
}

/* Lee TODOS las marcas del formulario: el principal + las filas extra */
function _leerMarcas(f) {
  const arr = [];
  const marcaP  = (document.getElementById('marca-principal')?.value  || '').trim();
  const modeloP = (document.getElementById('modelo-principal')?.value || '').trim();
  if (marcaP) arr.push({ marca: marcaP, modelo: modeloP });
  f.querySelectorAll('.marca-extra-row').forEach(row => {
    const marca  = row.querySelector('.marca-extra-brand')?.value.trim() || '';
    const modelo = row.querySelector('.marca-extra-model')?.value.trim() || '';
    if (marca) arr.push({ marca, modelo });
  });
  return arr;
}

/* Al editar un cliente existente, rellena los campos de marca */
function _marcasCargar(marcas) {
  if (!marcas || !marcas.length) return;
  const first   = marcas[0];
  const mp      = document.getElementById('marca-principal');
  const mo      = document.getElementById('modelo-principal');
  if (mp) mp.value = typeof first === 'string' ? first : (first.marca || '');
  if (mo) mo.value = typeof first === 'string' ? '' : (first.modelo || '');
  marcas.slice(1).forEach(m => {
    if (!m) return;
    const marca  = typeof m === 'string' ? m : m.marca;
    const modelo = typeof m === 'string' ? '' : (m.modelo || '');
    if (marca) _marcaExtraAgregar(marca, modelo);
  });
}

function _canalSeleccionar(btn, hiddenId) {
  document.querySelectorAll('.canal-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = btn.dataset.val;
}

function _ceroToggle() {
  const wrap   = document.getElementById('cero-toggle');
  const detail = document.getElementById('cero-detail');
  if (!wrap || !detail) return;
  const active = wrap.classList.toggle('active');
  detail.style.display = active ? 'block' : 'none';
  const hidden = document.getElementById('cero-hidden');
  if (hidden) hidden.value = active ? 'si' : 'no';
}

/* ═══════════════════════════════════════════════════════════════
   FILTROS AVANZADOS
   ═══════════════════════════════════════════════════════════════ */
function _filtrosToggle() { _filtrosOpen = !_filtrosOpen; _renderBuscador(); }

function _filtrosLimpiar() {
  _filtroFechaDesde = _filtroFechaHasta = _filtroPresupDesde = _filtroPresupHasta = _filtroMarca = '';
  _renderBuscador();
  _renderClientCards();
}

function _filtroUpdate(campo, val) {
  if (campo === 'fechaDesde')  _filtroFechaDesde  = val;
  if (campo === 'fechaHasta')  _filtroFechaHasta  = val;
  if (campo === 'presupDesde') _filtroPresupDesde = val;
  if (campo === 'presupHasta') _filtroPresupHasta = val;
  if (campo === 'marca')       _filtroMarca       = val;
  _renderClientCards();
}

function _hayFiltrosActivos() {
  return _filtroFechaDesde || _filtroFechaHasta || _filtroPresupDesde || _filtroPresupHasta || _filtroMarca;
}

function _contarFiltrosActivos() {
  let n = 0;
  if (_filtroFechaDesde || _filtroFechaHasta) n++;
  if (_filtroPresupDesde || _filtroPresupHasta) n++;
  if (_filtroMarca) n++;
  return n;
}

function _renderBuscador() {
  const wrap = document.getElementById('buscador-wrap');
  if (!wrap) return;
  wrap.innerHTML = _htmlBuscador();
}

function _htmlBuscador() {
  const activos   = _contarFiltrosActivos();
  const badgeHtml = activos > 0 ? `<span class="filtros-active-badge">${activos} filtro${activos > 1 ? 's' : ''}</span>` : '';
  let html = `
  <div class="cliente-search-wrap">
    <span class="cliente-search-icon"></span>
    <input id="cliente-search-input" class="cliente-search-input" type="text"
      placeholder="Buscar por nombre o teléfono…"
      value="${esc(clienteSearch)}"
      oninput="_clienteSearchUpdate(this.value)" autocomplete="off">
    <button id="cliente-search-clear" class="cliente-search-clear${clienteSearch ? ' visible' : ''}" onclick="_clienteSearchClear()" title="Limpiar">×</button>
    <button class="filtros-toggle-btn${(_filtrosOpen || activos > 0) ? ' active' : ''}" onclick="_filtrosToggle()" title="Filtros avanzados">
      ⚙ Filtros${badgeHtml}
    </button>
  </div>`;
  if (_filtrosOpen) {
    html += `
  <div class="filtros-panel" style="grid-template-columns:1fr 1fr">
    <div class="filtros-group" style="grid-column:1/-1">
      <div class="filtros-group-label">🚗 Marca o modelo buscado</div>
      <div class="filtros-row">
        <input type="text" placeholder="Ej: Toyota, Fiat Cronos, Corolla…"
          value="${esc(_filtroMarca)}"
          oninput="_filtroUpdate('marca',this.value)"
          style="width:100%">
      </div>
      <div style="font-size:10px;color:var(--text-3);margin-top:3px">Filtrá clientes según la marca o modelo que están buscando (incluye interés en 0km)</div>
    </div>
    <div class="filtros-group">
      <div class="filtros-group-label">📅 Fecha de carga</div>
      <div class="filtros-row">
        <input type="date" value="${_filtroFechaDesde}" oninput="_filtroUpdate('fechaDesde',this.value)" title="Desde">
        <span>→</span>
        <input type="date" value="${_filtroFechaHasta}" oninput="_filtroUpdate('fechaHasta',this.value)" title="Hasta">
      </div>
    </div>
    <div class="filtros-group">
      <div class="filtros-group-label">💰 Presupuesto del cliente ($)</div>
      <div class="filtros-row">
        <input type="number" placeholder="Mínimo" min="0" value="${_filtroPresupDesde}" oninput="_filtroUpdate('presupDesde',this.value)" title="Desde">
        <span>→</span>
        <input type="number" placeholder="Máximo" min="0" value="${_filtroPresupHasta}" oninput="_filtroUpdate('presupHasta',this.value)" title="Hasta">
      </div>
    </div>
    ${_hayFiltrosActivos() ? `<div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn sm danger" onclick="_filtrosLimpiar()">✕ Limpiar filtros</button></div>` : ''}
  </div>`;
  }
  return html;
}

/* ── CRUD ── */
async function addClient(e) {
  e.preventDefault();
  const f = e.target;
  const tieneAuto    = f.tieneAutoEntrega && f.tieneAutoEntrega.value === 'si';
  const autosEntrega = tieneAuto ? _leerAutosEntrega(f) : [];
  const marcas       = _leerMarcas(f);
  const primeraMarca = marcas.length > 0 ? (typeof marcas[0] === 'string' ? marcas[0] : marcas[0].marca) : '';
  const ceroKm       = f.querySelector('#cero-hidden')?.value === 'si';
  const data = {
    name: f.cname.value.trim(), phone: f.phone.value.trim(),
    fechaCumple: f.fechaCumple.value,
    fechaCreacion: f.fechaCreacion.value || todayISO(),
    localidad: f.localidad?.value.trim() || '',
    status: 'activo', brands: marcas, brand: primeraMarca,
    model: '', tipo: f.tipo.value,
    budget: _parseMiles(f.budget.value),
    trans: f.trans.value,
    yearMin: f.yearMin.value ? +f.yearMin.value : null,
    yearMax: f.yearMax.value ? +f.yearMax.value : null,
    notes: f.notes.value.trim(),
    canal: f.querySelector('#canal-hidden')?.value || '',
    tieneAutoEntrega: autosEntrega.length > 0,
    autosEntrega:     autosEntrega,
    autoEntrega:      autosEntrega.length ? autosEntrega[0] : null,
    interesCeroKm: ceroKm,
    ceroKm: ceroKm ? {
      brand:   f.ckBrand?.value.trim()   || '',
      model:   f.ckModel?.value.trim()   || '',
      version: f.ckVersion?.value.trim() || '',
      budget:  _parseMiles(f.ckBudget?.value),
      trans:   f.ckTrans?.value          || '',
      color:   f.ckColor?.value.trim()   || '',
      notas:   f.ckNotas?.value.trim()   || '',
    } : null,
    creadoPor: getSession()?.nombre || getSession()?.email || 'Desconocido',
  };
  try {
    const res = await CRM.addCliente(data);
    data.id = res.id;
    S.clients.unshift(data);
    addClientOpen = false;
    render();
    await _alertaCumpleanios(data, false);
  } catch(err) { toast('Error al guardar: ' + err.message, 'error'); }
}

async function saveEditClient(e) {
  e.preventDefault();
  const f  = e.target;
  const cl = S.clients.find(c => c.id === editClientId);
  if (!cl) return;
  const tieneAutoE   = f.tieneAutoEntrega && f.tieneAutoEntrega.value === 'si';
  const autosEntrega = tieneAutoE ? _leerAutosEntrega(f) : [];
  const marcas       = _leerMarcas(f);
  const primeraMarca = marcas.length > 0 ? (typeof marcas[0] === 'string' ? marcas[0] : marcas[0].marca) : '';
  const ceroKm       = f.querySelector('#cero-hidden')?.value === 'si';
  const data = {
    id: editClientId,
    name: f.cname.value.trim(), phone: f.phone.value.trim(),
    fechaCumple: f.fechaCumple.value,
    fechaCreacion: f.fechaCreacion.value || cl.fechaCreacion || cl.date || todayISO(),
    localidad: f.localidad?.value.trim() || '',
    brands: marcas, brand: primeraMarca,
    model: '', tipo: f.tipo.value,
    budget: _parseMiles(f.budget.value),
    trans: f.trans.value,
    yearMin: f.yearMin.value ? +f.yearMin.value : null,
    yearMax: f.yearMax.value ? +f.yearMax.value : null,
    notes: f.notes.value.trim(),
    canal: f.querySelector('#canal-hidden')?.value || cl.canal || '',
    tieneAutoEntrega: autosEntrega.length > 0,
    autosEntrega:     autosEntrega,
    autoEntrega:      autosEntrega.length ? autosEntrega[0] : null,
    interesCeroKm: ceroKm,
    ceroKm: ceroKm ? {
      brand:   f.ckBrand?.value.trim()   || '',
      model:   f.ckModel?.value.trim()   || '',
      version: f.ckVersion?.value.trim() || '',
      budget:  _parseMiles(f.ckBudget?.value),
      trans:   f.ckTrans?.value          || '',
      color:   f.ckColor?.value.trim()   || '',
      notas:   f.ckNotas?.value.trim()   || '',
    } : null,
    creadoPor:    cl.creadoPor || null,
    editadoPor:   getSession()?.nombre || getSession()?.email || 'Desconocido',
    fechaEdicion: todayISO(),
  };
  try {
    await CRM.editCliente(data);
    Object.assign(cl, data);
    editClientId = null;
    render();
    toast('Cliente actualizado', 'success');
  } catch(err) { toast('Error al guardar: ' + err.message, 'error'); }
}

function editClient(id) { editClientId = id; addClientOpen = false; render(); }
function cancelEdit()   { editClientId = null; render(); }

async function setClientStatus(id, st) {
  const c = S.clients.find(x => x.id === id);
  if (!c) return;
  try { await CRM.editCliente({ ...c, status: st }); c.status = st; render(); }
  catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function delClient(id) {
  if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
  try {
    await CRM.delCliente(id);
    S.clients = S.clients.filter(c => c.id !== id);
    render();
    toast('Cliente eliminado', 'success');
  } catch(err) { toast('Error al eliminar: ' + err.message, 'error'); }
}

async function _alertaCumpleanios(cliente, forzar) {
  if (!cliente || !cliente.fechaCumple) return;
  const d = new Date(cliente.fechaCumple), n = new Date();
  let next = new Date(n.getFullYear(), d.getMonth(), d.getDate());
  if (next < n) next.setFullYear(next.getFullYear() + 1);
  const fechaISO = next.toISOString().split('T')[0];
  if (!forzar) {
    const yaExiste = S.alertas.some(a => a.tipo === 'birthday' && a.ref_id === cliente.id);
    if (yaExiste) return;
  }
  try {
    const res = await CRM.addAlerta({
      tipo: 'birthday', titulo: `🎂 Cumpleaños de ${cliente.name}`,
      descripcion: `Tel: ${cliente.phone} · Fecha: ${cliente.fechaCumple}`,
      fecha: fechaISO, refId: cliente.id, refPhone: cliente.phone, refName: cliente.name,
    });
    S.alertas.unshift({ id: res.id, tipo: 'birthday', done: false, ref_id: cliente.id });
  } catch(e) { console.warn('Error alerta cumpleaños:', e); }
}

function rAuditoria(c) {
  if (!c.creadoPor && !c.editadoPor) return '';
  let html = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">';
  if (c.creadoPor) {
    const fecha = c.fechaCreacion || c.date || '';
    html += `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);border-left:3px solid var(--green);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--text-2)">
      <span style="font-size:14px">👤</span>
      <span>Cargado por <strong style="color:var(--text-1)">${esc(c.creadoPor)}</strong>${fecha ? `<span style="color:var(--text-3)"> · ${_fmtFecha(fecha)}</span>` : ''}</span>
    </div>`;
  }
  if (c.editadoPor) {
    const fecha = c.fechaEdicion || '';
    html += `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--text-2)">
      <span style="font-size:14px">✏️</span>
      <span>Editado por <strong style="color:var(--text-1)">${esc(c.editadoPor)}</strong>${fecha ? `<span style="color:var(--text-3)"> · ${_fmtFecha(fecha)}</span>` : ''}</span>
    </div>`;
  }
  html += '</div>';
  return html;
}

function rCanalBadge(canal) {
  if (!canal) return '';
  const c = CANALES.find(x => x.val === canal);
  if (!c) return `<span class="badge bg-gray">${esc(canal)}</span>`;
  return `<span class="badge bg-gray">${c.icon} ${c.label}</span>`;
}

/* ═══════════════════════════════════════════════════════════════
   FORMULARIO
   ═══════════════════════════════════════════════════════════════ */
function rClientForm(cl) {
  _inyectarEstilosMultiMarca();
  const edit = !!cl;
  const marcasExist = edit
    ? (cl.brands && cl.brands.length ? cl.brands : (cl.brand ? [{ marca: cl.brand, modelo: cl.model || '' }] : []))
    : [];
  const canalExist       = edit ? (cl.canal || '') : '';
  const ceroActivo       = edit ? (cl.interesCeroKm === true) : false;
  const ck               = edit && cl.ceroKm ? cl.ceroKm : {};
  const fechaCreacionVal = edit ? (cl.fechaCreacion || cl.date || '') : todayISO();
  const autosExist       = edit
    ? (cl.autosEntrega && cl.autosEntrega.length ? cl.autosEntrega : (cl.autoEntrega ? [cl.autoEntrega] : []))
    : [];
  let autosHtml = '';
  if (autosExist.length) autosHtml = autosExist.map((ae, i) => _aeBlockHTML(i, ae)).join('');
  else if (edit && cl && cl.tieneAutoEntrega) autosHtml = _aeBlockHTML(0, {});

  // Primer marca y modelo para los inputs principales
  const primeraMarca  = marcasExist.length > 0 ? (typeof marcasExist[0] === 'string' ? marcasExist[0] : (marcasExist[0].marca || '')) : '';
  const primerModelo  = marcasExist.length > 0 && typeof marcasExist[0] !== 'string' ? (marcasExist[0].modelo || '') : '';
  const marcasExtras  = marcasExist.slice(1);

  const extrasInitScript = marcasExtras.length
    ? `<script>_marcasCargarExtras(${JSON.stringify(marcasExtras)})<\/script>` : '';
  const canalInitScript  = canalExist
    ? `<script>(function(){ var btn=document.querySelector('.canal-btn[data-val="${canalExist}"]'); if(btn){btn.classList.add('selected');document.getElementById('canal-hidden').value='${canalExist}';}})();<\/script>` : '';

  const footerBtns = edit
    ? `<button type="button" class="btn" onclick="cancelEdit()">Cancelar</button>
       <button type="button" class="btn" style="border-color:rgba(91,155,213,.4);color:var(--blue)" onclick="_crearTareaCliente('${cl.id}')">📋 Crear tarea</button>
       <button type="submit" class="btn primary">Guardar cambios</button>`
    : `<button type="button" class="btn" onclick="addClientOpen=false;render()">Cancelar</button>
       <button type="button" id="btn-guardar-y-tarea" class="btn" style="border-color:rgba(91,155,213,.4);color:var(--blue)">📋 Guardar y crear tarea</button>
       <button type="submit" class="btn primary">Guardar cliente</button>`;

  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar cliente' : 'Nuevo cliente interesado'}</div>
    <form id="form-nuevo-cliente" onsubmit="${edit ? 'saveEditClient(event)' : 'addClient(event)'}">

      <div class="hint-box">
        <div class="hint-label">Datos de contacto</div>
        <div class="fg2">
          <div class="fg"><label>Nombre completo *</label><input type="text" name="cname" placeholder="Juan Pérez" value="${edit ? esc(cl.name) : ''}" required></div>
          <div class="fg"><label>Teléfono *</label><input type="tel" name="phone" placeholder="351 555-0000" value="${edit ? esc(cl.phone) : ''}" required></div>
        </div>
        <div class="fg2">
          <div class="fg">
            <label>Fecha de nacimiento <span style="font-size:10px;font-weight:400;color:var(--text-3)">(NO OBLIGATORIO)</span></label>
            <input type="date" name="fechaCumple" value="${edit && cl.fechaCumple ? cl.fechaCumple : ''}">
            <div style="font-size:10px;color:var(--text-3);margin-top:3px">Se creará una alerta de recordatorio automáticamente</div>
          </div>
          <div class="fg">
            <label>Localidad <span style="font-size:10px;font-weight:400;color:var(--text-3)">(NO OBLIGATORIO)</span></label>
            <input type="text" name="localidad" placeholder="Ej: Córdoba, Villa María..." value="${edit && cl.localidad ? esc(cl.localidad) : ''}">
          </div>
        </div>
        <div class="fg2" style="margin-top:10px">
          <div class="fg">
            <label>Fecha de carga *</label>
            <input type="date" name="fechaCreacion" value="${fechaCreacionVal}" required>
          </div>
          <div class="fg">
            <label>¿Cómo se contactó? <span style="font-size:10px;font-weight:400;color:var(--text-3)">(NO OBLIGATORIO)</span></label>
            <div class="canal-btns">
              ${CANALES.map(c => `<button type="button" class="canal-btn" data-val="${c.val}" onclick="_canalSeleccionar(this,'canal-hidden')">${c.icon} ${c.label}</button>`).join('')}
            </div>
            <input type="hidden" id="canal-hidden" value="${canalExist}">
          </div>
        </div>
        ${edit ? rAuditoria(cl) : ''}
      </div>

      <div class="hint-box">
        <div class="hint-label">Intereses del cliente — completá solo lo que mencionó</div>

        <div class="fg2">
          <div class="fg">
            <label>Marca preferida</label>
            <input type="text" id="marca-principal" placeholder="Toyota, Ford, Fiat..." list="ml1" autocomplete="off" value="${esc(primeraMarca)}">
            <datalist id="ml1">${MARCAS.map(m => `<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="fg">
            <label>Modelo</label>
            <input type="text" id="modelo-principal" placeholder="Hilux, Cronos, Ranger..." autocomplete="off" value="${esc(primerModelo)}">
          </div>
        </div>

        <div id="marcas-extra-wrap"></div>
        <button type="button" class="btn sm" style="margin-bottom:14px" onclick="_marcaExtraAgregar()">+ Agregar otra marca</button>

        <div class="fg2">
          <div class="fg"><label>Tipo de vehículo</label>
            <select name="tipo"><option value="">— cualquiera —</option>${TIPOS.map(t => `<option value="${t}"${edit && cl.tipo === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
          </div>
          <div class="fg"><label>Transmisión</label>
            <select name="trans">
              <option value="">— cualquiera —</option>
              <option value="manual"${edit && cl.trans === 'manual' ? ' selected' : ''}>Manual</option>
              <option value="automático"${edit && cl.trans === 'automático' ? ' selected' : ''}>Automático</option>
            </select>
          </div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Presupuesto máximo ($)</label><input type="text" inputmode="numeric" name="budget" placeholder="15.000.000" value="${edit && cl.budget ? Number(cl.budget).toLocaleString('es-AR') : ''}" oninput="_fmtMilesInput(this)"></div>
          <div class="fg2" style="gap:8px">
            <div class="fg"><label>Año desde</label><input type="number" name="yearMin" placeholder="2018" min="1990" max="2030" value="${edit && cl.yearMin ? cl.yearMin : ''}"></div>
            <div class="fg"><label>Año hasta</label><input type="number" name="yearMax" placeholder="2024" min="1990" max="2030" value="${edit && cl.yearMax ? cl.yearMax : ''}"></div>
          </div>
        </div>
        <input type="hidden" name="model" value="">
        <div class="fg">
          <label>Notas adicionales</label>
          <textarea name="notes" placeholder="Quiere color oscuro, necesita 4x4, urgente...">${edit && cl.notes ? esc(cl.notes) : ''}</textarea>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">¿Le interesa un auto 0km?</div>
        <input type="hidden" id="cero-hidden" value="${ceroActivo ? 'si' : 'no'}">
        <div id="cero-toggle" class="cero-toggle-wrap${ceroActivo ? ' active' : ''}" onclick="_ceroToggle()">
          <span class="cero-toggle-icon">✨</span>
          <span class="cero-toggle-label">El cliente está interesado en un vehículo 0km</span>
          <div class="cero-toggle-check"></div>
        </div>
        <div id="cero-detail" class="cero-detail-wrap" style="display:${ceroActivo ? 'block' : 'none'}">
          <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin-bottom:12px">Detalles del 0km buscado</div>
          <div class="fg3">
            <div class="fg"><label>Marca</label><input type="text" name="ckBrand" placeholder="Toyota, VW..." list="ml-ck" value="${esc(ck.brand||'')}"><datalist id="ml-ck">${MARCAS.map(m => `<option value="${m}">`).join('')}</datalist></div>
            <div class="fg"><label>Modelo</label><input type="text" name="ckModel" placeholder="Hilux, Taos..." value="${esc(ck.model||'')}"></div>
            <div class="fg"><label>Versión</label><input type="text" name="ckVersion" placeholder="SRV, Comfortline..." value="${esc(ck.version||'')}"></div>
          </div>
          <div class="fg3">
            <div class="fg"><label>Presupuesto ($)</label><input type="text" inputmode="numeric" name="ckBudget" placeholder="35.000.000" value="${ck.budget ? Number(ck.budget).toLocaleString('es-AR') : ''}" oninput="_fmtMilesInput(this)"></div>
            <div class="fg"><label>Transmisión</label>
              <select name="ckTrans">
                <option value="">— cualquiera —</option>
                <option value="manual"${ck.trans === 'manual' ? ' selected' : ''}>Manual</option>
                <option value="automático"${ck.trans === 'automático' ? ' selected' : ''}>Automático</option>
              </select>
            </div>
            <div class="fg"><label>Color preferido</label><input type="text" name="ckColor" placeholder="Blanco, Negro..." value="${esc(ck.color||'')}"></div>
          </div>
          <div class="fg"><label>Observaciones</label><textarea name="ckNotas" placeholder="Detalles adicionales del 0km buscado...">${esc(ck.notas||'')}</textarea></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">¿Tiene auto para entregar?</div>
        <div class="fg">
          <label>¿Entrega un auto?</label>
          <select name="tieneAutoEntrega" id="tieneAutoEntregaSel" onchange="_aeToggleEntrega(this)">
            <option value="no"${edit && cl && cl.tieneAutoEntrega ? '' : ' selected'}>No</option>
            <option value="si"${edit && cl && cl.tieneAutoEntrega ? ' selected' : ''}>Sí — tiene auto para entregar</option>
          </select>
        </div>
        <div id="autoEntregaWrap" style="display:${edit && cl && cl.tieneAutoEntrega ? 'block' : 'none'};margin-top:12px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Datos del/los auto(s) a entregar</div>
          <datalist id="ml-ae">${MARCAS.map(m => `<option value="${m}">`).join('')}</datalist>
          <div id="autoEntregaList">${autosHtml}</div>
          <button type="button" class="btn sm" style="border-color:rgba(91,155,213,.4);color:var(--blue);margin-top:4px" onclick="_aeAgregarAuto()">+ Agregar otro auto</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${footerBtns}
      </div>
    </form>
  </div>
  ${extrasInitScript}${canalInitScript}`;
}

/* Carga las marcas extras al editar */
function _marcasCargarExtras(marcas) {
  marcas.forEach(m => {
    if (!m) return;
    const marca  = typeof m === 'string' ? m : m.marca;
    const modelo = typeof m === 'string' ? '' : (m.modelo || '');
    if (marca) _marcaExtraAgregar(marca, modelo);
  });
}

function _engancharBtnTarea() {
  const btn  = document.getElementById('btn-guardar-y-tarea');
  const form = document.getElementById('form-nuevo-cliente');
  if (!btn || !form) return;
  btn.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    addClientYTarea(form);
  };
}

/* ═══════════════════════════════════════════════════════════════
   BUSCADOR
   ═══════════════════════════════════════════════════════════════ */
function _clienteSearchUpdate(val) {
  clienteSearch = val;
  const clearBtn = document.getElementById('cliente-search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
  _renderClientCards();
}

function _clienteSearchClear() {
  clienteSearch = '';
  const inp = document.getElementById('cliente-search-input');
  if (inp) { inp.value = ''; inp.focus(); }
  const clearBtn = document.getElementById('cliente-search-clear');
  if (clearBtn) clearBtn.classList.remove('visible');
  _renderClientCards();
}

function _clienteMatch(c) {
  if (clienteSearch) {
    const q = clienteSearch.toLowerCase();
    if (!(c.name || '').toLowerCase().includes(q) && !(c.phone || '').includes(q)) return false;
  }
  if (_filtroFechaDesde && c.fechaCreacion && c.fechaCreacion < _filtroFechaDesde) return false;
  if (_filtroFechaHasta && c.fechaCreacion && c.fechaCreacion > _filtroFechaHasta) return false;
  if (_filtroPresupDesde !== '' && _filtroPresupDesde !== null) {
    if ((c.budget != null ? c.budget : 0) < parseInt(_filtroPresupDesde)) return false;
  }
  if (_filtroPresupHasta !== '' && _filtroPresupHasta !== null) {
    if ((c.budget != null ? c.budget : 0) > parseInt(_filtroPresupHasta)) return false;
  }
  if (_filtroMarca) {
    const q = _filtroMarca.toLowerCase().trim();
    const marcasArr = c.brands && c.brands.length
      ? c.brands
      : (c.brand ? [{ marca: c.brand, modelo: c.model || '' }] : []);
    const ck = c.ceroKm || {};
    const textosBuscar = [
      ...marcasArr.map(m => typeof m === 'string' ? m : `${m.marca || ''} ${m.modelo || ''}`),
      ck.brand || '', ck.model || '', ck.version || '',
    ];
    if (!textosBuscar.some(t => t.toLowerCase().includes(q))) return false;
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS DE TARJETA
   ═══════════════════════════════════════════════════════════════ */
function _rMarcasChips(c) {
  const marcasArr = c.brands && c.brands.length ? c.brands : (c.brand ? [{ marca: c.brand, modelo: c.model || '' }] : []);
  if (!marcasArr.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">
    ${marcasArr.map(m => {
      const marca  = typeof m === 'string' ? m : m.marca;
      const modelo = typeof m === 'string' ? '' : (m.modelo || '');
      return `<span class="marca-display-chip">
        <strong>${esc(marca)}</strong>${modelo ? `<span style="opacity:.75"> · ${esc(modelo)}</span>` : ''}
      </span>`;
    }).join('')}
  </div>`;
}

function _rCeroKm(c) {
  if (!c.interesCeroKm) return '';
  const ck = c.ceroKm || {};
  const partes = [
    ck.brand   ? `<strong>${esc(ck.brand)}</strong>` : null,
    ck.model   ? esc(ck.model)   : null,
    ck.version ? esc(ck.version) : null,
    ck.trans   ? esc(ck.trans)   : null,
    ck.color   ? esc(ck.color)   : null,
    ck.budget  ? `$${parseInt(ck.budget).toLocaleString('es-AR')}` : null,
  ].filter(Boolean).join(' · ');
  return `
  <div style="margin-top:8px;padding:8px 10px;background:var(--gold-bg);border-radius:6px;border:1px solid var(--gold-border);border-left:3px solid var(--gold)">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gold);margin-bottom:${partes || ck.notas ? '4px' : '0'}">✨ Interesado en 0km</div>
    ${partes ? `<div style="font-size:12px;color:var(--text-2)">${partes}</div>` : ''}
    ${ck.notas ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px;font-style:italic">"${esc(ck.notas)}"</div>` : ''}
  </div>`;
}

function _rAutosEntrega(c) {
  const autos = (c.autosEntrega && c.autosEntrega.length)
    ? c.autosEntrega
    : (c.tieneAutoEntrega && c.autoEntrega ? [c.autoEntrega] : []);
  if (!autos.length) return '';
  const multi = autos.length > 1;
  return autos.map((ae, i) => `
  <div style="margin-top:8px;padding:8px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border);border-left:3px solid var(--orange)">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:4px">🚗 Auto para entregar${multi ? ` ${i + 1}/${autos.length}` : ''}</div>
    <div style="font-size:13px;font-weight:500;color:var(--text-1)">
      ${ae.brand ? esc(ae.brand) + ' ' : ''}${ae.model ? esc(ae.model) : ''}
      ${ae.version ? `<span style="color:var(--text-3);font-size:12px"> · ${esc(ae.version)}</span>` : ''}
      ${ae.year ? `<span style="color:var(--text-3)">${ae.year}</span>` : ''}
    </div>
    <div style="font-size:12px;color:var(--text-2);margin-top:2px">
      ${ae.km ? fk(ae.km) + ' km' : ''}${ae.trans ? ' · ' + ae.trans : ''}${ae.color ? ' · ' + esc(ae.color) : ''}
    </div>
    ${ae.notas ? `<div style="font-size:11px;color:var(--text-3);margin-top:3px;font-style:italic">"${esc(ae.notas)}"</div>` : ''}
  </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   RENDER PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
function render() {
  _inyectarEstilosMultiMarca();

  let html = `
  <div class="section-head">
    <div class="section-title">Clientes interesados</div>
    <button class="btn primary" onclick="addClientOpen=true;editClientId=null;render()">+ Agregar cliente</button>
  </div>
  ${addClientOpen ? rClientForm() : ''}
  ${editClientId  ? rClientForm(S.clients.find(c => c.id === editClientId)) : ''}`;

  if (S.clients.length > 0) {
    html += `<div id="buscador-wrap">${_htmlBuscador()}</div>`;
  }

  html += `<div id="cliente-cards-wrap"></div>`;

  if (S.clients.length === 0 && !addClientOpen) {
    html += `
  <div class="empty">
    <div class="empty-icon">○</div>
    <strong>No hay clientes cargados</strong>
    <div style="font-size:13px;margin-top:4px">Registrá clientes interesados para empezar a hacer matches.</div>
  </div>`;
  }

  document.getElementById('view').innerHTML = html;

  if (addClientOpen) {
    _engancharBtnTarea();
  }

  _renderClientCards();
}

/* ═══════════════════════════════════════════════════════════════
   RENDER DE TARJETAS
   ═══════════════════════════════════════════════════════════════ */
function _renderClientCards() {
  const wrap = document.getElementById('cliente-cards-wrap');
  if (!wrap) return;

  const active      = S.clients.filter(c => c.status === 'activo');
  const vendidos    = S.clients.filter(c => c.status === 'vendido');
  const descartados = S.clients.filter(c => c.status === 'descartado');
  const activeFiltered = active.filter(_clienteMatch);
  const hayFiltro = clienteSearch || _hayFiltrosActivos();

  let html = '';

  if (hayFiltro && activeFiltered.length === 0 && active.length > 0) {
    html += `
    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-3)">
      <div style="font-size:2rem;margin-bottom:.5rem"></div>
      <div style="font-size:14px">No se encontraron clientes con los filtros aplicados.</div>
    </div>`;
  }

  activeFiltered.forEach(c => {
    if (editClientId === c.id) return;
    const ms      = matchesForClient(c);
    const bd      = c.fechaCumple ? daysUntil(c.fechaCumple) : null;
    const bdToday = c.fechaCumple && isBirthdayToday(c.fechaCumple);

    html += `
    <div class="card">
      <div class="row" style="align-items:start">
        ${rAv(c.name, true)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:6px">
            <div>
              <div style="font-weight:600;font-size:15px">${esc(c.name)} ${bdToday ? '🎉' : bd !== null && bd <= 7 ? '🎂' : ''}</div>
              <div style="font-size:12px;color:var(--text-2)">${c.phone}${c.localidad ? ` · <span style="color:var(--text-3)">📍 ${esc(c.localidad)}</span>` : ''}${c.fechaCreacion ? ` · <span style="color:var(--text-3)">📅 ${_fmtFecha(c.fechaCreacion)}</span>` : ''}</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
              ${ms.length > 0 ? `<span class="badge bg-green">${ms.length} auto${ms.length > 1 ? 's' : ''} disponible${ms.length > 1 ? 's' : ''}</span>` : ''}
              ${bdToday ? '<span class="badge bg-purple">🎉 Cumpleaños</span>' : ''}
              ${c.interesCeroKm ? '<span class="badge bg-gold">✨ 0km</span>' : ''}
              ${c.tieneAutoEntrega ? '<span class="badge bg-orange">🚗 Entrega auto</span>' : ''}
              ${rCanalBadge(c.canal)}
              <span class="badge bg-blue">Activo</span>
            </div>
          </div>
          ${rAuditoria(c)}
          ${_rMarcasChips(c)}
          <div style="margin-top:8px">${rTags(c)}</div>
          ${c.notes ? `<div style="font-size:12px;color:var(--text-2);margin-top:6px;font-style:italic">"${esc(c.notes)}"</div>` : ''}
          ${_rCeroKm(c)}
          ${_rAutosEntrega(c)}
          ${ms.length > 0 ? `
          <div class="sep">
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Vehículos disponibles que pueden interesarle:</div>
            ${ms.slice(0, 3).map(car => {
              const idx = _reg(c.id, car.id);
              return `
            <div class="row" style="padding:6px 0;border-top:1px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500">${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3)">${car.year}</span></div>
              </div>
              ${rScoreRow(car.sc)}
              <button class="btn sm" onclick="showMatchDetailByIdx(${idx})" style="border-color:var(--gold-border);color:var(--gold)">Ver match</button>
            </div>`;
            }).join('')}
            ${ms.length > 3 ? `
            <div class="cliente-expand-wrap">
              <button class="btn sm" style="width:100%;border-color:rgba(91,155,213,.35);color:var(--blue)"
                onclick="_clienteExpandAutos('${c.id}', this)">
                Ver ${ms.length - 3} vehículo${ms.length - 3 > 1 ? 's' : ''} más ▾
              </button>
            </div>` : ''}
          </div>` : ''}
        </div>
      </div>
      <div class="sep" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn sm" style="border-color:rgba(91,155,213,.4);color:var(--blue)" onclick="_crearTareaCliente('${c.id}')">📋 Crear tarea</button>
        ${whatsappBtn(c.phone, c.name, true)}
        ${bdToday ? `<button class="btn sm" style="border-color:var(--purple-border);color:var(--purple)" onclick="openWhatsAppBirthday('${esc(c.phone)}','${esc(c.name)}')">🎉 Felicitar</button>` : ''}
        <button class="btn sm" onclick="editClient('${c.id}')">Editar</button>
        <button class="btn sm success" onclick="openCompraModal('${c.id}')">Compró</button>
        <button class="btn sm" onclick="setClientStatus('${c.id}','descartado')">Descartar</button>
        <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
      </div>
    </div>`;
  });

  if ([...vendidos, ...descartados].length > 0 && !hayFiltro) {
    html += `
    <details style="margin-top:1.25rem">
      <summary style="cursor:pointer;font-size:13px;color:var(--text-2);padding:4px 0">
        Historial — Vendidos (${vendidos.length}) / Descartados (${descartados.length})
      </summary>
      <div style="margin-top:10px">`;

    vendidos.forEach(c => {
      const carVinculado = c.ventaCarId ? S.cars.find(x => x.id === c.ventaCarId) : null;
      html += `
        <div class="card" style="opacity:.75;border-left:3px solid var(--green)">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
            <div class="row" style="align-items:start;flex:1;min-width:0">
              ${rAv(c.name)}
              <div style="min-width:0">
                <div style="font-weight:500;color:var(--text)">${esc(c.name)}</div>
                <div style="font-size:12px;color:var(--text-3)">${c.phone}${c.localidad ? ` · 📍 ${esc(c.localidad)}` : ''}${c.fechaCreacion ? ` · 📅 ${_fmtFecha(c.fechaCreacion)}` : ''}</div>
                ${c.fechaVenta ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Vendido el ${_fmtFecha(c.fechaVenta)}</div>` : ''}
                ${carVinculado ? `
                <div style="margin-top:6px;padding:5px 9px;background:rgba(76,175,125,.08);border:1px solid rgba(76,175,125,.2);border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px">
                  <span>🚗</span>
                  <span style="color:var(--text-2);font-weight:500">${esc(carVinculado.brand)} ${esc(carVinculado.model)} ${carVinculado.year}</span>
                  ${carVinculado.patente ? `<span style="color:var(--text-3)">[${esc(carVinculado.patente)}]</span>` : ''}
                </div>` : ''}
                ${rAuditoria(c)}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex-shrink:0">
              <span class="badge bg-green">✓ Vendido</span>
              ${rCanalBadge(c.canal)}
              ${whatsappBtn(c.phone, c.name, true)}
              <button class="btn sm" onclick="setClientStatus('${c.id}','activo')">Reactivar</button>
              <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
            </div>
          </div>
        </div>`;
    });

    descartados.forEach(c => {
      html += `
        <div class="card" style="opacity:.55">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div class="row">
              ${rAv(c.name)}
              <div>
                <div style="font-weight:500">${esc(c.name)}</div>
                <div style="font-size:12px;color:var(--text-3)">${c.phone}${c.localidad ? ` · 📍 ${esc(c.localidad)}` : ''}${c.fechaCreacion ? ` · 📅 ${_fmtFecha(c.fechaCreacion)}` : ''}</div>
                ${rAuditoria(c)}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="badge bg-gray">Descartado</span>
              ${rCanalBadge(c.canal)}
              ${whatsappBtn(c.phone, c.name, true)}
              <button class="btn sm" onclick="setClientStatus('${c.id}','activo')">Reactivar</button>
              <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
            </div>
          </div>
        </div>`;
    });

    html += `</div></details>`;
  }

  wrap.innerHTML = html;
}

function _clienteExpandAutos(clienteId, btn) {
  const cl = S.clients.find(x => x.id === clienteId);
  if (!cl) return;
  const ms    = matchesForClient(cl);
  const extra = ms.slice(3);
  const html  = extra.map(car => {
    const idx = _reg(cl.id, car.id);
    return `
    <div class="row" style="padding:6px 0;border-top:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${esc(car.brand)} ${esc(car.model)}
          <span style="color:var(--text-3)">${car.year}</span></div>
      </div>
      ${rScoreRow(car.sc)}
      <button class="btn sm" onclick="showMatchDetailByIdx(${idx})" style="border-color:var(--gold-border);color:var(--gold)">Ver match</button>
    </div>`;
  }).join('');
  btn.closest('.cliente-expand-wrap').outerHTML = html;
}

bootApp('clientes').then(() => render());