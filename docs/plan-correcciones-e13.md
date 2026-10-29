# Plan de revisión — E13, Auditorio de uso múltiple

## Alcance y reglas
- Rama de trabajo: `datos/correcciones-e13`, creada desde `main`.
- Este commit registra solamente el plan; no modifica el código ni los datos de la aplicación.
- Mantener la versión v1.1 y preservar las correcciones existentes: `CatalogInput` en `DataTable.tsx` y área editable en `FichaForm.tsx`.
- No cambiar diseño, colores, logotipo, estructura general, autoguardado, respaldo JSON, exportación CSV o impresión/PDF salvo mostrar los avisos exigidos.
- Las cantidades deben tener dos decimales y conservarse las agrupaciones existentes de catálogos.
- Todo valor no confirmable con medidas/fotos se marcará «por verificar»; las validaciones nuevas advertirán sin borrar datos.

## Registro de cambios propuestos por ambiente

### BOD-001
- Pintura en paredes: cuantificación 45.50 → 52.40 m²; cálculo: 46.77 + 5.63 = 52.40 m².
- Diagnóstico/estado: encabezado Regular y texto «malo» → un solo estado coherente; por confirmar al revisar la ficha y evidencias, no decidir por suposición.
- Foto 2 «Sin descripción» → pendiente de descripción, sin inventar texto.

### BOD-002
- Pintura en paredes: elemento 46.77 → 75.00 m²; cálculo: 25.00 × 3.00 = 75.00 m².
- Marcar elemento «por verificar» porque 46.77 m² podría ser un valor copiado.
- Recalcular patología y cuantificación (cuantificación actual indicada: 44.77 m²) desde el elemento corregido; revisar si se trata de superficie total o superficie afectada antes de asignar el mismo total a patología/cuantificación.

### BOD-003
- Pintura en paredes: patología y cuantificación 64.71 → 70.29 m²; cálculo: 45.99 + 24.30 = 70.29 m².

### BOD-004
- Fotos 2, 3 y 4 «Sin descripción» → pendiente de descripción; no inventar descripciones.

### BOD-005
- Foto 6 «Sin descripción» → pendiente de descripción; no inventar descripción.

### ARC-002
- Eliminar la línea «Estados registrados antes de la consolidación».
- Unificar estado del encabezado y del diagnóstico; estado actual indicado: encabezado Malo, texto Regular. Valor final por confirmar con evidencia técnica; si no es determinable, mostrar «por verificar».

### CAM-001
- Revisar dimensión 14.00 × 1.50 frente al 14.00 × 1.38 atribuido a CAM-004. No reemplazar sin verificar cuál corresponde al ambiente.

### CAM-002
- Pintura en paredes: elemento 21.00 → 19.32 m²; cálculo: 14.00 × 1.38 = 19.32 m².
- Cerámica: patología 57.24 m² (piso) y 80.46 m² (pared) → igualar con elementos 57.27 m² (piso) y 80.36 m² (pared), sujeto a verificar origen/medidas.
- Marcar «por verificar» por posible duplicación con CAM-003 (medidas y cantidades idénticas).

### CAM-003
- Pintura en paredes: elemento 21.00 → 19.32 m²; cálculo: 14.00 × 1.38 = 19.32 m². Total solicitado para CAM-002 + CAM-003: 61.33 + 19.32 = 80.65 m²; sustituir cuantificación actual 82.33 → 80.65 m² solo después de comprobar que 61.33 corresponde al subtotal restante.
- Cerámica: patología 57.24 m² (piso) y 80.46 m² (pared) → igualar con elementos 57.27 m² (piso) y 80.36 m² (pared), sujeto a verificar origen/medidas.
- Estado indicado: encabezado Malo y texto Regular → unificar tras revisión técnica; si no se determina con evidencia, «por verificar».
- Descripción dice que las cabinas de ducha no tienen puertas mientras la cuantificación propone mantenimiento de 6 puertas → marcar «por verificar».
- Marcar «por verificar» por posible duplicación con CAM-002.

### CAM-004
- Dimensión «0.85x1.6 m2» → «0.85 x 1.60 m» (unidad lineal de dimensión, no m²).
- Sin patología, cuantificación ni fotos; «Sin observaciones» y estado Malo → marcar ficha como incompleta y el diagnóstico «por verificar».
- Contrastar 14.00 × 1.50 con 14.00 × 1.38 de CAM-001; no deducir cuál cifra es correcta.

### SAU-001
- Cerámica en piso: patología y cuantificación 20.70 → 20.07 m²; cálculo: 13.77 + 6.30 = 20.07 m².

