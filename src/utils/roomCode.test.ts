import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestNextAvailableCode } from './helpers';

test('sugiere el siguiente código y conserva prefijo y ceros a la izquierda', () => {
  assert.equal(
    suggestNextAvailableCode('A-009', [{ codigo: 'A-009' }]),
    'A-010',
  );
});

test('omite códigos ya utilizados y avanza hasta el primer consecutivo libre', () => {
  assert.equal(
    suggestNextAvailableCode('LAB-01', [
      { codigo: 'LAB-01' },
      { codigo: 'LAB-02' },
      { codigo: 'LAB-03' },
    ]),
    'LAB-04',
  );
});

test('no inventa una secuencia cuando el código no contiene un sufijo numérico', () => {
  assert.equal(suggestNextAvailableCode('LABORATORIO', [{ codigo: 'LABORATORIO' }]), '');
  assert.equal(suggestNextAvailableCode('', []), '');
});
