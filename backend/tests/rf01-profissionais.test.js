// Testes de integração do login e do RF-01 contra um banco PostgreSQL de teste.
// Uso: crie o banco "fluxo_teste" (CREATE DATABASE fluxo_teste;) e rode "npm test".
// ATENÇÃO: o teste apaga e recria todas as tabelas do banco de TESTE.
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

async function api(metodo, rota, { token, corpo } = {}) {
  const resposta = await fetch(`${base}/api${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

async function entrar(login, senha) {
  const r = await api('POST', '/auth/login', { corpo: { login, senha } });
  return r.corpo.dados?.token;
}

before(async () => {
  if (!process.env.DB_NAME.endsWith('_teste')) throw new Error('Os testes só rodam em um banco terminado em _teste.');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database', '01_criacao.sql'), 'utf8'));
  const gerente = new Profissional({ nome: 'Margarete Teste', login: 'gerente', perfil: 'GERENTE' });
  await gerente.definirSenha('senha-gerente');
  await new ProfissionalRepository().salvar(gerente);
  servidor = app.listen(0);
  base = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  servidor?.close();
  await pool.end();
});

test('login com senha errada devolve MSGE-15 (401)', async () => {
  const r = await api('POST', '/auth/login', { corpo: { login: 'gerente', senha: 'errada123' } });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.codigo, 'MSGE-15');
});

test('login sem preencher os campos devolve MSGE-01 com o erro de cada campo', async () => {
  const r = await api('POST', '/auth/login', { corpo: {} });
  assert.equal(r.status, 400);
  assert.deepEqual(r.corpo.erros.map((e) => e.campo), ['login', 'senha']);
});

test('login do Gerente devolve token e perfil; login não diferencia maiúsculas', async () => {
  const r = await api('POST', '/auth/login', { corpo: { login: 'GERENTE', senha: 'senha-gerente' } });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.dados.profissional.perfil, 'GERENTE');
  assert.ok(r.corpo.dados.token);
  const eu = await api('GET', '/auth/eu', { token: r.corpo.dados.token });
  assert.equal(eu.corpo.dados.nome, 'Margarete Teste');
});

test('rota protegida sem token devolve MSGE-16 (401)', async () => {
  const r = await api('GET', '/profissionais');
  assert.equal(r.status, 401);
  assert.equal(r.corpo.codigo, 'MSGE-16');
});

test('RF-01 fluxo completo: cadastrar, consultar, editar, inativar e reativar', async () => {
  const token = await entrar('gerente', 'senha-gerente');

  // Cadastrar (MSGS-01) - a senha nunca volta na resposta
  const novo = { nome: 'Sirlene Atendente', login: 'sirlene', senha: '12345678', perfil: 'Atendente' };
  const c = await api('POST', '/profissionais', { token, corpo: novo });
  assert.equal(c.status, 201);
  assert.equal(c.corpo.codigo, 'MSGS-01');
  assert.equal(c.corpo.dados.perfil, 'ATENDENTE');
  assert.equal(c.corpo.dados.senha, undefined);
  assert.equal(c.corpo.dados.senhaHash, undefined);
  const id = c.corpo.dados.id;

  // Senha gravada com hash bcrypt (RN-03)
  const { rows } = await pool.query('SELECT senha_hash FROM profissional WHERE id = $1', [id]);
  assert.match(rows[0].senha_hash, /^\$2[aby]\$/);

  // Login duplicado, mesmo com maiúsculas (MSGE-05, 409)
  const dup = await api('POST', '/profissionais', { token, corpo: { ...novo, login: 'SIRLENE' } });
  assert.equal(dup.status, 409);
  assert.equal(dup.corpo.codigo, 'MSGE-05');

  // Consultar por nome sem acento e filtro de status
  const l = await api('GET', '/profissionais?busca=sirlene&status=ativos', { token });
  assert.equal(l.corpo.dados.length, 1);

  // Editar sem trocar a senha (MSGS-02); a senha antiga continua valendo
  const e = await api('PUT', `/profissionais/${id}`, { token, corpo: { nome: 'Sirlene A.', login: 'sirlene', perfil: 'ENTREGADOR' } });
  assert.equal(e.status, 200);
  assert.equal(e.corpo.codigo, 'MSGS-02');
  assert.equal(e.corpo.dados.perfil, 'ENTREGADOR');
  assert.ok(await entrar('sirlene', '12345678'));

  // Inativar (MSGS-03): não consegue mais entrar e o token antigo perde a validade (RN-05)
  const tokenSirlene = await entrar('sirlene', '12345678');
  const i = await api('PATCH', `/profissionais/${id}/inativar`, { token });
  assert.equal(i.corpo.codigo, 'MSGS-03');
  assert.equal(await entrar('sirlene', '12345678'), undefined);
  assert.equal((await api('GET', '/auth/eu', { token: tokenSirlene })).status, 401);

  // Reativar (MSGS-04)
  const r = await api('PATCH', `/profissionais/${id}/reativar`, { token });
  assert.equal(r.corpo.codigo, 'MSGS-04');
  assert.ok(await entrar('sirlene', '12345678'));
});

test('RF-01 validações: obrigatórios (MSGE-02), senha curta (MSGE-06) e login fora do formato (MSGE-07)', async () => {
  const token = await entrar('gerente', 'senha-gerente');
  const vazio = await api('POST', '/profissionais', { token, corpo: {} });
  assert.equal(vazio.status, 400);
  assert.equal(vazio.corpo.codigo, 'MSGE-01');
  assert.deepEqual(vazio.corpo.erros.map((x) => x.campo), ['nome', 'login', 'senha', 'perfil']);

  const formato = await api('POST', '/profissionais', {
    token, corpo: { nome: 'Teste', login: 'joão silva', senha: '123', perfil: 'GERENTE' },
  });
  assert.deepEqual(formato.corpo.erros.map((x) => x.codigo), ['MSGE-07', 'MSGE-06']);
});

test('RF-01 é só do Gerente: Atendente e Entregador recebem MSGE-17 (403)', async () => {
  const gerente = await entrar('gerente', 'senha-gerente');
  for (const [login, perfil] of [['thiago', 'ENTREGADOR'], ['ana', 'ATENDENTE']]) {
    await api('POST', '/profissionais', { token: gerente, corpo: { nome: login, login, senha: '12345678', perfil } });
    const token = await entrar(login, '12345678');
    const r = await api('GET', '/profissionais', { token });
    assert.equal(r.status, 403, perfil);
    assert.equal(r.corpo.codigo, 'MSGE-17');
  }
});

test('id inexistente devolve 404', async () => {
  const token = await entrar('gerente', 'senha-gerente');
  const r = await api('PATCH', '/profissionais/99999/inativar', { token });
  assert.equal(r.status, 404);
});
