// Constantes del dominio y utilidades de formato compartidas por toda la app.

import * as config from '../config.js';

export const ESTADOS = {
  disponible: { nombre: 'Disponible', tono: 'ok' },
  prestado: { nombre: 'Prestado', tono: 'warn' },
  mantenimiento: { nombre: 'Mantenimiento', tono: 'info' },
  perdido: { nombre: 'Perdido', tono: 'bad' },
  baja: { nombre: 'De baja', tono: 'muted' },
};

export const ROLES = {
  admin: { nombre: 'Administrador', desc: 'Todo: equipos, usuarios, ajustes y reportes' },
  operador: { nombre: 'Operador', desc: 'Entrega y recibe equipos, registra personas' },
  consulta: { nombre: 'Consulta', desc: 'Solo ve el estado, el historial y los reportes' },
};

export const AJUSTES_BASE = {
  orgNombre: config.marca?.organizacion || 'Logística',
  urlBase: '',
  horasAlerta: 4,
  firmaObligatoria: false,
  mensajeWhatsApp:
    'Hola {nombre}, te recordamos devolver {equipos} en Logística. ¡Gracias por tu servicio!',
  // Tipos de novedad al devolver; mant = sugiere enviar a mantenimiento.
  novedades: [
    { nombre: 'Falla de batería', mant: true },
    { nombre: 'No enciende', mant: true },
    { nombre: 'Antena dañada o floja', mant: true },
    { nombre: 'Sin audio o no transmite', mant: true },
    { nombre: 'Falta accesorio', mant: false },
    { nombre: 'Golpe o daño físico', mant: true },
    { nombre: 'Impermeable roto', mant: true },
    { nombre: 'Mojado o sucio', mant: false },
    { nombre: 'Otro', mant: false },
  ],
  tipos: [
    { id: 'radio', nombre: 'Radio', plural: 'Radios', prefijo: 'R' },
    { id: 'impermeable', nombre: 'Impermeable', plural: 'Impermeables', prefijo: 'IMP' },
  ],
  // Colores de los letreros de cada área en el armario de Logística.
  areas: [
    { nombre: 'Logística', color: '#2fb08c' },
    { nombre: 'Grupos de Conexión', color: '#b0359e' },
    { nombre: 'Protección y Cuidado', color: '#1d55c8' },
    { nombre: 'Anfitriones', color: '#d0213d' },
    { nombre: 'Punto I', color: '#e8571e' },
    { nombre: 'Zonas', color: '#e0b100' },
    { nombre: 'Acomodación', color: '#5b6b7f' },
    { nombre: 'Orientación', color: '#0e8f9a' },
    { nombre: 'Producción', color: '#6a4c93' },
    { nombre: 'Coordinadores (Omega)', color: '#17191e' },
  ],
};

export function completarAjustes(a) {
  const base = structuredClone(AJUSTES_BASE);
  if (!a) return base;
  const r = { ...base, ...a };
  if (!Array.isArray(r.tipos) || !r.tipos.length) r.tipos = base.tipos;
  if (!Array.isArray(r.areas)) r.areas = base.areas;
  if (!Array.isArray(r.novedades) || !r.novedades.length) r.novedades = base.novedades;
  // Radio e impermeable siempre existen: la app depende de ellos.
  for (const t of base.tipos) if (!r.tipos.some((x) => x.id === t.id)) r.tipos.unshift(t);
  return r;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function nuevoId(largo = 20) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  let s = '';
  for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
  return s;
}

export function sinTildes(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizarTexto(s) {
  return sinTildes(s).toLowerCase().trim();
}

// El código de un equipo es también el id del documento y lo que va en el QR,
// así que se limita a letras, números y guiones.
export function normalizarCodigo(s) {
  return sinTildes(s)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_.-]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30);
}

export function coincide(texto, ...campos) {
  const q = normalizarTexto(texto);
  if (!q) return true;
  const hay = normalizarTexto(campos.filter(Boolean).join(' '));
  return q.split(/\s+/).every((p) => hay.includes(p));
}

const fmtFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtSoloFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtFechaCorta = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDiaLargo = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

export const fecha = (ms) => (ms ? fmtFechaHora.format(ms) : '—');
export const soloFecha = (ms) => (ms ? fmtSoloFecha.format(ms) : '');
export const fechaCorta = (ms) => (ms ? fmtFechaCorta.format(ms) : '—');
export const hora = (ms) => (ms ? fmtHora.format(ms) : '—');
export const diaLargo = (ms) => fmtDiaLargo.format(ms);

export function esHoy(ms) {
  const d = new Date(ms), h = new Date();
  return d.toDateString() === h.toDateString();
}

// "hoy 12:10", "ayer 18:30" o "08/10/26 12:10"
export function cuando(ms) {
  if (!ms) return '—';
  if (esHoy(ms)) return `hoy ${hora(ms)}`;
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  if (new Date(ms).toDateString() === ayer.toDateString()) return `ayer ${hora(ms)}`;
  return fecha(ms);
}

export function duracion(min) {
  if (min == null || isNaN(min)) return '—';
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 48) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} días`;
}

export const minutosDesde = (ms, ahora = Date.now()) => Math.max(0, (ahora - ms) / 60000);

export function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function numero(n, dec = 0) {
  return Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

export function inicioDia(ms = Date.now()) {
  const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime();
}

// Número de WhatsApp: celulares colombianos de 10 dígitos reciben el 57.
export function telefonoWhatsApp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10 && d.startsWith('3')) d = '57' + d;
  return d.length >= 10 ? d : null;
}

export function enlaceWhatsApp(tel, texto) {
  const n = telefonoWhatsApp(tel);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

export function mensajeRecordatorio(plantilla, persona, equipos) {
  const lista = equipos.map((e) => e.nombre || e.id).join(', ');
  return String(plantilla || AJUSTES_BASE.mensajeWhatsApp)
    .replaceAll('{nombre}', String(persona.nombre || '').split(' ')[0])
    .replaceAll('{equipos}', lista);
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
