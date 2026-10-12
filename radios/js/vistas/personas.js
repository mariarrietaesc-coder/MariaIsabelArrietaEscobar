// Personas que reciben equipos (servidores, coordinadores, voluntarios).

import { app, alCambiar, puede, ejecutar } from '../estado.js';
import { h, vaciar, icono, boton, entrada, selector, chipArea, dialogo, vacio, aviso } from '../ui.js';
import { encabezado, dialogoPersona, opcionesArea } from '../componentes.js';
import { guardarPersona } from '../dominio.js';
import { descargarCSV, leerCSV, col } from '../csv.js';
import { coincide, cuando, fecha, normalizarTexto } from '../util.js';

export default function vistaPersonas(raiz) {
  const f = { q: '', area: '', orden: 'nombre' };
  const lista = h('div', { class: 'lista tarjeta' });
  const conteo = h('p', { class: 'suave' });
  const buscar = entrada({ type: 'search', placeholder: 'Buscar por nombre, celular, documento…', 'aria-label': 'Buscar persona' });
  buscar.addEventListener('input', () => { f.q = buscar.value; pintar(); });

  const pendientes = () => {
    const m = new Map();
    for (const e of app.equipos.values()) if (e.estado === 'prestado' && e.prestamo) m.set(e.prestamo.personaId, (m.get(e.prestamo.personaId) || 0) + 1);
    return m;
  };

  const filtradas = () => {
    const l = [...app.personas.values()].filter((p) => (!f.area || p.area === f.area) && coincide(f.q, p.nombre, p.telefono, p.documento, p.cargo, p.area));
    if (f.orden === 'usos') return l.sort((a, b) => (b.usos || 0) - (a.usos || 0));
    if (f.orden === 'reciente') return l.sort((a, b) => (b.ultimoUso || 0) - (a.ultimoUso || 0));
    return l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  };

  function pintar() {
    const l = filtradas();
    const pend = pendientes();
    conteo.textContent = `${l.length} de ${app.personas.size} personas`;
    vaciar(lista, l.length ? l.map((p) => h('a', { href: `#/p/${encodeURIComponent(p.id)}`, class: 'fila fila-btn' },
      h('span', { class: 'avatar' }, p.nombre[0]?.toUpperCase()),
      h('div', { class: 'fila-txt' },
        h('strong', null, p.nombre),
        h('small', null, chipArea(p.area), ' ', [p.cargo, p.telefono, p.ultimoUso && `último: ${cuando(p.ultimoUso)}`].filter(Boolean).join(' · '))),
      pend.get(p.id) ? h('span', { class: 'badge t-warn' }, `Tiene ${pend.get(p.id)}`) : h('span', { class: 'suave mini' }, `${p.usos || 0} usos`)))
      : vacio(app.personas.size ? 'Nadie coincide con la búsqueda.' : 'Aún no hay personas. Se registran desde aquí o al hacer una entrega.', 'personas'));
  }

  raiz.append(
    encabezado('Personas', 'Quienes reciben equipos en préstamo',
      puede.operar() && boton('Nueva', { tipo: 'pri', ico: 'mas1', onclick: () => dialogoPersona() })),
    h('div', { class: 'buscador' }, icono('buscar'), buscar),
    h('div', { class: 'filtros' },
      selector([['', 'Todas las áreas'], ...opcionesArea().slice(1)], '', { class: 'input compacto', 'aria-label': 'Área', onchange: (e) => { f.area = e.target.value; pintar(); } }),
      selector([['nombre', 'Orden: nombre'], ['usos', 'Orden: más préstamos'], ['reciente', 'Orden: uso reciente']], 'nombre',
        { class: 'input compacto', 'aria-label': 'Orden', onchange: (e) => { f.orden = e.target.value; pintar(); } })),
    h('div', { class: 'fila-acc entre' },
      conteo,
      h('div', { class: 'fila-acc' },
        puede.operar() && boton('Carnets QR', {
          tipo: 'texto', ico: 'qr',
          onclick: () => {
            sessionStorage.setItem('etiquetas', JSON.stringify({ tipo: 'personas', ids: filtradas().map((p) => p.id) }));
            location.hash = '#/etiquetas';
          },
        }),
        boton('Exportar', { tipo: 'texto', ico: 'descargar', onclick: exportar }),
        puede.operar() && boton('Importar', { tipo: 'texto', ico: 'subir', onclick: importar }))),
    lista,
  );
  pintar();

  function exportar() {
    descargarCSV(`personas-${new Date().toISOString().slice(0, 10)}.csv`, filtradas(), [
      { titulo: 'Nombre', valor: (p) => p.nombre },
      { titulo: 'Celular', valor: (p) => p.telefono },
      { titulo: 'Documento', valor: (p) => p.documento },
      { titulo: 'Area', valor: (p) => p.area },
      { titulo: 'Cargo', valor: (p) => p.cargo },
      { titulo: 'Prestamos', valor: (p) => p.usos || 0 },
      { titulo: 'Ultimo uso', valor: (p) => fecha(p.ultimoUso) },
      { titulo: 'Notas', valor: (p) => p.notas },
    ]);
  }

  function importar() {
    const archivo = h('input', { type: 'file', accept: '.csv,text/csv', class: 'input' });
    dialogo({
      titulo: 'Importar personas desde CSV',
      contenido: h('div', { class: 'form' },
        h('p', null, 'Columnas reconocidas: Nombre (obligatoria), Celular, Documento, Area, Cargo, Notas.'),
        h('p', { class: 'suave' }, 'Si ya existe alguien con el mismo nombre o documento, se omite.'),
        archivo),
      acciones: [
        { texto: 'Cancelar' },
        {
          texto: 'Importar', tipo: 'pri',
          fn: async () => {
            const a = archivo.files[0];
            if (!a) throw new Error('Elige un archivo.');
            const filas = leerCSV(await a.text());
            const nombres = new Set([...app.personas.values()].map((p) => normalizarTexto(p.nombre)));
            const docs = new Set([...app.personas.values()].map((p) => p.documento).filter(Boolean));
            const ops = [];
            for (const fila of filas) {
              const nombre = col(fila, 'nombre', 'nombre completo', 'name');
              const documento = col(fila, 'documento', 'cedula', 'cédula', 'cc');
              if (!nombre || nombres.has(normalizarTexto(nombre)) || (documento && docs.has(documento))) continue;
              nombres.add(normalizarTexto(nombre));
              if (documento) docs.add(documento);
              ops.push(guardarPersona({
                nombre, documento, telefono: col(fila, 'celular', 'telefono', 'teléfono', 'whatsapp'),
                area: col(fila, 'area', 'área', 'ministerio'), cargo: col(fila, 'cargo', 'rol', 'omega'), notas: col(fila, 'notas'),
              }));
            }
            if (!ops.length) throw new Error('No hay personas nuevas en el archivo.');
            await ejecutar(ops);
            aviso(`${ops.length} personas importadas`);
          },
        },
      ],
    });
  }

  const cortar = alCambiar((que) => { if (que === 'personas' || que === 'equipos') pintar(); });
  return cortar;
}
