// Entidade TipoBeneficio (tabela "tipo_beneficio"): cesta básica, aluguel social etc.

class TipoBeneficio {
  constructor({ id = null, nome = '', descricao = null, ativo = true, criadoEm = null, atualizadoEm = null } = {}) {
    this.id = id;
    this.nome = nome;
    this.descricao = descricao;
    this.ativo = ativo;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }

  static deLinha(linha) {
    if (!linha) return null;
    return new TipoBeneficio({
      id: linha.id,
      nome: linha.nome,
      descricao: linha.descricao,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    });
  }

  inativar() {
    this.ativo = false;
  }

  reativar() {
    this.ativo = true;
  }
}

module.exports = TipoBeneficio;
