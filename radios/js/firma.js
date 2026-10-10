// Recuadro de firma con el dedo. Reemplaza la columna "Firma" del cuaderno.

import { h, boton } from './ui.js';

export function crearFirma({ alCambiar } = {}) {
  const lienzo = h('canvas', { class: 'firma-lienzo', 'aria-label': 'Recuadro para firmar' });
  const ctx = lienzo.getContext('2d');
  let trazos = 0, dibujando = false, ult = null;

  const ajustar = () => {
    const r = lienzo.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    const copia = trazos ? lienzo.toDataURL() : null;
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0d1b2a';
    ctx.lineWidth = 2.4;
    if (copia) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
      img.src = copia;
    }
  };
  const obs = new ResizeObserver(ajustar);
  obs.observe(lienzo);

  const punto = (e) => {
    const r = lienzo.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  lienzo.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    lienzo.setPointerCapture(e.pointerId);
    dibujando = true;
    ult = punto(e);
    ctx.beginPath();
    ctx.arc(ult.x, ult.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1b2a';
    ctx.fill();
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!dibujando) return;
    const p = punto(e);
    const medio = { x: (ult.x + p.x) / 2, y: (ult.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(ult.x, ult.y);
    ctx.quadraticCurveTo(ult.x, ult.y, medio.x, medio.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ult = p;
  });
  const soltar = () => {
    if (!dibujando) return;
    dibujando = false;
    trazos++;
    alCambiar?.();
  };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  function limpiar() {
    const r = lienzo.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    trazos = 0;
    alCambiar?.();
  }

  const el = h('div', { class: 'firma' },
    lienzo,
    h('div', { class: 'firma-linea' }, 'Firma de quien recibe'),
    boton('Borrar', { tipo: 'texto', clase: 'firma-borrar', onclick: limpiar }));

  return {
    el,
    limpiar,
    get vacia() { return trazos === 0; },
    // PNG pequeño (≈5 KB) para no inflar la base de datos.
    exportar() {
      if (!trazos) return null;
      const r = lienzo.getBoundingClientRect();
      const ancho = 360, alto = Math.round((360 * r.height) / r.width);
      const c = document.createElement('canvas');
      c.width = ancho; c.height = alto;
      c.getContext('2d').drawImage(lienzo, 0, 0, ancho, alto);
      return c.toDataURL('image/png');
    },
    destruir() { obs.disconnect(); },
  };
}
