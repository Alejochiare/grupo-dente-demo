/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/vehiculos.js
   ═══════════════════════════════════════════════════════════════ */

function fmtNum(input) {
  let raw = input.value.replace(/\D/g, '');
  if (raw === '') { input.value = ''; return; }
  input.value = Number(raw).toLocaleString('es-AR');
}

function parseFmt(val) {
  if (!val || val.trim() === '') return null;
  const n = Number(val.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

let addCarOpen  = false;
let editCarId   = null;
let lastMatches = null;
let carSearch   = '';

/* ── Fotos: archivos elegidos (pendientes de subir) por formulario ── */
let fotosNuevasSeleccionadas = [];   // File[] elegidos en el <input type="file">
let fotosExistentesEdit      = [];   // URLs que ya tenía el vehículo (modo edición)

/* ── Estado de clientes expandidos por vehículo ── */
const clientesExpandidos = {};

function toggleClientesInteresados(carId) {
  clientesExpandidos[carId] = !clientesExpandidos[carId];
  const wrap = document.getElementById(`clientes-wrap-${carId}`);
  const btn  = document.getElementById(`clientes-btn-${carId}`);
  if (!wrap || !btn) return;
  if (clientesExpandidos[carId]) {
    wrap.style.display = 'block';
    btn.textContent = 'Ver menos ▲';
  } else {
    wrap.style.display = 'none';
    btn.textContent = 'Ver más ▼';
  }
}

/* ── Estilos del buscador ── */
function _inyectarEstilosBuscadorAutos() {
  if (document.getElementById('neifert-car-search-styles')) return;
  const st = document.createElement('style');
  st.id = 'neifert-car-search-styles';
  st.textContent = `
    .car-search-wrap { position:relative; margin-bottom:1rem; }
    .car-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; line-height:1; opacity:.6; }
    .car-search-input { width:100%; box-sizing:border-box; padding:10px 36px 10px 34px; border-radius:8px; border:1.5px solid var(--border,#555); background:var(--surface-2,#2a2a2a); color:var(--text,#fff); font-size:14px; outline:none; transition:border-color .15s; }
    .car-search-input:focus { border-color:var(--blue,#378ADD); background:var(--surface-3,#333); }
    .car-search-input::placeholder { color:var(--text-3,#666); }
    .car-search-clear { position:absolute; right:9px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-3); font-size:20px; line-height:1; padding:2px 5px; border-radius:4px; display:none; opacity:.6; }
    .car-search-clear.visible { display:block; }
    .car-search-clear:hover { opacity:1; color:var(--text); }
    .clientes-toggle-btn { background:none; border:1px solid var(--border); color:var(--text-2); font-size:11px; padding:3px 10px; border-radius:5px; cursor:pointer; transition:all .15s; margin-bottom:6px; }
    .clientes-toggle-btn:hover { background:var(--surface-3); color:var(--text); }
    .fotos-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .fotos-grid .foto-thumb { position:relative; width:84px; height:84px; border-radius:8px; overflow:hidden; border:1px solid var(--border,#444); }
    .fotos-grid .foto-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .fotos-grid .foto-thumb .foto-del { position:absolute; top:2px; right:2px; background:rgba(0,0,0,.65); color:#fff; border:none; border-radius:5px; width:20px; height:20px; font-size:13px; line-height:1; cursor:pointer; }
    .car-thumb-strip { display:flex; gap:6px; margin-top:8px; overflow-x:auto; }
    .car-thumb-strip img { width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid var(--border,#444); flex-shrink:0; }
  `;
  document.head.appendChild(st);
}

/* ══════════════════════════════════════════════════════════════
   MODAL DE PERITAJE — Ver resumen desde vehículos
   ══════════════════════════════════════════════════════════════ */

/* Paneles de carrocería (necesarios para el resumen) */
const _VEH_PANELES = [
  ['capo','Capó'],['techo','Techo'],['baul','Baúl'],
  ['paraDelant','Paragolpes del.'],['paraTras','Paragolpes tras.'],
  ['puertaDelIzq','Puerta del. izq.'],['puertaDelDer','Puerta del. der.'],
  ['puertaTrasIzq','Puerta tras. izq.'],['puertaTrasDer','Puerta tras. der.'],
  ['gdaDelIzq','Gda. del. izq.'],['gdaDelDer','Gda. del. der.'],
  ['gdaTrasIzq','Gda. tras. izq.'],['gdaTrasDer','Gda. tras. der.'],
  ['espejoIzq','Espejo izq.'],['espejoDer','Espejo der.'],
];

function verPeritajeVehiculo(carId) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;

  const prev = document.getElementById('veh-peritaje-overlay');
  if (prev) prev.remove();

  const overlay = document.createElement('div');
  overlay.id = 'veh-peritaje-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem';

  /* ── Sin peritaje ── */
  const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
  if (!hasP) {
    overlay.innerHTML = `
    <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#444);border-radius:12px;width:100%;max-width:420px;padding:2rem;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:.75rem">📋</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">Sin peritaje cargado</div>
      <div style="font-size:13px;color:var(--text-3);margin-bottom:1.5rem;line-height:1.5">
        <strong style="color:var(--text-2)">${esc(car.brand)} ${esc(car.model)} ${car.year}</strong>
        ${car.patente ? `<span style="margin-left:4px;font-size:11px;opacity:.7">[${esc(car.patente)}]</span>` : ''}
        <br>todavía no tiene un peritaje registrado.
      </div>
      <div style="display:flex;gap:8px;justify-content:center">
        <a href="peritaje.html?id=${carId}" class="btn primary">📋 Ir a peritajar</a>
        <button class="btn" onclick="document.getElementById('veh-peritaje-overlay').remove()">Cerrar</button>
      </div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return;
  }

  /* ── Con peritaje: mostrar resumen completo ── */
  const p     = car.peritaje;
  const total = p.costoTotal ? '$' + (+p.costoTotal).toLocaleString('es-AR') : null;

  const v = (val) => {
    if (!val) return '<span style="color:var(--text-3)">—</span>';
    const cls = val === 'ok' ? 'ok' : (val === 'falla' || val === 'roto' || val === 'falta') ? 'bad' : 'warn';
    return `<span class="pcheck-val ${cls}">${val}</span>`;
  };
  const row = (label, val) => val ? `<div class="pcheck-row"><div class="pcheck-label">${label}</div>${v(val)}</div>` : '';

  const panelesConDaño = _VEH_PANELES.filter(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d = p['daño' + kCap];
    return d && d !== 'ok';
  });

  const tieneDatosF = p.fHistorialServicios || p.fCorreaDistrib || p.fNeumaticosEstado ||
                      p.fPrimerDuenio || p.fParabrisas || p.fNotaPropietario;

  overlay.innerHTML = `
  <div style="background:var(--surface,#1e1e1e);border:1px solid var(--border,#444);border-radius:12px;width:100%;max-width:780px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">

    <!-- Header -->
    <div style="padding:1.1rem 1.4rem .9rem;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;justify-content:space-between;align-items:start;gap:12px">
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--text)">
          📋 Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}
          ${car.patente ? `<span style="font-size:12px;font-weight:400;opacity:.6;margin-left:4px">[${esc(car.patente)}]</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--text-3);margin-top:3px">
          ${car.tipo} · ${car.trans}
          ${p.peritador ? ` · Peritador: <strong style="color:var(--text-2)">${esc(p.peritador)}</strong>` : ''}
          ${p.fecha ? ` · ${p.fecha}` : ''}
        </div>
        ${p.resenaTexto ? `<div style="font-size:12px;color:var(--text-3);font-style:italic;margin-top:3px">"${esc(p.resenaTexto)}"</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
        ${total ? `<span class="badge bg-red">Reparaciones: ${total}</span>` : ''}
        <a href="peritaje.html?id=${carId}" class="btn sm primary">✏️ Editar</a>
        <button onclick="document.getElementById('veh-peritaje-overlay').remove()"
          style="background:none;border:none;font-size:22px;color:var(--text-3);cursor:pointer;line-height:1;padding:0">×</button>
      </div>
    </div>

    <!-- Contenido scrolleable -->
    <div style="overflow-y:auto;flex:1;padding:1rem 1.4rem">

      <!-- Costos rápidos si hay -->
      ${p.costoTotal ? `
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:14px;padding:10px 13px;border-radius:8px;background:var(--surface-2,#2a2a2a);border:1px solid var(--border)">
        ${p.costoA           ? `<span style="font-size:12px;color:var(--text-3)">A: <strong style="color:var(--text)">$${(+p.costoA).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoCarroceria  ? `<span style="font-size:12px;color:var(--text-3)">Carr.: <strong style="color:var(--text)">$${(+p.costoCarroceria).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoB           ? `<span style="font-size:12px;color:var(--text-3)">B: <strong style="color:var(--text)">$${(+p.costoB).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoC           ? `<span style="font-size:12px;color:var(--text-3)">C: <strong style="color:var(--text)">$${(+p.costoC).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoD           ? `<span style="font-size:12px;color:var(--text-3)">D: <strong style="color:var(--text)">$${(+p.costoD).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoE           ? `<span style="font-size:12px;color:var(--text-3)">E: <strong style="color:var(--text)">$${(+p.costoE).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoF           ? `<span style="font-size:12px;color:var(--text-3)">F: <strong style="color:var(--text)">$${(+p.costoF).toLocaleString('es-AR')}</strong></span>` : ''}
        <span style="font-size:13px;font-weight:700;color:var(--text);margin-left:auto">Total: ${total}</span>
      </div>` : ''}

      <!-- Grid A-D -->
      <div class="peritaje-grid">
        <div class="peritaje-section">
          <div class="peritaje-section-title">A — Equipamiento</div>
          ${row('Gato y llave', p.gatoLlave)}${row('Rueda auxiliar', p.ruedaAux)}
          ${row('Matafuego', p.matafuego)}${row('Balizas', p.balizas)}
          ${row('Segunda llave', p.segundaLlave)}${row('Alarma', p.alarma)}
          ${row('Audio', p.audio)}${row('Aire acond.', p.ac)}
          ${row('Cierre centr.', p.cierreCentral)}${row('Cinturón', p.cinturon)}
          ${row('Freno de mano', p.frenoMano)}
          ${p.obsExt ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsExt)}"</div>` : ''}
        </div>
        <div class="peritaje-section">
          <div class="peritaje-section-title">B — Motor</div>
          ${row('Motor', p.motor)}${row('Caja AT', p.cajaAT)}
          ${row('Embrague', p.embrague)}${row('4x4', p.cuatroX4)}
          ${p.mantenimiento ? row('Último mant.', p.mantenimiento) : ''}
          ${p.obsMotor ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsMotor)}"</div>` : ''}
        </div>
        <div class="peritaje-section">
          <div class="peritaje-section-title">C — Frenos / Tren</div>
          ${row('Frenos del.', p.frenos)}${row('Frenos tras.', p.frenosTraseros)}
          ${row('Tren delant.', p.trenDelant)}${row('Amortiguadores', p.amortiguadores)}
          ${p.obsC ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsC)}"</div>` : ''}
        </div>
        <div class="peritaje-section">
          <div class="peritaje-section-title">D — Eléctrico / DTC</div>
          ${row('ABS', p.abs)}${row('Luz motor', p.motorLuz)}
          ${row('Airbag', p.airbag)}${row('Batería', p.bateria)}
          ${(p.dtcCode1||p.dtcCode) ? row('Código DTC', p.dtcCode1||p.dtcCode) : ''}
          ${p.dtcCode2 ? row('Código DTC 2', p.dtcCode2) : ''}
          ${p.obsD ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsD)}"</div>` : ''}
        </div>
      </div>

      <!-- Carrocería -->
      ${panelesConDaño.length > 0 ? `
      <div class="peritaje-section" style="margin-top:10px">
        <div class="peritaje-section-title">Carrocería — Daños</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${panelesConDaño.map(([k, label]) => {
            const kCap = k.charAt(0).toUpperCase() + k.slice(1);
            const d   = p['daño' + kCap];
            const pct = p['pct'  + kCap];
            return `<span class="badge bg-red" style="font-size:11px">${label}: ${d}${pct ? ' ' + pct + '%' : ''}</span>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Interior E -->
      <div class="peritaje-section" style="margin-top:10px">
        <div class="peritaje-section-title">E — Interior</div>
        <div style="display:flex;flex-wrap:wrap;gap:0 2rem">
          <div>${row('Butaca izq.', p.butacaIzq)}</div>
          <div>${row('Butaca der.', p.butacaDer)}</div>
          <div>${row('Asiento tras.', p.asientoTras)}</div>
          <div>${row('Tapizado puertas', p.tapizPuertas)}</div>
          <div>${row('Tapizado techo', p.tapizTecho)}</div>
        </div>
        ${p.obsE ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsE)}"</div>` : ''}
      </div>

      <!-- Sección F -->
      ${tieneDatosF ? `
      <div class="peritaje-section" style="margin-top:10px">
        <div class="peritaje-section-title">F — Declaración del propietario</div>
        ${p.fHistorialServicios ? row('Historial servicios', p.fHistorialServicios) : ''}
        ${p.fCorreaDistrib      ? row('Correa distribución', p.fCorreaDistrib) : ''}
        ${p.fNeumaticosEstado   ? row('Neumáticos', p.fNeumaticosEstado) : ''}
        ${p.fPrimerDuenio       ? row('Dueño', p.fPrimerDuenio) : ''}
        ${p.fParabrisas         ? row('Parabrisas/cristales', p.fParabrisas) : ''}
        ${p.fNotaPropietario    ? `<div style="margin-top:6px;padding:8px 10px;border-radius:7px;border:1px solid rgba(239,159,39,0.3);background:rgba(239,159,39,0.06);font-size:11px;color:var(--text-2);font-style:italic;line-height:1.5">📝 "${esc(p.fNotaPropietario)}"</div>` : ''}
      </div>` : ''}

    </div>

    <!-- Footer -->
    <div style="padding:.9rem 1.4rem;border-top:1px solid var(--border);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px">
      <a href="peritaje.html?id=${carId}" class="btn sm primary">✏️ Editar peritaje</a>
      <button class="btn sm" onclick="document.getElementById('veh-peritaje-overlay').remove()">Cerrar</button>
    </div>
  </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ── Fotos: selección de nuevas y preview ── */
function onFotosSeleccionadas(input) {
  fotosNuevasSeleccionadas = Array.from(input.files || []);
  _renderPreviewFotos();
}

function _renderPreviewFotos() {
  const wrap = document.getElementById('fotos-preview-wrap');
  if (!wrap) return;

  let html = '';

  // Fotos ya existentes (solo en edición)
  fotosExistentesEdit.forEach((url, i) => {
    html += `
    <div class="foto-thumb">
      <img src="${esc(url)}" alt="">
      <button type="button" class="foto-del" onclick="quitarFotoExistente(${i})" title="Quitar">×</button>
    </div>`;
  });

  // Fotos nuevas elegidas (todavía no subidas)
  fotosNuevasSeleccionadas.forEach((file, i) => {
    const blobUrl = URL.createObjectURL(file);
    html += `
    <div class="foto-thumb">
      <img src="${blobUrl}" alt="">
      <button type="button" class="foto-del" onclick="quitarFotoNueva(${i})" title="Quitar">×</button>
    </div>`;
  });

  wrap.innerHTML = html;
}

function quitarFotoExistente(idx) {
  fotosExistentesEdit.splice(idx, 1);
  _renderPreviewFotos();
}

function quitarFotoNueva(idx) {
  fotosNuevasSeleccionadas.splice(idx, 1);
  _renderPreviewFotos();
}

/* ── CRUD ── */
async function addCar(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    brand: f.brand.value.trim(), model: f.model.value.trim(),
    version: f.version.value.trim(), patente: f.patente.value.trim().toUpperCase(),
    tipo: f.tipo.value, year: +f.year.value,
    km: parseFmt(f.km.value) ?? 0, trans: f.trans.value,
    color: f.color.value.trim(),
    monedaContado: f.monedaContado.value,
    precioContado: parseFmt(f.precioContado.value),
    monedaCanje: f.monedaCanje.value,
    precioCanje: parseFmt(f.precioCanje.value),
    duenioNombre: f.duenioNombre.value.trim(),
    duenioApellido: f.duenioApellido.value.trim(),
    duenioContacto: f.duenioContacto.value.trim(),
    itv: f.itv.value, itvVenc: f.itvVenc.value,
    consignacion: f.consignacion.checked,
    tipoConsignacion: f.tipoConsignacion.value,
    origen: f.origen.value,
    carpetaCompleta: f.carpetaCompleta.checked,
    carpetaConOficio: f.carpetaConOficio.checked,
    tieneIVA: f.tieneIVA.checked,
    nota: f.nota.value.trim(), status: 'disponible',
  };
  try {
    const res = await CRM.addVehiculo({ data, files: fotosNuevasSeleccionadas });
    data.id = res.id; data.peritaje = {};
    data.fotos = res.fotos || [];
    S.cars.unshift(data);
    lastMatches = matchesForCar(data);
    addCarOpen = false;
    fotosNuevasSeleccionadas = [];
    fotosExistentesEdit = [];
    render();
    toast('Vehículo agregado correctamente', 'success');
  } catch(err) { toast('Error al guardar: ' + err.message, 'error'); }
}

