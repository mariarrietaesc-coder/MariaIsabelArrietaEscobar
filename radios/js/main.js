// Arranque: elige el almacenamiento, maneja la sesión, el marco y las rutas.

import * as config from '../config.js';
import { app, emitir, puede } from './estado.js';
import { h, vaciar, icono, boton, aviso, avisoError, mensajeError, campo, entrada, definirColoresArea, vacio } from './ui.js';
import { ROLES } from './util.js';
import vInicio from './vistas/inicio.js';
import vEntregar from './vistas/entregar.js';
import vRecibir from './vistas/recibir.js';
import vEquipos from './vistas/equipos.js';
import vEquipo from './vistas/equipo.js';
import vPersonas from './vistas/personas.js';
import vPersona from './vistas/persona.js';
import vHistorial from './vistas/historial.js';
import vReportes from './vistas/reportes.js';
import vUsuarios from './vistas/usuarios.js';
import vAjustes from './vistas/ajustes.js';
import vEtiquetas from './vistas/etiquetas.js';
import vAyuda from './vistas/ayuda.js';

const raiz = document.getElementById('app');

const NAV = [
  { ruta: 'inicio', texto: 'Inicio', ico: 'inicio' },
  { ruta: 'entregar', texto: 'Entregar', ico: 'entregar', permiso: puede.operar },
  { ruta: 'recibir', texto: 'Recibir', ico: 'recibir', permiso: puede.operar },
  { ruta: 'equipos', texto: 'Equipos', ico: 'radio' },
  { ruta: 'personas', texto: 'Personas', ico: 'personas' },
  { ruta: 'historial', texto: 'Historial', ico: 'historial' },
  { ruta: 'reportes', texto: 'Reportes', ico: 'reportes' },
  { ruta: 'etiquetas', texto: 'Etiquetas QR', ico: 'qr', permiso: puede.operar },
  { ruta: 'usuarios', texto: 'Usuarios', ico: 'usuarios', permiso: puede.administrar },
  { ruta: 'ajustes', texto: 'Ajustes', ico: 'ajustes', permiso: puede.administrar },
  { ruta: 'ayuda', texto: 'Ayuda', ico: 'ayuda' },
];

const RUTAS = {
  inicio: { vista: vInicio },
  entregar: { vista: vEntregar, permiso: puede.operar },
  recibir: { vista: vRecibir, permiso: puede.operar },
  equipos: { vista: vEquipos },
  e: { vista: vEquipo },
  personas: { vista: vPersonas },
  p: { vista: vPersona },
  historial: { vista: vHistorial },
  reportes: { vista: vReportes },
  usuarios: { vista: vUsuarios, permiso: puede.administrar },
  ajustes: { vista: vAjustes, permiso: puede.administrar },
  etiquetas: { vista: vEtiquetas, permiso: puede.operar },
  ayuda: { vista: vAyuda },
  mas: { vista: vistaMas },
};

let vistaEl = null, conexionEl = null, usuarioEl = null, cortarVista = null;
let cortesDatos = [], uidActual = null, rolActual = null;

