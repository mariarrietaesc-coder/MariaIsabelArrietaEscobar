// Lector de QR con la cámara. Usa BarcodeDetector cuando el navegador lo
// tiene (Chrome en Android) y jsQR en los demás (iPhone, escritorio).

import { h, icono, boton, sonar } from './ui.js';

let cargaJsQR;
function cargarJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  cargaJsQR ||= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/jsqr.min.js', import.meta.url).href;
    s.onload = () => ok(window.jsQR);
    s.onerror = () => mal(new Error('No se pudo cargar el lector de QR.'));
    document.head.append(s);
  });
  return cargaJsQR;
}

async function crearDetector() {
  if ('BarcodeDetector' in window) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      if (formatos.includes('qr_code')) {
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async (video) => (await det.detect(video))[0]?.rawValue || null;
      }
    } catch { /* se usa jsQR */ }
  }
  const jsQR = await cargarJsQR();
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const escala = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * escala), hh = Math.round(video.videoHeight * escala);
    if (!w || !hh) return null;
    lienzo.width = w; lienzo.height = hh;
    ctx.drawImage(video, 0, 0, w, hh);
    const img = ctx.getImageData(0, 0, w, hh);
    return jsQR(img.data, w, hh, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

/**
 * Abre el lector a pantalla completa.
 * alLeer(texto) devuelve {ok, mensaje}. En modo continuo el lector sigue
 * abierto para leer varios equipos seguidos; si no, se cierra al primer ok.
 */
export function abrirEscaner({ titulo = 'Escanear QR', ayuda = 'Apunta al código QR', continuo = false, alLeer }) {
  let flujo = null, cerrado = false, ultimo = '', ultimoT = 0, linterna = false, ocupado = false;
  let terminar;
  const fin = new Promise((r) => (terminar = r));

  const video = h('video', { class: 'esc-video', playsinline: true, muted: true, autoplay: true });
  video.muted = true;
  const mensaje = h('div', { class: 'esc-msg' }, ayuda);
  const contador = h('div', { class: 'esc-contador', hidden: true });
  const btnLinterna = boton('Linterna', { tipo: 'vidrio', ico: 'linterna', hidden: true, onclick: alternarLinterna });
  const manual = h('input', {
    class: 'input', placeholder: 'O escribe el código y Enter', autocomplete: 'off', autocapitalize: 'characters', enterkeyhint: 'go',
  });
  manual.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && manual.value.trim()) {
      procesar(manual.value.trim(), true);
      manual.value = '';
    }
  });
  let leidos = 0;

  const capa = h('div', { class: 'esc', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'esc-cab' },
      h('strong', null, titulo),
      boton('Listo', { tipo: 'vidrio', ico: 'check', onclick: cerrar })),
    h('div', { class: 'esc-visor' }, video, h('div', { class: 'esc-marco' }), contador),
    h('div', { class: 'esc-pie' }, mensaje, h('div', { class: 'esc-fila' }, manual, btnLinterna)),
  );
  document.body.append(capa);
  document.body.classList.add('sin-scroll');
  const alTeclado = (e) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', alTeclado);

  async function procesar(texto, aMano = false) {
    const ahora = Date.now();
    if (!aMano && texto === ultimo && ahora - ultimoT < 2500) return;
    ultimo = texto; ultimoT = ahora;
    let r;
    try {
      r = await alLeer(texto);
    } catch (e) {
      r = { ok: false, mensaje: e.message };
    }
    r ||= { ok: false, mensaje: 'Código no reconocido' };
    sonar(r.ok);
    capa.classList.remove('flash-ok', 'flash-mal');
    void capa.offsetWidth;
    capa.classList.add(r.ok ? 'flash-ok' : 'flash-mal');
    mensaje.replaceChildren(icono(r.ok ? 'check' : 'alerta'), h('span', null, r.mensaje || ''));
    mensaje.className = `esc-msg ${r.ok ? 'ok' : 'mal'}`;
    if (r.ok) {
      leidos++;
      contador.hidden = !continuo;
      contador.textContent = String(leidos);
      if (!continuo) setTimeout(cerrar, 350);
    }
  }

  async function alternarLinterna() {
    const pista = flujo?.getVideoTracks()[0];
    if (!pista) return;
    linterna = !linterna;
    try {
      await pista.applyConstraints({ advanced: [{ torch: linterna }] });
      btnLinterna.classList.toggle('activo', linterna);
    } catch { /* la cámara no la soporta */ }
  }

  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    flujo?.getTracks().forEach((t) => t.stop());
    document.removeEventListener('keydown', alTeclado);
    document.body.classList.remove('sin-scroll');
    capa.remove();
    terminar(leidos);
  }

  (async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      mensaje.textContent = 'Este navegador no permite usar la cámara aquí (se necesita https). Escribe el código.';
      manual.focus();
      return;
    }
    try {
      flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (e) {
      mensaje.textContent = e.name === 'NotAllowedError'
        ? 'No hay permiso para usar la cámara. Actívalo en el navegador o escribe el código.'
        : 'No se pudo abrir la cámara. Escribe el código.';
      mensaje.className = 'esc-msg mal';
      manual.focus();
      return;
    }
    if (cerrado) { flujo.getTracks().forEach((t) => t.stop()); return; }
    video.srcObject = flujo;
    try { await video.play(); } catch { /* autoplay ya activo */ }
    const caps = flujo.getVideoTracks()[0]?.getCapabilities?.();
    if (caps?.torch) btnLinterna.hidden = false;

    let detectar;
    try {
      detectar = await crearDetector();
    } catch (e) {
      mensaje.textContent = e.message;
      return;
    }
    const ciclo = async () => {
      if (cerrado) return;
      if (!ocupado && video.readyState >= 2) {
        ocupado = true;
        try {
          const texto = await detectar(video);
          if (texto) await procesar(texto);
        } catch { /* cuadro ilegible */ }
        ocupado = false;
      }
      setTimeout(ciclo, 120);
    };
    ciclo();
  })();

  return fin;
}
