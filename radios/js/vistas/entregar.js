// Entrega: persona → equipos (QR, lector USB o búsqueda) → firma → confirmar.

import { app, alCambiar, ejecutar, equipos as todosLosEquipos } from '../estado.js';
import { h, vaciar, icono, iconoTipo, boton, chipArea, entrada, insigniaEstado, avisoError, confirmar as preguntar, aviso } from '../ui.js';
import { encabezado, chipEquipo, dialogoPersona, recibirVarios } from '../componentes.js';
import { planEntrega } from '../dominio.js';
import { abrirEscaner } from '../escaner.js';
import { interpretar } from '../qr.js';
import { crearFirma } from '../firma.js';
import { coincide, ESTADOS, hora, cuando, plural } from '../util.js';

export default function entregar(raiz, { query }) {
  const st = { persona: app.personas.has(query.get('p')) ? query.get('p') : null, items: [], enviando: false };

  const zonaPersona = h('div');
  const zonaEquipos = h('div');
  const accesorios = entrada({ placeholder: 'Ej: manos libres, batería extra' });
  const obs = entrada({ placeholder: 'Opcional' });
  const pad = crearFirma({ alCambiar: () => pintarBarra() });
  const barra = h('div', { class: 'barra-confirmar' });
  const contenido = h('div', { class: 'pasos' });

  // ---------- Paso 1: persona ----------
  const buscarPersona = entrada({
    type: 'search', placeholder: 'Nombre, celular o documento…', enterkeyhint: 'search', 'aria-label': 'Buscar persona',
  });
  const resultadosPersona = h('div', { class: 'lista resultados' });
  buscarPersona.addEventListener('input', pintarResultadosPersona);
  buscarPersona.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = buscarPersona.value.trim();
    const r = interpretar(texto, app);
    if (r?.tipo === 'persona' && app.personas.has(r.id)) { elegirPersona(r.id); return; }
    if (r?.tipo === 'equipo') { buscarPersona.value = ''; agregarEquipo(r.id, { preguntar: true }); pintarResultadosPersona(); return; }
    const primero = resultadosPersona.querySelector('button.fila');
    primero?.click();
  });

  function pendientesDe(id) {
    return [...app.equipos.values()].filter((e) => e.estado === 'prestado' && e.prestamo?.personaId === id);
  }

  function pintarResultadosPersona() {
    const q = buscarPersona.value.trim();
    if (!q) return vaciar(resultadosPersona);
    const lista = [...app.personas.values()]
      .filter((p) => p.activo !== false && coincide(q, p.nombre, p.telefono, p.documento, p.cargo, p.area))
      .sort((a, b) => (b.usos || 0) - (a.usos || 0))
      .slice(0, 6);
    vaciar(resultadosPersona,
      lista.map((p) => {
        const pend = pendientesDe(p.id).length;
        return h('button', { type: 'button', class: 'fila fila-btn', onclick: () => elegirPersona(p.id) },
          icono('persona'),
          h('div', { class: 'fila-txt' }, h('strong', null, p.nombre), h('small', null, [p.area, p.cargo, p.telefono].filter(Boolean).join(' · '))),
          pend ? h('span', { class: 'badge t-warn' }, `Tiene ${pend}`) : null);
      }),
      h('button', { type: 'button', class: 'fila fila-btn nueva', onclick: () => nuevaPersona(q) },
        icono('mas1'), h('div', { class: 'fila-txt' }, h('strong', null, `Registrar "${q}"`), h('small', null, 'Persona nueva'))));
  }

  async function nuevaPersona(nombre = '') {
    const id = await dialogoPersona(null, { nombreInicial: nombre });
    if (id) {
      // En Firestore el documento aparece en el estado al instante (caché local).
      st.persona = id;
      buscarPersona.value = '';
      pintar();
    }
  }

  function elegirPersona(id) {
    st.persona = id;
    buscarPersona.value = '';
    vaciar(resultadosPersona);
    pintar();
    if (!st.items.length) setTimeout(() => buscarEquipo.focus(), 50);
  }

  function pintarPersona() {
    const p = st.persona && app.personas.get(st.persona);
    if (!p) {
      vaciar(zonaPersona,
        h('div', { class: 'buscador' }, icono('buscar'), buscarPersona),
        resultadosPersona,
        h('div', { class: 'fila-acc' },
          boton('Escanear carnet', { ico: 'qr', onclick: escanearCarnet }),
          boton('Nueva persona', { ico: 'mas1', onclick: () => nuevaPersona(buscarPersona.value.trim()) })));
      return;
    }
    const pend = pendientesDe(p.id);
    vaciar(zonaPersona,
      h('div', { class: 'elegido' },
        h('span', { class: 'avatar' }, p.nombre[0]?.toUpperCase()),
        h('div', { class: 'fila-txt' },
          h('strong', null, p.nombre),
          h('small', null, chipArea(p.area), ' ', [p.cargo, p.telefono].filter(Boolean).join(' · '))),
        boton('Cambiar', { tipo: 'texto', onclick: () => { st.persona = null; pintar(); buscarPersona.focus(); } })),
      pend.length ? h('div', { class: 'alerta-caja' }, icono('alerta'),
        h('span', null, `Ya tiene ${pend.map((e) => e.nombre).join(', ')} desde ${cuando(Math.min(...pend.map((e) => e.prestamo.desde)))}. `),
        boton('Recibirlos', { tipo: 'texto', onclick: () => recibirVarios(pend) })) : null);
  }

  function escanearCarnet() {
    abrirEscaner({
      titulo: 'Carnet de la persona',
      ayuda: 'Escanea el QR del carnet',
      alLeer: (texto) => {
        const r = interpretar(texto, app);
        if (r?.tipo === 'persona') {
          const p = app.personas.get(r.id);
          if (!p) return { ok: false, mensaje: 'Esa persona no está registrada' };
          elegirPersona(p.id);
          return { ok: true, mensaje: p.nombre };
        }
        if (r?.tipo === 'equipo') return agregarEquipo(r.id);
        return { ok: false, mensaje: 'No es un carnet de esta app' };
      },
    });
  }

  // ---------- Paso 2: equipos ----------
  const buscarEquipo = entrada({
    type: 'search', placeholder: 'Código o nombre del equipo…', enterkeyhint: 'done', autocapitalize: 'characters', 'aria-label': 'Buscar equipo',
  });
  const resultadosEquipo = h('div', { class: 'lista resultados' });
  buscarEquipo.addEventListener('input', pintarResultadosEquipo);
  buscarEquipo.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const r = interpretar(buscarEquipo.value, app);
    if (r?.tipo === 'equipo') {
      const res = await agregarEquipo(r.id, { preguntar: true });
      if (!res.ok) aviso(res.mensaje, { tipo: 'error' });
      buscarEquipo.value = '';
      pintarResultadosEquipo();
    } else if (r?.tipo === 'persona' && app.personas.has(r.id)) {
      buscarEquipo.value = '';
      elegirPersona(r.id);
    } else {
      resultadosEquipo.querySelector('button.fila')?.click();
    }
  });

  function pintarResultadosEquipo() {
    const q = buscarEquipo.value.trim();
    if (!q) return vaciar(resultadosEquipo);
    const lista = todosLosEquipos()
      .filter((e) => !st.items.includes(e.id) && coincide(q, e.id, e.nombre, e.area, e.talla && `talla ${e.talla}`))
      .sort((a, b) => (a.estado === 'disponible' ? 0 : 1) - (b.estado === 'disponible' ? 0 : 1))
      .slice(0, 8);
    vaciar(resultadosEquipo, lista.length ? lista.map((e) => h('button', {
      type: 'button', class: 'fila fila-btn',
      onclick: async () => {
        const r = await agregarEquipo(e.id, { preguntar: true });
        if (!r.ok) aviso(r.mensaje, { tipo: 'error' });
        buscarEquipo.value = '';
        pintarResultadosEquipo();
        buscarEquipo.focus();
      },
    },
    iconoTipo(e.tipo),
    h('div', { class: 'fila-txt' }, h('strong', null, e.nombre, h('span', { class: 'codigo' }, e.id)),
      h('small', null, e.estado === 'prestado' ? `Lo tiene ${e.prestamo?.personaNombre}` : [e.area, e.talla && `Talla ${e.talla}`].filter(Boolean).join(' · '))),
    insigniaEstado(e.estado))) : h('p', { class: 'suave pad' }, 'Ningún equipo coincide.'));
  }

  async function agregarEquipo(id, { preguntar: conPregunta = false } = {}) {
    const eq = app.equipos.get(id);
    if (!eq) return { ok: false, mensaje: `No existe el equipo ${id}` };
    if (st.items.includes(id)) return { ok: false, mensaje: `${eq.nombre} ya está en la lista` };
    if (eq.estado === 'prestado') {
      if (conPregunta && await preguntar(
        `${eq.nombre} figura prestado a ${eq.prestamo?.personaNombre} desde ${cuando(eq.prestamo?.desde)}. ¿Registrar su devolución ahora para poder entregarlo?`,
        { titulo: 'Equipo prestado', si: 'Recibir y agregar' },
      )) {
        const hechos = await recibirVarios([eq]);
        if (hechos.length) {
          st.items.push(id);
          pintar();
          return { ok: true, mensaje: `${eq.nombre} agregado` };
        }
      }
      return { ok: false, mensaje: `${eq.nombre} está prestado a ${eq.prestamo?.personaNombre}. Primero recíbelo.` };
    }
    if (eq.estado !== 'disponible') return { ok: false, mensaje: `${eq.nombre} está en ${ESTADOS[eq.estado]?.nombre.toLowerCase()}` };
    st.items.push(id);
    pintar();
    return { ok: true, mensaje: `${eq.nombre} agregado · van ${st.items.length}` };
  }

  function escanearEquipos() {
    abrirEscaner({
      titulo: 'Escanear equipos',
      ayuda: 'Escanea uno tras otro. Toca "Listo" al terminar.',
      continuo: true,
      alLeer: (texto) => {
        const r = interpretar(texto, app);
        if (r?.tipo === 'equipo') return agregarEquipo(r.id);
        if (r?.tipo === 'persona') {
          const p = app.personas.get(r.id);
          if (!p) return { ok: false, mensaje: 'Esa persona no está registrada' };
          elegirPersona(p.id);
          return { ok: true, mensaje: `Recibe: ${p.nombre}` };
        }
        return { ok: false, mensaje: `Código no reconocido: ${String(texto).slice(0, 40)}` };
      },
    });
  }

  function pintarEquipos() {
    const elegidos = st.items.map((id) => app.equipos.get(id)).filter(Boolean);
    vaciar(zonaEquipos,
      boton('Escanear QR de los equipos', { tipo: 'pri', ico: 'escanear', clase: 'btn-grande ancho', onclick: escanearEquipos }),
      h('div', { class: 'buscador' }, icono('buscar'), buscarEquipo),
      resultadosEquipo,
      elegidos.length
        ? h('div', { class: 'elegidos' }, elegidos.map((e) => h('div', { class: `elegido-eq ${e.estado !== 'disponible' ? 'conflicto' : ''}` },
          chipEquipo(e, { quitar: () => { st.items = st.items.filter((x) => x !== e.id); pintar(); } }),
          e.estado !== 'disponible' ? h('small', { class: 't-bad' }, `Ya no está disponible (${ESTADOS[e.estado]?.nombre})`) : null)))
        : h('p', { class: 'suave pad' }, 'Aún no hay equipos en esta entrega.'));
  }

  // ---------- Paso 3 y confirmación ----------
  function pintarBarra() {
    const p = st.persona && app.personas.get(st.persona);
    const n = st.items.length;
    const conflicto = st.items.some((id) => app.equipos.get(id)?.estado !== 'disponible');
    const faltaFirma = app.ajustes.firmaObligatoria && pad.vacia;
    const listo = p && n && !conflicto && !faltaFirma && !st.enviando;
    const falta = !p ? 'Elige quién recibe' : !n ? 'Agrega equipos' : conflicto ? 'Quita los equipos no disponibles' : faltaFirma ? 'Falta la firma' : '';
    vaciar(barra,
      h('div', { class: 'barra-txt' }, listo ? h('span', null, `${plural(n, 'equipo', 'equipos')} para `, h('strong', null, p.nombre)) : h('span', { class: 'suave' }, falta)),
      boton(st.enviando ? 'Guardando…' : 'Confirmar entrega', { tipo: 'pri', ico: 'check', disabled: !listo, onclick: confirmarEntrega }));
  }

  async function confirmarEntrega() {
    const persona = app.personas.get(st.persona);
    const eqs = st.items.map((id) => app.equipos.get(id));
    st.enviando = true;
    pintarBarra();
    try {
      const { ops } = planEntrega({
        persona, equipos: eqs, usuario: app.usuario,
        accesorios: accesorios.value, obs: obs.value, firma: pad.exportar(),
      });
      await ejecutar(ops);
      exito(persona, eqs);
    } catch (e) {
      avisoError(e);
      st.enviando = false;
      pintarBarra();
    }
  }

  function exito(persona, eqs) {
    cortar();
    pad.destruir();
    vaciar(raiz, h('div', { class: 'exito' },
      h('div', { class: 'exito-ico' }, icono('check')),
      h('h1', null, 'Entregado'),
      h('p', null, h('strong', null, persona.nombre), ` recibió ${plural(eqs.length, 'equipo', 'equipos')} a las ${hora(Date.now())}.`),
      h('div', { class: 'prestado-eqs centro' }, eqs.map((e) => chipEquipo(e))),
      h('div', { class: 'acciones centro' },
        boton('Nueva entrega', { tipo: 'pri', ico: 'entregar', onclick: () => { location.hash = '#/entregar?n=' + Date.now(); } }),
        h('a', { href: '#/inicio', class: 'btn btn-sec' }, 'Ir al inicio'))));
  }

  function pintar() {
    pintarPersona();
    pintarEquipos();
    pintarBarra();
  }

  raiz.append(
    encabezado('Entregar', 'Registra quién se lleva cada equipo'),
    vaciar(contenido,
      h('section', { class: 'tarjeta paso' }, h('h2', null, h('span', { class: 'num' }, '1'), '¿Quién recibe?'), zonaPersona),
      h('section', { class: 'tarjeta paso' }, h('h2', null, h('span', { class: 'num' }, '2'), 'Equipos'), zonaEquipos),
      h('section', { class: 'tarjeta paso' },
        h('h2', null, h('span', { class: 'num' }, '3'), 'Firma y notas',
          h('small', { class: 'suave' }, app.ajustes.firmaObligatoria ? ' (firma obligatoria)' : ' (opcional)')),
        h('div', { class: 'dos' },
          h('label', { class: 'campo' }, h('span', { class: 'campo-et' }, 'Accesorios'), accesorios),
          h('label', { class: 'campo' }, h('span', { class: 'campo-et' }, 'Observaciones'), obs)),
        pad.el)),
    barra,
  );
  pintar();
  if (!st.persona) setTimeout(() => buscarPersona.focus(), 50);
  if (query.get('e')) {
    agregarEquipo(query.get('e'), { preguntar: true }).then((r) => { if (!r.ok) aviso(r.mensaje, { tipo: 'error' }); });
  }

  const cortar = alCambiar((que) => {
    if (que === 'equipos') { pintarEquipos(); pintarBarra(); pintarResultadosEquipo(); if (st.persona) pintarPersona(); }
    if (que === 'personas') { if (st.persona) pintarPersona(); else pintarResultadosPersona(); pintarBarra(); }
    if (que === 'ajustes') pintarBarra();
  });
  return () => { cortar(); pad.destruir(); };
}
