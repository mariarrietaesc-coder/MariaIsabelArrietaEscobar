// Ficha de un equipo: estado, quién lo tiene, QR, estadísticas e historial.
// Es también la página que abre la cámara del celular al leer su etiqueta.

import { app, alCambiar, puede, ejecutar, tipoDe } from '../estado.js';
import { h, vaciar, icono, iconoTipo, boton, insigniaEstado, chipArea, dialogo, campo, entrada, valores, confirmar, vacio, avisoError } from '../ui.js';
import { encabezado, dialogoEquipo, listaPrestamos, recibirVarios, recibirConNovedad, enlaceWhats } from '../componentes.js';
import { planCambioEstado } from '../dominio.js';
import { qrSvg, urlEquipo } from '../qr.js';
import { cuando, duracion, minutosDesde, fecha, numero, ESTADOS } from '../util.js';

export default function vistaEquipo(raiz, { params }) {
  const id = params[0];
  const cuerpo = h('div');
  const historial = h('div', null, h('p', { class: 'suave' }, 'Cargando historial…'));

  // En vivo y solo de este equipo: no se vuelve a leer con cada movimiento de otros.
  const cortarHistorial = app.almacen.observarPrestamosDe('equipoId', id,
    (l) => vaciar(historial, listaPrestamos(l.slice(0, 50), { mostrar: 'persona' })),
    (e) => vaciar(historial, h('p', { class: 'suave' }, `No se pudo cargar: ${e.message}`)));

  function pintar() {
    const e = app.equipos.get(id);
    if (!e) {
      return vaciar(cuerpo, vacio(`No existe un equipo con el código ${id}.`, 'alerta'), h('a', { href: '#/equipos', class: 'btn btn-sec' }, 'Ver equipos'));
    }
    const p = e.prestamo;
    const operar = puede.operar(), admin = puede.administrar();
    const grupo = p && { ...p, nombre: p.personaNombre, telefono: app.personas.get(p.personaId)?.telefono || p.personaTelefono, equipos: [e] };
    const dato = (k, v) => v ? h('div', { class: 'dato' }, h('span', null, k), h('strong', null, v)) : null;
    vaciar(cuerpo,
      encabezado(e.nombre, null, admin && boton('Editar', { ico: 'editar', onclick: () => dialogoEquipo(e) })),
      h('div', { class: 'ficha-cab' },
        h('span', { class: 'fila-ico grande' }, iconoTipo(e.tipo)),
        h('div', null,
          h('div', { class: 'codigo grande' }, e.id),
          h('div', { class: 'fila-acc' }, insigniaEstado(e.estado), chipArea(e.area), h('span', { class: 'suave' }, tipoDe(e.tipo).nombre)))),

      e.estado === 'prestado' && p ? h('section', { class: 'tarjeta destacada' },
        h('p', { class: 'suave' }, 'Lo tiene'),
        h('a', { href: `#/p/${encodeURIComponent(p.personaId)}`, class: 'prestado-nombre' }, h('strong', { class: 'grande' }, p.personaNombre), chipArea(p.personaArea)),
        h('p', null, `Desde ${cuando(p.desde)} (${duracion(minutosDesde(p.desde))}) · entregó ${p.entregadoPor}`),
        p.accesorios && h('p', null, `Accesorios: ${p.accesorios}`),
        h('div', { class: 'fila-acc' },
          operar && boton('Recibir ahora', { tipo: 'pri', ico: 'recibir', onclick: () => recibirVarios([e]) }),
          operar && boton('Recibir con novedad', { ico: 'alerta', onclick: () => recibirConNovedad(e) }),
          enlaceWhats(grupo, 'WhatsApp'))) : null,

      e.estado === 'disponible' && operar ? h('a', { href: `#/entregar?e=${encodeURIComponent(e.id)}`, class: 'btn btn-pri btn-grande ancho' }, icono('entregar'), h('span', null, 'Entregar este equipo')) : null,
      (e.estado === 'mantenimiento' || e.estado === 'perdido' || e.estado === 'baja') ? h('div', { class: 'alerta-caja' }, icono('alerta'),
        h('span', null, `${ESTADOS[e.estado].nombre}${e.notaEstado ? `: ${e.notaEstado}` : ''}`),
        admin && boton('Marcar disponible', { tipo: 'texto', onclick: () => cambiarEstado(e, 'disponible') })) : null,

      h('div', { class: 'ficha-grid' },
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Datos'),
          h('div', { class: 'datos' },
            dato('Modelo', e.modelo), dato('Serial', e.serial), dato('Canal / frecuencia', e.canal), dato('Talla', e.talla), dato('Notas', e.notas),
            dato('Registrado', fecha(e.creado)))),
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Uso'),
          h('div', { class: 'kpis' },
            h('div', { class: 'kpi' }, h('strong', null, numero(e.usos)), h('span', null, 'préstamos')),
            h('div', { class: 'kpi' }, h('strong', null, numero((e.minutosUso || 0) / 60, 1)), h('span', null, 'horas en total')),
            h('div', { class: 'kpi' }, h('strong', null, e.usos ? duracion((e.minutosUso || 0) / e.usos) : '—'), h('span', null, 'promedio')),
            h('div', { class: 'kpi' }, h('strong', null, e.ultimoUso ? cuando(e.ultimoUso) : '—'), h('span', null, 'último uso')))),
        h('section', { class: 'tarjeta qr-tarjeta' },
          h('h2', null, 'Código QR'),
          h('div', { class: 'qr', html: qrSvg(urlEquipo(app.ajustes, e.id)) }),
          puede.operar() && boton('Imprimir etiqueta', {
            tipo: 'texto', ico: 'imprimir',
            onclick: () => {
              sessionStorage.setItem('etiquetas', JSON.stringify({ tipo: 'equipos', ids: [e.id] }));
              location.hash = '#/etiquetas';
            },
          }))),

      h('section', { class: 'tarjeta' }, h('h2', null, 'Historial'), historial),

      admin && h('section', { class: 'tarjeta' },
        h('h2', null, 'Administración'),
        h('div', { class: 'fila-acc' },
          e.estado !== 'mantenimiento' && boton('Enviar a mantenimiento', { onclick: () => cambiarEstado(e, 'mantenimiento') }),
          e.estado !== 'perdido' && boton('Marcar perdido', { onclick: () => cambiarEstado(e, 'perdido') }),
          e.estado !== 'baja' && boton('Dar de baja', { onclick: () => cambiarEstado(e, 'baja') }),
          boton('Eliminar', { tipo: 'peligro', ico: 'basura', onclick: () => eliminar(e) }))),
    );
  }

  function cambiarEstado(e, estado) {
    const form = h('form', { class: 'form' },
      e.estado === 'prestado' && h('div', { class: 'alerta-caja' }, icono('alerta'),
        h('span', null, `Está prestado a ${e.prestamo.personaNombre}. Ese préstamo se cerrará${estado === 'perdido' ? ' como perdido' : ''}.`)),
      campo('Nota', entrada({ name: 'nota', placeholder: estado === 'disponible' ? 'Ej: reparado' : 'Ej: no carga, se dejó en el parqueadero…', value: '' })));
    dialogo({
      titulo: `Pasar ${e.nombre} a "${ESTADOS[estado].nombre}"`,
      contenido: form,
      acciones: [
        { texto: 'Cancelar' },
        { texto: 'Confirmar', tipo: 'pri', fn: () => ejecutar(planCambioEstado({ equipo: e, estado, usuario: app.usuario, nota: valores(form).nota }).ops, { ok: 'Estado actualizado' }) },
      ],
    });
  }

  async function eliminar(e) {
    if (e.estado === 'prestado') return avisoError(new Error('Primero recibe el equipo.'));
    const msg = e.usos
      ? `${e.nombre} tiene ${e.usos} préstamos en el historial, que se conservarán. Si ya no se usa, es mejor "Dar de baja". ¿Eliminarlo de todas formas?`
      : `¿Eliminar ${e.nombre}?`;
    if (!(await confirmar(msg, { titulo: 'Eliminar equipo', si: 'Eliminar', peligro: true }))) return;
    try {
      await ejecutar([{ op: 'delete', col: 'equipos', id: e.id }], { ok: 'Equipo eliminado' });
      location.hash = '#/equipos';
    } catch (err) { avisoError(err); }
  }

  raiz.append(h('a', { href: '#/equipos', class: 'volver' }, icono('atras'), 'Equipos'), cuerpo);
  pintar();
  const cortar = alCambiar((que) => { if (que === 'equipos' || que === 'ajustes') pintar(); });
  return () => { cortar(); cortarHistorial(); };
}

