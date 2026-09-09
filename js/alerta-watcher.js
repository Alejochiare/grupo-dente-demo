/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/alerta-watcher.js
   Watcher global de alertas por hora. Incluir en TODAS las páginas.
   Lee alertas desde localStorage (cache guardado por alertas.js)

   v2 — Notificaciones del navegador confiables en segundo plano:
   · Dispara con ">= hora" (no match exacto al minuto) → no se pierde
     aunque el navegador ralentice los timers en pestañas de fondo.
   · Registro anti-repetición persistente en localStorage (por día).
   · Fecha LOCAL (antes usaba UTC y fallaban las alertas de la noche).
   · Permiso pedido por gesto del usuario (chip), no automático.
   · Notificación del SO persistente + clickeable, también para
     alertas asignadas por otros usuarios.

   v3 — El sonido se repite en bucle hasta que la persona cierra el
        popup (por cualquier botón, clic afuera o auto-cierre).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const ICON_MAP        = { birthday: '🎉', itv: '⚠️', turno: '📅', general: '🔔' };
  const NOTIFICADAS_KEY = 'crm_alertas_notificadas'; // { fecha, ids:[] } por día
  const CHIP_NO_KEY     = 'crm_notif_chip_no';
  const CHECK_MS        = 30 * 1000;

  /* ── Fecha de hoy en formato YYYY-MM-DD (HORA LOCAL) ─────────── */
  function _hoyISO(d) {
    d = d || new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ── Registro persistente de alertas ya avisadas (por día) ───── */
  function _leerNotificadas() {
    try {
      const raw = JSON.parse(localStorage.getItem(NOTIFICADAS_KEY));
      if (!raw || raw.fecha !== _hoyISO()) return { fecha: _hoyISO(), ids: [] };
      return raw;
    } catch (e) { return { fecha: _hoyISO(), ids: [] }; }
  }
  function _marcarNotificada(id) {
    const n = _leerNotificadas();
    if (!n.ids.includes(id)) {
      n.ids.push(id);
      try { localStorage.setItem(NOTIFICADAS_KEY, JSON.stringify(n)); } catch (e) {}
    }
  }

  /* ── Nombre del usuario logueado ─────────────────────────────── */
  function _miNombre() {
    try {
      const s = JSON.parse(localStorage.getItem('crm_session') || 'null');
      return (s && s.nombre) || '';
    } catch (e) { return ''; }
  }

  /* ── ¿Esta alerta es para MÍ? (no para otro usuario) ─────────── */
  function _esParaMi(a, mi) {
    const asignadoA = a.asignado_a || a.asignadoA || '';
    const creadoPor = a.creado_por || a.creadoPor || '';
    if (asignadoA === 'todos') return true;          // para todos
    if (asignadoA && asignadoA === mi) return true;  // asignada a mí
    if (!asignadoA && creadoPor === mi) return true; // propia, sin asignar
    return false;                                    // asignada a otro → NO
  }

  /* ── Sonido de alerta (claro y reconocible) ──────────────────
     Patrón "bi-bup" de dos tonos que sube y baja, repetido 3 veces,
     parecido a una alarma/aviso. Generado por código, sin archivos. */
  function _beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();

      // Cada par [grave, agudo] forma un "bi-bup". Tres repeticiones.
      const NOTAS = [
        { f: 660, t: 0.00, d: 0.16 },  // bi
        { f: 990, t: 0.16, d: 0.22 },  // bup
        { f: 660, t: 0.52, d: 0.16 },
        { f: 990, t: 0.68, d: 0.22 },
        { f: 660, t: 1.04, d: 0.16 },
        { f: 990, t: 1.20, d: 0.30 },
      ];

      NOTAS.forEach(n => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';                 // más "lleno" y claro que el seno puro
        osc.frequency.value = n.f;
        osc.connect(gain);
        gain.connect(ctx.destination);

        const ini = ctx.currentTime + n.t;
        gain.gain.setValueAtTime(0.0001, ini);
        gain.gain.exponentialRampToValueAtTime(0.45, ini + 0.02); // ataque rápido
        gain.gain.exponentialRampToValueAtTime(0.0001, ini + n.d); // caída suave
        osc.start(ini);
        osc.stop(ini + n.d + 0.02);
      });

      // cierra el contexto cuando termina (no acumula recursos)
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1800);
    } catch (e) {}
  }

  /* ── Bucle de sonido: repite el beep hasta que se cierre el popup ──
     El patrón dura ~1,5s y el contexto se cierra a los 1,8s, así que
     repetir cada 2s no se solapa. Se corta con _stopBeepLoop(). */
  let _beepTimer = null;
  function _startBeepLoop() {
    _stopBeepLoop();                       // por las dudas, no acumular
    _beep();                               // suena ya mismo
    _beepTimer = setInterval(_beep, 2000); // y se repite cada 2s
  }
  function _stopBeepLoop() {
    if (_beepTimer) { clearInterval(_beepTimer); _beepTimer = null; }
  }

  /* ── Notificación del SO (aparece aunque estés en otra pestaña) ── */
  function _notify(alerta, eyebrow) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const titulo  = (eyebrow || '⏰') + '  ' + (alerta.titulo || 'Alerta');
    const refName = alerta.refName || alerta.ref_name;
    const cuerpo  = [
      alerta.descripcion || '',
      refName ? '👤 ' + refName : '',
      alerta.fecha ? '📅 ' + alerta.fecha : '',
      alerta.hora  ? '🕐 ' + alerta.hora  : ''
    ].filter(Boolean).join('  ·  ');
    try {
      const n = new Notification(titulo, {
        body: cuerpo || 'Tenés una alerta programada.',
        icon: '/favicon.ico',
        tag: 'crm-alerta-' + alerta.id, // evita apilar duplicados de la misma alerta
        requireInteraction: true,       // queda en pantalla hasta que la cierres
      });
      n.onclick = function () {
        window.focus();
        if (!window.location.pathname.includes('alertas')) window.location.href = 'alertas.html';
        n.close();
      };
    } catch (e) {}
  }

  /* ── Estilos del popup (inyectados una sola vez) ─────────────── */
  function _injectStyles() {
    if (document.getElementById('aw-styles')) return;
    const s = document.createElement('style');
    s.id = 'aw-styles';
    s.textContent = `
      @keyframes aw-fade  { from{opacity:0}        to{opacity:1} }
      @keyframes aw-pop   { from{transform:scale(.82) translateY(14px);opacity:0}
                            to  {transform:scale(1)   translateY(0);   opacity:1} }
      @keyframes aw-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.13)} }
      #aw-overlay {
        position:fixed;inset:0;z-index:99999;
        background:rgba(0,0,0,.62);backdrop-filter:blur(5px);
        display:flex;align-items:center;justify-content:center;
        animation:aw-fade .22s ease forwards;
      }
      #aw-card {
        background:var(--surface,#1c1c2a);
        border:1px solid var(--border,rgba(255,255,255,.13));
        border-radius:18px;
        padding:2.2rem 2.4rem 2rem;
        max-width:460px;width:92%;
        box-shadow:0 30px 80px rgba(0,0,0,.6);
        animation:aw-pop .28s cubic-bezier(.34,1.56,.64,1) forwards;
        text-align:center;
        font-family:inherit;
      }
      #aw-card .aw-icon   { font-size:3.4rem;line-height:1;margin-bottom:.6rem;
                            display:inline-block;animation:aw-pulse 1.1s ease-in-out infinite; }
      #aw-card .aw-eyebrow{ font-size:10px;font-weight:700;letter-spacing:.12em;
                            text-transform:uppercase;color:var(--text-3,#888);margin-bottom:.45rem; }
      #aw-card .aw-title  { font-size:1.35rem;font-weight:700;color:var(--text-1,#f0f0f0);
                            margin-bottom:.45rem;line-height:1.3; }
      #aw-card .aw-desc   { font-size:.88rem;color:var(--text-2,#aaa);margin-bottom:.4rem;
                            line-height:1.55;max-width:340px;margin-inline:auto; }
      #aw-card .aw-meta   { font-size:.78rem;color:var(--text-3,#666);margin-bottom:1.6rem; }
      #aw-card .aw-btns   { display:flex;gap:8px;justify-content:center;flex-wrap:wrap; }
      #aw-card .aw-btn    { padding:7px 16px;border-radius:8px;font-size:.82rem;font-weight:600;
                            cursor:pointer;border:1px solid var(--border,rgba(255,255,255,.15));
                            background:var(--surface-2,#2a2a3c);color:var(--text-1,#eee);
                            transition:opacity .15s; }
      #aw-card .aw-btn:hover { opacity:.8; }
      #aw-card .aw-btn.ok { background:var(--green,#3a7a4a);border-color:transparent;color:#fff; }
      #aw-card .aw-btn.wa { background:#1a6632;border-color:transparent;color:#fff; }

      /* Chip para activar notificaciones */
      #crm-notif-chip {
        position:fixed;right:18px;bottom:18px;z-index:100000;
        display:flex;align-items:center;gap:10px;max-width:300px;
        background:var(--surface-2,#1c2230);border:1px solid var(--border,rgba(255,255,255,.13));
        border-radius:12px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.35);
        font-family:inherit;font-size:13px;color:var(--text-1,#e7ebf3);
      }
      #crm-notif-chip .cnc-ok { background:var(--blue,#378add);color:#fff;border:none;
        border-radius:8px;padding:7px 10px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap; }
      #crm-notif-chip .cnc-no { background:none;border:none;color:var(--text-3,#8a93a5);
        cursor:pointer;font-size:16px;line-height:1; }
    `;
    document.head.appendChild(s);
  }

  /* ── Escape HTML ─────────────────────────────────────────────── */
  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Marcar hecho via API ────────────────────────────────────── */
  async function _toggleAlertaAPI(id, val) {
    try {
      if (typeof CRM !== 'undefined' && typeof CRM.toggleAlerta === 'function') {
        await CRM.toggleAlerta(id, val);
      }
      try {
        const raw = localStorage.getItem('crm_alertas_cache');
        if (raw) {
          const alertas = JSON.parse(raw);
          const idx = alertas.findIndex(a => a.id === id);
          if (idx !== -1) {
            if (val === 1) alertas.splice(idx, 1);
            localStorage.setItem('crm_alertas_cache', JSON.stringify(alertas));
          }
        }
      } catch(e) {}
    } catch(e) {}
  }

  /* ── Popup por hora ──────────────────────────────────────────── */
  function _mostrarPopup(alerta) {
    if (document.getElementById('aw-overlay')) return;
    _injectStyles();
    _startBeepLoop();   // suena en bucle hasta que se cierre el popup

    const icon = ICON_MAP[alerta.tipo] || '🔔';
    const estaEnAlertas = window.location.pathname.includes('alertas');

    const overlay = document.createElement('div');
    overlay.id = 'aw-overlay';

    // Que el sonido se detenga SIEMPRE que se quite el overlay,
    // sin importar por qué botón se cierre.
    const _origRemove = overlay.remove.bind(overlay);
    overlay.remove = function () { _stopBeepLoop(); _origRemove(); };

    overlay.innerHTML = `
      <div id="aw-card">
        <div class="aw-icon">${icon}</div>
        <div class="aw-eyebrow">⏰ ¡Es la hora!</div>
        <div class="aw-title">${_esc(alerta.titulo)}</div>
        ${alerta.descripcion ? `<div class="aw-desc">${_esc(alerta.descripcion)}</div>` : ''}
        <div class="aw-meta">
          📅 ${alerta.fecha}${alerta.hora ? '  🕐 ' + alerta.hora : ''}
          ${alerta.creado_por || alerta.creadoPor ? ' · ' + _esc(alerta.creado_por || alerta.creadoPor) : ''}
        </div>
        <div class="aw-btns">
          ${alerta.refPhone ? `<button class="aw-btn wa" id="aw-wa">💬 WhatsApp</button>` : ''}
          <button class="aw-btn ok" id="aw-done">✓ Marcar hecho</button>
          ${!estaEnAlertas ? `<button class="aw-btn" id="aw-goto">Ver alertas</button>` : ''}
          <button class="aw-btn" id="aw-close">Cerrar</button>
        </div>
      </div>
    `;

    overlay.querySelector('#aw-close').onclick = () => overlay.remove();
    overlay.querySelector('#aw-done').onclick = () => {
      overlay.remove();
      if (typeof marcarAlerta === 'function') {
        marcarAlerta(alerta.id, true);
      } else {
        _toggleAlertaAPI(alerta.id, 1);
      }
    };

    const btnWa = overlay.querySelector('#aw-wa');
    if (btnWa) btnWa.onclick = () => {
      overlay.remove();
      const num = alerta.refPhone.replace(/\D/g, '');
      window.open('https://wa.me/' + num, '_blank');
    };

    const btnGoto = overlay.querySelector('#aw-goto');
    if (btnGoto) btnGoto.onclick = () => {
      overlay.remove();
      window.location.href = 'alertas.html';
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5 * 60 * 1000);
  }

  /* ── Popup para alerta asignada por otro usuario ────────────── */
  function _mostrarPopupAsignada(alerta) {
    if (document.getElementById('aw-overlay')) return;
    _injectStyles();
    _startBeepLoop();   // suena en bucle hasta que se cierre el popup

    const icon      = ICON_MAP[alerta.tipo] || '🔔';
    const creadoPor = alerta.creado_por || alerta.creadoPor || '';
    const estaEnAlertas = window.location.pathname.includes('alertas');

    const overlay = document.createElement('div');
    overlay.id = 'aw-overlay';

    // Que el sonido se detenga SIEMPRE que se quite el overlay,
    // sin importar por qué botón se cierre.
    const _origRemove = overlay.remove.bind(overlay);
    overlay.remove = function () { _stopBeepLoop(); _origRemove(); };

    overlay.innerHTML = `
      <div id="aw-card">
        <div class="aw-icon">${icon}</div>
        <div class="aw-eyebrow">📨 Nueva alerta asignada por ${_esc(creadoPor)}</div>
        <div class="aw-title">${_esc(alerta.titulo)}</div>
        ${alerta.descripcion ? `<div class="aw-desc">${_esc(alerta.descripcion)}</div>` : ''}
        <div class="aw-meta">
          📅 ${alerta.fecha || ''}${alerta.hora ? '  🕐 ' + alerta.hora : ''}
        </div>
        <div class="aw-btns">
          ${alerta.ref_phone || alerta.refPhone ? `<button class="aw-btn wa" id="aw-wa">💬 WhatsApp</button>` : ''}
          ${!estaEnAlertas ? `<button class="aw-btn" id="aw-goto">Ver alertas</button>` : ''}
          <button class="aw-btn ok" id="aw-close">Entendido</button>
        </div>
      </div>
    `;

    overlay.querySelector('#aw-close').onclick = () => overlay.remove();

    const btnWa = overlay.querySelector('#aw-wa');
    if (btnWa) btnWa.onclick = () => {
      overlay.remove();
      const num = (alerta.ref_phone || alerta.refPhone).replace(/\D/g, '');
      window.open('https://wa.me/' + num, '_blank');
    };

    const btnGoto = overlay.querySelector('#aw-goto');
    if (btnGoto) btnGoto.onclick = () => {
      overlay.remove();
      window.location.href = 'alertas.html';
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5 * 60 * 1000);
  }

  /* ── Leer alertas (lo más fresco y completo disponible) ─────── */
  function _getAlertas() {
    // 1) Lo último traído del servidor: incluye las asignadas a mí aunque
    //    no haya entrado a la página de alertas en esta sesión.
    if (Array.isArray(_alertasServidor)) return _alertasServidor.filter(a => !a.done);
    // 2) Si estoy en la página de alertas, el estado en memoria.
    if (typeof S !== 'undefined' && Array.isArray(S.alertas)) {
      return S.alertas.filter(a => !a.done);
    }
    // 3) Último recurso: el cache de localStorage.
    try {
      const raw = localStorage.getItem('crm_alertas_cache');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  /* ── Polling: buscar alertas nuevas asignadas a mí ──────────── */
  let _alertasConocidas    = new Set();
  let _pollingInicializado = false;
  let _alertasServidor     = null; // última lista traída del backend (mías + creadas + todos)

  async function _pollAlertasAsignadas() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || 'null');
      if (!session) return;
      if (typeof CRM === 'undefined' || typeof CRM.getAlertas !== 'function') return;

      const miNombre = session.nombre || '';

      const alertas = await CRM.getAlertas();
      _alertasServidor = alertas; // el watcher de hora usará esto (datos frescos)

      alertas.forEach(a => {
        if (a.done) return;

        const asignadoA = a.asignado_a || a.asignadoA || '';
        const creadoPor = a.creado_por || a.creadoPor || '';

        const esParaMi = (asignadoA === miNombre || asignadoA === 'todos') && creadoPor !== miNombre;
        if (!esParaMi) return;

        if (_alertasConocidas.has(a.id)) return;

        // Primera corrida: solo registrar, no mostrar (evita spam al cargar)
        if (!_pollingInicializado) return;

        _alertasConocidas.add(a.id);
        _notify(a, '📨 ' + creadoPor);     // aviso del SO aunque estés en otra pestaña
        _mostrarPopupAsignada(a);
      });

      alertas.forEach(a => _alertasConocidas.add(a.id));
      _pollingInicializado = true;

    } catch(e) {}
  }

  /* ── Watcher principal (alertas por hora) ────────────────────── */
  function _watcher() {
    const ahora = new Date();
    const hoy   = _hoyISO(ahora);
    const fired = _leerNotificadas().ids;
    const mi    = _miNombre();

    _getAlertas().forEach(a => {
      if (a.done)  return;
      if (!_esParaMi(a, mi)) return;   // ← clave: NO disparar alertas de otros usuarios
      if (!a.hora) return;
      if (a.fecha !== hoy) return;
      if (fired.includes(a.id)) return;

      const partes = String(a.hora).split(':');
      const hh = Number(partes[0]);
      const mm = Number(partes[1] || 0);
      if (isNaN(hh)) return;

      const cuando = new Date(ahora);
      cuando.setHours(hh, mm, 0, 0);

      // Dispara si ya llegó (o pasó) la hora hoy → robusto ante throttling
      if (ahora < cuando) return;

      _marcarNotificada(a.id);
      _notify(a);          // notificación del SO (visible en otra pestaña)
      _mostrarPopup(a);    // modal dentro del CRM (se omite si ya hay uno abierto)
    });
  }

  /* ── Chip para pedir permiso (solo si aún no se decidió) ─────── */
  function _mostrarChipPermiso() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;       // ya aceptó o rechazó
    if (localStorage.getItem(CHIP_NO_KEY) === '1') return;   // lo cerró antes
    if (!document.body || document.getElementById('crm-notif-chip')) return;
    _injectStyles();

    const chip = document.createElement('div');
    chip.id = 'crm-notif-chip';
    chip.innerHTML =
      '<span style="font-size:18px">🔔</span>' +
      '<span style="flex:1;line-height:1.3">Activá los avisos para enterarte de las alertas aunque estés en otra pestaña.</span>' +
      '<button class="cnc-ok">Activar</button>' +
      '<button class="cnc-no">×</button>';
    document.body.appendChild(chip);

    chip.querySelector('.cnc-ok').onclick = activarNotificaciones;
    chip.querySelector('.cnc-no').onclick = function () {
      localStorage.setItem(CHIP_NO_KEY, '1');
      chip.remove();
    };
  }

  /* ── Pedir permiso (DEBE dispararse por un gesto del usuario) ── */
  function activarNotificaciones() {
    if (typeof Notification === 'undefined') {
      alert('Tu navegador no soporta notificaciones.');
      return;
    }
    Notification.requestPermission().then(p => {
      const chip = document.getElementById('crm-notif-chip');
      if (chip) chip.remove();
      if (p === 'granted') {
        try {
          new Notification('🔔  Avisos activados', {
            body: 'Te avisaremos cuando llegue la hora de cada alerta.',
          });
        } catch (e) {}
        _watcher();
      } else if (p === 'denied') {
        // Bloqueado a propósito: no insistir (no se puede repreguntar por código)
        localStorage.setItem(CHIP_NO_KEY, '1');
      }
      // Si quedó en 'default' (cerró el cartel sin decidir), no marcamos nada:
      // se le volverá a ofrecer para que pueda dar "Permitir".
    }).catch(() => {});
  }

  // Expuesta por si querés tu propio botón en alguna página:
  //   <button onclick="activarNotificaciones()">🔔 Activar avisos</button>
  window.activarNotificaciones = activarNotificaciones;

  /* ── Arranque ────────────────────────────────────────────────── */
  function _init() {
    _mostrarChipPermiso();

    // Watcher de hora cada 30s (en 2do plano se limita a ~1/min, pero
    // el disparo por ">= hora" + registro persistente no pierde nada)
    _watcher();
    setInterval(_watcher, CHECK_MS);

    // Polling de alertas asignadas: primera llamada a los 3s, luego cada 30s
    setTimeout(() => {
      _pollAlertasAsignadas();
      setInterval(_pollAlertasAsignadas, CHECK_MS);
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();