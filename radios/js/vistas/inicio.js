import { app, alCambiar, puede, prestadosPorPersona, vencido, equipos } from '../estado.js';
import { h, vaciar, icono, iconoTipo, vacio } from '../ui.js';
import { tarjetaPrestados } from '../componentes.js';
import { diaLargo, inicioDia, plural } from '../util.js';

export default function inicio(raiz) {
  const hoyEl = h('p', { class: 'suave hoy' });
  const resumen = h('div', { class: 'resumen' });
  const prestados = h('section', { class: 'seccion' });

  raiz.append(
    h('div', { class: 'encabezado' },
      h('div', null,
        h('h1', null, 'Préstamo de equipos'),
        h('p', { class: 'suave' }, `${diaLargo(Date.now())} · ${app.ajustes.orgNombre}`),
        hoyEl)),
    puede.operar() && h('div', { class: 'acciones-grandes' },
      h('a', { href: '#/entregar', class: 'accion-grande entregar' }, icono('entregar'), h('span', null, h('strong', null, 'Entregar'), h('small', null, 'Prestar un equipo'))),
      h('a', { href: '#/recibir', class: 'accion-grande recibir' }, icono('recibir'), h('span', null, h('strong', null, 'Recibir'), h('small', null, 'Registrar devolución')))),
    resumen,
    prestados,
  );

  function pintar() {
    const todos = equipos();
    vaciar(resumen, app.ajustes.tipos.map((t) => {
      const lista = todos.filter((e) => e.tipo === t.id);
      if (!lista.length) return null;
      const c = { disponible: 0, prestado: 0, mantenimiento: 0, perdido: 0 };
      for (const e of lista) if (e.estado in c) c[e.estado]++;
      const activos = lista.filter((e) => e.estado !== 'baja').length || 1;
      return h('a', { href: `#/equipos?tipo=${t.id}`, class: 'tarjeta tipo-resumen' },
        h('div', { class: 'tipo-cab' }, iconoTipo(t.id), h('strong', null, t.plural)),
        h('div', { class: 'tipo-num' }, h('span', { class: 'grande' }, c.disponible), h('span', { class: 'suave' }, ` de ${activos} disponibles`)),
        h('div', { class: 'barra', role: 'img', 'aria-label': `${c.disponible} disponibles, ${c.prestado} prestados, ${c.mantenimiento} en mantenimiento, ${c.perdido} perdidos` },
          ['disponible', 'prestado', 'mantenimiento', 'perdido'].map((k) => c[k] ? h('span', { class: `seg s-${k}`, style: { flexGrow: c[k] } }) : null)),
        h('div', { class: 'leyenda' },
          h('span', null, h('i', { class: 's-prestado' }), plural(c.prestado, 'prestado', 'prestados')),
          c.mantenimiento ? h('span', null, h('i', { class: 's-mantenimiento' }), `${c.mantenimiento} en mantenimiento`) : null,
          c.perdido ? h('span', null, h('i', { class: 's-perdido' }), plural(c.perdido, 'perdido', 'perdidos')) : null));
    }));
    if (!resumen.children.length) {
      resumen.append(h('div', { class: 'tarjeta' },
        h('p', null, 'Todavía no hay equipos registrados.'),
        puede.administrar() ? h('a', { href: '#/equipos', class: 'btn btn-pri' }, 'Registrar equipos') : null));
    }

    const grupos = prestadosPorPersona();
    const total = grupos.reduce((s, g) => s + g.equipos.length, 0);
    const tarde = grupos.filter((g) => vencido(g.desde));
    const anteriores = grupos.filter((g) => g.desde < inicioDia());
    vaciar(prestados,
      h('div', { class: 'seccion-cab' },
        h('h2', null, 'Prestados ahora'),
        h('span', { class: 'contador' }, total)),
      anteriores.length ? h('div', { class: 'alerta-caja' }, icono('alerta'),
        h('span', null, `${plural(anteriores.length, 'persona tiene', 'personas tienen')} equipos desde días anteriores.`)) : null,
      tarde.length && !anteriores.length ? h('div', { class: 'alerta-caja suave' }, icono('reloj'),
        h('span', null, `${plural(tarde.length, 'préstamo supera', 'préstamos superan')} las ${app.ajustes.horasAlerta} horas.`)) : null,
      grupos.length
        ? h('div', { class: 'prestados' }, grupos.map((g) => tarjetaPrestados(g)))
        : vacio('Todo está en casa: no hay equipos prestados.'));
  }

  // Movimientos de hoy, en vivo. Al pasar la medianoche se cambia de día.
  let dia = null, cortarHoy = null;
  function escucharHoy() {
    const d = inicioDia();
    if (d === dia) return;
    dia = d;
    cortarHoy?.();
    cortarHoy = app.almacen.observarPrestamosRango(d, d + 864e5, (lista) => {
      const dev = lista.filter((p) => p.devuelto).length;
      hoyEl.textContent = lista.length
        ? `Hoy: ${plural(lista.length, 'entrega', 'entregas')} · ${plural(dev, 'devolución', 'devoluciones')}`
        : 'Hoy no hay movimientos todavía.';
    }, () => { hoyEl.textContent = ''; });
  }

  pintar();
  escucharHoy();
  const reloj = setInterval(() => { pintar(); escucharHoy(); }, 60000);
  const cortar = alCambiar((que) => {
    if (que === 'equipos' || que === 'personas' || que === 'ajustes') pintar();
  });
  return () => { cortar(); clearInterval(reloj); cortarHoy?.(); };
}
