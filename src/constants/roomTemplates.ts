import type {
  ConstructivoRow,
  ElectricasRow,
  EquipamientoRow,
  Ficha,
  HidrosanitariasRow,
} from '../types';

export type RoomTemplateSection = 'cons' | 'equip' | 'elec' | 'hidro';

export interface RoomTemplateItem {
  section: RoomTemplateSection;
  elemento: string;
  unidad: string;
}

export interface RoomTemplate {
  id: string;
  label: string;
  ambiente: string;
  description: string;
  items: RoomTemplateItem[];
}

/**
 * Las plantillas son listas de comprobación iniciales, no inventarios confirmados.
 * Por diseño solo proponen nombres de elementos y unidades; cantidades, dimensiones,
 * estados y observaciones permanecen vacíos hasta que se verifiquen en sitio.
 */
const commonArchitecturalItems: RoomTemplateItem[] = [
  { section: 'cons', elemento: 'Piso', unidad: 'm²' },
  { section: 'cons', elemento: 'Paredes', unidad: 'm²' },
  { section: 'cons', elemento: 'Cielo raso', unidad: 'm²' },
  { section: 'cons', elemento: 'Puerta', unidad: 'u' },
  { section: 'cons', elemento: 'Ventana', unidad: 'u' },
];

const commonElectricalItems: RoomTemplateItem[] = [
  { section: 'elec', elemento: 'Luminaria', unidad: 'u' },
  { section: 'elec', elemento: 'Interruptor', unidad: 'u' },
  { section: 'elec', elemento: 'Tomacorriente', unidad: 'u' },
];

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'aula',
    label: 'Aula / Sala de clases',
    ambiente: 'Aula',
    description: 'Acabados, mobiliario básico e instalaciones que se deben comprobar.',
    items: [
      ...commonArchitecturalItems,
      { section: 'equip', elemento: 'Pupitre / mesa', unidad: 'u' },
      { section: 'equip', elemento: 'Silla', unidad: 'u' },
      { section: 'equip', elemento: 'Pizarra', unidad: 'u' },
      ...commonElectricalItems,
      { section: 'elec', elemento: 'Punto de datos', unidad: 'u' },
    ],
  },
  {
    id: 'oficina',
    label: 'Oficina administrativa',
    ambiente: 'Oficina',
    description: 'Acabados, mobiliario y puntos eléctricos/de datos de oficina.',
    items: [
      ...commonArchitecturalItems,
      { section: 'equip', elemento: 'Escritorio', unidad: 'u' },
      { section: 'equip', elemento: 'Silla', unidad: 'u' },
      { section: 'equip', elemento: 'Archivador', unidad: 'u' },
      ...commonElectricalItems,
      { section: 'elec', elemento: 'Punto de datos', unidad: 'u' },
    ],
  },
  {
    id: 'laboratorio',
    label: 'Laboratorio',
    ambiente: 'Laboratorio',
    description: 'Mesones, mobiliario, instalaciones y puntos hidrosanitarios de referencia.',
    items: [
      ...commonArchitecturalItems,
      { section: 'cons', elemento: 'Mesón de trabajo', unidad: 'ml' },
      { section: 'equip', elemento: 'Mesa de laboratorio', unidad: 'u' },
      { section: 'equip', elemento: 'Banco de laboratorio', unidad: 'u' },
      { section: 'equip', elemento: 'Gabinete de almacenamiento', unidad: 'u' },
      ...commonElectricalItems,
      { section: 'elec', elemento: 'Tomacorriente regulado', unidad: 'u' },
      { section: 'elec', elemento: 'Punto de datos', unidad: 'u' },
      { section: 'equip', elemento: 'Lavamanos', unidad: 'u' },
      { section: 'hidro', elemento: 'Llave de paso', unidad: 'u' },
      { section: 'hidro', elemento: 'Grifería', unidad: 'u' },
      { section: 'hidro', elemento: 'Manguera abasto lavamanos', unidad: 'u' },
      { section: 'hidro', elemento: 'Manguera abasto inodoro', unidad: 'u' },
      { section: 'hidro', elemento: 'Sifón', unidad: 'u' },
      { section: 'hidro', elemento: 'Punto de desagüe', unidad: 'u' },
    ],
  },
  {
    id: 'bano',
    label: 'Baño / Servicio higiénico',
    ambiente: 'Baño',
    description: 'Acabados, aparatos sanitarios y accesorios para verificar.',
    items: [
      ...commonArchitecturalItems,
      { section: 'equip', elemento: 'Inodoro', unidad: 'u' },
      { section: 'equip', elemento: 'Urinario', unidad: 'u' },
      { section: 'equip', elemento: 'Lavamanos', unidad: 'u' },
      { section: 'equip', elemento: 'Espejo', unidad: 'u' },
      { section: 'equip', elemento: 'Dispensador de jabón', unidad: 'u' },
      { section: 'equip', elemento: 'Dispensador de papel', unidad: 'u' },
      { section: 'elec', elemento: 'Luminaria', unidad: 'u' },
      { section: 'elec', elemento: 'Interruptor', unidad: 'u' },
      { section: 'hidro', elemento: 'Grifería', unidad: 'u' },
      { section: 'hidro', elemento: 'Desagüe', unidad: 'u' },
    ],
  },
  {
    id: 'pasillo',
    label: 'Pasillo / Circulación',
    ambiente: 'Pasillo',
    description: 'Acabados y elementos de iluminación/circulación.',
    items: [
      ...commonArchitecturalItems,
      ...commonElectricalItems,
      { section: 'elec', elemento: 'Luminaria de emergencia', unidad: 'u' },
    ],
  },
  {
    id: 'bodega',
    label: 'Bodega / Almacén',
    ambiente: 'Bodega',
    description: 'Acabados, almacenamiento e instalaciones básicas de referencia.',
    items: [
      ...commonArchitecturalItems,
      { section: 'equip', elemento: 'Estantería metálica', unidad: 'u' },
      { section: 'equip', elemento: 'Armario de almacenamiento', unidad: 'u' },
      ...commonElectricalItems,
    ],
  },
];

