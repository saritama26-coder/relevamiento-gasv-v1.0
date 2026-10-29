import { Ficha, ProjectData, CatalogosMap } from '../types';
import { ASISTENTE_DEFAULTS } from '../constants/catalogos';

export function createEmptyFicha(): Ficha {
  return {
    id: 'F' + Date.now(),
    proyecto: '',
    ubicacion: '',
    bloque: '',
    nivel: '',
    ambiente: '',
    codigo: '',
    fecha: new Date().toISOString().split('T')[0],
    responsable: 'Arq. Gabriel Saritama Veira',
    geometria: 'regular',
    largo: '',
    ancho: '',
    altura: '',
    areaDirecta: '',
    estadoDimensional: 'Bueno',
    obsdim: '',
    cons: [],
    equip: [],
    elec: [],
    hidro: [],
    pat: [],
    cuan: [],
    fotos: [],
    diagestado: 'Bueno',
    interv: 'Mantenimiento preventivo',
    diag: '',
    obs: '',
    fir1: 'Arq. Gabriel Saritama Veira',
    fir2: '',
    fir3: '',
    fir4: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Consolida una sola vez los campos de observación de versiones anteriores.
 * El texto original se conserva en "obs" con etiquetas de procedencia; los
 * campos legacy quedan vacíos para que futuras lecturas no dupliquen el texto.
 */
export function migrateLegacyObservations(ficha: Ficha): Ficha {
  const dimensionalText = String(ficha.obsdim || '').trim();
  const diagnosticText = String(ficha.diag || '').trim();
  const generalText = String(ficha.obs || '').trim();
  const dimensionalState = String(ficha.estadoDimensional || '').trim();
  const diagnosticState = String(ficha.diagestado || '').trim();

  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  const hasLegacyText = Boolean(dimensionalText || diagnosticText);
  const statusesDiffer = Boolean(
    dimensionalState &&
    diagnosticState &&
    normalize(dimensionalState) !== normalize(diagnosticState)
  );
  const stateNeedsSync = dimensionalState !== diagnosticState;

  if (!hasLegacyText && !stateNeedsSync) return ficha;

  const blocks: string[] = [];
  const seen = new Set<string>();
  const addBlock = (label: string, value: string) => {
    const text = String(value || '').trim();
    if (!text) return;
    const key = normalize(text);
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push(`${label}:\n${text}`);
  };

  // If two old status fields conflict, preserve both values in the migrated
  // notes and use the more conservative state for the single visible control.
  if (statusesDiffer) {
    addBlock(
      'ESTADOS REGISTRADOS ANTES DE LA CONSOLIDACIÓN',
      `Estado del levantamiento dimensional: ${dimensionalState}.\nEstado del diagnóstico preliminar: ${diagnosticState}.`
    );
  }

  if (hasLegacyText) {
    addBlock('LEVANTAMIENTO DIMENSIONAL', dimensionalText);
    addBlock('DIAGNÓSTICO / CRITERIO TÉCNICO', diagnosticText);
    addBlock('OBSERVACIONES GENERALES', generalText);
  } else if (generalText && statusesDiffer) {
    // Re-label the existing general note only when it is being combined with
    // a status-history note; otherwise leave an already unified note untouched.
    addBlock('OBSERVACIONES GENERALES', generalText);
  }

  const severity: Record<string, number> = {
    'Bueno': 1,
    'Regular': 2,
    'Malo': 3,
    'Crítico': 4,
    'Critico': 4,
  };
  const states = [dimensionalState, diagnosticState].filter(Boolean);
  const rankedStates = states.filter((state) => severity[state] !== undefined);
  const canonicalState = rankedStates.length
    ? rankedStates.sort((a, b) => severity[b] - severity[a])[0]
    : diagnosticState || dimensionalState || 'Bueno';

  const shouldCombineGeneralText = hasLegacyText || statusesDiffer;
  return {
    ...ficha,
    ...(shouldCombineGeneralText ? { obs: blocks.join('\n\n') } : {}),
    obsdim: '',
    diag: '',
    estadoDimensional: canonicalState,
    diagestado: canonicalState,
  };
}

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1400;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX) {
            h *= MAX / w;
            w = MAX;
          }
        } else {
          if (h > MAX) {
            w *= MAX / h;
            h = MAX;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function sanitizeFilename(name: string): string {
  return String(name || 'Proyecto')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

export function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-') +
    '_' +
    [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('-');
}

export function exportCSV(fichas: Ficha[], projectData: ProjectData, porVerificar?: boolean): void {
  const rows: (string | number)[][] = [];

  if (porVerificar) {
    rows.push(['# ESTADO DE REVISIÓN:', 'POR VERIFICAR (Existen observaciones técnicas en la lista de verificación previa)']);
    rows.push(['# FECHA REVISIÓN:', new Date().toLocaleDateString('es-EC')]);
    rows.push([]);
  }

  rows.push([
    'Proyecto', 'Ubicación', 'Bloque', 'Nivel', 'Ambiente', 'Código', 'Elemento', 'Actividad', 'Cantidad', 'Unidad', 'Estado', 'Prioridad'
  ]);

  fichas.forEach((ficha) => {
    ficha.cuan.forEach((item) => {
      if (item.elemento || item.actividad) {
        rows.push([
          projectData.proyecto || ficha.proyecto,
          projectData.ubicacion || ficha.ubicacion,
          ficha.bloque || '',
          ficha.nivel || '',
          ficha.ambiente || '',
          ficha.codigo || '',
          item.elemento || '',
          item.actividad || '',
          item.cantidad || '',
          item.unidad || '',
          item.estado || '',
          item.prioridad || ''
        ]);
      }
    });
  });

  const csvContent = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = porVerificar ? 'cuantificacion_proyecto_POR_VERIFICAR.csv' : 'cuantificacion_proyecto.csv';
  a.click();
}

export function exportProjectBackup(fichas: Ficha[], projectData: ProjectData, catalogos: CatalogosMap): void {
  const blockName = sanitizeFilename(projectData.bloque || projectData.proyecto || 'Proyecto_relevamiento');
  const payload = {
    version: 4,
    aplicacion: 'Relevamiento Arquitectónico GASV',
    exportado: new Date().toISOString(),
    proyecto: projectData,
    fichas: fichas.map(migrateLegacyObservations),
    catalogosPersonalizados: catalogos,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${blockName}_${formatTimestamp()}.json`;
  a.click();
}

export function parseProjectBackup(file: File): Promise<{
  fichas: Ficha[];
  proyecto?: ProjectData;
  catalogosPersonalizados?: CatalogosMap;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (!json || typeof json !== 'object') {
          throw new Error('Estructura no reconocida.');
        }

        // Check if legacy format
        if (isLegacyV1(json)) {
          const converted = convertLegacyV1(json);
          resolve({
            ...converted,
            fichas: converted.fichas.map((ficha: Ficha) => migrateLegacyObservations(ficha)),
          });
          return;
        }

        if (!Array.isArray(json.fichas)) {
          throw new Error('El archivo no contiene el arreglo de fichas.');
        }

        resolve({
          ...json,
          fichas: json.fichas.map((rawFicha: Partial<Ficha>) =>
            migrateLegacyObservations({
              ...createEmptyFicha(),
              ...rawFicha,
            } as Ficha)
          ),
        });
      } catch (err: any) {
        reject(new Error('Archivo de respaldo inválido: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}

const LEGACY_COLS: Record<string, string[]> = {
  cons: ['elemento', 'descripcion', 'dimension', 'cantidad', 'unidad', 'estado', 'observacion'],
  equip: ['elemento', 'descripcion', 'cantidad', 'unidad', 'estado', 'observacion'],
  elec: ['elemento', 'cantidad', 'unidad', 'estado', 'observacion'],
  hidro: ['elemento', 'cantidad', 'unidad', 'estado', 'observacion'],
  pat: ['elemento', 'patologia', 'ubicacion', 'cantidad', 'unidad', 'severidad', 'intervencion'],
  cuan: ['codigo', 'elemento', 'actividad', 'cantidad', 'unidad', 'estado', 'prioridad'],
};

function convertLegacyRows(raw: any, key: string) {
  const cols = LEGACY_COLS[key];
  return (Array.isArray(raw) ? raw : []).map((row: any) => {
    const obj: any = { id: Math.random().toString() };
    cols.forEach((col, idx) => {
      obj[col] = row?.[idx] ?? '';
    });
    return obj;
  });
}

function isLegacyV1(json: any): boolean {
  return !!json && typeof json === 'object' && !Array.isArray(json.fichas) && typeof json.fichas === 'object' &&
    Object.values(json.fichas).some((item: any) => item && item.data && item.data.f);
}

function convertLegacyV1(json: any) {
  const fichas = Object.values(json.fichas || {}).map((item: any, idx: number) => {
    const f = item?.data?.f || {};
    const t = item?.data?.t || {};
    const p = item?.data?.p || [];
    const base = createEmptyFicha();
    return {
      ...base,
      id: item?.id || 'V1' + Date.now() + '_' + idx,
      proyecto: f.proyecto || '',
      ubicacion: f.ubicacion || '',
      bloque: f.bloque || '',
      nivel: f.nivel || '',
      ambiente: f.ambiente || '',
      codigo: f.codigo || '',
      fecha: f.fecha || base.fecha,
      responsable: f.responsable || '',
      geometria: (f.geometria === 'irregular' ? 'irregular' : 'regular') as 'regular' | 'irregular',
      largo: f.largo || '',
      ancho: f.ancho || '',
      altura: f.altura || '',
      areaDirecta: f.areaDirecta || f.area || '',
      estadoDimensional: f.estado || 'Bueno',
      obsdim: f.obsdim || '',
      cons: convertLegacyRows(t.cons, 'cons'),
      equip: convertLegacyRows(t.equip, 'equip'),
      elec: convertLegacyRows(t.elec, 'elec'),
      hidro: convertLegacyRows(t.hidro, 'hidro'),
      pat: convertLegacyRows(t.pat, 'pat'),
      cuan: convertLegacyRows(t.cuan, 'cuan'),
      fotos: p.map((photo: any) => ({
        id: Math.random().toString(),
        src: photo?.src || '',
        desc: photo?.desc || '',
      })),
      diagestado: f.diagestado || 'Bueno',
      interv: f.interv || 'Mantenimiento preventivo',
      diag: f.diag || '',
      obs: f.obs || '',
      fir1: f.fir1 || '',
      fir2: f.fir2 || '',
      fir3: f.fir3 || '',
      fir4: f.fir4 || '',
      updatedAt: item?.meta?.actualizada || new Date().toISOString(),
    };
  });

  const catalogos: CatalogosMap = {};
  if (Array.isArray(json.elementosConstructivosPersonalizados)) {
    const list = json.elementosConstructivosPersonalizados.filter((x: any) => typeof x === 'string' && x.trim());
    if (list.length) {
      catalogos['list-cons-elem'] = list.map((x: string) => x.trim());
    }
  }

  return {
    proyecto: json.proyecto ? {
      proyecto: json.proyecto.proyecto || '',
      ubicacion: json.proyecto.ubicacion || '',
      bloque: json.proyecto.bloque || '',
    } : undefined,
    fichas,
    catalogosPersonalizados: catalogos,
  };
}

export function calculateArea(ficha: Ficha): number {
  if (ficha.geometria === 'irregular') {
    const val = parseFloat(ficha.areaDirecta || '0');
    return isNaN(val) ? 0 : val;
  }
  const largo = parseFloat(ficha.largo || '0');
  const ancho = parseFloat(ficha.ancho || '0');
  const mult = largo * ancho;
  return isNaN(mult) ? 0 : mult;
}

export function calculatePerimeter(ficha: Ficha): number {
  if (ficha.geometria === 'irregular') return 0;
  const largo = parseFloat(ficha.largo || '0');
  const ancho = parseFloat(ficha.ancho || '0');
  const per = 2 * (largo + ancho);
  return isNaN(per) ? 0 : per;
}

export function priorityFromState(estado: string): string {
  if (estado === 'Crítico' || estado === 'Malo') return 'Alta';
  if (estado === 'Regular') return 'Media';
  return 'Baja';
}

export function lookupReference(ficha: Ficha, elemento: string): { cantidad: string; unidad: string; origen: string } | null {
  const norm = String(elemento || '').trim().toLowerCase();
  if (!norm) return null;

  const area = calculateArea(ficha);
  const alt = parseFloat(ficha.altura || '0') || 0;
  const perim = calculatePerimeter(ficha);

  if (norm === 'piso' && area > 0) {
    return { cantidad: area.toFixed(2), unidad: 'm²', origen: 'Sección 2 · área del ambiente' };
  }
  if ((norm === 'paredes' || norm === 'pared') && perim > 0 && alt > 0) {
    return { cantidad: (perim * alt).toFixed(2), unidad: 'm²', origen: 'Secciones 2 · perímetro × altura' };
  }
  if ((norm === 'cielo raso' || norm === 'cieloraso') && area > 0) {
    return { cantidad: area.toFixed(2), unidad: 'm²', origen: 'Sección 2 · área del ambiente' };
  }

  const sections: [keyof Ficha, string, number][] = [
    ['cons', 'constructivo', 3],
    ['equip', 'equipamiento', 4],
    ['elec', 'eléctrico', 5],
    ['hidro', 'hidrosanitario', 6],
  ];

  for (const [key, label, secNum] of sections) {
    const list = (ficha[key] as any[]) || [];
    for (const item of list) {
      const itemElem = String(item.elemento || '').trim().toLowerCase();
      if (itemElem === norm || itemElem.includes(norm) || (norm.includes(itemElem) && itemElem.length > 3)) {
        const qty = String(item.cantidad ?? '').trim();
        const un = String(item.unidad ?? '').trim();
        if (qty) {
          return {
            cantidad: qty,
            unidad: un || (key !== 'cons' ? 'u' : ''),
            origen: `Sección ${secNum} · ${label}`,
          };
        }
      }
    }
  }

  return null;
}

export function nextConsecutive(val: string): string {
  const s = String(val || '').trim();
  if (!s) return '';
  const match = s.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return s;
  const num = match[2];
  const nextNum = String(parseInt(num, 10) + 1).padStart(num.length, '0');
  return match[1] + nextNum + match[3];
}

/**
 * Parsea una cadena de dimensión (ej. "3.50 x 4.20 m" o "3.50*4.20") y extrae largo, ancho y área.
 */
export function parseDimensions(dimStr: string): { largo: number; ancho: number; area: number } | null {
  const s = String(dimStr || '').trim();
  if (!s) return null;
  // Limpiar sufijos como 'm', 'mts', etc.
  const cleaned = s.replace(/\s*(m|ml|mts|metros)\b/gi, '').trim();
  const match = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([xX*×])\s*([0-9]+(?:[.,][0-9]+)?)$/);
  if (!match) return null;

  const largo = parseFloat(match[1].replace(',', '.'));
  const ancho = parseFloat(match[3].replace(',', '.'));
  if (isNaN(largo) || isNaN(ancho) || largo <= 0 || ancho <= 0) return null;

  return {
    largo,
    ancho,
    area: parseFloat((largo * ancho).toFixed(2)),
  };
}

/**
 * Valida si el formato de una cadena de dimensión es técnicamente admisible.
 * Detecta errores como dobles puntos ("0.7.0", "8.30x.0.60") o uso erróneo de "m2".
 */
export function isValidDimensionFormat(dimStr: string): { valid: boolean; reason?: string } {
  const s = String(dimStr || '').trim();
  if (!s) return { valid: true };

  if (/m\s*2|m²/i.test(s)) {
    return { valid: false, reason: 'Use unidad lineal "m", no "m2" ni "m²". Ejemplo: "2.50 x 3.00 m".' };
  }
  const match = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*[xX*×]\s*([0-9]+(?:\.[0-9]+)?)\s*m$/);
  if (!match) {
    return { valid: false, reason: 'Formato inválido. Use números con punto decimal y unidad m, por ejemplo "0.85 x 1.60 m".' };
  }
  const largo = Number(match[1]);
  const ancho = Number(match[2]);
  if (!Number.isFinite(largo) || !Number.isFinite(ancho) || largo <= 0 || ancho <= 0) {
    return { valid: false, reason: 'Las dimensiones deben ser números mayores que cero.' };
  }
  return { valid: true };
}

/**
 * Calcula los totales sumados de cerámica (m²) y pintura (m²) a partir de las secciones del ambiente.
 */
export function calculateFinishesTotals(ficha: Ficha): { ceramicaTotal: number; pinturaTotal: number } {
  const normalize = (v: string) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const sumRows = (rows: any[], family: 'ceramica' | 'pintura') =>
    (rows || []).reduce((sum, row) => {
      const text = normalize(`${row.elemento || ''} ${row.descripcion || ''} ${row.patologia || ''} ${row.actividad || ''}`);
      const unit = normalize(row.unidad || '');
      const isMatch = family === 'ceramica'
        ? /ceramica|porcelanato|azulejo/.test(text)
        : /pintura|esmalte|latex/.test(text);
      if (!isMatch || !(unit === 'm²' || unit === 'm2' || unit === '')) return sum;
      const qty = parseFloat(String(row.cantidad || '0').replace(',', '.'));
      return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
    }, 0);

  // Evita contar dos veces la misma superficie: se prioriza el inventario constructivo.
  // Las patologías solo sirven como fuente alternativa cuando no existe un elemento de ese acabado.
  const hasConsFamily = (family: 'ceramica' | 'pintura') =>
    (ficha.cons || []).some((row) => {
      const text = normalize(`${row.elemento || ''} ${row.descripcion || ''}`);
      return family === 'ceramica' ? /ceramica|porcelanato|azulejo/.test(text) : /pintura|esmalte|latex/.test(text);
    });
  const consCeramica = sumRows(ficha.cons || [], 'ceramica');
  const patCeramica = sumRows(ficha.pat || [], 'ceramica');
  const consPintura = sumRows(ficha.cons || [], 'pintura');
  const patPintura = sumRows(ficha.pat || [], 'pintura');
  return {
    ceramicaTotal: parseFloat(((hasConsFamily('ceramica') ? consCeramica : patCeramica)).toFixed(2)),
    pinturaTotal: parseFloat(((hasConsFamily('pintura') ? consPintura : patPintura)).toFixed(2)),
  };
}

/**
 * Deriva el estado recomendado del ambiente a partir de la peor severidad de patologías.
 * Crítica > Severa > Moderada > Leve. Sin patologías = Bueno.
 */
export function getWorstSeverityState(patList: any[]): { estado: string; severidadMax: string } {
  if (!Array.isArray(patList) || patList.length === 0) {
    return { estado: 'Bueno', severidadMax: 'Ninguna' };
  }

  let hasCritica = false;
  let hasSevera = false;
  let hasModerada = false;
  let hasLeve = false;

  for (const row of patList) {
    const sev = (row.severidad || '').trim().toLowerCase();
    if (sev === 'crítica' || sev === 'critica') hasCritica = true;
    else if (sev === 'severa') hasSevera = true;
    else if (sev === 'moderada') hasModerada = true;
    else if (sev === 'leve') hasLeve = true;
  }

  if (hasCritica) return { estado: 'Crítico', severidadMax: 'Crítica' };
  if (hasSevera) return { estado: 'Malo', severidadMax: 'Severa' };
  if (hasModerada) return { estado: 'Regular', severidadMax: 'Moderada' };
  if (hasLeve) return { estado: 'Regular', severidadMax: 'Leve' };

  return { estado: 'Bueno', severidadMax: 'Ninguna' };
}

/**
 * Genera una lista de advertencias informativas de integridad y coherencia técnica para el ambiente.
 * No modifica los datos; solo avisa al usuario para su revisión.
 */
export function getFichaValidationWarnings(ficha: Ficha): string[] {
  const warnings: string[] = [];
  const normalize = (v: string) => (v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Patologías con cantidad 0 o vacía
  (ficha.pat || []).forEach((p, idx) => {
    if (p.elemento || p.patologia) {
      const q = parseFloat(String(p.cantidad || '').replace(',', '.'));
      if (isNaN(q) || q <= 0) {
        warnings.push(`Fila #${idx + 1} de patologías (${p.elemento || 'Elemento'}): la cantidad afectada no puede ser 0 o estar vacía.`);
      }
    }
  });

  // 2. Control de cabinas sin puertas vs mantenimiento de puertas de cabina
  const cabinasSinPuertas = (ficha.cons || []).some((c) => {
    const text = normalize(`${c.elemento} ${c.descripcion} ${c.observacion}`);
    return text.includes('cabina') && (text.includes('sin puerta') || text.includes('no tiene puerta') || text.includes('no hay puerta'));
  });

  if (cabinasSinPuertas) {
    const tieneActividadPuertas = [...(ficha.cuan || []), ...(ficha.pat || [])].some((item) => {
      const text = normalize(`${(item as any).elemento || ''} ${(item as any).actividad || ''} ${(item as any).patologia || ''}`);
      return text.includes('puerta') && text.includes('cabina');
    });
    if (tieneActividadPuertas) {
      warnings.push('El ambiente consigna cabinas "sin puertas", pero se registró una actividad de mantenimiento de puertas de cabinas.');
    }
  }

  // 3. Patologías registradas pero observación dice "Sin observaciones"
  if ((ficha.pat || []).length > 0) {
    const obsNorm = normalize(ficha.obs);
    if (obsNorm === 'sin observaciones' || obsNorm === 's/o' || obsNorm === 'ninguna' || obsNorm === 'sin novedad') {
      warnings.push('El ambiente registra patologías técnicas pero la observación general indica "Sin observaciones". Se sugiere describir los daños observados.');
    }
  }

  // 4. Unidades fijas por tipo de elemento
  const checkUnit = (elem: string, un: string, tabla: string, idx: number) => {
    const normElem = normalize(elem);
    const normUn = normalize(un);
    if (!normElem) return;

    // Pisos, paredes y cielo raso deben ser m²
    if (['piso', 'paredes', 'pared', 'cielo raso', 'cubierta', 'ceramica en piso', 'ceramica en pared', 'pintura en paredes'].some(k => normElem.includes(k))) {
      if (normUn !== 'm²' && normUn !== 'm2') {
        warnings.push(`${tabla} Fila #${idx + 1} (${elem}): elemento de superficie/acabado registrado con unidad "${un}". La unidad estándar es m².`);
      }
    }

    // Piezas discretas requieren unidad u.
    if (['puerta', 'inodoro', 'lavamanos', 'urinario', 'tomacorriente', 'interruptor', 'lampara', 'luminaria'].some(k => normElem.includes(k))) {
      if (normUn !== 'u') {
        warnings.push(`${tabla} Fila #${idx + 1} (${elem}): pieza discreta registrada con unidad "${un}". La unidad requerida es u.`);
      }
    }

    // Bloquear 'ml' en elementos que no sean lineales
    if (normUn === 'ml' && !['zocalo', 'zócalo', 'tuberia', 'tubería', 'baranda', 'manguera'].some(k => normElem.includes(k))) {
      warnings.push(`${tabla} Fila #${idx + 1} (${elem}): la unidad "ml" solo corresponde a elementos lineales (zócalos, tuberías, barandas).`);
    }
  };

  (ficha.cons || []).forEach((c, idx) => checkUnit(c.elemento, c.unidad, 'Constructivos', idx));
  (ficha.equip || []).forEach((e, idx) => checkUnit(e.elemento, e.unidad, 'Equipamiento', idx));
  (ficha.elec || []).forEach((el, idx) => checkUnit(el.elemento, el.unidad, 'Eléctricas', idx));
  (ficha.hidro || []).forEach((h, idx) => checkUnit(h.elemento, h.unidad, 'Hidrosanitarias', idx));
  (ficha.pat || []).forEach((p, idx) => checkUnit(p.elemento, p.unidad, 'Patologías', idx));

  // 5. Validar formato de dimensiones
  (ficha.cons || []).forEach((c, idx) => {
    if (c.dimension) {
      const dimCheck = isValidDimensionFormat(c.dimension);
      if (!dimCheck.valid) {
        warnings.push(`Constructivos Fila #${idx + 1} (${c.elemento || 'Elemento'}): ${dimCheck.reason}`);
      }
    }
  });

  // 6. Coherencia entre estado dimensional y diagnóstico
  const estDim = (ficha.estadoDimensional || '').trim();
  const diagEst = (ficha.diagestado || '').trim();
  if (estDim && diagEst && estDim !== diagEst) {
    warnings.push(`Discrepancia de estado: El estado dimensional (${estDim}) difiere del estado de diagnóstico (${diagEst}). Se recomienda unificarlos.`);
  }

  return warnings;
}

