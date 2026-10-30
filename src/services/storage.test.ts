import test from 'node:test';
import assert from 'node:assert/strict';
import type { Ficha } from '../types';
import { readStoredFichas } from './storage';

test('un valor ausente representa una base de fichas nueva', async () => {
  const result = await readStoredFichas(async () => null);
  assert.deepEqual(result.storedFichas, []);
  assert.deepEqual(result.fichas, []);
});

test('una colección vacía se conserva como colección vacía', async () => {
  const result = await readStoredFichas(async () => []);
  assert.deepEqual(result.storedFichas, []);
  assert.deepEqual(result.fichas, []);
});

test('una falla de lectura se propaga y no se convierte en una colección vacía', async () => {
  await assert.rejects(
    () => readStoredFichas(async () => {
      throw new Error('IndexedDB no disponible');
    }),
    /No se pudieron leer las fichas.*IndexedDB no disponible/
  );
});

test('un valor almacenado con estructura inválida se rechaza', async () => {
  await assert.rejects(
    () => readStoredFichas(async () => ({ fichas: [] })),
    /formato válido/
  );
});

test('los datos fotográficos se mantienen al leer las fichas', async () => {
  const photoData = 'data:image/png;base64,AAECAwQFBgc=';
  const ficha = {
    id: 'F-TEST-01',
    fotos: [{ id: 'IMG-01', src: photoData, desc: 'Registro de prueba' }],
    obs: '',
    obsdim: '',
    diag: '',
    diagestado: '',
    estadoDimensional: '',
  } as Ficha;

  const result = await readStoredFichas(async () => [ficha]);
  assert.equal(result.fichas.length, 1);
  assert.equal(result.fichas[0].fotos[0].src, photoData);
  assert.equal(result.fichas[0].fotos[0].desc, 'Registro de prueba');
});
