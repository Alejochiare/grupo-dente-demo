/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/dashboard.js
   ═══════════════════════════════════════════════════════════════ */

const _charts = {};
function destroyChart(id) { if(_charts[id]){_charts[id].destroy();delete _charts[id];} }

function render() {
  const ac   = S.clients.filter(c => c.status === 'activo').length;
  const av   = S.cars.filter(c => c.status === 'disponible').length;
  const sold = S.cars.filter(c => c.status === 'vendido').length;
  const hot  = S.cars.filter(c => c.status === 'disponible' && matchesForCar(c).length > 0);

  const tv = S.cars
    .filter(c => c.status === 'disponible')
    .reduce((s, c) => {
      const p = carPrice(c);
      return s + (p && !isNaN(p) ? p : 0);
    }, 0);

  const pendAlerts = S.alertas.filter(a => !a.done).length;

  const bdToday = S.clients.filter(c => c.status === 'activo' && isBirthdayToday(c.fechaCumple));
  const bdSoon  = S.clients
    .filter(c => c.status === 'activo' && !isBirthdayToday(c.fechaCumple) && c.fechaCumple)
    .map(c => ({ ...c, dias: daysUntil(c.fechaCumple) }))
    .filter(c => c.dias > 0 && c.dias <= 7)
    .sort((a, b) => a.dias - b.dias);

  const brandData = topN(S.clients.filter(c => c.brand), 'brand', 6);
  const tipoData  = topN(S.clients.filter(c => c.tipo),  'tipo',  6);
  setTimeout(() => renderDashCharts(brandData, tipoData), 50);

  document.getElementById('view').innerHTML = `

  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-label">Clientes activos</div>
      <div class="metric-value">${ac}</div>
      <div class="metric-sub">en seguimiento</div>
    </div>
    <div class="metric">
      <div class="metric-label">Vehículos disponibles</div>
      <div class="metric-value">${av}</div>
      <div class="metric-sub">en stock</div>
    </div>
    <div class="metric">
      <div class="metric-label">Valor del stock</div>
      <div class="metric-value" style="font-size:${tv > 99999999 ? '18px' : tv > 9999999 ? '22px' : '28px'}">${tv > 0 ? fp(tv) : '—'}</div>
      <div class="metric-sub">disponible</div>
    </div>
    <div class="metric">
      <div class="metric-label">Alertas activas</div>
      <div class="metric-value" style="color:${pendAlerts > 0 ? 'var(--orange)' : 'var(--text)'}">${pendAlerts}</div>
      <div class="metric-sub">${sold} veh. vendido${sold !== 1 ? 's' : ''}</div>
    </div>
  </div>

  ${bdToday.length > 0 ? `
  <div style="background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:var(--radius-lg);padding:1rem 1.4rem;margin-bottom:1rem">
    <div style="font-size:12px;font-weight:600;color:var(--purple);margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase">🎉 Cumpleaños hoy</div>
    ${bdToday.map(c => `
    <div class="row" style="padding:6px 0;border-top:1px solid var(--purple-border)">
      ${rAv(c.name)}
      <div style="flex:1"><div style="font-weight:600">${esc(c.name)}</div><div style="font-size:12px;color:var(--text-3)">${c.phone}</div></div>
      <button class="btn sm" style="border-color:var(--purple-border);color:var(--purple)" onclick="openWhatsAppBirthday('${esc(c.phone)}','${esc(c.name)}')">🎂 Felicitar</button>
      ${whatsappBtn(c.phone, c.name, true)}
    </div>`).join('')}
  </div>` : ''}

  ${bdSoon.length > 0 ? `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1rem 1.4rem;margin-bottom:1rem">
    <div style="font-size:12px;font-weight:600;color:var(--text-3);margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase">🎂 Próximos cumpleaños (7 días)</div>
    ${bdSoon.map(c => `
    <div class="row" style="padding:5px 0;border-top:1px solid var(--border)">
      ${rAv(c.name)}
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${esc(c.name)}</div></div>
      <span class="badge bg-purple">en ${c.dias} día${c.dias !== 1 ? 's' : ''}</span>
    </div>`).join('')}
  </div>` : ''}

  ${S.clients.length > 0 ? `
  <div class="charts-grid-2" style="margin-bottom:1.5rem">
    <div class="stats-card"><div class="stats-card-title">Marcas más pedidas</div><div class="chart-container"><canvas id="dash-brands-chart"></canvas></div></div>
    <div class="stats-card"><div class="stats-card-title">Tipos más pedidos</div><div class="chart-container"><canvas id="dash-tipos-chart"></canvas></div></div>
  </div>` : ''}

  <div class="section-head">
    <div class="section-title">Oportunidades de venta</div>
    ${hot.length > 0 ? `<span class="badge bg-green">${hot.length} auto${hot.length > 1 ? 's' : ''} con matches</span>` : ''}
  </div>

  ${hot.length === 0 ? `
  <div class="empty">
    <div class="empty-icon">◎</div>
    <strong>Sin oportunidades activas</strong>
    <div style="font-size:13px;margin-top:4px">Cargá clientes y vehículos para ver coincidencias.</div>
  </div>` : hot.map(car => {
    const ms       = matchesForCar(car);
    const precioAuto = carPrice(car);
    const visibles = ms.slice(0, 4);
    const ocultos  = ms.slice(4);
    return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
        <div>
          <div style="font-weight:600;font-size:15px">
            ${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3);font-weight:400">${car.year}</span>
            ${car.patente ? `<span style="font-size:11px;background:var(--surface-3);color:var(--text-2);padding:2px 8px;border-radius:4px;border:1px solid var(--border);margin-left:6px">${esc(car.patente)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text-2)">
            ${precioAuto ? fp(precioAuto) : 'Sin precio'} · ${car.tipo || '—'} · ${car.trans || '—'}${car.km ? ' · ' + fk(car.km) : ''}
          </div>
        </div>
        <span class="badge bg-gold">${ms.length} interesado${ms.length > 1 ? 's' : ''}</span>
      </div>
      ${visibles.map(c => {
        const idx = _reg(c.id, car.id);
        return `
        <div class="row" style="padding:8px 0;border-top:1px solid var(--border)">
          ${rAv(c.name)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
          </div>
          ${rScoreRow(c.sc)}
          <button class="btn sm" onclick="showMatchDetailByIdx(${idx})" style="border-color:var(--gold-border);color:var(--gold)">Compatibilidad</button>
          ${whatsappBtn(c.phone, c.name, true)}
        </div>`;
      }).join('')}
      ${ocultos.length > 0 ? `
      <div class="dash-expand-wrap" style="text-align:center;padding-top:8px">
        <button class="btn sm" style="width:100%;border-color:rgba(201,169,110,.35);color:var(--gold)"
          onclick="_dashExpandClientes('${car.id}', this)">
          Ver ${ocultos.length} cliente${ocultos.length > 1 ? 's' : ''} más ▾
        </button>
      </div>` : ''}
    </div>`;
  }).join('')}`;
}

