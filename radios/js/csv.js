// CSV compatible con Excel en español (separador ";" y BOM para las tildes)
// y lectura tolerante de archivos exportados desde Excel o Google Sheets.

import { descargarArchivo } from './ui.js';
import { normalizarTexto } from './util.js';

const celda = (v) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function aCSV(filas, columnas) {
  const cab = columnas.map((c) => celda(c.titulo)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';'));
  return '﻿' + [cab, ...cuerpo].join('\r\n');
}

export function descargarCSV(nombre, filas, columnas) {
  descargarArchivo(nombre, aCSV(filas, columnas), 'text/csv;charset=utf-8');
}

export function leerCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/, 1)[0] || '';
  const sep = [';', ',', '\t'].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
  const filas = [];
  let fila = [], val = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { val += '"'; i++; }
      else if (ch === '"') comillas = false;
      else val += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(val); val = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(val); val = '';
      if (fila.some((x) => x.trim())) filas.push(fila);
      fila = [];
    } else val += ch;
  }
  fila.push(val);
  if (fila.some((x) => x.trim())) filas.push(fila);
  if (!filas.length) return [];
  const cab = filas[0].map((c) => normalizarTexto(c));
  return filas.slice(1).map((f) => Object.fromEntries(cab.map((c, i) => [c, (f[i] || '').trim()])));
}

// Busca el valor de una fila por varios nombres de columna posibles.
export function col(fila, ...nombres) {
  for (const n of nombres) {
    const v = fila[normalizarTexto(n)];
    if (v) return v;
  }
  return '';
}
