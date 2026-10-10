// Frecuencia de uso: cuánto se presta, a qué horas, qué equipos rotan poco,
// cuántos equipos llegan a estar afuera al mismo tiempo.

import { app, alCambiar, equipos as todos, tipoDe } from '../estado.js';
import { h, vaciar, boton, selector, vacio, chipArea } from '../ui.js';
import { encabezado, chipEquipo, textoNovedad } from '../componentes.js';
import { selectorRango } from './historial.js';
import { columnas, barrasH } from '../graficos.js';
import { descargarCSV } from '../csv.js';
import { numero, duracion, fecha, inicioDia, fechaCorta } from '../util.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fmtDia = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

// Máximo de equipos afuera al mismo tiempo (barrido de entradas y salidas).
export function picoSimultaneo(prestamos, ahora = Date.now()) {
  const ev = [];
  for (const p of prestamos) {
    ev.push([p.fechaEntrega, 1]);
    ev.push([p.devuelto ? p.fechaDevolucion : ahora, -1]);
  }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let n = 0, max = 0, cuando = null;
  for (const [t, d] of ev) {
    n += d;
    if (n > max) { max = n; cuando = t; }
  }
  return { max, cuando };
}

export default function vistaReportes(raiz) {
  let datos = [], rango = null, tipo = '';
  const cuerpo = h('div', { class: 'reporte' });
  const rangoSel = selectorRango('30', cargar);

  async function cargar(desde, hasta, texto) {
    rango = { desde, hasta, texto };
    cuerpo.classList.add('recargando');
    try {
      datos = await app.almacen.prestamosRango(desde, hasta);
      pintar();
    } catch (e) {
      vaciar(cuerpo, vacio(`No se pudo cargar: ${e.message}`, 'alerta'));
    }
    cuerpo.classList.remove('recargando');
  }

  function pintar() {
    const l = datos.filter((p) => !tipo || p.tipo === tipo);
    if (!l.length) return vaciar(cuerpo, vacio(`No hay préstamos en el periodo (${rango.texto}).`, 'reportes'));

    const cerrados = l.filter((p) => p.devuelto && p.minutos != null);
    const horas = cerrados.reduce((s, p) => s + p.minutos, 0) / 60;
    const personas = new Set(l.map((p) => p.personaId)).size;
    const novedades = l.filter((p) => p.devuelto && p.estadoDevolucion && p.estadoDevolucion !== 'ok');
    const pico = picoSimultaneo(l);
    const porTipo = app.ajustes.tipos.map((t) => [t, l.filter((p) => p.tipo === t.id).length]).filter(([, n]) => n);

    // Por día
    const dias = [];
    const d0 = inicioDia(Math.max(rango.desde, Math.min(...l.map((p) => p.fechaEntrega))));
    const d1 = inicioDia(Math.min(rango.hasta - 1, Date.now()));
    const conteoDia = new Map();
    for (const p of l) { const k = inicioDia(p.fechaEntrega); conteoDia.set(k, (conteoDia.get(k) || 0) + 1); }
    for (let t = d0; t <= d1; t = inicioDia(t + 36 * 3600e3)) {
      dias.push({ etiqueta: fmtDia.format(t), corta: String(new Date(t).getDate()), valor: conteoDia.get(t) || 0, detalle: fmtDia.format(t) });
    }

    // Por hora (solo el tramo del día con movimiento)
    const porHora = Array(24).fill(0);
    for (const p of l) porHora[new Date(p.fechaEntrega).getHours()]++;
    const hMin = porHora.findIndex((n) => n), hMax = 23 - [...porHora].reverse().findIndex((n) => n);
    const horasItems = [];
    for (let i = Math.max(0, hMin - 1); i <= Math.min(23, hMax + 1); i++) {
      horasItems.push({ etiqueta: `${i}:00`, corta: `${i}`, valor: porHora[i], detalle: `De ${i}:00 a ${i}:59` });
    }

    // Por día de la semana (empezando el lunes)
    const porSemana = Array(7).fill(0);
    for (const p of l) porSemana[new Date(p.fechaEntrega).getDay()]++;
    const semana = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ etiqueta: DIAS[d], valor: porSemana[d] })).filter((x) => x.valor);

    // Por área de quien recibe
    const porArea = new Map();
    for (const p of l) porArea.set(p.personaArea || 'Sin área', (porArea.get(p.personaArea || 'Sin área') || 0) + 1);
    const areas = [...porArea].sort((a, b) => b[1] - a[1]).map(([a, n]) => ({ etiqueta: a, valor: n }));

    // Equipos
    const porEquipo = new Map();
    for (const p of l) {
      const e = porEquipo.get(p.equipoId) || { id: p.equipoId, nombre: p.equipoNombre, n: 0, min: 0 };
      e.n++; e.min += p.minutos || 0;
      porEquipo.set(p.equipoId, e);
    }
    const topEquipos = [...porEquipo.values()].sort((a, b) => b.n - a.n || b.min - a.min).slice(0, 10)
      .map((e) => ({ etiqueta: e.nombre, valor: e.n, texto: `${e.n} · ${numero(e.min / 60, 0)} h`, href: `#/e/${encodeURIComponent(e.id)}` }));
    const sinUso = todos().filter((e) => (!tipo || e.tipo === tipo) && e.estado !== 'baja' && e.estado !== 'perdido' && !porEquipo.has(e.id));

    // Personas
    const porPersona = new Map();
    for (const p of l) {
      const x = porPersona.get(p.personaId) || { id: p.personaId, nombre: p.personaNombre, n: 0 };
      x.n++;
      porPersona.set(p.personaId, x);
    }
    const topPersonas = [...porPersona.values()].sort((a, b) => b.n - a.n).slice(0, 10)
      .map((x) => ({ etiqueta: x.nombre, valor: x.n, href: `#/p/${encodeURIComponent(x.id)}` }));

    // Novedades por tipo (una devolución puede tener varios)
    const porNovedad = new Map();
    for (const p of novedades) {
      const tipos = p.estadoDevolucion === 'perdido' ? ['Perdido'] : p.novedades?.length ? p.novedades : ['Sin tipo'];
      for (const t of tipos) porNovedad.set(t, (porNovedad.get(t) || 0) + 1);
    }
    const tiposNovedad = [...porNovedad].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ etiqueta: t, valor: n }));

    const kpi = (valor, etiqueta, detalle) => h('div', { class: 'kpi' }, h('strong', null, valor), h('span', null, etiqueta), detalle && h('small', null, detalle));

    vaciar(cuerpo,
      h('div', { class: 'kpis fila-kpis' },
        kpi(numero(l.length), 'préstamos', porTipo.map(([t, n]) => `${n} ${n === 1 ? t.nombre.toLowerCase() : t.plural.toLowerCase()}`).join(' · ')),
        kpi(numero(personas), 'personas distintas'),
        kpi(numero(horas, 0), 'horas de uso', cerrados.length ? `${duracion((horas * 60) / cerrados.length)} en promedio` : null),
        kpi(numero(pico.max), 'máximo afuera a la vez', pico.cuando ? fecha(pico.cuando) : null),
        kpi(numero(novedades.length), 'devueltos con novedad', l.length ? `${numero((novedades.length / l.length) * 100, 1)} %` : null)),

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Préstamos por día'),
        columnas(dias, { cadaN: dias.length > 16 ? Math.ceil(dias.length / 12) : 1, titulo: 'Día' })),

      h('div', { class: 'ficha-grid dos-col' },
        h('section', { class: 'tarjeta' },
          h('h2', null, '¿A qué hora se presta más?'),
          h('p', { class: 'suave mini' }, 'Hora de entrega. Útil para saber cuándo reforzar la mesa de Logística.'),
          columnas(horasItems, { titulo: 'Hora', cadaN: horasItems.length > 12 ? 2 : 1 })),
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Por día de la semana'),
          barrasH(semana))),

      h('div', { class: 'ficha-grid dos-col' },
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Equipos más usados'),
          h('p', { class: 'suave mini' }, 'Préstamos · horas de uso en el periodo'),
          barrasH(topEquipos)),
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Por área de quien recibe'),
          barrasH(areas))),

      h('div', { class: 'ficha-grid dos-col' },
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Personas con más préstamos'),
          barrasH(topPersonas)),
        h('section', { class: 'tarjeta' },
          h('h2', null, `Sin uso en el periodo (${sinUso.length})`),
          sinUso.length
            ? [h('p', { class: 'suave mini' }, 'Conviene rotarlos para repartir el desgaste de las baterías, o revisar si siguen en el armario.'),
              h('div', { class: 'prestado-eqs' }, sinUso.slice(0, 40).map((e) => h('a', { href: `#/e/${encodeURIComponent(e.id)}` }, chipEquipo(e)))),
              sinUso.length > 40 ? h('p', { class: 'suave mini' }, `y ${sinUso.length - 40} más`) : null]
            : h('p', { class: 'suave' }, 'Todos los equipos se usaron al menos una vez.'))),

      novedades.length ? h('section', { class: 'tarjeta' },
        h('h2', null, 'Novedades por tipo'),
        h('p', { class: 'suave mini' }, 'Fallas de batería, antenas, accesorios… registradas al recibir.'),
        barrasH(tiposNovedad)) : null,

      novedades.length ? h('section', { class: 'tarjeta' },
        h('h2', null, 'Devoluciones con novedad'),
        h('div', { class: 'lista' }, novedades.slice(0, 30).map((p) => h('a', { href: `#/e/${encodeURIComponent(p.equipoId)}`, class: 'fila fila-btn' },
          h('div', { class: 'fila-txt' },
            h('strong', null, `${p.equipoNombre} · ${p.personaNombre}`),
            h('small', null, `${fecha(p.fechaDevolucion)} · ${textoNovedad(p)}`)),
          chipArea(p.personaArea))))) : null,
    );

    exportarResumen = () => descargarCSV(`uso-por-equipo-${fechaCorta(rango.desde)}-${fechaCorta(rango.hasta - 1)}.csv`.replace(/\s|\./g, ''),
      todos().filter((e) => !tipo || e.tipo === tipo), [
        { titulo: 'Codigo', valor: (e) => e.id },
        { titulo: 'Nombre', valor: (e) => e.nombre },
        { titulo: 'Tipo', valor: (e) => tipoDe(e.tipo).nombre },
        { titulo: 'Area', valor: (e) => e.area },
        { titulo: 'Prestamos en el periodo', valor: (e) => porEquipo.get(e.id)?.n || 0 },
        { titulo: 'Horas en el periodo', valor: (e) => numero((porEquipo.get(e.id)?.min || 0) / 60, 1) },
        { titulo: 'Prestamos historicos', valor: (e) => e.usos || 0 },
        { titulo: 'Horas historicas', valor: (e) => numero((e.minutosUso || 0) / 60, 1) },
        { titulo: 'Estado actual', valor: (e) => e.estado },
      ]);
  }

  let exportarResumen = () => {};

  raiz.append(
    encabezado('Reportes', 'Frecuencia de uso de radios e impermeables',
      boton('Uso por equipo (Excel)', { ico: 'descargar', onclick: () => exportarResumen() })),
    h('div', { class: 'filtros' },
      rangoSel.el,
      selector([['', 'Todos los tipos'], ...app.ajustes.tipos.map((t) => [t.id, t.plural])], '',
        { class: 'input compacto', 'aria-label': 'Tipo', onchange: (e) => { tipo = e.target.value; if (rango) pintar(); } })),
    cuerpo,
  );
  rangoSel.emitir();

  const cortar = alCambiar((que) => { if (que === 'ajustes' && rango) pintar(); });
  return cortar;
}

