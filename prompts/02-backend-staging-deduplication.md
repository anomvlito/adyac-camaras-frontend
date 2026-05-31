# Prompt: Sistema de Staging y Deduplicación de Patentes

## Contexto General

Actualmente el sistema frontend recibe registros de patentes duplicadas dentro de ventanas de tiempo muy cortas (ej: SXDG18 × 5 en 4 minutos). Esto ocurre porque la cámara FTP detecta el mismo vehículo múltiples veces antes de que se mueva. El frontend no debe manejar esta lógica de deduplicación — es responsabilidad del backend implementar un buffer de staging que valide y deduplique antes de enviar datos al frontend.

---

## Objetivo

Implementar un **sistema de staging temporal** en el backend que:
1. Acumule detecciones en un buffer temporal (2 minutos por defecto)
2. Deduplique patentes por confianza y calidad
3. Solo libere al histórico la mejor captura de cada patente
4. Proporcione endpoints de auditoría bidireccional con el frontend
5. Mantenga logs detallados para investigación

---

## Arquitectura del Sistema

```
┌─────────────────┐
│  FTP Camera     │
│  (Detecciones)  │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Backend Detection Pipeline     │
│  (ALPR + Preprocessing)         │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   STAGING BUFFER (2 min TTL)    │
│  - Acumula detecciones recientes│
│  - Deduplica por patente        │
│  - Elige la mejor confianza     │
└────────┬────────────────────────┘
         │
    ┌────┴─────────────────────────┐
    │                              │
    ↓ (Aprobada)                  ↓ (Rechazada)
┌──────────────────┐      ┌──────────────────┐
│ HISTÓRICO FINAL  │      │ AUDIT LOG        │
│ (Solo mejores)   │      │ (Rechazadas)     │
└──────────────────┘      └──────────────────┘
    │
    ↓
┌──────────────────────────────────┐
│  Frontend consume datos limpios  │
│  (Solo patentes validadas)       │
└──────────────────────────────────┘
```

---

## Especificación Técnica Detallada

### 1. Estructura del Staging Buffer

**Tabla: `staging_detections` (TTL: 2 minutos)**

```python
class StagingDetection(Base):
    id: str = Column(String, primary_key=True)
    plate: str
    filename: str
    timestamp: datetime
    confidence: float  # 0.0 - 1.0
    source: str  # "image" | "video"
    strategy: str  # "raw", "clahe", "sharpen", etc.
    image_url: str
    quality_score: float = 0.0  # Métrica interna de calidad
    status: str = "pending"  # "pending" | "approved" | "rejected"
    rejection_reason: str | None
    created_at: datetime
    expires_at: datetime  # created_at + 2 minutos
```

**Índices:**
- `(plate, created_at)` - para buscar duplicados rápidamente
- `(status, expires_at)` - para limpieza de TTL

### 2. Lógica de Deduplicación

**Función: `deduplicate_detection(detection: StagingDetection)`**

```
1. Buscar en staging todas las detecciones con MISMA PATENTE en última 2 minutos
2. Si hay coincidencias:
   a. Calcular score de cada una:
      score = (confidence * 0.7) + (quality_score * 0.3)
   b. Mantener la de MAYOR score, marcar resto como "rejected"
   c. Razón: "DUPLICATE_LOWER_CONFIDENCE" o "DUPLICATE_LOWER_QUALITY"
3. Si es la mejor o es la única:
   a. Marcar como "approved"
   b. Mover al histórico final (/api/history)
4. Emitir evento: "detection:deduplicated" para auditoría
```

**Quality Score (métrica interna):**
```
- Sharpness: Laplacian variance (más alto = más nitido)
- Contrast: Diferencia max-min de píxeles
- Brightness: Desviación de 127 (medio gris, evita overexposure)
- Plate Region Clarity: OCR confidence en región de patente

quality_score = (sharpness * 0.4) + (contrast * 0.3) + (brightness * 0.2) + (plate_clarity * 0.1)
Normalizar a 0.0 - 1.0
```

### 3. Endpoints Nuevos

#### `POST /api/staging/deduplicate` (Interno)
Procesa una detección contra el staging buffer.

**Request:**
```json
{
  "plate": "SXDG18",
  "filename": "12-35-40_SXDG18_2026-05-31.jpg",
  "confidence": 0.946,
  "source": "image",
  "strategy": "center_crop",
  "image_url": "/api/monitor/file/staging/2026-05-31/12-35-40_SXDG18_2026-05-31.jpg"
}
```