function leerHash() {
  const [ruta, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const partes = ruta.split('/').filter(Boolean).map(decodeURIComponent);
  return { ruta: partes[0] || 'inicio', params: partes.slice(1), query: new URLSearchParams(qs || '') };
}

// ---------- Pantallas sin sesión ----------
function pantallaSuelta(...contenido) {
  vistaEl = null;
  cortarVista?.();
  cortarVista = null;
  vaciar(raiz, h('div', { class: 'suelta' },
    h('div', { class: 'suelta-tarjeta' },
      h('div', { class: 'suelta-marca' }, h('span', { class: 'logo' }, icono('radio')),
        h('div', null, h('strong', null, 'Control de Radios'), h('small', null, config.marca?.organizacion || 'Logística'))),
      ...contenido)));
}

function cargando(texto = 'Cargando…') {
  return h('div', { class: 'cargando' }, h('span', { class: 'giro' }), texto);
}

async function pantallaEntrada() {
  pantallaSuelta(cargando('Conectando…'));
  let necesita = false;
  try {
    necesita = await app.almacen.necesitaConfiguracion();
  } catch (e) {
    console.warn(e);
  }
  if (app.usuario) return; // la sesión llegó mientras tanto
  if (necesita && app.almacen.modo === 'demo' && config.usuarioInicial) return arrancarDemo();
  if (necesita) return pantallaConfiguracion();
  return app.almacen.modo === 'demo' ? pantallaEntradaDemo() : pantallaLogin();
}

// Demo lista para usar: entra con el usuario de config.js y datos de ejemplo.
async function arrancarDemo() {
  pantallaSuelta(cargando('Preparando la demostración…'));
  try {
    await app.almacen.configurarAdmin({ nombre: config.usuarioInicial, email: '' });
    if (config.demoConEjemplo !== false && app.usuario) await app.almacen.cargarEjemplo(app.usuario);
  } catch (e) {
    avisoError(e);
    pantallaConfiguracion();
  }
}

function pantallaConfiguracion() {
  const demo = app.almacen.modo === 'demo';
  const form = h('form', { class: 'form' },
    h('h1', null, 'Configuración inicial'),
    h('p', { class: 'suave' }, demo
      ? 'Estás en modo demostración: los datos se guardan solo en este navegador. Crea tu usuario administrador para empezar.'
      : 'Crea la cuenta del administrador principal. Después podrás crear los usuarios de Logística desde la app.'),
    campo('Tu nombre', entrada({ name: 'nombre', required: true, autocomplete: 'name', value: config.usuarioInicial || '' })),
    !demo && campo('Correo', entrada({ name: 'email', type: 'email', required: true, autocomplete: 'email' })),
    !demo && campo('Contraseña', entrada({ name: 'clave', type: 'password', required: true, minlength: 6, autocomplete: 'new-password' })),
    !demo && campo('Repite la contraseña', entrada({ name: 'clave2', type: 'password', required: true, minlength: 6, autocomplete: 'new-password' })),
    demo && h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'ejemplo', checked: true }),
      h('span', null, 'Cargar datos de ejemplo (equipos, personas y un mes de préstamos)')),
    h('button', { class: 'btn btn-pri btn-grande', type: 'submit' }, demo ? 'Empezar' : 'Crear administrador'),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (!demo && d.clave !== d.clave2) return aviso('Las contraseñas no coinciden.', { tipo: 'error' });
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await app.almacen.configurarAdmin({ nombre: d.nombre.trim(), email: (d.email || '').trim(), clave: d.clave });
      if (demo && d.ejemplo && app.usuario) {
        await app.almacen.cargarEjemplo(app.usuario);
        aviso('Datos de ejemplo cargados.');
      }
    } catch (e) {
      avisoError(e);
      btn.disabled = false;
    }
  });
  pantallaSuelta(form);
}

function pantallaLogin() {
  const form = h('form', { class: 'form' },
    h('h1', null, 'Ingresar'),
    campo('Correo', entrada({ name: 'email', type: 'email', required: true, autocomplete: 'username' })),
    campo('Contraseña', entrada({ name: 'clave', type: 'password', required: true, autocomplete: 'current-password' })),
    h('button', { class: 'btn btn-pri btn-grande', type: 'submit' }, 'Entrar'),
    boton('¿Olvidaste tu contraseña?', {
      tipo: 'texto',
      onclick: async () => {
        const email = form.email.value.trim();
        if (!email) return aviso('Escribe tu correo y vuelve a tocar aquí.', { tipo: 'info' });
        try {
          await app.almacen.recuperarClave(email);
          aviso('Te enviamos un correo para cambiar la contraseña.');
        } catch (e) { avisoError(e); }
      },
    }),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await app.almacen.entrar(form.email.value.trim(), form.clave.value);
    } catch (e) {
      aviso(mensajeError(e), { tipo: 'error' });
      btn.disabled = false;
    }
  });
  pantallaSuelta(form);
}

function pantallaEntradaDemo() {
  const usuarios = app.almacen.usuariosDemo();
  pantallaSuelta(
    h('h1', null, 'Modo demostración'),
    h('p', { class: 'suave' }, 'Elige con qué usuario entrar. En la versión con Firebase cada persona entra con su correo y contraseña.'),
    h('div', { class: 'lista' }, usuarios.map((u) => h('button', {
      type: 'button', class: 'fila fila-btn',
      onclick: () => app.almacen.entrar(u.id).catch(avisoError),
    }, icono('persona'), h('div', { class: 'fila-txt' }, h('strong', null, u.nombre), h('small', null, ROLES[u.rol]?.nombre)), icono('flecha')))),
  );
}

function pantallaSinAcceso(u) {
  pantallaSuelta(
    h('h1', null, 'Cuenta sin acceso'),
    h('p', null, u.activo === false
      ? `La cuenta ${u.email || ''} está desactivada.`
      : `La cuenta ${u.email || ''} todavía no tiene permiso para usar la app.`),
    h('p', { class: 'suave' }, 'Pide a un administrador de Logística que te habilite.'),
    boton('Salir', { tipo: 'sec', ico: 'salir', onclick: () => app.almacen.salir() }),
  );
}

