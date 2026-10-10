// Inventario: lista con filtros y, para administradores, altas una a una,
// en lote (IMP-01 … IMP-30) o desde un CSV.

import { app, alCambiar, puede, ejecutar, equipos as todos, tipoDe } from '../estado.js';
import { h, vaciar, icono, boton, entrada, selector, campo, dialogo, valores, vacio, aviso } from '../ui.js';
import { encabezado, filaEquipo, dialogoEquipo, opcionesArea } from '../componentes.js';
import { nuevoEquipo } from '../dominio.js';
import { descargarCSV, leerCSV, col } from '../csv.js';
import { coincide, ESTADOS, normalizarCodigo, fecha, numero } from '../util.js';

export default function vistaEquipos(raiz, { query }) {
  const f = { q: '', tipo: query.get('tipo') || '', estado: query.get('estado') || '', area: '' };
  const lista = h('div', { class: 'lista tarjeta' });
  const conteo = h('p', { class: 'suave' });
  const buscar = entrada({ type: 'search', placeholder: 'Buscar por código, nombre, serial…', 'aria-label': 'Buscar equipo' });
  buscar.addEventListener('input', () => { f.q = buscar.value; pintar(); });
  const filtros = h('div', { class: 'filtros' });

  function pintarFiltros() {
    vaciar(filtros,
      h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tipo' },
        [['', 'Todos'], ...app.ajustes.tipos.map((t) => [t.id, t.plural])].map(([v, t]) =>
          h('button', { type: 'button', class: f.tipo === v ? 'activo' : '', onclick: () => { f.tipo = v; pintarFiltros(); pintar(); } }, t))),
      selector([['', 'Todos los estados'], ...Object.entries(ESTADOS).map(([k, e]) => [k, e.nombre])], f.estado,
        { class: 'input compacto', 'aria-label': 'Estado', onchange: (e) => { f.estado = e.target.value; pintar(); } }),
      selector([['', 'Todas las áreas'], ...opcionesArea().slice(1)], f.area,
        { class: 'input compacto', 'aria-label': 'Área', onchange: (e) => { f.area = e.target.value; pintar(); } }));
  }

  const filtrados = () => todos().filter((e) =>
    (!f.tipo || e.tipo === f.tipo) && (!f.estado || e.estado === f.estado) && (!f.area || e.area === f.area) &&
    coincide(f.q, e.id, e.nombre, e.area, e.serial, e.modelo, e.canal, e.notas, e.prestamo?.personaNombre));

  function pintar() {
    const l = filtrados();
    conteo.textContent = `${l.length} de ${app.equipos.size} equipos`;
    vaciar(lista, l.length ? l.map((e) => filaEquipo(e)) : vacio(app.equipos.size ? 'Ningún equipo coincide con los filtros.' : 'Aún no hay equipos registrados.', 'radio'));
  }

  const admin = puede.administrar();
  raiz.append(
    encabezado('Equipos', 'Radios, impermeables y demás elementos que se prestan',
      admin && boton('Nuevo', { tipo: 'pri', ico: 'mas1', onclick: async () => { const id = await dialogoEquipo(); if (id) location.hash = `#/e/${encodeURIComponent(id)}`; } }),
      admin && boton('Agregar varios', { ico: 'mas1', onclick: agregarVarios })),
    h('div', { class: 'buscador' }, icono('buscar'), buscar),
    filtros,
    h('div', { class: 'fila-acc entre' },
      conteo,
      h('div', { class: 'fila-acc' },
        puede.operar() && boton('Etiquetas QR', {
          tipo: 'texto', ico: 'qr',
          onclick: () => {
            sessionStorage.setItem('etiquetas', JSON.stringify({ tipo: 'equipos', ids: filtrados().map((e) => e.id) }));
            location.hash = '#/etiquetas';
          },
        }),
        boton('Exportar', { tipo: 'texto', ico: 'descargar', onclick: exportar }),
        admin && boton('Importar', { tipo: 'texto', ico: 'subir', onclick: importar }))),
    lista,
  );
  pintarFiltros();
  pintar();

  function exportar() {
    descargarCSV(`equipos-${new Date().toISOString().slice(0, 10)}.csv`, filtrados(), [
      { titulo: 'Codigo', valor: (e) => e.id },
      { titulo: 'Nombre', valor: (e) => e.nombre },
      { titulo: 'Tipo', valor: (e) => tipoDe(e.tipo).nombre },
      { titulo: 'Area', valor: (e) => e.area },
      { titulo: 'Estado', valor: (e) => ESTADOS[e.estado]?.nombre },
      { titulo: 'Lo tiene', valor: (e) => e.prestamo?.personaNombre || '' },
      { titulo: 'Desde', valor: (e) => (e.prestamo ? fecha(e.prestamo.desde) : '') },
      { titulo: 'Modelo', valor: (e) => e.modelo },
      { titulo: 'Serial', valor: (e) => e.serial },
      { titulo: 'Canal', valor: (e) => e.canal },
      { titulo: 'Talla', valor: (e) => e.talla },
      { titulo: 'Usos', valor: (e) => e.usos || 0 },
      { titulo: 'Horas de uso', valor: (e) => numero((e.minutosUso || 0) / 60, 1) },
      { titulo: 'Ultimo uso', valor: (e) => fecha(e.ultimoUso) },
      { titulo: 'Notas', valor: (e) => e.notas },
    ]);
  }

  function agregarVarios() {
    const tipos = app.ajustes.tipos;
    const vista = h('p', { class: 'suave' });
    const form = h('form', { class: 'form' },
      h('div', { class: 'dos' },
        campo('Tipo', selector(tipos.map((t) => [t.id, t.nombre]), 'impermeable', { name: 'tipo' })),
        campo('Área', selector(opcionesArea(), '', { name: 'area' }))),
      h('div', { class: 'tres' },
        campo('Prefijo del código', entrada({ name: 'prefijo', value: 'IMP', required: true })),
        campo('Desde', entrada({ name: 'desde', type: 'number', value: 1, min: 0, required: true })),
        campo('Hasta', entrada({ name: 'hasta', type: 'number', value: 20, min: 0, required: true }))),
      campo('Nombre visible', entrada({ name: 'nombre', value: 'Impermeable', placeholder: 'Se le agrega el número' })),
      h('div', { class: 'dos' },
        campo('Modelo', entrada({ name: 'modelo', placeholder: 'Opcional' })),
        campo('Canal / talla', entrada({ name: 'extra', placeholder: 'Opcional' }))),
      vista);
    const actualizar = () => {
      const v = valores(form);
      const t = tipos.find((x) => x.id === v.tipo);
      if (document.activeElement !== form.prefijo && t) form.prefijo.value ||= t.prefijo;
      const pref = normalizarCodigo(v.prefijo);
      const n = Math.max(0, v.hasta - v.desde + 1);
      const ej = (i) => `${pref}-${String(i).padStart(2, '0')}`;
      const repetidos = [];
      for (let i = v.desde; i <= v.hasta && i - v.desde < 300; i++) if (app.equipos.has(ej(i))) repetidos.push(ej(i));
      vista.textContent = n
        ? `Se crearán ${n} equipos: ${ej(v.desde)}${n > 1 ? ` … ${ej(v.hasta)}` : ''}.${repetidos.length ? ` ${repetidos.length} ya existen y se omitirán.` : ''}`
        : 'Revisa el rango de números.';
    };
    form.tipo.addEventListener('change', () => {
      const t = tipos.find((x) => x.id === form.tipo.value);
      form.prefijo.value = t?.prefijo || '';
      form.nombre.value = t?.nombre || '';
      actualizar();
    });
    form.addEventListener('input', actualizar);
    actualizar();
    dialogo({
      titulo: 'Agregar varios equipos',
      contenido: form,
      acciones: [
        { texto: 'Cancelar' },
        {
          texto: 'Crear', tipo: 'pri',
          fn: async () => {
            const v = valores(form);
            const pref = normalizarCodigo(v.prefijo);
            if (!pref || v.hasta < v.desde) throw new Error('Revisa el prefijo y el rango.');
            if (v.hasta - v.desde > 299) throw new Error('Máximo 300 equipos por vez.');
            const ops = [];
            for (let i = v.desde; i <= v.hasta; i++) {
              const num = String(i).padStart(2, '0');
              const codigo = `${pref}-${num}`;
              if (app.equipos.has(codigo)) continue;
              ops.push(nuevoEquipo({
                codigo, tipo: v.tipo, area: v.area, modelo: v.modelo,
                nombre: v.nombre ? `${v.nombre.trim()} ${i}` : codigo,
                canal: v.tipo === 'radio' ? v.extra : '', talla: v.tipo === 'impermeable' ? v.extra : '',
              }));
            }
            if (!ops.length) throw new Error('Todos esos códigos ya existen.');
            await ejecutar(ops, { ok: `${ops.length} equipos creados` });
          },
        },
      ],
    });
  }

  function importar() {
    const archivo = h('input', { type: 'file', accept: '.csv,text/csv', class: 'input' });
    dialogo({
      titulo: 'Importar equipos desde CSV',
      contenido: h('div', { class: 'form' },
        h('p', null, 'Columnas reconocidas: Codigo (obligatoria), Nombre, Tipo, Area, Modelo, Serial, Canal, Talla, Notas.'),
        h('p', { class: 'suave' }, 'Desde Excel: Archivo → Guardar como → CSV. Los códigos que ya existen se omiten.'),
        archivo),
      acciones: [
        { texto: 'Cancelar' },
        {
          texto: 'Importar', tipo: 'pri',
          fn: async () => {
            const a = archivo.files[0];
            if (!a) throw new Error('Elige un archivo.');
            const filas = leerCSV(await a.text());
            const tipos = app.ajustes.tipos;
            const ops = [];
            const vistos = new Set();
            for (const fila of filas) {
              const codigo = normalizarCodigo(col(fila, 'codigo', 'código', 'code', 'id'));
              if (!codigo || app.equipos.has(codigo) || vistos.has(codigo)) continue;
              vistos.add(codigo);
              const tTxt = col(fila, 'tipo');
              const tipo = tipos.find((t) => coincide(tTxt, t.id) || coincide(tTxt, t.nombre) || coincide(tTxt, t.plural))?.id || 'radio';
              ops.push(nuevoEquipo({
                codigo, tipo, nombre: col(fila, 'nombre'), area: col(fila, 'area', 'área'), modelo: col(fila, 'modelo'),
                serial: col(fila, 'serial', 'serie'), canal: col(fila, 'canal', 'frecuencia'), talla: col(fila, 'talla'), notas: col(fila, 'notas'),
              }));
            }
            if (!ops.length) throw new Error('No hay equipos nuevos en el archivo.');
            await ejecutar(ops);
            aviso(`${ops.length} equipos importados`);
          },
        },
      ],
    });
  }

  const cortar = alCambiar((que) => {
    if (que === 'equipos') pintar();
    if (que === 'ajustes') { pintarFiltros(); pintar(); }
  });
  return cortar;
}
