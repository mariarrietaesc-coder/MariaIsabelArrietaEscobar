// Almacenamiento en la nube con Firebase (Authentication + Cloud Firestore).
// Usa caché persistente: si se cae el internet, las entregas y devoluciones
// se guardan en el dispositivo y se sincronizan solas al volver la conexión.

import { completarAjustes, esperar } from './util.js';

const VERSION = '12.19.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}`;

export async function crearAlmacen({ firebaseConfig, usarEmulador }) {
  const [{ initializeApp, deleteApp }, A, F] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  let db;
  try {
    db = F.initializeFirestore(app, {
      localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
    });
  } catch {
    db = F.getFirestore(app);
  }
  if (usarEmulador) {
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  let alError = (e) => console.error(e);

  // Las marcas de tiempo del servidor llegan como Timestamp; la app usa ms.
  function plano(data) {
    const r = {};
    for (const [k, v] of Object.entries(data)) r[k] = v instanceof F.Timestamp ? v.toMillis() : v;
    return r;
  }
  const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...plano(d.data({ serverTimestamps: 'estimate' })) }));

  function resolver(data) {
    const r = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && '__inc' in v) r[k] = F.increment(v.__inc);
      else if (v && typeof v === 'object' && v.__horaServidor) r[k] = F.serverTimestamp();
      else r[k] = v;
    }
    return r;
  }

  async function aplicar(ops) {
    let pendiente = false;
    for (let i = 0; i < ops.length; i += 450) {
      const lote = F.writeBatch(db);
      for (const o of ops.slice(i, i + 450)) {
        const ref = F.doc(db, o.col, o.id);
        if (o.op === 'set') lote.set(ref, resolver(o.data));
        else if (o.op === 'update') lote.update(ref, resolver(o.data));
        else if (o.op === 'delete') lote.delete(ref);
      }
      const envio = lote.commit();
      // Sin internet la promesa no se resuelve hasta sincronizar; los datos ya
      // quedaron en el dispositivo, así que no se bloquea la pantalla. La
      // espera es corta porque el lector no lee el siguiente QR hasta que
      // termine: con mala señal, 3 s por equipo hacían fila al recibir.
      const r = await Promise.race([envio.then(() => 'ok'), esperar(1500).then(() => 'pendiente')]);
      if (r === 'pendiente') {
        pendiente = true;
        envio.catch((e) => alError(e));
      }
    }
    return { pendiente };
  }

  const porFechaDesc = (arr) => arr.sort((a, b) => b.fechaEntrega - a.fechaEntrega);

  return {
    modo: 'firebase',
    set alError(fn) { alError = fn; },

    alCambiarSesion(cb) {
      let cortarPerfil = null;
      const cortarAuth = A.onAuthStateChanged(auth, (u) => {
        cortarPerfil?.();
        cortarPerfil = null;
        if (!u) return cb(null);
        cortarPerfil = F.onSnapshot(
          F.doc(db, 'usuarios', u.uid),
          { includeMetadataChanges: true },
          (s) => {
            // Un perfil recién escrito desde este equipo (configuración
            // inicial) solo vale cuando el servidor lo confirma; antes, las
            // reglas todavía no lo ven y las lecturas serían rechazadas.
            if (s.metadata.hasPendingWrites) return;
            if (s.exists()) cb({ uid: u.uid, email: u.email, ...plano(s.data()) });
            else if (!s.metadata.fromCache) cb({ uid: u.uid, email: u.email, sinPerfil: true });
          },
          (e) => cb({ uid: u.uid, email: u.email, sinPerfil: true, error: e.code }),
        );
      });
      return () => { cortarAuth(); cortarPerfil?.(); };
    },
    async necesitaConfiguracion() {
      const s = await F.getDoc(F.doc(db, 'config', 'setup'));
      return !s.exists();
    },
    async configurarAdmin({ nombre, email, clave }) {
      const cred = await A.createUserWithEmailAndPassword(auth, email, clave);
      const lote = F.writeBatch(db);
      lote.set(F.doc(db, 'usuarios', cred.user.uid), { nombre, email, rol: 'admin', activo: true, creado: Date.now() });
      lote.set(F.doc(db, 'config', 'setup'), { adminUid: cred.user.uid, fecha: Date.now() });
      await lote.commit();
    },
    async entrar(email, clave) {
      await A.signInWithEmailAndPassword(auth, email, clave);
    },
    async salir() {
      await A.signOut(auth);
    },
    async recuperarClave(email) {
      await A.sendPasswordResetEmail(auth, email);
    },

    observar(col, cb) {
      if (col === 'ajustes') {
        return F.onSnapshot(
          F.doc(db, 'ajustes', 'general'),
          (s) => cb(completarAjustes(s.exists() ? s.data() : null)),
          (e) => alError(e),
        );
      }
      return F.onSnapshot(F.collection(db, col), (s) => cb(docs(s)), (e) => alError(e));
    },
    observarConexion(cb) {
      let cache = true, pendientes = false;
      const emitir = () => cb(!navigator.onLine || cache ? 'sin-conexion' : pendientes ? 'sincronizando' : 'en-linea');
      const cortar = F.onSnapshot(F.collection(db, 'equipos'), { includeMetadataChanges: true }, (s) => {
        cache = s.metadata.fromCache;
        pendientes = s.metadata.hasPendingWrites;
        emitir();
      }, () => {});
      window.addEventListener('online', emitir);
      window.addEventListener('offline', emitir);
      return () => {
        cortar();
        window.removeEventListener('online', emitir);
        window.removeEventListener('offline', emitir);
      };
    },

    aplicar,

    async prestamosRango(desde, hasta) {
      const q = F.query(
        F.collection(db, 'prestamos'),
        F.where('fechaEntrega', '>=', desde),
        F.where('fechaEntrega', '<', hasta),
        F.orderBy('fechaEntrega', 'desc'),
      );
      return docs(await F.getDocs(q));
    },
    // Escuchas en vivo para las pantallas que se quedan abiertas (inicio,
    // historial, fichas). Firestore cobra la carga inicial y después solo los
    // préstamos que cambian; volver a consultar todo con cada movimiento
    // agotaría las 50.000 lecturas diarias del plan gratuito en un domingo.
    observarPrestamosRango(desde, hasta, cb, alFallar) {
      const q = F.query(
        F.collection(db, 'prestamos'),
        F.where('fechaEntrega', '>=', desde),
        F.where('fechaEntrega', '<', hasta),
        F.orderBy('fechaEntrega', 'desc'),
      );
      return F.onSnapshot(q, (s) => cb(docs(s)), (e) => (alFallar || alError)(e));
    },
    // campo: 'equipoId' o 'personaId'.
    observarPrestamosDe(campo, valor, cb, alFallar) {
      const q = F.query(F.collection(db, 'prestamos'), F.where(campo, '==', valor));
      return F.onSnapshot(q, (s) => cb(porFechaDesc(docs(s))), (e) => (alFallar || alError)(e));
    },
    async firma(entregaId) {
      const s = await F.getDoc(F.doc(db, 'firmas', entregaId));
      return s.exists() ? s.data().firma : null;
    },

    // Crea la cuenta con una instancia aparte de Firebase para no cerrar la
    // sesión del administrador que la está creando.
    async crearUsuario({ nombre, email, rol, clave }) {
      const aparte = initializeApp(firebaseConfig, `alta-${Date.now()}`);
      try {
        const authAparte = A.initializeAuth(aparte, { persistence: A.inMemoryPersistence });
        if (usarEmulador) A.connectAuthEmulator(authAparte, 'http://127.0.0.1:9099', { disableWarnings: true });
        const cred = await A.createUserWithEmailAndPassword(authAparte, email, clave);
        await F.setDoc(F.doc(db, 'usuarios', cred.user.uid), { nombre, email, rol, activo: true, creado: Date.now() });
        await A.signOut(authAparte);
        return cred.user.uid;
      } finally {
        await deleteApp(aparte);
      }
    },

    async exportar() {
      const r = {};
      for (const col of ['equipos', 'personas', 'prestamos', 'usuarios']) {
        r[col] = Object.fromEntries(docs(await F.getDocs(F.collection(db, col))).map(({ id, ...d }) => [id, d]));
      }
      const a = await F.getDoc(F.doc(db, 'ajustes', 'general'));
      r.ajustes = { general: a.exists() ? a.data() : null };
      return r;
    },
  };
}
