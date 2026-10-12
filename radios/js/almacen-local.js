// Almacenamiento del MODO DEMO: todo vive en localStorage de este navegador.
// Expone la misma interfaz que almacen-firebase.js.

import { completarAjustes, nuevoId } from './util.js';
import { datosDeEjemplo } from './ejemplo.js';

const CLAVE = 'radios-demo-v1';
const CLAVE_SESION = 'radios-demo-sesion';
const COLECCIONES = ['equipos', 'personas', 'prestamos', 'firmas', 'usuarios', 'ajustes', 'config'];

function vacio() {
  return Object.fromEntries([['v', 1], ...COLECCIONES.map((c) => [c, {}])]);
}

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && d.v === 1) {
      for (const c of COLECCIONES) d[c] ||= {};
      return d;
    }
  } catch { /* datos dañados: se empieza de cero */ }
  return vacio();
}

export async function crearAlmacen() {
  let db = cargar();
  const oyentes = new Map(); // coleccion -> Set(cb)
  const oyentesSesion = new Set();
  let uidSesion = localStorage.getItem(CLAVE_SESION);

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(db));
    } catch {
      throw new Error('El almacenamiento de este navegador se llenó. Exporta un respaldo y borra datos de prueba.');
    }
  }

  function lista(col) {
    if (col === 'ajustes') return completarAjustes(db.ajustes.general);
    return Object.entries(db[col]).map(([id, d]) => ({ id, ...structuredClone(d) }));
  }

  function notificar(cols) {
    for (const col of cols) for (const cb of oyentes.get(col) || []) cb(lista(col));
    if (cols.has('usuarios')) emitirSesion();
  }

  function usuarioActual() {
    if (!uidSesion) return null;
    const u = db.usuarios[uidSesion];
    if (!u) return null;
    return { uid: uidSesion, ...structuredClone(u) };
  }

  function emitirSesion() {
    const u = usuarioActual();
    for (const cb of oyentesSesion) cb(u);
  }

  function resolver(valor, anterior) {
    if (valor && typeof valor === 'object') {
      if ('__inc' in valor) return (Number(anterior) || 0) + valor.__inc;
      if (valor.__horaServidor) return Date.now();
    }
    return valor;
  }

  // Aplica todo el lote o nada, igual que un lote de Firestore.
  function aplicarOps(ops) {
    const creados = new Set();
    for (const o of ops) {
      const clave = `${o.col}/${o.id}`;
      if (o.op === 'set') creados.add(clave);
      if (o.op === 'update' && !db[o.col]?.[o.id] && !creados.has(clave)) {
        throw new Error(`No existe ${o.col}/${o.id}`);
      }
    }
    const afectadas = new Set();
    for (const o of ops) {
      const col = (db[o.col] ||= {});
      if (o.op === 'set') {
        col[o.id] = Object.fromEntries(Object.entries(o.data).map(([k, v]) => [k, resolver(v)]));
      } else if (o.op === 'update') {
        const doc = col[o.id];
        for (const [k, v] of Object.entries(o.data)) doc[k] = resolver(v, doc[k]);
      } else if (o.op === 'delete') {
        delete col[o.id];
      }
      afectadas.add(o.col);
    }
    return afectadas;
  }

  // Otra pestaña cambió los datos.
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVE) {
      db = cargar();
      notificar(new Set(COLECCIONES));
    }
  });

  const ordenar = (arr) => arr.sort((a, b) => b.fechaEntrega - a.fechaEntrega);

  return {
    modo: 'demo',

    alCambiarSesion(cb) {
      oyentesSesion.add(cb);
      queueMicrotask(() => cb(usuarioActual()));
      return () => oyentesSesion.delete(cb);
    },
    async necesitaConfiguracion() {
      return !db.config.setup;
    },
    async configurarAdmin({ nombre, email }) {
      const uid = nuevoId();
      aplicarOps([
        { op: 'set', col: 'usuarios', id: uid, data: { nombre, email, rol: 'admin', activo: true, creado: Date.now() } },
        { op: 'set', col: 'config', id: 'setup', data: { adminUid: uid, fecha: Date.now() } },
      ]);
      guardar();
      uidSesion = uid;
      localStorage.setItem(CLAVE_SESION, uid);
      notificar(new Set(['usuarios']));
    },
    usuariosDemo() {
      return lista('usuarios').filter((u) => u.activo);
    },
    async entrar(uid) {
      if (!db.usuarios[uid]?.activo) throw new Error('Ese usuario no está activo.');
      uidSesion = uid;
      localStorage.setItem(CLAVE_SESION, uid);
      emitirSesion();
    },
    async salir() {
      uidSesion = null;
      localStorage.removeItem(CLAVE_SESION);
      emitirSesion();
    },
    async recuperarClave() {
      throw new Error('En modo demo no hay contraseñas.');
    },

    observar(col, cb) {
      if (!oyentes.has(col)) oyentes.set(col, new Set());
      oyentes.get(col).add(cb);
      queueMicrotask(() => cb(lista(col)));
      return () => oyentes.get(col).delete(cb);
    },
    observarConexion(cb) {
      queueMicrotask(() => cb('local'));
      return () => {};
    },

    async aplicar(ops) {
      const respaldo = JSON.stringify(db);
      let afectadas;
      try {
        afectadas = aplicarOps(ops);
        guardar();
      } catch (e) {
        db = JSON.parse(respaldo);
        throw e;
      }
      notificar(afectadas);
      return { pendiente: false };
    },

    async prestamosRango(desde, hasta) {
      return ordenar(lista('prestamos').filter((p) => p.fechaEntrega >= desde && p.fechaEntrega < hasta));
    },
    observarPrestamosRango(desde, hasta, cb) {
      return this.observar('prestamos', (l) => cb(ordenar(l.filter((p) => p.fechaEntrega >= desde && p.fechaEntrega < hasta))));
    },
    observarPrestamosDe(campo, valor, cb) {
      return this.observar('prestamos', (l) => cb(ordenar(l.filter((p) => p[campo] === valor))));
    },
    async firma(entregaId) {
      return db.firmas[entregaId]?.firma || null;
    },

    async crearUsuario({ nombre, email, rol }) {
      const uid = nuevoId();
      await this.aplicar([{ op: 'set', col: 'usuarios', id: uid, data: { nombre, email, rol, activo: true, creado: Date.now() } }]);
      return uid;
    },

    async exportar() {
      const { firmas, ...resto } = db;
      return { ...structuredClone(resto), firmas: Object.keys(firmas).length };
    },

    // Solo modo demo
    async cargarEjemplo(usuario) {
      const ops = datosDeEjemplo(usuario);
      await this.aplicar(ops);
    },
    async borrarTodo() {
      const usuarios = db.usuarios, config = db.config;
      db = vacio();
      db.usuarios = usuarios;
      db.config = config;
      guardar();
      notificar(new Set(COLECCIONES));
    },
  };
}
