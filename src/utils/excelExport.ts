import ExcelJS from 'exceljs';
import type { Ficha, ProjectData } from '../types';
import { calculateArea, calculatePerimeter } from './helpers';

function numericValue(value: unknown): number | string {
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return '';
  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return String(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : String(value);
}

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-EC');
}

function safeFilename(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim().replace(/\s+/g, '_').slice(0, 70) || 'Proyecto';
}

function styleTitle(sheet: ExcelJS.Worksheet, lastColumn: number, title: string, subtitle: string): void {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 32;
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF526579' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1F8' } };
  subtitleCell.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 25;
  sheet.getRow(3).height = 8;
  sheet.views = [{ state: 'frozen', ySplit: 4, activeCell: 'A5' }];
  sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.pageMargins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
}

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  widths: number[],
  numericColumns: number[] = [],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name);
  styleTitle(sheet, headers.length, title, subtitle);
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width || 18;
  });
  sheet.addTable({
    name: 'Tbl' + name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, ''),
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true, showColumnStripes: false },
    columns: headers.map((header) => ({ name: header, filterButton: true })),
    rows,
  });
  const header = sheet.getRow(4);
  header.height = 32;
  header.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF286B9E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF17365D' } } };
  });
  numericColumns.forEach((column) => {
    sheet.getColumn(column + 1).numFmt = '#,##0.00';
    sheet.getColumn(column + 1).alignment = { horizontal: 'right', vertical: 'middle' };
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    row.height = 28;
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF25364A' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });
  return sheet;
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  fichas: Ficha[],
  project: ProjectData,
  pending: boolean,
  exportDate: Date,
): void {
  const sheet = workbook.addWorksheet('Resumen');
  styleTitle(sheet, 6, 'RELEVAMIENTO ARQUITECTÓNICO GASV', 'Libro de trabajo técnico · Información consolidada de la aplicación');
  sheet.views = [{ state: 'normal' }];
  sheet.columns = [{ width: 42 }, { width: 72 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  const inventoryCount = fichas.reduce((sum, ficha) =>
    sum + (ficha.cons?.length || 0) + (ficha.equip?.length || 0) +
    (ficha.elec?.length || 0) + (ficha.hidro?.length || 0), 0);
  const pathologyCount = fichas.reduce((sum, ficha) => sum + (ficha.pat?.length || 0), 0);
  const quantityCount = fichas.reduce((sum, ficha) => sum + (ficha.cuan?.length || 0), 0);
  const photoCount = fichas.reduce((sum, ficha) => sum + (ficha.fotos?.length || 0), 0);
  const areaTotal = fichas.reduce((sum, ficha) => sum + calculateArea(ficha), 0);
  const statusCounts = new Map<string, number>();
  fichas.forEach((ficha) => {
    const status = String(ficha.estadoDimensional || ficha.diagestado || 'No consignado');
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  const addSection = (rowNumber: number, text: string) => {
    sheet.mergeCells(rowNumber, 1, rowNumber, 2);
    const cell = sheet.getCell(rowNumber, 1);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
    cell.alignment = { vertical: 'middle' };
    sheet.getRow(rowNumber).height = 23;
  };
  const addPair = (rowNumber: number, label: string, value: string | number, numeric = false) => {
    const labelCell = sheet.getCell(rowNumber, 1);
    labelCell.value = label;
    labelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF17365D' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1F8' } };
    labelCell.border = { bottom: { style: 'thin', color: { argb: 'FFD5DEE8' } } };
    const valueCell = sheet.getCell(rowNumber, 2);
    valueCell.value = value;
    valueCell.font = { name: 'Arial', size: 10, color: { argb: 'FF25364A' } };
    valueCell.alignment = { wrapText: true, vertical: 'middle' };
    valueCell.border = { bottom: { style: 'thin', color: { argb: 'FFD5DEE8' } } };
    if (numeric) valueCell.numFmt = '#,##0.00';
    sheet.getRow(rowNumber).height = 22;
  };

  addSection(4, 'DATOS GENERALES DEL PROYECTO');
  addPair(5, 'Proyecto', project.proyecto || 'No consignado');
  addPair(6, 'Ubicación', project.ubicacion || 'No consignada');
  addPair(7, 'Bloque principal', project.bloque || 'Varios');
  addPair(8, 'Fecha de exportación', exportDate.toLocaleString('es-EC'));

  addSection(10, 'INDICADORES DEL PROYECTO');
  addPair(11, 'Ambientes registrados', fichas.length);
  addPair(12, 'Área dimensional total (m²)', areaTotal, true);
  addPair(13, 'Elementos inventariados (secciones 3 a 6)', inventoryCount);
  addPair(14, 'Registros de patologías', pathologyCount);
  addPair(15, 'Partidas de cuantificación', quantityCount);
  addPair(16, 'Fotografías registradas', photoCount);
  addPair(17, 'Estado de revisión', pending ? 'POR VERIFICAR · existen observaciones pendientes' : 'Sin observaciones pendientes detectadas');

  addSection(19, 'ESTADO GENERAL DE LOS AMBIENTES');
  ['Estado', 'Cantidad'].forEach((value, index) => {
    const cell = sheet.getCell(20, index + 1);
    cell.value = value;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF286B9E' } };
  });
  let row = 21;
  Array.from(statusCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([status, count]) => {
    addPair(row++, status, count);
  });

  const contentStart = row + 1;
  addSection(contentStart, 'CONTENIDO DEL LIBRO');
  const contents = [
    ['Hoja', 'Información incluida'],
    ['Ambientes', 'Identificación, dimensiones, área, perímetro y estados.'],
    ['Inventario', 'Elementos constructivos, equipamiento e instalaciones (secciones 3 a 6).'],
    ['Patologías', 'Daños, cantidad afectada, severidad, intervención y referencia de inventario.'],
    ['Cuantificación', 'Partidas, cantidades, unidades, estados y prioridades de todas las fichas.'],
    ['Registro fotográfico', 'Índice fotográfico y vistas previas cuando la imagen está disponible localmente.'],
  ];
  contents.forEach((values, index) => {
    const current = contentStart + 1 + index;
    values.forEach((value, colIndex) => {
      const cell = sheet.getCell(current, colIndex + 1);
      cell.value = value;
      cell.font = { name: 'Arial', size: 10, bold: index === 0, color: { argb: index === 0 ? 'FFFFFFFF' : 'FF25364A' } };
      if (index === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF286B9E' } };
      else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? 'FFF7F9FC' : 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD5DEE8' } } };
    });
    sheet.getRow(current).height = 28;
  });
  sheet.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

export function createProjectExcelWorkbook(
  fichas: Ficha[],
  projectData: ProjectData,
  porVerificar = false,
  exportDate = new Date(),
): ExcelJS.Workbook {
  const records = Array.isArray(fichas) ? fichas : [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Relevamiento Arquitectónico GASV';
  workbook.subject = 'Exportación de datos del relevamiento arquitectónico';
  workbook.title = 'Relevamiento Arquitectónico · ' + (projectData.proyecto || 'Proyecto');
  workbook.created = exportDate;
  workbook.modified = exportDate;
  workbook.company = 'GSARITAMA ARQ.';

  const inventoryRows: Array<Array<string | number>> = [];
  const sections = [
    { key: 'cons', number: '3', label: 'Constructivos y acabados' },
    { key: 'equip', number: '4', label: 'Equipamiento' },
    { key: 'elec', number: '5', label: 'Instalaciones eléctricas' },
    { key: 'hidro', number: '6', label: 'Instalaciones hidrosanitarias' },
  ] as const;

  const environmentRows = records.map((ficha) => [
    ficha.codigo || '', ficha.ambiente || '', ficha.bloque || projectData.bloque || '',
    ficha.nivel || '', formatDate(ficha.fecha || ''),
    ficha.geometria === 'irregular' ? 'Irregular' : 'Regular',
    numericValue(ficha.largo), numericValue(ficha.ancho), numericValue(ficha.altura),
    calculateArea(ficha), calculatePerimeter(ficha),
    ficha.estadoDimensional || '', ficha.diagestado || '', ficha.interv || '',
    ficha.obs || ficha.diag || ficha.obsdim || '', ficha.responsable || '',
    formatDate(ficha.updatedAt || ''),
  ]);
  const pathologyRows: Array<Array<string | number>> = [];
  const quantityRows: Array<Array<string | number>> = [];
  const photoRows: Array<Array<string | number>> = [];
  const embeddedPhotos: Array<{ row: number; imageId: number }> = [];

  records.forEach((ficha) => {
    sections.forEach((section) => {
      const items = (ficha[section.key] || []) as unknown as Array<Record<string, string>>;
      items.forEach((item) => inventoryRows.push([
        section.number, section.label, ficha.codigo || '', ficha.ambiente || '',
        ficha.bloque || projectData.bloque || '', ficha.nivel || '',
        item.elemento || '', item.descripcion || '', item.dimension || '',
        numericValue(item.cantidad), item.unidad || '', item.estado || '', item.observacion || '',
      ]));
    });
    (ficha.pat || []).forEach((item) => pathologyRows.push([
      ficha.codigo || '', ficha.ambiente || '', item.elemento || '', item.patologia || '',
      numericValue(item.cantidad), item.unidad || '', item.severidad || '',
      item.intervencion || '', item.referenciaOrigen || '',
    ]));
    (ficha.cuan || []).forEach((item) => quantityRows.push([
      ficha.codigo || '', ficha.ambiente || '', ficha.bloque || projectData.bloque || '',
      ficha.nivel || '', item.codigo || '', item.elemento || '', item.actividad || '',
      numericValue(item.cantidad), item.unidad || '', item.estado || '', item.prioridad || '',
      item.origenPatologiaId || '',
    ]));
  });

  addSummarySheet(workbook, records, projectData, porVerificar, exportDate);

  addDataSheet(workbook, 'Ambientes', 'REGISTRO GENERAL DE AMBIENTES',
    'Proyecto: ' + (projectData.proyecto || 'No consignado') + ' · ' + records.length + ' ambiente(s)',
    ['Código', 'Ambiente', 'Bloque', 'Nivel', 'Fecha', 'Geometría', 'Largo (m)', 'Ancho (m)', 'Altura (m)', 'Área (m²)', 'Perímetro (m)', 'Estado dimensional', 'Estado diagnóstico', 'Intervención recomendada', 'Observaciones generales', 'Responsable', 'Última actualización'],
    environmentRows,
    [15, 26, 18, 14, 14, 14, 12, 12, 12, 13, 14, 18, 18, 28, 44, 24, 20],
    [6, 7, 8, 9, 10],
  );

  records.forEach((ficha) => {
    (ficha.fotos || []).forEach((photo, index) => {
      const rowIndex = photoRows.length + 4;
      let imageLabel = 'Vista previa no disponible · consultar la aplicación';
      const match = String(photo.src || '').match(/^data:image\/(jpeg|jpg|png);base64,/i);
      if (match) {
        try {
          const imageId = workbook.addImage({ base64: photo.src, extension: match[1].toLowerCase() === 'png' ? 'png' : 'jpeg' });
          embeddedPhotos.push({ row: rowIndex, imageId });
          imageLabel = 'Imagen insertada';
        } catch {
          imageLabel = 'No se pudo insertar · consultar la aplicación';
        }
      }
      photoRows.push([
        photoRows.length + 1, ficha.codigo || '', ficha.ambiente || '',
        ficha.bloque || projectData.bloque || '', ficha.nivel || '',
        photo.desc || 'Sin descripción', photo.id || '', imageLabel,
      ]);
    });
  });

  addDataSheet(workbook, 'Inventario', 'INVENTARIO DE ELEMENTOS E INSTALACIONES',
    'Registros de secciones 3, 4, 5 y 6 vinculados al ambiente de origen.',
    ['Sección', 'Grupo', 'Código', 'Ambiente', 'Bloque', 'Nivel', 'Elemento', 'Descripción', 'Dimensión', 'Cantidad', 'Unidad', 'Estado', 'Observación'],
    inventoryRows, [10, 28, 14, 24, 18, 14, 25, 36, 22, 14, 12, 16, 40], [9]);

  addDataSheet(workbook, 'Patologías', 'REGISTRO DE PATOLOGÍAS Y DEFICIENCIAS',
    'Daños registrados por ambiente. No se exporta una columna independiente de ubicación interna.',
    ['Código', 'Ambiente', 'Elemento afectado', 'Patología / deficiencia', 'Cantidad afectada', 'Unidad', 'Severidad', 'Intervención recomendada', 'Referencia de inventario'],
    pathologyRows, [14, 25, 25, 35, 16, 12, 16, 34, 36], [4]);

  addDataSheet(workbook, 'Cuantificación', 'CUANTIFICACIÓN PRELIMINAR DEL PROYECTO',
    'Partidas de la sección 8. Las cantidades numéricas se exportan como valores editables de Excel.',
    ['Código ambiente', 'Ambiente', 'Bloque', 'Nivel', 'Código partida', 'Elemento', 'Actividad / trabajo a ejecutar', 'Cantidad', 'Unidad', 'Estado', 'Prioridad', 'Origen patología (ID)'],
    quantityRows, [16, 25, 18, 14, 16, 26, 42, 15, 12, 16, 14, 26], [7]);

  const photoSheet = addDataSheet(workbook, 'Registro fotográfico', 'ÍNDICE Y REGISTRO FOTOGRÁFICO',
    'Vistas previas insertadas cuando la fotografía está disponible como imagen local en la ficha.',
    ['N.º', 'Código', 'Ambiente', 'Bloque', 'Nivel', 'Descripción', 'ID fotografía', 'Vista previa'],
    photoRows, [8, 14, 24, 18, 14, 42, 28, 28], [0]);
  embeddedPhotos.forEach(({ row, imageId }) => {
    photoSheet.getRow(row + 1).height = 86;
    photoSheet.addImage(imageId, {
      tl: { col: 7, row },
      br: { col: 8, row: row + 1 },
      editAs: 'oneCell',
    });
  });

  return workbook;
}

export async function exportProjectToExcel(
  fichas: Ficha[],
  projectData: ProjectData,
  porVerificar = false,
): Promise<void> {
  const date = new Date();
  const workbook = createProjectExcelWorkbook(fichas, projectData, porVerificar, date);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Relevamiento_' + safeFilename(projectData.proyecto || projectData.bloque || 'Proyecto') +
    '_' + date.toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.xlsx';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
