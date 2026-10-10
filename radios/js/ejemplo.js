// Datos ficticios para conocer la app en modo demo: inventario parecido al
// del armario de Logística y cuatro semanas de préstamos.

import { nuevoEquipo, guardarPersona } from './dominio.js';
import { nuevoId } from './util.js';

function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const OMEGAS = [
  ['Jefe de Seguridad', 'Coordinadores (Omega)'],
  ['Jefe de Emergencias (PMU)', 'Coordinadores (Omega)'],
  ['Coord. Protección y Cuidado', 'Protección y Cuidado'],
];

const NOMBRES = [
  'Andrea Gómez', 'Camilo Rojas', 'Daniela Pardo', 'Esteban Muñoz', 'Fabiola Ortiz', 'Gabriel Navarro',
  'Helena Castaño', 'Iván Salcedo', 'Julieta Moreno', 'Kevin Arango', 'Lorena Quintero', 'Mateo Villamil',
  'Natalia Cifuentes', 'Óscar Benavides', 'Paola Linares', 'Ricardo Zuluaga', 'Sara Montoya', 'Tomás Herrera',
  'Valentina Ruiz', 'Wilson Duarte', 'Ximena Prieto', 'Yesid Calderón', 'Zuleima Torres', 'Alejandro Peña',
];

