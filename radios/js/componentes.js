// Piezas reutilizadas por varias vistas.

import { app, ejecutar, tipoDe, vencido, puede } from './estado.js';
import { h, icono, iconoTipo, boton, insigniaEstado, chipArea, dialogo, campo, entrada, selector, valores, aviso, avisoError } from './ui.js';
import { guardarPersona, nuevoEquipo, editarEquipo, planRecepcion, planDeshacerRecepcion, planNovedad } from './dominio.js';
import { cuando, duracion, minutosDesde, enlaceWhatsApp, mensajeRecordatorio, fecha, normalizarCodigo } from './util.js';

export function encabezado(titulo, subtitulo, ...acciones) {
  return h('div', { class: 'encabezado' },
    h('div', null, h('h1', null, titulo), subtitulo && h('p', { class: 'suave' }, subtitulo)),
    acciones.length ? h('div', { class: 'encabezado-acc' }, acciones) : null);
}

export function chipEquipo(eq, { quitar } = {}) {
  return h('span', { class: 'chip-eq' }, iconoTipo(eq.tipo), h('span', null, eq.nombre || eq.id),
    quitar && h('button', { type: 'button', class: 'chip-x', 'aria-label': `Quitar ${eq.nombre}`, onclick: quitar }, icono('cerrar')));
}

export function filaEquipo(eq, { extra } = {}) {
  const p = eq.prestamo;
  return h('a', { href: `#/e/${encodeURIComponent(eq.id)}`, class: 'fila fila-btn' },
    h('span', { class: 'fila-ico', style: { '--c': colorDeArea(eq.area) } }, iconoTipo(eq.tipo)),
    h('div', { class: 'fila-txt' },
      h('strong', null, eq.nombre, eq.nombre !== eq.id && h('span', { class: 'codigo' }, eq.id)),
      h('small', null,
        eq.estado === 'prestado' && p
          ? [h('span', null, `${p.personaNombre} · ${cuando(p.desde)}`), vencido(p.desde) && h('span', { class: 'badge t-bad mini' }, duracion(minutosDesde(p.desde)))]
          : [eq.area || tipoDe(eq.tipo).nombre, eq.notaEstado && ` · ${eq.notaEstado}`])),
    extra || insigniaEstado(eq.estado));
}

function colorDeArea(area) {
  return app.ajustes.areas.find((a) => a.nombre === area)?.color || '#7b8794';
}

export function enlaceWhats(grupo, texto = 'Recordar') {
  const msg = mensajeRecordatorio(app.ajustes.mensajeWhatsApp, grupo, grupo.equipos);
  const url = enlaceWhatsApp(grupo.telefono, msg);
  if (!url) return null;
  // En la demo los celulares son inventados: no se abre WhatsApp para no escribirle a un desconocido.
  if (app.almacen.modo === 'demo') {
    return h('button', {
      type: 'button', class: 'btn btn-whats btn-peq',
      onclick: () => aviso(`En la demostración no se abre WhatsApp, porque los celulares son inventados. En la app real se abre el chat de ${grupo.nombre} con este mensaje: «${msg}»`, { tipo: 'info', ms: 9000 }),
    }, icono('whatsapp'), h('span', null, texto));
  }
  return h('a',{ class: 'btn btn-whats btn-peq', href: url, target: '_blank', rel: 'noopener' }, icono('whatsapp'), h('span', null, texto));
}

// Tarjeta de una persona con los equipos que tiene en su poder.
export function tarjetaPrestados(g, { recibir = puede.operar() } = {}) {
  const tarde = vencido(g.desde);
  return h('div', { class: `prestado ${tarde ? 'tarde' : ''}` },
    h('div', { class: 'prestado-cab' },
      h('a', { href: `#/p/${encodeURIComponent(g.personaId)}`, class: 'prestado-nombre' },
        h('strong', null, g.nombre), chipArea(g.area)),
      h('span', { class: `prestado-tiempo ${tarde ? 't-bad' : ''}` }, icono('reloj'), duracion(minutosDesde(g.desde)))),
    h('div', { class: 'prestado-eqs' }, g.equipos.map((e) => h('a', { href: `#/e/${encodeURIComponent(e.id)}`, title: `Ver o recibir solo ${e.nombre}` }, chipEquipo(e)))),
    h('div', { class: 'prestado-acc' },
      h('small', { class: 'suave' }, `Desde ${cuando(g.desde)}`),
      h('div', { class: 'fila-acc' },
        tarde && enlaceWhats(g),
        recibir && boton(g.equipos.length > 1 ? `Recibir todos (${g.equipos.length})` : 'Recibir', {
          tipo: 'pri', clase: 'btn-peq', ico: 'recibir',
          onclick: () => recibirVarios(g.equipos),
        }))));
}

