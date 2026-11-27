// Testes de integração do RF-02 (Manter Beneficiários) contra o banco de teste.
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
const Beneficiario = require('../src/entities/Beneficiario');
const ProfissionalRepository = require('../src/repositories/ProfissionalRepository');

// CPFs fictícios com dígitos verificadores corretos (exemplos públicos de validação)
const CPF_A = '529.982.247-25';
const CPF_B = '111.444.777-35';

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

const maria = {
  nome: 'Maria das Dores Teste', cpf: CPF_A, telefone: '(62) 99999-0001',
  endereco: 'Rua Fictícia, 100', bairro: 'Centro',
};

before(async () => {
  if (!process.env.DB_NAME.endsWith('_teste')) throw new Error('Os testes só rodam em um banco terminado em _teste.');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'database', '01_criacao.sql'), 'utf8'));
  servidor = app.listen(0);
  base = `http://localhost:${servidor.address().port}`;
  await criarProfissional('gerente', 'GERENTE');
  await criarProfissional('atendente', 'ATENDENTE');
});

after(async () => {
  servidor?.close();
  await pool.end();
});

test('RN-08: validação dos dígitos verificadores do CPF', () => {
  assert.equal(Beneficiario.cpfValido('52998224725'), true);
  assert.equal(Beneficiario.cpfValido('11144477735'), true);
  assert.equal(Beneficiario.cpfValido('52998224724'), false);
  assert.equal(Beneficiario.cpfValido('11111111111'), false);
  assert.equal(Beneficiario.cpfValido('123'), false);
});

test('RN-07: campos vazios e telefone incompleto devolvem MSGE-01 com o erro de cada campo', async () => {
  const r = await api('POST', '/beneficiarios', {
    token: tokens.GERENTE, corpo: { nome: ' ', cpf: CPF_A, telefone: '6299', endereco: '', bairro: 'Centro' },
  });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.codigo, 'MSGE-01');
  const porCampo = Object.fromEntries(r.corpo.erros.map((e) => [e.campo, e.codigo]));
  assert.deepEqual(porCampo, { nome: 'MSGE-02', endereco: 'MSGE-02', telefone: 'MSGE-08' });
});

test('RN-08: CPF com dígito errado devolve MSGE-03', async () => {
  const r = await api('POST', '/beneficiarios', { token: tokens.GERENTE, corpo: { ...maria, cpf: '529.982.247-24' } });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erros[0].codigo, 'MSGE-03');
});

test('RF-02 fluxo completo: cadastrar, CPF duplicado, consultar, editar e inativar', async () => {
  // Cadastrar (MSGS-05): CPF e telefone gravados sem máscara e devolvidos com máscara
  const c = await api('POST', '/beneficiarios', { token: tokens.GERENTE, corpo: maria });
  assert.equal(c.status, 201);
  assert.equal(c.corpo.codigo, 'MSGS-05');
  assert.equal(c.corpo.dados.cpf, CPF_A);
  assert.equal(c.corpo.dados.telefone, '(62) 99999-0001');
  const { rows } = await pool.query('SELECT cpf, telefone FROM beneficiario WHERE id = $1', [c.corpo.dados.id]);
  assert.deepEqual(rows[0], { cpf: '52998224725', telefone: '62999990001' });
  const id = c.corpo.dados.id;

  // RN-09: CPF duplicado, mesmo digitado sem máscara (MSGE-04, 409)
  const dup = await api('POST', '/beneficiarios', {
    token: tokens.GERENTE, corpo: { ...maria, nome: 'Outra Pessoa', cpf: '52998224725' },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.corpo.codigo, 'MSGE-04');

  // Segundo beneficiário para testar a busca
  const joao = await api('POST', '/beneficiarios', {
    token: tokens.GERENTE,
    corpo: { nome: 'João Teste', cpf: CPF_B, telefone: '6233330000', endereco: 'Av. Exemplo, 5', bairro: 'Vila São José' },
  });
  assert.equal(joao.status, 201);
  assert.equal(joao.corpo.dados.telefone, '(62) 3333-0000');

  // Consultar: busca por nome sem acento, por bairro e por parte do CPF
  const porNome = await api('GET', '/beneficiarios?busca=joao', { token: tokens.GERENTE });
  assert.deepEqual(porNome.corpo.dados.map((b) => b.nome), ['João Teste']);
  const porBairro = await api('GET', '/beneficiarios?busca=sao jose', { token: tokens.GERENTE });
  assert.equal(porBairro.corpo.dados.length, 1);
  const porCpf = await api('GET', `/beneficiarios?busca=${encodeURIComponent('529.982')}`, { token: tokens.GERENTE });
  assert.deepEqual(porCpf.corpo.dados.map((b) => b.id), [id]);

  // Editar (MSGS-06): manter o próprio CPF não é duplicidade (RN-09)
  const e = await api('PUT', `/beneficiarios/${id}`, { token: tokens.GERENTE, corpo: { ...maria, bairro: 'Jardim Esperança' } });
  assert.equal(e.status, 200);
  assert.equal(e.corpo.codigo, 'MSGS-06');
  assert.equal(e.corpo.dados.bairro, 'Jardim Esperança');

  // Editar para o CPF de outro beneficiário: MSGE-04
  const e2 = await api('PUT', `/beneficiarios/${id}`, { token: tokens.GERENTE, corpo: { ...maria, cpf: CPF_B } });
  assert.equal(e2.status, 409);

  // Inativar (MSGS-07, RN-10) e filtrar por status
  const i = await api('PATCH', `/beneficiarios/${id}/inativar`, { token: tokens.GERENTE });
  assert.equal(i.corpo.codigo, 'MSGS-07');
  assert.equal(i.corpo.dados.status, 'Inativo');
  const ativos = await api('GET', '/beneficiarios?status=ativos', { token: tokens.GERENTE });
  assert.deepEqual(ativos.corpo.dados.map((b) => b.nome), ['João Teste']);
  const inativos = await api('GET', '/beneficiarios?status=inativos', { token: tokens.GERENTE });
  assert.deepEqual(inativos.corpo.dados.map((b) => b.id), [id]);
});

test('Atendente consulta beneficiários, mas não cadastra (MSGE-17)', async () => {
  const lista = await api('GET', '/beneficiarios', { token: tokens.ATENDENTE });
  assert.equal(lista.status, 200);
  assert.ok(lista.corpo.dados.length >= 1);
  const r = await api('POST', '/beneficiarios', { token: tokens.ATENDENTE, corpo: maria });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.codigo, 'MSGE-17');
});

test('beneficiário inexistente devolve 404', async () => {
  const r = await api('GET', '/beneficiarios/9999', { token: tokens.GERENTE });
  assert.equal(r.status, 404);
});