async function saveEditCar(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c => c.id === editCarId);
  if (!car) return;
  const data = {
    id: editCarId,
    brand: f.brand.value.trim(), model: f.model.value.trim(),
    version: f.version.value.trim(), patente: f.patente.value.trim().toUpperCase(),
    tipo: f.tipo.value, year: +f.year.value,
    km: parseFmt(f.km.value) ?? 0, trans: f.trans.value,
    color: f.color.value.trim(),
    monedaContado: f.monedaContado.value,
    precioContado: parseFmt(f.precioContado.value),
    monedaCanje: f.monedaCanje.value,
    precioCanje: parseFmt(f.precioCanje.value),
    duenioNombre: f.duenioNombre.value.trim(),
    duenioApellido: f.duenioApellido.value.trim(),
    duenioContacto: f.duenioContacto.value.trim(),
    itv: f.itv.value, itvVenc: f.itvVenc.value,
    consignacion: f.consignacion.checked,
    tipoConsignacion: f.tipoConsignacion.value,
    origen: f.origen.value,
    carpetaCompleta: f.carpetaCompleta.checked,
    carpetaConOficio: f.carpetaConOficio.checked,
    tieneIVA: f.tieneIVA.checked,
    nota: f.nota.value.trim(), status: car.status,
    fotosExistentes: fotosExistentesEdit, // URLs que se conservan (las que no se quitaron)
  };
  try {
    const res = await CRM.editVehiculo({ data, files: fotosNuevasSeleccionadas });
    Object.assign(car, data);
    car.fotos = res && res.fotos ? res.fotos : [...fotosExistentesEdit];
    editCarId = null; lastMatches = null;
    fotosNuevasSeleccionadas = [];
    fotosExistentesEdit = [];
    render();
    toast('Vehículo actualizado', 'success');
  } catch(err) { toast('Error al guardar: ' + err.message, 'error'); }
}

