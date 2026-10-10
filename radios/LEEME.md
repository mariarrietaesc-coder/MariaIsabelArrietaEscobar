# Control de Radios e Impermeables — Logística, El Lugar de Su Presencia

Aplicación web para registrar la **entrega y devolución de radios e impermeables** con
código QR. Reemplaza el cuaderno de préstamos (Fecha · Hora · Nombre · Omega · Firma ·
Devolución) y deja estadísticas de frecuencia de uso.

## Qué hace

- **Entregar**: se busca a la persona (o se escanea su carnet), se escanean los QR de los
  equipos uno tras otro, se anotan accesorios (manos libres, batería) y la persona firma
  con el dedo. Queda quién entregó, a quién, qué y a qué hora.
- **Recibir**: modo rápido con la cámara: cada QR leído queda recibido. Quien tiene varios
  equipos puede devolverlos uno por uno o todos juntos; lo que falte sigue a su nombre. Si
  algo llega con falla se marca el tipo de novedad (falla de batería, no enciende, antena,
  falta accesorio, impermeable roto…) y puede pasar a mantenimiento. Todo se puede deshacer.
- **Inicio**: disponibles y prestados por tipo, quién tiene qué y desde cuándo. Pasado el
  tiempo límite (4 h por defecto) el préstamo se marca en rojo y aparece el botón para
  recordarle por WhatsApp.
- **Equipos**: inventario con área, modelo, canal/frecuencia, talla, serial y estado
  (disponible, prestado, mantenimiento, perdido, de baja). Alta en lote
  (`IMP-01 … IMP-30`) o desde Excel (CSV).
- **Personas**: servidores y coordinadores, con su carnet QR opcional. Se pueden registrar
  en plena entrega o importar desde Excel.
- **Historial** con filtros y exportación a Excel, incluida la firma de cada entrega.
- **Reportes**: préstamos por día, horas pico, días de la semana, equipos más usados y
  **equipos sin uso** (para rotar baterías), uso por área, personas con más préstamos,
  máximo de equipos afuera al mismo tiempo y devoluciones con novedad.
- **Etiquetas QR** para imprimir en papel adhesivo (pequeña para radio, mediana, grande
  colgante para impermeable) y carnets de personas.
- **Usuarios y roles**: Administrador, Operador (entrega y recibe) y Consulta (solo ve).
- **Funciona sin internet**: con Firebase, las entregas se guardan en el celular y se
  sincronizan solas al volver la señal. Se puede instalar como app en el celular
  (Añadir a pantalla de inicio).

El QR de cada equipo es un enlace a la app: el lector de la app lo interpreta, y la cámara
normal del celular abre la ficha del equipo con el botón de entregar o recibir. También
sirve un lector QR USB o Bluetooth: se deja el cursor en el buscador y se escanea. Si la
cámara en vivo no abre (permisos, celular antiguo), el lector tiene el botón **Foto** para
fotografiar el código.

## Dónde vive

Todo está en la carpeta `radios/` y no necesita compilación (HTML, CSS y JavaScript).

- Con el proyecto actual de Vercel queda en `https://<tu-dominio>.vercel.app/radios/`.
- Si prefieres una dirección propia (por ejemplo `radios-supresencia.vercel.app`): en
  Vercel → *Add New → Project* → importa este mismo repositorio → en *Root Directory*
  elige `radios` → *Deploy*.

## Modo demostración

Mientras `firebaseConfig` sea `null` en `config.js`, la app guarda todo **solo en el
navegador** de ese dispositivo. Sirve para probarla y para capacitar: entra directo con el
usuario de `usuarioInicial` y, si `demoConEjemplo` es `true`, carga datos ficticios. En
*Ajustes* se pueden cargar datos de ejemplo y borrarlos.

En `config.js` también se cambia el nombre visible (`marca`).

## Conectarla a la nube (Firebase, gratis)

Firebase es de Google y su plan gratuito (Spark) alcanza de sobra: 1 GiB de datos,
50.000 lecturas y 20.000 escrituras por día. Un servicio con 80 préstamos usa unas 250
escrituras.

1. Entra a <https://console.firebase.google.com> con la cuenta de Google de Logística y
   crea un proyecto (puedes desactivar Google Analytics).
2. **Authentication** → *Comenzar* → *Método de acceso* → activa **Correo
   electrónico/contraseña**.
3. **Firestore Database** → *Crear base de datos* → modo **producción** → ubicación
   `southamerica-east1` (São Paulo) o `nam5`.
4. Firestore → pestaña **Reglas** → borra lo que hay, pega el contenido de
   [`firestore.rules`](firestore.rules) y pulsa **Publicar**.
5. ⚙ **Configuración del proyecto** → *Tus apps* → ícono **`</>`** (Web) → registra la app
   (sin Hosting) y copia el objeto `firebaseConfig`.
6. Pégalo en [`config.js`](config.js):

   ```js
   export const firebaseConfig = {
     apiKey: 'AIza…',
     authDomain: 'tu-proyecto.firebaseapp.com',
     projectId: 'tu-proyecto',
     storageBucket: 'tu-proyecto.firebasestorage.app',
     messagingSenderId: '…',
     appId: '…',
   };
   ```

   Estos datos no son secretos: lo que protege la información son las reglas del paso 4.
7. Sube el cambio a GitHub; Vercel publica solo.
8. Abre la app: la primera vez pide crear la **cuenta del administrador**. Luego, en
   *Usuarios*, crea las cuentas de Logística (correo + contraseña temporal + rol).
9. Opcional: Authentication → *Configuración* → *Dominios autorizados* → agrega tu dominio
   de Vercel.

Notas:

- Para quitarle el acceso a alguien se **desactiva** en *Usuarios* (el historial se
  conserva). Firebase no permite borrar cuentas desde la app.
- El administrador no puede quitarse su propio rol, para no quedar sin administrador.
- *Ajustes → Descargar respaldo* baja todos los datos en un archivo JSON.

## Etiquetas

1. *Etiquetas QR* → elige tipo, área y tamaño → *Imprimir* (en la ventana de impresión,
   escala 100 % y sin márgenes extra).
2. Papel adhesivo y, encima, cinta transparente para que no se borre.
3. Radios: etiqueta pequeña en la parte trasera. Impermeables: la grande, plastificada,
   como colgante o cosida a una marquilla.
4. Si imprimes desde una dirección de prueba, pon la dirección final en *Ajustes →
   Dirección de la app para los QR* antes de imprimir.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html`, `app.css` | Página y estilos (colores de los letreros de cada área) |
| `config.js` | Configuración de Firebase |
| `firestore.rules` | Reglas de seguridad para pegar en Firebase |
| `js/main.js` | Arranque, sesión, menú y rutas |
| `js/dominio.js` | Reglas de negocio: entrega, recepción, novedades, estados |
| `js/almacen-firebase.js` / `js/almacen-local.js` | Guardado en la nube / en el navegador |
| `js/escaner.js`, `js/qr.js` | Lector y generador de QR |
| `js/vistas/*` | Cada pantalla |
| `vendor/` | jsQR (Apache-2.0) y qrcode-generator (MIT) |
| `fuentes/` | Montserrat (SIL Open Font License) |

## Probarla en un computador

```sh
python3 -m http.server 8000   # desde la raíz del repositorio
# abrir http://localhost:8000/radios/
```

La cámara funciona en `localhost` y en `https`. Para probar con Firebase sin tocar datos
reales: `firebase emulators:start --only auth,firestore` y `usarEmulador = true` en
`config.js`.
