/**
 * boot.js
 * ---------------------------------------------------------------
 * RED DE SEGURIDAD DEL ARRANQUE.
 *
 * Si algo falla al montar el juego (por ejemplo, porque el navegador se
 * ha quedado con una version vieja de un modulo en su cache), antes se
 * quedaba la pantalla muerta: el menu se veia, pero el lienzo en blanco
 * y el boton JUGAR sin hacer nada, sin ninguna pista de por que.
 *
 * Ahora cualquier error se ensena en pantalla con un boton que recarga
 * la pagina saltandose la cache, que es la causa mas habitual.
 */

/** Muestra un panel de error legible por encima de todo. */
export function showFatalError(error, contexto = 'arranque') {
  console.error(`[FORTNITE CLASH] Error de ${contexto}:`, error);

  // Si ya hay un panel puesto, no se apilan.
  if (document.getElementById('fc-error')) return;

  const panel = document.createElement('div');
  panel.id = 'fc-error';
  panel.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(8, 12, 26, 0.92);
    font-family: "Trebuchet MS", system-ui, sans-serif; color: #eaf1ff;
    padding: 24px;
  `;

  const mensaje = (error && error.message) ? error.message : String(error);
  const pila = (error && error.stack) ? error.stack.split('\n').slice(0, 4).join('\n') : '';

  const caja = document.createElement('div');
  caja.style.cssText = `
    max-width: 640px; width: 100%;
    background: #131c38; border: 2px solid #e05a4a; border-radius: 16px;
    padding: 24px 28px; box-shadow: 0 18px 60px rgba(0,0,0,.6);
  `;
  caja.innerHTML = `
    <h2 style="margin:0 0 6px;color:#ff8a7a;font-size:22px;">El juego no ha podido arrancar</h2>
    <p style="margin:0 0 14px;color:rgba(234,241,255,.75);font-size:14px;line-height:1.5">
      Casi siempre es que el navegador se ha quedado con una version antigua
      de algun archivo. Pulsa el boton para recargar sin cache.
    </p>
    <pre style="margin:0 0 18px;padding:12px;background:rgba(0,0,0,.35);border-radius:10px;
                font-size:12px;line-height:1.45;color:#ffd9d2;white-space:pre-wrap;
                max-height:180px;overflow:auto">${escapar(mensaje)}\n${escapar(pila)}</pre>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button id="fc-error-reload" style="
        padding:12px 20px;border:none;border-radius:10px;cursor:pointer;
        background:linear-gradient(180deg,#6fe25e,#2f9e3f);color:#08240f;
        font-family:inherit;font-size:15px;font-weight:900;">Recargar sin cache</button>
      <button id="fc-error-close" style="
        padding:12px 20px;border:2px solid rgba(255,255,255,.25);border-radius:10px;cursor:pointer;
        background:transparent;color:#eaf1ff;font-family:inherit;font-size:15px;font-weight:700;">Cerrar</button>
    </div>
  `;

  panel.appendChild(caja);
  document.body.appendChild(panel);

  document.getElementById('fc-error-reload').onclick = () => hardReload();
  document.getElementById('fc-error-close').onclick = () => panel.remove();
}

/**
 * Recarga saltandose la cache: vuelve a pedir al servidor todos los
 * archivos que la pagina ha cargado y luego recarga.
 */
export async function hardReload() {
  const boton = document.getElementById('fc-error-reload');
  if (boton) { boton.textContent = 'Recargando...'; boton.disabled = true; }

  try {
    // performance nos da la lista real de lo que se ha cargado, asi que
    // no hay que mantener a mano ninguna lista de archivos.
    const recursos = performance.getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => /\.(js|css|html)(\?|$)/.test(n));

    const todos = new Set([...recursos, location.href, new URL('js/main.js', location.href).href]);

    await Promise.all(
      [...todos].map((url) => fetch(url, { cache: 'reload' }).catch(() => {}))
    );
  } catch (e) {
    console.warn('[FORTNITE CLASH] No se ha podido revalidar la cache:', e);
  }

  // Un parametro distinto en la URL fuerza a que la pagina no venga de cache.
  const url = new URL(location.href);
  url.searchParams.set('recarga', String(Date.now()));
  location.replace(url.toString());
}

/** Engancha los errores que ocurran DESPUES del arranque. */
export function watchRuntimeErrors() {
  window.addEventListener('error', (e) => {
    // Los fallos al cargar imagenes/recursos no traen error: se ignoran.
    if (!e.error) return;
    showFatalError(e.error, 'ejecucion');
  });

  window.addEventListener('unhandledrejection', (e) => {
    showFatalError(e.reason, 'ejecucion');
  });
}

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