function editCar(id) {
  editCarId = id;
  addCarOpen = false;
  lastMatches = null;
  const car = S.cars.find(c => c.id === id);
  fotosExistentesEdit = car && Array.isArray(car.fotos) ? [...car.fotos] : [];
  fotosNuevasSeleccionadas = [];
  render();
}

function cancelEditCar(){
  editCarId = null;
  fotosNuevasSeleccionadas = [];
  fotosExistentesEdit = [];
  render();
}

async function setCarStatus(id, st) {
  const c = S.cars.find(x => x.id === id);
  if (!c) return;
  try {
    await CRM.editVehiculo({ ...c, status: st });
    c.status = st;
    render();
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function delCar(id) {
  if (!confirm('¿Eliminar este vehículo del stock?')) return;
  try {
    await CRM.delVehiculo(id);
    S.cars = S.cars.filter(c => c.id !== id);
    if (lastMatches) lastMatches = null;
    render();
    toast('Vehículo eliminado', 'success');
  } catch(err) { toast('Error al eliminar: ' + err.message, 'error'); }
}

function rAuditoriaAuto(car) {
  const partes = [];
  if (car.creadoPor) partes.push(`Cargado por <strong>${esc(car.creadoPor)}</strong>${car.fechaCreacion ? ' el ' + car.fechaCreacion : (car.date ? ' el ' + car.date : '')}`);
  if (car.editadoPor) partes.push(`Editado por <strong>${esc(car.editadoPor)}</strong>${car.fechaEdicion ? ' el ' + car.fechaEdicion : ''}`);
  if (!partes.length) return '';
  return `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${partes.join(' · ')}</div>`;
}

function toggleZeroKm(btn) {
  const input  = document.getElementById('kmInput');
  const duenio = document.getElementById('duenioWrap');
  const isZero = btn.dataset.zero === 'true';
  if (isZero) {
    btn.dataset.zero = 'false'; btn.textContent = '0 km';
    btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    input.disabled = false; input.value = ''; input.placeholder = '45.000';
    if (duenio) duenio.style.display = 'block';
  } else {
    btn.dataset.zero = 'true'; btn.textContent = '✓ 0 km';
    btn.style.background = 'var(--green)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--green)';
    input.disabled = true; input.value = '0'; input.placeholder = '0';
    if (duenio) duenio.style.display = 'none';
  }
}

function toggleConsignacion(chk) {
  const wrap = document.getElementById('tipoConsignacionWrap');
  if (wrap) wrap.style.display = chk.checked ? 'flex' : 'none';
}

function toggleITV(sel) {
  const wrap = document.getElementById('itvVencWrap');
  if (wrap) wrap.style.display = sel.value === 'no' ? 'block' : 'none';
}

/* ── Formulario ── */
function rCarForm(car) {
  const edit    = !!car;
  const esZeroKm = edit && car.km === 0;
  const kmVal    = edit && !esZeroKm && car.km ? Number(car.km).toLocaleString('es-AR') : '';
  const showDuenio = !esZeroKm;
  const esConsignacion   = edit && car.consignacion;
  const tipoConsig       = edit && car.tipoConsignacion ? car.tipoConsignacion : '';
  const origenVal        = edit && car.origen ? car.origen : 'propio';
  const carpetaCompleta  = edit && car.carpetaCompleta;
  const carpetaConOficio = edit && car.carpetaConOficio;
  const tieneIVA         = edit && car.tieneIVA;

  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar vehículo' : 'Agregar vehículo al stock'}</div>
    <form onsubmit="${edit ? 'saveEditCar(event)' : 'addCar(event)'}">
      <div class="hint-box">
        <div class="hint-label">Datos del vehículo</div>
        <div class="fg3">
          <div class="fg"><label>Marca *</label><input type="text" name="brand" placeholder="Ford" value="${edit ? esc(car.brand) : ''}" required list="ml2"><datalist id="ml2">${MARCAS.map(m => `<option value="${m}">`).join('')}</datalist></div>
          <div class="fg"><label>Modelo *</label><input type="text" name="model" placeholder="Ranger" value="${edit ? esc(car.model) : ''}" required></div>
          <div class="fg"><label>Versión</label><input type="text" name="version" placeholder="XL 4x2 T/M" value="${edit && car.version ? esc(car.version) : ''}"></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Patente</label><input type="text" name="patente" placeholder="AA123BB" value="${edit && car.patente ? esc(car.patente) : ''}" style="text-transform:uppercase"></div>
          <div class="fg"><label>Año *</label><input type="number" name="year" placeholder="2022" min="1990" max="2030" value="${edit ? car.year : ''}" required></div>
          <div class="fg">
            <label>Kilometraje</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input id="kmInput" type="text" inputmode="numeric" name="km" placeholder="45.000"
                value="${kmVal}" ${esZeroKm ? 'disabled' : ''} style="flex:1"
                oninput="fmtNum(this);const w=document.getElementById('duenioWrap');if(w)w.style.display=(this.value===''||this.value==='0')?'none':'block'">
              <button type="button" class="btn sm" data-zero="${esZeroKm ? 'true' : 'false'}" onclick="toggleZeroKm(this)"
                style="${esZeroKm ? 'background:var(--green);color:#fff;border-color:var(--green)' : ''}">${esZeroKm ? '✓ 0 km' : '0 km'}</button>
            </div>
          </div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tipo *</label>
            <select name="tipo" required><option value="">— seleccioná —</option>${TIPOS.map(t => `<option value="${t}"${edit && car.tipo === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
          </div>
          <div class="fg"><label>Transmisión *</label>
            <select name="trans" required>
              <option value="">— seleccioná —</option>
              <option value="manual"${edit && car.trans === 'manual' ? ' selected' : ''}>Manual</option>
              <option value="automático"${edit && car.trans === 'automático' ? ' selected' : ''}>Automático</option>
            </select>
          </div>
          <div class="fg"><label>Color</label><input type="text" name="color" placeholder="Blanco" value="${edit && car.color ? esc(car.color) : ''}"></div>
        </div>
        ${edit ? rAuditoriaAuto(car) : ''}
      </div>

      <div class="hint-box">
        <div class="hint-label">Fotos</div>
        <div style="font-size:12px;color:var(--text-3)">La carga de fotos no está disponible en esta demo.</div>
      </div>

      <div class="hint-box">
        <div class="hint-label">Precios</div>
        <div class="fg3">
          <div class="fg">
            <label>Precio contado / efectivo</label>
            <div style="display:flex;gap:6px">
              <select name="monedaContado" style="width:85px;flex-shrink:0">${MONEDAS.map(m => `<option value="${m}"${edit && car.monedaContado === m ? ' selected' : ''}>${m}</option>`).join('')}</select>
              <input type="text" inputmode="numeric" name="precioContado" placeholder="0" oninput="fmtNum(this)" value="${edit && car.precioContado ? Number(car.precioContado).toLocaleString('es-AR') : ''}" style="flex:1">
            </div>
          </div>
          <div class="fg">
            <label>Precio canje / crédito</label>
            <div style="display:flex;gap:6px">
              <select name="monedaCanje" style="width:85px;flex-shrink:0">${MONEDAS.map(m => `<option value="${m}"${edit && car.monedaCanje === m ? ' selected' : ''}>${m}</option>`).join('')}</select>
              <input type="text" inputmode="numeric" name="precioCanje" placeholder="0" oninput="fmtNum(this)" value="${edit && car.precioCanje ? Number(car.precioCanje).toLocaleString('es-AR') : ''}" style="flex:1">
            </div>
          </div>
        </div>
      </div>

      <div class="hint-box" id="duenioWrap" style="display:${showDuenio ? 'block' : 'none'}">
        <div class="hint-label">Dueño anterior</div>
        <div class="fg3">
          <div class="fg"><label>Nombre</label><input type="text" name="duenioNombre" placeholder="Carlos" value="${edit && car.duenioNombre ? esc(car.duenioNombre) : ''}"></div>
          <div class="fg"><label>Apellido</label><input type="text" name="duenioApellido" placeholder="García" value="${edit && car.duenioApellido ? esc(car.duenioApellido) : ''}"></div>
          <div class="fg"><label>Contacto</label><input type="tel" name="duenioContacto" placeholder="351 000-0000" value="${edit && car.duenioContacto ? esc(car.duenioContacto) : ''}"></div>
        </div>
      </div>

      <input type="hidden" name="itv" value="${edit && car.itv ? car.itv : 'si'}">
      <input type="hidden" name="itvVenc" value="${edit && car.itvVenc ? car.itvVenc : ''}">

      <div class="hint-box">
        <div class="hint-label">Comercialización</div>
        <div style="margin-bottom:12px">
          <label style="display:block;margin-bottom:6px">Origen</label>
          <div style="display:flex;gap:8px">
            <label style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);cursor:pointer;font-weight:normal">
              <input type="radio" name="origen" value="propio" style="width:auto;margin:0" ${origenVal === 'propio' ? 'checked' : ''}> Propio
            </label>
            <label style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);cursor:pointer;font-weight:normal">
              <input type="radio" name="origen" value="reventa" style="width:auto;margin:0" ${origenVal === 'reventa' ? 'checked' : ''}> Reventa
            </label>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <input type="checkbox" name="consignacion" id="consignacionChk" style="width:auto;margin:0" ${esConsignacion ? 'checked' : ''} onchange="toggleConsignacion(this)">
            <label for="consignacionChk" style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);margin:0;cursor:pointer">Consignación</label>
          </div>
          <div id="tipoConsignacionWrap" style="display:${esConsignacion ? 'flex' : 'none'};gap:8px;margin-left:24px">
            <label style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);cursor:pointer;font-weight:normal">
              <input type="radio" name="tipoConsignacion" value="fisica" style="width:auto;margin:0" ${tipoConsig === 'fisica' || tipoConsig === '' ? 'checked' : ''}> Física
            </label>
            <label style="display:flex;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);cursor:pointer;font-weight:normal">
              <input type="radio" name="tipoConsignacion" value="digital" style="width:auto;margin:0" ${tipoConsig === 'digital' ? 'checked' : ''}> Digital
            </label>
          </div>
          <input type="hidden" name="tipoConsignacion" value="${tipoConsig}" id="tipoConsignacionHidden">
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
          <input type="checkbox" name="tieneIVA" id="tieneIVAChk" style="width:auto;margin:0" ${tieneIVA ? 'checked' : ''}>
          <label for="tieneIVAChk" style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);margin:0;cursor:pointer">Tiene IVA</label>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">Documentación</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" name="carpetaCompleta" id="carpetaCompletaChk" style="width:auto;margin:0" ${carpetaCompleta ? 'checked' : ''}>
            <label for="carpetaCompletaChk" style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);margin:0;cursor:pointer">Carpeta completa</label>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" name="carpetaConOficio" id="carpetaConOficioChk" style="width:auto;margin:0" ${carpetaConOficio ? 'checked' : ''}>
            <label for="carpetaConOficioChk" style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);margin:0;cursor:pointer">Carpeta completa con oficio</label>
          </div>
        </div>
      </div>

      <div class="fg"><label>Nota interna</label>
        <textarea name="nota" placeholder="Historial, observaciones, detalles importantes...">${edit && car.nota ? esc(car.nota) : ''}</textarea>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditCar()' : 'addCarOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Guardar vehículo'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Match banner ── */
function rMatchBanner() {
  if (!lastMatches) return '';
  return `
  <div class="match-banner">
    <div class="match-banner-title">
      <span>${lastMatches.length > 0 ? `${lastMatches.length} cliente${lastMatches.length > 1 ? 's' : ''} que podrían interesarse` : 'Vehículo guardado — sin matches todavía'}</span>
      <button class="btn sm" onclick="lastMatches=null;render()" style="background:transparent;color:var(--text-3)">×</button>
    </div>
    ${lastMatches.map(c => `
    <div class="row" style="padding:8px 0;border-top:1px solid rgba(76,175,125,0.15)">
      ${rAv(c.name, false, true)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
        <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
      </div>
      ${rScoreRow(c.sc)}
      ${whatsappBtn(c.phone, c.name, true)}
    </div>`).join('')}
  </div>`;
}

/* ── Buscador ── */
function _carSearchUpdate(val) {
  carSearch = val;
  const clearBtn = document.getElementById('car-search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
  _renderCarCards();
}

function _carSearchClear() {
  carSearch = '';
  const inp = document.getElementById('car-search-input');
  if (inp) { inp.value = ''; inp.focus(); }
  const clearBtn = document.getElementById('car-search-clear');
  if (clearBtn) clearBtn.classList.remove('visible');
  _renderCarCards();
}

function _carMatch(car) {
  if (!carSearch) return true;
  const q = carSearch.toLowerCase();
  return (
    (car.brand   || '').toLowerCase().includes(q) ||
    (car.model   || '').toLowerCase().includes(q) ||
    (car.version || '').toLowerCase().includes(q) ||
    (car.patente || '').toLowerCase().includes(q) ||
    (car.color   || '').toLowerCase().includes(q) ||
    String(car.year || '').includes(q)
  );
}

/* ── Render principal ── */
function render() {
  _inyectarEstilosBuscadorAutos();

  let html = `
  <div class="section-head">
    <div class="section-title">Stock de vehículos</div>
    <button class="btn primary" onclick="addCarOpen=true;editCarId=null;lastMatches=null;fotosNuevasSeleccionadas=[];fotosExistentesEdit=[];render()">+ Agregar vehículo</button>
  </div>
  ${addCarOpen  ? rCarForm() : ''}
  ${editCarId   ? rCarForm(S.cars.find(c => c.id === editCarId)) : ''}
  ${rMatchBanner()}`;

  if (S.cars.length > 0) {
    html += `
  <div class="car-search-wrap">
    <span class="car-search-icon"></span>
    <input
      id="car-search-input"
      class="car-search-input"
      type="text"
      placeholder="Buscar por marca, modelo, patente, color…"
      value="${esc(carSearch)}"
      oninput="_carSearchUpdate(this.value)"
      autocomplete="off"
    >
    <button id="car-search-clear" class="car-search-clear${carSearch ? ' visible' : ''}" onclick="_carSearchClear()" title="Limpiar búsqueda">×</button>
  </div>`;
  }

  html += `<div id="car-cards-wrap"></div>`;

  if (S.cars.length === 0 && !addCarOpen) {
    html += `
  <div class="empty">
    <div class="empty-icon">◻</div>
    <strong>El stock está vacío</strong>
    <div style="font-size:13px;margin-top:4px">Agregá un vehículo y verás qué clientes pueden estar interesados.</div>
  </div>`;
  }

  document.getElementById('view').innerHTML = html;
  _renderCarCards();
  _renderPreviewFotos();
}

/* ── Render de tarjetas ── */
function _renderCarCards() {
  const wrap = document.getElementById('car-cards-wrap');
  if (!wrap) return;

  const avail    = S.cars.filter(c => c.status === 'disponible');
  const reserv   = S.cars.filter(c => c.status === 'reservado');
  const vendidos = S.cars.filter(c => c.status === 'vendido');
  const others   = [...reserv, ...vendidos];

  const availFiltered = avail.filter(_carMatch);

  let html = '';

  if (carSearch && availFiltered.length === 0 && avail.length > 0) {
    html += `
    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-3)">
      <div style="font-size:2rem;margin-bottom:.5rem">🔍</div>
      <div style="font-size:14px">No se encontraron vehículos con "<strong style="color:var(--text-2)">${esc(carSearch)}</strong>"</div>
    </div>`;
  }

  availFiltered.forEach(car => {
    if (editCarId === car.id) return;
    const ms          = matchesForCar(car);
    const hasPeritaje = car.peritaje && Object.keys(car.peritaje).length > 0;
    const itvVencida  = car.itv === 'no' && car.itvVenc;
    const daysITV     = itvVencida ? Math.ceil((new Date(car.itvVenc) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const esZeroKm    = car.km === 0;

    const precioNum = carPrice(car);
    const precioDisplay = car.precioContado
      ? `${car.monedaContado || 'ARS'} ${Number(car.precioContado).toLocaleString('es-AR')}`
      : car.precioCanje
        ? `${car.monedaCanje || 'ARS'} ${Number(car.precioCanje).toLocaleString('es-AR')} (canje)`
        : precioNum ? fp(precioNum) : null;

    const badgeOrigen = car.origen === 'reventa'
      ? '<span class="badge bg-orange">Reventa</span>'
      : '<span class="badge bg-gray">Propio</span>';
    const badgeConsig = car.consignacion
      ? `<span class="badge bg-blue">Consig. ${car.tipoConsignacion === 'digital' ? 'Digital' : 'Física'}</span>` : '';
    const badgeIVA     = car.tieneIVA ? '<span class="badge bg-blue">IVA</span>' : '';
    const badgeCarpeta = car.carpetaConOficio
      ? '<span class="badge bg-green">Carpeta c/ oficio ✓</span>'
      : car.carpetaCompleta ? '<span class="badge bg-green">Carpeta completa ✓</span>' : '';

    const expandido = !!clientesExpandidos[car.id];

    /* ── Botón Ver peritaje ── */
    const btnPeritaje = hasPeritaje
      ? `<a href="peritaje.html?id=${car.id}" class="btn sm" style="color:var(--gold);border-color:var(--gold-border)">📋 Ver peritaje</a>`
      : `<a href="peritaje.html?id=${car.id}&modo=editar" class="btn sm">📋 Peritajar</a>`;

    const fotosStrip = Array.isArray(car.fotos) && car.fotos.length
      ? `<div class="car-thumb-strip">${car.fotos.map(u => `<img src="${esc(u)}" alt="">`).join('')}</div>`
      : '';

    html += `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:${ms.length ? '10px' : '0'}">
        <div>
          <div style="font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${esc(car.brand)} ${esc(car.model)}
            ${car.version ? `<span style="font-size:13px;font-weight:400;color:var(--text-3)">${esc(car.version)}</span>` : ''}
            ${car.patente ? `<span style="font-size:11px;background:var(--surface-3);color:var(--text-2);padding:2px 8px;border-radius:4px;border:1px solid var(--border);letter-spacing:.08em">${esc(car.patente)}</span>` : ''}
            ${esZeroKm ? '<span class="badge bg-blue">0 km</span>' : ''}
            ${itvVencida ? `<span class="badge ${daysITV !== null && daysITV <= 0 ? 'bg-red' : 'bg-orange'}">ITV ${daysITV !== null && daysITV <= 0 ? 'VENCIDA' : `vence en ${daysITV}d`}</span>` : ''}
            ${badgeCarpeta}${badgeOrigen}${badgeConsig}${badgeIVA}
          </div>
          <div style="font-size:13px;color:var(--text-2);margin-top:3px">
            ${car.year} · ${car.tipo} · ${car.trans}
            ${!esZeroKm && car.km ? ' · ' + fk(car.km) : ''}
            ${car.color ? ' · ' + esc(car.color) : ''}
          </div>
          <div style="font-size:12px;margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            ${car.precioContado ? `<span style="color:var(--green)">Contado: ${car.monedaContado || 'ARS'} ${Number(car.precioContado).toLocaleString('es-AR')}</span>` : ''}
            ${car.precioCanje   ? `<span style="color:var(--blue)">Canje: ${car.monedaCanje || 'ARS'} ${Number(car.precioCanje).toLocaleString('es-AR')}</span>` : ''}
            ${!car.precioContado && !car.precioCanje ? '<span style="color:var(--text-3);font-style:italic;font-size:11px">Sin precio cargado</span>' : ''}
          </div>
          ${!esZeroKm && car.duenioNombre ? `<div style="font-size:11px;color:var(--text-3);margin-top:3px">Dueño ant.: ${esc(car.duenioNombre)} ${esc(car.duenioApellido)}${car.duenioContacto ? ' · ' + esc(car.duenioContacto) : ''}</div>` : ''}
          ${car.nota ? `<div style="font-size:12px;color:var(--text-2);font-style:italic;margin-top:3px">"${esc(car.nota)}"</div>` : ''}
          ${rAuditoriaAuto(car)}
          ${fotosStrip}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${ms.length > 0 ? `<span class="badge bg-green" style="margin-top:4px">${ms.length} match${ms.length > 1 ? 'es' : ''}</span>` : `<span class="badge bg-gray" style="margin-top:4px">Sin matches</span>`}
          ${precioDisplay ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">${precioDisplay}</div>` : ''}
        </div>
      </div>

      ${ms.length > 0 ? `
      <div class="sep" style="padding-top:8px;margin-top:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:12px;color:var(--text-3)">Clientes interesados:</div>
          <button id="clientes-btn-${car.id}" class="clientes-toggle-btn" onclick="toggleClientesInteresados('${car.id}')">${expandido ? 'Ver menos ▲' : 'Ver más ▼'}</button>
        </div>
        <div id="clientes-wrap-${car.id}" style="display:${expandido ? 'block' : 'none'}">
          ${ms.map(c => `
          <div class="row" style="padding:7px 0;border-bottom:1px solid var(--border)">
            ${rAv(c.name)}
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
              <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
            </div>
            ${rScoreRow(c.sc)}
            <button class="btn sm" onclick="showMatchDetailByIdx(${_reg(c.id, car.id)})" style="border-color:var(--gold-border);color:var(--gold)">Ver match</button>
            ${whatsappBtn(c.phone, c.name, true)}
          </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="sep" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        ${btnPeritaje}
        <a href="gestoria.html?carid=${car.id}" class="btn sm" style="color:var(--blue);border-color:var(--blue)">📁 Gestoría</a>
        ${itvVencida ? `<button class="btn sm" style="border-color:var(--gold-border);color:var(--gold)" onclick="solicitarTurnoITV('${car.id}')">📅 Turno ITV</button>` : ''}
        <button class="btn sm" onclick="editCar('${car.id}')">Editar</button>
        <button class="btn sm" onclick="setCarStatus('${car.id}','reservado')">Reservar</button>
        <button class="btn sm success" onclick="setCarStatus('${car.id}','vendido')">Vendido</button>
        <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
      </div>
    </div>`;
  });

  if (others.length > 0 && !carSearch) {
    html += `
    <details style="margin-top:1.25rem">
      <summary style="cursor:pointer;font-size:13px;color:var(--text-2);padding:4px 0">
        Historial — Reservados (${reserv.length}) / Vendidos (${vendidos.length})
      </summary>
      <div style="margin-top:10px">`;

    others.forEach(car => {
      if (editCarId === car.id) return;
      const esVendido = car.status === 'vendido';
      const comprador = esVendido && car.ventaClienteId ? S.clients.find(c => c.id === car.ventaClienteId) : null;

      html += `
      <div class="card" style="opacity:${esVendido ? '.75' : '.6'};${esVendido ? 'border-left:3px solid var(--green)' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:500;color:var(--text)">${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3)">${car.year}</span></div>
            ${car.patente ? `<div style="font-size:11px;color:var(--text-3);margin-top:1px">Patente: ${esc(car.patente)}</div>` : ''}
            ${car.km === 0 ? '<span class="badge bg-blue" style="margin-top:4px">0 km</span>' : ''}
            ${esVendido && car.fechaVenta ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Vendido el ${car.fechaVenta}</div>` : ''}
            ${comprador ? `
            <div style="margin-top:6px;padding:5px 9px;background:rgba(76,175,125,.08);border:1px solid rgba(76,175,125,.2);border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px">
              <span>🧑</span>
              <span style="color:var(--text-2);font-weight:500">${esc(comprador.name)}</span>
              <span style="color:var(--text-3)">${esc(comprador.phone)}</span>
            </div>` : ''}
            ${rAuditoriaAuto(car)}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="badge ${esVendido ? 'bg-green' : 'bg-orange'}">${esVendido ? '✓ Vendido' : 'Reservado'}</span>
            <button class="btn sm" onclick="setCarStatus('${car.id}','disponible')">Disponible</button>
            <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
          </div>
        </div>
      </div>`;
    });

    html += `</div></details>`;
  }

  wrap.innerHTML = html;
}

/* ── Boot ── */
bootApp('vehiculos');
render();