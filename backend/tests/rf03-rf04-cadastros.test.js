// Testes de integração do RF-03 (Situações de Risco) e do RF-04 (Tipos de Benefício).
// Uso: "npm test" (o banco "fluxo_teste" é apagado e recriado). Dados fictícios.
process.env.DB_NAME = process.env.DB_NAME_TESTE || 'fluxo_teste';
process.env.JWT_SEGREDO = 'segredo-de-teste';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
const app = require('../src/app');
const Profissional = require('../src/entities/Profissional');
const ProfissionalRepository = require('../src/repositories/ProfissionalRepository');

let servidor;
let base;
const tokens = {};

async function api(metodo, rota, { token, corpo } = {}) {
  const resposta = await fetch(`${base}/api${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

async function criarProfissional(login, perfil) {
  const p = new Profissional({ nome: `Teste ${perfil}`, login, perfil });
  await p.definirSenha('senha-teste');
  await new ProfissionalRepository().salvar(p);
  const r = await api('POST', '/auth/login', { corpo: { login, senha: 'senha-teste' } });
  tokens[perfil] = r.corpo.dados.token;
}

before(async () => {
  if (!process.env.DB_NAME.endsWith('_teste')) throw new Error('Os testes só rodam em um banco terminado em _teste.');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database', '01_criacao.sql'), 'utf8'));
  servidor = app.listen(0);
  base = `http://localhost:${servidor.address().port}`;
  await criarProfissional('gerente', 'GERENTE');
  await criarProfissional('entregador', 'ENTREGADOR');
});

after(async () => {
  servidor?.close();
  await pool.end();
});

// ------------------------------------------------------------------ RF-03
test('RN-12 e RN-14: nome e concessão obrigatórios; Recorrente exige 2 a 24 meses', async () => {
  const vazio = await api('POST', '/situacoes-risco', { token: tokens.GERENTE, corpo: {} });
  assert.equal(vazio.status, 400);
  assert.deepEqual(vazio.corpo.erros.map((e) => e.campo), ['nome', 'concessao']);

  const semMeses = await api('POST', '/situacoes-risco', {
    token: tokens.GERENTE, corpo: { nome: 'Desemprego', concessao: 'Recorrente' },
  });
  assert.deepEqual(semMeses.corpo.erros.map((e) => [e.campo, e.codigo]), [['qtdMeses', 'MSGE-02']]);

  for (const qtdMeses of [1, 25, 2.5, 'abc']) {
    const r = await api('POST', '/situacoes-risco', {
      token: tokens.GERENTE, corpo: { nome: 'Desemprego', concessao: 'RECORRENTE', qtdMeses },
    });
    assert.equal(r.status, 400, `qtdMeses = ${qtdMeses}`);
    assert.equal(r.corpo.erros[0].codigo, 'MSGE-09');
  }
});