/**
 * Errores bloqueantes para el guardado de una ficha nueva o modificada.
 * Las advertencias históricas se mantienen separadas y no borran ni invalidan datos antiguos por sí solas.
 */
export function getFichaBlockingErrors(ficha: Ficha, previousFicha?: Ficha): string[] {
  const errors: string[] = [];
  const normalize = (v: string) => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

  (ficha.pat || []).forEach((p, idx) => {
    if (p.elemento || p.patologia) {
      const previous = previousFicha?.pat?.find((row) => row.id === p.id);
      const changed = !previousFicha || !previous ||
        previous.cantidad !== p.cantidad || previous.elemento !== p.elemento || previous.patologia !== p.patologia;
      const qty = Number(String(p.cantidad || '').replace(',', '.'));
      if (changed && (!Number.isFinite(qty) || qty <= 0)) {
        errors.push(`Patología fila #${idx + 1}: la cantidad debe ser mayor que cero.`);
      }
    }
  });

  const cabinasSinPuertas = (ficha.cons || []).some((row) => {
    const text = normalize(`${row.elemento} ${row.descripcion} ${row.observacion}`);
    return text.includes('cabina') && /(sin puertas?|no tiene puertas?|no hay puertas?)/.test(text);
  });
  const hasCabinDoorConflict = (candidate: Ficha) => {
    const noDoors = (candidate.cons || []).some((row) => {
      const text = normalize(`${row.elemento} ${row.descripcion} ${row.observacion}`);
      return text.includes('cabina') && /(sin puertas?|no tiene puertas?|no hay puertas?)/.test(text);
    });
    if (!noDoors) return false;
    return [...(candidate.cuan || []), ...(candidate.pat || [])].some((row: any) => {
      const text = normalize(`${row.elemento || ''} ${row.actividad || ''} ${row.patologia || ''} ${row.intervencion || ''}`);
      return text.includes('puerta') && text.includes('cabina') && /(mantenimiento|reparacion|reposicion|cambio)/.test(text);
    });
  };
  if (cabinasSinPuertas && hasCabinDoorConflict(ficha) && (!previousFicha || !hasCabinDoorConflict(previousFicha))) {
    errors.push('No puede registrarse mantenimiento/reparación de puertas de cabinas si el levantamiento indica que no existen puertas.');
  }

  const hasPathologyNoObservationConflict = (candidate: Ficha) =>
    (candidate.pat || []).length > 0 &&
    ['sin observaciones', 's/o', 'ninguna', 'sin novedad'].includes(normalize(candidate.obs));
  if (hasPathologyNoObservationConflict(ficha) && (!previousFicha || !hasPathologyNoObservationConflict(previousFicha))) {
    errors.push('El ambiente tiene patologías; reemplace «Sin observaciones» por una descripción técnica.');
  }

  const checkUnit = (elemento: string, unidad: string, label: string, changed: boolean) => {
    if (!changed) return;
    const elem = normalize(elemento);
    const unit = normalize(unidad).replace(/²/g, '2');
    if (!elem) return;
    const surfaces = ['piso', 'pared', 'cielo raso', 'cubierta', 'ceramica en piso', 'ceramica en pared', 'pintura en paredes', 'porcelanato', 'azulejo'];
    if (surfaces.some((term) => elem.includes(term)) && unit !== 'm2') {
      errors.push(`${label} «${elemento}»: la unidad de superficie debe ser m².`);
    }
    const pieces = ['puerta', 'inodoro', 'lavamanos', 'urinario', 'tomacorriente', 'interruptor', 'lampara', 'luminaria'];
    if (pieces.some((term) => elem.includes(term)) && unit !== 'u') {
      errors.push(`${label} «${elemento}»: la unidad de pieza debe ser u.`);
    }
    const linear = ['zocalo', 'tuberia', 'baranda', 'manguera', 'canaleta', 'borde', 'pasamanos'];
    if (unit === 'ml' && !linear.some((term) => elem.includes(term))) {
      errors.push(`${label} «${elemento}»: ml solo se permite para elementos lineales del catálogo.`);
    }
  };

  const changedRow = (rows: any[] | undefined, row: any) => {
    if (!previousFicha) return true;
    const previous = (rows || []).find((item) => item.id === row.id);
    return !previous || previous.elemento !== row.elemento || previous.unidad !== row.unidad;
  };
  (ficha.cons || []).forEach((r, i) => checkUnit(r.elemento, r.unidad, `Constructivos fila #${i + 1}`, changedRow(previousFicha?.cons, r)));
  (ficha.equip || []).forEach((r, i) => checkUnit(r.elemento, r.unidad, `Equipamiento fila #${i + 1}`, changedRow(previousFicha?.equip, r)));
  (ficha.elec || []).forEach((r, i) => checkUnit(r.elemento, r.unidad, `Eléctricas fila #${i + 1}`, changedRow(previousFicha?.elec, r)));
  (ficha.hidro || []).forEach((r, i) => checkUnit(r.elemento, r.unidad, `Hidrosanitarias fila #${i + 1}`, changedRow(previousFicha?.hidro, r)));
  (ficha.pat || []).forEach((r, i) => checkUnit(r.elemento, r.unidad, `Patologías fila #${i + 1}`, changedRow(previousFicha?.pat, r)));

  (ficha.cons || []).forEach((r, i) => {
    const previous = previousFicha?.cons?.find((row) => row.id === r.id);
    const changed = !previousFicha || !previous || previous.dimension !== r.dimension;
    if (changed && r.dimension) {
      const result = isValidDimensionFormat(r.dimension);
      if (!result.valid) errors.push(`Constructivos fila #${i + 1} (${r.elemento || 'Elemento'}): ${result.reason}`);
    }
  });
  return [...new Set(errors)];
}

