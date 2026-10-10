// Códigos QR: el QR de un equipo es un enlace a la app (#/e/CODIGO), así
// funciona tanto con el lector de la app como con la cámara normal del celular.

import qrcode from '../vendor/qrcode.min.mjs';
import { normalizarCodigo } from './util.js';

export function baseApp(ajustes) {
  const b = (ajustes?.urlBase || '').trim();
  if (b) return b.replace(/#.*$/, '').replace(/\/?$/, '/');
  return location.origin + location.pathname;
}

export const urlEquipo = (ajustes, codigo) => `${baseApp(ajustes)}#/e/${encodeURIComponent(codigo)}`;
export const urlPersona = (ajustes, id) => `${baseApp(ajustes)}#/p/${encodeURIComponent(id)}`;

// SVG del QR como texto (lo genera la app, no viene del usuario).
export function qrSvg(texto, { margen = 2, nivel = 'M' } = {}) {
  const qr = qrcode(0, nivel);
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) if (qr.isDark(f, c)) d += `M${c + margen} ${f + margen}h1v1h-1z`;
  }
  const t = n + margen * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

// Interpreta lo leído por la cámara o un lector USB: enlace de la app,
// código de equipo escrito a mano o id de persona.
export function interpretar(texto, { equipos, personas }) {
  const t = String(texto || '').trim();
  if (!t) return null;
  const m = t.match(/#\/([ep])\/([^/?#\s]+)/);
  if (m) {
    const id = decodeURIComponent(m[2]);
    if (m[1] === 'e') return { tipo: 'equipo', id: normalizarCodigo(id) };
    return { tipo: 'persona', id };
  }
  const cod = normalizarCodigo(t);
  if (equipos.has(cod)) return { tipo: 'equipo', id: cod };
  if (personas.has(t)) return { tipo: 'persona', id: t };
  const porDoc = [...personas.values()].find((p) => p.documento && p.documento.replace(/\D/g, '') === t.replace(/\D/g, '') && /\d{5,}/.test(t));
  if (porDoc) return { tipo: 'persona', id: porDoc.id };
  return { tipo: 'desconocido', texto: t };
}
