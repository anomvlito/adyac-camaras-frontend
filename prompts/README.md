# Prompts de implementación — Adyac Cámaras Frontend

Cada archivo en esta carpeta es un prompt autosuficiente para implementar
una parte del sistema. Están escritos para ser ejecutados por un agente de IA
(Claude Code, Cursor, etc.) o como brief para un desarrollador.

## Índice

| Archivo | Qué implementa |
|---|---|
| [`01-monitor-dashboard.md`](./01-monitor-dashboard.md) | Dashboard principal de monitoreo: imágenes de cámaras, autos del día, cola de revisión |

## Contexto del sistema

Este frontend se conecta a un backend FastAPI que procesa imágenes de una
cámara Reolink via FTP. El backend detecta patentes con ALPR (YOLOv9 + CCT-XS)
y archiva las imágenes con nombre `HH-MM-SS_PLATE_YYYY-MM-DD[_tag].jpg`.

El objetivo del frontend es **monitoreo**, no operación de cobro.
