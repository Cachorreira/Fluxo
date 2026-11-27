// Entidade Beneficiario (tabela "beneficiario").
// CPF e telefone ficam guardados só com os dígitos; a máscara é da tela.

class Beneficiario {
  constructor({ id = null, nome = '', cpf = '', telefone = '', endereco = '', bairro = '', ativo = true,
    criadoEm = null, atualizadoEm = null } = {}) {
    this.id = id;
    this.nome = nome;
    this.cpf = cpf;
    this.telefone = telefone;
    this.endereco = endereco;
    this.bairro = bairro;
    this.ativo = ativo;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }

  /** Cria a entidade a partir de uma linha do banco (snake_case -> camelCase). */
  static deLinha(linha) {
    if (!linha) return null;
    return new Beneficiario({
      id: linha.id,
      nome: linha.nome,
      cpf: linha.cpf,
      telefone: linha.telefone,
      endereco: linha.endereco,
      bairro: linha.bairro,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    });
  }

  /** RN-08: confere os dois dígitos verificadores do CPF. */
  cpfValido() {
    return Beneficiario.cpfValido(this.cpf);
  }

  static cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf)) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // 000.000.000-00, 111.111.111-11...
    const digito = (tamanho) => {
      let soma = 0;
      for (let i = 0; i < tamanho; i += 1) soma += Number(cpf[i]) * (tamanho + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
  }

  /** RN-10: o beneficiário não é excluído, só inativado (o RF-02 não prevê reativação). */
  inativar() {
    this.ativo = false;
  }
}

module.exports = Beneficiario;
