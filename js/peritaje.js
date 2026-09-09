/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/peritaje.js
   Módulo: Peritaje de vehículos (formulario A-E + carrocería)
   ═══════════════════════════════════════════════════════════════ */

let selectedCarId  = null;
let viewingCarId   = null;  // 2190 auto cuyo resumen está expandido
let peritajeSearch = '';   // ← estado del buscador

function getCarIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || null;
}

/* ── Estilos del buscador ── */
function _inyectarEstilosBuscadorPeritaje() {
  if (document.getElementById('neifert-peritaje-search-styles')) return;
  const st = document.createElement('style');
  st.id = 'neifert-peritaje-search-styles';
  st.textContent = `
    .peritaje-search-wrap { position:relative; margin-bottom:1rem; }
    .peritaje-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; line-height:1; opacity:.6; }
    .peritaje-search-input { width:100%; box-sizing:border-box; padding:10px 36px 10px 34px; border-radius:8px; border:1.5px solid var(--border,#555); background:var(--surface-2,#2a2a2a); color:var(--text,#fff); font-size:14px; outline:none; transition:border-color .15s; }
    .peritaje-search-input:focus { border-color:var(--blue,#378ADD); background:var(--surface-3,#333); }
    .peritaje-search-input::placeholder { color:var(--text-3,#666); }
    .peritaje-search-clear { position:absolute; right:9px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-3); font-size:20px; line-height:1; padding:2px 5px; border-radius:4px; display:none; opacity:.6; }
    .peritaje-search-clear.visible { display:block; }
    .peritaje-search-clear:hover { opacity:1; color:var(--text); }
  `;
  document.head.appendChild(st);
}

/* ── Paneles de carrocería ── */
const PANELES = [
  ['capo',          'Capó'],
  ['techo',         'Techo'],
  ['baul',          'Baúl'],
  ['paraDelant',    'Paragolpes del.'],
  ['paraTras',      'Paragolpes tras.'],
  ['puertaDelIzq',  'Puerta del. izq.'],
  ['puertaDelDer',  'Puerta del. der.'],
  ['puertaTrasIzq', 'Puerta tras. izq.'],
  ['puertaTrasDer', 'Puerta tras. der.'],
  ['gdaDelIzq',     'Gda. del. izq.'],
  ['gdaDelDer',     'Gda. del. der.'],
  ['gdaTrasIzq',    'Gda. tras. izq.'],
  ['gdaTrasDer',    'Gda. tras. der.'],
  ['espejoIzq',     'Espejo izq.'],
  ['espejoDer',     'Espejo der.'],
];
const DAÑOS_PANEL = ['', 'ok', 'O', 'MB', 'RP', 'CH', 'RY', 'PC', 'RJ'];

/* ══════════════════════════════════════════════════════════════
   CARROCERÍA SVG — Funciones globales
   ══════════════════════════════════════════════════════════════ */

const CARRO_COLORES = {
  MB: '#639922', RP: '#378ADD', CH: '#E24B4A',
  RY: '#EF9F27', PC: '#7F77DD', RJ: '#D4537E',
};

const CARRO_PANEL_MAP = {
  'Capó':'capo', 'Techo':'techo', 'Baúl':'baul',
  'Paragolpes del.':'paraDelant', 'Paragolpes tras.':'paraTras',
  'Puerta del. izq.':'puertaDelIzq', 'Puerta del. der.':'puertaDelDer',
  'Puerta tras. izq.':'puertaTrasIzq', 'Puerta tras. der.':'puertaTrasDer',
  'Gda. del. izq.':'gdaDelIzq', 'Gda. del. der.':'gdaDelDer',
  'Gda. tras. izq.':'gdaTrasIzq', 'Gda. tras. der.':'gdaTrasDer',
  'Espejo izq.':'espejoIzq', 'Espejo der.':'espejoDer',
};

const CARRO_BTN_IDS = {
  'Capó':'chp-capo', 'Techo':'chp-techo', 'Baúl':'chp-baul',
  'Paragolpes del.':'chp-paraDelant', 'Paragolpes tras.':'chp-paraTras',
  'Puerta del. izq.':'chp-puertaDelIzq', 'Puerta del. der.':'chp-puertaDelDer',
  'Puerta tras. izq.':'chp-puertaTrasIzq', 'Puerta tras. der.':'chp-puertaTrasDer',
  'Gda. del. izq.':'chp-gdaDelIzq', 'Gda. del. der.':'chp-gdaDelDer',
  'Gda. tras. izq.':'chp-gdaTrasIzq', 'Gda. tras. der.':'chp-gdaTrasDer',
  'Espejo izq.':'chp-espejoIzq', 'Espejo der.':'chp-espejoDer',
};

let _carroData   = {};
let _carroCur    = null;
let _carroSelC   = null;
let _carroSelCol = null;

