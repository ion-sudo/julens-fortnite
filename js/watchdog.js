/**
 * watchdog.js
 * ---------------------------------------------------------------
 * VIGILANTE DE ARRANQUE. Es un script CLASICO a proposito (no un modulo):
 * tiene que funcionar aunque el grafo de modulos ni siquiera llegue a
 * enlazarse.
 *
 * El caso que cubre es este: si el navegador se queda con la version
 * antigua de un modulo y la mezcla con las nuevas, el import falla al
 * ENLAZAR. Eso ocurre antes de que se ejecute una sola linea del juego,
 * asi que ningun try/catch de dentro puede enterarse: la pagina se queda
 * con el menu de HTML pintado, el lienzo vacio y los botones muertos,
 * sin ninguna pista.
 *
 * Que hace:
 *   1. apunta todos los errores desde el primer instante
 *   2. a los 2 segundos comprueba si el juego ha arrancado (window.FC)
 *   3. si no, recarga UNA vez saltandose la cache (que arregla el 99 %)
 *   4. si tras el reintento sigue sin arrancar, ensena el error en pantalla
 */
(function () {
  'use strict';

  var CLAVE_REINTENTO = 'fc-reintento-cache';
  var ESPERA_MS = 2000;

  var errores = [];

  /** Se apuntan desde ya, antes de que cargue nada. */
  window.addEventListener('error', function (e) {
    // Fallos al cargar un archivo (404, etc.): e.target es el elemento.
    if (e.target && e.target !== window && e.target.src) {
      errores.push('No se ha podido cargar: ' + e.target.src);
      return;
    }
    errores.push(e.message || String(e.error || 'Error desconocido'));
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    errores.push('Promesa rechazada: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  /** Lo llama main.js cuando todo ha ido bien. */
  window.__fcArrancado = function () {
    try { sessionStorage.removeItem(CLAVE_REINTENTO); } catch (e) {}
  };

  /** Vuelve a pedir todo al servidor y recarga con una URL distinta. */
  function recargarSinCache() {
    var urls = [];
    try {
      var recursos = performance.getEntriesByType('resource');
      for (var i = 0; i < recursos.length; i++) {
        if (/\.(js|css)(\?|$)/.test(recursos[i].name)) urls.push(recursos[i].name);
      }
    } catch (e) {}

    urls.push(location.href);

    var pendientes = urls.length;
    var listo = false;

    function seguir() {
      if (listo) return;
      listo = true;
      var url = new URL(location.href);
      url.searchParams.set('nocache', String(Date.now()));
      location.replace(url.toString());
    }

    // Si algo se atasca, se recarga igualmente al segundo y medio.
    setTimeout(seguir, 1500);

    if (!pendientes) { seguir(); return; }

    for (var j = 0; j < urls.length; j++) {
      fetch(urls[j], { cache: 'reload' })
        .catch(function () {})
        .then(function () {
          pendientes--;
          if (pendientes <= 0) seguir();
        });
    }
  }

  /** Panel visible con lo que ha pasado. */
  function mostrarPanel() {
    if (document.getElementById('fc-watchdog')) return;

    var detalle = errores.length
      ? errores.slice(0, 6).join('\n')
      : 'El juego no ha llegado a arrancar y no se ha registrado ningun error concreto.';

    var panel = document.createElement('div');
    panel.id = 'fc-watchdog';
    panel.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;' +
      'align-items:center;justify-content:center;background:rgba(8,12,26,.94);' +
      'font-family:"Trebuchet MS",system-ui,sans-serif;color:#eaf1ff;padding:24px';

    panel.innerHTML =
      '<div style="max-width:660px;width:100%;background:#131c38;border:2px solid #e05a4a;' +
      'border-radius:16px;padding:24px 28px;box-shadow:0 18px 60px rgba(0,0,0,.6)">' +
      '<h2 style="margin:0 0 6px;color:#ff8a7a;font-size:22px">El juego no ha podido arrancar</h2>' +
      '<p style="margin:0 0 14px;color:rgba(234,241,255,.75);font-size:14px;line-height:1.5">' +
      'Ya se ha intentado recargar sin cache y sigue fallando. Este es el error:</p>' +
      '<pre id="fc-watchdog-detalle" style="margin:0 0 18px;padding:12px;background:rgba(0,0,0,.35);' +
      'border-radius:10px;font-size:12px;line-height:1.45;color:#ffd9d2;white-space:pre-wrap;' +
      'max-height:220px;overflow:auto"></pre>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button id="fc-watchdog-reload" style="padding:12px 20px;border:none;border-radius:10px;' +
      'cursor:pointer;background:linear-gradient(180deg,#6fe25e,#2f9e3f);color:#08240f;' +
      'font-family:inherit;font-size:15px;font-weight:900">Volver a intentarlo</button>' +
      '<button id="fc-watchdog-copiar" style="padding:12px 20px;border:2px solid rgba(255,255,255,.25);' +
      'border-radius:10px;cursor:pointer;background:transparent;color:#eaf1ff;font-family:inherit;' +
      'font-size:15px;font-weight:700">Copiar el error</button>' +
      '</div></div>';

    document.body.appendChild(panel);
    document.getElementById('fc-watchdog-detalle').textContent = detalle;

    document.getElementById('fc-watchdog-reload').onclick = function () {
      try { sessionStorage.removeItem(CLAVE_REINTENTO); } catch (e) {}
      recargarSinCache();
    };
    document.getElementById('fc-watchdog-copiar').onclick = function () {
      try { navigator.clipboard.writeText(detalle); this.textContent = 'Copiado'; } catch (e) {}
    };
  }

  /** Comprobacion pasado el margen de carga. */
  setTimeout(function () {
    if (window.FC) return;   // ha arrancado bien

    var yaReintentado = false;
    try { yaReintentado = sessionStorage.getItem(CLAVE_REINTENTO) === '1'; } catch (e) {}

    if (!yaReintentado) {
      // Primer intento: casi siempre es cache mezclada, asi que se
      // recarga sola sin molestar al jugador.
      try { sessionStorage.setItem(CLAVE_REINTENTO, '1'); } catch (e) {}
      console.warn('[FORTNITE CLASH] No ha arrancado; recargando sin cache...');
      recargarSinCache();
      return;
    }

    mostrarPanel();
  }, ESPERA_MS);
})();