**Response:**
```json
{
  "status": "approved",
  "action": "new_entry",
  "details": {
    "plate": "SXDG18",
    "selected_filename": "12-35-40_SXDG18_2026-05-31.jpg",
    "duplicates_rejected": [],
    "reason": "First detection"
  }
}
```

O:

```json
{
  "status": "rejected",
  "action": "duplicate_lower_quality",
  "details": {
    "plate": "SXDG18",
    "kept_filename": "12-35-38_SXDG18_2026-05-31.jpg",
    "kept_confidence": 0.987,
    "your_confidence": 0.946,
    "reason": "Lower confidence than existing detection"
  }
}
```

#### `GET /api/staging/status?plate=SXDG18` (Query)
Obtiene estado actual del staging para una patente.

**Response:**
```json
{
  "plate": "SXDG18",
  "pending": [
    {
      "filename": "12-35-40_SXDG18_2026-05-31.jpg",
      "confidence": 0.946,
      "age_seconds": 5
    }
  ],
  "approved": {
    "filename": "12-35-38_SXDG18_2026-05-31.jpg",
    "confidence": 0.987,
    "moved_to_history_at": "2026-05-31T12:35:42Z"
  }
}
```

#### `POST /api/audit/feedback` (Del Frontend)
El frontend reporta si detecta información incorrecta en lo que recibió.

**Request:**
```json
{
  "plate": "SXDG18",
  "timestamp": "2026-05-31 12:35:38",
  "issue": "image_not_loading | incorrect_plate | blurry_image | other",
  "details": "La imagen de patente no se ve clara",
  "frontend_user": "operator@adyac.com"
}
```

**Response:**
```json
{
  "status": "logged",
  "audit_id": "audit_20260531_001",
  "action": "backend_will_reaudit_detection",
  "details": "Se marcó esta detección para re-auditoría. Se analizará la calidad."
}
```

#### `GET /api/audit/log?date=2026-05-31` (Interno/Admin)
Historial de detecciones rechazadas y feedback.

**Response:**
```json
[
  {
    "timestamp": "2026-05-31T12:35:40Z",
    "plate": "SXDG18",
    "action": "rejected_duplicate",
    "reason": "DUPLICATE_LOWER_CONFIDENCE",
    "kept": { "filename": "12-35-38_SXDG18_2026-05-31.jpg", "confidence": 0.987 },
    "rejected": { "filename": "12-35-40_SXDG18_2026-05-31.jpg", "confidence": 0.946 }
  },
  {
    "timestamp": "2026-05-31T12:40:15Z",
    "plate": "TLCF91",
    "action": "frontend_feedback",
    "feedback_issue": "image_not_loading",
    "details": "La imagen no cargó correctamente en el frontend"
  }
]
```

### 4. Cambios en Endpoints Existentes

#### `GET /api/monitor/images?date=YYYY-MM-DD` (Modificado)
Ahora devuelve **solo detecciones aprobadas del staging**, nunca duplicados.

**Garantía:** Una patente aparece MÁXIMO UNA VEZ por día (la mejor captura).

#### `GET /api/history` (Modificado)
Ahora solo incluye registros que pasaron deduplicación.

---

## Comportamiento Esperado

### Escenario 1: Mismo Auto Pasa 5 Veces (2 minutos)
```
T=0s:   SXDG18 @ 12:35:38 conf=0.987  ← MEJOR → APROBADA al histórico
T=2s:   SXDG18 @ 12:35:40 conf=0.946  ← RECHAZADA (inferior)
T=4s:   SXDG18 @ 12:35:42 conf=0.923  ← RECHAZADA (inferior)
T=6s:   SXDG18 @ 12:35:44 conf=0.934  ← RECHAZADA (inferior)
T=8s:   SXDG18 @ 12:35:46 conf=0.918  ← RECHAZADA (inferior)

Resultado al Frontend:
- GET /api/monitor/images → Muestra SXDG18 UNA SOLA VEZ con conf=0.987
- GET /api/history → 1 ENTRY para SXDG18, no 5
```

