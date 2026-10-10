// Reglas de negocio. Cada función arma una lista de operaciones
// ({op, col, id, data}) que luego aplica el almacenamiento activo (demo local
// o Firestore) en un solo lote. Así las dos variantes se comportan igual.
//
// Las fechas se guardan como milisegundos tomados del dispositivo: si una
// entrega se registra sin internet, conserva la hora real en que ocurrió.

import { nuevoId, normalizarCodigo } from './util.js';

export const INC = (n) => ({ __inc: n });
export const HORA_SERVIDOR = { __horaServidor: true };

// Campos que un operador puede tocar en un equipo (las reglas de Firestore
// aplican la misma lista).
export const CAMPOS_EQUIPO_OPERADOR = ['estado', 'prestamo', 'usos', 'minutosUso', 'ultimoUso', 'actualizado', 'notaEstado'];

const quien = (u) => ({ uid: u.uid, nombre: u.nombre || u.email || 'Usuario' });

function fotoPersona(p) {
  return { id: p.id, nombre: p.nombre, area: p.area || '', telefono: p.telefono || '' };
}

export function nuevoEquipo(datos, ahora = Date.now()) {
  const codigo = normalizarCodigo(datos.codigo);
  if (!codigo) throw new Error('El equipo necesita un código.');
  return {
    op: 'set', col: 'equipos', id: codigo,
    data: {
      codigo,
      tipo: datos.tipo || 'radio',
      nombre: (datos.nombre || codigo).trim(),
      area: datos.area || '',
      modelo: datos.modelo || '',
      serial: datos.serial || '',
      canal: datos.canal || '',
      talla: datos.talla || '',
      notas: datos.notas || '',
      estado: 'disponible',
      notaEstado: '',
      prestamo: null,
      usos: 0,
      minutosUso: 0,
      ultimoUso: null,
      creado: ahora,
      actualizado: ahora,
    },
  };
}

export function editarEquipo(id, datos, ahora = Date.now()) {
  const permitidos = ['tipo', 'nombre', 'area', 'modelo', 'serial', 'canal', 'talla', 'notas'];
  const data = { actualizado: ahora };
  for (const k of permitidos) if (k in datos) data[k] = typeof datos[k] === 'string' ? datos[k].trim() : datos[k];
  return { op: 'update', col: 'equipos', id, data };
}

export function guardarPersona(datos, ahora = Date.now()) {
  const limpio = {
    nombre: String(datos.nombre || '').trim(),
    documento: String(datos.documento || '').trim(),
    telefono: String(datos.telefono || '').trim(),
    area: datos.area || '',
    cargo: String(datos.cargo || '').trim(),
    notas: String(datos.notas || '').trim(),
  };
  if (!limpio.nombre) throw new Error('Escribe el nombre de la persona.');
  if (datos.id) return { op: 'update', col: 'personas', id: datos.id, data: { ...limpio, actualizado: ahora } };
  return {
    op: 'set', col: 'personas', id: nuevoId(),
    data: { ...limpio, activo: true, usos: 0, ultimoUso: null, creado: ahora, actualizado: ahora },
  };
}

export function planEntrega({ persona, equipos, usuario, accesorios = '', obs = '', firma = null, ahora = Date.now() }) {
  if (!persona) throw new Error('Falta la persona que recibe.');
  if (!equipos.length) throw new Error('Agrega al menos un equipo.');
  for (const eq of equipos) {
    if (eq.estado !== 'disponible') {
      const quienLoTiene = eq.prestamo ? ` (lo tiene ${eq.prestamo.personaNombre})` : '';
      throw new Error(`${eq.nombre || eq.id} no está disponible${quienLoTiene}.`);
    }
  }
  const ops = [];
  const entregaId = nuevoId();
  const per = fotoPersona(persona);
  const por = quien(usuario);
  if (firma) {
    ops.push({
      op: 'set', col: 'firmas', id: entregaId,
      data: { firma, personaId: per.id, personaNombre: per.nombre, fecha: ahora, entregadoPor: por },
    });
  }
  const prestamoIds = [];
  for (const eq of equipos) {
    const id = nuevoId();
    prestamoIds.push(id);
    ops.push({
      op: 'set', col: 'prestamos', id,
      data: {
        entregaId,
        equipoId: eq.id,
        equipoNombre: eq.nombre || eq.id,
        tipo: eq.tipo,
        equipoArea: eq.area || '',
        personaId: per.id,
        personaNombre: per.nombre,
        personaArea: per.area,
        personaTelefono: per.telefono,
        entregadoPor: por,
        fechaEntrega: ahora,
        accesorios: accesorios.trim(),
        obsEntrega: obs.trim(),
        conFirma: Boolean(firma),
        devuelto: false,
        fechaDevolucion: null,
        recibidoPor: null,
        estadoDevolucion: null,
        obsDevolucion: '',
        minutos: null,
        registrado: HORA_SERVIDOR,
      },
    });
    ops.push({
      op: 'update', col: 'equipos', id: eq.id,
      data: {
        estado: 'prestado',
        notaEstado: '',
        prestamo: {
          id, entregaId,
          personaId: per.id, personaNombre: per.nombre, personaArea: per.area, personaTelefono: per.telefono,
          desde: ahora, entregadoPor: por.nombre, accesorios: accesorios.trim(),
        },
        actualizado: ahora,
      },
    });
  }
  ops.push({ op: 'update', col: 'personas', id: per.id, data: { usos: INC(equipos.length), ultimoUso: ahora } });
  return { ops, entregaId, prestamoIds };
}

