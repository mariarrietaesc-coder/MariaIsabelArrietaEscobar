// Piezas de interfaz: creación de elementos, íconos, avisos y diálogos.

import { ESTADOS } from './util.js';

export function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, x] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, x);
        else el.style[p] = x;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // solo para contenido propio (íconos, QR)
    else if (['value', 'checked', 'disabled', 'selected', 'indeterminate'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const c of hijos) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) agregar(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function vaciar(el, ...hijos) {
  el.replaceChildren();
  agregar(el, hijos);
  return el;
}

const P = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  entregar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  recibir: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  radio: '<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V2"/><path d="M9 12h6"/><circle cx="12" cy="16.5" r="2"/>',
  impermeable: '<path d="M9 3h6l1.5 3.5L20 8l-1.5 6H17v7H7v-7H5.5L4 8l3.5-1.5Z"/><path d="M12 3v18"/>',
  equipo: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/>',
  reportes: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  usuarios: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="m16 3 1.5 1.5L20 2"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v.01"/><path d="M14 20h.01"/><path d="M17 17h4v4h-4"/>',
  escanear: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  mas: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  mas1: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  cerrar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  imprimir: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  descargar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  subir: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 3h16"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  basura: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1c-1-.4-2.1-1.5-2.5-2.5l1-1-1-2Z"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  linterna: '<path d="M8 2h8l-1 6H9Z"/><path d="M9 8h6v4l-1 10h-4L9 12Z"/><path d="M12 13v3"/>',
  deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
  firma: '<path d="M3 17c3-4 5-9 7-9s-1 9 2 9 3-5 5-5 1 4 4 4"/><path d="M3 21h18"/>',
  nube: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18Z"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5"/><path d="M12 17h.01"/>',
  flecha: '<path d="m9 18 6-6-6-6"/>',
  atras: '<path d="m15 18-6-6 6-6"/>',
  llave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3"/><path d="m17 6 3 3"/><path d="m14 9 2 2"/>',
};

