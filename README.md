# 📊 Scraper de Visitas y Descargas

Herramienta de línea de comandos que extrae automáticamente las estadísticas de **visitas** y **descargas** de una lista de URLs, exportando los resultados a un archivo CSV.

---

## 📋 Requisitos previos

- Ubuntu 24.x
- [Node.js](https://nodejs.org/) v18 o superior
- [pnpm](https://pnpm.io/)

---

## ⚙️ Instalación

### 1. Dependencias del sistema

Ejecuta los siguientes comandos en la terminal. En Ubuntu 24.x algunas librerías tienen el sufijo `t64`; acepta esas sugerencias si el sistema las propone automáticamente.

```bash
sudo apt-get update && \
sudo apt-get install -y \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libnss3 \
  libcups2t64 \
  libxss1 \
  libxrandr2 \
  libasound2t64 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libpangocairo-1.0-0 \
  libgtk-3-0 \
  libgbm1
```

> **Nota Ubuntu 24.x:** Si el gestor de paquetes sugiere versiones con sufijo `t64` (por ejemplo `libasound2t64` en lugar de `libasound2`), acéptalas. Son equivalentes y compatibles con esta versión del SO.

### 2. Instalar dependencias de Node.js

```bash
pnpm install
```

Esto instalará `puppeteer-extra` y `puppeteer-extra-plugin-stealth` según el `package.json`.

### 3. Instalar el navegador Chrome para Puppeteer

```bash
npx puppeteer browsers install chrome
```

---

## 📁 Estructura del proyecto

```
.
├── scraper.js        # Script principal
├── enlaces.txt       # Lista de URLs a procesar (una por línea)
├── resultados.csv    # Archivo de salida generado automáticamente
├── package.json
└── README.md
```

---

## 🚀 Uso

### Preparar el archivo de URLs

Crea un archivo `enlaces.txt` con una URL por línea:

```
https://ejemplo.com/recurso-1
https://ejemplo.com/recurso-2
https://ejemplo.com/recurso-3
```

### Ejecutar el scraper

**Con archivos por defecto** (`enlaces.txt` → `resultados.csv`):

```bash
node scraper.js
```

**Con archivos personalizados:**

```bash
node scraper.js mis_urls.txt mi_salida.csv
```

---

## 📄 Formato de salida

El archivo CSV generado tiene el siguiente formato:

```csv
URL,Visitas,Descargas
"https://ejemplo.com/recurso-1",1520,340
"https://ejemplo.com/recurso-2",Error,Error
"https://ejemplo.com/recurso-3",890,120
```

| Columna     | Descripción                                                    |
|-------------|----------------------------------------------------------------|
| `URL`       | URL procesada                                                  |
| `Visitas`   | Número de visitas en los últimos N días. `Error` si falló.     |
| `Descargas` | Número de descargas en los últimos N días. `Error` si falló.   |

---

## ⚙️ Configuración avanzada

Puedes ajustar estas constantes al inicio de `scraper.js`:

| Constante           | Valor por defecto | Descripción                                                              |
|---------------------|:-----------------:|--------------------------------------------------------------------------|
| `CONCURRENCIA`      | `5`               | Pestañas simultáneas. Valores bajos reducen el riesgo de ser bloqueado.  |
| `DELAY_ENTRE_LOTES` | `1500`            | Pausa (ms) entre cada lote. Aumentar si hay muchos errores de bloqueo.   |

---

## ❗ Solución de problemas

### El navegador no abre / error de librerías

Verifica que todas las dependencias del sistema estén instaladas (paso 1). En Ubuntu 24.x algunas tienen sufijo `t64`:

```bash
sudo apt-get install -y libasound2t64 libcups2t64
```

### Muchos errores "Bot detectado"

- Reduce `CONCURRENCIA` a `2` o `3`.
- Aumenta `DELAY_ENTRE_LOTES` a `3000` o más.
- Verifica que el plugin Stealth esté activo (`puppeteer-extra-plugin-stealth` instalado).

### El archivo `enlaces.txt` no se encuentra

Asegúrate de ejecutar el script desde la misma carpeta donde está el archivo, o pasa la ruta completa:

```bash
node scraper.js /ruta/completa/mis_urls.txt resultados.csv
```

---
