// Historial de movimientos: el equivalente digital del cuaderno de préstamos.

import { app, alCambiar, tipoDe } from '../estado.js';
import { h, vaciar, icono, boton, entrada, selector, vacio } from '../ui.js';
import { encabezado, listaPrestamos } from '../componentes.js';
import { descargarCSV } from '../csv.js';
import { coincide, inicioDia, fecha, hora, plural, soloFecha } from '../util.js';

export const RANGOS = {
  hoy: ['Hoy', () => [inicioDia(), inicioDia() + 864e5]],
  ayer: ['Ayer', () => [inicioDia() - 864e5, inicioDia()]],
  '7': ['Últimos 7 días', () => [inicioDia() - 6 * 864e5, inicioDia() + 864e5]],
  '30': ['Últimos 30 días', () => [inicioDia() - 29 * 864e5, inicioDia() + 864e5]],
  '90': ['Últimos 90 días', () => [inicioDia() - 89 * 864e5, inicioDia() + 864e5]],
  mes: ['Este mes', () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), inicioDia() + 864e5]; }],
  ano: ['Este año', () => [new Date(new Date().getFullYear(), 0, 1).getTime(), inicioDia() + 864e5]],
  otro: ['Personalizado', null],
};

const aFechaInput = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const deFechaInput = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d).getTime(); };

// Selector de rango reutilizado por Historial y Reportes.
export function selectorRango(inicial, alCambiarRango) {
  let clave = inicial;
  const desde = entrada({ type: 'date', 'aria-label': 'Desde' });
  const hasta = entrada({ type: 'date', 'aria-label': 'Hasta' });
  const personal = h('div', { class: 'rango-personal', hidden: true }, desde, h('span', null, 'a'), hasta);
  const emitir = () => {
    if (clave === 'otro') {
      if (!desde.value || !hasta.value) return;
      alCambiarRango(deFechaInput(desde.value), deFechaInput(hasta.value) + 864e5, `${desde.value} a ${hasta.value}`);
    } else {
      const [d, a] = RANGOS[clave][1]();
      alCambiarRango(d, a, RANGOS[clave][0]);
    }
  };
  const sel = selector(Object.entries(RANGOS).map(([k, [t]]) => [k, t]), clave, {
    class: 'input compacto', 'aria-label': 'Periodo',
    onchange: (e) => {
      clave = e.target.value;
      personal.hidden = clave !== 'otro';
      if (clave === 'otro' && !desde.value) {
        desde.value = aFechaInput(inicioDia() - 6 * 864e5);
        hasta.value = aFechaInput(Date.now());
      }
      emitir();
    },
  });
  desde.addEventListener('change', emitir);
  hasta.addEventListener('change', emitir);
  return { el: h('div', { class: 'rango' }, sel, personal), emitir };
}

export default function vistaHistorial(raiz) {
  const f = { q: '', estado: '', tipo: '' };
  let datos = [], rango = null;
  const lista = h('div');
  const conteo = h('p', { class: 'suave' });
  const buscar = entrada({ type: 'search', placeholder: 'Buscar equipo, persona o quien entregó…', 'aria-label': 'Buscar' });
  buscar.addEventListener('input', () => { f.q = buscar.value; pintar(); });

  const filtrados = () => datos.filter((p) =>
    (!f.tipo || p.tipo === f.tipo) &&
    (!f.estado || (f.estado === 'abiertos' ? !p.devuelto : f.estado === 'devueltos' ? p.devuelto : p.devuelto && p.estadoDevolucion !== 'ok')) &&
    coincide(f.q, p.equipoNombre, p.equipoId, p.personaNombre, p.personaArea, p.entregadoPor?.nombre, p.recibidoPor?.nombre));

  function pintar() {
    const l = filtrados();
    const abiertos = l.filter((p) => !p.devuelto).length;
    conteo.textContent = `${plural(l.length, 'movimiento', 'movimientos')}${abiertos ? ` · ${abiertos} sin devolver` : ''}${rango ? ` · ${rango.texto}` : ''}`;
    vaciar(lista, l.length ? listaPrestamos(l) : vacio('No hay movimientos en este periodo.', 'historial'));
  }

  async function cargar(desde, hasta, texto) {
    rango = { desde, hasta, texto };
    vaciar(lista, h('p', { class: 'suave' }, 'Cargando…'));
    try {
      datos = await app.almacen.prestamosRango(desde, hasta);
      pintar();
    } catch (e) {
      vaciar(lista, vacio(`No se pudo cargar: ${e.message}`, 'alerta'));
    }
  }

  const rangoSel = selectorRango('7', cargar);

  function exportar() {
    descargarCSV(`movimientos-${new Date().toISOString().slice(0, 10)}.csv`, filtrados(), [
      { titulo: 'Fecha', valor: (p) => soloFecha(p.fechaEntrega) },
      { titulo: 'Hora', valor: (p) => hora(p.fechaEntrega) },
      { titulo: 'Nombre', valor: (p) => p.personaNombre },
      { titulo: 'Area', valor: (p) => p.personaArea },
      { titulo: 'Celular', valor: (p) => p.personaTelefono },
      { titulo: 'Equipo', valor: (p) => p.equipoNombre },
      { titulo: 'Codigo', valor: (p) => p.equipoId },
      { titulo: 'Tipo', valor: (p) => tipoDe(p.tipo).nombre },
      { titulo: 'Accesorios', valor: (p) => p.accesorios },
      { titulo: 'Entrego', valor: (p) => p.entregadoPor?.nombre },
      { titulo: 'Firma', valor: (p) => (p.conFirma ? 'Sí' : 'No') },
      { titulo: 'Devuelto', valor: (p) => (p.devuelto ? 'Sí' : 'No') },
      { titulo: 'Fecha devolucion', valor: (p) => (p.devuelto ? fecha(p.fechaDevolucion) : '') },
      { titulo: 'Recibio', valor: (p) => p.recibidoPor?.nombre || '' },
      { titulo: 'Minutos', valor: (p) => p.minutos ?? '' },
      { titulo: 'Estado devolucion', valor: (p) => ({ ok: 'Bien', novedad: 'Con novedad', perdido: 'Perdido' }[p.estadoDevolucion] || '') },
      { titulo: 'Observaciones', valor: (p) => [p.obsEntrega, p.obsDevolucion].filter(Boolean).join(' / ') },
    ]);
  }

  raiz.append(
    encabezado('Historial', 'Todas las entregas y devoluciones',
      boton('Exportar a Excel', { ico: 'descargar', onclick: exportar })),
    h('div', { class: 'buscador' }, icono('buscar'), buscar),
    h('div', { class: 'filtros' },
      rangoSel.el,
      selector([['', 'Todos'], ['abiertos', 'Sin devolver'], ['devueltos', 'Devueltos'], ['novedad', 'Con novedad']], '',
        { class: 'input compacto', 'aria-label': 'Estado', onchange: (e) => { f.estado = e.target.value; pintar(); } }),
      selector([['', 'Todos los tipos'], ...app.ajustes.tipos.map((t) => [t.id, t.plural])], '',
        { class: 'input compacto', 'aria-label': 'Tipo', onchange: (e) => { f.tipo = e.target.value; pintar(); } })),
    conteo,
    lista,
  );
  rangoSel.emitir();

  let espera;
  const cortar = alCambiar((que) => {
    if (que !== 'equipos' || !rango) return;
    clearTimeout(espera);
    espera = setTimeout(() => cargar(rango.desde, rango.hasta, rango.texto), 1500);
  });
  return () => { cortar(); clearTimeout(espera); };
}
