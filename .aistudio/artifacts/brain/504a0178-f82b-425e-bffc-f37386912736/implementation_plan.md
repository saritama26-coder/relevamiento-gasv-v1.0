# Plan de Implementación Ajustado: Relevamiento Arquitectónico GASV

Este plan ha sido ajustado según las instrucciones recibidas: comienza por la corrección y verificación del desplegable de ubicación, establece validaciones informativas (avisos no destructivos que no alteran los datos existentes), detalla con exactitud el archivo y componente de cada cambio, y preserva sin modificaciones el diseño visual, el autoguardado, el respaldo JSON, la exportación CSV y la impresión/PDF.

---

## Diagnóstico Técnico del Desplegable de Ubicación
**Causa exacta del error:**
En los desplegables de catálogo personalizados, el evento global de pérdida de foco (`onBlur` del input / listener global `mousedown` de cierre) se desencadenaba antes de que el evento `onClick` del botón de la opción llegara a completarse en el ciclo de eventos del navegador. Esto provocaba que el menú se desmontara del DOM justo antes de ejecutar la función de selección, perdiendo el valor.
**Solución aplicada y verificada:**
Capturar la selección en el evento `onMouseDown` con `preventDefault()` y `stopPropagation()`, lo que garantiza que la asignación del valor a la fila y el cierre del menú ocurran de forma sincrónica antes de cualquier evento de desenfoque.

---

## Paso Previo Obligatorio: Corrección y Verificación del Desplegable de Ubicación
* **Archivo afectado:** `src/components/DataTable.tsx`
* **Componente afectado:** `CatalogInput` (función interna de renderizado de celdas desplegables con datalist)
* **Acción técnica:**
  * Asegurar que las opciones del menú emergente manejen `onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectOption(option); }}`.
  * Mantener el soporte de teclado con tecla <kbd>Enter</kbd> para seleccionar inmediatamente la primera coincidencia del filtro.
  * Asignar directamente el valor seleccionado a la fila mediante `onChange(option)` y cerrar el menú emergente.

---

## Hoja de Ruta de Cambios por Prioridad

### PRIORIDAD 1 — Calcular en vez de escribir
* **Cálculo de Área por Elemento:**
  * Derivar el área en base a `largo × ancho` cuando ambas dimensiones estén presentes en elementos constructivos.
  * Si el usuario modifica el valor manualmente, el sistema mantiene el dato ingresado por el usuario sin sobreescribirlo y permite registrar una nota/motivo de ajuste opcional.
  * *Archivo afectado:* `src/utils/helpers.ts` (función `calculateItemArea`)
  * *Componente afectado:* `src/components/FichaForm.tsx` (Sección 3: `DataTable` de elementos constructivos)
* **Sumatoria Informativa de Pintura y Cerámica:**
  * Calcular automáticamente los totales de m² de cerámica y pintura a partir de los elementos del ambiente para sugerir los valores en la Sección 8 sin bloquear la edición manual.
  * *Archivo afectado:* `src/utils/helpers.ts` (función `aggregateFinishesTotals`)
  * *Componente afectado:* `src/components/FichaForm.tsx` (Sección 8: asistente y tabla de cuantificación preliminar)
* **Derivación de Cantidad en Cuantificación:**
  * Al pasar patologías o elementos a la Sección 8, inicializar la cantidad con el valor del elemento/patología de origen.
  * *Archivo afectado:* `src/components/FichaForm.tsx` (función `handlePasarSeccion8` y asistente de cuantificación)

---

### PRIORIDAD 2 — Un solo origen para el estado del ambiente
* **Cálculo Referencial por Peor Severidad:**
  * Sugerir el estado del ambiente en función de la peor severidad registrada en patologías (`Crítica` → Crítico, `Severa`/`Moderada` → Malo/Regular, `Leve` → Regular, Sin patologías → Bueno).
  * Si el estado del encabezado y el del diagnóstico presentan discrepancias, mostrar un aviso informativo en pantalla recomendando sincronizarlos, sin bloquear el flujo ni borrar datos históricos.
  * *Archivo afectado:* `src/constants/catalogos.ts` (función auxiliar `severityToState`)
  * *Componente afectado:* `src/components/FichaForm.tsx` (Sección 2: Levantamiento dimensional y Sección 10: Observaciones/Diagnóstico)
  * *Componente afectado:* `src/App.tsx` (sincronización referencial en `activeFicha`)

---

