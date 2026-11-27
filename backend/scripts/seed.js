// Cria o primeiro Gerente, para que alguém consiga entrar e cadastrar os demais.
// Só roda se a tabela profissional estiver vazia.
// Uso: npm run seed   (login e senha vêm de SEED_LOGIN e SEED_SENHA no .env)
require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/database');
const ProfissionalRepository = require('../src/repositories/ProfissionalRepository');
const Profissional = require('../src/entities/Profissional');

(async () => {
  const repository = new ProfissionalRepository();
  try {
    if ((await repository.contar()) > 0) {
      console.log('Já existem profissionais cadastrados. Nada foi feito.');
      return;
    }
    const login = process.env.SEED_LOGIN || 'gerente';
    const senha = process.env.SEED_SENHA || 'fluxo2026';
    const obj = new Profissional({ nome: 'Gerente Inicial', login, perfil: 'GERENTE' });
    await obj.definirSenha(senha);
    await repository.salvar(obj);
    console.log(`Gerente inicial criado. Login: ${login}. Troque a senha pela tela de Profissionais (Editar).`);
  } catch (erro) {
    console.error('Erro no seed:', erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