export function datosDeEjemplo(usuario) {
  const r = azar(2026);
  const ahora = Date.now();
  const ops = [];
  const equipos = [];

  const agregar = (datos) => {
    const op = nuevoEquipo(datos, ahora - 40 * 864e5);
    ops.push(op);
    equipos.push({ id: op.id, ...op.data });
  };

  OMEGAS.forEach(([cargo, area], i) =>
    agregar({ codigo: `OMEGA-${String(i + 1).padStart(2, '0')}`, nombre: `Omega ${i + 1}`, tipo: 'radio', area, modelo: 'Motorola analógico', notas: cargo }));
  for (let i = 1; i <= 6; i++) agregar({ codigo: `ZONA-${String(i).padStart(2, '0')}`, nombre: `Zona ${i}`, tipo: 'radio', area: 'Zonas', modelo: 'Motorola analógico' });
  const grupos = [
    ['LOG', 'Logística', 10, 'Logística 457.625/468.500'],
    ['PYC', 'Protección y Cuidado', 8, ''],
    ['ANF', 'Anfitriones', 6, 'Anfitriones 136.025/452.522'],
    ['GC', 'Grupos de Conexión', 6, ''],
    ['PI', 'Punto I', 5, 'Punto I 6/20'],
    ['ACO', 'Acomodación', 8, ''],
    ['ORI', 'Orientación', 6, ''],
  ];
  for (const [pref, area, n, canal] of grupos) {
    for (let i = 1; i <= n; i++) {
      agregar({ codigo: `${pref}-${String(i).padStart(2, '0')}`, nombre: `${pref} ${i}`, tipo: 'radio', area, modelo: 'Baofeng UV-5R', canal });
    }
  }
  const tallas = ['M', 'L', 'XL', 'S'];
  for (let i = 1; i <= 20; i++) {
    agregar({ codigo: `IMP-${String(i).padStart(2, '0')}`, nombre: `Impermeable ${i}`, tipo: 'impermeable', area: 'Logística', talla: tallas[i % 4] });
  }

  const areas = ['Logística', 'Protección y Cuidado', 'Anfitriones', 'Grupos de Conexión', 'Punto I', 'Acomodación', 'Orientación', 'Zonas'];
  const personas = NOMBRES.map((nombre, i) => {
    const op = guardarPersona({
      nombre,
      telefono: `3${String(100000000 + Math.floor(r() * 899999999))}`,
      area: areas[i % areas.length],
      cargo: i < 3 ? 'Coordinador(a)' : 'Servidor(a)',
    }, ahora - 40 * 864e5);
    ops.push(op);
    return { id: op.id, ...op.data };
  });

  const yo = { uid: usuario.uid, nombre: usuario.nombre };
  const operadores = [yo, { uid: 'demo-op', nombre: 'Juliana (Logística)' }];
  const indice = new Map(equipos.map((e) => [e.id, e]));

  // Servicios de las últimas 4 semanas: domingos 8, 10 y 12; miércoles 7 p. m.
  const servicios = [];
  for (let d = 28; d >= 1; d--) {
    const dia = new Date(ahora - d * 864e5);
    const dow = dia.getDay();
    const horas = dow === 0 ? [8, 10, 12] : dow === 3 ? [19] : dow === 6 ? [17] : [];
    for (const h of horas) {
      const t = new Date(dia); t.setHours(h - 1, Math.floor(r() * 40), 0, 0);
      servicios.push(t.getTime());
    }
  }

  const ocupadoHasta = new Map();
  for (const inicio of servicios) {
    const cuantos = 10 + Math.floor(r() * 18);
    const libres = equipos
      .filter((e) => (ocupadoHasta.get(e.id) || 0) < inicio && r() < 0.9)
      .sort(() => r() - 0.5)
      .slice(0, cuantos);
    for (const eq of libres) {
      const per = personas[Math.floor(r() * personas.length)];
      const por = operadores[Math.floor(r() * operadores.length)];
      const desde = inicio + Math.floor(r() * 35) * 60000;
      const minutos = 70 + Math.floor(r() * 110);
      ocupadoHasta.set(eq.id, desde + minutos * 60000);
      const novedad = r() < 0.05;
      ops.push({
        op: 'set', col: 'prestamos', id: nuevoId(),
        data: {
          entregaId: nuevoId(), equipoId: eq.id, equipoNombre: eq.nombre, tipo: eq.tipo, equipoArea: eq.area,
          personaId: per.id, personaNombre: per.nombre, personaArea: per.area, personaTelefono: per.telefono,
          entregadoPor: por, fechaEntrega: desde, accesorios: r() < 0.15 ? 'Manos libres' : '', obsEntrega: '',
          conFirma: false, devuelto: true, fechaDevolucion: desde + minutos * 60000,
          recibidoPor: operadores[Math.floor(r() * operadores.length)],
          estadoDevolucion: novedad ? 'novedad' : 'ok', obsDevolucion: novedad ? 'Antena floja' : '', minutos,
          registrado: desde,
        },
      });
      const e = indice.get(eq.id);
      e.usos += 1; e.minutosUso += minutos; e.ultimoUso = desde + minutos * 60000;
      per.usos += 1; per.ultimoUso = desde;
    }
  }

  // Préstamos abiertos ahora (uno con varias horas para ver la alerta).
  const abiertos = [
    ['OMEGA-01', 0, 35], ['LOG-01', 1, 50], ['LOG-02', 1, 50], ['IMP-03', 1, 50], ['PYC-01', 2, 25],
    ['ANF-02', 3, 70], ['ZONA-02', 4, 15], ['IMP-07', 5, 300], ['ACO-04', 6, 12],
  ];
  for (const [codigo, ip, hace] of abiertos) {
    const eq = indice.get(codigo);
    const per = personas[ip];
    const id = nuevoId();
    const entregaId = nuevoId();
    const desde = ahora - hace * 60000;
    ops.push({
      op: 'set', col: 'prestamos', id,
      data: {
        entregaId, equipoId: eq.id, equipoNombre: eq.nombre, tipo: eq.tipo, equipoArea: eq.area,
        personaId: per.id, personaNombre: per.nombre, personaArea: per.area, personaTelefono: per.telefono,
        entregadoPor: yo, fechaEntrega: desde, accesorios: '', obsEntrega: '', conFirma: false,
        devuelto: false, fechaDevolucion: null, recibidoPor: null, estadoDevolucion: null, obsDevolucion: '', minutos: null,
        registrado: desde,
      },
    });
    eq.estado = 'prestado';
    eq.prestamo = {
      id, entregaId, personaId: per.id, personaNombre: per.nombre, personaArea: per.area,
      personaTelefono: per.telefono, desde, entregadoPor: yo.nombre, accesorios: '',
    };
    per.usos += 1; per.ultimoUso = desde;
  }
  Object.assign(indice.get('PYC-08'), { estado: 'mantenimiento', notaEstado: 'No carga la batería' });
  Object.assign(indice.get('IMP-20'), { estado: 'perdido', notaEstado: 'No se devolvió el 14/09' });

  // Los equipos y personas se reescriben con los contadores ya calculados.
  for (const o of ops) {
    if (o.col === 'equipos') o.data = { ...indice.get(o.id) };
    if (o.col === 'personas') {
      const p = personas.find((x) => x.id === o.id);
      o.data = { ...p };
    }
    if (o.data && 'id' in o.data) delete o.data.id;
  }
  return ops;
}
