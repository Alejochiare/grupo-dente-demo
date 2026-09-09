/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/app.js  (versión demo con Firebase Firestore)
   ═══════════════════════════════════════════════════════════════ */

const TIPOS = ['Sedan','Hatchback','SUV','Pickup','Camioneta','Coupé','Familiar','Utilitario','Moto'];
const MARCAS = ['Fiat','Ford','Chevrolet','Volkswagen','Renault','Toyota','Peugeot','Citroën','Nissan','Honda','Jeep','Dodge','RAM','Hyundai','Kia','Geely','BMW','Audi','Otra'];
const MONEDAS = ['ARS','USD'];
const BUDGET_RANGES = [
  { label:'Hasta $5M',   min:0,        max:5000000  },
  { label:'$5M – $10M',  min:5000000,  max:10000000 },
  { label:'$10M – $15M', min:10000000, max:15000000 },
  { label:'$15M – $20M', min:15000000, max:20000000 },
  { label:'Más de $20M', min:20000000, max:Infinity  },
];
const WEIGHTS = { tipo:25, budget:25, model:30, brand:25, trans:10, year:5, color:3, km:2 };

let S = { clients:[], cars:[], alertas:[], jerarquia:[] };

/* ── Sesión (modo demo: sin JWT — ver README sobre reglas de Firestore) ── */
function getSession()  { return JSON.parse(localStorage.getItem('crm_session')||'null'); }
function requireAuth() { const s=getSession(); if(!s){window.location.href='login.html';return null;} return s; }
function doLogout()    { if(confirm('¿Querés cerrar sesión?')){localStorage.removeItem('crm_session');window.location.href='login.html';} }
function _miNombreSesion() { const s=getSession(); return s?s.nombre:''; }

/* ── Firestore: helpers genéricos de acceso a datos ──
   Reemplazan al antiguo fetch a /backend/api/*.php. `firebase` viene
   cargado como global por los <script> compat en cada HTML, inicializado
   en js/firebase-init.js. */
const _db = () => firebase.firestore();

async function _getAll(col) {
  const snap = await _db().collection(col).get();
  return snap.docs.map(d => d.data());
}
async function _getOne(col, id) {
  const doc = await _db().collection(col).doc(id).get();
  return doc.exists ? doc.data() : null;
}
async function _create(col, data) {
  const id = uid();
  const record = { ...data, id };
  await _db().collection(col).doc(id).set(record);
  return record;
}
async function _updateDoc(col, id, data) {
  await _db().collection(col).doc(id).update(data);
  return { id };
}
async function _upsert(col, id, data) {
  const record = { ...data, id, vehiculo_id: id };
  await _db().collection(col).doc(id).set(record, { merge: true });
  return record;
}
async function _remove(col, id) {
  await _db().collection(col).doc(id).delete();
}

