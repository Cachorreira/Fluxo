// Repository do Profissional: única camada que conversa com o banco (tabela "profissional").
const { pool, emTransacao } = require('../config/database');
const Profissional = require('../entities/Profissional');

const COLUNAS = 'id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em';

class ProfissionalRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** RN-02: verifica se o login já existe (sem diferenciar maiúsculas). Na edição, ignora o próprio registro. */
  async validaExiste(login, idIgnorar = null) {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM profissional WHERE lower(login) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [login, idIgnorar],
    );
    return rowCount > 0;
  }

  /** Grava um novo profissional (INSERT + COMMIT) e devolve a entidade com o id gerado. */
  async salvar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO profissional (nome, login, senha_hash, perfil, ativo)
         VALUES ($1, $2, $3, $4, true)
         RETURNING ${COLUNAS}`,
        [obj.nome, obj.login, obj.senhaHash, obj.perfil],
      );
      return Profissional.deLinha(rows[0]);
    });
  }

  /** Atualiza nome, login, perfil e, se informada, a senha (RN-03). */
  async atualizar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE profissional
            SET nome = $2, login = $3, perfil = $4,
                senha_hash = COALESCE($5, senha_hash),
                atualizado_em = now()
          WHERE id = $1
        RETURNING ${COLUNAS}`,
        [obj.id, obj.nome, obj.login, obj.perfil, obj.senhaHash],
      );
      return Profissional.deLinha(rows[0]);
    });
  }

  /** RN-05: inativa ou reativa (não existe exclusão). */
  async alterarStatus(id, ativo) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE profissional SET ativo = $2, atualizado_em = now() WHERE id = $1 RETURNING ${COLUNAS}`,
        [id, ativo],
      );
      return Profissional.deLinha(rows[0]);
    });
  }

  async buscarPorId(id) {
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM profissional WHERE id = $1`, [id]);
    return Profissional.deLinha(rows[0]);
  }

  async buscarPorLogin(login) {
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM profissional WHERE lower(login) = lower($1)`, [login]);
    return Profissional.deLinha(rows[0]);
  }

  /** Listagem da T-01: busca por nome ou login e filtro Todos / Ativos / Inativos. */
  async listar({ busca = '', status = 'todos' } = {}) {
    const filtros = [];
    const valores = [];
    if (busca) {
      valores.push(`%${busca}%`);
      filtros.push(`(f_normaliza(nome) LIKE f_normaliza($1) OR lower(login) LIKE lower($1))`);
    }
    if (status === 'ativos') filtros.push('ativo = true');
    if (status === 'inativos') filtros.push('ativo = false');
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM profissional ${where} ORDER BY nome`, valores);
    return rows.map(Profissional.deLinha);
  }

  async contar() {
    const { rows } = await this.db.query('SELECT count(*)::int AS total FROM profissional');
    return rows[0].total;
  }
}

module.exports = ProfissionalRepository;
