// Conexão com o PostgreSQL (pool de conexões compartilhado pelos Repositories).
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'fluxo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

/**
 * Executa as instruções dentro de uma transação: BEGIN, (instruções), COMMIT.
 * Se algo falhar, faz ROLLBACK e repassa o erro. É o "salvar(obj) + commit"
 * do diagrama de sequência.
 */
async function emTransacao(funcao) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await funcao(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

module.exports = { pool, emTransacao };