### PRIORIDAD 3 — Validaciones informativas al guardar
* **Comportamiento no destructivo (solo advertencias/avisos):**
  * Las validaciones **no modifican datos existentes** ni impiden al usuario conservar información previa; presentan avisos claros cuando:
    1. Una patología registrada tiene cantidad en `0` o vacía.
    2. Se intenta generar actividad de puertas de cabinas cuando el ambiente consigna que no tiene puertas.
    3. El ambiente registra patologías pero el texto dice "Sin observaciones".
    4. Elementos de pisos/paredes usan unidades distintas a `m²`, o piezas usan unidades distintas a `u`.
    5. Formato dimensional no estándar (sugerencia de formato `X.XX x Y.YY m`).
  * *Archivo afectado:* `src/utils/helpers.ts` (función `getFichaValidationWarnings`)
  * *Componente afectado:* `src/components/FichaForm.tsx` (panel de alertas informativas antes de finalizar ambiente)

---

### PRIORIDAD 4 — Control preventivo de duplicados
* **Confirmación Asistida al Duplicar:**
  * En el diálogo de duplicar ambiente, presentar claramente el código y nombre propuestos junto con un recordatorio para verificar dimensiones antes de confirmar.
* **Aviso Informativo de Dimensiones Idénticas:**
  * Si un ambiente nuevo comparte exactamente las mismas medidas con otro ya registrado en el mismo bloque, mostrar un aviso preventivo: *"Aviso: existen otros ambientes en este bloque con dimensiones idénticas. Confirme si corresponde a un ambiente tipo/espejo."*
  * *Archivo afectado:* `src/App.tsx` (funciones `handleConfirmDuplicate` y `handleManualSave`)

---

### PRIORIDAD 5 — Lista de verificación antes de exportar
* **Checklist Informativo Pre-Exportación:**
  * Al abrir el modal de exportación (PDF / CSV), mostrar una lista de chequeo informativa indicando:
    * Coincidencia de sumatoria de Sección 8 con los ambientes.
    * Estado de conservación y diagnóstico sincronizados.
    * Conteo de fotografías con y sin descripción técnica.
  * **Preservación total de exportación:** No se modifica el diseño ni la estructura de los PDF o CSV existentes. La exportación continúa funcionando de forma habitual.
  * *Archivo afectado:* `src/components/ExportPdfModal.tsx` (componente modal de exportación)
  * *Archivo afectado:* `src/components/ConsolidatedReport.tsx` (reporte consolidado)

---

### PRIORIDAD 6 — Catálogos cerrados con texto predictivo y cantidad predeterminada
* **Normalización sin pérdida:**
  * Reconocimiento insensible a mayúsculas y acentos (`Ceramica` = `Cerámica`) en búsquedas y sugerencias.
* **Cantidad 1.00 por Defecto en Unidades:**
  * Al seleccionar o crear elementos medidos en `u` (unidades) o `pza`, inicializar la cantidad automáticamente en `1.00` con dos decimales.
  * *Archivo afectado:* `src/constants/catalogos.ts` (`ELEMENTO_DEFAULTS_MAP`, `getElementoDefaults`)
  * *Componente afectado:* `src/components/DataTable.tsx` (`CatalogInput` y `handleAddRow`)
  * *Componente afectado:* `src/components/FichaForm.tsx` (`handlePatTableChange`, `handleGenericElemTableChange`)

---

## Matriz de Componentes y Archivos Afectados

| Archivo | Componente / Función | Rol en la Implementación |
| :--- | :--- | :--- |
| `src/components/DataTable.tsx` | `CatalogInput`, `DataTable` | Corrección del desplegable en mousedown, selección con Enter, cantidad 1.00 inicial. |
| `src/constants/catalogos.ts` | `ELEMENTO_DEFAULTS_MAP`, `suggestIntervencion` | Catálogo cerrado, reglas de equivalencia ortográfica y sugerencias de intervención. |
| `src/components/FichaForm.tsx` | `FichaForm`, `handlePatTableChange` | Autocompletado de unidad/severidad/acción, avisos informativos de validación. |
| `src/utils/helpers.ts` | `calculateArea`, `getFichaValidationWarnings` | Cálculo derivado de dimensiones y motor de avisos no destructivos. |
| `src/App.tsx` | `processActiveFichaStateUpdate`, modal duplicar | Gestión de estado unificado de severidad y detección informativa de duplicados. |
| `src/components/ExportPdfModal.tsx`| `ExportPdfModal` | Lista de verificación informativa previa a la exportación estándar. |

---

## Verificación
1. Probar la selección con ratón de todas las opciones del desplegable de ubicación y confirmar que la lista se cierra guardando el valor.
2. Confirmar que los ambientes existentes mantienen sus datos íntegros y que las validaciones actúan como alertas informativas.
3. Verificar que los formatos de exportación CSV, respaldo JSON, autoguardado en LocalStorage e impresión PDF no sufren alteraciones.
