# Prompt: Dashboard de Monitoreo de Cámaras de Estacionamiento

## Contexto del proyecto

Estás construyendo el frontend de un sistema de monitoreo de estacionamiento.
Una cámara Reolink graba la entrada del estacionamiento y sube imágenes/videos
por FTP a un servidor. Un backend FastAPI (Python) procesa los archivos con un
modelo ALPR (YOLOv9 + CCT-XS) que detecta patentes automáticamente.

**El frontend es solo monitoreo.** No hay flujo de cobro ni registro manual
en esta versión. El objetivo es que el operador vea en tiempo real qué está
pasando: qué autos entraron, qué imágenes no se pudieron leer, y el feed
visual de la cámara.

---

## Stack tecnológico

- **Framework**: Next.js (App Router) — leer `node_modules/next/dist/docs/` antes de escribir código
- **Estilos**: Tailwind CSS v4
- **Lenguaje**: TypeScript
- **Íconos**: `lucide-react` (ya instalado)
- **Fechas**: `date-fns` (ya instalado)
- **Sin librerías adicionales de UI** — componentes propios con Tailwind

El backend está en `http://localhost:8000`. Next.js ya tiene un rewrite
configurado en `next.config.ts` que proxea `/api/*` → `http://localhost:8000/api/*`,
así que todas las llamadas al backend se hacen a rutas relativas `/api/...`.

---

## API del backend — shapes exactos

### `GET /api/monitor/images?date=YYYY-MM-DD`
Devuelve imágenes donde se detectó una patente (archivadas en `/ftp/historico`).
```json
{
  "date": "2026-05-26",
  "images": [
    {
      "filename": "16-38-33_RVDH83_2026-05-26.jpg",
      "plate": "RVDH83",
      "time": "16:38:33",
      "date": "2026-05-26",
      "tag": null,
      "url": "/api/monitor/file/historico/2026-05-26/16-38-33_RVDH83_2026-05-26.jpg"
    }
  ]
}
```
- `tag` puede ser `"dup"` si la misma patente fue detectada dos veces en 2 minutos.
- `url` es relativa — úsala directamente como `src` en `<img>`.
- Sin `?date=` devuelve el día de hoy (hora Santiago, Chile).

### `GET /api/monitor/review?date=YYYY-MM-DD`
Imágenes donde el modelo **no detectó** patente (archivadas en `/ftp/revisar`).
```json
{
  "date": "2026-05-26",
  "images": [
    {
      "filename": "16-38-38_NO_DETECTADA_2026-05-26.jpg",
      "plate": null,
      "time": "16:38:38",
      "date": "2026-05-26",
      "tag": null,
      "reason": "NO_DETECTADA",
      "url": "/api/monitor/file/revisar/2026-05-26/16-38-38_NO_DETECTADA_2026-05-26.jpg"
    }
  ]
}
```
- `reason` puede ser `"NO_DETECTADA"` (el modelo corrió pero no encontró placa)
  o `"VACIA"` (archivo vacío/corrupto llegó desde la cámara).
- Las de `reason: "VACIA"` son `.mp4`, no `.jpg` — no mostrar como imagen.

### `GET /api/monitor/file/historico/{date}/{filename}`
### `GET /api/monitor/file/revisar/{date}/{filename}`
Sirve el archivo de imagen directamente. Ya está en `url` de los endpoints
anteriores — no construir la URL manualmente.

### `GET /api/history`
Log de acciones del día (últimas 50 entradas, orden DESC).
```json
[
  ["2026-05-26 16:38:33", "RVDH83", "ENTRY", "FTP_AUTO", 0.0, 1.0],
  ["2026-05-26 16:13:50", "TLCF91", "ENTRY", "FTP_AUTO", 0.0, 1.0]
]
```
Índices: `[0]=timestamp, [1]=plate, [2]=action, [3]=status, [4]=fee, [5]=confidence`
- `action`: `"ENTRY"` | `"EXIT"` | `"VOID"`
- `status`: `"FTP_AUTO"` (detectado por cámara) | `"REAL"` (registro manual)

### `GET /api/stats`
```json
{
  "today_income": 0,
  "today_entries": 53,
  "today_exits": 0,
  "parked_now": 124
}
```

