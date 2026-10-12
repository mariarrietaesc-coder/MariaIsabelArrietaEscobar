# Préstamo de Equipos · Logística, El Lugar de Su Presencia

Aplicación web para registrar la entrega y devolución de radios, impermeables y demás
equipos de Logística con código QR. Reemplaza el cuaderno de préstamos (Fecha · Hora ·
Nombre · Omega · Firma · Devolución) y deja estadísticas de frecuencia de uso.

Son archivos sueltos (HTML, CSS y JavaScript): no hay que instalar nada ni compilar.

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
- **Historial** con filtros y exportación a Excel.
- **Reportes**: préstamos por día, horas pico, días de la semana, equipos más usados y
  equipos sin uso (para rotar baterías), uso por área, personas con más préstamos,
  máximo de equipos afuera al mismo tiempo y devoluciones con novedad.
- **Etiquetas QR** para imprimir en papel adhesivo (pequeña para radio, mediana, grande
  colgante para impermeable) y carnets de personas.
- **Usuarios y roles**: Administrador, Operador (entrega y recibe) y Consulta (solo ve).
- **Funciona sin internet**: con Firebase, las entregas se guardan en el celular y se
  sincronizan solas al volver la señal. Se puede instalar como app en el celular
  (*Añadir a pantalla de inicio*).

El QR de cada equipo es un enlace a la app: el lector de la app lo interpreta, y la cámara
normal del celular abre la ficha del equipo con el botón de entregar o recibir. También
sirve un lector QR USB o Bluetooth: se deja el cursor en el buscador y se escanea. Si la
cámara en vivo no abre (permisos, celular antiguo), el lector tiene el botón *Foto* para
fotografiar el código.

## Dos formas de usarla

| | Modo demostración | Con Firebase (uso real) |
|---|---|---|
| Para qué | Conocerla, practicar, capacitar | La mesa de Logística, varios celulares |
| Dónde quedan los datos | Solo en el navegador de ese aparato | En la nube, compartidos entre celulares |
| Cuentas | Se elige el usuario de una lista | Cada quien con correo y contraseña |
| Qué hay que hacer | Nada: abrirla | Crear el proyecto de Firebase (unos 20 minutos, una sola vez) |

El modo demostración no sirve para el uso real: si se borran los datos del navegador se
pierde todo, y cada celular ve solo lo suyo.

## Paso 1. Verla funcionar (modo demostración)

Mientras `firebaseConfig` sea `null` en `config.js`, la app arranca en modo demostración
con datos ficticios (equipos, personas y un mes de préstamos). En *Ajustes* se pueden
cargar de nuevo o borrar.

Para abrirla en un computador, desde esta carpeta:

```sh
python -m http.server 8000
# abrir http://localhost:8000/
```

En `config.js` se cambia el nombre visible (`marca`) y el usuario de la demo.

## Paso 2. Conectarla a la nube (Firebase, gratis)

Firebase es de Google y su plan gratuito (Spark) alcanza de sobra: 1 GiB de datos,
50.000 lecturas y 20.000 escrituras por día. Cada préstamo usa entre 4 y 6 escrituras
(entrega, firma, persona, equipo y devolución), así que un servicio con 80 préstamos
queda por debajo de 500. Las pantallas que se dejan abiertas (Inicio, Historial, fichas)
escuchan los cambios en vivo y solo gastan lecturas por lo que cambia; *Reportes* sí lee
todo el periodo cada vez que se abre.

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

## Paso 3. Publicarla

La cámara del celular solo funciona en una dirección `https`, así que la app tiene que
quedar publicada en internet. Sirve cualquier alojamiento de archivos estáticos. Con
Vercel (gratis):

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. En <https://vercel.com>: *Add New → Project* → importa el repositorio → *Deploy*. No
   hay que configurar nada más.
3. Cada cambio que se suba a GitHub (por ejemplo, el `config.js` del paso 2) se publica
   solo.

Netlify, GitHub Pages o Firebase Hosting también sirven.

### Vista previa del enlace

Al compartir el enlace por WhatsApp aparece una tarjeta con la imagen `vista-previa.jpg`
(el ícono de la app y el logo de la iglesia). WhatsApp necesita la dirección completa de
esa imagen, que está en `index.html`, en la línea `og:image`. Trae la de la versión de
prueba (`https://prestamos-su-presencia.vercel.app/vista-previa.jpg`); cuando la app quede
en su dirección definitiva, cámbiala por `https://<dirección-definitiva>/vista-previa.jpg`.

## Paso 4. Primer ingreso

1. Abre la app publicada: la primera vez pide crear la **cuenta del administrador**.
   Hazlo de inmediato después de publicar: la primera persona que entre queda como
   administradora.
2. En *Usuarios*, crea las cuentas de Logística (correo + contraseña temporal + rol).
3. En *Ajustes*, revisa las áreas con sus colores, el tiempo de alerta y si la firma es
   obligatoria.
4. En *Equipos → Agregar varios*, crea los radios, los impermeables y demás equipos, y en *Etiquetas QR*
   imprime sus códigos.

Notas:

- Para quitarle el acceso a alguien se **desactiva** en *Usuarios* (el historial se
  conserva). Firebase no permite borrar cuentas desde la app.
- El administrador no puede quitarse su propio rol, para no quedar sin administrador.
- *Ajustes → Descargar respaldo* baja equipos, personas, préstamos, usuarios y ajustes en
  un archivo JSON. Las firmas no van en ese archivo.
- Para recuperar una contraseña: *¿Olvidaste tu contraseña?* en la pantalla de ingreso,
  o el ícono de llave en *Usuarios*.

## Datos personales

La app guarda nombre y celular de quienes reciben equipos y, si se llena, el documento y
la firma. Conviene contarles a los servidores para qué se usan y pedirles su autorización,
como lo exige la Ley 1581 de 2012. Si el documento no hace falta, mejor no llenarlo: el
buscador funciona con el nombre o el celular.

## Etiquetas

1. *Etiquetas QR* → elige tipo, área y tamaño → *Imprimir* (en la ventana de impresión,
   escala 100 % y sin márgenes extra).
2. Papel adhesivo y, encima, cinta transparente para que no se borre.
3. Radios: etiqueta pequeña en la parte trasera. Impermeables: la grande, plastificada,
   como colgante o cosida a una marquilla.
4. Imprime las etiquetas desde la dirección definitiva. Si las imprimes desde una
   dirección de prueba, pon antes la definitiva en *Ajustes → Dirección de la app para
   los QR*.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html`, `app.css` | Página y estilos (colores de los letreros de cada área) |
| `config.js` | Configuración de Firebase, nombre visible y usuario de la demo |
| `firestore.rules` | Reglas de seguridad para pegar en Firebase |
| `js/main.js` | Arranque, sesión, menú y rutas |
| `js/dominio.js` | Reglas de negocio: entrega, recepción, novedades, estados |
| `js/almacen-firebase.js` / `js/almacen-local.js` | Guardado en la nube / en el navegador |
| `js/escaner.js`, `js/qr.js` | Lector y generador de QR |
| `js/vistas/*` | Cada pantalla |
| `sw.js`, `manifest.webmanifest` | Abrirla sin señal e instalarla en el celular |
| `icono*.png`, `icono.svg`, `vista-previa.jpg` | Ícono de la app y tarjeta para compartir el enlace |
| `vendor/` | jsQR (Apache-2.0) y qrcode-generator (MIT) |
| `fuentes/` | Montserrat (SIL Open Font License) |

Para probar con Firebase sin tocar datos reales: `firebase emulators:start --only
auth,firestore` y `usarEmulador = true` en `config.js`.
