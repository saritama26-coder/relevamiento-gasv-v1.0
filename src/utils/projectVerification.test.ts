import test from 'node:test';
import assert from 'node:assert/strict';
import type { Ficha } from '../types';
import { getProjectVerificationChecklist } from './helpers';

function makeFicha(overrides: Partial<Ficha> = {}): Ficha {
  const base: Ficha = {
    id: 'F-001',
    proyecto: 'Proyecto de prueba',
    ubicacion: 'Campus',
    bloque: 'Bloque A',
    nivel: 'Planta baja',
    ambiente: 'Aula 1',
    codigo: 'A-001',
    fecha: '2026-10-29',
    responsable: '',
    geometria: 'regular',
    largo: '10',
    ancho: '5',
    altura: '3',
    areaDirecta: '',
    estadoDimensional: 'Bueno',
    obsdim: '',
    cons: [],
    equip: [],
    elec: [],
    hidro: [],
    pat: [],
    cuan: [{
      id: 'Q-001',
      codigo: 'A-001',
      elemento: 'Piso',
      actividad: 'Reposición de piso cerámico',
      cantidad: '50.00',
      unidad: 'm²',
      estado: 'Bueno',
      prioridad: 'Baja',
    }],
    fotos: [],
    diagestado: 'Bueno',
    interv: '',
    diag: '',
    obs: '',
    fir1: '',
    fir2: '',
    fir3: '',
    fir4: '',
    updatedAt: '2026-10-29T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

test('compara el área del ambiente solo con partidas de piso, no con pintura de paredes', () => {
  const ficha = makeFicha({
    cuan: [
      {
        id: 'Q-PISO', codigo: 'A-001', elemento: 'Piso',
        actividad: 'Reposición de cerámica en piso', cantidad: '50.00',
        unidad: 'm²', estado: 'Bueno', prioridad: 'Baja',
      },
      {
        id: 'Q-PINTURA', codigo: 'A-001', elemento: 'Pintura de paredes',
        actividad: 'Pintura interior', cantidad: '90.00',
        unidad: 'm²', estado: 'Bueno', prioridad: 'Baja',
      },
    ],
  });

  const result = getProjectVerificationChecklist([ficha]);
  const areaItem = result.items.find((item) => item.id === 'area-seccion8');

  assert.ok(areaItem);
  assert.equal(areaItem.status, 'ok');
  assert.equal(areaItem.count, 0);
  assert.equal(result.hasPending, false);
});

test('reporta diferencia por ambiente con valores registrados y acción correctiva', () => {
  const ficha = makeFicha({
    cuan: [{
      id: 'Q-PISO', codigo: 'A-001', elemento: 'Piso',
      actividad: 'Reposición de piso', cantidad: '47.50',
      unidad: 'm²', estado: 'Bueno', prioridad: 'Baja',
    }],
  });

  const result = getProjectVerificationChecklist([ficha]);
  const finding = result.items.find((item) => item.id === 'area-seccion8')?.findings[0];

  assert.ok(finding);
  assert.equal(finding.severity, 'warning');
  assert.match(finding.detail, /Área dimensional: 50\.00 m²/);
  assert.match(finding.detail, /Cuantificación de piso: 47\.50 m²/);
  assert.match(finding.detail, /Diferencia absoluta: 2\.50 m²/);
  assert.match(finding.action, /Sección 2/);
  assert.equal(finding.fichaId, 'F-001');
});

test('marca como informativo cuando no existe una partida de piso comparable', () => {
  const ficha = makeFicha({
    cuan: [{
      id: 'Q-PINTURA', codigo: 'A-001', elemento: 'Pintura de paredes',
      actividad: 'Pintura interior', cantidad: '90.00',
      unidad: 'm²', estado: 'Bueno', prioridad: 'Baja',
    }],
  });

  const result = getProjectVerificationChecklist([ficha]);
  const areaItem = result.items.find((item) => item.id === 'area-seccion8');

  assert.ok(areaItem);
  assert.equal(areaItem.status, 'info');
  assert.equal(areaItem.findings[0].severity, 'info');
  assert.equal(result.hasPending, false);
  assert.match(areaItem.findings[0].detail, /No se encontró una partida identificable de piso/);
});

test('reporta unidades no comparables en partidas identificadas como piso', () => {
  const ficha = makeFicha({
    cuan: [{
      id: 'Q-PISO', codigo: 'A-001', elemento: 'Piso',
      actividad: 'Reposición de piso', cantidad: '20',
      unidad: 'u', estado: 'Bueno', prioridad: 'Baja',
    }],
  });

  const result = getProjectVerificationChecklist([ficha]);
  const areaItem = result.items.find((item) => item.id === 'area-seccion8');

  assert.ok(areaItem);
  assert.equal(areaItem.status, 'warning');
  assert.match(areaItem.findings[0].detail, /unidad registrada es "u"/);
});

test('detecta diferencias de estados sin depender de mayúsculas o tildes', () => {
  const ficha = makeFicha({ estadoDimensional: 'Bueno', diagestado: 'Malo' });
  const result = getProjectVerificationChecklist([ficha]);
  const item = result.items.find((entry) => entry.id === 'estados-coherencia');

  assert.ok(item);
  assert.equal(item.status, 'warning');
  assert.equal(item.findings.length, 1);
  assert.match(item.findings[0].detail, /Bueno/);
  assert.match(item.findings[0].detail, /Malo/);
});

test('identifica cada fotografía que carece de descripción técnica', () => {
  const ficha = makeFicha({
    fotos: [
      { id: 'IMG-01', src: 'data:image/png;base64,AA==', desc: '' },
      { id: 'IMG-02', src: 'data:image/png;base64,AA==', desc: 'Fisura en muro norte' },
      { id: 'IMG-03', src: 'data:image/png;base64,AA==', desc: '   ' },
    ],
  });
  const result = getProjectVerificationChecklist([ficha]);
  const item = result.items.find((entry) => entry.id === 'fotos-sin-desc');

  assert.ok(item);
  assert.equal(item.count, 2);
  assert.match(item.findings[0].detail, /IMG-01/);
  assert.match(item.findings[1].detail, /IMG-03/);
  assert.equal(item.findings[0].section, 'Sección 9 · Registro fotográfico');
});

test('identifica por separado código, ambiente y cuantificación incompletos', () => {
  const ficha = makeFicha({
    codigo: '',
    ambiente: '',
    cuan: [],
  });
  const result = getProjectVerificationChecklist([ficha]);
  const item = result.items.find((entry) => entry.id === 'ambientes-incompletos');

  assert.ok(item);
  assert.equal(item.status, 'error');
  assert.equal(item.findings.length, 3);
  assert.ok(item.findings.some((finding) => /no tiene código/.test(finding.detail)));
  assert.ok(item.findings.some((finding) => /no tiene nombre de ambiente/.test(finding.detail)));
  assert.ok(item.findings.some((finding) => /no contiene registros de cuantificación/.test(finding.detail)));
  assert.equal(result.errorCount, 2);
  assert.equal(result.warningCount, 1);
  assert.equal(result.pendingCount, 3);
  assert.equal(result.affectedFichaCount, 1);
});

test('considera incompleta una cuantificación parcial sin cantidad positiva y unidad', () => {
  const ficha = makeFicha({
    cuan: [{
      id: 'Q-PARCIAL', codigo: 'A-001', elemento: 'Piso',
      actividad: 'Reposición de piso', cantidad: '',
      unidad: '', estado: '', prioridad: '',
    }],
  });
  const result = getProjectVerificationChecklist([ficha]);
  const item = result.items.find((entry) => entry.id === 'ambientes-incompletos');

  assert.ok(item);
  assert.equal(item.status, 'error');
  assert.match(item.findings[0].detail, /ninguna tiene elemento, trabajo, cantidad positiva y unidad completos/);
});

test('no modifica las fichas ni los registros fotográficos al ejecutar controles', () => {
  const ficha = makeFicha({
    fotos: [{ id: 'IMG-01', src: 'data:image/png;base64,AA==', desc: '' }],
  });
  const snapshot = JSON.stringify(ficha);

  getProjectVerificationChecklist([ficha]);

  assert.equal(JSON.stringify(ficha), snapshot);
});