const CRM = {
  /* ── Clientes ── */
  getClientes: async () => (await _getAll('clientes')).sort((a,b)=>(b._ts||0)-(a._ts||0)),
  addCliente:  (d) => _create('clientes', { ...d, creadoPor: d.creadoPor || _miNombreSesion(), fechaCreacion: d.fechaCreacion || todayISO(), _ts: Date.now() }),
  editCliente: (d) => _updateDoc('clientes', d.id, { ...d, editadoPor: _miNombreSesion(), fechaEdicion: today() }),
  delCliente:  (id) => _remove('clientes', id),

  /* ── Vehículos (sin carga de fotos en esta demo — ver README) ── */
  getVehiculos: async () => (await _getAll('vehiculos')).sort((a,b)=>(b._ts||0)-(a._ts||0)),
  addVehiculo: async ({ data }) => _create('vehiculos', { ...data, fotos: [], creadoPor: _miNombreSesion(), fechaCreacion: todayISO(), _ts: Date.now() }),
  editVehiculo: async ({ data }) => {
    const { fotosExistentes, ...rest } = data;
    await _updateDoc('vehiculos', data.id, { ...rest, fotos: [], editadoPor: _miNombreSesion(), fechaEdicion: todayISO() });
    return { id: data.id, fotos: [] };
  },
  delVehiculo: (id) => _remove('vehiculos', id),

  /* ── Alertas (mías, asignadas a mí, o a 'todos') ── */
  getAlertas: async () => {
    const yo = _miNombreSesion();
    return (await _getAll('alertas'))
      .filter(a => a.creadoPor===yo || a.asignadoA===yo || a.asignadoA==='todos')
      .sort((a,b)=>(b._ts||0)-(a._ts||0));
  },
  addAlerta: (d) => _create('alertas', {
    tipo: d.tipo||'general', titulo: d.titulo||'', descripcion: d.descripcion||null,
    fecha: d.fecha||null, hora: d.hora||null, done: false,
    refId: d.refId||null, refPhone: d.refPhone||null, refName: d.refName||null,
    creadoPor: _miNombreSesion(), asignadoA: d.asignadoA || _miNombreSesion(), _ts: Date.now(),
  }),
  toggleAlerta: (id,done) => _updateDoc('alertas', id, { done: !!done }),
  delAlerta:    (id) => _remove('alertas', id),

  /* ── Tareas (mías o asignadas a mí) ── */
  getTareas: async () => {
    const yo = _miNombreSesion();
    return (await _getAll('tareas'))
      .filter(t => t.creadoPor===yo || t.asignadoA===yo)
      .sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||'')));
  },
  addTarea: (d) => _create('tareas', {
    titulo: d.titulo||'', descripcion: d.descripcion||null, fecha: d.fecha||todayISO(), done: false,
    clienteId: d.clienteId||null, clienteNombre: d.clienteNombre||null, clientePhone: d.clientePhone||null,
    origenITV: d.origenITV||null, origenLabel: d.origenLabel||null,
    creadoPor: _miNombreSesion(), asignadoA: d.asignadoA || _miNombreSesion(),
  }),
  toggleTarea: (id,done) => _updateDoc('tareas', id, { done: !!done }),
  delTarea:    (id) => _remove('tareas', id),

  /* ── Peritaje (1 documento por vehículo, mismo shape que devolvía PHP) ── */
  getPeritaje: (vid) => _getOne('peritajes', vid),
  savePeritaje: (d) => _upsert('peritajes', d.vehiculoId, {
    sec_a: { motor:d.motor??null, cajaAT:d.cajaAT??null, embrague:d.embrague??null, cuatroX4:d.cuatroX4??null, diferencial:d.diferencial??null, mantenimiento:d.mantenimiento??null, obsMotor:d.obsMotor??null, costoB:d.costoB??null },
    sec_b: { frenos:d.frenos??null, frenosTraseros:d.frenosTraseros??null, trenDelant:d.trenDelant??null, amortiguadores:d.amortiguadores??null, direccion:d.direccion??null, neumaticos:d.neumaticos??null, obsC:d.obsC??null, costoC:d.costoC??null },
    sec_c: { abs:d.abs??null, motorLuz:d.motorLuz??null, airbag:d.airbag??null, transLuz:d.transLuz??null, bateria:d.bateria??null, dtcCode1:d.dtcCode1??null, dtcCode2:d.dtcCode2??null, dtcCode3:d.dtcCode3??null, dtcOtros:d.dtcOtros??null, obsD:d.obsD??null, costoD:d.costoD??null },
    sec_d: { gatoLlave:d.gatoLlave??null, ruedaAux:d.ruedaAux??null, matafuego:d.matafuego??null, balizas:d.balizas??null, antirrobos:d.antirrobos??null, alarma:d.alarma??null, segundaLlave:d.segundaLlave??null, manualUnidad:d.manualUnidad??null, codigosRadio:d.codigosRadio??null, carpetaDoc:d.carpetaDoc??null, audio:d.audio??null, calefaccion:d.calefaccion??null, ac:d.ac??null, vidriosElec:d.vidriosElec??null, cierreCentral:d.cierreCentral??null, cinturon:d.cinturon??null, frenoMano:d.frenoMano??null, obsD2:d.obsD2??null, costoD2:d.costoD2??null },
    sec_e: { butacaIzq:d.butacaIzq??null, butacaDer:d.butacaDer??null, asientoTras:d.asientoTras??null, tapizPuertas:d.tapizPuertas??null, tapizTecho:d.tapizTecho??null, bandejaT:d.bandejaT??null, obsE:d.obsE??null, costoE:d.costoE??null, obsExt:d.obsExt??null, desgasteCarroceria:d.desgasteCarroceria??null, costoA:d.costoA??null, costoTotal:d.costoTotal??null, deToma:d.deToma??null, fHistorialServicios:d.fHistorialServicios??null, fHistorialObs:d.fHistorialObs??null, fCorreaDistrib:d.fCorreaDistrib??null, fCorreaDistribObs:d.fCorreaDistribObs??null, fNeumaticosEstado:d.fNeumaticosEstado??null, fNeumaticosReemplazo:d.fNeumaticosReemplazo??null, fNneumaticosMarca:d.fNneumaticosMarca??null, fPrimerDuenio:d.fPrimerDuenio??null, fParabrisas:d.fParabrisas??null, fNotaPropietario:d.fNotaPropietario??null, costoF:d.costoF??null, peritador:d.peritador??null, resenaTexto:d.resenaTexto??null, fecha:d.fecha??null, costoCarroceria:d.costoCarroceria??null },
    carroceria: d.carroceria || null,
    observaciones: d.observaciones ?? null,
    peritado_por: _miNombreSesion(),
    fecha_peritaje: d.fechaPeritaje || d.fecha || todayISO(),
  }),

  /* ── Gestoría (1 documento por vehículo, mismo shape snake_case que devolvía PHP) ── */
  getGestoria: (vid) => _getOne('gestorias', vid),
  saveGestoria: (d) => {
    const items = d.items || {};
    const gi = k => !!(items[k] && items[k].checked);
    const gd = k => (items[k] && items[k].fecha) || null;
    const gn = k => (items[k] && items[k].nota) || null;
    return _upsert('gestorias', d.vehiculoId, {
      estado: d.estado || 'pendiente',
      form08: gi('form08'), form08_fecha: gd('form08'), form08_nota: gn('form08'),
      verif_policial: gi('verificPolicial'), verif_policial_fecha: gd('verificPolicial'), verif_policial_nota: gn('verificPolicial'),
      multas_nac: gi('multasNac'), multas_nac_fecha: gd('multasNac'), multas_nac_nota: gn('multasNac'),
      dominio_hist: gi('dominioHist'), dominio_hist_fecha: gd('dominioHist'), dominio_hist_nota: gn('dominioHist'),
      libre_deudas: gi('libreDeudas'), libre_deudas_fecha: gd('libreDeudas'), libre_deudas_nota: gn('libreDeudas'),
      titulo: gi('titulo'), titulo_fecha: gd('titulo'), titulo_nota: gn('titulo'),
      cedulas: gi('cedulas'), cedulas_fecha: gd('cedulas'), cedulas_nota: gn('cedulas'),
      identificacion: gi('identificacion'), identificacion_fecha: gd('identificacion'), identificacion_nota: gn('identificacion'),
      notas: d.notas ?? null,
      fecha_inicio: d.fechaInicio ?? null,
      fecha_cierre: d.fechaCierre ?? null,
      ultimo_guardado_por: _miNombreSesion(),
      fecha_ultimo_guardado: todayISO(),
    });
  },

  /* ── Jerarquía ── */
  getJerarquia: async () => (await _getAll('jerarquia')).sort((a,b)=>(a._ts||0)-(b._ts||0)),
  addMiembro: (d) => _create('jerarquia', { nombre:d.nombre||'', apellido:d.apellido||'', rol:d.rol||null, telefono:d.telefono||null, email:d.email||null, fechaTurno:d.fechaTurno||null, notas:d.notas||null, creadoPor:_miNombreSesion(), _ts: Date.now() }),
  editMiembro: (d) => _updateDoc('jerarquia', d.id, { nombre:d.nombre||'', apellido:d.apellido||'', rol:d.rol||null, telefono:d.telefono||null, email:d.email||null, fechaTurno:d.fechaTurno||null, notas:d.notas||null }),
  delMiembro: (id) => _remove('jerarquia', id),

  /* ── Usuarios (solo lectura, para asignar alertas/tareas) ── */
  getUsuarios: async () => (await _getAll('usuarios')).filter(u=>u.activo!==false).map(u=>({ id:u.id, user:u.user, nombre:u.nombre, role:u.role })),
};

