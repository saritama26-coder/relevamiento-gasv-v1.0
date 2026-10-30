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
 * Sugiere el siguiente código a partir de un patrón existente, evitando colisiones.
 * No inventa prefijos ni genera códigos cuando la referencia no termina en números.
 */
export function suggestNextAvailableCode(
  referenceCode: string,
  existingFichas: Array<Pick<Ficha, 'codigo'>>,
): string {
  const reference = String(referenceCode || '').trim();
  if (!reference) return '';

  let candidate = nextConsecutive(reference);
  if (!candidate || candidate === reference) return '';

  const normalize = (value: string) =>
    String(value || '').trim().toLocaleLowerCase();

  const used = new Set(existingFichas.map((ficha) => normalize(ficha.codigo)));
  for (let attempt = 0; attempt < 1000 && used.has(normalize(candidate)); attempt += 1) {
    const next = nextConsecutive(candidate);
    if (!next || next === candidate) return '';
    candidate = next;
  }

  return used.has(normalize(candidate)) ? '' : candidate;
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

  if (s.toLowerCase().includes('m2') || s.toLowerCase().includes('m²')) {
    return { valid: false, reason: 'Las dimensiones lineales no deben incluir "m²". Indique medidas como "2.50 x 3.00 m".' };
  }

  // Detectar secuencias con más de un punto decimal en un número (ej. "0.7.0")
  if (/\d+\.\d+\.\d+/.test(s)) {
    return { valid: false, reason: 'Número con doble punto decimal detectado (ej. "0.7.0").' };
  }

  // Detectar formato con punto pegado a la x sin dígito (ej. "8.30x.0.60")
  if (/[xX*×]\s*\.\d+/.test(s) && !/[xX*×]\s*0\.\d+/.test(s)) {
    return { valid: false, reason: 'Formato de multiplicación dimensional incompleto o mal puntuado.' };
  }

  return { valid: true };
}

/**
 * Calcula los totales sumados de cerámica (m²) y pintura (m²) a partir de las secciones del ambiente.
 */
