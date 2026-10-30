import type { Ficha, PatologiaRow } from '../types';
import { APARATOS_EQUIPAMIENTO_HIDRO_LEGACY } from '../constants/catalogos';

export type InventorySectionKey = 'cons' | 'equip' | 'elec' | 'hidro';

export interface PathologyTransferCandidate {
  key: string;
  sourceSection: InventorySectionKey;
  sourceLabel: string;
  sourceRowId: string;
  element: string;
  state: string;
  quantity: string;
  unit: string;
  detail: string;
}

const SOURCE_SECTIONS: Array<{
  key: InventorySectionKey;
  label: string;
}> = [
  { key: 'cons', label: 'Sección 3 · Elementos constructivos' },
  { key: 'equip', label: 'Sección 4 · Equipamiento' },
  { key: 'elec', label: 'Sección 5 · Instalaciones eléctricas' },
  { key: 'hidro', label: 'Sección 6 · Instalaciones, conexiones y accesorios hidrosanitarios' },
];

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function isInformativeDetail(value: string): boolean {
  const normalized = normalize(value);
  if (!normalized) return false;
  return ![
    'sin novedad',
    'sin novedades',
    'sin observacion',
    'sin observaciones',
    'sin comentario',
    'ninguno',
    'ninguna',
    'no aplica',
    'n/a',
    '-',
  ].includes(normalized);
}

function rowObservation(row: Record<string, unknown>): string {
  return String(row.observacion ?? '').trim();
}

function rowDetail(row: Record<string, unknown>): string {
  // La referencia conserva la descripción del elemento; la observación se
  // mantiene en el inventario y no se mezcla con el identificador de origen.
  const description = String(row.descripcion ?? '').trim();
  return isInformativeDetail(description) ? description : '';
}

/**
 * La referencia de la sección 7 solo identifica la sección de procedencia
 * y el detalle descriptivo. El estado, cantidad y unidad se conservan en
 * sus campos correspondientes y no se repiten dentro de esta columna.
 */
function sourceReference(sectionLabel: string, detail: string): string {
  const match = sectionLabel.match(/^Secci[oó]n\s+(\d+)/i);
  const section = match ? `S${match[1]}` : sectionLabel.split(' · ')[0].trim() || sectionLabel.trim();
  return detail ? `${section} · Detalle: ${detail}` : section;
}

/** Normaliza referencias históricas para mostrarlas con el formato compacto actual. */
export function normalizePathologySourceReference(value: unknown): string {
  const reference = String(value ?? '').trim();
  const match = reference.match(/^Secci[oó]n\s+(\d+)\b/i);
  if (!match) return reference;

  const section = `S${match[1]}`;
  const remainder = reference.slice(match[0].length).replace(/^\s*·\s*/, '').trim();
  if (!remainder) return section;

  const detail = remainder
    .replace(/^Detalle:\s*/i, '')
    .split(/\s*·\s*/)
    [0]
    .trim();
  return detail ? `${section} · Detalle: ${detail}` : section;
}

/**
 * Detecta elementos inventariados cuyo estado es Regular, Malo o Crítico,
 * o que tienen un detalle/observación informativa. No deduce patologías.
 * Los registros ya transferidos se excluyen mediante origenKey.
 */
export function collectPathologyTransferCandidates(
  ficha: Pick<Ficha, 'cons' | 'equip' | 'elec' | 'hidro' | 'pat'>,
): PathologyTransferCandidate[] {
  const transferredKeys = new Set(
    (Array.isArray(ficha.pat) ? ficha.pat : [])
      .map((row) => String(row.origenKey || '').trim())
      .filter(Boolean),
  );

  const candidates: PathologyTransferCandidate[] = [];

  SOURCE_SECTIONS.forEach(({ key, label }) => {
    const rows = Array.isArray(ficha[key]) ? ficha[key] : [];
    rows.forEach((rawRow, index) => {
      const row = rawRow as unknown as Record<string, unknown>;
      const element = String(row.elemento ?? '').trim();
      if (!element) return;

      // Los aparatos sanitarios pertenecen a la Sección 4. Se excluyen de
      // nuevas transferencias desde hidro para evitar patologías duplicadas.
      if (key === 'hidro' && APARATOS_EQUIPAMIENTO_HIDRO_LEGACY.some(
        (item) => normalize(item) === normalize(element),
      )) return;

      const state = String(row.estado ?? '').trim();
      const stateKey = normalize(state);
      const hasRelevantState = ['regular', 'malo', 'critico'].includes(stateKey);
      const observation = rowObservation(row);
      const hasInformativeObservation = isInformativeDetail(observation);
      // Una descripción del material/equipo no es por sí sola una novedad.
      const detail = rowDetail(row);
      if (!hasRelevantState && !hasInformativeObservation) return;

      const rowId = String(row.id ?? '').trim() || `row-${index}-${normalize(element)}`;
      const keyValue = `gasv:${key}:${rowId}`;
      if (transferredKeys.has(keyValue)) return;

      candidates.push({
        key: keyValue,
        sourceSection: key,
        sourceLabel: label,
        sourceRowId: rowId,
        element,
        state,
        quantity: String(row.cantidad ?? '').trim(),
        unit: String(row.unidad ?? '').trim(),
        detail,
      });
    });
  });

  return candidates;
}

/**
 * Crea filas de diagnóstico como borradores. La cantidad y unidad se
 * precargan desde el inventario como valores iniciales editables; el inspector
 * debe confirmar o ajustar la cantidad realmente afectada. Patología,
 * ubicación, severidad e intervención quedan vacías para valoración profesional.
 */
export function createPathologyRowsFromCandidates(
  candidates: PathologyTransferCandidate[],
  selectedKeys: string[],
  idFactory: (candidate: PathologyTransferCandidate, index: number) => string = (candidate, index) =>
    `PAT-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
): PatologiaRow[] {
  const selected = new Set(selectedKeys);
  return candidates
    .filter((candidate) => selected.has(candidate.key))
    .map((candidate, index) => ({
      id: idFactory(candidate, index),
      elemento: candidate.element,
      patologia: '',
      ubicacion: '',
      cantidad: candidate.quantity,
      unidad: candidate.unit,
      severidad: '',
      intervencion: '',
      origenKey: candidate.key,
      referenciaOrigen: sourceReference(
        candidate.sourceLabel,
        candidate.detail,
      ),
    }));
}
