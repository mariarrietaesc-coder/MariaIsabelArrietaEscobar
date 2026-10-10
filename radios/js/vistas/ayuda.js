// Guía corta de uso y de conexión a Firebase.

import { app } from '../estado.js';
import { h } from '../ui.js';
import { encabezado } from '../componentes.js';

const pasos = (...items) => h('ol', { class: 'pasos-lista' }, items.map((t) => h('li', null, t)));

export default function vistaAyuda(raiz) {
  const demo = app.almacen.modo === 'demo';
  raiz.append(
    encabezado('Ayuda', 'Cómo se usa y cómo se conecta'),
    demo && h('section', { class: 'tarjeta destacada' },
      h('h2', null, 'Estás en modo demostración'),
      h('p', null, 'Lo que registres queda solo en este navegador. Para que varios celulares de Logística compartan los datos, conecta la app a Firebase (gratis):'),
      pasos(
        'Entra a console.firebase.google.com con una cuenta de Google y crea un proyecto (sin Analytics).',
        'Build → Authentication → Comenzar → activa "Correo electrónico/contraseña".',
        'Build → Firestore Database → Crear base de datos → modo producción → ubicación cercana (por ejemplo southamerica-east1 o nam5).',
        'En Firestore → Reglas, pega el contenido del archivo radios/firestore.rules y publica.',
        'Configuración del proyecto → Tus apps → ícono </> (Web) → registra la app y copia el objeto firebaseConfig.',
        'Pega ese objeto en radios/config.js (firebaseConfig = {...}), sube el cambio a GitHub y Vercel publica solo.',
        'Abre la app: te pedirá crear la cuenta del administrador. Luego crea los usuarios de Logística en "Usuarios".',
      ),
      h('p', { class: 'suave' }, 'La guía completa está en el archivo radios/LEEME.md del repositorio.')),
    h('section', { class: 'tarjeta' },
      h('h2', null, 'Entregar'),
      pasos(
        'Busca a la persona por nombre o celular, o escanea su carnet. Si no existe, regístrala ahí mismo.',
        'Toca "Escanear QR de los equipos" y pasa la cámara por cada radio o impermeable. También puedes escribir el código.',
        'Si lleva manos libres u otro accesorio, anótalo. Pide la firma con el dedo.',
        'Confirma. Queda registrado quién entregó, a quién, qué y a qué hora.',
      )),
    h('section', { class: 'tarjeta' },
      h('h2', null, 'Recibir'),
      pasos(
        'Toca "Escanear para recibir" y pasa la cámara por cada equipo que devuelven: cada lectura queda recibida en buen estado.',
        'Si un equipo llega con daños, toca "Novedad" en la lista de recibidos y, si hace falta, envíalo a mantenimiento.',
        '¿Te equivocaste? Toca el botón de deshacer en la fila.',
        'Abajo verás quién tiene todavía equipos. Si alguien pasó el tiempo límite, puedes escribirle por WhatsApp.',
      )),
    h('section', { class: 'tarjeta' },
      h('h2', null, 'Etiquetas QR'),
      h('p', null, 'En Etiquetas QR elige los equipos y el tamaño, imprime en papel adhesivo y pega cada etiqueta en su equipo. El QR es un enlace: con la cámara normal del celular abre la ficha del equipo con el botón de entregar o recibir.'),
      h('p', { class: 'suave' }, 'Con un lector QR por USB o Bluetooth, deja el cursor en el buscador de Entregar o Recibir y escanea.')),
    h('section', { class: 'tarjeta' },
      h('h2', null, 'Sin internet'),
      h('p', null, 'Con Firebase, si se cae la señal la app sigue funcionando: guarda las entregas en el celular y las sube al volver la conexión. El indicador de arriba muestra "Sin conexión" o "Sincronizando…".')),
    h('section', { class: 'tarjeta' },
      h('h2', null, 'Roles'),
      h('ul', null,
        h('li', null, h('strong', null, 'Administrador: '), 'todo, incluidos equipos, usuarios y ajustes.'),
        h('li', null, h('strong', null, 'Operador: '), 'entrega, recibe y registra personas.'),
        h('li', null, h('strong', null, 'Consulta: '), 've el estado, el historial y los reportes.'))),
  );
}