// Recibe equipos "en buen estado" con opción de deshacer desde el aviso.
export async function recibirVarios(lista, { novedades = [], obs = '', mantenimiento = false } = {}) {
  const hechos = [];
  try {
    const ops = [];
    for (const eq of lista) {
      const r = planRecepcion({ equipo: eq, usuario: app.usuario, novedades, obs, mantenimiento });
      ops.push(...r.ops);
      hechos.push({ equipoId: eq.id, prestamoAnterior: r.prestamoAnterior, minutos: r.minutos });
    }
    await ejecutar(ops);
  } catch (e) {
    avisoError(e);
    return [];
  }
  const nombres = lista.map((e) => e.nombre).join(', ');
  aviso(`Recibido: ${nombres}`, { accion: { texto: 'Deshacer', fn: () => deshacer(hechos) } });
  return hechos;
}

export async function deshacer(hechos) {
  try {
    const ops = [];
    for (const x of hechos) {
      const eq = app.equipos.get(x.equipoId);
      ops.push(...planDeshacerRecepcion({ equipo: eq, prestamoAnterior: x.prestamoAnterior, minutos: x.minutos }).ops);
    }
    await ejecutar(ops, { ok: 'Recepción deshecha' });
  } catch (e) {
    avisoError(e);
  }
}

// Formulario de novedad con tipos (falla de batería, antena…).
// Devuelve {novedades, obs, mantenimiento} o null si se cancela.
export function pedirNovedad({ nombre, titulo = 'Registrar novedad', textoBoton = 'Guardar' }) {
  const elegidas = new Set();
  const mant = h('input', { type: 'checkbox' });
  let mantTocado = false;
  mant.addEventListener('change', () => { mantTocado = true; });
  const obs = h('textarea', { class: 'input', rows: 2, placeholder: 'Detalle (opcional): qué pasó, desde cuándo…' });
  const tipos = app.ajustes.novedades;
  const chips = h('div', { class: 'chips-op', role: 'group', 'aria-label': 'Tipo de novedad' }, tipos.map((n) => {
    const b = h('button', {
      type: 'button', class: 'chip-op', 'aria-pressed': 'false',
      onclick: () => {
        const on = !elegidas.has(n.nombre);
        if (on) elegidas.add(n.nombre); else elegidas.delete(n.nombre);
        b.setAttribute('aria-pressed', String(on));
        if (!mantTocado) mant.checked = tipos.some((t) => t.mant && elegidas.has(t.nombre));
      },
    }, n.nombre);
    return b;
  }));
  let datos = null;
  return dialogo({
    titulo,
    contenido: h('div', { class: 'form' },
      h('p', null, `¿Qué novedad tiene ${nombre}? Puedes marcar varias.`),
      chips,
      campo('Detalle', obs),
      h('label', { class: 'check' }, mant, h('span', null, 'Enviar a mantenimiento (no se presta hasta que un administrador lo libere)'))),
    acciones: [
      { texto: 'Cancelar' },
      {
        texto: textoBoton, tipo: 'pri',
        fn: () => {
          if (!elegidas.size && !obs.value.trim()) {
            aviso('Elige al menos un tipo de novedad o escribe el detalle.', { tipo: 'error' });
            return false;
          }
          datos = { novedades: tipos.map((t) => t.nombre).filter((n) => elegidas.has(n)), obs: obs.value, mantenimiento: mant.checked };
        },
      },
    ],
  }).promesa.then(() => datos);
}

// Novedad sobre algo ya recibido (por ejemplo, después del escaneo rápido).
export async function dialogoNovedad({ equipoId, prestamoId, nombre }) {
  const d = await pedirNovedad({ nombre });
  if (!d) return null;
  try {
    await ejecutar(planNovedad({ equipoId, prestamoId, ...d }).ops, { ok: 'Novedad registrada' });
    return d;
  } catch (e) {
    avisoError(e);
    return null;
  }
}