export interface ProjectVerificationItem {
  id: string;
  title: string;
  status: 'ok' | 'warning';
  detail: string;
  count: number;
}

export interface ProjectVerificationResult {
  hasPending: boolean;
  pendingCount: number;
  items: ProjectVerificationItem[];
}

/**
 * PRIORIDAD 5: Lista de verificación antes de exportar
 * Verifica de forma global sobre las fichas:
 * 1. Total de la sección 8 igual a la suma de los ambientes.
 * 2. Estado del encabezado igual al del diagnóstico en cada ambiente.
 * 3. Fotos sin descripción.
 * 4. Ambientes sin cuantificación o marcados como incompletos.
 */
export function getProjectVerificationChecklist(fichas: Ficha[]): ProjectVerificationResult {
  const items: ProjectVerificationItem[] = [];

  // 1. La sección 8 se consolida desde las cantidades registradas por ambiente.
  // Se detectan problemas de trazabilidad en lugar de comparar indiscriminadamente todas las superficies.
  const traceProblems: string[] = [];
  fichas.forEach((f) => {
    const links = new Set<string>();
    (f.cuan || []).forEach((q, idx) => {
      if (q.porVerificar) traceProblems.push(`${f.codigo || f.ambiente}: cuantificación ${q.elemento || idx + 1} marcada por verificar.`);
      if (q.origenAcabado && !q.cantidadManual) {
        const finishTotals = calculateFinishesTotals(f);
        const expected = q.origenAcabado === 'pintura' ? finishTotals.pinturaTotal : finishTotals.ceramicaTotal;
        const actual = Number(String(q.cantidad || '').replace(',', '.'));
        if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.004) {
          traceProblems.push(`${f.codigo || f.ambiente}: total de ${q.origenAcabado} en sección 8 no coincide con los elementos fuente (${expected.toFixed(2)} m²).`);
        }
      }
      if (q.origenPatologiaId) {
        if (links.has(q.origenPatologiaId)) traceProblems.push(`${f.codigo || f.ambiente}: actividad duplicada enlazada a patología (${q.elemento || 'Elemento'}).`);
        links.add(q.origenPatologiaId);
        const source = (f.pat || []).find((p) => p.id === q.origenPatologiaId);
        if (source && !q.cantidadManual) {
          const fromPath = Number(String(source.cantidad || '').replace(',', '.'));
          const fromQuant = Number(String(q.cantidad || '').replace(',', '.'));
          if (!Number.isFinite(fromPath) || !Number.isFinite(fromQuant) || Math.abs(fromPath - fromQuant) > 0.004) {
            traceProblems.push(`${f.codigo || f.ambiente}: cantidad de sección 8 no coincide con patología enlazada (${q.elemento || idx + 1}).`);
          }
        }
      }
      if (q.origenConstructivoId && !q.cantidadManual) {
        const source = (f.cons || []).find((row) => row.id === q.origenConstructivoId);
        if (source) {
          const sourceQty = Number(String(source.cantidad || '').replace(',', '.'));
          const quantQty = Number(String(q.cantidad || '').replace(',', '.'));
          if (!Number.isFinite(sourceQty) || !Number.isFinite(quantQty) || Math.abs(sourceQty - quantQty) > 0.004) {
            traceProblems.push(`${f.codigo || f.ambiente}: sección 8 no coincide con el elemento fuente ${source.elemento || idx + 1}.`);
          }
        }
      }
    });
    (f.cons || []).forEach((row) => {
      const parsed = parseDimensions(row.dimension || '');
      if (parsed && !row.cantidadManual) {
        const amount = Number(String(row.cantidad || '').replace(',', '.'));
        if (!Number.isFinite(amount) || Math.abs(amount - parsed.area) > 0.004) {
          traceProblems.push(`${f.codigo || f.ambiente}: cantidad de «${row.elemento || 'elemento'}» no coincide con ${parsed.largo.toFixed(2)} × ${parsed.ancho.toFixed(2)} m.`);
        }
      }
    });
  });
  items.push({
    id: 'area-seccion8',
    title: 'Trazabilidad de cuantificación y totales de Sección 8',
    status: traceProblems.length > 0 ? 'warning' : 'ok',
    count: traceProblems.length,
    detail: traceProblems.length > 0
      ? `${traceProblems.length} cantidad(es) requieren revisión: ${traceProblems.slice(0, 3).join(' ')}${traceProblems.length > 3 ? '…' : ''}`
      : 'Las cantidades derivadas y las actividades enlazadas concuerdan con sus fuentes registradas.',
  });

  // 2. Estado derivado de patologías frente a los valores históricos guardados.
  const statusDiscrepancies: string[] = [];
  fichas.forEach((f) => {
    const derived = getWorstSeverityState(f.pat || []).estado;
    const estDim = (f.estadoDimensional || '').trim();
    const diagEst = (f.diagestado || '').trim();
    if ((estDim && estDim !== derived) || (diagEst && diagEst !== derived) || (estDim && diagEst && estDim !== diagEst)) {
      statusDiscrepancies.push(`${f.codigo || 'S/C'} (guardado: ${estDim || '—'} / ${diagEst || '—'}; derivado: ${derived})`);
    }
  });

  items.push({
    id: 'estados-coherencia',
    title: 'Coherencia de Estado (Encabezado vs Diagnóstico)',
    status: statusDiscrepancies.length > 0 ? 'warning' : 'ok',
    count: statusDiscrepancies.length,
    detail: statusDiscrepancies.length > 0
      ? `${statusDiscrepancies.length} ambiente(s) requieren sincronización: ${statusDiscrepancies.slice(0, 3).join(', ')}${statusDiscrepancies.length > 3 ? '…' : ''}.`
      : 'Todos los ambientes coinciden con el estado derivado de sus patologías.',
  });

  // 3. Fotos sin descripción
  let fotosSinDesc = 0;
  fichas.forEach((f) => {
    (f.fotos || []).forEach((foto) => {
      if (!foto.desc || !foto.desc.trim()) {
        fotosSinDesc++;
      }
    });
  });

  items.push({
    id: 'fotos-sin-desc',
    title: 'Registro Fotográfico con Descripción',
    status: fotosSinDesc > 0 ? 'warning' : 'ok',
    count: fotosSinDesc,
    detail: fotosSinDesc > 0
      ? `Se encontraron ${fotosSinDesc} fotografía(s) sin descripción técnica registrada.`
      : 'Todas las fotografías registradas cuentan con descripción técnica.',
  });

  // 4. Ambientes sin cuantificación o marcados como incompletos
  const incompletos: string[] = [];
  fichas.forEach((f) => {
    const sinCuan = !f.cuan || f.cuan.length === 0;
    const sinId = !f.codigo?.trim() || !f.ambiente?.trim();
    const incompletoMarcado = Boolean(f.incompleto || (f.cuan || []).some((q) => q.porVerificar));
    if (sinCuan || sinId || incompletoMarcado) {
      incompletos.push(f.codigo || f.ambiente || 'S/C');
    }
  });

  items.push({
    id: 'ambientes-incompletos',
    title: 'Cuantificación y Ambientes Completos',
    status: incompletos.length > 0 ? 'warning' : 'ok',
    count: incompletos.length,
    detail: incompletos.length > 0
      ? `${incompletos.length} ambiente(s) sin cuantificación, identificados como incompletos o con cantidades por verificar (${incompletos.slice(0, 3).join(', ')}${incompletos.length > 3 ? '...' : ''}).`
      : 'Todos los ambientes guardados cuentan con cuantificación preliminar e identificación.',
  });

  const pendingCount = items.filter((i) => i.status === 'warning').length;

  return {
    hasPending: pendingCount > 0,
    pendingCount,
    items,
  };
}
