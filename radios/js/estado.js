// Estado compartido de la app (datos en vivo + sesión) y ayudantes comunes.

import { completarAjustes } from './util.js';
import { aviso } from './ui.js';

export const app = {
  almacen: null,
  usuario: null,
  ajustes: completarAjustes(),
  equipos: new Map(),
  personas: new Map(),
  usuarios: [],
  conexion: 'local',
  listo: false,
};

const oyentes = new Set();
export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
export function emitir(que) {
  for (const fn of [...oyentes]) {
    try { fn(que); } catch (e) { console.error(e); }
  }
}

export const puede = {
  operar: () => ['admin', 'operador'].includes(app.usuario?.rol),
  administrar: () => app.usuario?.rol === 'admin',
};

// Aplica operaciones del dominio y avisa si quedaron pendientes de sincronizar.
export async function ejecutar(ops, { ok } = {}) {
  const r = await app.almacen.aplicar(ops);
  if (r.pendiente) aviso('Guardado en este dispositivo. Se sincroniza cuando vuelva el internet.', { tipo: 'info', ms: 5000 });
  else if (ok) aviso(ok);
  return r;
}

export const tipoDe = (id) => app.ajustes.tipos.find((t) => t.id === id) || { id, nombre: id, plural: id, prefijo: '' };

const ordenTipo = (t) => {
  const i = app.ajustes.tipos.findIndex((x) => x.id === t);
  return i < 0 ? 99 : i;
};
export function ordenarEquipos(lista) {
  return lista.sort((a, b) => ordenTipo(a.tipo) - ordenTipo(b.tipo) || a.id.localeCompare(b.id, 'es', { numeric: true }));
}
export const equipos = () => ordenarEquipos([...app.equipos.values()]);

// Préstamos abiertos agrupados por persona, el más antiguo primero.
export function prestadosPorPersona() {
  const grupos = new Map();
  for (const e of app.equipos.values()) {
    if (e.estado !== 'prestado' || !e.prestamo) continue;
    const p = e.prestamo;
    if (!grupos.has(p.personaId)) {
      grupos.set(p.personaId, {
        personaId: p.personaId,
        nombre: app.personas.get(p.personaId)?.nombre || p.personaNombre,
        area: p.personaArea,
        telefono: app.personas.get(p.personaId)?.telefono || p.personaTelefono,
        desde: p.desde,
        equipos: [],
      });
    }
    const g = grupos.get(p.personaId);
    g.equipos.push(e);
    g.desde = Math.min(g.desde, p.desde);
  }
  for (const g of grupos.values()) ordenarEquipos(g.equipos);
  return [...grupos.values()].sort((a, b) => a.desde - b.desde);
}

export const vencido = (desde) => Date.now() - desde > (Number(app.ajustes.horasAlerta) || 4) * 3600e3;