export function icono(nombre, clase = '') {
  const d = P[nombre] || P.equipo;
  return h('span', {
    class: `ico ${clase}`,
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`,
  });
}

export const iconoTipo = (tipo) => icono(tipo === 'radio' || tipo === 'impermeable' ? tipo : 'equipo');

export function boton(texto, { tipo = 'sec', ico, onclick, clase = '', ...resto } = {}) {
  return h('button', { type: 'button', class: `btn btn-${tipo} ${clase}`, onclick, ...resto }, ico && icono(ico), texto && h('span', null, texto));
}

export function enlace(texto, href, { tipo = 'sec', ico, clase = '', ...resto } = {}) {
  return h('a', { href, class: `btn btn-${tipo} ${clase}`, ...resto }, ico && icono(ico), texto && h('span', null, texto));
}

export function insigniaEstado(estado) {
  const e = ESTADOS[estado] || { nombre: estado, tono: 'muted' };
  return h('span', { class: `badge t-${e.tono}` }, e.nombre);
}

let coloresArea = new Map();
export function definirColoresArea(areas) {
  coloresArea = new Map(areas.map((a) => [a.nombre, a.color]));
}
export const colorArea = (nombre) => coloresArea.get(nombre) || '#7b8794';

export function chipArea(nombre) {
  if (!nombre) return null;
  return h('span', { class: 'chip-area', style: { '--c': colorArea(nombre) } }, nombre);
}

export function vacio(texto, ico = 'check') {
  return h('div', { class: 'vacio' }, icono(ico), h('p', null, texto));
}

export function campo(etiqueta, control, ayuda) {
  return h('label', { class: 'campo' }, h('span', { class: 'campo-et' }, etiqueta), control, ayuda && h('small', { class: 'campo-ayuda' }, ayuda));
}

export function entrada(props = {}) {
  return h('input', { class: 'input', autocomplete: 'off', ...props });
}

export function selector(opciones, valor, props = {}) {
  return h('select', { class: 'input', ...props },
    opciones.map((o) => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: v === valor }, t);
    }));
}

// ---------- Avisos ----------
let zonaAvisos;
export function aviso(texto, { tipo = 'ok', accion, ms = 3500 } = {}) {
  zonaAvisos ||= document.body.appendChild(h('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' }));
  const el = h('div', { class: `aviso aviso-${tipo}` },
    icono(tipo === 'error' ? 'alerta' : tipo === 'info' ? 'nube' : 'check'),
    h('span', null, texto),
    accion && h('button', { type: 'button', class: 'aviso-accion', onclick: () => { accion.fn(); cerrar(); } }, accion.texto));
  zonaAvisos.append(el);
  while (zonaAvisos.children.length > 3) zonaAvisos.firstElementChild.remove();
  const t = setTimeout(cerrar, accion ? Math.max(ms, 6000) : ms);
  function cerrar() {
    clearTimeout(t);
    el.classList.add('saliendo');
    setTimeout(() => el.remove(), 250);
  }
  return cerrar;
}

export function avisoError(e) {
  aviso(mensajeError(e), { tipo: 'error', ms: 6000 });
}

export function mensajeError(e) {
  const c = e?.code || '';
  const m = {
    'permission-denied': 'No tienes permiso para esta acción. Pide al administrador que revise tu rol.',
    'unavailable': 'Sin conexión con el servidor. Intenta de nuevo en un momento.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Si estaba desactivada, actívala en la lista de usuarios.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión a internet.',
    'auth/operation-not-allowed': 'Activa "Correo electrónico/contraseña" en Firebase → Authentication → Método de acceso.',
    'auth/missing-email': 'Escribe tu correo.',
  };
  return m[c] || e?.message || String(e);
}

// ---------- Diálogos ----------
export function dialogo({ titulo, contenido, acciones = [], ancho = '' }) {
  const dlg = h('dialog', { class: `dlg ${ancho}` });
  const cerrar = (v) => {
    if (!dlg.open) return;
    dlg.close();
    dlg.remove();
    resolver?.(v);
  };
  let resolver;
  const prom = new Promise((r) => (resolver = r));
  const pie = h('div', { class: 'dlg-pie' },
    acciones.map((a) => boton(a.texto, {
      tipo: a.tipo || 'sec',
      ico: a.ico,
      onclick: async (ev) => {
        if (a.fn) {
          const btn = ev.currentTarget;
          btn.disabled = true;
          try {
            const r = await a.fn();
            if (r !== false) cerrar(a.valor ?? true);
          } catch (e) {
            avisoError(e);
          } finally {
            btn.disabled = false;
          }
        } else cerrar(a.valor ?? null);
      },
    })));
  dlg.append(
    h('div', { class: 'dlg-cab' }, h('h2', null, titulo), boton('', { tipo: 'icono', ico: 'cerrar', 'aria-label': 'Cerrar', onclick: () => cerrar(null) })),
    h('div', { class: 'dlg-cuerpo' }, contenido),
    acciones.length ? pie : null,
  );
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(null); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrar(null); });
  document.body.append(dlg);
  dlg.showModal();
  return { cerrar, promesa: prom, el: dlg };
}

export function confirmar(texto, { titulo = '¿Seguro?', si = 'Sí', peligro = false } = {}) {
  return dialogo({
    titulo,
    contenido: h('p', null, texto),
    acciones: [
      { texto: 'Cancelar', valor: false },
      { texto: si, tipo: peligro ? 'peligro' : 'pri', valor: true },
    ],
  }).promesa.then((v) => v === true);
}

// Lee los valores de un formulario como objeto plano.
export function valores(form) {
  const r = {};
  for (const el of form.querySelectorAll('[name]')) {
    r[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
  }
  return r;
}

// Señal de lectura correcta o fallida: pitido corto y vibración.
let audio;
export function sonar(ok = true) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = ok ? 1046 : 220;
    o.type = ok ? 'sine' : 'square';
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (ok ? 0.12 : 0.3));
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + (ok ? 0.13 : 0.32));
  } catch { /* sin audio */ }
  navigator.vibrate?.(ok ? 60 : [80, 60, 80]);
}

export function descargarArchivo(nombre, contenido, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
