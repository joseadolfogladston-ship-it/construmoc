'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../site/marketing-core.js');

test('portfolio 3 x 2 e seis ideias, sem resultados fabricados', () => {
  assert.equal(Core.BUSINESSES.length, 3);
  assert.equal(Core.CHANNELS.length, 6);
  assert.equal(new Set(Core.CHANNELS.map(x => x.id)).size, 6);
  for (const business of Core.BUSINESSES) {
    assert.equal(Core.CHANNELS.filter(c => c.business === business.id).length, 2);
  }
  const seeded = Core.makeInitialCampaigns();
  assert.equal(seeded.length, 6);
  assert.ok(seeded.every(x => Core.validCampaign(x) && x.status === 'ideia'));
  const result = Core.summary(seeded);
  assert.equal(result.sales, 0);
  assert.equal(result.leads, 0);
  assert.equal(result.revenueCents, 0);
  assert.equal(result.roi, null);
});

test('gerador prepara texto editável e não o publica', () => {
  for (const {id} of Core.CHANNELS) {
    const draft = Core.generateIdea(id);
    assert.equal(draft.status, 'rascunho');
    assert.ok(draft.content.length >= 20);
    assert.ok(draft.title.length >= 3);
  }
  assert.throws(() => Core.generateIdea('canal_inexistente'), /Canal não encontrado/);
});

test('data valida calendário real e entrada opcional', () => {
  assert.equal(Core.isValidLocalDateTime(''), true);
  assert.equal(Core.isValidLocalDateTime('2028-02-29T18:05'), true);
  assert.equal(Core.isValidLocalDateTime('2027-02-29T18:05'), false);
  assert.equal(Core.isValidLocalDateTime('2026-13-28T09:30'), false);
  assert.equal(Core.isValidLocalDateTime('2026-10-28T25:05'), false);
  assert.equal(Core.isValidLocalDateTime('28/10/2026 09:30'), false);
});

test('montantes aceitam vírgula ou ponto e rejeitam valores ambíguos', () => {
  assert.equal(Core.moneyToCents('1,50'), 150);
  assert.equal(Core.moneyToCents('10.25'), 1025);
  assert.equal(Core.moneyToCents('0'), 0);
  assert.equal(Core.moneyToCents(' 1 500,00 '), 150000);
  assert.throws(() => Core.moneyToCents('1.500,00'));
  assert.throws(() => Core.moneyToCents('-2,00'));
  assert.throws(() => Core.moneyToCents('2,999'));
  assert.throws(() => Core.moneyToCents('Infinity'));
});

test('backup valida limites e impede linhas duplicadas ou inventadas', () => {
  const base = Core.makeInitialCampaigns();
  assert.equal(Core.validateBackup({version:1,campaigns:base}).length, 6);
  assert.throws(() => Core.validateBackup({version:2,campaigns:base}));
  assert.throws(() => Core.validateBackup({version:1,campaigns:[...base,base[0]]}),/repetidos/);
  assert.throws(() => Core.validateBackup({version:1,campaigns:Array.from({length:301},(_,i)=>({...base[0],id:'unique-'+i}))}));
  assert.throws(() => Core.validateBackup({version:1,campaigns:[{...base[0],status:'enviado_automaticamente'}]}));
  assert.throws(() => Core.validateBackup({version:1,campaigns:[{...base[0],metrics:{...base[0].metrics,views:-3}}]}));
  assert.throws(() => Core.validateBackup({version:1,campaigns:[{...base[0],scheduledAt:'2026-02-30T11:00'}]}));
});

test('indicadores só reflectem valores fornecidos no registo', () => {
  const base = Core.makeInitialCampaigns();
  base[0].status = 'publicado';
  base[0].metrics = {views:100,leads:12,sales:3,revenueCents:60000,costCents:25000};
  base[1].status = 'aprovado';
  base[1].metrics = {views:50,leads:2,sales:0,revenueCents:0,costCents:0};
  const k = Core.summary(base);
  assert.equal(k.approved, 1);
  assert.equal(k.published, 1);
  assert.equal(k.views, 150);
  assert.equal(k.sales, 3);
  assert.equal(k.profitCents, 35000);
  assert.ok(Math.abs(k.leadRate - (14/150*100)) < 0.001);
  assert.equal(k.roi, 140);
});

test('CSV protege texto de fórmulas e preserva títulos com aspas', () => {
  const base = Core.makeInitialCampaigns();
  base[0].title = '=HYPERLINK("https://example.org","abrir")';
  base[0].content = '+somar';
  const csv = Core.csvExport(base);
  assert.match(csv, /^﻿"ID";"Negócio";/);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.org"",""abrir"")"'));
  assert.ok(csv.includes('"\'\+somar"'));
  assert.ok(csv.includes('0,00'));
});