test('RF-03 fluxo completo: cadastrar, nome repetido, editar, inativar e reativar', async () => {
  // Único: a quantidade de meses é ignorada mesmo que venha preenchida (RN-14)
  const unico = await api('POST', '/situacoes-risco', {
    token: tokens.GERENTE, corpo: { nome: 'Calamidade Pública', concessao: 'Único', qtdMeses: 6 },
  });
  assert.equal(unico.status, 201);
  assert.equal(unico.corpo.codigo, 'MSGS-08');
  assert.equal(unico.corpo.dados.concessao, 'UNICO');
  assert.equal(unico.corpo.dados.qtdMeses, null);

  const rec = await api('POST', '/situacoes-risco', {
    token: tokens.GERENTE, corpo: { nome: 'Desemprego', concessao: 'Recorrente', qtdMeses: '3' },
  });
  assert.equal(rec.status, 201);
  assert.equal(rec.corpo.dados.concessaoTexto, 'Recorrente (3 meses)');

  // RN-13: nome repetido sem diferenciar maiúsculas e acentos
  const dup = await api('POST', '/situacoes-risco', {
    token: tokens.GERENTE, corpo: { nome: 'CALAMIDADE publica', concessao: 'UNICO' },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.corpo.codigo, 'MSGE-10');
  assert.equal(dup.corpo.texto, 'Já existe uma situação de risco com este nome.');

  // Editar: Recorrente vira Único e perde os meses (MSGS-09)
  const id = rec.corpo.dados.id;
  const ed = await api('PUT', `/situacoes-risco/${id}`, {
    token: tokens.GERENTE, corpo: { nome: 'Desemprego', concessao: 'UNICO', qtdMeses: 3 },
  });
  assert.equal(ed.corpo.codigo, 'MSGS-09');
  assert.equal(ed.corpo.dados.qtdMeses, null);

  // Inativar (MSGS-10) e reativar (MSGS-11) - RN-15
  const ina = await api('PATCH', `/situacoes-risco/${id}/inativar`, { token: tokens.GERENTE });
  assert.equal(ina.corpo.codigo, 'MSGS-10');
  const ativos = await api('GET', '/situacoes-risco?status=ativos', { token: tokens.GERENTE });
  assert.deepEqual(ativos.corpo.dados.map((s) => s.nome), ['Calamidade Pública']);
  const rea = await api('PATCH', `/situacoes-risco/${id}/reativar`, { token: tokens.GERENTE });
  assert.equal(rea.corpo.codigo, 'MSGS-11');
  assert.equal(rea.corpo.dados.status, 'Ativo');

  // Busca sem acento
  const busca = await api('GET', '/situacoes-risco?busca=publica', { token: tokens.GERENTE });
  assert.equal(busca.corpo.dados.length, 1);
});

// ------------------------------------------------------------------ RF-04
test('RF-04 fluxo completo: cadastrar, nome repetido ignorando acento, editar, inativar e reativar', async () => {
  const vazio = await api('POST', '/tipos-beneficio', { token: tokens.GERENTE, corpo: { nome: '  ' } });
  assert.equal(vazio.status, 400);
  assert.equal(vazio.corpo.erros[0].codigo, 'MSGE-02');

  const c = await api('POST', '/tipos-beneficio', {
    token: tokens.GERENTE, corpo: { nome: 'Cesta Básica', descricao: 'Kit de alimentos' },
  });
  assert.equal(c.status, 201);
  assert.equal(c.corpo.codigo, 'MSGS-12');
  const id = c.corpo.dados.id;

  const dup = await api('POST', '/tipos-beneficio', { token: tokens.GERENTE, corpo: { nome: 'cesta basica' } });
  assert.equal(dup.status, 409);
  assert.equal(dup.corpo.texto, 'Já existe um tipo de benefício com este nome.');

  // Editar mantendo o próprio nome não é duplicidade (MSGS-13)
  const ed = await api('PUT', `/tipos-beneficio/${id}`, {
    token: tokens.GERENTE, corpo: { nome: 'Cesta Básica', descricao: 'Kit de alimentos para um mês' },
  });
  assert.equal(ed.corpo.codigo, 'MSGS-13');

  const ina = await api('PATCH', `/tipos-beneficio/${id}/inativar`, { token: tokens.GERENTE });
  assert.equal(ina.corpo.codigo, 'MSGS-14');
  const rea = await api('PATCH', `/tipos-beneficio/${id}/reativar`, { token: tokens.GERENTE });
  assert.equal(rea.corpo.codigo, 'MSGS-15');
});

test('RN-16: Entregador consulta as listas, mas não cadastra (MSGE-17)', async () => {
  const s = await api('GET', '/situacoes-risco', { token: tokens.ENTREGADOR });
  const t = await api('GET', '/tipos-beneficio', { token: tokens.ENTREGADOR });
  assert.equal(s.status, 200);
  assert.equal(t.status, 200);
  const r = await api('POST', '/tipos-beneficio', { token: tokens.ENTREGADOR, corpo: { nome: 'Aluguel Social' } });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.codigo, 'MSGE-17');
  const r2 = await api('PATCH', '/situacoes-risco/1/inativar', { token: tokens.ENTREGADOR });
  assert.equal(r2.status, 403);
});