// ---------- Sesión y datos ----------
function detenerDatos() {
  cortesDatos.forEach((c) => c());
  cortesDatos = [];
  app.listo = false;
  app.equipos = new Map();
  app.personas = new Map();
  app.usuarios = [];
  uidActual = rolActual = null;
}

function iniciarDatos() {
  const faltan = new Set(['equipos', 'personas', 'ajustes']);
  const llego = (c) => {
    if (faltan.delete(c) && !faltan.size) {
      app.listo = true;
      mostrarRuta();
    }
  };
  const A = app.almacen;
  cortesDatos.push(
    A.observar('equipos', (l) => { app.equipos = new Map(l.map((e) => [e.id, e])); llego('equipos'); emitir('equipos'); }),
    A.observar('personas', (l) => { app.personas = new Map(l.map((p) => [p.id, p])); llego('personas'); emitir('personas'); }),
    A.observar('ajustes', (a) => { app.ajustes = a; definirColoresArea(a.areas); llego('ajustes'); emitir('ajustes'); }),
    A.observarConexion((c) => { app.conexion = c; pintarConexion(); }),
  );
  if (puede.administrar()) {
    cortesDatos.push(A.observar('usuarios', (l) => { app.usuarios = l; emitir('usuarios'); }));
  }
}

function alCambiarSesion(u) {
  const activo = u && !u.sinPerfil && u.activo;
  if (!activo) {
    detenerDatos();
    app.usuario = u;
    if (!u) return pantallaEntrada();
    return pantallaSinAcceso(u);
  }
  const cambio = u.uid !== uidActual || u.rol !== rolActual;
  app.usuario = u;
  if (cambio) {
    detenerDatos();
    uidActual = u.uid;
    rolActual = u.rol;
    montarMarco();
    iniciarDatos();
  } else {
    pintarUsuario();
    emitir('usuario');
  }
}

export async function salir() {
  detenerDatos();
  await app.almacen.salir();
}

// ---------- Marco ----------
function pintarConexion() {
  if (!conexionEl) return;
  const t = {
    local: ['Modo demo', 'demo'],
    'en-linea': ['En línea', 'ok'],
    sincronizando: ['Sincronizando…', 'warn'],
    'sin-conexion': ['Sin conexión', 'bad'],
  }[app.conexion] || ['', 'muted'];
  conexionEl.className = `conexion c-${t[1]}`;
  conexionEl.title = app.conexion === 'sin-conexion'
    ? 'Los registros se guardan en este dispositivo y se envían al volver el internet'
    : t[0];
  vaciar(conexionEl, h('span', { class: 'punto' }), h('span', { class: 'conexion-txt' }, t[0]));
}

function pintarUsuario() {
  if (!usuarioEl) return;
  const u = app.usuario;
  vaciar(usuarioEl, h('span', { class: 'avatar' }, (u.nombre || u.email || '?').trim()[0].toUpperCase()),
    h('span', { class: 'usuario-txt' }, h('strong', null, u.nombre || u.email), h('small', null, ROLES[u.rol]?.nombre)));
}

function montarMarco() {
  const navLat = NAV.filter((i) => !i.permiso || i.permiso());
  const inferior = puede.operar() ? ['inicio', 'entregar', 'recibir', 'equipos', 'mas'] : ['inicio', 'equipos', 'historial', 'reportes', 'mas'];
  const item = (i, clase) => h('a', { href: `#/${i.ruta}`, class: clase, 'data-ruta': i.ruta }, icono(i.ico), h('span', null, i.texto));
  conexionEl = h('span', { class: 'conexion' });
  usuarioEl = h('a', { href: '#/mas', class: 'usuario' });
  vistaEl = h('main', { class: 'vista', id: 'vista', tabindex: '-1' });
  vaciar(raiz, h('div', { class: 'marco' },
    h('aside', { class: 'lateral' },
      h('div', { class: 'lateral-marca' }, h('span', { class: 'logo' }, icono('radio')),
        h('div', null, h('strong', null, 'Control de Radios'), h('small', { 'data-org': '' }, app.ajustes.orgNombre))),
      h('nav', { class: 'nav-lat' }, navLat.map((i) => item(i, 'nav-item'))),
      boton('Salir', { tipo: 'texto', ico: 'salir', clase: 'lateral-salir', onclick: salir })),
    h('div', { class: 'principal' },
      h('header', { class: 'cabecera' },
        h('a', { href: '#/inicio', class: 'cabecera-marca' }, h('span', { class: 'logo' }, icono('radio')),
          h('span', null, h('strong', null, 'Radios'), h('small', null, config.marca?.corto || 'Logística'))),
        conexionEl, usuarioEl),
      app.almacen.modo === 'demo' && h('div', { class: 'banda-demo' },
        icono('alerta'), h('span', null, 'Modo demostración: los datos se guardan solo en este navegador. '),
        h('a', { href: '#/ayuda' }, 'Cómo conectarlo a la nube')),
      vistaEl),
    h('nav', { class: 'nav-inf' }, inferior.map((r) => item(r === 'mas' ? { ruta: 'mas', texto: 'Más', ico: 'menu' } : NAV.find((n) => n.ruta === r), 'nav-inf-item'))),
  ));
  pintarConexion();
  pintarUsuario();
  mostrarRuta();
}