export function calculateFinishesTotals(ficha: Ficha): { ceramicaTotal: number; pinturaTotal: number } {
  let ceramicaTotal = 0;
  let pinturaTotal = 0;

  const normalize = (v: string) => (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const processItem = (elem: string, desc: string, qtyStr: string, unitStr: string) => {
    const text = normalize(`${elem} ${desc}`);
    const qty = parseFloat(String(qtyStr || '').replace(',', '.')) || 0;
    if (qty <= 0) return;

    if (text.includes('ceramica') || text.includes('porcelanato') || text.includes('azulejo')) {
      ceramicaTotal += qty;
    }
    if (text.includes('pintura') || text.includes('esmalte') || text.includes('latex')) {
      pinturaTotal += qty;
    }
  };

  (ficha.cons || []).forEach((c) => processItem(c.elemento, c.descripcion, c.cantidad, c.unidad));
  (ficha.pat || []).forEach((p) => processItem(p.elemento, p.patologia, p.cantidad, p.unidad));

  return {
    ceramicaTotal: parseFloat(ceramicaTotal.toFixed(2)),
    pinturaTotal: parseFloat(pinturaTotal.toFixed(2)),
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
    if (!normElem || !normUn) return;

    // Pisos, paredes y cielo raso deben ser m²
    if (['piso', 'paredes', 'pared', 'cielo raso', 'cubierta', 'ceramica en piso', 'ceramica en pared', 'pintura en paredes'].some(k => normElem.includes(k))) {
      if (normUn !== 'm²' && normUn !== 'm2') {
        warnings.push(`${tabla} Fila #${idx + 1} (${elem}): elemento de superficie/acabado registrado con unidad "${un}". La unidad estándar es m².`);
      }
    }

    // Piezas fijas, puertas, interruptores, sanitarios deben ser 'u', 'pza' o 'jgo'
    if (['puerta', 'inodoro', 'lavamanos', 'urinario', 'tomacorriente', 'interruptor', 'lampara', 'luminaria'].some(k => normElem.includes(k))) {
      if (normUn === 'ml' || normUn === 'm') {
        warnings.push(`${tabla} Fila #${idx + 1} (${elem}): elemento discreto registrado con unidad lineal "${un}". Se sugiere medir en unidades (u).`);
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

  // 1. Total de la sección 8 igual a la suma de los ambientes
  const totalAreaAmbientes = fichas.reduce((acc, f) => acc + calculateArea(f), 0);
  let totalCuanSuperficie = 0;
  let ambDiscrepantesCount = 0;

  fichas.forEach((f) => {
    const areaAmb = calculateArea(f);
    const m2CuanAmb = (f.cuan || []).reduce((acc, item) => {
      const u = (item.unidad || '').toLowerCase().trim();
      if (u === 'm²' || u === 'm2') {
        const q = parseFloat(String(item.cantidad || '0').replace(',', '.'));
        return acc + (isNaN(q) ? 0 : q);
      }
      return acc;
    }, 0);

    totalCuanSuperficie += m2CuanAmb;
    // Si el ambiente tiene área definida pero no tiene cuantificaciones de superficie
    if (areaAmb > 0 && Math.abs(areaAmb - m2CuanAmb) > 0.05 && (f.cuan || []).length > 0) {
      ambDiscrepantesCount++;
    }
  });

  const diffArea = Math.abs(totalAreaAmbientes - totalCuanSuperficie);
  const areaMismatch = fichas.length > 0 && totalAreaAmbientes > 0 && diffArea > 0.5 && ambDiscrepantesCount > 0;

  items.push({
    id: 'area-seccion8',
    title: 'Total Sección 8 vs Suma de Ambientes',
    status: areaMismatch ? 'warning' : 'ok',
    count: areaMismatch ? ambDiscrepantesCount : 0,
    detail: areaMismatch
      ? `Superficie total de ambientes (${totalAreaAmbientes.toFixed(2)} m²) presenta diferencias con la cuantificación de acabados (${totalCuanSuperficie.toFixed(2)} m²) en ${ambDiscrepantesCount} ambiente(s).`
      : `Superficie total de ambientes (${totalAreaAmbientes.toFixed(2)} m²) coherente con el relevamiento.`,
  });

  // 2. Estado del encabezado igual al del diagnóstico en cada ambiente
  const statusDiscrepancies: string[] = [];
  fichas.forEach((f) => {
    const estDim = (f.estadoDimensional || '').trim();
    const diagEst = (f.diagestado || '').trim();
    if (estDim && diagEst && estDim !== diagEst) {
      statusDiscrepancies.push(`${f.codigo || 'S/C'} (${estDim} ≠ ${diagEst})`);
    }
  });

  items.push({
    id: 'estados-coherencia',
    title: 'Coherencia de Estado (Encabezado vs Diagnóstico)',
    status: statusDiscrepancies.length > 0 ? 'warning' : 'ok',
    count: statusDiscrepancies.length,
    detail: statusDiscrepancies.length > 0
      ? `${statusDiscrepancies.length} ambiente(s) con estados diferentes: ${statusDiscrepancies.slice(0, 3).join(', ')}${statusDiscrepancies.length > 3 ? '...' : ''}.`
      : 'Todos los ambientes tienen estados de encabezado y diagnóstico unificados.',
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
    if (sinCuan || sinId) {
      incompletos.push(f.codigo || f.ambiente || 'S/C');
    }
  });

  items.push({
    id: 'ambientes-incompletos',
    title: 'Cuantificación y Ambientes Completos',
    status: incompletos.length > 0 ? 'warning' : 'ok',
    count: incompletos.length,
    detail: incompletos.length > 0
      ? `${incompletos.length} ambiente(s) sin cuantificación preliminar o con datos faltantes (${incompletos.slice(0, 3).join(', ')}${incompletos.length > 3 ? '...' : ''}).`
      : 'Todos los ambientes guardados cuentan con cuantificación preliminar e identificación.',
  });

  const pendingCount = items.filter((i) => i.status === 'warning').length;

  return {
    hasPending: pendingCount > 0,
    pendingCount,
    items,
  };
}
