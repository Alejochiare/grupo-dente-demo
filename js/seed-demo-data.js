/* ═══════════════════════════════════════════════════════════════
   GRUPO DENTE CRM — js/seed-demo-data.js

   Datos 100% ficticios para que la demo se vea poblada desde el
   primer clic. Usa IDs fijos (set, no add), así correrlo de nuevo
   simplemente resetea la demo a este mismo estado inicial.

   NUNCA cargar acá datos reales de ningún cliente.
   ═══════════════════════════════════════════════════════════════ */

async function seedDemoData() {
  const db = firebase.firestore();
  const batch = db.batch();
  const hoy = new Date().toISOString().slice(0, 10);

  const usuarios = [
    { id: 'demo-admin',     user: 'admin',     pass: 'demo2026', nombre: 'Administrador Demo', role: 'admin',     activo: true },
    { id: 'demo-vendedor',  user: 'vendedor',  pass: 'demo2026', nombre: 'Vendedor Demo',       role: 'vendedor',  activo: true },
  ];

  const clientes = [
    { id: 'demo-cliente-1', name: 'Martín Suárez',   phone: '3811234567', status: 'activo', brand: 'Toyota',     model: 'Corolla',  tipo: 'Sedan',  budget: 12000000, trans: 'Automática', yearMin: 2018, yearMax: 2023, notes: 'Busca auto para uso familiar.', creadoPor: 'Administrador Demo', fechaCreacion: hoy },
    { id: 'demo-cliente-2', name: 'Lucía Fernández', phone: '3817654321', status: 'activo', brand: 'Volkswagen', model: 'Amarok',   tipo: 'Pickup', budget: 20000000, trans: 'Manual',     yearMin: 2019, yearMax: 2024, notes: 'Prioriza pickup 4x4.',          creadoPor: 'Vendedor Demo',       fechaCreacion: hoy },
    { id: 'demo-cliente-3', name: 'Jorge Paz',       phone: '3815551234', status: 'activo', brand: 'Ford',       model: 'Ka',       tipo: 'Hatchback', budget: 6000000, trans: 'Manual',     yearMin: 2015, yearMax: 2020, notes: 'Primer auto, presupuesto ajustado.', creadoPor: 'Administrador Demo', fechaCreacion: hoy },
  ];

  const vehiculos = [
    { id: 'demo-vehiculo-1', brand: 'Toyota', model: 'Corolla', version: 'XEI CVT', patente: 'AB123CD', tipo: 'Sedan', year: 2021, km: 38000, trans: 'Automática', color: 'Blanco', monedaContado: 'ARS', precioContado: 13500000, monedaCanje: 'ARS', precioCanje: null, itv: 'si', carpetaEntregada: true, nota: 'Único dueño, service oficial.', status: 'disponible', fotos: [], creadoPor: 'Administrador Demo', fechaCreacion: hoy },
    { id: 'demo-vehiculo-2', brand: 'Volkswagen', model: 'Amarok', version: 'Highline 4x4', patente: 'AC456EF', tipo: 'Pickup', year: 2020, km: 62000, trans: 'Manual', color: 'Gris', monedaContado: 'ARS', precioContado: 21000000, monedaCanje: 'ARS', precioCanje: null, itv: 'si', carpetaEntregada: true, nota: 'Muy buen estado general.', status: 'disponible', fotos: [], creadoPor: 'Vendedor Demo', fechaCreacion: hoy },
    { id: 'demo-vehiculo-3', brand: 'Ford', model: 'Ka', version: 'SE', patente: 'AD789GH', tipo: 'Hatchback', year: 2018, km: 71000, trans: 'Manual', color: 'Rojo', monedaContado: 'ARS', precioContado: 6800000, monedaCanje: 'ARS', precioCanje: null, itv: 'no', carpetaEntregada: false, nota: 'Ideal primer auto.', status: 'disponible', fotos: [], creadoPor: 'Administrador Demo', fechaCreacion: hoy },
    { id: 'demo-vehiculo-4', brand: 'Chevrolet', model: 'Onix', version: 'LTZ', patente: 'AE321IJ', tipo: 'Hatchback', year: 2022, km: 15000, trans: 'Automática', color: 'Negro', monedaContado: 'ARS', precioContado: 11200000, monedaCanje: 'ARS', precioCanje: null, itv: 'si', carpetaEntregada: true, nota: 'Pocos kilómetros.', status: 'disponible', fotos: [], creadoPor: 'Vendedor Demo', fechaCreacion: hoy },
  ];

  const jerarquia = [
    { id: 'demo-equipo-1', nombre: 'Administrador', apellido: 'Demo', rol: 'Gerente', telefono: '3810000001', email: 'admin@grupodente.com', creadoPor: 'Administrador Demo' },
    { id: 'demo-equipo-2', nombre: 'Vendedor',       apellido: 'Demo', rol: 'Vendedor', telefono: '3810000002', email: 'vendedor@grupodente.com', creadoPor: 'Administrador Demo' },
  ];

  const tareas = [
    { id: 'demo-tarea-1', titulo: 'Llamar a Martín Suárez', descripcion: 'Coordinar prueba de manejo del Corolla.', fecha: hoy, done: false, clienteId: 'demo-cliente-1', clienteNombre: 'Martín Suárez', clientePhone: '3811234567', creadoPor: 'Administrador Demo', asignadoA: 'Administrador Demo' },
  ];

  const alertas = [
    { id: 'demo-alerta-1', tipo: 'general', titulo: 'Revisar ITV Amarok', descripcion: 'Verificar vencimiento de ITV antes de publicar.', fecha: hoy, hora: null, done: false, creadoPor: 'Administrador Demo', asignadoA: 'todos' },
  ];

  usuarios.forEach(u  => batch.set(db.collection('usuarios').doc(u.id), u));
  clientes.forEach(c  => batch.set(db.collection('clientes').doc(c.id), { ...c, _ts: Date.now() }));
  vehiculos.forEach(v => batch.set(db.collection('vehiculos').doc(v.id), { ...v, _ts: Date.now() }));
  jerarquia.forEach(j => batch.set(db.collection('jerarquia').doc(j.id), { ...j, _ts: Date.now() }));
  tareas.forEach(t    => batch.set(db.collection('tareas').doc(t.id), t));
  alertas.forEach(a   => batch.set(db.collection('alertas').doc(a.id), { ...a, _ts: Date.now() }));

  await batch.commit();
  return { usuarios: usuarios.length, clientes: clientes.length, vehiculos: vehiculos.length };
}
