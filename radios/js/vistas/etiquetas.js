// Hoja imprimible de etiquetas QR para equipos y carnets para personas.

import { app, equipos as todos, tipoDe } from '../estado.js';
import { h, vaciar, boton, selector, colorArea, descargarArchivo, avisoError } from '../ui.js';
import { encabezado, opcionesArea } from '../componentes.js';
import { qrSvg, urlEquipo, urlPersona } from '../qr.js';

const TAMANOS = {
  pequena: ['Pequeña 4,5 × 2,2 cm (radios)', 'et-pequena'],
  mediana: ['Mediana 6 × 3 cm', 'et-mediana'],
  grande: ['Grande 5 × 7 cm (impermeables, colgante)', 'et-grande'],
};

export default function vistaEtiquetas(raiz) {
  let previo = null;
  try { previo = JSON.parse(sessionStorage.getItem('etiquetas')); } catch { /* sin selección previa */ }
  const st = {
    tipo: previo?.tipo === 'personas' ? 'personas' : 'equipos',
    ids: new Set(previo?.ids || []),
    filtroTipo: '', filtroArea: '', tamano: 'pequena',
  };
  if (!previo) for (const e of todos()) st.ids.add(e.id);
  sessionStorage.removeItem('etiquetas');

  const controles = h('div', { class: 'no-imprimir' });
  const seleccion = h('details', { class: 'tarjeta seleccion no-imprimir' });
  const hoja = h('div', { class: 'hoja' });

  const candidatos = () => st.tipo === 'personas'
    ? [...app.personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : todos().filter((e) => (!st.filtroTipo || e.tipo === st.filtroTipo) && (!st.filtroArea || e.area === st.filtroArea));

  function pintarControles() {
    vaciar(controles,
      h('div', { class: 'filtros' },
        h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Qué imprimir' },
          [['equipos', 'Etiquetas de equipos'], ['personas', 'Carnets de personas']].map(([v, t]) => h('button', {
            type: 'button', class: st.tipo === v ? 'activo' : '',
            onclick: () => {
              st.tipo = v;
              st.ids = new Set(candidatos().map((x) => x.id));
              pintarTodo();
            },
          }, t))),
        st.tipo === 'equipos' && selector(Object.entries(TAMANOS).map(([k, [t]]) => [k, t]), st.tamano,
          { class: 'input compacto', 'aria-label': 'Tamaño', onchange: (e) => { st.tamano = e.target.value; pintarHoja(); } }),
        st.tipo === 'equipos' && selector([['', 'Todos los tipos'], ...app.ajustes.tipos.map((t) => [t.id, t.plural])], st.filtroTipo,
          { class: 'input compacto', 'aria-label': 'Tipo', onchange: (e) => { st.filtroTipo = e.target.value; st.ids = new Set(candidatos().map((x) => x.id)); pintarTodo(); } }),
        st.tipo === 'equipos' && selector([['', 'Todas las áreas'], ...opcionesArea().slice(1)], st.filtroArea,
          { class: 'input compacto', 'aria-label': 'Área', onchange: (e) => { st.filtroArea = e.target.value; st.ids = new Set(candidatos().map((x) => x.id)); pintarTodo(); } })),
      h('p', { class: 'suave' }, 'Consejo: imprime en papel adhesivo y cubre la etiqueta con cinta transparente. En los impermeables, usa la grande como colgante plastificado.'));
  }

  function pintarSeleccion() {
    const lista = candidatos();
    const n = lista.filter((x) => st.ids.has(x.id)).length;
    vaciar(seleccion,
      h('summary', null, `${n} de ${lista.length} seleccionados — tocar para elegir`),
      h('div', { class: 'fila-acc' },
        boton('Todos', { tipo: 'texto', onclick: () => { lista.forEach((x) => st.ids.add(x.id)); pintarSeleccion(); pintarHoja(); } }),
        boton('Ninguno', { tipo: 'texto', onclick: () => { st.ids.clear(); pintarSeleccion(); pintarHoja(); } })),
      h('div', { class: 'checks' }, lista.map((x) => h('label', { class: 'check' },
        h('input', {
          type: 'checkbox', checked: st.ids.has(x.id),
          onchange: (e) => { if (e.target.checked) st.ids.add(x.id); else st.ids.delete(x.id); seleccion.querySelector('summary').textContent = `${lista.filter((y) => st.ids.has(y.id)).length} de ${lista.length} seleccionados — tocar para elegir`; pintarHoja(); },
        }),
        h('span', null, x.nombre, st.tipo === 'equipos' && x.nombre !== x.id ? ` (${x.id})` : '')))));
    seleccion.open = seleccion.open || false;
  }

  function pintarHoja() {
    const lista = candidatos().filter((x) => st.ids.has(x.id));
    if (st.tipo === 'personas') {
      vaciar(hoja, lista.map((p) => h('div', { class: 'carnet', style: { '--c': colorArea(p.area) } },
        h('div', { class: 'carnet-cab' }, app.ajustes.orgNombre),
        h('div', { class: 'carnet-cuerpo' },
          h('div', { class: 'carnet-qr', html: qrSvg(urlPersona(app.ajustes, p.id), { margen: 1 }) }),
          h('div', { class: 'carnet-txt' },
            h('strong', null, p.nombre),
            p.area && h('span', null, p.area),
            p.cargo && h('span', null, p.cargo),
            h('small', null, 'Carnet para préstamo de radios e impermeables'))))));
    } else {
      const clase = TAMANOS[st.tamano][1];
      vaciar(hoja, lista.map((e) => h('div', { class: `etiqueta ${clase}`, style: { '--c': colorArea(e.area) } },
        h('div', { class: 'et-qr', html: qrSvg(urlEquipo(app.ajustes, e.id), { margen: 1 }) }),
        h('div', { class: 'et-txt' },
          h('strong', null, e.nombre),
          h('span', { class: 'et-cod' }, e.id),
          h('small', null, [e.area || tipoDe(e.tipo).nombre, e.talla && `Talla ${e.talla}`].filter(Boolean).join(' · '))))));
    }
    imprimir.disabled = !lista.length;
  }

  // Dentro de un enlace de Claude no se puede abrir el diálogo de impresión:
  // allí se descarga la hoja como página aparte para imprimirla desde el navegador.
  const enClaude = Boolean(window.claude?.use);
  const imprimir = boton(enClaude ? 'Descargar hoja para imprimir' : 'Imprimir', {
    tipo: 'pri', ico: enClaude ? 'descargar' : 'imprimir',
    onclick: () => (enClaude ? descargarHoja() : window.print()),
  });

  async function descargarHoja() {
    try {
      const css = await (await fetch(new URL('../../app.css', import.meta.url))).text();
      const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas QR</title>
<style>${css}\nbody{background:#fff;margin:0}.hoja{border:0}</style></head>
<body onload="setTimeout(() => print(), 300)">${hoja.outerHTML}</body></html>`;
      await descargarArchivo(st.tipo === 'personas' ? 'carnets-qr.html' : 'etiquetas-qr.html', doc, 'text/html');
    } catch (e) { avisoError(e); }
  }

  function pintarTodo() {
    pintarControles();
    pintarSeleccion();
    pintarHoja();
  }

  raiz.append(
    h('div', { class: 'no-imprimir' }, encabezado('Etiquetas QR', 'Pega una en cada radio e impermeable', imprimir)),
    controles,
    seleccion,
    hoja,
  );
  pintarTodo();
}
