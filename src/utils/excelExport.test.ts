import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createEmptyFicha } from './helpers';
import { createProjectExcelWorkbook } from './excelExport';

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8l8AAAAASUVORK5CYII=';

function sampleFicha() {
  const ficha = createEmptyFicha();
  ficha.codigo = 'A-001';
  ficha.ambiente = 'Aula de prueba';
  ficha.bloque = 'Bloque A';
  ficha.nivel = 'Planta baja';
  ficha.largo = '4';
  ficha.ancho = '3';
  ficha.altura = '2.8';
  ficha.cons = [{
    id: 'cons-1', elemento: 'Piso', descripcion: 'Porcelanato', dimension: '60x60',
    cantidad: '12,50', unidad: 'm²', estado: 'Bueno', observacion: 'Sin novedades',
  }];
  ficha.pat = [{
    id: 'pat-1', elemento: 'Piso', patologia: 'Fisura', ubicacion: 'Zona norte',
    cantidad: '2,5', unidad: 'm²', severidad: 'Moderada', intervencion: 'Reparación localizada',
    referenciaOrigen: 'S3 · Detalle: Porcelanato',
  }];
  ficha.cuan = [{
    id: 'qty-1', codigo: '8.01', elemento: 'Piso', actividad: 'Reposición de porcelanato',
    cantidad: '2,5', unidad: 'm²', estado: 'Regular', prioridad: 'Media',
  }];
  ficha.fotos = [{ id: 'foto-1', src: ONE_PIXEL_PNG, desc: 'Fisura en piso' }];
  return ficha;
}

test('genera un libro con seis hojas técnicas y datos asociados al ambiente', () => {
  const ficha = sampleFicha();
  const workbook = createProjectExcelWorkbook(
    [ficha],
    { proyecto: 'Proyecto de prueba', ubicacion: 'Guayaquil', bloque: 'Bloque A' },
    true,
    new Date('2026-10-30T12:00:00Z'),
  );

  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ['Resumen', 'Ambientes', 'Inventario', 'Patologías', 'Cuantificación', 'Registro fotográfico'],
  );
  assert.equal(workbook.getWorksheet('Ambientes')?.getCell('A5').value, 'A-001');
  assert.equal(workbook.getWorksheet('Ambientes')?.getCell('J5').value, 12);
  assert.equal(workbook.getWorksheet('Inventario')?.getCell('J5').value, 12.5);
  assert.equal(workbook.getWorksheet('Patologías')?.getCell('I5').value, 'S3 · Detalle: Porcelanato');
  assert.equal(workbook.getWorksheet('Cuantificación')?.getCell('H5').value, 2.5);
  assert.equal(workbook.getWorksheet('Resumen')?.getCell('B17').value, 'POR VERIFICAR · existen observaciones pendientes');
  assert.equal(workbook.getWorksheet('Registro fotográfico')?.getCell('H5').value, 'Imagen insertada');
  assert.equal(workbook.getWorksheet('Registro fotográfico')?.getImages().length, 1);
});

test('la hoja de patologías no exporta la ubicación interna y el libro se puede volver a abrir', async () => {
  const workbook = createProjectExcelWorkbook(
    [sampleFicha()],
    { proyecto: 'Proyecto de prueba', ubicacion: 'Guayaquil', bloque: 'Bloque A' },
    false,
    new Date('2026-10-30T12:00:00Z'),
  );
  const pathologyHeaders = workbook.getWorksheet('Patologías')?.getRow(4).values as unknown[];
  assert.equal(pathologyHeaders.includes('Ubicación'), false);

  const buffer = await workbook.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(buffer);
  assert.equal(restored.worksheets.length, 6);
  assert.equal(restored.getWorksheet('Cuantificación')?.getCell('H5').value, 2.5);
  assert.equal(restored.getWorksheet('Registro fotográfico')?.getImages().length, 1);
});
