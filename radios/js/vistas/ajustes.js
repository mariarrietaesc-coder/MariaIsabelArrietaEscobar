// Ajustes generales, áreas con su color, tipos de equipo y respaldo.

import { app, ejecutar } from '../estado.js';
import { h, vaciar, boton, campo, entrada, aviso, avisoError, confirmar, descargarArchivo, icono } from '../ui.js';
import { encabezado } from '../componentes.js';
import { AJUSTES_BASE, normalizarCodigo } from '../util.js';
import { baseApp } from '../qr.js';

export default function vistaAjustes(raiz) {
  const a = structuredClone(app.ajustes);
  const zonaAreas = h('div', { class: 'lista-editable' });
  const zonaTipos = h('div', { class: 'lista-editable' });
  const zonaNovedades = h('div', { class: 'lista-editable' });

  const general = h('form', { class: 'form' },
    campo('Nombre del equipo u organización', entrada({ name: 'orgNombre', value: a.orgNombre })),
    h('div', { class: 'dos' },
      campo('Alerta de préstamo largo (horas)', entrada({ name: 'horasAlerta', type: 'number', min: 1, max: 72, value: a.horasAlerta }),
        'Después de este tiempo el préstamo se marca en rojo y aparece el botón de WhatsApp.'),
      campo('Dirección de la app para los QR', entrada({ name: 'urlBase', value: a.urlBase, placeholder: baseApp(null) }),
        'Déjalo vacío para usar la dirección actual. Cámbialo si imprimes etiquetas desde una dirección de prueba.')),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'firmaObligatoria', checked: a.firmaObligatoria }),
      h('span', null, 'Pedir firma obligatoria en cada entrega')),
    campo('Mensaje de recordatorio por WhatsApp', h('textarea', { class: 'input', name: 'mensajeWhatsApp', rows: 2 }, a.mensajeWhatsApp),
      'Usa {nombre} y {equipos}; se reemplazan solos.'));

  function pintarAreas() {
    vaciar(zonaAreas,
      a.areas.map((ar, i) => h('div', { class: 'editable' },
        h('input', { type: 'color', value: ar.color, 'aria-label': `Color de ${ar.nombre}`, oninput: (e) => { ar.color = e.target.value; } }),
        entrada({ value: ar.nombre, 'aria-label': 'Nombre del área', oninput: (e) => { ar.nombre = e.target.value; } }),
        boton('', { tipo: 'icono', ico: 'basura', 'aria-label': `Quitar ${ar.nombre}`, onclick: () => { a.areas.splice(i, 1); pintarAreas(); } }))),
      boton('Agregar área', { tipo: 'texto', ico: 'mas1', onclick: () => { a.areas.push({ nombre: '', color: '#5b6b7f' }); pintarAreas(); zonaAreas.querySelectorAll('input.input')[a.areas.length - 1]?.focus(); } }));
  }

  function pintarTipos() {
    const fijos = AJUSTES_BASE.tipos.map((t) => t.id);
    vaciar(zonaTipos,
      a.tipos.map((t, i) => h('div', { class: 'editable' },
        h('span', { class: 'fila-ico' }, icono(fijos.includes(t.id) ? t.id : 'equipo')),
        entrada({ value: t.nombre, 'aria-label': 'Nombre', placeholder: 'Singular', oninput: (e) => { t.nombre = e.target.value; } }),
        entrada({ value: t.plural, 'aria-label': 'Plural', placeholder: 'Plural', oninput: (e) => { t.plural = e.target.value; } }),
        entrada({ value: t.prefijo, 'aria-label': 'Prefijo de código', placeholder: 'Prefijo', class: 'input corto', oninput: (e) => { t.prefijo = normalizarCodigo(e.target.value); } }),
        fijos.includes(t.id) ? h('span', { class: 'icono-hueco' }) : boton('', {
          tipo: 'icono', ico: 'basura', 'aria-label': `Quitar ${t.nombre}`,
          onclick: () => {
            if ([...app.equipos.values()].some((e) => e.tipo === t.id)) return aviso('Hay equipos de ese tipo; cámbialos o elimínalos primero.', { tipo: 'error' });
            a.tipos.splice(i, 1);
            pintarTipos();
          },
        }))),
      boton('Agregar tipo (botiquín, chaleco…)', {
        tipo: 'texto', ico: 'mas1',
        onclick: () => { a.tipos.push({ id: '', nombre: '', plural: '', prefijo: '' }); pintarTipos(); },
      }));
  }

  function pintarNovedades() {
    vaciar(zonaNovedades,
      a.novedades.map((n, i) => h('div', { class: 'editable' },
        entrada({ value: n.nombre, 'aria-label': 'Tipo de novedad', oninput: (e) => { n.nombre = e.target.value; } }),
        h('label', { class: 'check corto-check' },
          h('input', { type: 'checkbox', checked: n.mant, onchange: (e) => { n.mant = e.target.checked; } }),
          h('span', null, 'Mantenimiento')),
        boton('', { tipo: 'icono', ico: 'basura', 'aria-label': `Quitar ${n.nombre}`, onclick: () => { a.novedades.splice(i, 1); pintarNovedades(); } }))),
      boton('Agregar tipo de novedad', { tipo: 'texto', ico: 'mas1', onclick: () => { a.novedades.push({ nombre: '', mant: false }); pintarNovedades(); } }));
  }

  async function guardar() {
    const g = Object.fromEntries(new FormData(general));
    const areas = a.areas.map((x) => ({ nombre: x.nombre.trim(), color: x.color })).filter((x) => x.nombre);
    const ids = new Set();
    const tipos = a.tipos.filter((t) => t.nombre.trim()).map((t) => {
      let id = t.id || normalizarCodigo(t.nombre).toLowerCase();
      while (ids.has(id)) id += '-2';
      ids.add(id);
      return { id, nombre: t.nombre.trim(), plural: (t.plural || `${t.nombre}s`).trim(), prefijo: t.prefijo || normalizarCodigo(t.nombre).slice(0, 3) };
    });
    const datos = {
      orgNombre: g.orgNombre.trim() || AJUSTES_BASE.orgNombre,
      urlBase: g.urlBase.trim(),
      horasAlerta: Math.min(72, Math.max(1, Number(g.horasAlerta) || 4)),
      firmaObligatoria: general.firmaObligatoria.checked,
      mensajeWhatsApp: g.mensajeWhatsApp.trim() || AJUSTES_BASE.mensajeWhatsApp,
      areas, tipos,
      novedades: a.novedades.map((n) => ({ nombre: n.nombre.trim(), mant: Boolean(n.mant) })).filter((n) => n.nombre),
    };
    try {
      await ejecutar([{ op: 'set', col: 'ajustes', id: 'general', data: datos }], { ok: 'Ajustes guardados' });
    } catch (e) { avisoError(e); }
  }

  async function respaldo() {
    try {
      const datos = await app.almacen.exportar();
      descargarArchivo(`respaldo-radios-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(datos, null, 1), 'application/json');
    } catch (e) { avisoError(e); }
  }

  const demo = app.almacen.modo === 'demo';
  raiz.append(
    encabezado('Ajustes', null, boton('Guardar cambios', { tipo: 'pri', ico: 'check', onclick: guardar })),
    h('section', { class: 'tarjeta' }, h('h2', null, 'General'), general),
    h('section', { class: 'tarjeta' }, h('h2', null, 'Áreas'),
      h('p', { class: 'suave mini' }, 'El color identifica el área en listas y etiquetas (como los letreros del armario).'), zonaAreas),
    h('section', { class: 'tarjeta' }, h('h2', null, 'Tipos de equipo'),
      h('p', { class: 'suave mini' }, 'Radio e impermeable vienen de base. Puedes agregar otros elementos que también se presten.'), zonaTipos),
    h('section', { class: 'tarjeta' }, h('h2', null, 'Tipos de novedad al devolver'),
      h('p', { class: 'suave mini' }, 'Aparecen como opciones al recibir un equipo con falla. "Mantenimiento" deja marcada la opción de sacarlo de circulación.'), zonaNovedades),
    h('div', { class: 'acciones' }, boton('Guardar cambios', { tipo: 'pri', ico: 'check', onclick: guardar })),
    h('section', { class: 'tarjeta' }, h('h2', null, 'Datos'),
      h('p', { class: 'suave' }, demo
        ? 'Modo demostración: todo está en este navegador. Para usar la app entre varios celulares, conecta Firebase (ver Ayuda).'
        : 'Los datos están en Firebase (Cloud Firestore). Descarga un respaldo de vez en cuando.'),
      h('div', { class: 'fila-acc' },
        boton('Descargar respaldo (JSON)', { ico: 'descargar', onclick: respaldo }),
        demo && boton('Cargar datos de ejemplo', {
          ico: 'subir',
          onclick: async () => {
            if (app.equipos.size && !(await confirmar('Se agregarán equipos, personas y préstamos ficticios a los datos actuales.', { si: 'Cargar' }))) return;
            try {
              await app.almacen.cargarEjemplo(app.usuario);
              aviso('Datos de ejemplo cargados');
            } catch (e) { avisoError(e); }
          },
        }),
        demo && boton('Borrar todos los datos', {
          tipo: 'peligro', ico: 'basura',
          onclick: async () => {
            if (!(await confirmar('Se borran equipos, personas, préstamos y ajustes de este navegador. Los usuarios se conservan.', { titulo: 'Borrar datos', si: 'Borrar', peligro: true }))) return;
            await app.almacen.borrarTodo();
            aviso('Datos borrados');
          },
        }))),
  );
  pintarAreas();
  pintarTipos();
  pintarNovedades();
}