// Recibe un equipo registrando de una vez la novedad.
export async function recibirConNovedad(eq) {
  const d = await pedirNovedad({ nombre: eq.nombre, titulo: `Recibir ${eq.nombre} con novedad`, textoBoton: 'Recibir' });
  if (!d) return [];
  return recibirVarios([eq], d);
}

export function textoNovedad(p) {
  return [(p.novedades || []).join(', '), p.obsDevolucion].filter(Boolean).join(' — ') || 'Con novedad';
}

export function opcionesArea(valor) {
  const nombres = app.ajustes.areas.map((a) => a.nombre);
  if (valor && !nombres.includes(valor)) nombres.push(valor);
  return [['', '— Sin área —'], ...nombres.map((n) => [n, n])];
}

// Crear o editar persona. Devuelve el id guardado o null.
export function dialogoPersona(persona = null, { nombreInicial = '' } = {}) {
  const p = persona || {};
  const form = h('form', { class: 'form' },
    campo('Nombre completo', entrada({ name: 'nombre', value: p.nombre || nombreInicial, required: true, autocomplete: 'off' })),
    h('div', { class: 'dos' },
      campo('Celular', entrada({ name: 'telefono', value: p.telefono || '', type: 'tel', inputmode: 'tel', placeholder: '300 123 4567' })),
      campo('Documento', entrada({ name: 'documento', value: p.documento || '', inputmode: 'numeric', placeholder: 'Opcional' }))),
    h('div', { class: 'dos' },
      campo('Área / ministerio', selector(opcionesArea(p.area), p.area || '', { name: 'area' })),
      campo('Cargo o código', entrada({ name: 'cargo', value: p.cargo || '', placeholder: 'Ej: Omega 10, Servidor' }))),
    campo('Notas', entrada({ name: 'notas', value: p.notas || '' })));
  let idGuardado = null;
  return dialogo({
    titulo: persona ? 'Editar persona' : 'Nueva persona',
    contenido: form,
    acciones: [
      { texto: 'Cancelar' },
      {
        texto: 'Guardar', tipo: 'pri',
        fn: async () => {
          if (!form.reportValidity()) return false;
          const op = guardarPersona({ ...valores(form), id: p.id });
          await ejecutar([op], { ok: persona ? 'Persona actualizada' : 'Persona registrada' });
          idGuardado = op.id;
        },
      },
    ],
  }).promesa.then(() => idGuardado);
}

// Crear o editar un equipo (solo administradores).
export function dialogoEquipo(equipo = null) {
  const e = equipo || { tipo: 'radio' };
  const tipos = app.ajustes.tipos.map((t) => [t.id, t.nombre]);
  const campoCodigo = entrada({
    name: 'codigo', value: e.id || '', required: true, disabled: Boolean(equipo),
    placeholder: 'Ej: OMEGA-10, LOG-05, IMP-12', autocapitalize: 'characters',
  });
  const extra = h('div');
  const pintarExtra = (tipo) => {
    extra.replaceChildren(
      tipo === 'radio' ? h('div', { class: 'dos' },
        campo('Modelo', entrada({ name: 'modelo', value: e.modelo || '', placeholder: 'Baofeng UV-5R' })),
        campo('Canal / frecuencia', entrada({ name: 'canal', value: e.canal || '', placeholder: '457.625/468.500' }))) : null,
      tipo === 'impermeable' ? campo('Talla', selector(['', 'S', 'M', 'L', 'XL', 'XXL', 'Única'].map((t) => [t, t || '—']), e.talla || '', { name: 'talla' })) : null,
      tipo !== 'radio' && tipo !== 'impermeable' ? campo('Modelo / descripción', entrada({ name: 'modelo', value: e.modelo || '' })) : null,
      campo('Serial', entrada({ name: 'serial', value: e.serial || '', placeholder: 'Opcional' })),
    );
  };
  const selTipo = selector(tipos, e.tipo, { name: 'tipo', onchange: (ev) => pintarExtra(ev.target.value) });
  pintarExtra(e.tipo);
  const form = h('form', { class: 'form' },
    h('div', { class: 'dos' },
      campo('Código (va en el QR)', campoCodigo, equipo ? 'El código no se cambia porque ya puede estar impreso.' : 'Solo letras, números y guiones.'),
      campo('Tipo', selTipo)),
    h('div', { class: 'dos' },
      campo('Nombre visible', entrada({ name: 'nombre', value: e.nombre || '', placeholder: 'Ej: Omega 10' })),
      campo('Área', selector(opcionesArea(e.area), e.area || '', { name: 'area' }))),
    extra,
    campo('Notas', entrada({ name: 'notas', value: e.notas || '' })));
  let id = null;
  return dialogo({
    titulo: equipo ? `Editar ${equipo.nombre}` : 'Nuevo equipo',
    contenido: form,
    acciones: [
      { texto: 'Cancelar' },
      {
        texto: 'Guardar', tipo: 'pri',
        fn: async () => {
          if (!form.reportValidity()) return false;
          const v = valores(form);
          if (equipo) {
            await ejecutar([editarEquipo(equipo.id, v)], { ok: 'Equipo actualizado' });
            id = equipo.id;
          } else {
            const codigo = normalizarCodigo(v.codigo);
            if (app.equipos.has(codigo)) throw new Error(`Ya existe un equipo con el código ${codigo}.`);
            await ejecutar([nuevoEquipo({ ...v, codigo })], { ok: `Equipo ${codigo} creado` });
            id = codigo;
          }
        },
      },
    ],
  }).promesa.then(() => id);
}

