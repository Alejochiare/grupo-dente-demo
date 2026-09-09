/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/tareas.js
   VERSIÓN CON ASIGNACIÓN DE USUARIOS + BUSCADOR DE CLIENTE + VER TAREA
   ═══════════════════════════════════════════════════════════════ */

let addTareaOpen = false;
let editTareaId  = null;
let verTareaId   = null;   // ← NUEVO: id de la tarea que se está viendo en el modal
let tareasSort   = 'proximas';
let _tareas      = [];

function diffDays(isoDate) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(isoDate + 'T00:00:00') - hoy) / (1000 * 60 * 60 * 24));
}
function labelFecha(isoDate) {
  const d = diffDays(isoDate);
  if (d < 0)   return `Venció hace ${Math.abs(d)} día${Math.abs(d) > 1 ? 's' : ''}`;
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
}
function urgencia(isoDate, done) {
  if (done) return 'done';
  const d = diffDays(isoDate);
  if (d < 0)   return 'vencida';
  if (d === 0) return 'hoy';
  return 'proxima';
}
function checkTareasVencidas(tareas) {
  const v = tareas.filter(t => !t.done && diffDays(t.fecha) < 0);
  if (v.length > 0) toast(`⚠️ Tenés ${v.length} tarea${v.length > 1 ? 's' : ''} vencida${v.length > 1 ? 's' : ''}`, 'error');
}

/* ════════════════════════════════════════
   BUSCADOR DE CLIENTE
   ════════════════════════════════════════ */
function initClienteBuscador(formId, clienteIdActual) {
  const form      = document.getElementById(formId);
  if (!form) return;
  const input     = form.querySelector('.cliente-search-input');
  const dropdown  = form.querySelector('.cliente-search-dropdown');
  const hidden    = form.querySelector('input[name="clienteId"]');
  const clearBtn  = form.querySelector('.cliente-search-clear');
  if (!input || !dropdown || !hidden) return;

  const todosClientes = S.clients;

  /* Si hay cliente preseleccionado (edición o prefill desde clientes), mostrarlo */
  if (clienteIdActual) {
    const c = todosClientes.find(x => x.id === clienteIdActual);
    if (c) {
      input.value  = `${c.name} · ${c.phone}`;
      hidden.value = c.id;
      if (clearBtn) clearBtn.style.display = 'inline-block';
    }
  }

  function filtrar(q) {
    const txt = q.toLowerCase().trim();
    return txt.length === 0
      ? []
      : todosClientes.filter(c =>
          c.name.toLowerCase().includes(txt) ||
          (c.phone && c.phone.includes(txt))
        ).slice(0, 10);
  }

  function mostrarDropdown(resultados) {
    if (resultados.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    dropdown.innerHTML = resultados.map(c => `
      <div class="cliente-search-item" data-id="${c.id}" data-name="${esc(c.name)}" data-phone="${esc(c.phone||'')}">
        <span style="font-weight:500">${esc(c.name)}</span>
        <span style="font-size:11px;color:var(--text-3);margin-left:6px">${c.phone || ''}</span>
        ${c.status !== 'activo' ? `<span class="badge bg-gray" style="font-size:9px;margin-left:4px">inactivo</span>` : ''}
      </div>`).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.cliente-search-item').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const id    = item.dataset.id;
        const name  = item.dataset.name;
        const phone = item.dataset.phone;
        hidden.value = id;
        input.value  = `${name} · ${phone}`;
        dropdown.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'inline-block';
      });
    });
  }

  input.addEventListener('input', () => {
    hidden.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    mostrarDropdown(filtrar(input.value));
  });

  input.addEventListener('focus', () => {
    if (input.value && !hidden.value) mostrarDropdown(filtrar(input.value));
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    if (!hidden.value) input.value = '';
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      hidden.value  = '';
      input.value   = '';
      clearBtn.style.display = 'none';
      input.focus();
    });
  }
}

/* ════════════════════════════════════════
   CRUD
   ════════════════════════════════════════ */
