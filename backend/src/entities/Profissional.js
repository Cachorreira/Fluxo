// Entidade Profissional (tabela "profissional").
const bcrypt = require('bcryptjs');
const { temAcesso } = require('../common/perfis');

const CUSTO_BCRYPT = 10;

class Profissional {
  constructor({ id = null, nome = '', login = '', senhaHash = null, perfil = 'ENTREGADOR', ativo = true,
    criadoEm = null, atualizadoEm = null } = {}) {
    this.id = id;
    this.nome = nome;
    this.login = login;
    this.senhaHash = senhaHash;
    this.perfil = perfil;
    this.ativo = ativo;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }

  /** Cria a entidade a partir de uma linha do banco (snake_case -> camelCase). */
  static deLinha(linha) {
    if (!linha) return null;
    return new Profissional({
      id: linha.id,
      nome: linha.nome,
      login: linha.login,
      senhaHash: linha.senha_hash,
      perfil: linha.perfil,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    });
  }

  /** RN-03 / RNF-10: a senha nunca é guardada em texto puro. */
  async definirSenha(senha) {
    this.senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  }

  /** RN-05: profissional inativo não se autentica. */
  async autenticar(senha) {
    if (!this.ativo || !this.senhaHash) return false;
    return bcrypt.compare(senha, this.senhaHash);
  }

  temAcesso(perfilMinimo) {
    return temAcesso(this.perfil, perfilMinimo);
  }

  inativar() {
    this.ativo = false;
  }

  reativar() {
    this.ativo = true;
  }
}

module.exports = Profissional;