### `GET /api/ftp/events`
Historial de detecciones vía FTP (últimas 500, orden ASC).
```json
{
  "events": [
    {
      "timestamp": "2026-05-26 16:38:33",
      "plate": "RVDH83",
      "source": "image",
      "confidence": 0.946,
      "strategy": "center_crop",
      "action": "ENTRY"
    }
  ]
}
```
- `source`: `"image"` | `"video"`
- `strategy`: nombre del pipeline de pre-procesamiento usado (raw, clahe, sharpen, etc.)
- `action`: `"ENTRY"` | `"EXIT"` | `"DUP"`

### `GET /api/cars`
Autos actualmente estacionados (dict por patente).
```json
{
  "RVDH83": {
    "plate": "RVDH83",
    "entryTime": 1748277513000,
    "isEvent": false,
    "eventFee": null
  }
}
```
- `entryTime` es unix timestamp en **milisegundos**.

---

## Diseño del UI

### Layout general

```
┌─────────────────────────────────────────────────────┐
│  HEADER: logo | tabs | fecha actual | indicador live │
├─────────────────────────────────────────────────────┤
│                                                     │
│              CONTENIDO DEL TAB ACTIVO               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Fondo oscuro (`bg-slate-950`), texto claro.
- **Auto-refresh cada 15 segundos** cuando la pestaña del browser está visible
  (`document.visibilityState === "visible"`).
- Un pequeño indicador en el header muestra cuándo se hizo el último refresh
  (ej: "hace 3s").

---

### Tab 1 — Cámaras (`/`)

Panel principal. Muestra el feed de imágenes detectadas hoy.

**Estructura:**
```
┌─────────────────────────────────────────────────────┐
│  Stats bar: [Detecciones hoy: 23] [Sin detectar: 8] │
│  Date picker: ← 2026-05-26 →                        │
├─────────────────────────────────────────────────────┤
│  Grid de imágenes (3 cols desktop, 2 tablet, 1 móvil)│
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  [foto]  │  │  [foto]  │  │  [foto]  │          │
│  │ 16:38    │  │ 16:30    │  │ 16:13    │          │
│  │ RVDH83   │  │ TFKZ98   │  │ TLCF91   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

**Cada tarjeta de imagen:**
- Thumbnail de la imagen (proporción 4:3, `object-cover`).
- Hora grande abajo a la izquierda (`16:38`).
- Patente en fuente mono abajo a la derecha.
- Si `tag === "dup"`: badge amarillo `DUP` en esquina superior.
- Hover: leve glow/scale.
- Click: abre lightbox modal con la imagen en grande + metadatos
  (patente, hora, estrategia de detección si está en `ftp/events`).

**Estado vacío:** mensaje centrado "Sin detecciones hoy" con ícono de cámara.

---

### Tab 2 — Hoy

Lista de todos los movimientos del día desde `/api/history`,
complementado con `/api/stats`.

**Estructura:**
```
┌─────────────────────────────────────────────────────┐
│  Hero stats: [53 entradas] [0 salidas] [124 en patio]│
├─────────────────────────────────────────────────────┤
│  Lista cronológica de movimientos:                   │
│  ┌────────────────────────────────────────────────┐  │
│  │ 16:38  RVDH83  ENTRADA  FTP_AUTO  conf: 1.0   │  │
│  │ 16:13  TLCF91  ENTRADA  FTP_AUTO  conf: 1.0   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Cada fila:**
- Hora (HH:MM) en fuente mono opaca.
- Patente en fuente mono grande.
- Badge de acción: `ENTRADA` verde, `SALIDA` índigo, `VOID` rojo.
- Badge de origen: `AUTO` (FTP_AUTO) vs `MANUAL` (REAL) — distinción visual sutil.
- Solo mostrar registros de hoy (filtrar por fecha del timestamp).

---

### Tab 3 — Revisar

Imágenes donde el modelo no pudo leer la patente.
El operador las revisa manualmente para saber si hubo un auto
que no quedó registrado.

**Estructura:**
```
┌─────────────────────────────────────────────────────┐
│  [8 imágenes sin detectar hoy]  Date picker: ←→     │
├─────────────────────────────────────────────────────┤
│  Grid de imágenes (igual que tab Cámaras)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  [foto]  │  │ [vacío]  │  │  [foto]  │          │
│  │ 16:38    │  │ 16:26    │  │ 16:25    │          │
│  │NO DETECT.│  │ VACÍO    │  │NO DETECT.│          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

