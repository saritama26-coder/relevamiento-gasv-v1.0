import test from 'node:test';
import assert from 'node:assert/strict';
import type { Ficha } from '../types';
import {
  collectPathologyTransferCandidates,
  createPathologyRowsFromCandidates,
  normalizePathologySourceReference,
} from './pathologyTransfer';

const base = {
  cons: [],
  equip: [],
  elec: [],
  hidro: [],
  pat: [],
} as unknown as Pick<Ficha, 'cons' | 'equip' | 'elec' | 'hidro' | 'pat'>;

test('detecta elementos Regular/Malo/Crítico y observaciones informativas en secciones 3 a 6', () => {
  const ficha = {
    ...base,
    cons: [
      { id: 'c1', elemento: 'Paredes', estado: 'Malo', cantidad: '30.00', unidad: 'm²', observacion: 'Humedad en esquina' },
      { id: 'c2', elemento: 'Piso', estado: 'Bueno', cantidad: '20.00', unidad: 'm²', observacion: 'Sin novedades' },
      { id: 'c3', elemento: 'Puerta', estado: 'Regular', cantidad: '1.00', unidad: 'u', observacion: '' },
      { id: 'c4', elemento: 'Ventana', estado: 'Bueno', descripcion: 'Ventana de aluminio', cantidad: '2.00', unidad: 'u', observacion: '' },
      { id: 'c5', elemento: 'Pared lateral', estado: 'Bueno', cantidad: '10.00', unidad: 'm²', observacion: 'Fisura superficial en esquina' },
    ],
    elec: [
      { id: 'e1', elemento: 'Tomacorriente', estado: 'Crítico', cantidad: '2.00', unidad: 'u', observacion: 'Carcasa rota' },
    ],
  } as unknown as typeof base;

  const candidates = collectPathologyTransferCandidates(ficha);
  assert.equal(candidates.length, 4);
  assert.deepEqual(candidates.map((item) => item.key), ['gasv:cons:c1', 'gasv:cons:c3', 'gasv:cons:c5', 'gasv:elec:e1']);
});

test('no genera candidatos por elementos en buen estado sin observaciones', () => {
  const ficha = {
    ...base,
    hidro: [
      { id: 'h1', elemento: 'Lavamanos', estado: 'Bueno', cantidad: '2.00', unidad: 'u', observacion: '' },
      { id: 'h2', elemento: 'Grifería', estado: '', cantidad: '1.00', unidad: 'u', observacion: 'Sin observaciones' },
    ],
  } as unknown as typeof base;

  assert.equal(collectPathologyTransferCandidates(ficha).length, 0);
});

test('omite fuentes ya transferidas y no duplica la misma fila de inventario', () => {
  const ficha = {
    ...base,
    cons: [{ id: 'c1', elemento: 'Paredes', estado: 'Malo', cantidad: '30.00', unidad: 'm²', observacion: 'Humedad' }],
    pat: [{ id: 'p1', elemento: 'Paredes', origenKey: 'gasv:cons:c1' }],
  } as unknown as typeof base;

  assert.equal(collectPathologyTransferCandidates(ficha).length, 0);
});

test('precarga cantidad y unidad del inventario, mantiene pendientes los campos de diagnóstico y simplifica la referencia', () => {
  const ficha = {
    ...base,
    cons: [{
      id: 'c1',
      elemento: 'Cerámica',
      descripcion: 'Cerámica 30x30 cm',
      estado: 'Regular',
      cantidad: '188.73',
      unidad: 'm²',
      observacion: 'Severo desgaste',
    }],
  } as unknown as typeof base;
  const candidates = collectPathologyTransferCandidates(ficha);
  const rows = createPathologyRowsFromCandidates(candidates, [candidates[0].key], () => 'pat-test');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].elemento, 'Cerámica');
  assert.equal(rows[0].unidad, 'm²');
  assert.equal(rows[0].cantidad, '188.73');
  assert.equal(rows[0].patologia, '');
  assert.equal(rows[0].ubicacion, '');
  assert.equal(rows[0].severidad, '');
  assert.equal(rows[0].intervencion, '');
  assert.equal(rows[0].id, 'pat-test');
  assert.equal(rows[0].referenciaOrigen, 'S3 · Detalle: Cerámica 30x30 cm');
  assert.doesNotMatch(rows[0].referenciaOrigen || '', /Severo desgaste/);
  assert.doesNotMatch(rows[0].referenciaOrigen || '', /Estado registrado|Cantidad inventariada/);
});

test('cuando no existe detalle descriptivo, conserva únicamente el número de sección', () => {
  const ficha = {
    ...base,
    equip: [{
      id: 'eq1',
      elemento: 'Escritorio',
      estado: 'Malo',
      cantidad: '4.00',
      unidad: 'u',
      observacion: '',
    }],
  } as unknown as typeof base;
  const candidates = collectPathologyTransferCandidates(ficha);
  const rows = createPathologyRowsFromCandidates(candidates, [candidates[0].key], () => 'pat-eq');

  assert.equal(rows[0].referenciaOrigen, 'S4');
  assert.equal(rows[0].cantidad, '4.00');
  assert.equal(rows[0].unidad, 'u');
});


test('normaliza referencias antiguas y elimina el texto de observación posterior al detalle', () => {
  assert.equal(
    normalizePathologySourceReference('Sección 3 · Detalle: Ceramica 30x30 cm · Severo desgaste'),
    'S3 · Detalle: Ceramica 30x30 cm',
  );
  assert.equal(normalizePathologySourceReference('Sección 4'), 'S4');
  assert.equal(normalizePathologySourceReference('Referencia externa'), 'Referencia externa');
});
