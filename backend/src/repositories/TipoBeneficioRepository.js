// Repository do Tipo de Benefício: única camada que conversa com a tabela "tipo_beneficio".
const { pool, emTransacao } = require('../config/database');
const TipoBeneficio = require('../entities/TipoBeneficio');

const COLUNAS = 'id, nome, descricao, ativo, criado_em, atualizado_em';

class TipoBeneficioRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** RN-18: nome único sem diferenciar maiúsculas e acentos. Na edição, ignora o próprio registro. */
  async validaExiste(nome, idIgnorar = null) {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM tipo_beneficio WHERE f_normaliza(nome) = f_normaliza($1) AND ($2::int IS NULL OR id <> $2)',
      [nome, idIgnorar],
    );
    return rowCount > 0;
  }

  async salvar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO tipo_beneficio (nome, descricao, ativo) VALUES ($1, $2, true) RETURNING ${COLUNAS}`,
        [obj.nome, obj.descricao],
      );
      return TipoBeneficio.deLinha(rows[0]);
    });
  }

  async atualizar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE tipo_beneficio SET nome = $2, descricao = $3, atualizado_em = now()
          WHERE id = $1 RETURNING ${COLUNAS}`,
        [obj.id, obj.nome, obj.descricao],
      );
      return TipoBeneficio.deLinha(rows[0]);
    });
  }

  /** RN-19: inativa ou reativa (não existe exclusão). */
  async alterarStatus(id, ativo) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE tipo_beneficio SET ativo = $2, atualizado_em = now() WHERE id = $1 RETURNING ${COLUNAS}`,
        [id, ativo],
      );
      return TipoBeneficio.deLinha(rows[0]);
    });
  }

  async buscarPorId(id) {
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM tipo_beneficio WHERE id = $1`, [id]);
    return TipoBeneficio.deLinha(rows[0]);
  }

  /** Listagem da T-07: busca por nome e filtro Todos / Ativos / Inativos. */
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
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM tipo_beneficio ${where} ORDER BY nome`, valores);
    return rows.map(TipoBeneficio.deLinha);
  }
}

module.exports = TipoBeneficioRepository;