/* ── Formato numérico argentino: 40000 → "40.000" ── */
function fmtARS(val) {
  const n = parseFloat(String(val || ''));
  if (isNaN(n) || n === 0) return '';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ── Recalcula el costo total sumando todos los parciales ── */
function recalcularCostoTotal() {
  const campos = ['costoA', 'costoCarroceria', 'costoB', 'costoC', 'costoD', 'costoE', 'costoF'];
  let suma = 0;
  campos.forEach(function(name) {
    const el = document.querySelector('[name="' + name + '"]');
    if (el && el.value) suma += parseFloat(el.value) || 0;
  });
  const displayEl = document.getElementById('costo-total-display');
  if (displayEl) displayEl.textContent = suma > 0 ? '$ ' + fmtARS(suma) : '\u2014';
  const hiddenEl = document.querySelector('[name="costoTotal"]');
  if (hiddenEl) hiddenEl.value = suma > 0 ? suma : '';
}

/* ── Carrocería: manejo de estilos ── */
function _carroInyectarEstilos() {
  if (document.getElementById('carro-styles')) return;
  const st = document.createElement('style');
  st.id = 'carro-styles';
  st.textContent = `
    .carro-hp {
      position:absolute; cursor:pointer; border-radius:4px;
      border:1.5px solid transparent; background:rgba(128,128,128,0.06);
      transition:background .12s, border-color .12s;
      display:flex; align-items:center; justify-content:center;
      font-size:9px; font-weight:700; line-height:1.1;
      text-align:center; padding:1px; box-sizing:border-box;
    }
    .carro-hp:hover { background:rgba(128,128,128,0.22); border-color:rgba(200,200,200,.4); }
    .carro-opt {
      padding:8px 5px; border-radius:8px; font-size:12px;
      border:1.5px solid var(--border,#444); background:var(--bg2,#2a2a2a);
      cursor:pointer; text-align:center; color:var(--text,#eee); transition:all .12s;
    }
    .carro-opt:hover { border-color:rgba(200,200,200,.5); }

    /* ── Sección F — declaración propietario ── */
    .seccion-f-banner {
      display:flex; align-items:flex-start; gap:10px;
      background: linear-gradient(135deg, rgba(239,159,39,0.08) 0%, rgba(239,159,39,0.04) 100%);
      border:1.5px solid rgba(239,159,39,0.35);
      border-radius:10px; padding:10px 13px; margin-bottom:14px;
      font-size:12px; color:var(--text-2,#bbb); line-height:1.5;
    }
    .seccion-f-banner-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
    .seccion-f-nota {
      width:100%; box-sizing:border-box;
      padding:9px 11px; border-radius:8px;
      border:1.5px solid var(--border,#444);
      background:rgba(239,159,39,0.05);
      color:var(--text,#eee); font-size:13px;
      resize:vertical; min-height:70px;
      font-family:inherit; line-height:1.5;
      transition:border-color .15s;
    }
    .seccion-f-nota:focus { outline:none; border-color:rgba(239,159,39,0.55); }
    .seccion-f-nota::placeholder { color:var(--text-3,#555); font-style:italic; }

    /* ── Estilos de impresión ── */
    .print-logo { display:none; }
    @media print {
      @page { margin: 10mm 12mm; size: A4; }
      .print-header {
        display:flex !important; align-items:center; gap:12px;
        margin-bottom:6px; padding-bottom:5px;
        border-bottom:2px solid #000;
        page-break-after: avoid !important;
        break-after: avoid !important;
        column-span: all;
      }
      .print-logo {
        display:block !important;
        width:52px; height:52px; object-fit:contain;
      }
      .print-header-text { line-height:1.3; }
      .print-header-text strong { font-size:14px; font-weight:700; }
      .print-header-text span { font-size:10px; color:#555; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { background:#fff !important; color:#000 !important; font-size:10px !important; }
      .header, .btn, button, .toast, #carro-overlay, .no-print { display:none !important; }
      .main { margin:0 !important; padding:0 !important; }
      .layout { max-width:100% !important; padding:0 !important; }
      .form-section { background:#fff !important; margin:0 !important; padding:0 !important; }
      .peritaje-print-cols {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto;
        gap: 6px;
        grid-template-areas:
          "datos  datos-a"
          "carro  carro"
          "b      c"
          "d      e"
          "f      f"
          "total  total";
      }
      .peritaje-print-cols > .hint-box:nth-child(1) { grid-area: datos; }
      .peritaje-print-cols > .hint-box:nth-child(2) { grid-area: datos-a; }
      .peritaje-print-cols > .hint-box:nth-child(3) { grid-area: carro; }
      #carro-section { grid-area: carro !important; }
      .peritaje-print-cols > .hint-box:nth-child(4) { grid-area: b; }
      .peritaje-print-cols > .hint-box:nth-child(5) { grid-area: c; }
      .peritaje-print-cols > .hint-box:nth-child(6) { grid-area: d; }
      .peritaje-print-cols > .hint-box:nth-child(7) { grid-area: e; }
      #seccion-f-box { grid-area: f !important; }
      #costo-total-box { grid-area: total; }
      .hint-box {
        border:1px solid #bbb !important; background:#fff !important;
        break-inside:avoid; margin-bottom:6px !important;
        padding:6px 8px !important; column-break-inside:avoid;
        display:inline-block; width:100%; box-sizing:border-box;
      }
      .hint-label {
        color:#000 !important; border-bottom:1px solid #ddd !important;
        font-size:9px !important; padding-bottom:3px !important; margin-bottom:4px !important;
      }
      .form-title { color:#000 !important; font-size:13px !important; margin-bottom:4px !important;
                   page-break-after:avoid !important; break-after:avoid !important; }
      .form-section > div:first-child { page-break-after:avoid !important; break-after:avoid !important; }
      label { font-size:9px !important; margin-bottom:1px !important; }
      input, select, textarea {
        border:1px solid #ccc !important; background:#fff !important;
        color:#000 !important; font-size:9px !important;
        padding:2px 4px !important; height:auto !important; min-height:0 !important;
      }
      textarea { height:28px !important; resize:none !important; }
      .fg, .fg2, .fg3, .fg4 { gap:4px !important; }
      #carro-section #carro-wrap { max-width:160px !important; margin:0 auto !important; }
      #carro-section #carro-wrap svg { max-width:160px !important; }
      .carro-hp { font-size:7px !important; border-color:#bbb !important; }
      .badge {
        border:1px solid #888 !important; background:#eee !important;
        color:#000 !important; font-size:8px !important;
      }
      #carro-resumen-list { gap:3px !important; }
      .seccion-f-banner {
        border:1px solid #ccc !important; background:#fffbe8 !important;
        color:#333 !important; padding:4px 6px !important; font-size:8px !important;
      }
      .seccion-f-nota { background:#fff !important; color:#000 !important; border:1px solid #ccc !important; }
    }
    .peritaje-print-header { display:none; }
  `;
  document.head.appendChild(st);
}

function carroInit(p) {
  _carroData = {};
  PANELES.forEach(([k, label]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d    = String(p['daño' + kCap] || '');
    const pct  = parseInt(p['pct' + kCap]) || 0;
    if (d && d !== '' && d !== 'ok') {
      _carroData[label] = { c: d, col: CARRO_COLORES[d] || '#888', pct: pct, obs: '' };
    }
  });
}

function _carroSync(panel) {
  const k = CARRO_PANEL_MAP[panel]; if (!k) return;
  const kCap = k.charAt(0).toUpperCase() + k.slice(1);
  const dEl  = document.getElementById('sv_daño' + kCap);
  const pEl  = document.getElementById('sv_pct'  + kCap);
  const d    = _carroData[panel];
  if (dEl) dEl.value = (d && d.c) ? d.c : '';
  if (pEl) pEl.value = (d && d.pct) ? d.pct : '';
}

function _carroUpdBtn(panel) {
  const btn = document.getElementById(CARRO_BTN_IDS[panel]); if (!btn) return;
  const d   = _carroData[panel];
  if (d && d.c) {
    btn.style.background  = d.col + '55';
    btn.style.borderColor = d.col;
    btn.style.color       = d.col;
    btn.textContent       = d.c + (d.pct ? ' ' + d.pct + '%' : '');
  } else {
    btn.style.background  = 'rgba(128,128,128,0.06)';
    btn.style.borderColor = 'transparent';
    btn.style.color       = 'transparent';
    btn.textContent       = '';
  }
}

function _carroUpdResumen() {
  const list = document.getElementById('carro-resumen-list');
  const sec  = document.getElementById('carro-resumen');
  if (!list || !sec) return;
  const ents = Object.entries(_carroData).filter(function(e) { return e[1].c; });
  if (!ents.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  list.innerHTML = ents.map(function(e) {
    var label = e[0], d = e[1];
    return '<span class="badge bg-red" style="font-size:11px;border:1px solid ' + d.col + '66;background:' + d.col + '22;color:' + d.col + '">'
      + label + ': ' + d.c + (d.pct ? ' ' + d.pct + '%' : '') + (d.obs ? ' — ' + d.obs : '') + '</span>';
  }).join('');
}

function carroRenderBtns() {
  Object.keys(CARRO_BTN_IDS).forEach(function(p) { _carroUpdBtn(p); });
  _carroUpdResumen();
}

function carroOpen(panel) {
  _carroCur    = panel;
  _carroSelC   = null;
  _carroSelCol = null;

  const overlay  = document.getElementById('carro-overlay');
  const titleEl  = document.getElementById('carro-modal-title');
  const pctEl    = document.getElementById('carro-pct');
  const obsEl    = document.getElementById('carro-obs');
  if (!overlay || !titleEl) return;

  titleEl.textContent = panel;
  pctEl.value = (_carroData[panel] && _carroData[panel].pct) || 0;
  obsEl.value = (_carroData[panel] && _carroData[panel].obs) || '';

  document.querySelectorAll('.carro-opt').forEach(function(b) {
    b.style.borderColor = ''; b.style.background = ''; b.style.color = '';
  });
  if (_carroData[panel] && _carroData[panel].c) {
    _carroSelC   = _carroData[panel].c;
    _carroSelCol = _carroData[panel].col;
    document.querySelectorAll('.carro-opt').forEach(function(b) {
      if (b.dataset.c === _carroSelC) {
        b.style.borderColor = _carroSelCol;
        b.style.background  = _carroSelCol + '33';
        b.style.color       = _carroSelCol;
      }
    });
  }
  overlay.style.display = 'flex';
}

function carroClose() {
  const ov = document.getElementById('carro-overlay');
  if (ov) ov.style.display = 'none';
  _carroCur = null;
}

function carroSelOpt(btn) {
  document.querySelectorAll('.carro-opt').forEach(function(b) {
    b.style.borderColor = ''; b.style.background = ''; b.style.color = '';
  });
  btn.style.borderColor = btn.dataset.col;
  btn.style.background  = btn.dataset.col + '33';
  btn.style.color       = btn.dataset.col;
  _carroSelC   = btn.dataset.c;
  _carroSelCol = btn.dataset.col;
}

function carroSave() {
  const panel = _carroCur; if (!panel) return;
  const pct   = parseInt(document.getElementById('carro-pct').value) || 0;
  const obs   = document.getElementById('carro-obs').value.trim();
  if (_carroSelC || pct || obs) {
    _carroData[panel] = { c: _carroSelC, col: _carroSelCol, pct: pct, obs: obs };
  } else {
    delete _carroData[panel];
  }
  _carroSync(panel);
  _carroUpdBtn(panel);
  _carroUpdResumen();
  carroClose();
}

function carroClear() {
  const panel = _carroCur; if (!panel) return;
  delete _carroData[panel];
  _carroSync(panel);
  _carroUpdBtn(panel);
  _carroUpdResumen();
  carroClose();
}

/* ── Helper: km formateado ── */
function _fmtKm(car) {
  return car.km ? ' · ' + (+car.km).toLocaleString('es-AR') + ' km' : '';
}

/* ── HTML del bloque SVG ── */
function rCarroceriaSVG(p) {
  _carroInyectarEstilos();
  carroInit(p);

  const hiddenInputs = PANELES.map(function(pair) {
    const k    = pair[0];
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    return '<input type="hidden" name="daño' + kCap + '" id="sv_daño' + kCap + '" value="' + (p['daño' + kCap] || '') + '">'
         + '<input type="hidden" name="pct'  + kCap + '" id="sv_pct'  + kCap + '" value="' + (p['pct'  + kCap] || '') + '">';
  }).join('');

  const leyenda = Object.entries(CARRO_COLORES).map(function(e) {
    return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2)">'
      + '<div style="width:10px;height:10px;border-radius:50%;background:' + e[1] + '"></div>' + e[0] + '</div>';
  }).join('');

  return `
  <div class="hint-box" id="carro-section">
    <div class="hint-label">
      Carrocería — Estado por panel
      <span style="font-size:11px;font-weight:400;color:var(--text-3);margin-left:8px">
        MB=Microbollo &nbsp;RP=Repintado &nbsp;CH=Choque &nbsp;RY=Raya &nbsp;PC=Picado &nbsp;RJ=Rajado
      </span>
    </div>

    ${hiddenInputs}

    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:12px">${leyenda}</div>

    <div id="carro-wrap" style="position:relative;width:100%;max-width:380px;margin:0 auto 1rem">
      <svg viewBox="0 0 340 600" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        <rect width="340" height="600" fill="transparent"/>
        <path d="M108,22 Q170,10 232,22 L236,52 Q170,42 104,52 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
        <rect x="130" y="28" width="80" height="14" rx="3" fill="#222" stroke="#555" stroke-width=".5"/>
        <line x1="150" y1="28" x2="150" y2="42" stroke="#444" stroke-width=".5"/>
        <line x1="170" y1="28" x2="170" y2="42" stroke="#444" stroke-width=".5"/>
        <line x1="190" y1="28" x2="190" y2="42" stroke="#444" stroke-width=".5"/>
        <rect x="104" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
        <rect x="210" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
        <path d="M104,52 Q170,44 236,52 L240,170 Q200,178 170,178 Q140,178 100,170 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
        <path d="M120,60 Q170,54 220,60 L222,165 Q170,170 118,165 Z" fill="none" stroke="#444" stroke-width=".5" stroke-dasharray="3,3"/>
        <path d="M72,55 L104,52 L100,170 L72,175 Q58,165 55,140 L55,90 Q57,65 72,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <path d="M268,55 L236,52 L240,170 L268,175 Q282,165 285,140 L285,90 Q283,65 268,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="38" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="55" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="55" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <rect x="268" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="285" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="285" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <path d="M100,172 Q170,165 240,172 L236,235 Q170,242 104,235 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
        <path d="M115,178 Q170,173 225,178 L222,228 Q170,234 118,228Z" fill="none" stroke="#2a5a7a" stroke-width=".4" stroke-dasharray="2,2"/>
        <path d="M100,238 L104,235 L236,235 L240,238 L240,365 L236,368 L104,368 L100,365 Z" fill="#222" stroke="#555" stroke-width="1"/>
        <rect x="98" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
        <rect x="232" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
        <line x1="170" y1="238" x2="170" y2="365" stroke="#333" stroke-width=".5" stroke-dasharray="4,4"/>
        <rect x="110" y="244" width="120" height="118" rx="4" fill="none" stroke="#2a2a2a" stroke-width=".8"/>
        <rect x="56" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="60" y="295" width="16" height="5" rx="2" fill="#555"/>
        <rect x="58" y="260" width="38" height="80" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="60" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <rect x="242" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="264" y="295" width="16" height="5" rx="2" fill="#555"/>
        <rect x="244" y="260" width="38" height="80" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="246" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <path d="M56,258 L40,262 Q34,270 36,278 L56,278 Z" fill="#2a2a2a" stroke="#555" stroke-width=".8"/>
        <path d="M284,258 L300,262 Q306,270 304,278 L284,278 Z" fill="#2a2a2a" stroke="#555" stroke-width=".8"/>
        <rect x="56" y="370" width="42" height="118" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="60" y="415" width="16" height="5" rx="2" fill="#555"/>
        <rect x="58" y="382" width="38" height="72" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="60" y="376" width="34" height="52" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <rect x="242" y="370" width="42" height="118" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="264" y="415" width="16" height="5" rx="2" fill="#555"/>
        <rect x="244" y="382" width="38" height="72" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="246" y="376" width="34" height="52" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <path d="M72,488 L100,485 L104,368 L72,372 Q58,382 55,405 L55,460 Q57,480 72,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <path d="M268,488 L240,485 L236,368 L268,372 Q282,382 285,405 L285,460 Q283,480 268,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="38" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="55" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="55" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <rect x="268" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="285" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="285" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <path d="M100,368 Q170,375 240,368 L236,430 Q170,437 104,430 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
        <path d="M100,432 Q170,438 240,432 L236,490 Q170,498 104,490 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
        <path d="M118,438 Q170,433 222,438 L220,486 Q170,492 120,486Z" fill="none" stroke="#444" stroke-width=".5" stroke-dasharray="3,3"/>
        <path d="M104,490 Q170,500 236,490 L232,528 Q170,538 108,528 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
        <rect x="104" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
        <rect x="210" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
        <text x="170" y="7"   text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">FRENTE</text>
        <text x="170" y="598" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">TRASERA</text>
        <text x="8"   y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(-90,8,304)">IZQ</text>
        <text x="332" y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(90,332,304)">DER</text>
      </svg>

      <button type="button" class="carro-hp" id="chp-paraDelant"    style="top:1.6%; left:30%; width:40%; height:7%"    onclick="carroOpen('Paragolpes del.')"></button>
      <button type="button" class="carro-hp" id="chp-capo"          style="top:8.6%; left:29%; width:42%; height:19.5%" onclick="carroOpen('Cap\u00f3')"></button>
      <button type="button" class="carro-hp" id="chp-gdaDelIzq"     style="top:9%;   left:14%; width:14%; height:20%"   onclick="carroOpen('Gda. del. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaDelDer"     style="top:9%;   left:72%; width:14%; height:20%"   onclick="carroOpen('Gda. del. der.')"></button>
      <button type="button" class="carro-hp" id="chp-espejoIzq"     style="top:43%;  left:5%;  width:12%; height:6%"    onclick="carroOpen('Espejo izq.')"></button>
      <button type="button" class="carro-hp" id="chp-espejoDer"     style="top:43%;  left:83%; width:12%; height:6%"    onclick="carroOpen('Espejo der.')"></button>
      <button type="button" class="carro-hp" id="chp-techo"         style="top:39.5%;left:29%; width:42%; height:21.5%" onclick="carroOpen('Techo')"></button>
      <button type="button" class="carro-hp" id="chp-puertaDelIzq"  style="top:40%;  left:14%; width:14%; height:21%"   onclick="carroOpen('Puerta del. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaDelDer"  style="top:40%;  left:72%; width:14%; height:21%"   onclick="carroOpen('Puerta del. der.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaTrasIzq" style="top:61.5%;left:14%; width:14%; height:20%"   onclick="carroOpen('Puerta tras. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaTrasDer" style="top:61.5%;left:72%; width:14%; height:20%"   onclick="carroOpen('Puerta tras. der.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaTrasIzq"    style="top:62%;  left:14%; width:14%; height:21%"   onclick="carroOpen('Gda. tras. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaTrasDer"    style="top:62%;  left:72%; width:14%; height:21%"   onclick="carroOpen('Gda. tras. der.')"></button>
      <button type="button" class="carro-hp" id="chp-baul"          style="top:72%;  left:29%; width:42%; height:14.5%" onclick="carroOpen('Ba\u00fal')"></button>
      <button type="button" class="carro-hp" id="chp-paraTras"      style="top:81.5%;left:30%; width:40%; height:7%"    onclick="carroOpen('Paragolpes tras.')"></button>
    </div>

    <div id="carro-resumen" style="display:none;margin-top:8px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:6px;font-weight:600">Daños registrados</div>
      <div id="carro-resumen-list" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>

    <div class="fg2" style="margin-top:12px">
      <div class="fg">
        <label>% Desgaste carrocer&#237;a (general)</label>
        <input type="number" name="desgasteCarroceria" min="0" max="100"
               value="${p.desgasteCarroceria || ''}" placeholder="0-100">
      </div>
      <div class="fg">
        <label>Costo estimado Carrocer&#237;a ($)</label>
        <input type="number" name="costoCarroceria" min="0"
               value="${p.costoCarroceria || ''}" placeholder="$" oninput="recalcularCostoTotal()">
      </div>
    </div>
  </div>

  <div id="carro-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center">
    <div style="background:var(--bg,#1e1e1e);border:1px solid var(--border,#444);border-radius:12px;padding:1.25rem;width:300px;max-width:92vw">
      <div style="font-size:14px;font-weight:600;margin-bottom:1rem;color:var(--text,#eee)" id="carro-modal-title">Panel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem">
        <button type="button" class="carro-opt" data-c="MB" data-col="#639922" onclick="carroSelOpt(this)">• Microbollo</button>
        <button type="button" class="carro-opt" data-c="RP" data-col="#378ADD" onclick="carroSelOpt(this)">&#9650; Repintado</button>
        <button type="button" class="carro-opt" data-c="CH" data-col="#E24B4A" onclick="carroSelOpt(this)">&#10005; Choque</button>
        <button type="button" class="carro-opt" data-c="RY" data-col="#EF9F27" onclick="carroSelOpt(this)">&#9585; Raya</button>
        <button type="button" class="carro-opt" data-c="PC" data-col="#7F77DD" onclick="carroSelOpt(this)">P Picado</button>
        <button type="button" class="carro-opt" data-c="RJ" data-col="#D4537E" onclick="carroSelOpt(this)">R Rajado</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.8rem">
        <label style="font-size:12px;color:var(--text-2,#aaa);white-space:nowrap">% desgaste</label>
        <input type="number" id="carro-pct" min="0" max="100" value="0"
               style="width:70px;padding:6px 8px;border-radius:7px;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text,#eee);font-size:12px">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.1rem">
        <label style="font-size:12px;color:var(--text-2,#aaa);white-space:nowrap">Obs.</label>
        <input type="text" id="carro-obs" placeholder="Nota adicional..."
               style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text,#eee);font-size:12px">
      </div>
      <div style="display:flex;gap:8px">
        <button type="button" onclick="carroClose()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text-2,#aaa)">Cancelar</button>
        <button type="button" onclick="carroClear()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #E24B4A55;background:#E24B4A22;color:#e24b4a">Limpiar</button>
        <button type="button" onclick="carroSave()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:none;background:#378ADD;color:#fff;font-weight:600">Guardar</button>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN F — Declaración del propietario (pre-peritaje)
   ══════════════════════════════════════════════════════════════ */
function rSeccionF(p) {
  const sNA = (name, opts) => `<select name="${name}">${opts.map(o => `<option value="${o}"${p[name] === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select>`;

  return `
  <div class="hint-box" id="seccion-f-box">
    <div class="hint-label">
      F &#8212; Declaraci&#243;n del propietario
      <span style="font-size:11px;font-weight:400;color:var(--text-3);margin-left:8px">Completado por el due&#241;o del veh&#237;culo &mdash; todos los campos son opcionales</span>
    </div>

    <!-- Banner explicativo -->
    <div class="seccion-f-banner">
      <span class="seccion-f-banner-icon">&#128203;</span>
      <div>
        <strong style="color:var(--text,#eee);font-size:12px">Mensaje al propietario</strong><br>
        <span style="font-size:12px">
          Antes de realizar el peritaje, nos gustar&#237;a que nos cuentes un poco sobre el veh&#237;culo.
          Esta informaci&#243;n nos ayuda a tomar una decisi&#243;n m&#225;s r&#225;pida y transparente.
          Pod&#233;s completar s&#243;lo lo que sab&#233;s — no hay ninguna obligaci&#243;n.
        </span>
      </div>
    </div>

    <!-- Historial de servicios -->
    <div class="fg2" style="margin-bottom:4px">
      <div class="fg">
        <label>Historial de servicios</label>
        ${sNA('fHistorialServicios', ['', 'completo en libreta', 'parcial', 'sin historial', 'solo facturas'])}
      </div>
      <div class="fg">
        <label>Detalle del historial (opcional)</label>
        <input type="text" name="fHistorialObs"
               value="${esc(p.fHistorialObs || '')}"
               placeholder="Ej: service cada 10.000 km, &#250;ltimo en taller X...">
      </div>
    </div>

    <!-- Correas de distribución -->
    <div class="fg2" style="margin-bottom:4px">
      <div class="fg">
        <label>Correas de distribuci&#243;n <span style="font-size:10px;color:var(--text-3)">(si corresponde)</span></label>
        ${sNA('fCorreaDistrib', ['', 'al d&#237;a', 'vencida / a reemplazar', 'no corresponde', 'desconoce'])}
      </div>
      <div class="fg">
        <label>km / fecha del &#250;ltimo cambio</label>
        <input type="text" name="fCorreaDistribObs"
               value="${esc(p.fCorreaDistribObs || '')}"
               placeholder="Ej: 80.000 km / 2022...">
      </div>
    </div>

    <!-- Neumáticos -->
    <div class="fg3" style="margin-bottom:4px">
      <div class="fg">
        <label>Neum&#225;ticos — Estado</label>
        ${sNA('fNeumaticosEstado', ['', 'nuevo', 'buen estado', 'desgaste medio', 'a reemplazar'])}
      </div>
      <div class="fg">
        <label>Fecha / km de reemplazo</label>
        <input type="text" name="fNeumaticosReemplazo"
               value="${esc(p.fNeumaticosReemplazo || '')}"
               placeholder="Ej: 2023 / 60.000 km...">
      </div>
      <div class="fg">
        <label>Marca de neum&#225;ticos</label>
        <input type="text" name="fNneumaticosMarca"
               value="${esc(p.fNneumaticosMarca || '')}"
               placeholder="Ej: Bridgestone, Pirelli...">
      </div>
    </div>

    <!-- 1° dueño + parabrisas -->
    <div class="fg2" style="margin-bottom:4px">
      <div class="fg">
        <label>&#191;Es primer due&#241;o?</label>
        ${sNA('fPrimerDuenio', ['', 's&#237;, primer due&#241;o', 'segundo due&#241;o', 'm&#225;s de dos due&#241;os', 'desconoce'])}
      </div>
      <div class="fg">
        <label>Estado parabrisas y cristales</label>
        ${sNA('fParabrisas', ['', 'sin da&#241;os', 'peque&#241;as astillas', 'fisura/rajadura', 'reemplazado', 'da&#241;o visible'])}
      </div>
    </div>

    <!-- Nota libre del propietario -->
    <div class="fg" style="margin-top:8px">
      <label style="display:flex;align-items:center;gap:6px">
        <span>&#128221;</span>
        <span>&#191;Alg&#250;n detalle que quieras comentar antes del peritaje?</span>
        <span style="font-size:10px;color:var(--text-3);font-weight:400">(rayas, granizo, golpes, modificaciones, etc.)</span>
      </label>
      <textarea
        class="seccion-f-nota"
        name="fNotaPropietario"
        placeholder="Ej: Tiene una rayita en la puerta trasera derecha que me la hicieron en un estacionamiento. El capó tuvo granizo leve hace dos a&#241;os pero fue reparado..."
      >${esc(p.fNotaPropietario || '')}</textarea>
    </div>

    <!-- Costo estimado F -->
    <div class="fg2" style="margin-top:12px">
      <div class="fg"></div>
      <div class="fg">
        <label>Costo estimado F ($)</label>
        <input type="number" name="costoF" min="0"
               value="${p.costoF || ''}" placeholder="$" oninput="recalcularCostoTotal()">
      </div>
    </div>
  </div>`;
}

/* ── Guardar peritaje ── */
function savePeritaje(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c => c.id === selectedCarId);
  if (!car) return;

  const panelFields = PANELES.flatMap(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    return ['daño' + kCap, 'pct' + kCap];
  });

  const FIELDS = [
    'fecha',
    'gatoLlave', 'ruedaAux', 'matafuego', 'balizas',
    'antirrobos', 'alarma', 'segundaLlave', 'manualUnidad', 'codigosRadio',
    'carpetaDoc', 'audio', 'calefaccion', 'ac', 'vidriosElec',
    'cierreCentral', 'cinturon', 'frenoMano',
    'obsExt', 'desgasteCarroceria', 'costoA',
    ...panelFields,
    'costoCarroceria',
    'motor', 'cajaAT', 'embrague', 'cuatroX4', 'diferencial', 'mantenimiento', 'obsMotor', 'costoB',
    'frenos', 'frenosTraseros', 'trenDelant', 'amortiguadores', 'direccion', 'neumaticos', 'obsC', 'costoC',
    'abs', 'motorLuz', 'airbag', 'transLuz', 'bateria',
    'dtcCode1', 'dtcCode2', 'dtcCode3', 'dtcOtros', 'obsD', 'costoD',
    'butacaIzq', 'butacaDer', 'asientoTras', 'tapizPuertas', 'tapizTecho', 'bandejaT', 'obsE', 'costoE',
    // ── Sección F ──
    'fHistorialServicios', 'fHistorialObs',
    'fCorreaDistrib', 'fCorreaDistribObs',
    'fNeumaticosEstado', 'fNeumaticosReemplazo', 'fNneumaticosMarca',
    'fPrimerDuenio', 'fParabrisas',
    'fNotaPropietario', 'costoF',
    // ── Total ──
    'costoTotal', 'peritador', 'resenaTexto',
  ];

  if (!car.peritaje) car.peritaje = {};
  FIELDS.forEach(name => {
    if (!f[name]) return;
    const el  = f[name];
    const val = el.type === 'number'   ? (el.value ? +el.value : null)
               : el.type === 'checkbox' ? el.checked
               : el.value;
    car.peritaje[name] = val;
  });

  if (car.peritaje.dtcCode && !car.peritaje.dtcCode1) {
    car.peritaje.dtcCode1 = car.peritaje.dtcCode;
  }

  car.peritaje.peritadoPor   = getSession().nombre;
  car.peritaje.fechaPeritaje = todayISO();

  CRM.savePeritaje({ vehiculoId: car.id, ...car.peritaje })
    .then(() => {
      toast('Peritaje guardado correctamente', 'success');
      // ── FIX: actualizar S.cars localmente para que persista sin recargar ──
      const idx = S.cars.findIndex(c => c.id === car.id);
      if (idx !== -1) S.cars[idx].peritaje = { ...car.peritaje };
      selectedCarId = null;
      render();
    })
    .catch(err => toast('Error al guardar peritaje: ' + err.message, 'error'));
}

/* ── Formulario de peritaje completo ── */
function rPeritajeForm(car) {
  const p    = car.peritaje || {};
  const s    = (name, opts) => `<select name="${name}">${opts.map(o => `<option value="${o}"${p[name] === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select>`;
  const OF   = ['', 'ok', 'falta'];
  const OFf  = ['', 'ok', 'falta', 'falla'];
  const Ok   = ['', 'ok', 'falla'];
  const OkNA = ['', 'ok', 'falla', 'N/A'];

  const kmStr = _fmtKm(car);

  return `
  <div class="form-section">
    <div class="print-header" style="display:none">
      <div class="print-header-text">
        <strong>GRUPO DENTE AUTOMOTORES</strong><br>
        <span style="font-size:11px;color:#444">Peritaje de vehículo</span>
      </div>
      <div style="margin-left:auto;text-align:right;line-height:1.4">
        <strong style="font-size:13px">${esc(car.brand)} ${esc(car.model)} ${car.year}</strong><br>
        ${car.patente ? '<span style="font-size:11px;color:#555">[' + esc(car.patente) + ']</span>' : ''}${car.km ? '<span style="font-size:11px;color:#555"> · ' + (+car.km).toLocaleString('es-AR') + ' km</span>' : ''}
        ${p.peritador ? '<span style="font-size:10px;color:#777">Peritador: ' + esc(p.peritador) + '</span>' : ''}
        ${p.fecha ? '<span style="font-size:10px;color:#777"> · ' + p.fecha + '</span>' : ''}
      </div>
    </div>
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:8px">
      <div class="form-title" style="margin:0">Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}${kmStr}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button type="button" id="print-peritaje-btn" class="btn sm no-print"
                onclick="window.print()"
                style="display:flex;align-items:center;gap:5px">
          &#128438; Imprimir
        </button>
        <button type="button" class="btn sm" onclick="selectedCarId=null;render()">&#8592; Volver a lista</button>
      </div>
    </div>

    <form onsubmit="savePeritaje(event)">
      <div class="peritaje-print-cols">

      <div class="hint-box">
        <div class="hint-label">Datos del peritaje</div>
        <div class="fg3">
          <div class="fg">
            <label>Fecha</label>
            <input type="date" name="fecha" value="${p.fecha || ''}">
          </div>
          <div class="fg">
            <label>Peritador</label>
            <input type="text" name="peritador" value="${esc(p.peritador || getSession().nombre)}" placeholder="Nombre del peritador">
          </div>
          <div class="fg">
            <label>Comentario de la reseña</label>
            <input type="text" name="resenaTexto" placeholder="Comentario (opcional)..." value="${esc(p.resenaTexto || '')}">
          </div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">A — Equipamiento y accesorios</div>
        <div class="fg4">
          <div class="fg"><label>Gato y llave</label>${s('gatoLlave', OF)}</div>
          <div class="fg"><label>Rueda auxiliar</label>${s('ruedaAux', OF)}</div>
          <div class="fg"><label>Matafuego</label>${s('matafuego', OF)}</div>
          <div class="fg"><label>Balizas</label>${s('balizas', OF)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Segunda llave</label>${s('segundaLlave', OF)}</div>
          <div class="fg"><label>Manual unidad</label>${s('manualUnidad', OF)}</div>
          <div class="fg"><label>C&#243;digos de radio</label>${s('codigosRadio', OF)}</div>
          <div class="fg"><label>Carpeta / documentaci&#243;n</label>${s('carpetaDoc', OF)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Antirrobos</label>${s('antirrobos', OF)}</div>
          <div class="fg"><label>Alarma</label>${s('alarma', OFf)}</div>
          <div class="fg"><label>Audio</label>${s('audio', OFf)}</div>
          <div class="fg"><label>Calefacci&#243;n</label>${s('calefaccion', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Aire acondicionado</label>${s('ac', OkNA)}</div>
          <div class="fg"><label>Vidrios el&#233;ctricos</label>${s('vidriosElec', OkNA)}</div>
          <div class="fg"><label>Cierre centralizado</label>${s('cierreCentral', Ok)}</div>
          <div class="fg"><label>Cintur&#243;n seguridad</label>${s('cinturon', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Freno de mano</label>${s('frenoMano', Ok)}</div>
          <div class="fg"></div><div class="fg"></div><div class="fg"></div>
        </div>
        <div class="fg"><label>Observaciones</label><textarea name="obsExt">${esc(p.obsExt || '')}</textarea></div>
        <div class="fg2">
          <div class="fg"></div>
          <div class="fg"><label>Costo estimado A ($)</label><input type="number" name="costoA" min="0" value="${p.costoA || ''}" placeholder="$" oninput="recalcularCostoTotal()"></div>
        </div>
      </div>

      ${rCarroceriaSVG(p)}

      <div class="hint-box">
        <div class="hint-label">B — Motor y transmisi&#243;n</div>
        <div class="fg3">
          <div class="fg"><label>Motor</label>${s('motor', ['', 'ok', 'falla', 'observar'])}</div>
          <div class="fg"><label>Caja AT</label>${s('cajaAT', OkNA)}</div>
          <div class="fg"><label>Embrague</label>${s('embrague', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Caja MT</label>${s('cuatroX4', OkNA)}</div>
          <div class="fg"><label>4X4</label>${s('diferencial', OkNA)}</div>
          <div class="fg"><label>&#218;ltimo mantenimiento</label><input type="text" name="mantenimiento" value="${esc(p.mantenimiento || '')}" placeholder="km o fecha"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones motor</label><textarea name="obsMotor">${esc(p.obsMotor || '')}</textarea></div>
          <div class="fg"><label>Costo estimado B ($)</label><input type="number" name="costoB" min="0" value="${p.costoB || ''}" placeholder="$" oninput="recalcularCostoTotal()"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">C — Frenos, tren delantero y suspensi&#243;n</div>
        <div class="fg3">
          <div class="fg"><label>Frenos</label>${s('frenos', ['', 'ok', 'falla', 'desgaste'])}</div>
          <div class="fg"><label>Tren delantero</label>${s('trenDelant', ['', 'ok', 'falla', 'desgaste'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Amortiguadores</label>${s('amortiguadores', ['', 'ok', 'falla', 'desgaste'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones frenos/tren</label><textarea name="obsC">${esc(p.obsC || '')}</textarea></div>
          <div class="fg"><label>Costo estimado C ($)</label><input type="number" name="costoC" min="0" value="${p.costoC || ''}" placeholder="$" oninput="recalcularCostoTotal()"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">D — Sistema el&#233;ctrico y diagn&#243;stico DTC</div>
        <div class="fg4">
          <div class="fg"><label>ABS</label>${s('abs', Ok)}</div>
          <div class="fg"><label>Luz motor</label>${s('motorLuz', Ok)}</div>
          <div class="fg"><label>Airbag</label>${s('airbag', Ok)}</div>
          <div class="fg"><label>Trans. autom&#225;tica</label>${s('transLuz', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Bater&#237;a</label>${s('bateria', ['', 'ok', 'falla', 'd&#233;bil'])}</div>
          <div class="fg"><label>C&#243;digo falla 1</label><input type="text" name="dtcCode1" value="${esc(p.dtcCode1 || p.dtcCode || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>C&#243;digo falla 2</label><input type="text" name="dtcCode2" value="${esc(p.dtcCode2 || '')}" placeholder="P0XXX, C0XXX..."></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>C&#243;digo falla 3</label><input type="text" name="dtcCode3" value="${esc(p.dtcCode3 || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>Otros c&#243;digos</label><input type="text" name="dtcOtros" value="${esc(p.dtcOtros || '')}" placeholder="Otros..."></div>
          <div class="fg"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones el&#233;ctrico</label><textarea name="obsD">${esc(p.obsD || '')}</textarea></div>
          <div class="fg"><label>Costo estimado D ($)</label><input type="number" name="costoD" min="0" value="${p.costoD || ''}" placeholder="$" oninput="recalcularCostoTotal()"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">E — Interior y tapizado</div>
        <div class="fg3">
          <div class="fg"><label>Butaca izquierda.</label>${s('butacaIzq', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Butaca derecha.</label>${s('butacaDer', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Asiento trasero</label>${s('asientoTras', ['', 'ok', 'roto', 'manchado'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tapizado puertas</label>${s('tapizPuertas', ['', 'ok', 'roto', 'desgaste'])}</div>
          <div class="fg"><label>Tapizado techo</label>${s('tapizTecho', ['', 'ok', 'manchado', 'ca&#237;do'])}</div>
          <div class="fg"><label>Bandeja trasera</label>${s('bandejaT', ['', 'ok', 'falta', 'roto'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones interior</label><textarea name="obsE">${esc(p.obsE || '')}</textarea></div>
          <div class="fg"><label>Costo estimado E ($)</label><input type="number" name="costoE" min="0" value="${p.costoE || ''}" placeholder="$" oninput="recalcularCostoTotal()"></div>
        </div>
      </div>

      ${rSeccionF(p)}

      <div class="hint-box" id="costo-total-box">
        <div class="hint-label">Resumen de costos</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:12px;font-size:12px;color:var(--text-2)">
          <span>A: <strong>$&#8203;${fmtARS(p.costoA) || '—'}</strong></span>
          <span>Carr.: <strong>$&#8203;${fmtARS(p.costoCarroceria) || '—'}</strong></span>
          <span>B: <strong>$&#8203;${fmtARS(p.costoB) || '—'}</strong></span>
          <span>C: <strong>$&#8203;${fmtARS(p.costoC) || '—'}</strong></span>
          <span>D: <strong>$&#8203;${fmtARS(p.costoD) || '—'}</strong></span>
          <span>E: <strong>$&#8203;${fmtARS(p.costoE) || '—'}</strong></span>
          <span>F: <strong>$&#8203;${fmtARS(p.costoF) || '—'}</strong></span>
        </div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:10px 14px;border-radius:8px;background:var(--bg2,#2a2a2a);border:1px solid var(--border,#444)">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:2px">Costo total reparaciones</div>
            <div id="costo-total-display" style="font-size:22px;font-weight:700;color:var(--text,#eee)">
              ${(()=>{ const sv=['costoA','costoCarroceria','costoB','costoC','costoD','costoE','costoF'].reduce((a,k)=>a+(+p[k]||0),0); return sv>0?'$ '+fmtARS(sv):'—'; })()}
            </div>
          </div>
        </div>
        <input type="hidden" name="costoTotal" value="${(()=>{ return ['costoA','costoCarroceria','costoB','costoC','costoD','costoE','costoF'].reduce((a,k)=>a+(+p[k]||0),0)||''; })()}">
      </div>

      </div><!-- /peritaje-print-cols -->

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">
        <button type="button" class="btn no-print" onclick="selectedCarId=null;render()">&#8592; Cancelar</button>
        <button type="submit" class="btn primary no-print">Guardar peritaje</button>
      </div>
    </form>
  </div>`;
}

/* ── Tarjeta compacta en lista (con peritaje cargado) ── */
function rPeritajeCardCompacta(car) {
  const p = car.peritaje || {};
  const total = p.costoTotal ? '$' + (+p.costoTotal).toLocaleString('es-AR') : null;
  const kmStr = _fmtKm(car);
  const panelesConDaño = PANELES.filter(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d = p['daño' + kCap];
    return d && d !== 'ok';
  });
  // Chips de estado rápido
  const chips = [];
  if (p.motor && p.motor !== 'ok')     chips.push(`<span class="badge bg-red" style="font-size:10px">Motor: ${p.motor}</span>`);
  if (p.frenos && p.frenos !== 'ok')   chips.push(`<span class="badge bg-red" style="font-size:10px">Frenos: ${p.frenos}</span>`);
  if (p.abs && p.abs !== 'ok')         chips.push(`<span class="badge bg-red" style="font-size:10px">ABS: ${p.abs}</span>`);
  if (panelesConDaño.length > 0)       chips.push(`<span class="badge bg-red" style="font-size:10px">Carrocería: ${panelesConDaño.length} panel${panelesConDaño.length > 1 ? 'es' : ''}</span>`);
  if (chips.length === 0)              chips.push(`<span class="badge bg-green" style="font-size:10px">Sin observaciones</span>`);

  return `
  <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <div style="flex:1;min-width:0">
      <div style="font-weight:600">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}${kmStr}</div>
      <div style="font-size:12px;color:var(--text-3);margin-bottom:5px">${car.tipo} · ${car.trans}${p.fecha ? ' · ' + p.fecha : ''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        <span class="badge bg-gold" style="font-size:10px">✓ Peritado</span>
        ${total ? `<span class="badge bg-red" style="font-size:10px">Rep: ${total}</span>` : ''}
        ${chips.join('')}
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
      <button class="btn sm" onclick="abrirResumenPeritaje('${car.id}')">&#128269; Ver peritaje</button>
      <button class="btn sm primary" onclick="selectedCarId='${car.id}';render()">&#9998; Editar</button>
    </div>
  </div>`;
}

/* ── Vista de solo lectura — igual al formulario pero disabled ── */
function rPeritajeReadOnly(car) {
  const p   = car.peritaje || {};
  const fmtARS2 = (v) => v ? '$ ' + (+v).toLocaleString('es-AR') : '';
  const kmStr = _fmtKm(car);

  /* select solo lectura */
  const sr = (val) => `<input type="text" value="${esc(val || '—')}" disabled>`;
  /* input solo lectura */
  const ir = (val, placeholder) => `<input type="text" value="${esc(val || '')}" placeholder="${placeholder || ''}" disabled>`;
  /* textarea solo lectura */
  const tr = (val) => `<textarea disabled style="resize:none">${esc(val || '')}</textarea>`;
  /* costo solo lectura */
  const cr = (val) => `<input type="text" value="${val ? fmtARS2(val) : ''}" placeholder="$" disabled>`;

  /* Paneles carrocería solo lectura */
  const panelesConDaño = PANELES.filter(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d = p['daño' + kCap];
    return d && d !== 'ok';
  });

  const leyenda = Object.entries(CARRO_COLORES).map(([code, col]) =>
    `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2)">
      <div style="width:10px;height:10px;border-radius:50%;background:${col}"></div>${code}
    </div>`
  ).join('');

  /* SVG carrocería con hotspots coloreados según datos */
  const svgBtns = PANELES.map(([k, label]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d    = p['daño' + kCap];
    const pct  = p['pct'  + kCap];
    const col  = d && CARRO_COLORES[d] ? CARRO_COLORES[d] : null;
    const btnId = 'ro-chp-' + k;
    const style = col
      ? `background:${col}55;border-color:${col};color:${col}`
      : 'background:rgba(128,128,128,0.06);border-color:transparent;color:transparent';
    const text  = col ? (d + (pct ? ' ' + pct + '%' : '')) : '';
    const positions = {
      paraDelant:    'top:1.6%;left:30%;width:40%;height:7%',
      capo:          'top:8.6%;left:29%;width:42%;height:19.5%',
      gdaDelIzq:     'top:9%;left:14%;width:14%;height:20%',
      gdaDelDer:     'top:9%;left:72%;width:14%;height:20%',
      espejoIzq:     'top:43%;left:5%;width:12%;height:6%',
      espejoDer:     'top:43%;left:83%;width:12%;height:6%',
      techo:         'top:39.5%;left:29%;width:42%;height:21.5%',
      puertaDelIzq:  'top:40%;left:14%;width:14%;height:21%',
      puertaDelDer:  'top:40%;left:72%;width:14%;height:21%',
      puertaTrasIzq: 'top:61.5%;left:14%;width:14%;height:20%',
      puertaTrasDer: 'top:61.5%;left:72%;width:14%;height:20%',
      gdaTrasIzq:    'top:62%;left:14%;width:14%;height:21%',
      gdaTrasDer:    'top:62%;left:72%;width:14%;height:21%',
      baul:          'top:72%;left:29%;width:42%;height:14.5%',
      paraTras:      'top:81.5%;left:30%;width:40%;height:7%',
    };
    const pos = positions[k] || '';
    return `<div class="carro-hp" id="${btnId}" style="${pos};${style};cursor:default">${text}</div>`;
  }).join('');

  const costoTotal = ['costoA','costoCarroceria','costoB','costoC','costoD','costoE','costoF']
    .reduce((a, k) => a + (+p[k] || 0), 0);

  return `
  <div class="form-section">
    <!-- Encabezado -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:8px">
      <div class="form-title" style="margin:0">Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}${kmStr}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button type="button" class="btn sm" onclick="window.print()">&#128438; Imprimir</button>
        <button type="button" class="btn sm primary" onclick="viewingCarId=null;selectedCarId='${car.id}';render()">&#9998; Editar peritaje</button>
        <button type="button" class="btn sm" onclick="viewingCarId=null;render()">&#8592; Volver a lista</button>
      </div>
    </div>

    <div class="peritaje-print-cols">

    <!-- Datos del peritaje -->
    <div class="hint-box">
      <div class="hint-label">Datos del peritaje</div>
      <div class="fg3">
        <div class="fg"><label>Fecha</label>${ir(p.fecha)}</div>
        <div class="fg"><label>Peritador</label>${ir(p.peritador || p.peritadoPor)}</div>
        <div class="fg"><label>Comentario de la reseña</label>${ir(p.resenaTexto)}</div>
      </div>
    </div>

    <!-- A — Equipamiento -->
    <div class="hint-box">
      <div class="hint-label">A — Equipamiento y accesorios</div>
      <div class="fg4">
        <div class="fg"><label>Gato y llave</label>${sr(p.gatoLlave)}</div>
        <div class="fg"><label>Rueda auxiliar</label>${sr(p.ruedaAux)}</div>
        <div class="fg"><label>Matafuego</label>${sr(p.matafuego)}</div>
        <div class="fg"><label>Balizas</label>${sr(p.balizas)}</div>
      </div>
      <div class="fg4">
        <div class="fg"><label>Segunda llave</label>${sr(p.segundaLlave)}</div>
        <div class="fg"><label>Manual unidad</label>${sr(p.manualUnidad)}</div>
        <div class="fg"><label>Códigos de radio</label>${sr(p.codigosRadio)}</div>
        <div class="fg"><label>Carpeta / documentación</label>${sr(p.carpetaDoc)}</div>
      </div>
      <div class="fg4">
        <div class="fg"><label>Antirrobos</label>${sr(p.antirrobos)}</div>
        <div class="fg"><label>Alarma</label>${sr(p.alarma)}</div>
        <div class="fg"><label>Audio</label>${sr(p.audio)}</div>
        <div class="fg"><label>Calefacción</label>${sr(p.calefaccion)}</div>
      </div>
      <div class="fg4">
        <div class="fg"><label>Aire acondicionado</label>${sr(p.ac)}</div>
        <div class="fg"><label>Vidrios eléctricos</label>${sr(p.vidriosElec)}</div>
        <div class="fg"><label>Cierre centralizado</label>${sr(p.cierreCentral)}</div>
        <div class="fg"><label>Cinturón seguridad</label>${sr(p.cinturon)}</div>
      </div>
      <div class="fg4">
        <div class="fg"><label>Freno de mano</label>${sr(p.frenoMano)}</div>
        <div class="fg"></div><div class="fg"></div><div class="fg"></div>
      </div>
      <div class="fg"><label>Observaciones</label>${tr(p.obsExt)}</div>
      <div class="fg2">
        <div class="fg"></div>
        <div class="fg"><label>Costo estimado A ($)</label>${cr(p.costoA)}</div>
      </div>
    </div>

    <!-- Carrocería -->
    <div class="hint-box" id="carro-section">
      <div class="hint-label">
        Carrocería — Estado por panel
        <span style="font-size:11px;font-weight:400;color:var(--text-3);margin-left:8px">MB=Microbollo &nbsp;RP=Repintado &nbsp;CH=Choque &nbsp;RY=Raya &nbsp;PC=Picado &nbsp;RJ=Rajado</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:12px">${leyenda}</div>
      <div style="position:relative;width:100%;max-width:380px;margin:0 auto 1rem">
        <svg viewBox="0 0 340 600" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
          <rect width="340" height="600" fill="transparent"/>
          <path d="M108,22 Q170,10 232,22 L236,52 Q170,42 104,52 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
          <rect x="130" y="28" width="80" height="14" rx="3" fill="#222" stroke="#555" stroke-width=".5"/>
          <line x1="150" y1="28" x2="150" y2="42" stroke="#444" stroke-width=".5"/>
          <line x1="170" y1="28" x2="170" y2="42" stroke="#444" stroke-width=".5"/>
          <line x1="190" y1="28" x2="190" y2="42" stroke="#444" stroke-width=".5"/>
          <rect x="104" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
          <rect x="210" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
          <path d="M104,52 Q170,44 236,52 L240,170 Q200,178 170,178 Q140,178 100,170 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
          <path d="M72,55 L104,52 L100,170 L72,175 Q58,165 55,140 L55,90 Q57,65 72,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <path d="M268,55 L236,52 L240,170 L268,175 Q282,165 285,140 L285,90 Q283,65 268,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <rect x="38" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
          <ellipse cx="55" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
          <ellipse cx="55" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
          <rect x="268" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
          <ellipse cx="285" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
          <ellipse cx="285" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
          <path d="M100,172 Q170,165 240,172 L236,235 Q170,242 104,235 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
          <path d="M100,238 L104,235 L236,235 L240,238 L240,365 L236,368 L104,368 L100,365 Z" fill="#222" stroke="#555" stroke-width="1"/>
          <rect x="98" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
          <rect x="232" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
          <line x1="170" y1="238" x2="170" y2="365" stroke="#333" stroke-width=".5" stroke-dasharray="4,4"/>
          <rect x="56" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <rect x="60" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
          <rect x="242" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <rect x="246" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
          <path d="M72,488 L100,485 L104,368 L72,372 Q58,382 55,405 L55,460 Q57,480 72,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <path d="M268,488 L240,485 L236,368 L268,372 Q282,382 285,405 L285,460 Q283,480 268,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <rect x="38" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
          <ellipse cx="55" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
          <ellipse cx="55" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
          <rect x="268" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
          <ellipse cx="285" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
          <ellipse cx="285" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
          <path d="M100,368 Q170,375 240,368 L236,430 Q170,437 104,430 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
          <path d="M100,432 Q170,438 240,432 L236,490 Q170,498 104,490 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
          <path d="M104,490 Q170,500 236,490 L232,528 Q170,538 108,528 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
          <rect x="104" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
          <rect x="210" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
          <text x="170" y="7"   text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">FRENTE</text>
          <text x="170" y="598" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">TRASERA</text>
          <text x="8"   y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(-90,8,304)">IZQ</text>
          <text x="332" y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(90,332,304)">DER</text>
        </svg>
        ${svgBtns}
      </div>
      ${panelesConDaño.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${panelesConDaño.map(([k, label]) => {
          const kCap = k.charAt(0).toUpperCase() + k.slice(1);
          const d = p['daño' + kCap]; const pct = p['pct' + kCap];
          const col = CARRO_COLORES[d] || '#888';
          return `<span class="badge" style="font-size:11px;border:1px solid ${col}66;background:${col}22;color:${col}">${label}: ${d}${pct ? ' ' + pct + '%' : ''}</span>`;
        }).join('')}
      </div>` : ''}
      <div class="fg2">
        <div class="fg"><label>% Desgaste carrocería (general)</label>${ir(p.desgasteCarroceria, '0-100')}</div>
        <div class="fg"><label>Costo estimado Carrocería ($)</label>${cr(p.costoCarroceria)}</div>
      </div>
    </div>

    <!-- B — Motor -->
    <div class="hint-box">
      <div class="hint-label">B — Motor y transmisión</div>
      <div class="fg3">
        <div class="fg"><label>Motor</label>${sr(p.motor)}</div>
        <div class="fg"><label>Caja AT</label>${sr(p.cajaAT)}</div>
        <div class="fg"><label>Embrague</label>${sr(p.embrague)}</div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Caja MT</label>${sr(p.cuatroX4)}</div>
        <div class="fg"><label>4X4</label>${sr(p.diferencial)}</div>
        <div class="fg"><label>Último mantenimiento</label>${ir(p.mantenimiento, 'km o fecha')}</div>
      </div>
      <div class="fg2">
        <div class="fg"><label>Observaciones motor</label>${tr(p.obsMotor)}</div>
        <div class="fg"><label>Costo estimado B ($)</label>${cr(p.costoB)}</div>
      </div>
    </div>

    <!-- C — Frenos -->
    <div class="hint-box">
      <div class="hint-label">C — Frenos, tren delantero y suspensión</div>
      <div class="fg3">
        <div class="fg"><label>Frenos</label>${sr(p.frenos)}</div>
        <div class="fg"><label>Tren delantero</label>${sr(p.trenDelant)}</div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Amortiguadores</label>${sr(p.amortiguadores)}</div>
      </div>
      <div class="fg2">
        <div class="fg"><label>Observaciones frenos/tren</label>${tr(p.obsC)}</div>
        <div class="fg"><label>Costo estimado C ($)</label>${cr(p.costoC)}</div>
      </div>
    </div>

    <!-- D — Eléctrico -->
    <div class="hint-box">
      <div class="hint-label">D — Sistema eléctrico y diagnóstico DTC</div>
      <div class="fg4">
        <div class="fg"><label>ABS</label>${sr(p.abs)}</div>
        <div class="fg"><label>Luz motor</label>${sr(p.motorLuz)}</div>
        <div class="fg"><label>Airbag</label>${sr(p.airbag)}</div>
        <div class="fg"><label>Trans. automática</label>${sr(p.transLuz)}</div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Batería</label>${sr(p.bateria)}</div>
        <div class="fg"><label>Código falla 1</label>${ir(p.dtcCode1 || p.dtcCode, 'P0XXX...')}</div>
        <div class="fg"><label>Código falla 2</label>${ir(p.dtcCode2, 'P0XXX...')}</div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Código falla 3</label>${ir(p.dtcCode3, 'P0XXX...')}</div>
        <div class="fg"><label>Otros códigos</label>${ir(p.dtcOtros, 'Otros...')}</div>
        <div class="fg"></div>
      </div>
      <div class="fg2">
        <div class="fg"><label>Observaciones eléctrico</label>${tr(p.obsD)}</div>
        <div class="fg"><label>Costo estimado D ($)</label>${cr(p.costoD)}</div>
      </div>
    </div>

    <!-- E — Interior -->
    <div class="hint-box">
      <div class="hint-label">E — Interior y tapizado</div>
      <div class="fg3">
        <div class="fg"><label>Butaca izquierda</label>${sr(p.butacaIzq)}</div>
        <div class="fg"><label>Butaca derecha</label>${sr(p.butacaDer)}</div>
        <div class="fg"><label>Asiento trasero</label>${sr(p.asientoTras)}</div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Tapizado puertas</label>${sr(p.tapizPuertas)}</div>
        <div class="fg"><label>Tapizado techo</label>${sr(p.tapizTecho)}</div>
        <div class="fg"><label>Bandeja trasera</label>${sr(p.bandejaT)}</div>
      </div>
      <div class="fg2">
        <div class="fg"><label>Observaciones interior</label>${tr(p.obsE)}</div>
        <div class="fg"><label>Costo estimado E ($)</label>${cr(p.costoE)}</div>
      </div>
    </div>

    <!-- F — Declaración propietario -->
    ${(p.fHistorialServicios || p.fCorreaDistrib || p.fNeumaticosEstado || p.fPrimerDuenio || p.fParabrisas || p.fNotaPropietario || p.costoF) ? `
    <div class="hint-box" id="seccion-f-box">
      <div class="hint-label">F — Declaración del propietario</div>
      <div class="fg2" style="margin-bottom:4px">
        <div class="fg"><label>Historial de servicios</label>${sr(p.fHistorialServicios)}</div>
        <div class="fg"><label>Detalle del historial</label>${ir(p.fHistorialObs)}</div>
      </div>
      <div class="fg2" style="margin-bottom:4px">
        <div class="fg"><label>Correas de distribución</label>${sr(p.fCorreaDistrib)}</div>
        <div class="fg"><label>km / fecha del último cambio</label>${ir(p.fCorreaDistribObs)}</div>
      </div>
      <div class="fg3" style="margin-bottom:4px">
        <div class="fg"><label>Neumáticos — Estado</label>${sr(p.fNeumaticosEstado)}</div>
        <div class="fg"><label>Fecha / km de reemplazo</label>${ir(p.fNeumaticosReemplazo)}</div>
        <div class="fg"><label>Marca de neumáticos</label>${ir(p.fNneumaticosMarca)}</div>
      </div>
      <div class="fg2" style="margin-bottom:4px">
        <div class="fg"><label>¿Es primer dueño?</label>${sr(p.fPrimerDuenio)}</div>
        <div class="fg"><label>Estado parabrisas y cristales</label>${sr(p.fParabrisas)}</div>
      </div>
      ${p.fNotaPropietario ? `
      <div class="fg" style="margin-top:8px">
        <label>📝 Nota del propietario</label>
        <textarea disabled style="resize:none;background:rgba(239,159,39,0.05);border-color:rgba(239,159,39,0.35)">${esc(p.fNotaPropietario)}</textarea>
      </div>` : ''}
      <div class="fg2" style="margin-top:12px">
        <div class="fg"></div>
        <div class="fg"><label>Costo estimado F ($)</label>${cr(p.costoF)}</div>
      </div>
    </div>` : ''}

    <!-- Resumen de costos -->
    <div class="hint-box" id="costo-total-box">
      <div class="hint-label">Resumen de costos</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-bottom:12px;font-size:12px;color:var(--text-2)">
        ${p.costoA           ? `<span>A: <strong>$${(+p.costoA).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoCarroceria  ? `<span>Carr.: <strong>$${(+p.costoCarroceria).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoB           ? `<span>B: <strong>$${(+p.costoB).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoC           ? `<span>C: <strong>$${(+p.costoC).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoD           ? `<span>D: <strong>$${(+p.costoD).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoE           ? `<span>E: <strong>$${(+p.costoE).toLocaleString('es-AR')}</strong></span>` : ''}
        ${p.costoF           ? `<span>F: <strong>$${(+p.costoF).toLocaleString('es-AR')}</strong></span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:10px 14px;border-radius:8px;background:var(--bg2,#2a2a2a);border:1px solid var(--border,#444)">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:2px">Costo total reparaciones</div>
          <div style="font-size:22px;font-weight:700;color:var(--text,#eee)">
            ${costoTotal > 0 ? '$ ' + costoTotal.toLocaleString('es-AR') : '—'}
          </div>
        </div>
      </div>
    </div>

    </div><!-- /peritaje-print-cols -->

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">
      <button type="button" class="btn" onclick="viewingCarId=null;render()">&#8592; Volver a lista</button>
      <button type="button" class="btn primary" onclick="viewingCarId=null;selectedCarId='${car.id}';render()">&#9998; Editar peritaje</button>
    </div>
  </div>`;
}

/* ── Abrir resumen (usa vista de página completa) ── */
function abrirResumenPeritaje(carId) {
  viewingCarId  = carId;
  selectedCarId = null;
  render();
}


function _peritajeSearchUpdate(val) {
  peritajeSearch = val;
  const clearBtn = document.getElementById('peritaje-search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
  _renderPeritajeCards();
}

function _peritajeSearchClear() {
  peritajeSearch = '';
  const inp = document.getElementById('peritaje-search-input');
  if (inp) { inp.value = ''; inp.focus(); }
  const clearBtn = document.getElementById('peritaje-search-clear');
  if (clearBtn) clearBtn.classList.remove('visible');
  _renderPeritajeCards();
}

function _peritajeMatch(car) {
  if (!peritajeSearch) return true;
  const q = peritajeSearch.toLowerCase();
  return (
    (car.brand   || '').toLowerCase().includes(q) ||
    (car.model   || '').toLowerCase().includes(q) ||
    (car.patente || '').toLowerCase().includes(q) ||
    (car.color   || '').toLowerCase().includes(q) ||
    String(car.year || '').includes(q)
  );
}

/* ── Render principal ── */
function render() {
  _inyectarEstilosBuscadorPeritaje();

  // Vista solo lectura
  if (viewingCarId) {
    const car = S.cars.find(c => c.id === viewingCarId);
    if (!car) { viewingCarId = null; render(); return; }
    document.getElementById('view').innerHTML = rPeritajeReadOnly(car);
    return;
  }

  if (selectedCarId) {
    const car = S.cars.find(c => c.id === selectedCarId);
    if (!car) { selectedCarId = null; render(); return; }
    document.getElementById('view').innerHTML = rPeritajeForm(car);
    carroRenderBtns();
    recalcularCostoTotal();
    return;
  }

  let html = `
  <div class="section-head">
    <div class="section-title">Peritaje de vehículos</div>
    <span class="badge bg-gold">${S.cars.filter(c => c.peritaje && Object.keys(c.peritaje).length > 0).length} peritados de ${S.cars.length}</span>
  </div>
  <div style="font-size:13px;color:var(--text-3);margin-bottom:1rem">Seleccioná un vehículo para cargar o editar su peritaje.</div>`;

  if (S.cars.length === 0) {
    html += `
  <div class="empty">
    <div class="empty-icon">📋</div>
    <strong>Sin vehículos en stock</strong>
    <div style="font-size:13px;margin-top:4px">Primero cargá vehículos en la sección Vehículos.</div>
  </div>`;
    document.getElementById('view').innerHTML = html;
    return;
  }

  /* Buscador */
  html += `
  <div class="peritaje-search-wrap">
    <span class="peritaje-search-icon"></span>
    <input
      id="peritaje-search-input"
      class="peritaje-search-input"
      type="text"
      placeholder="Buscar por marca, modelo, patente, color…"
      value="${esc(peritajeSearch)}"
      oninput="_peritajeSearchUpdate(this.value)"
      autocomplete="off"
    >
    <button id="peritaje-search-clear" class="peritaje-search-clear${peritajeSearch ? ' visible' : ''}" onclick="_peritajeSearchClear()" title="Limpiar búsqueda">×</button>
  </div>
  <div id="peritaje-cards-wrap"></div>`;

  document.getElementById('view').innerHTML = html;
  _renderPeritajeCards();
}

/* ── Render de tarjetas ── */
function _renderPeritajeCards() {
  const wrap = document.getElementById('peritaje-cards-wrap');
  if (!wrap) return;

  const disponibles = S.cars.filter(c => c.status === 'disponible');
  const otros       = S.cars.filter(c => c.status !== 'disponible');

  const dispFiltered  = disponibles.filter(_peritajeMatch);
  const otrosFiltered = otros.filter(_peritajeMatch);

  let html = '';

  /* Sin resultados */
  if (peritajeSearch && dispFiltered.length === 0 && otrosFiltered.length === 0) {
    html = `
    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-3)">
      <div style="font-size:2rem;margin-bottom:.5rem">🔍</div>
      <div style="font-size:14px">No se encontraron vehículos con "<strong style="color:var(--text-2)">${esc(peritajeSearch)}</strong>"</div>
    </div>`;
    wrap.innerHTML = html;
    return;
  }

  /* ── Disponibles ── */
  if (dispFiltered.length > 0) {
    html += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);margin-bottom:8px;font-weight:600">Disponibles</div>`;
    dispFiltered.forEach(car => {
      const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
      const kmStr = _fmtKm(car);
      html += hasP ? rPeritajeCardCompacta(car) : `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}${kmStr}</div>
          <div style="font-size:12px;color:var(--text-3)">${car.tipo} · ${car.trans}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge bg-gray">Sin peritaje</span>
          <button class="btn sm primary" onclick="selectedCarId='${car.id}';render()">+ Peritar</button>
        </div>
      </div>`;
    });
  }

  /* ── Vendidos / Reservados — se ocultan con búsqueda activa ── */
  if (otrosFiltered.length > 0 && !peritajeSearch) {
    html += `
    <details style="margin-top:1.5rem">
      <summary>Vendidos / Reservados (${otros.length})</summary>
      <div style="margin-top:10px">
        ${otros.map(car => {
          const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
          const kmStr = _fmtKm(car);
          return hasP ? rPeritajeCardCompacta(car) : `
          <div class="card" style="opacity:.55;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div><div style="font-weight:500">${esc(car.brand)} ${esc(car.model)} ${car.year}${kmStr}</div></div>
            <div style="display:flex;gap:6px">
              <span class="badge ${car.status === 'vendido' ? 'bg-green' : 'bg-orange'}">${car.status}</span>
              <button class="btn sm" onclick="selectedCarId='${car.id}';render()">Ver peritaje</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </details>`;
  } else if (otrosFiltered.length > 0 && peritajeSearch) {
    /* Con búsqueda activa, mostrar otros que coincidan también */
    html += `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);margin-bottom:8px;margin-top:1rem;font-weight:600">Vendidos / Reservados</div>`;
    otrosFiltered.forEach(car => {
      const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
      const kmStr = _fmtKm(car);
      html += hasP ? rPeritajeCardCompacta(car) : `
      <div class="card" style="opacity:.65;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:500">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}${kmStr}</div>
        </div>
        <div style="display:flex;gap:6px">
          <span class="badge ${car.status === 'vendido' ? 'bg-green' : 'bg-orange'}">${car.status}</span>
          <button class="btn sm" onclick="selectedCarId='${car.id}';render()">Ver peritaje</button>
        </div>
      </div>`;
    });
  }

  wrap.innerHTML = html;
}

/* ── Boot ── */
bootApp('peritaje').then(() => {
  const urlCarId = getCarIdFromURL();
  if (urlCarId) {
    const car = S.cars.find(c => c.id === urlCarId);
    if (car) {
      const params = new URLSearchParams(window.location.search);
      const modo   = params.get('modo'); // 'editar' fuerza formulario
      const hasP   = car.peritaje && Object.keys(car.peritaje).length > 0;
      if (modo === 'editar' || !hasP) {
        selectedCarId = urlCarId; // formulario editable
      } else {
        viewingCarId = urlCarId;  // vista solo lectura
      }
    }
  }
  render();
});