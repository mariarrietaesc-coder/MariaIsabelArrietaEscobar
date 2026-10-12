// Configuración de la app de préstamo de equipos (radios, impermeables y demás).
//
// Mientras firebaseConfig sea null, la app funciona en MODO DEMO: todo se
// guarda solo en el navegador de este dispositivo (sirve para probarla).
//
// Para guardar en la nube (gratis, plan Spark de Firebase) y compartir los
// datos entre varios celulares, pega aquí la configuración de tu proyecto:
// Firebase console → ⚙ Configuración del proyecto → Tus apps → </> Web.
// Los pasos completos están en LEEME.md, en esta misma carpeta.

export const firebaseConfig = null;

/* Ejemplo (reemplaza con los datos de tu proyecto):
export const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'prestamo-equipos.firebaseapp.com',
  projectId: 'prestamo-equipos',
  storageBucket: 'prestamo-equipos.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123',
};
*/

// Nombre que se muestra en la app.
export const marca = {
  corto: 'Su Presencia',
  organizacion: 'Logística · El Lugar de Su Presencia',
};

// Usuario del modo demo: entra directo con este nombre (como administrador) y,
// si demoConEjemplo es true, carga datos ficticios para practicar. Con
// Firebase no se usa: cada quien entra con su correo y contraseña.
export const usuarioInicial = 'Coordinación Logística';
export const demoConEjemplo = true;

// Solo para desarrollo con `firebase emulators:start` en este computador.
export const usarEmulador = false;
