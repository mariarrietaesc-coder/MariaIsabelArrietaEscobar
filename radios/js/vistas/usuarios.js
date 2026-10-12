// Usuarios de la app (quienes entregan y reciben). Solo administradores.

import { app, alCambiar, ejecutar } from '../estado.js';
import { h, vaciar, boton, campo, entrada, selector, dialogo, valores, aviso, avisoError, confirmar } from '../ui.js';
import { encabezado } from '../componentes.js';
import { ROLES, fecha } from '../util.js';

export default function vistaUsuarios(raiz) {
  const firebase = app.almacen.modo === 'firebase';
  const lista = h('div', { class: 'lista tarjeta' });

  function pintar() {
    const us = [...app.usuarios].sort((a, b) => (b.activo - a.activo) || (a.nombre || '').localeCompare(b.nombre || '', 'es'));
    vaciar(lista, us.map((u) => {
      const yo = u.id === app.usuario.uid;
      return h('div', { class: `fila fila-usuario ${u.activo ? '' : 'inactivo'}` },
        h('span', { class: 'avatar' }, (u.nombre || u.email || '?')[0].toUpperCase()),
        h('div', { class: 'fila-txt' },
          h('strong', null, u.nombre || u.email, yo ? h('span', { class: 'suave' }, ' (tú)') : null),
          h('small', null, [u.email, u.creado && `desde ${fecha(u.creado)}`].filter(Boolean).join(' · '))),
        h('div', { class: 'fila-acc' },
          selector(Object.entries(ROLES).map(([k, r]) => [k, r.nombre]), u.rol, {
            class: 'input compacto', disabled: yo, 'aria-label': `Rol de ${u.nombre}`,
            onchange: (e) => cambiar(u, { rol: e.target.value }, `Ahora ${u.nombre} es ${ROLES[e.target.value].nombre}`),
          }),
          !yo && boton(u.activo ? 'Desactivar' : 'Activar', {
            tipo: u.activo ? 'texto' : 'sec', clase: 'btn-peq',
            onclick: async () => {
              if (u.activo && !(await confirmar(`${u.nombre} ya no podrá entrar a la app. Su historial se conserva.`, { titulo: 'Desactivar usuario', si: 'Desactivar', peligro: true }))) return;
              cambiar(u, { activo: !u.activo }, u.activo ? 'Usuario desactivado' : 'Usuario activado');
            },
          }),
          firebase && u.email && boton('', {
            tipo: 'icono', ico: 'llave', title: 'Enviar correo para cambiar contraseña', 'aria-label': `Restablecer contraseña de ${u.nombre}`,
            onclick: async () => {
              try {
                await app.almacen.recuperarClave(u.email);
                aviso(`Correo enviado a ${u.email}`);
              } catch (e) { avisoError(e); }
            },
          })));
    }));
  }

  async function cambiar(u, data, ok) {
    try {
      await ejecutar([{ op: 'update', col: 'usuarios', id: u.id, data }], { ok });
    } catch (e) {
      avisoError(e);
      pintar();
    }
  }

  function nuevo() {
    const form = h('form', { class: 'form' },
      campo('Nombre', entrada({ name: 'nombre', required: true })),
      campo('Correo', entrada({ name: 'email', type: 'email', required: firebase, placeholder: firebase ? '' : 'Opcional en modo demo' })),
      firebase && campo('Contraseña temporal', entrada({ name: 'clave', type: 'text', required: true, minlength: 6, value: claveTemporal() }),
        'Compártela con la persona; luego puede cambiarla desde "Más → Cambiar mi contraseña".'),
      campo('Rol', selector(Object.entries(ROLES).map(([k, r]) => [k, `${r.nombre} — ${r.desc}`]), 'operador', { name: 'rol' })));
    dialogo({
      titulo: 'Nuevo usuario',
      contenido: form,
      acciones: [
        { texto: 'Cancelar' },
        {
          texto: 'Crear', tipo: 'pri',
          fn: async () => {
            if (!form.reportValidity()) return false;
            const v = valores(form);
            await app.almacen.crearUsuario({ nombre: v.nombre.trim(), email: (v.email || '').trim(), rol: v.rol, clave: v.clave });
            aviso(firebase ? `Usuario creado. Entra con ${v.email} y la contraseña temporal.` : 'Usuario creado');
          },
        },
      ],
    });
  }

  raiz.append(
    encabezado('Usuarios', 'Quienes pueden entregar, recibir o consultar', boton('Nuevo usuario', { tipo: 'pri', ico: 'mas1', onclick: nuevo })),
    h('div', { class: 'roles' }, Object.values(ROLES).map((r) => h('div', null, h('strong', null, r.nombre), h('span', { class: 'suave' }, r.desc)))),
    lista,
  );
  pintar();
  return alCambiar((que) => { if (que === 'usuarios') pintar(); });
}

function claveTemporal() {
  const p = ['radio', 'canal', 'antena', 'omega', 'zona', 'logis'];
  return `${p[Math.floor(Math.random() * p.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
}