/* ── Helper para aplanar datos de carrocería ── */
function flattenCarroceria(carroceria) {
  if (!carroceria || typeof carroceria !== 'object') return {};
  const result = {};
  Object.entries(carroceria).forEach(([panel, data]) => {
    const kCap = panel.charAt(0).toUpperCase() + panel.slice(1);
    if (data && typeof data === 'object') {
      result['daño' + kCap]  = data.c   || '';
      result['pct'  + kCap]  = data.pct || '';
    }
  });
  if (carroceria.desgasteCarroceria !== undefined) result.desgasteCarroceria = carroceria.desgasteCarroceria;
  if (carroceria.costoCarroceria    !== undefined) result.costoCarroceria    = carroceria.costoCarroceria;
  return result;
}

async function bootApp(activePage) {
  const session = requireAuth(); if(!session) return;
  try {
    const [clients, cars, alertas, jerarquia] = await Promise.all([
      CRM.getClientes(), CRM.getVehiculos(), CRM.getAlertas(), CRM.getJerarquia()
    ]);
    S.clients   = clients   || [];
    S.cars      = cars      || [];
    S.alertas   = alertas   || [];
    S.jerarquia = jerarquia || [];

    // ── Cargar todos los peritajes y asignarlos a cada auto ──
    try {
      const todosLosPeritajes = await _getAll('peritajes');
      if (Array.isArray(todosLosPeritajes)) {
        const peritajeMap = {};
        todosLosPeritajes.forEach(p => { peritajeMap[p.vehiculo_id] = p; });
        S.cars.forEach(car => {
          if (peritajeMap[car.id]) {
            const raw = peritajeMap[car.id];
            const secE = raw.sec_e || {};
            car.peritaje = {
              ...(raw.sec_a      || {}),
              ...(raw.sec_b      || {}),
              ...(raw.sec_c      || {}),
              ...(raw.sec_d      || {}),
              ...secE,
              ...(raw.carroceria ? flattenCarroceria(raw.carroceria) : {}),
              observaciones:   raw.observaciones  || '',
              peritadoPor:     raw.peritado_por   || '',
              fechaPeritaje:   raw.fecha_peritaje || '',
              // campos clave que vienen en sec_e
              peritador:       secE.peritador       || raw.peritado_por    || '',
              fecha:           secE.fecha           || raw.fecha_peritaje  || '',
              resenaTexto:     secE.resenaTexto      || '',
              costoCarroceria: secE.costoCarroceria  || (raw.carroceria && raw.carroceria.costoCarroceria) || '',
            };
          }
        });
      }
    } catch(pe) {
      console.warn('No se pudieron cargar peritajes:', pe);
    }

    // ── Cargar todas las gestorías y asignarlas a cada auto ──
    try {
      const todasLasGestorias = await _getAll('gestorias');
      if (Array.isArray(todasLasGestorias)) {
        const gestoriaMap = {};
        todasLasGestorias.forEach(g => { gestoriaMap[g.vehiculo_id] = g; });
        S.cars.forEach(car => {
          const raw = gestoriaMap[car.id];
          if (!raw) return;
          car.gestoria = {
            estado:              raw.estado               || 'pendiente',
            notas:               raw.notas                || '',
            fechaInicio:         raw.fecha_inicio         || '',
            fechaCierre:         raw.fecha_cierre         || '',
            ultimoGuardadoPor:   raw.ultimo_guardado_por  || '',
            fechaUltimoGuardado: raw.fecha_ultimo_guardado|| '',
            items: {
              form08:          { checked: !!raw.form08,         fecha: raw.form08_fecha         || '', obs: raw.form08_nota         || '' },
              verificPolicial: { checked: !!raw.verif_policial, fecha: raw.verif_policial_fecha || '', obs: raw.verif_policial_nota || '' },
              multasNac:       { checked: !!raw.multas_nac,     fecha: raw.multas_nac_fecha     || '', obs: raw.multas_nac_nota     || '' },
              dominioHist:     { checked: !!raw.dominio_hist,   fecha: raw.dominio_hist_fecha   || '', obs: raw.dominio_hist_nota   || '' },
              libreDeudas:     { checked: !!raw.libre_deudas,   fecha: raw.libre_deudas_fecha   || '', obs: raw.libre_deudas_nota   || '' },
              titulo:          { checked: !!raw.titulo,         fecha: raw.titulo_fecha         || '', obs: raw.titulo_nota         || '' },
              cedulas:         { checked: !!raw.cedulas,        fecha: raw.cedulas_fecha        || '', obs: raw.cedulas_nota        || '' },
              identificacion:  { checked: !!raw.identificacion, fecha: raw.identificacion_fecha || '', obs: raw.identificacion_nota || '' },
            },
          };
        });
      }
    } catch(ge) {
      console.warn('No se pudieron cargar gestorías:', ge);
    }

    initTheme();
    renderHeader(activePage);
    if(typeof render==='function') render();
  } catch(e) { console.error(e); toast('Error conectando con el servidor','error'); }
}

