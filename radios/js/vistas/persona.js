// Ficha de una persona: lo que tiene ahora, su carnet QR e historial.

import { app, alCambiar, puede, ejecutar, ordenarEquipos } from '../estado.js';
import { h, vaciar, icono, boton, chipArea, confirmar, vacio, avisoError } from '../ui.js';
import { encabezado, dialogoPersona, listaPrestamos, tarjetaPrestados, enlaceWhats } from '../componentes.js';
import { qrSvg, urlPersona } from '../qr.js';
import { cuando, numero, duracion } from '../util.js';

export default function vistaPersona(raiz, { params }) {
  const id = params[0];
  const cuerpo = h('div');
  const historial = h('div', null, h('p', { class: 'suave' }, 'Cargando historial…'));
  const resumen = h('div', { class: 'kpis' });

  async function cargarHistorial() {
    try {
      const l = await app.almacen.prestamosDePersona(id);
      const cerrados = l.filter((p) => p.devuelto && p.minutos != null);
      const novedades = l.filter((p) => p.devuelto && p.estadoDevolucion && p.estadoDevolucion !== 'ok').length;
      vaciar(resumen,
        h('div', { class: 'kpi' }, h('strong', null, numero(l.length)), h('span', null, 'préstamos')),
        h('div', { class: 'kpi' }, h('strong', null, cerrados.length ? duracion(cerrados.reduce((s, p) => s + p.minutos, 0) / cerrados.length) : '—'), h('span', null, 'tiempo promedio')),
        h('div', { class: 'kpi' }, h('strong', null, numero(novedades)), h('span', null, 'con novedad')));
      vaciar(historial, listaPrestamos(l.slice(0, 60), { mostrar: 'equipo' }));
    } catch (e) {
      vaciar(historial, h('p', { class: 'suave' }, `No se pudo cargar: ${e.message}`));
    }
  }

  function pintar() {
    const p = app.personas.get(id);
    if (!p) return vaciar(cuerpo, vacio('Esta persona no existe o fue eliminada.', 'alerta'));
    const tiene = ordenarEquipos([...app.equipos.values()].filter((e) => e.estado === 'prestado' && e.prestamo?.personaId === id));
    const grupo = tiene.length && {
      personaId: id, nombre: p.nombre, area: p.area, telefono: p.telefono, equipos: tiene,
      desde: Math.min(...tiene.map((e) => e.prestamo.desde)),
    };
    const dato = (k, v) => v ? h('div', { class: 'dato' }, h('span', null, k), h('strong', null, v)) : null;
    vaciar(cuerpo,
      encabezado(p.nombre, null,
        puede.operar() && boton('Editar', { ico: 'editar', onclick: () => dialogoPersona(p) })),
      h('div', { class: 'fila-acc' }, chipArea(p.area), p.cargo && h('span', { class: 'suave' }, p.cargo)),
      puede.operar() && h('a', { href: `#/entregar?p=${encodeURIComponent(id)}`, class: 'btn btn-pri btn-grande ancho' }, icono('entregar'), h('span', null, `Entregar a ${p.nombre.split(' ')[0]}`)),
      grupo ? h('section', { class: 'seccion' }, h('div', { class: 'seccion-cab' }, h('h2', null, 'Tiene ahora')), tarjetaPrestados(grupo)) : null,
      h('div', { class: 'ficha-grid' },
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Datos'),
          h('div', { class: 'datos' },
            dato('Celular', p.telefono), dato('Documento', p.documento), dato('Notas', p.notas),
            dato('Último préstamo', p.ultimoUso && cuando(p.ultimoUso))),
          p.telefono && h('div', { class: 'fila-acc' },
            h('a', { class: 'btn btn-sec btn-peq', href: `tel:${p.telefono.replace(/\s/g, '')}` }, 'Llamar'),
            enlaceWhats({ ...p, equipos: tiene }, 'WhatsApp'))),
        h('section', { class: 'tarjeta' }, h('h2', null, 'Uso'), resumen),
        h('section', { class: 'tarjeta qr-tarjeta' },
          h('h2', null, 'Carnet QR'),
          h('div', { class: 'qr', html: qrSvg(urlPersona(app.ajustes, id)) }),
          h('p', { class: 'suave mini' }, 'Al escanearlo en "Entregar" se elige a esta persona.'),
          puede.operar() && boton('Imprimir carnet', {
            tipo: 'texto', ico: 'imprimir',
            onclick: () => {
              sessionStorage.setItem('etiquetas', JSON.stringify({ tipo: 'personas', ids: [id] }));
              location.hash = '#/etiquetas';
            },
          }))),
      h('section', { class: 'tarjeta' }, h('h2', null, 'Historial'), historial),
      puede.administrar() && h('div', { class: 'acciones' },
        boton('Eliminar persona', { tipo: 'peligro', ico: 'basura', onclick: () => eliminar(p, tiene) })),
    );
  }

  async function eliminar(p, tiene) {
    if (tiene.length) return avisoError(new Error('Primero recibe los equipos que tiene.'));
    if (!(await confirmar(`¿Eliminar a ${p.nombre}? Su historial de préstamos se conserva.`, { titulo: 'Eliminar persona', si: 'Eliminar', peligro: true }))) return;
    try {
      await ejecutar([{ op: 'delete', col: 'personas', id }], { ok: 'Persona eliminada' });
      location.hash = '#/personas';
    } catch (e) { avisoError(e); }
  }

  raiz.append(h('a', { href: '#/personas', class: 'volver' }, icono('atras'), 'Personas'), cuerpo);
  pintar();
  cargarHistorial();
  let espera;
  const cortar = alCambiar((que) => {
    if (que === 'equipos' || que === 'personas') {
      pintar();
      clearTimeout(espera);
      espera = setTimeout(cargarHistorial, 1200);
    }
  });
  return () => { cortar(); clearTimeout(espera); };
}
