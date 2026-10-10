// Gráficos sencillos en HTML: columnas con tooltip y barras horizontales con
// el valor en la punta. Una sola serie por gráfico, un solo color.

import { h } from './ui.js';
import { numero } from './util.js';

function maximoRedondo(max) {
  if (max <= 4) return Math.max(1, Math.ceil(max));
  const pot = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pot >= max) return m * pot;
  return 10 * pot;
}

/**
 * Columnas verticales. items: [{etiqueta, corta, valor, detalle}]
 * corta = texto del eje X (se muestra uno de cada `cadaN`).
 */
export function columnas(items, { unidad = 'préstamos', cadaN = 1, alto = 170, titulo = '' } = {}) {
  const max = Math.max(0, ...items.map((i) => i.valor));
  const tope = maximoRedondo(max);
  const ticks = [0, tope / 2, tope];
  const iMax = items.findIndex((i) => i.valor === max && max > 0);
  const tip = h('div', { class: 'tip', hidden: true });
  const area = h('div', { class: 'col-area', style: { height: `${alto}px` } },
    ticks.map((t) => h('span', { class: 'col-grid', style: { bottom: `${(t / tope) * 100}%` } })),
    h('div', { class: 'col-barras' }, items.map((it, i) => {
      const alturaPct = (it.valor / tope) * 100;
      const col = h('button', {
        type: 'button', class: 'col',
        'aria-label': `${it.etiqueta}: ${numero(it.valor)} ${unidad}`,
      },
      h('span', { class: 'col-barra', style: { height: it.valor ? `max(${alturaPct}%, 3px)` : '0' } },
        i === iMax ? h('span', { class: 'col-valor' }, numero(it.valor)) : null));
      const mostrar = () => {
        tip.replaceChildren(h('strong', null, `${numero(it.valor)} ${unidad}`), h('span', null, it.detalle || it.etiqueta));
        tip.hidden = false;
        const r = col.getBoundingClientRect(), base = area.getBoundingClientRect();
        tip.style.left = `${r.left - base.left + r.width / 2}px`;
        tip.style.bottom = `${Math.min(100, alturaPct)}%`;
        col.classList.add('activa');
      };
      const ocultar = () => { tip.hidden = true; col.classList.remove('activa'); };
      col.addEventListener('pointerenter', mostrar);
      col.addEventListener('focus', mostrar);
      col.addEventListener('pointerleave', ocultar);
      col.addEventListener('blur', ocultar);
      return col;
    })),
    tip);
  return h('div', { class: 'col-graf' },
    h('div', { class: 'col-eje-y', style: { height: `${alto}px` } },
      ticks.slice().reverse().map((t) => h('span', null, numero(t)))),
    h('div', { class: 'col-cuerpo' },
      area,
      h('div', { class: 'col-eje-x' }, items.map((it, i) => h('span', null, i % cadaN === 0 ? it.corta : '')))),
    h('details', { class: 'tabla-datos' },
      h('summary', null, 'Ver datos'),
      h('table', null,
        h('thead', null, h('tr', null, h('th', null, titulo || 'Periodo'), h('th', null, unidad))),
        h('tbody', null, items.map((it) => h('tr', null, h('td', null, it.detalle || it.etiqueta), h('td', null, numero(it.valor))))))));
}

/** Barras horizontales: [{etiqueta, valor, texto, href}] (texto = valor mostrado). */
export function barrasH(items, { vacio = 'Sin datos en el periodo.' } = {}) {
  if (!items.length) return h('p', { class: 'suave' }, vacio);
  const max = Math.max(...items.map((i) => i.valor)) || 1;
  return h('div', { class: 'barras-h' }, items.map((it) => {
    const contenido = [
      h('span', { class: 'bh-etq' }, it.etiqueta),
      h('span', { class: 'bh-pista' },
        h('span', { class: 'bh-barra', style: { '--p': it.valor / max } }),
        h('span', { class: 'bh-valor' }, it.texto ?? numero(it.valor))),
    ];
    return it.href ? h('a', { href: it.href, class: 'bh-fila' }, contenido) : h('div', { class: 'bh-fila' }, contenido);
  }));
}
