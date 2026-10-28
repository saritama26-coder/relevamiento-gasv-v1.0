export interface ConstructivoRow {
  id: string;
  elemento: string;
  descripcion: string;
  dimension: string;
  cantidad: string;
  unidad: string;
  estado: string;
  observacion: string;
}

export interface EquipamientoRow {
  id: string;
  elemento: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  estado: string;
  observacion: string;
}

export interface ElectricasRow {
  id: string;
  elemento: string;
  cantidad: string;
  unidad: string;
  estado: string;
  observacion: string;
}

export interface HidrosanitariasRow {
  id: string;
  elemento: string;
  cantidad: string;
  unidad: string;
  estado: string;
  observacion: string;
}

export interface PatologiaRow {
  id: string;
  elemento: string;
  patologia: string;
  ubicacion: string;
  cantidad: string;
  unidad: string;
  severidad: string;
  intervencion: string;
}

export interface CuantificacionRow {
  id: string;
  codigo: string;
  elemento: string;
  actividad: string;
  cantidad: string;
  unidad: string;
  estado: string;
  prioridad: string;
}

export interface FotoRegistro {
  id: string;
  src: string;
  desc: string;
}

export interface Ficha {
  id: string;
  proyecto: string;
  ubicacion: string;
  bloque: string;
  nivel: string;
  ambiente: string;
  codigo: string;
  fecha: string;
  responsable: string;
  geometria: 'regular' | 'irregular';
  largo: string;
  ancho: string;
  altura: string;
  areaDirecta: string;
  estadoDimensional: string;
  obsdim: string;
  cons: ConstructivoRow[];
  equip: EquipamientoRow[];
  elec: ElectricasRow[];
  hidro: HidrosanitariasRow[];
  pat: PatologiaRow[];
  cuan: CuantificacionRow[];
  fotos: FotoRegistro[];
  diagestado: string;
  interv: string;
  diag: string;
  obs: string;
  fir1: string;
  fir2: string;
  fir3: string;
  fir4: string;
  updatedAt: string;
}

export interface ProjectData {
  proyecto: string;
  ubicacion: string;
  bloque: string;
  profesional?: string;
  contacto?: string;
}

export type CatalogosMap = Record<string, string[]>;