// estadoDevolucion: 'ok' | 'novedad'. Con mantenimiento=true el equipo queda
// fuera de circulación hasta que un administrador lo libere.
export function planRecepcion({ equipo, usuario, estadoDevolucion = 'ok', obs = '', mantenimiento = false, ahora = Date.now() }) {
  const p = equipo.prestamo;
  if (equipo.estado !== 'prestado' || !p) throw new Error(`${equipo.nombre || equipo.id} no está prestado.`);
  const minutos = Math.max(0, Math.round((ahora - p.desde) / 60000));
  const ops = [
    {
      op: 'update', col: 'prestamos', id: p.id,
      data: {
        devuelto: true, fechaDevolucion: ahora, recibidoPor: quien(usuario),
        estadoDevolucion, obsDevolucion: obs.trim(), minutos,
      },
    },
    {
      op: 'update', col: 'equipos', id: equipo.id,
      data: {
        estado: mantenimiento ? 'mantenimiento' : 'disponible',
        notaEstado: mantenimiento ? obs.trim() || 'Devuelto con novedad' : '',
        prestamo: null,
        usos: INC(1),
        minutosUso: INC(minutos),
        ultimoUso: ahora,
        actualizado: ahora,
      },
    },
  ];
  return { ops, minutos, prestamoAnterior: p };
}

// Deshace una recepción hecha por error (solo si el equipo no se volvió a prestar).
export function planDeshacerRecepcion({ equipo, prestamoAnterior, minutos, ahora = Date.now() }) {
  if (equipo.estado === 'prestado') throw new Error('El equipo ya se volvió a prestar.');
  return {
    ops: [
      {
        op: 'update', col: 'prestamos', id: prestamoAnterior.id,
        data: { devuelto: false, fechaDevolucion: null, recibidoPor: null, estadoDevolucion: null, obsDevolucion: '', minutos: null },
      },
      {
        op: 'update', col: 'equipos', id: equipo.id,
        data: {
          estado: 'prestado', notaEstado: '', prestamo: prestamoAnterior,
          usos: INC(-1), minutosUso: INC(-minutos), actualizado: ahora,
        },
      },
    ],
  };
}

// Novedad registrada después de recibir (por ejemplo, tras el modo rápido).
export function planNovedad({ equipoId, prestamoId, obs, mantenimiento, ahora = Date.now() }) {
  const ops = [
    { op: 'update', col: 'prestamos', id: prestamoId, data: { estadoDevolucion: 'novedad', obsDevolucion: obs.trim() } },
  ];
  if (mantenimiento) {
    ops.push({
      op: 'update', col: 'equipos', id: equipoId,
      data: { estado: 'mantenimiento', notaEstado: obs.trim() || 'Devuelto con novedad', actualizado: ahora },
    });
  }
  return { ops };
}

// Cambio manual de estado (administración). Si el equipo estaba prestado, el
// préstamo se cierra: como "perdido" o como recibido por quien hace el cambio.
export function planCambioEstado({ equipo, estado, usuario, nota = '', ahora = Date.now() }) {
  const ops = [];
  const data = { estado, notaEstado: nota.trim(), actualizado: ahora };
  if (equipo.prestamo) {
    const minutos = Math.max(0, Math.round((ahora - equipo.prestamo.desde) / 60000));
    ops.push({
      op: 'update', col: 'prestamos', id: equipo.prestamo.id,
      data: {
        devuelto: true, fechaDevolucion: ahora, recibidoPor: quien(usuario),
        estadoDevolucion: estado === 'perdido' ? 'perdido' : 'novedad',
        obsDevolucion: nota.trim() || `Cerrado al pasar a ${estado}`,
        minutos,
      },
    });
    Object.assign(data, { prestamo: null, usos: INC(1), minutosUso: INC(minutos), ultimoUso: ahora });
  }
  ops.push({ op: 'update', col: 'equipos', id: equipo.id, data });
  return { ops };
}
