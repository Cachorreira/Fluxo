// Entidade SituacaoRisco (tabela "situacao_risco"): o motivo da solicitação.

const CONCESSOES = Object.freeze({ UNICO: 'UNICO', RECORRENTE: 'RECORRENTE' });
const MESES_MIN = 2;
const MESES_MAX = 24;

class SituacaoRisco {
  constructor({ id = null, nome = '', descricao = null, concessao = CONCESSOES.UNICO, qtdMeses = null, ativo = true,
    criadoEm = null, atualizadoEm = null } = {}) {
    this.id = id;
    this.nome = nome;
    this.descricao = descricao;
    this.concessao = concessao;
    this.qtdMeses = qtdMeses;
    this.ativo = ativo;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }

  static deLinha(linha) {
    if (!linha) return null;
    return new SituacaoRisco({
      id: linha.id,
      nome: linha.nome,
      descricao: linha.descricao,
      concessao: linha.concessao,
      qtdMeses: linha.qtd_meses,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    });
  }

  /** RN-14 / RN-25: a recorrente gera uma solicitação por mês. */
  ehRecorrente() {
    return this.concessao === CONCESSOES.RECORRENTE;
  }

  /** Quantos meses a triagem abrange (1 quando Único). */
  mesesAbrangidos() {
    return this.ehRecorrente() ? this.qtdMeses : 1;
  }

  inativar() {
    this.ativo = false;
  }

  reativar() {
    this.ativo = true;
  }
}

module.exports = { SituacaoRisco, CONCESSOES, MESES_MIN, MESES_MAX };