### GYM-001
- Piso: cuantificación actual indicada 187.92 → 188.73 m²; cálculo: 11.65 × 16.20 = 188.73 m².
- Pintura en paredes: cuantificación actual indicada 205.00 → 204.61 m²; cálculo: 55.60 × 3.68 = 204.608 → 204.61 m².
- Recalcular patología y cuantificación de ambos elementos a partir de las medidas; marcar «por verificar» por coincidir las dimensiones con ARC-001 y porque el propio informe solicita completar el levantamiento.
- Unificar estado Malo con texto que describe el gimnasio como funcional; revisar además «Reposición total». No imponer estado ni intervención sin inspección/evidencia; «por verificar» cuando no se determine.

### SAN-H-001
- Lámpara/luminaria: patología 4 u frente a cuantificación 5 u → «por verificar», sin elegir una cifra.
- Urinario colectivo: unidad «ml» → «u» para la pieza; confirmar si debe cuantificarse. Al no constar patología/cuantificación, marcar «por verificar» si corresponde una actividad.

### SAN-M-001
- Observaciones copiadas de SAN-H-001 («sanitario de hombres») → retirar el texto ajeno y redactar solo a partir de datos propios disponibles; si estos no alcanzan, marcar «por verificar».

## Totales y consistencia del informe
- Área total del proyecto: 818.38 → 818.37 m², sujeto a recalcular la suma de áreas corregidas por ambiente.
- Sección 8: recalcular cada total como suma de cuantificaciones por ambiente, con trazabilidad de elemento/patología/ambiente y cálculo visible. El total de pintura en paredes indicado actualmente como 1,070.60 m² no se declarará corregido hasta agregar todos los ambientes y verificar duplicados/valores pendientes.
- En el reporte, un solo Estado (Bueno, Regular, Malo; si aplica el catálogo existente Crítico, mantenerlo sin introducir categorías nuevas) debe alimentar encabezado, diagnóstico y resumen; recalcular el conteo general con ese campo único.
- Eliminar la línea histórica «Estados registrados antes de la consolidación» en ARC-002.
- Firma de informe: «Arq. Gabriel Saritama Veira, Mgs».

## Correcciones de redacción y terminología
- Tildes: «Ceramica» → «Cerámica»; «Area» → «Área»; «Iluminacion» → «Iluminación»; «instalacion» → «instalación»; «humeda» → «húmeda»; «multiple» → «múltiple»; «imagenes» → «imágenes».
- Correcciones: «Recticulador» → «Reticulado» (confirmar término técnico en contexto); «griferías en la estado» → «griferías en mal estado»; «que esten en buen estado» → «que estén en buen estado»; «continuo» → «colectivo» al referirse al urinario; «0.7.0x0.60» → «0.70 x 0.60»; «8.30x.0.60» → «8.30 x 0.60»; «1.6 m2» → «1.60 m».
- «Mantenimiento preventivo de puerta por mantenimiento (puntual)» → «Mantenimiento preventivo de puerta (puntual)».
- Unificar etiquetas de catálogo: Estado (Bueno, Regular, Malo) y Severidad (Leve, Moderada, Severa, Crítica), preservando categorías ya existentes donde corresponda. No reescribir el significado de un registro sin respaldo.

## Lista de confirmaciones requeridas antes de implementar
1. Confirmar mediante fotos/levantamiento el estado único de ARC-002, BOD-001, CAM-003 y GYM-001; en GYM-001 confirmar la pertinencia de «Reposición total».
2. Verificar BOD-002 (25.00 × 3.00) y aclarar si la patología debe medir área total o solo área afectada.
3. Confirmar si CAM-002 y CAM-003 son ambientes distintos o registros duplicados; verificar cabinas de ducha y existencia/cantidad de puertas.
4. Confirmar la dimensión correcta de CAM-001/CAM-004 (1.50 frente a 1.38).
5. Confirmar cantidad real de luminarias de SAN-H-001 y si debe cuantificarse el urinario colectivo de SAN-H-001.
6. Completar el levantamiento y comprobar las dimensiones de GYM-001 frente a ARC-001.
7. Aportar descripciones verificables para fotos pendientes de BOD-001, BOD-004 y BOD-005.
8. Confirmar el término técnico «Reticulado» en su contexto.

## Plan de implementación tras aprobación
- Commit A: correcciones de cálculo, trazabilidad y totales.
- Commit B: estado único por ambiente y resumen.
- Commit C: datos copiados/incompletos y validaciones de advertencia.
- Commit D: ortografía, terminología, firma y presentación textual.
- Ejecutar build/verificaciones disponibles; abrir PR para revisión. No hacer merge ni tocar Google AI Studio hasta que el usuario apruebe y luego autorice/complete el flujo posterior al merge.