async function addTarea(e) {
  e.preventDefault();
  const f       = e.target;
  const clienteId = f.clienteId.value;
  const cliente   = clienteId ? S.clients.find(c => c.id === clienteId) : null;
  const data = {
    titulo:        f.titulo.value.trim(),
    descripcion:   f.descripcion.value.trim(),
    fecha:         f.fecha.value,
    clienteId:     cliente?.id    || null,
    clienteNombre: cliente?.name  || null,
    clientePhone:  cliente?.phone || null,
    asignadoA:     f.asignadoA ? f.asignadoA.value : null,
  };
  try {
    const res = await CRM.addTarea(data);
    data.id         = res.id;
    data.done       = false;
    data.creado_por = getSession()?.nombre || '';
    data.asignado_a = data.asignadoA;
    _tareas.unshift(data);
    addTareaOpen = false;
    const paraOtro = data.asignadoA && data.asignadoA !== data.creado_por;
    toast(paraOtro ? `Tarea asignada a ${data.asignadoA} ✓` : 'Tarea creada ✓', 'success');
    render();
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function saveEditTarea(e) {
  e.preventDefault();
  const f       = e.target;
  const clienteId = f.clienteId.value;
  const cliente   = clienteId ? S.clients.find(c => c.id === clienteId) : null;
  const tarea     = _tareas.find(t => t.id === editTareaId);
  if (!tarea) return;
  const data = {
    id:            editTareaId,
    titulo:        f.titulo.value.trim(),
    descripcion:   f.descripcion.value.trim(),
    fecha:         f.fecha.value,
    clienteId:     cliente?.id    || null,
    clienteNombre: cliente?.name  || null,
    clientePhone:  cliente?.phone || null,
    asignadoA:     f.asignadoA ? f.asignadoA.value : (tarea.asignado_a || null),
    done:          tarea.done,
  };
  try {
    await CRM.addTarea(data);
    Object.assign(tarea, data, { asignado_a: data.asignadoA });
    editTareaId = null;
    render();
    toast('Tarea actualizada', 'success');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function marcarTarea(id, done) {
  const t = _tareas.find(x => x.id === id);
  if (!t) return;
  try {
    await CRM.toggleTarea(id, done ? 1 : 0);
    t.done = done;
    render();
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

function editTarea(id)     { editTareaId = id; addTareaOpen = false; verTareaId = null; render(); }
function cancelEditTarea() { editTareaId = null; render(); }

/* ── NUEVO: abrir / cerrar modal de "Ver tarea" ── */
function verTarea(id)     { verTareaId = id; render(); }
function cerrarVerTarea() { verTareaId = null; render(); }

async function delTarea(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  try {
    await CRM.delTarea(id);
    _tareas = _tareas.filter(t => t.id !== id);
    if (verTareaId === id) verTareaId = null;
    render();
    toast('Tarea eliminada', '');
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

async function crearTareaITV(carId) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  const yaExiste = _tareas.some(t => !t.done && t.origen_itv === carId);
  if (yaExiste) { toast('Ya existe una tarea ITV activa para este vehículo', 'error'); return; }
  const nombreAuto = `${car.brand} ${car.model} ${car.year}${car.patente ? ' [' + car.patente + ']' : ''}`;
  const data = {
    titulo:        `⚠️ ITV pendiente — ${nombreAuto}`,
    descripcion:   car.itvVenc ? `La ITV vence el ${car.itvVenc}. Gestionar renovación.` : `ITV vencida o sin fecha. Verificar estado.`,
    fecha:         car.itvVenc || todayISO(),
    clienteId:     null, clienteNombre: null,
    clientePhone:  car.duenioContacto || null,
    origenITV:     carId,
    origenLabel:   nombreAuto,
    asignadoA:     getSession()?.nombre || null,
  };
  try {
    const res = await CRM.addTarea(data);
    data.id = res.id; data.done = false;
    _tareas.unshift(data);
    toast(`Tarea ITV creada ✓`, 'success');
    render();
  } catch(err) { toast('Error: ' + err.message, 'error'); }
}

/* ════════════════════════════════════════
   FORMULARIO
   ════════════════════════════════════════ */
function rTareaForm(tarea) {
  const edit       = !!tarea;
  const formId     = edit ? 'form-edit-tarea' : 'form-add-tarea';
  const miNombre   = getSession()?.nombre || '';
  const usuarios   = window._usuariosCRM || [];
  const asigActual = edit ? (tarea.asignado_a || tarea.asignadoA || miNombre) : miNombre;

  const optsUsuarios = usuarios.map(u =>
    `<option value="${esc(u.nombre)}"${u.nombre === asigActual ? ' selected' : ''}>${esc(u.nombre)}${u.nombre === miNombre ? ' (yo)' : ''}</option>`
  ).join('');

  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar tarea' : 'Nueva tarea'}</div>
    <form id="${formId}" onsubmit="${edit ? 'saveEditTarea(event)' : 'addTarea(event)'}">

      <div class="hint-box">
        <div class="hint-label">Datos de la tarea</div>
        <div class="fg2">
          <div class="fg" style="flex:2">
            <label>Título *</label>
            <input type="text" name="titulo" placeholder="Ej: Llamar a cliente, enviar presupuesto..."
              value="${edit ? esc(tarea.titulo) : ''}" required>
          </div>
          <div class="fg">
            <label>Fecha *</label>
            <input type="date" name="fecha" value="${edit ? tarea.fecha : todayISO()}" required>
          </div>
        </div>
        <div class="fg">
          <label>Descripción / detalles</label>
          <textarea name="descripcion" placeholder="Información adicional sobre la tarea...">${edit && tarea.descripcion ? esc(tarea.descripcion) : ''}</textarea>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">Cliente asociado (opcional)</div>
        <div class="fg">
          <label>Buscar cliente</label>
          <div style="position:relative">
            <div style="display:flex;gap:6px;align-items:center">
              <input
                type="text"
                class="cliente-search-input"
                placeholder="Escribí nombre o teléfono..."
                autocomplete="off"
                style="flex:1"
              >
              <button
                type="button"
                class="btn sm danger cliente-search-clear"
                style="display:none;flex-shrink:0"
                title="Quitar cliente">×</button>
            </div>
            <input type="hidden" name="clienteId">
            <div class="cliente-search-dropdown" style="
              display:none;
              position:absolute;
              top:100%;
              left:0;right:0;
              background:var(--surface);
              border:1px solid var(--border);
              border-radius:var(--radius);
              box-shadow:0 4px 16px rgba(0,0,0,0.3);
              z-index:100;
              max-height:220px;
              overflow-y:auto;
              margin-top:2px;
            "></div>
          </div>
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">
            Escribí al menos 1 letra para buscar. Dejá vacío si no aplica.
          </div>
        </div>
      </div>

      ${optsUsuarios ? `
      <div class="hint-box">
        <div class="hint-label">Asignación</div>
        <div class="fg">
          <label>Asignar a</label>
          <select name="asignadoA">${optsUsuarios}</select>
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">Podés asignarla a otro integrante o dejarla para vos.</div>
        </div>
      </div>` : ''}

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditTarea()' : 'addTareaOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Crear tarea'}</button>
      </div>
    </form>
  </div>`;
}

/* Inicializa el buscador después de que el HTML se inserta en el DOM */
function initFormBuscador(edit, tareaClienteId) {
  const formId = edit ? 'form-edit-tarea' : 'form-add-tarea';
  initClienteBuscador(formId, tareaClienteId || null);
}

/* ════════════════════════════════════════
   MODAL "VER TAREA" — muestra toda la info completa
   ════════════════════════════════════════ */
function rTareaModal(t) {
  if (!t) return '';
  const urg   = urgencia(t.fecha, t.done);
  const label = labelFecha(t.fecha);
  const colores = {
    vencida: { badge: 'bg-red',   icon: '🔴', texto: 'Vencida' },
    hoy:     { badge: 'bg-gold',  icon: '🟡', texto: 'Para hoy' },
    proxima: { badge: 'bg-green', icon: '🟢', texto: 'Próxima' },
    done:    { badge: 'bg-gray',  icon: '✓',  texto: 'Completada' },
  };
  const c = colores[urg] || colores.proxima;
  const creadoPor = t.creado_por || t.creadoPor || '—';
  const asignadoA = t.asignado_a || t.asignadoA || '—';

  return `
  <div class="modal-backdrop" onmousedown="if(event.target===this) cerrarVerTarea()" style="
    position:fixed;inset:0;background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    z-index:1000;padding:16px;">
    <div class="card" style="max-width:520px;width:100%;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
        <div>
          <span class="badge ${c.badge}">${c.icon} ${c.texto}</span>
          <div style="font-weight:700;font-size:17px;margin-top:8px${t.done ? ';text-decoration:line-through;opacity:.6' : ''}">${esc(t.titulo)}</div>
        </div>
        <button class="btn sm" onclick="cerrarVerTarea()" title="Cerrar">×</button>
      </div>

      <div class="sep" style="display:flex;flex-direction:column;gap:10px">

        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Fecha</div>
          <div style="font-size:14px;margin-top:2px">📅 <strong>${label}</strong> <span style="color:var(--text-3)">(${t.fecha})</span></div>
        </div>

        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Creada por</div>
          <div style="font-size:14px;margin-top:2px">${esc(creadoPor)}</div>
        </div>

        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Asignada a</div>
          <div style="font-size:14px;margin-top:2px">${esc(asignadoA)}</div>
        </div>

        ${t.descripcion ? `
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Descripción</div>
          <div style="font-size:14px;margin-top:2px;white-space:pre-wrap">${esc(t.descripcion)}</div>
        </div>` : ''}

        ${t.clienteNombre ? `
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Cliente asociado</div>
          <div style="font-size:14px;margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            👤 <strong>${esc(t.clienteNombre)}</strong>
            ${t.clientePhone ? `<span style="color:var(--text-3)">${esc(t.clientePhone)}</span>` : ''}
          </div>
        </div>` : `
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Cliente asociado</div>
          <div style="font-size:14px;margin-top:2px;color:var(--text-3)">Sin cliente asociado</div>
        </div>`}

        ${(t.origen_itv || t.origenITV) ? `
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Origen</div>
          <div style="font-size:14px;margin-top:2px">🚗 <strong>${esc(t.origen_label || t.origenLabel || 'Vehículo')}</strong> (ITV)</div>
        </div>` : ''}

      </div>

      <div class="sep" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${t.clientePhone ? whatsappBtn(t.clientePhone, t.clienteNombre || '', true) : ''}
        ${!t.done
          ? `<button class="btn sm success" onclick="marcarTarea('${t.id}',true)">✓ Completar</button>`
          : `<button class="btn sm" onclick="marcarTarea('${t.id}',false)">Reabrir</button>`}
        ${!t.done ? `<button class="btn sm" onclick="editTarea('${t.id}')">Editar</button>` : ''}
        <button class="btn sm danger" onclick="delTarea('${t.id}')">Eliminar</button>
        <button class="btn sm" onclick="cerrarVerTarea()">Cerrar</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   ITEM de tarea
   ════════════════════════════════════════ */
function rTareaItem(t) {
  const urg   = urgencia(t.fecha, t.done);
  const label = labelFecha(t.fecha);
  const colores = {
    vencida: { border: 'var(--red)',    badge: 'bg-red',   icon: '🔴' },
    hoy:     { border: 'var(--gold)',   badge: 'bg-gold',  icon: '🟡' },
    proxima: { border: 'var(--green)',  badge: 'bg-green', icon: '🟢' },
    done:    { border: 'var(--border)', badge: 'bg-gray',  icon: '✓'  },
  };
  const c = colores[urg] || colores.proxima;
  const miNombre  = getSession()?.nombre || '';
  const creadoPor = t.creado_por || t.creadoPor || '';
  const asignadoA = t.asignado_a || t.asignadoA || '';
  let asigHtml = '';
  if (asignadoA && asignadoA !== creadoPor) {
    asigHtml = asignadoA === miNombre
      ? ` · <span style="color:var(--gold);font-weight:600">📨 Asignada por ${esc(creadoPor)}</span>`
      : ` · <span style="color:var(--gold)">Para <strong>${esc(asignadoA)}</strong></span>`;
  }
  return `
  <div class="card" style="${urg !== 'done' ? `border-left:3px solid ${c.border};` : 'opacity:.6'}">
    <div class="row" style="align-items:start;gap:10px">
      <div style="font-size:18px;line-height:1;padding-top:2px">${c.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:6px">
          <div>
            <div style="font-weight:600;font-size:15px${t.done ? ';text-decoration:line-through;opacity:.5' : ''}">${esc(t.titulo)}</div>
            <div style="font-size:12px;color:var(--text-2);margin-top:2px">
              📅 <strong>${label}</strong>
              · Por <strong>${esc(creadoPor)}</strong>${asigHtml}
              ${t.clienteNombre ? `· 👤 <strong>${esc(t.clienteNombre)}</strong>` : ''}
              ${t.origen_itv    ? `· 🚗 <strong>${esc(t.origen_label || 'Vehículo')}</strong>` : ''}
            </div>
            ${t.descripcion ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px;font-style:italic">"${esc(t.descripcion)}"</div>` : ''}
          </div>
          <span class="badge ${c.badge}" style="flex-shrink:0">${label}</span>
        </div>
      </div>
    </div>
    <div class="sep" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
      ${t.clientePhone ? whatsappBtn(t.clientePhone, t.clienteNombre || '', true) : ''}
      ${!t.done
        ? `<button class="btn sm success" onclick="marcarTarea('${t.id}',true)">✓ Completar</button>`
        : `<button class="btn sm" onclick="marcarTarea('${t.id}',false)">Reabrir</button>`}
      <button class="btn sm" onclick="verTarea('${t.id}')">👁 Ver tarea</button>
      ${!t.done ? `<button class="btn sm" onclick="editTarea('${t.id}')">Editar</button>` : ''}
      <button class="btn sm danger" onclick="delTarea('${t.id}')">×</button>
    </div>
  </div>`;
}

function rGrupo(titulo, items) {
  if (items.length === 0) return '';
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">
      ${titulo} (${items.length})
    </div>
    ${items.map(t => rTareaItem(t)).join('')}
  </div>`;
}

function rResumen(vencidas, hoy, proximas, completadas) {
  let badges = '';
  if (vencidas.length   > 0) badges += `<span class="badge bg-red">🔴 ${vencidas.length} vencida${vencidas.length > 1 ? 's' : ''}</span>`;
  if (hoy.length        > 0) badges += `<span class="badge bg-gold">🟡 ${hoy.length} hoy</span>`;
  if (proximas.length   > 0) badges += `<span class="badge bg-green">🟢 ${proximas.length} próxima${proximas.length > 1 ? 's' : ''}</span>`;
  if (completadas.length > 0) badges += `<span class="badge bg-gray">✓ ${completadas.length} completada${completadas.length > 1 ? 's' : ''}</span>`;
  const miNombre = getSession()?.nombre || '';
  const asignadasAMi = _tareas.filter(t => {
    const asig = t.asignado_a || t.asignadoA || '';
    const crea = t.creado_por || t.creadoPor || '';
    return !t.done && asig === miNombre && crea !== miNombre;
  }).length;
  if (asignadasAMi > 0) badges += `<span class="badge" style="background:rgba(85,130,224,0.18);color:#5582e0;border:1px solid rgba(85,130,224,0.4)">📨 ${asignadasAMi} asignada${asignadasAMi > 1 ? 's' : ''} por otro</span>`;
  if (!badges) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">${badges}</div>`;
}

/* ════════════════════════════════════════
   RENDER PRINCIPAL
   ════════════════════════════════════════ */
function render() {
  const pendientes  = _tareas.filter(t => !t.done);
  const completadas = _tareas.filter(t =>  t.done);
  pendientes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const vencidas = pendientes.filter(t => diffDays(t.fecha) < 0);
  const hoy_arr  = pendientes.filter(t => diffDays(t.fecha) === 0);
  const proximas = pendientes.filter(t => diffDays(t.fecha) > 0);
  completadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  let html = `
  <div class="section-head">
    <div class="section-title">Tareas</div>
    <div style="display:flex;gap:6px">
      <a href="alertas.html" class="btn">🔔 Ver alertas</a>
      <button class="btn primary" onclick="addTareaOpen=true;editTareaId=null;render()">+ Nueva tarea</button>
    </div>
  </div>
  ${addTareaOpen ? rTareaForm() : ''}
  ${editTareaId  ? rTareaForm(_tareas.find(t => t.id === editTareaId)) : ''}
  ${rResumen(vencidas, hoy_arr, proximas, completadas)}
  ${_tareas.length > 0 ? `
  <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-3);margin-bottom:12px;flex-wrap:wrap">
    Ordenar:
    <button class="btn sm${tareasSort === 'proximas'    ? ' active' : ''}" onclick="tareasSort='proximas';render()">📅 Más próximas primero</button>
    <button class="btn sm${tareasSort === 'vencimiento' ? ' active' : ''}" onclick="tareasSort='vencimiento';render()">🔴 Vencidas primero</button>
  </div>` : ''}`;

  if (_tareas.length === 0 && !addTareaOpen) {
    html += `
    <div class="empty">
      <div class="empty-icon">○</div>
      <strong>No hay tareas creadas</strong>
      <div style="font-size:13px;margin-top:4px">Creá tareas para organizar el seguimiento de tus clientes.</div>
    </div>`;
    document.getElementById('view').innerHTML = html;
    return;
  }

  if (pendientes.length === 0 && !addTareaOpen && !editTareaId) {
    html += `
    <div class="empty">
      <div class="empty-icon">✓</div>
      <strong>¡Todo al día!</strong>
      <div style="font-size:13px;margin-top:4px">No hay tareas pendientes.</div>
    </div>`;
  } else if (tareasSort === 'vencimiento') {
    html += rGrupo('🔴 Vencidas', vencidas);
    html += rGrupo('🟡 Hoy',      hoy_arr);
    html += rGrupo('🟢 Próximas', proximas);
  } else {
    html += rGrupo('🟡 Hoy',      hoy_arr);
    html += rGrupo('🟢 Próximas', proximas);
    html += rGrupo('🔴 Vencidas', vencidas);
  }

  if (completadas.length > 0) {
    html += `
    <details style="margin-top:1.25rem">
      <summary style="cursor:pointer;font-size:13px;color:var(--text-2);font-weight:500">
        Completadas (${completadas.length})
      </summary>
      <div style="margin-top:10px">${completadas.map(t => rTareaItem(t)).join('')}</div>
    </details>`;
  }

  /* Modal "Ver tarea" (se dibuja encima de todo gracias a position:fixed) */
  if (verTareaId) {
    html += rTareaModal(_tareas.find(t => t.id === verTareaId));
  }

  document.getElementById('view').innerHTML = html;

  /* Inicializar buscador DESPUÉS de insertar el HTML */
  if (addTareaOpen) {
    initFormBuscador(false, null);
  }
  if (editTareaId) {
    const t = _tareas.find(x => x.id === editTareaId);
    initFormBuscador(true, t?.clienteId || t?.cliente_id || null);
  }
}

/* ════════════════════════════════════════
   PREFILL DE CLIENTE DESDE CLIENTES.JS
   Lee el sessionStorage que dejó "Guardar y crear tarea"
   y pre-selecciona el cliente en el formulario
   ════════════════════════════════════════ */
function _aplicarPrefillCliente() {
  try {
    const raw = sessionStorage.getItem('tareas_prefill_cliente');
    if (!raw) return false;
    sessionStorage.removeItem('tareas_prefill_cliente');
    const prefill = JSON.parse(raw);
    if (!prefill || !prefill.clienteId) return false;

    /* Abrir formulario de nueva tarea */
    addTareaOpen = true;
    render();

    /* Esperar un tick a que el DOM esté listo y pre-seleccionar el cliente */
    setTimeout(() => {
      const form   = document.getElementById('form-add-tarea');
      if (!form) return;
      const hidden = form.querySelector('input[name="clienteId"]');
      const input  = form.querySelector('.cliente-search-input');
      const clear  = form.querySelector('.cliente-search-clear');

      if (hidden && input) {
        hidden.value = prefill.clienteId;
        const nombre = prefill.clienteNombre || '';
        const phone  = prefill.clientePhone  || '';
        input.value  = phone ? `${nombre} · ${phone}` : nombre;
        if (clear) clear.style.display = 'inline-block';

        /* Hacer scroll al formulario para que sea visible */
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);

    return true;
  } catch(e) {
    return false;
  }
}

/* ── Boot ── */
bootApp('tareas').then(async () => {
  try { _tareas = await CRM.getTareas()               || []; } catch(e) { _tareas = []; }
  try { window._usuariosCRM = await CRM.getUsuarios() || []; } catch(e) { window._usuariosCRM = []; }
  checkTareasVencidas(_tareas);

  /* Si venimos desde "Guardar y crear tarea" en clientes, aplicar prefill */
  const tuviPrefill = _aplicarPrefillCliente();
  if (!tuviPrefill) {
    render();
  }
});