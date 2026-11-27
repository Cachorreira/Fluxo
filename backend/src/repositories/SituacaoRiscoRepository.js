// Repository da Situação de Risco: única camada que conversa com a tabela "situacao_risco".
const { pool, emTransacao } = require('../config/database');
const { SituacaoRisco } = require('../entities/SituacaoRisco');

const COLUNAS = 'id, nome, descricao, concessao, qtd_meses, ativo, criado_em, atualizado_em';

class SituacaoRiscoRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** RN-13: nome único sem diferenciar maiúsculas e acentos. Na edição, ignora o próprio registro. */
  async validaExiste(nome, idIgnorar = null) {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM situacao_risco WHERE f_normaliza(nome) = f_normaliza($1) AND ($2::int IS NULL OR id <> $2)',
      [nome, idIgnorar],
    );
    return rowCount > 0;
  }

  async salvar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO situacao_risco (nome, descricao, concessao, qtd_meses, ativo)
         VALUES ($1, $2, $3, $4, true)
         RETURNING ${COLUNAS}`,
        [obj.nome, obj.descricao, obj.concessao, obj.qtdMeses],
      );
      return SituacaoRisco.deLinha(rows[0]);
    });
  }

  async atualizar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE situacao_risco
            SET nome = $2, descricao = $3, concessao = $4, qtd_meses = $5, atualizado_em = now()
          WHERE id = $1
        RETURNING ${COLUNAS}`,
        [obj.id, obj.nome, obj.descricao, obj.concessao, obj.qtdMeses],
      );
      return SituacaoRisco.deLinha(rows[0]);
    });
  }

  /** RN-15: inativa ou reativa (não existe exclusão). */
  async alterarStatus(id, ativo) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE situacao_risco SET ativo = $2, atualizado_em = now() WHERE id = $1 RETURNING ${COLUNAS}`,
        [id, ativo],
      );
      return SituacaoRisco.deLinha(rows[0]);
    });
  }

  async buscarPorId(id) {
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM situacao_risco WHERE id = $1`, [id]);
    return SituacaoRisco.deLinha(rows[0]);
  }

  /** Listagem da T-05: busca por nome e filtro Todos / Ativos / Inativos. */
  async listar({ busca = '', status = 'todos' } = {}) {
    const filtros = [];
    const valores = [];
    if (busca) {
      valores.push(`%${busca}%`);
      filtros.push('f_normaliza(nome) LIKE f_normaliza($1)');
    }
    if (status === 'ativos') filtros.push('ativo = true');
    if (status === 'inativos') filtros.push('ativo = false');
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM situacao_risco ${where} ORDER BY nome`, valores);
    return rows.map(SituacaoRisco.deLinha);
  }
}

module.exports = SituacaoRiscoRepository;