function marcarNav(ruta) {
  const actual = { e: 'equipos', p: 'personas' }[ruta] || ruta;
  for (const a of raiz.querySelectorAll('[data-ruta]')) a.classList.toggle('activo', a.dataset.ruta === actual);
  const org = raiz.querySelector('[data-org]');
  if (org) org.textContent = app.ajustes.orgNombre;
}

function mostrarRuta() {
  if (!vistaEl) return;
  const { ruta, params, query } = leerHash();
  cortarVista?.();
  cortarVista = null;
  marcarNav(ruta);
  if (!app.listo) return vaciar(vistaEl, cargando());
  const def = RUTAS[ruta] || RUTAS.inicio;
  if (def.permiso && !def.permiso()) return vaciar(vistaEl, vacio('Tu rol no tiene acceso a esta sección.', 'alerta'));
  vaciar(vistaEl);
  window.scrollTo(0, 0);
  try {
    cortarVista = def.vista(vistaEl, { params, query }) || null;
  } catch (e) {
    console.error(e);
    vaciar(vistaEl, vacio(`Algo falló al mostrar esta sección: ${e.message}`, 'alerta'));
  }
}

function vistaMas(raizVista) {
  const u = app.usuario;
  const enInferior = puede.operar() ? ['inicio', 'entregar', 'recibir', 'equipos'] : ['inicio', 'equipos', 'historial', 'reportes'];
  raizVista.append(
    h('div', { class: 'tarjeta usuario-tarjeta' },
      h('span', { class: 'avatar grande' }, (u.nombre || u.email || '?').trim()[0].toUpperCase()),
      h('div', null, h('strong', null, u.nombre || u.email), h('div', { class: 'suave' }, u.email || ''), h('span', { class: 'badge t-info' }, ROLES[u.rol]?.nombre))),
    h('div', { class: 'lista tarjeta' },
      NAV.filter((i) => !enInferior.includes(i.ruta) && (!i.permiso || i.permiso()))
        .map((i) => h('a', { href: `#/${i.ruta}`, class: 'fila fila-btn' }, icono(i.ico), h('div', { class: 'fila-txt' }, h('strong', null, i.texto)), icono('flecha')))),
    h('div', { class: 'acciones' },
      app.almacen.modo === 'firebase' && boton('Cambiar mi contraseña', {
        ico: 'llave',
        onclick: async () => {
          try {
            await app.almacen.recuperarClave(u.email);
            aviso(`Te enviamos un correo a ${u.email} para cambiarla.`);
          } catch (e) { avisoError(e); }
        },
      }),
      boton(app.almacen.modo === 'demo' ? 'Cambiar de usuario' : 'Cerrar sesión', { tipo: 'sec', ico: 'salir', onclick: salir })),
  );
}

// ---------- Arranque ----------
async function arrancar() {
  pantallaSuelta(cargando());
  try {
    if (config.firebaseConfig) {
      const m = await import('./almacen-firebase.js');
      app.almacen = await m.crearAlmacen(config);
    } else {
      const m = await import('./almacen-local.js');
      app.almacen = await m.crearAlmacen();
    }
  } catch (e) {
    console.error(e);
    pantallaSuelta(h('h1', null, 'No se pudo iniciar'),
      h('p', null, 'Revisa la conexión a internet y la configuración de Firebase en config.js.'),
      h('pre', { class: 'error-txt' }, String(e.message || e)),
      boton('Reintentar', { tipo: 'pri', onclick: () => location.reload() }));
    return;
  }
  app.almacen.alError = (e) => {
    console.error(e);
    avisoError(e);
  };
  window.addEventListener('hashchange', mostrarRuta);
  app.almacen.alCambiarSesion(alCambiarSesion);
}

if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

arrancar();