function _dashExpandClientes(carId, btn) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  const ms    = matchesForCar(car);
  const extra = ms.slice(4);
  const html  = extra.map(c => {
    const idx = _reg(c.id, car.id);
    return `
    <div class="row" style="padding:8px 0;border-top:1px solid var(--border)">
      ${rAv(c.name)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
        <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
      </div>
      ${rScoreRow(c.sc)}
      <button class="btn sm" onclick="showMatchDetailByIdx(${idx})" style="border-color:var(--gold-border);color:var(--gold)">Compatibilidad</button>
      ${whatsappBtn(c.phone, c.name, true)}
    </div>`;
  }).join('');
  btn.closest('.dash-expand-wrap').outerHTML = html;
}

function renderDashCharts(brandData, tipoData) {
  const COLORS = ['rgba(201,169,110,0.85)','rgba(91,155,213,0.85)','rgba(76,175,125,0.85)','rgba(224,144,85,0.85)','rgba(180,100,160,0.85)','rgba(100,180,160,0.85)'];
  const def = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } };
  if (brandData.length > 0 && document.getElementById('dash-brands-chart')) {
    destroyChart('dash-brands');
    _charts['dash-brands'] = new Chart(document.getElementById('dash-brands-chart'), { type:'bar',
      data:{ labels:brandData.map(([l])=>l), datasets:[{ data:brandData.map(([,v])=>v), backgroundColor:COLORS, borderRadius:4, borderSkipped:false }] },
      options:{ ...def, scales:{ x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#666'} }, y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#666',stepSize:1}, beginAtZero:true } } }
    });
  }
  if (tipoData.length > 0 && document.getElementById('dash-tipos-chart')) {
    destroyChart('dash-tipos');
    _charts['dash-tipos'] = new Chart(document.getElementById('dash-tipos-chart'), { type:'doughnut',
      data:{ labels:tipoData.map(([l])=>l), datasets:[{ data:tipoData.map(([,v])=>v), backgroundColor:COLORS, borderWidth:0, hoverOffset:6 }] },
      options:{ ...def, cutout:'60%', plugins:{ legend:{ display:true, position:'right', labels:{ color:'#888', font:{size:11}, boxWidth:10, padding:8 } } } }
    });
  }
}

bootApp('dashboard');
render();