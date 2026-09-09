/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/seed-demo-data.js

   Datos mínimos y 100% ficticios: solo 1 cliente y 1 vehículo de
   ejemplo, para que GRUPO DENTE vea cómo se carga la información
   pero pruebe el sistema cargando lo suyo desde cero. Usa IDs fijos
   (set, no add), así correrlo de nuevo resetea la demo a este mismo
   estado inicial en vez de duplicar.

   NUNCA cargar acá datos reales de ningún cliente.
   ═══════════════════════════════════════════════════════════════ */

/* No incluye "usuarios" a propósito: si se borrara, nadie podría
   volver a entrar sin recargar la demo desde la consola de Firebase. */
const _DATA_COLLECTIONS = ['clientes', 'vehiculos', 'alertas', 'tareas', 'jerarquia', 'peritajes', 'gestorias'];

async function seedDemoData() {
  const db = firebase.firestore();
  const batch = db.batch();
  const hoy = new Date().toISOString().slice(0, 10);

  const usuarios = [
    { id: 'demo-admin',    user: 'admin',    pass: 'demo2026', nombre: 'Administrador Demo', role: 'admin',    activo: true },
    { id: 'demo-vendedor', user: 'vendedor', pass: 'demo2026', nombre: 'Vendedor Demo',       role: 'vendedor', activo: true },
  ];

  const clientes = [
    { id: 'demo-cliente-1', name: 'Martín Suárez', phone: '3811234567', status: 'activo', brand: 'Toyota', model: 'Corolla', tipo: 'Sedan', budget: 12000000, trans: 'Automática', yearMin: 2018, yearMax: 2023, notes: 'Cliente de ejemplo — podés editarlo o borrarlo.', creadoPor: 'Administrador Demo', fechaCreacion: hoy },
  ];

  const vehiculos = [
    { id: 'demo-vehiculo-1', brand: 'Toyota', model: 'Corolla', version: 'XEI CVT', patente: 'AB123CD', tipo: 'Sedan', year: 2021, km: 38000, trans: 'Automática', color: 'Blanco', monedaContado: 'ARS', precioContado: 13500000, monedaCanje: 'ARS', precioCanje: null, itv: 'si', carpetaEntregada: true, nota: 'Vehículo de ejemplo — podés editarlo o borrarlo.', status: 'disponible', fotos: [], creadoPor: 'Administrador Demo', fechaCreacion: hoy },
  ];

  usuarios.forEach(u  => batch.set(db.collection('usuarios').doc(u.id), u));
  clientes.forEach(c  => batch.set(db.collection('clientes').doc(c.id), { ...c, _ts: Date.now() }));
  vehiculos.forEach(v => batch.set(db.collection('vehiculos').doc(v.id), { ...v, _ts: Date.now() }));

  await batch.commit();
  return { usuarios: usuarios.length, clientes: clientes.length, vehiculos: vehiculos.length };
}

/* ── Vacía todos los datos de negocio (clientes, vehículos, etc.) ──
   Deja "usuarios" intacto para que el login siga funcionando. */
async function limpiarTodo() {
  const db = firebase.firestore();
  let borrados = 0;
  for (const col of _DATA_COLLECTIONS) {
    const snap = await db.collection(col).get();
    if (snap.empty) continue;
    // Firestore permite hasta 500 escrituras por batch.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = db.batch();
      docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    borrados += docs.length;
  }
  return { borrados };
}