/* ── Helpers ── */
function fp(n) {
  const num = parseFloat(String(n).replace(/\./g,'').replace(',','.'));
  if (!n || isNaN(num)) return '—';
  return '$' + parseInt(num).toLocaleString('es-AR');
}

function carPrice(c) {
  if (c.precioContado && !isNaN(parseFloat(c.precioContado))) return parseFloat(c.precioContado);
  if (c.precioCanje   && !isNaN(parseFloat(c.precioCanje)))   return parseFloat(c.precioCanje);
  if (c.price         && !isNaN(parseFloat(c.price)))         return parseFloat(c.price);
  return null;
}

function fk(n)        { return parseInt(n).toLocaleString('es-AR')+' km'; }
function ini(nm)      { return String(nm).trim().split(/\s+/).map(w=>w[0]||'').join('').toUpperCase().slice(0,2); }
function uid()        { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function today()      { return new Date().toLocaleDateString('es-AR'); }
function todayISO()   { return new Date().toISOString().slice(0,10); }
function cleanPhone(p){ return String(p).replace(/\D/g,''); }
function esc(s)       { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function isBirthdayToday(d)   {if(!d)return false;const x=new Date(d),n=new Date();return x.getMonth()===n.getMonth()&&x.getDate()===n.getDate();}
function isBirthdayTomorrow(d){if(!d)return false;const x=new Date(d),t=new Date();t.setDate(t.getDate()+1);return x.getMonth()===t.getMonth()&&x.getDate()===t.getDate();}
function daysUntil(d) {if(!d)return null;const x=new Date(d),n=new Date();let nx=new Date(n.getFullYear(),x.getMonth(),x.getDate());if(nx<n)nx.setFullYear(nx.getFullYear()+1);return Math.ceil((nx-n)/(1000*60*60*24));}
function solicitarTurnoITV(carId){const car=S.cars.find(c=>c.id===carId);const ctx={tipo:'turno',info:car?`ITV pendiente/vencida — ${car.brand} ${car.model} ${car.year}`:'Turno ITV'};sessionStorage.setItem('alertas_prefill',JSON.stringify(ctx));window.location.href='alertas.html';}
function openWhatsApp(phone,name,msg){const num=cleanPhone(phone);const full=num.startsWith('54')?num:'54'+num;const m=msg||`Hola ${name}! Te contactamos desde GRUPO DENTE Automotores. ¿Cómo estás?`;window.open(`https://wa.me/${full}?text=${encodeURIComponent(m)}`,'_blank');}
function openWhatsAppBirthday(phone,name){openWhatsApp(phone,name,`🎉 ¡Feliz cumpleaños ${name}! Te deseamos un excelente día desde el equipo de GRUPO DENTE Automotores. 🎂🚗`);}

let _toastTimer;
function toast(msg,type=''){let el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.className='toast show'+(type?' '+type:'');clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>{el.className='toast';},3500);}
function rAv(name,lg,green){return `<div class="av${lg?' lg':''}${green?' green':''}">${ini(name)}</div>`;}
function scoreStyle(s){if(s>=80)return'color:var(--green);';if(s>=50)return'color:var(--orange);';return'color:var(--text-3);';}
function scoreFill(s){const c=s>=80?'var(--green)':s>=50?'var(--orange)':'var(--text-3)';return `<div class="score-bar"><div class="score-fill" style="width:${s}%;background:${c}"></div></div>`;}
function rScoreRow(sc){return `<div style="text-align:right"><div style="font-size:12px;font-weight:600;${scoreStyle(sc)}">${sc}%</div>${scoreFill(sc)}</div>`;}
function rTags(c){let t='';if(c.brand)t+=`<span class="tag">Marca: ${esc(c.brand)}</span>`;if(c.model)t+=`<span class="tag">Modelo: ${esc(c.model)}</span>`;if(c.tipo)t+=`<span class="tag">${c.tipo}</span>`;if(c.trans)t+=`<span class="tag">${c.trans}</span>`;if(c.budget)t+=`<span class="tag">Hasta ${fp(c.budget)}</span>`;if(c.yearMin||c.yearMax)t+=`<span class="tag">${c.yearMin||'?'} – ${c.yearMax||'?'}</span>`;if(!t)t=`<span class="tag" style="opacity:.4">Sin preferencias</span>`;return t;}
function whatsappBtn(phone,name,sm){return `<button class="btn whatsapp${sm?' sm':''}" onclick="openWhatsApp('${esc(phone)}','${esc(name)}')"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>WhatsApp</button>`;}

/* ─────────────────────────────────────────────
   THEME TOGGLE
───────────────────────────────────────────── */
function applyTheme(theme){
  if(theme === 'light'){
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
  localStorage.setItem('crm_theme', theme);
  const icon = document.querySelector('.toggle-icon');
  if(icon){ icon.textContent = theme === 'light' ? '☀️' : '🌙'; }
}

function toggleTheme(){
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

function initTheme(){
  const saved = localStorage.getItem('crm_theme') || 'dark';
  applyTheme(saved);
}

function renderHeader(activePage){
  const session=getSession();
  const pendAlerts=S.alertas.filter(a=>!a.done).length;

  const pages=[
    {id:'dashboard',label:'Dashboard',href:'dashboard.html'},
    {id:'clientes',label:'Clientes',href:'clientes.html'},
    {id:'vehiculos',label:'Vehículos',href:'vehiculos.html'},
    {id:'alertas',label:'Alertas',href:'alertas.html',dot:pendAlerts>0},
    {id:'tareas',label:'Tareas',href:'tareas.html'},
    {id:'gestoria',label:'Gestoría',href:'gestoria.html'},
    {id:'peritaje',label:'Peritaje',href:'peritaje.html'}
  ];

  const navLinks=pages.map(p=>
    `<a href="${p.href}" class="nav-btn${p.id===activePage?' active':''}${p.dot?' alert-dot':''}">
      ${p.label}
    </a>`
  ).join('');

  const currentTheme = localStorage.getItem('crm_theme') || 'dark';
  const headerEl=document.getElementById('app-header');
  if(!headerEl) return;

  headerEl.innerHTML=`
    <div class="header-inner">
      <a href="dashboard.html" class="logo">
        GRUPO DENTE<span class="logo-dot">.</span>CRM
        <span class="logo-sub">Sistema de Gestión</span>
      </a>
      <nav class="nav">
        ${navLinks}
      </nav>
      <button class="theme-toggle" onclick="toggleTheme()">
        <span class="toggle-icon">${currentTheme === 'light' ? '☀️' : '🌙'}</span>
      </button>
      <div class="header-user">
        <span class="user-badge">
          Hola, <strong>${esc(session?session.nombre:'—')}</strong>
        </span>
        <button class="btn-logout" onclick="doLogout()">Salir</button>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   REGISTRO SEGURO PARA MODALES DE MATCH
   ═══════════════════════════════════════════════════════════════ */
const _REG = {};
let   _REG_IDX = 0;
function _reg(clienteId, carId) {
  const k = ++_REG_IDX;
  _REG[k] = { clienteId, carId };
  return k;
}
function showMatchDetailByIdx(idx) {
  const r = _REG[idx];
  if (!r) return;
  showMatchDetail(r.clienteId, r.carId);
}

/* ═══════════════════════════════════════════════════════════════
   MOTOR DE MATCHING
   ═══════════════════════════════════════════════════════════════ */
function score(client, car) {
  let possible = 0, earned = 0;
  const price = carPrice(car);

  if (client.budget) {
    if (price !== null && price > client.budget * 1.10) return -1;
    possible += WEIGHTS.budget;
    if (price === null || price <= client.budget) earned += WEIGHTS.budget;
    else earned += Math.round(WEIGHTS.budget * 0.4);
  }

  const clientBrands = [];
  if (client.brands && client.brands.length) {
    client.brands.forEach(m => {
      const marca = typeof m === 'string' ? m : (m.marca || '');
      if (marca) clientBrands.push({ marca: marca.toLowerCase().trim(), modelo: typeof m === 'string' ? '' : (m.modelo || '').toLowerCase().trim() });
    });
  } else if (client.brand) {
    clientBrands.push({ marca: client.brand.toLowerCase().trim(), modelo: (client.model || '').toLowerCase().trim() });
  }

  if (clientBrands.length) {
    possible += WEIGHTS.brand;
    const carB = (car.brand || '').toLowerCase().trim();
    const carM = (car.model || '').toLowerCase().trim();
    let bestBrand = 0, bestModel = 0;
    clientBrands.forEach(({ marca, modelo }) => {
      if (carB === marca) bestBrand = WEIGHTS.brand;
      else if (carB.includes(marca) || marca.includes(carB)) bestBrand = Math.max(bestBrand, Math.round(WEIGHTS.brand * 0.6));

      if (modelo && carM) {
        possible += WEIGHTS.model;
        if (carM === modelo || (car.brand + ' ' + car.model).toLowerCase() === modelo) bestModel = WEIGHTS.model;
        else if (carM.includes(modelo) || modelo.includes(carM)) bestModel = Math.max(bestModel, Math.round(WEIGHTS.model * 0.85));
        else if (modelo.split(/\s+/).some(w => w.length > 2 && carM.includes(w))) bestModel = Math.max(bestModel, Math.round(WEIGHTS.model * 0.5));
      }
    });
    earned += bestBrand + bestModel;
  }

  if (client.tipo) {
    possible += WEIGHTS.tipo;
    if (car.tipo === client.tipo) earned += WEIGHTS.tipo;
  }
  if (client.trans) {
    possible += WEIGHTS.trans;
    if (car.trans === client.trans) earned += WEIGHTS.trans;
  }
  if (client.yearMin || client.yearMax) {
    possible += WEIGHTS.year;
    const ok = (!client.yearMin || car.year >= +client.yearMin) && (!client.yearMax || car.year <= +client.yearMax);
    if (ok) earned += WEIGHTS.year;
  }
  if (car.color && client.notes) {
    possible += WEIGHTS.color;
    if (client.notes.toLowerCase().includes(car.color.toLowerCase())) earned += WEIGHTS.color;
  }
  if (car.km !== null && car.km !== undefined) {
    possible += WEIGHTS.km;
    if (car.km <= 80000) earned += WEIGHTS.km;
    else if (car.km <= 150000) earned += Math.round(WEIGHTS.km * 0.5);
  }

  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

function matchesForCar(car)    { return S.clients.filter(c=>c.status==='activo').map(c=>({...c,sc:score(c,car)})).filter(c=>c.sc>0).sort((a,b)=>b.sc-a.sc); }
function matchesForClient(cl)  { return S.cars.filter(c=>c.status==='disponible').map(car=>({...car,sc:score(cl,car)})).filter(car=>car.sc>0).sort((a,b)=>b.sc-a.sc); }
function topN(items,key,n)     { const cnt={};items.forEach(i=>{const v=i[key];if(v)cnt[v]=(cnt[v]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,n); }

/* ═══════════════════════════════════════════════════════════════
   MODAL DE MATCH / COMPATIBILIDAD
   ═══════════════════════════════════════════════════════════════ */
function showMatchDetail(clienteId, carId) {
  const cliente = S.clients.find(c => c.id === clienteId);
  const car     = S.cars.find(c => c.id === carId);
  if (!cliente || !car) { toast('No se encontraron los datos', 'error'); return; }

  const sc = score(cliente, car);
  const price = carPrice(car);

  const rows = [];

  if (cliente.budget) {
    const ok = price === null || price <= cliente.budget;
    const excede = price !== null && price > cliente.budget * 1.10;
    rows.push({
      label: 'Presupuesto',
      val: cliente.budget ? `Hasta ${fp(cliente.budget)}` : '—',
      carVal: price ? fp(price) : 'Sin precio',
      ok: excede ? 'block' : ok ? 'full' : 'partial',
    });
  }

  const clientBrands = [];
  if (cliente.brands && cliente.brands.length) {
    cliente.brands.forEach(m => clientBrands.push(typeof m === 'string' ? m : (m.marca || '')));
  } else if (cliente.brand) { clientBrands.push(cliente.brand); }
  if (clientBrands.length) {
    const carB = (car.brand || '').toLowerCase();
    const match = clientBrands.some(m => carB === m.toLowerCase() || carB.includes(m.toLowerCase()) || m.toLowerCase().includes(carB));
    rows.push({ label: 'Marca', val: clientBrands.join(', '), carVal: car.brand, ok: match ? 'full' : 'none' });
  }

  const clientModelos = [];
  if (cliente.brands && cliente.brands.length) {
    cliente.brands.forEach(m => { if (typeof m !== 'string' && m.modelo) clientModelos.push(m.modelo); });
  } else if (cliente.model) { clientModelos.push(cliente.model); }
  if (clientModelos.length) {
    const carM = (car.model || '').toLowerCase();
    const match = clientModelos.some(m => carM.includes(m.toLowerCase()) || m.toLowerCase().includes(carM));
    rows.push({ label: 'Modelo', val: clientModelos.join(', '), carVal: car.model, ok: match ? 'full' : 'none' });
  }

  if (cliente.tipo) {
    rows.push({ label: 'Tipo', val: cliente.tipo, carVal: car.tipo, ok: car.tipo === cliente.tipo ? 'full' : 'none' });
  }

  if (cliente.trans) {
    rows.push({ label: 'Transmisión', val: cliente.trans, carVal: car.trans, ok: car.trans === cliente.trans ? 'full' : 'none' });
  }

  if (cliente.yearMin || cliente.yearMax) {
    const ok = (!cliente.yearMin || car.year >= +cliente.yearMin) && (!cliente.yearMax || car.year <= +cliente.yearMax);
    rows.push({ label: 'Año', val: `${cliente.yearMin || '?'} – ${cliente.yearMax || '?'}`, carVal: String(car.year), ok: ok ? 'full' : 'none' });
  }

  if (car.km !== null && car.km !== undefined) {
    const kmOk = car.km <= 80000 ? 'full' : car.km <= 150000 ? 'partial' : 'none';
    rows.push({ label: 'Kilometraje', val: 'Preferencia baja', carVal: fk(car.km), ok: kmOk });
  }

  const okIcon   = (t) => t === 'full' ? '✓' : t === 'partial' ? '~' : t === 'block' ? '✗' : '✗';
  const okColor  = (t) => t === 'full' ? 'var(--green)' : t === 'partial' ? 'var(--orange)' : 'var(--red,#e05555)';

  const rowsHtml = rows.map(r => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:22px;height:22px;border-radius:50%;background:${okColor(r.ok)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${okIcon(r.ok)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3)">${r.label}</div>
        <div style="font-size:12px;color:var(--text-2)">Cliente busca: <strong style="color:var(--text)">${esc(r.val)}</strong></div>
      </div>
      <div style="font-size:12px;color:var(--text-2);text-align:right;flex-shrink:0">Vehículo: <strong style="color:var(--text)">${esc(r.carVal)}</strong></div>
    </div>`).join('');

  const scoreColor = sc >= 80 ? 'var(--green)' : sc >= 50 ? 'var(--orange)' : 'var(--text-3)';
  const scoreLabel = sc >= 80 ? 'Alta compatibilidad' : sc >= 50 ? 'Compatibilidad media' : 'Baja compatibilidad';

  const prev = document.getElementById('match-detail-overlay');
  if (prev) prev.remove();

  const overlay = document.createElement('div');
  overlay.id = 'match-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem';
  overlay.innerHTML = `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg,12px);width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px">🎯 Detalle de compatibilidad</div>
          <div style="font-size:12px;color:var(--text-3)">
            <strong style="color:var(--text-2)">${esc(cliente.name)}</strong>
            <span style="margin:0 6px;opacity:.4">·</span>
            <strong style="color:var(--text-2)">${esc(car.brand)} ${esc(car.model)} ${car.year}</strong>
            ${car.patente ? `<span style="margin-left:6px;background:var(--surface-3);padding:1px 6px;border-radius:4px;border:1px solid var(--border)">${esc(car.patente)}</span>` : ''}
          </div>
        </div>
        <button onclick="document.getElementById('match-detail-overlay').remove()"
          style="background:none;border:none;font-size:22px;color:var(--text-3);cursor:pointer;line-height:1;padding:0;margin-left:12px">×</button>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:14px">
        <div style="font-size:42px;font-weight:800;color:${scoreColor};line-height:1">${sc}%</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:${scoreColor}">${scoreLabel}</div>
          <div style="margin-top:6px;width:160px;height:8px;background:var(--surface-3);border-radius:4px;overflow:hidden">
            <div style="width:${sc}%;height:100%;background:${scoreColor};border-radius:4px;transition:width .3s"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="overflow-y:auto;flex:1;padding:1rem 1.5rem">
      ${rows.length > 0 ? rowsHtml : '<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px">El cliente no tiene preferencias registradas.</div>'}
      ${cliente.notes ? `
      <div style="margin-top:12px;padding:10px 12px;background:var(--surface-2);border-radius:6px;border-left:3px solid var(--blue)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:4px">Notas del cliente</div>
        <div style="font-size:12px;color:var(--text-2);font-style:italic">"${esc(cliente.notes)}"</div>
      </div>` : ''}
    </div>

    <div style="padding:.9rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
      ${whatsappBtn(cliente.phone, cliente.name, true)}
      <button class="btn" onclick="document.getElementById('match-detail-overlay').remove()">Cerrar</button>
    </div>
  </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}