function normalizeElement(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function appendUniqueRows<T extends { id: string; elemento: string }>(
  existing: T[],
  proposed: Array<Omit<T, 'id'>>,
  section: RoomTemplateSection,
  idFactory: (section: RoomTemplateSection, index: number) => string,
): { rows: T[]; added: number } {
  const seen = new Set(existing.map((row) => normalizeElement(row.elemento)));
  const additions: T[] = [];

  proposed.forEach((row) => {
    const key = normalizeElement(row.elemento);
    if (!key || seen.has(key)) return;
    seen.add(key);
    additions.push({ ...row, id: idFactory(section, additions.length) } as T);
  });

  return { rows: [...existing, ...additions], added: additions.length };
}

function createDefaultRowId(section: RoomTemplateSection, index: number): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `TPL-${section}-${Date.now().toString(36)}-${index}-${random}`;
}

export interface RoomTemplateApplyResult {
  patch: Pick<Ficha, 'cons' | 'equip' | 'elec' | 'hidro'>;
  addedBySection: Record<RoomTemplateSection, number>;
  addedCount: number;
}

export function applyRoomTemplate(
  ficha: Pick<Ficha, 'cons' | 'equip' | 'elec' | 'hidro'>,
  template: RoomTemplate,
  idFactory: (section: RoomTemplateSection, index: number) => string = createDefaultRowId,
): RoomTemplateApplyResult {
  const bySection = (section: RoomTemplateSection) =>
    template.items.filter((item) => item.section === section);

  const consRows: Array<Omit<ConstructivoRow, 'id'>> = bySection('cons').map((item) => ({
    elemento: item.elemento,
    descripcion: '',
    dimension: '',
    cantidad: '',
    unidad: item.unidad,
    estado: '',
    observacion: '',
  }));

  const equipRows: Array<Omit<EquipamientoRow, 'id'>> = bySection('equip').map((item) => ({
    elemento: item.elemento,
    descripcion: '',
    cantidad: '',
    unidad: item.unidad,
    estado: '',
    observacion: '',
  }));

  const elecRows: Array<Omit<ElectricasRow, 'id'>> = bySection('elec').map((item) => ({
    elemento: item.elemento,
    cantidad: '',
    unidad: item.unidad,
    estado: '',
    observacion: '',
  }));

  const hidroRows: Array<Omit<HidrosanitariasRow, 'id'>> = bySection('hidro').map((item) => ({
    elemento: item.elemento,
    cantidad: '',
    unidad: item.unidad,
    estado: '',
    observacion: '',
  }));

  const cons = appendUniqueRows(ficha.cons || [], consRows, 'cons', idFactory);
  const equip = appendUniqueRows(ficha.equip || [], equipRows, 'equip', idFactory);
  const elec = appendUniqueRows(ficha.elec || [], elecRows, 'elec', idFactory);
  const hidro = appendUniqueRows(ficha.hidro || [], hidroRows, 'hidro', idFactory);

  const addedBySection = {
    cons: cons.added,
    equip: equip.added,
    elec: elec.added,
    hidro: hidro.added,
  };

  return {
    patch: {
      cons: cons.rows,
      equip: equip.rows,
      elec: elec.rows,
      hidro: hidro.rows,
    },
    addedBySection,
    addedCount: Object.values(addedBySection).reduce((sum, count) => sum + count, 0),
  };
}
