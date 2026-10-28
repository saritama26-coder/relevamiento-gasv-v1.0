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

export function exportCSV(fichas: Ficha[], projectData: ProjectData): void {
  const rows = [
    ['Proyecto', 'Ubicación', 'Bloque', 'Nivel', 'Ambiente', 'Código', 'Elemento', 'Actividad', 'Cantidad', 'Unidad', 'Estado', 'Prioridad']
  ];

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
  a.download = 'cuantificacion_proyecto.csv';
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
