// Repository do Beneficiário: única camada que conversa com o banco (tabela "beneficiario").
const { pool, emTransacao } = require('../config/database');
const Beneficiario = require('../entities/Beneficiario');

const COLUNAS = 'id, nome, cpf, telefone, endereco, bairro, ativo, criado_em, atualizado_em';

class BeneficiarioRepository {
  constructor(db = pool) {
    this.db = db;
  }

  /** RN-09: verifica se o CPF já existe. Na edição, ignora o próprio registro. */
  async validaExiste(cpf, idIgnorar = null) {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM beneficiario WHERE cpf = $1 AND ($2::int IS NULL OR id <> $2)',
      [cpf, idIgnorar],
    );
    return rowCount > 0;
  }

  /** Grava um novo beneficiário (INSERT + COMMIT) como Ativo. */
  async salvar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO beneficiario (nome, cpf, telefone, endereco, bairro, ativo)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING ${COLUNAS}`,
        [obj.nome, obj.cpf, obj.telefone, obj.endereco, obj.bairro],
      );
      return Beneficiario.deLinha(rows[0]);
    });
  }

  async atualizar(obj) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE beneficiario
            SET nome = $2, cpf = $3, telefone = $4, endereco = $5, bairro = $6, atualizado_em = now()
          WHERE id = $1
        RETURNING ${COLUNAS}`,
        [obj.id, obj.nome, obj.cpf, obj.telefone, obj.endereco, obj.bairro],
      );
      return Beneficiario.deLinha(rows[0]);
    });
  }

  /** RN-10: inativa (não existe exclusão). */
  async inativar(id) {
    return emTransacao(async (client) => {
      const { rows } = await client.query(
        `UPDATE beneficiario SET ativo = false, atualizado_em = now() WHERE id = $1 RETURNING ${COLUNAS}`,
        [id],
      );
      return Beneficiario.deLinha(rows[0]);
    });
  }

  async buscarPorId(id) {
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM beneficiario WHERE id = $1`, [id]);
    return Beneficiario.deLinha(rows[0]);
  }

  /**
   * Listagem da T-03: busca por nome, CPF ou bairro (sem diferenciar maiúsculas e acentos)
   * e filtro Todos / Ativos / Inativos.
   */
  async listar({ busca = '', status = 'todos' } = {}) {
    const filtros = [];
    const valores = [];
    if (busca) {
      valores.push(`%${busca}%`);
      const digitos = busca.replace(/\D/g, '');
      let porCpf = '';
      if (digitos.length >= 3) {
        valores.push(`%${digitos}%`);
        porCpf = ' OR cpf LIKE $2';
      }
      filtros.push(`(f_normaliza(nome) LIKE f_normaliza($1) OR f_normaliza(bairro) LIKE f_normaliza($1)${porCpf})`);
    }
    if (status === 'ativos') filtros.push('ativo = true');
    if (status === 'inativos') filtros.push('ativo = false');
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const { rows } = await this.db.query(`SELECT ${COLUNAS} FROM beneficiario ${where} ORDER BY nome`, valores);
    return rows.map(Beneficiario.deLinha);
  }
}

module.exports = BeneficiarioRepository;