**Diferencias con tab Cámaras:**
- Tarjetas sin imagen muestran un placeholder (ícono de cámara tachada) para las `VACIA`.
- Solo mostrar `.jpg` — las `.mp4` (VACIA) como tarjeta sin preview pero con metadatos.
- No hay interacción — solo visualización por ahora.
- Color de acento: naranja/rojo para indicar que son items pendientes.

---

## Comportamiento técnico

### Fetching y refresh

```typescript
// Patrón de polling recomendado
useEffect(() => {
  fetchData();
  const id = setInterval(() => {
    if (document.visibilityState === "visible") fetchData();
  }, 15_000);
  return () => clearInterval(id);
}, [date]);
```

Guardar `lastRefresh: Date` en estado para el indicador del header.

### Date picker

- Estado local `date: string` en formato `"YYYY-MM-DD"`.
- Default: día de hoy en hora local del browser.
- Dos botones `←` / `→` para navegar días.
- No permitir navegar al futuro.
- Al cambiar fecha, re-fetch inmediato.

### Lightbox modal

Al hacer click en una imagen:
- Overlay oscuro `fixed inset-0 bg-black/80 z-50`.
- Imagen centrada, máximo 90vw/90vh.
- Metadatos debajo: patente, hora, fuente, confianza (si disponible en `ftp/events`).
- Cerrar con click fuera, botón X, o tecla Escape.

### Error handling

- Si el backend no responde: mostrar banner no intrusivo "Backend desconectado" y seguir
  mostrando la última data cargada.
- Imágenes rotas: placeholder con ícono de imagen rota.

---

## Estructura de archivos esperada

```
src/
  app/
    page.tsx           ← página principal con tabs
    layout.tsx         ← layout existente (no modificar fuente)
    globals.css        ← estilos existentes (no modificar)
  components/
    Header.tsx         ← logo + tabs + indicador live
    ImageGrid.tsx      ← grid de imágenes reutilizable (Cámaras y Revisar)
    ImageCard.tsx      ← tarjeta individual con thumbnail
    Lightbox.tsx       ← modal de imagen expandida
    TodayList.tsx      ← lista de movimientos del día
    StatsBanner.tsx    ← barra de stats numéricos
    DateNav.tsx        ← navegador de fechas ← →
  lib/
    api.ts             ← funciones fetch tipadas para cada endpoint
    types.ts           ← tipos TypeScript para las respuestas del API
```

---

## Restricciones importantes

1. **No usar `useEffect` con `fetch` dentro de Server Components** — esta app
   necesita polling en cliente, usar `"use client"` donde corresponda.
2. **No instalar shadcn ni otras librerías de componentes** — Tailwind puro.
3. **Tailwind v4** usa `@import "tailwindcss"` sin config file — no crear `tailwind.config.js`.
4. **No modificar** `next.config.ts`, `layout.tsx`, `globals.css` ni `package.json`
   a menos que sea estrictamente necesario.
5. Las imágenes se sirven desde el propio backend — usar `url` del API directamente
   como `src`. No usar `next/image` para estas (son de origen dinámico sin dominio fijo).
6. El backend corre en `localhost:8000` — el proxy de Next.js ya está configurado.
   Todas las llamadas usan rutas relativas `/api/...`.

---

## Notas de diseño

- Paleta principal: `slate-950` fondo, `slate-100` texto, `indigo-500` acento.
- Fuente mono para patentes: `font-mono font-black tracking-widest`.
- Las patentes chilenas tienen formato `LLNNNN` (2 letras + 4 números) o
  `LLLNNN` (3 letras + 3 números, formato nuevo). Mostrarlas en mayúsculas.
- Tamaño mínimo de texto para patentes en tarjetas: `text-lg`.
- Las horas siempre en formato 24h.
- Usar `tabular-nums` para números que cambian (contadores, horas).
