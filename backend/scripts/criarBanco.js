// Cria as tabelas executando database/01_criacao.sql no banco do .env.
// Uso: npm run db:criar   (o banco DB_NAME precisa existir: CREATE DATABASE fluxo;)
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', '01_criacao.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Tabelas criadas com sucesso.');
  } catch (erro) {
    console.error('Erro ao criar as tabelas:', erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
