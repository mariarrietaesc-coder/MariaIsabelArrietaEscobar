// Devoluciones: modo rápido con escáner continuo (cada QR leído queda
// recibido en buen estado) y lista de pendientes para recibir a mano.

import { app, alCambiar, ejecutar, prestadosPorPersona, vencido } from '../estado.js';
import { h, vaciar, icono, iconoTipo, boton, chipArea, entrada, vacio, aviso, avisoError } from '../ui.js';
import { encabezado, dialogoNovedad, enlaceWhats } from '../componentes.js';
import { planRecepcion, planDeshacerRecepcion } from '../dominio.js';
import { abrirEscaner } from '../escaner.js';
import { interpretar } from '../qr.js';
import { coincide, cuando, duracion, minutosDesde, hora } from '../util.js';

// Lo recibido en esta sesión se conserva al cambiar de pantalla.
const sesion = [];

export default function recibir(raiz, { query }) {
  const buscar = entrada({
    type: 'search', placeholder: 'Código del equipo o nombre de la persona…', enterkeyhint: 'done',
    value: '', 'aria-label': 'Buscar',
  });
  const filtroPersona = query.get('p');
  if (filtroPersona) buscar.value = app.personas.get(filtroPersona)?.nombre || '';
  const zonaSesion = h('section', { class: 'seccion' });
  const zonaPendientes = h('section', { class: 'seccion' });

  async function recibir(eqs, { silencioso = false } = {}) {
    const ops = [], filas = [];
    for (const eq of eqs) {
      const r = planRecepcion({ equipo: eq, usuario: app.usuario });
      ops.push(...r.ops);
      filas.push({
        equipoId: eq.id, nombre: eq.nombre, tipo: eq.tipo, personaNombre: eq.prestamo.personaNombre,
        minutos: r.minutos, prestamoAnterior: r.prestamoAnterior, hora: Date.now(), estado: 'ok',
      });
    }
    await ejecutar(ops);
    sesion.unshift(...filas.reverse());
    sesion.splice(40);
    if (!silencioso) aviso(`Recibido: ${eqs.map((e) => e.nombre).join(', ')}`);
    pintar();
    return filas;
  }

  async function porCodigo(texto) {
    const r = interpretar(texto, app);
    if (r?.tipo === 'persona') return { ok: false, mensaje: 'Eso es un carnet. Escanea el QR del equipo.' };
    if (r?.tipo !== 'equipo') return { ok: false, mensaje: `Código no reconocido: ${String(texto).slice(0, 40)}` };
    const eq = app.equipos.get(r.id);
    if (!eq) return { ok: false, mensaje: `No existe el equipo ${r.id}` };
    if (eq.estado !== 'prestado') return { ok: false, mensaje: `${eq.nombre} no estaba prestado` };
    const quien = eq.prestamo.personaNombre;
    const [fila] = await recibir([eq], { silencioso: true });
    return { ok: true, mensaje: `${eq.nombre} ← ${quien} (${duracion(fila.minutos)})` };
  }

  function escanear() {
    abrirEscaner({
      titulo: 'Recibir equipos',
      ayuda: 'Cada equipo que escanees queda recibido. Si trae daños, márcalo después en la lista.',
      continuo: true,
      alLeer: porCodigo,
    });
  }

  buscar.addEventListener('input', pintarPendientes);
  buscar.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const r = interpretar(buscar.value, app);
    if (r?.tipo === 'equipo') {
      try {
        const res = await porCodigo(buscar.value);
        aviso(res.mensaje, { tipo: res.ok ? 'ok' : 'error' });
        if (res.ok) { buscar.value = ''; pintarPendientes(); }
      } catch (err) { avisoError(err); }
    }
  });

  async function deshacerFila(f) {
    try {
      const eq = app.equipos.get(f.equipoId);
      await ejecutar(planDeshacerRecepcion({ equipo: eq, prestamoAnterior: f.prestamoAnterior, minutos: f.minutos }).ops);
      f.estado = 'deshecho';
      aviso(`${f.nombre} vuelve a figurar prestado a ${f.personaNombre}`, { tipo: 'info' });
      pintar();
    } catch (e) { avisoError(e); }
  }

  function pintarSesion() {
    const filas = sesion.filter((f) => f.estado !== 'deshecho');
    if (!filas.length) return vaciar(zonaSesion);
    vaciar(zonaSesion,
      h('div', { class: 'seccion-cab' }, h('h2', null, 'Recibidos ahora'), h('span', { class: 'contador ok' }, filas.length)),
      h('div', { class: 'lista tarjeta' }, filas.map((f) => h('div', { class: 'fila' },
        h('span', { class: 'fila-ico ok' }, iconoTipo(f.tipo)),
        h('div', { class: 'fila-txt' },
          h('strong', null, f.nombre),
          h('small', null, `de ${f.personaNombre} · ${hora(f.hora)} · ${duracion(f.minutos)}`,
            f.estado === 'novedad' ? h('span', { class: 'badge t-bad mini' }, 'Novedad') : null)),
        h('div', { class: 'fila-acc' },
          f.estado === 'ok' && boton('Novedad', {
            tipo: 'texto', clase: 'btn-peq',
            onclick: async () => {
              const r = await dialogoNovedad({ equipoId: f.equipoId, prestamoId: f.prestamoAnterior.id, nombre: f.nombre });
              if (r) { f.estado = 'novedad'; pintarSesion(); }
            },
          }),
          app.equipos.get(f.equipoId)?.estado !== 'prestado' && boton('', {
            tipo: 'icono', ico: 'deshacer', title: 'Deshacer', 'aria-label': `Deshacer recepción de ${f.nombre}`,
            onclick: () => deshacerFila(f),
          }))))));
  }

  function pintarPendientes() {
    const q = buscar.value.trim();
    const grupos = prestadosPorPersona();
    const total = grupos.reduce((s, g) => s + g.equipos.length, 0);
    const visibles = grupos
      .map((g) => coincide(q, g.nombre, g.area) ? g : { ...g, equipos: g.equipos.filter((e) => coincide(q, e.id, e.nombre)) })
      .filter((g) => g.equipos.length);
    vaciar(zonaPendientes,
      h('div', { class: 'seccion-cab' }, h('h2', null, 'Pendientes por recibir'), h('span', { class: 'contador' }, total)),
      !grupos.length ? vacio('No hay equipos prestados.') :
        !visibles.length ? h('p', { class: 'suave' }, 'Nada coincide con la búsqueda.') :
          h('div', { class: 'prestados' }, visibles.map((g) => {
            const tarde = vencido(g.desde);
            return h('div', { class: `prestado ${tarde ? 'tarde' : ''}` },
              h('div', { class: 'prestado-cab' },
                h('a', { href: `#/p/${encodeURIComponent(g.personaId)}`, class: 'prestado-nombre' }, h('strong', null, g.nombre), chipArea(g.area)),
                h('span', { class: `prestado-tiempo ${tarde ? 't-bad' : ''}` }, icono('reloj'), duracion(minutosDesde(g.desde)))),
              h('div', { class: 'lista' }, g.equipos.map((e) => h('div', { class: 'fila compacta' },
                iconoTipo(e.tipo),
                h('div', { class: 'fila-txt' }, h('strong', null, e.nombre), h('small', null, `${cuando(e.prestamo.desde)}${e.prestamo.accesorios ? ` · ${e.prestamo.accesorios}` : ''}`)),
                boton('Recibir', { tipo: 'sec', clase: 'btn-peq', onclick: () => recibir([e]).catch(avisoError) })))),
              h('div', { class: 'prestado-acc' },
                tarde ? enlaceWhats(g) : h('span'),
                g.equipos.length > 1 && boton(`Recibir los ${g.equipos.length}`, {
                  tipo: 'pri', clase: 'btn-peq', ico: 'recibir', onclick: () => recibir(g.equipos).catch(avisoError),
                })));
          })));
  }

  function pintar() {
    pintarSesion();
    pintarPendientes();
  }

  raiz.append(
    encabezado('Recibir', 'Escanea cada equipo que devuelven'),
    boton('Escanear para recibir', { tipo: 'pri', ico: 'escanear', clase: 'btn-grande ancho', onclick: escanear }),
    h('div', { class: 'buscador' }, icono('buscar'), buscar),
    h('p', { class: 'suave pista' }, 'Con un lector QR USB o Bluetooth: deja el cursor en el buscador y escanea; cada lectura se recibe sola.'),
    zonaSesion,
    zonaPendientes,
  );
  pintar();
  if (!filtroPersona) buscar.focus();
  const reloj = setInterval(pintarPendientes, 60000);
  const cortar = alCambiar((que) => { if (que === 'equipos' || que === 'personas') pintar(); });
  return () => { cortar(); clearInterval(reloj); };
}

