import test from 'node:test';
import assert from 'node:assert/strict';
import type { Ficha } from '../types';
import { applyRoomTemplate, ROOM_TEMPLATES } from './roomTemplates';

const emptyLists: Pick<Ficha, 'cons' | 'equip' | 'elec' | 'hidro'> = {
  cons: [],
  equip: [],
  elec: [],
  hidro: [],
};

const deterministicId = (section: string, index: number) => `test-${section}-${index}`;

test('la plantilla de aula propone elementos en las secciones correctas', () => {
  const template = ROOM_TEMPLATES.find((item) => item.id === 'aula');
  assert.ok(template);

  const result = applyRoomTemplate(emptyLists, template, deterministicId);

  assert.equal(result.addedCount, 12);
  assert.equal(result.addedBySection.cons, 5);
  assert.equal(result.addedBySection.equip, 3);
  assert.equal(result.addedBySection.elec, 4);
  assert.equal(result.addedBySection.hidro, 0);
  assert.ok(result.patch.cons.some((row) => row.elemento === 'Piso'));
  assert.ok(result.patch.equip.some((row) => row.elemento === 'Pizarra'));
});

test('la plantilla deja cantidades, estados y observaciones sin inventar', () => {
  const template = ROOM_TEMPLATES.find((item) => item.id === 'laboratorio');
  assert.ok(template);

  const result = applyRoomTemplate(emptyLists, template, deterministicId);
  const row = result.patch.cons.find((item) => item.elemento === 'Piso');
  assert.ok(row);
  assert.equal(row.cantidad, '');
  assert.equal(row.estado, '');
  assert.equal(row.observacion, '');
});

test('la plantilla conserva datos existentes y agrega solo elementos faltantes', () => {
  const existing = {
    ...emptyLists,
    cons: [{
      id: 'manual-1',
      elemento: 'pIsO',
      descripcion: 'Porcelanato existente',
      dimension: '6 x 8',
      cantidad: '48.00',
      unidad: 'm²',
      estado: 'Regular',
      observacion: 'Con desgaste',
    }],
  };
  const template = ROOM_TEMPLATES.find((item) => item.id === 'aula');
  assert.ok(template);

  const result = applyRoomTemplate(existing, template, deterministicId);

  assert.equal(result.patch.cons.length, 5);
  assert.equal(result.patch.cons[0].id, 'manual-1');
  assert.equal(result.patch.cons[0].cantidad, '48.00');
  assert.equal(result.patch.cons[0].estado, 'Regular');
  assert.equal(result.addedBySection.cons, 4);
});
