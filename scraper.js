const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// --- CONFIGURACIÓN ---
const CONCURRENCIA = 5;        // Pestañas simultáneas (no subir mucho para evitar bloqueos)
const DELAY_ENTRE_LOTES = 1500; // ms de pausa entre lotes para reducir riesgo de bloqueo
const ARCHIVO_URLS = process.argv[2] || 'enlaces.txt';
const ARCHIVO_CSV = process.argv[3] || 'resultados.csv';

// User-Agents rotativos para mayor naturalidad
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extrae visitas y descargas de una URL.
 * Retorna una línea CSV lista para escribir.
 */
async function extraerDatos(browser, url, index, total) {
  const page = await browser.newPage();
  let resultado = { visitas: '0', descargas: '0' };

  try {
    // Bloquear recursos innecesarios para acelerar la carga
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const tipo = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(tipo)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(randomUA());

    // Viewport aleatorio entre resoluciones comunes
    await page.setViewport({
      width: 1280 + Math.floor(Math.random() * 400),
      height: 720 + Math.floor(Math.random() * 200),
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Espera hasta que el texto de visitas aparezca
    await page.waitForFunction(
      () => document.body.innerText.includes('Visitas en los últimos'),
      { timeout: 15000 }
    );

    const datos = await page.evaluate(() => {
      const texto = document.body.innerText;
      const mVisitas = texto.match(/(\d[\d.,]*)\s+Visitas en los últimos/i);
      const mDescargas = texto.match(/(\d[\d.,]*)\s+Descargas en los últimos/i);
      // Eliminamos puntos/comas de separación de miles
      const limpiar = (s) => s ? s.replace(/[.,]/g, '') : '0';
      return {
        visitas: limpiar(mVisitas ? mVisitas[1] : null),
        descargas: limpiar(mDescargas ? mDescargas[1] : null),
      };
    });

    resultado = datos;
    console.log(`[${index}/${total}] ✅ V:${resultado.visitas} | D:${resultado.descargas} → ${url}`);

  } catch (error) {
    const msg = error.message?.includes('timeout') ? 'Timeout' : 'Bot detectado / error';
    console.error(`[${index}/${total}] ❌ ${msg} → ${url}`);
    resultado = { visitas: 'Error', descargas: 'Error' };
  } finally {
    await page.close();
  }

  // Escapar comillas dentro de la URL por si acaso
  const urlSafe = `"${url.replace(/"/g, '""')}"`;
  return `${urlSafe},${resultado.visitas},${resultado.descargas}`;
}

(async () => {
  // Validar archivo de entrada
  if (!fs.existsSync(ARCHIVO_URLS)) {
    console.error(`❌ No se encontró el archivo: ${ARCHIVO_URLS}`);
    process.exit(1);
  }

  const urls = fs
    .readFileSync(ARCHIVO_URLS, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    console.error('❌ El archivo de URLs está vacío.');
    process.exit(1);
  }

  const totalUrls = urls.length;
  console.log(`🚀 Iniciando extracción de ${totalUrls} URLs con concurrencia ${CONCURRENCIA}...`);
  console.log(`📄 Resultados → ${path.resolve(ARCHIVO_CSV)}\n`);

  // Crear/sobreescribir CSV con cabeceras
  fs.writeFileSync(ARCHIVO_CSV, 'URL,Visitas,Descargas\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  let procesadas = 0;
  let errores = 0;

  try {
    for (let i = 0; i < totalUrls; i += CONCURRENCIA) {
      const loteUrls = urls.slice(i, i + CONCURRENCIA);

      const promesas = loteUrls.map((url, j) =>
        extraerDatos(browser, url, i + j + 1, totalUrls)
      );

      const resultadosLote = await Promise.all(promesas);

      // Contar errores del lote
      resultadosLote.forEach(r => { if (r.includes(',Error,')) errores++; });
      procesadas += loteUrls.length;

      // Escribir lote al CSV
      fs.appendFileSync(ARCHIVO_CSV, resultadosLote.join('\n') + '\n');

      // Pausa entre lotes (excepto el último)
      if (i + CONCURRENCIA < totalUrls) {
        await sleep(DELAY_ENTRE_LOTES);
      }
    }
  } finally {
    await browser.close();
  }

  const exitosas = procesadas - errores;
  console.log(`\n🎉 Extracción finalizada.`);
  console.log(`   ✅ Exitosas : ${exitosas}/${totalUrls}`);
  console.log(`   ❌ Errores  : ${errores}/${totalUrls}`);
  console.log(`   📄 Archivo  : ${path.resolve(ARCHIVO_CSV)}`);
})();