### Escenario 2: Autos Diferentes Dentro de 2 Minutos
```
T=0s:   SXDG18 @ 12:35:38  conf=0.987  ← APROBADA
T=30s:  TFKZ98 @ 12:36:08  conf=0.965  ← APROBADA (diferente patente)
T=90s:  TLCF91 @ 12:37:08  conf=0.942  ← APROBADA (diferente patente)

Resultado al Frontend:
- GET /api/monitor/images → 3 imágenes diferentes
- GET /api/history → 3 ENTRIES
```

### Escenario 3: Frontend Reporta Problema
```
1. Frontend recibe: SXDG18 con timestamp 12:35:38
2. Frontend detecta: Imagen no carga o patente parece incorrecta
3. Frontend → POST /api/audit/feedback {plate, issue, details}
4. Backend → Marca esa detección para re-auditoría
5. Admin investigará: ¿Confianza baja? ¿Imagen mala? ¿OCR falló?
6. Siguiente detección de SXDG18 se procesa con más strictitud
```

---

## Implementación Recomendada

### Fase 1: Core Staging (Crítica)
- [ ] Tabla `staging_detections`
- [ ] Función `deduplicate_detection()`
- [ ] Quality score calculation
- [ ] TTL cleanup (task cada 1 minuto)
- [ ] POST `/api/staging/deduplicate`

### Fase 2: Query & Auditoría (Alta Prioridad)
- [ ] GET `/api/staging/status`
- [ ] POST `/api/audit/feedback`
- [ ] GET `/api/audit/log`

### Fase 3: Integración (Después de Fase 1)
- [ ] Modificar endpoints existentes para usar solo staging "approved"
- [ ] Asegurar que `/api/monitor/images` y `/api/history` NO muestren rechazadas

---

## Coordinación con Frontend

### Cambios NO Necesarios en Frontend
✅ El frontend **no necesita cambios** cuando el backend implemente esto.
✅ Seguirá consumiendo `/api/monitor/images` y `/api/history` igual.
✅ Pero ahora recibirá datos **limpios, sin duplicados**.

### Cambios Futuros (Fase 2)
- Frontend puede mostrar indicador: "🔄 Auditoría en progreso" si hay feedback pendiente
- Frontend puede enviar feedback vía POST `/api/audit/feedback`
- Admin panel podría consultar `/api/audit/log` para investigar anomalías

---

## Testing Recomendado

### Unit Tests Backend
```
✓ deduplicate_detection() con 5 detecciones iguales → mantiene mejor
✓ deduplicate_detection() con patentes diferentes → todas se aprueban
✓ Quality score calcula correctamente
✓ TTL expira detecciones después de 2 min
✓ Endpoints devuelven formato correcto
```

### Integration Tests
```
✓ Simular FTP → 5 detecciones SXDG18 en 2 min → frontend recibe 1
✓ Simular feedback → se registra en audit log
✓ Verificar que /api/history nunca muestra duplicados
```

---

## Configuración Recomendada

```python
# config.py
STAGING_TTL_SECONDS = 120  # 2 minutos
QUALITY_SCORE_WEIGHTS = {
    "sharpness": 0.4,
    "contrast": 0.3,
    "brightness": 0.2,
    "plate_clarity": 0.1,
}
CONFIDENCE_WEIGHT = 0.7
QUALITY_WEIGHT = 0.3
STAGING_CLEANUP_INTERVAL = 60  # Limpia cada 1 minuto
```

---

## Contacto & Coordinación

**Coordinar con:** Claude Code (Frontend)
**Repositorio:** `anomvlito/adyac-camaras-frontend`
**PR Actual:** `#1` (Monitoring Dashboard)

El frontend está listo para consumir estos endpoints. Una vez implemente el staging:
1. Notifique al equipo frontend con los detalles de cambios en respuestas de `/api/monitor/images` y `/api/history`
2. Proporcione documentación de `/api/audit/feedback` para integración opcional futura
3. Cualquier cambio en formato de respuesta debe coordinarse con el PR del frontend

---

## Notas Importantes

- **La deduplicación es del BACKEND, no del FRONTEND** — Frontend solo consume datos validados
- **Quality score es métrica interna** — no se expone al frontend, solo confianza/estrategia
- **Audit log es para investigación** — sirve para detectar patrones de fallos en ALPR
- **TTL de 2 minutos es configurable** — ajustar según comportamiento real de la cámara
- **Feedback bidireccional permite mejora continua** — si algo se ve mal, backend lo sabe

---

**Creado para:** adyac-camaras-frontend
**Versión:** 1.0
**Última actualización:** 31 May 2026
