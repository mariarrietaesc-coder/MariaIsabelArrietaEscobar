// Configuración de la app de control de radios e impermeables.
//
// Mientras firebaseConfig sea null, la app funciona en MODO DEMO: todo se
// guarda solo en el navegador de este dispositivo (sirve para probarla).
//
// Para guardar en la nube (gratis, plan Spark de Firebase) y compartir los
// datos entre varios celulares, pega aquí la configuración de tu proyecto:
// Firebase console → ⚙ Configuración del proyecto → Tus apps → </> Web.
// Los pasos completos están en radios/LEEME.md.

export const firebaseConfig = null;

/* Ejemplo (reemplaza con los datos de tu proyecto):
export const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'control-radios.firebaseapp.com',
  projectId: 'control-radios',
  storageBucket: 'control-radios.firebasestorage.app',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123',
};
*/

// Solo para desarrollo con `firebase emulators:start` en este computador.
export const usarEmulador = false;