// Lista de préstamos (historial de un equipo, de una persona o general).
export function listaPrestamos(prestamos, { mostrar = 'ambos' } = {}) {
  if (!prestamos.length) return h('p', { class: 'suave' }, 'Sin movimientos.');
  return h('div', { class: 'lista' }, prestamos.map((p) => h('button', {
    type: 'button', class: 'fila fila-btn mov', onclick: () => dialogoPrestamo(p),
  },
  h('span', { class: `fila-ico ${p.devuelto ? '' : 'abierto'}` }, iconoTipo(p.tipo)),
  h('div', { class: 'fila-txt' },
    h('strong', null, mostrar === 'persona' ? p.personaNombre : mostrar === 'equipo' ? p.equipoNombre : `${p.equipoNombre} → ${p.personaNombre}`),
    h('small', null, `${fecha(p.fechaEntrega)} · entregó ${p.entregadoPor?.nombre || '—'}`)),
  p.devuelto
    ? h('span', { class: `badge ${p.estadoDevolucion === 'ok' ? 't-ok' : 't-bad'}` }, p.estadoDevolucion === 'ok' ? duracion(p.minutos) : p.estadoDevolucion === 'perdido' ? 'Perdido' : 'Novedad')
    : h('span', { class: 'badge t-warn' }, 'Pendiente'))));
}

export function dialogoPrestamo(p) {
  const firma = h('div', { class: 'firma-ver' }, p.conFirma ? 'Cargando firma…' : 'Sin firma registrada');
  if (p.conFirma) {
    app.almacen.firma(p.entregaId)
      .then((src) => firma.replaceChildren(src ? h('img', { src, alt: `Firma de ${p.personaNombre}` }) : 'Firma no encontrada'))
      .catch(() => firma.replaceChildren('No se pudo cargar la firma'));
  }
  const dato = (k, v) => v ? h('div', { class: 'dato' }, h('span', null, k), h('strong', null, v)) : null;
  dialogo({
    titulo: `${p.equipoNombre} → ${p.personaNombre}`,
    contenido: h('div', { class: 'datos' },
      dato('Equipo', `${p.equipoNombre} (${p.equipoId})`),
      dato('Recibió', `${p.personaNombre}${p.personaArea ? ` · ${p.personaArea}` : ''}`),
      dato('Entregado', `${fecha(p.fechaEntrega)} por ${p.entregadoPor?.nombre || '—'}`),
      dato('Accesorios', p.accesorios),
      dato('Observaciones', p.obsEntrega),
      p.devuelto
        ? dato('Devuelto', `${fecha(p.fechaDevolucion)} a ${p.recibidoPor?.nombre || '—'} · ${duracion(p.minutos)}`)
        : dato('Devolución', 'Pendiente'),
      p.devuelto && p.estadoDevolucion !== 'ok' && dato(p.estadoDevolucion === 'perdido' ? 'Perdido' : 'Novedad', textoNovedad(p)),
      h('div', { class: 'dato' }, h('span', null, 'Firma'), firma)),
    acciones: [{ texto: 'Cerrar' }],
  });
}
