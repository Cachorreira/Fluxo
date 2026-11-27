// DTO do Profissional: transporta os dados entre a tela (JSON) e o backend.
// Converte para a entidade (paraEntidade) e valida os campos do formulário (validaCampos).
const Profissional = require('../entities/Profissional');
const { Mensagem } = require('../common/Mensagem');
const { ehPerfilValido } = require('../common/perfis');

const LOGIN_VALIDO = /^[A-Za-z0-9._-]{3,30}$/; // T-02: letras sem acento, números, ponto, hífen e sublinhado

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

class ProfissionalDTO {
  constructor(corpo = {}) {
    this.id = corpo.id ?? null;
    this.nome = texto(corpo.nome);
    this.login = texto(corpo.login);
    this.senha = typeof corpo.senha === 'string' ? corpo.senha : '';
    this.perfil = texto(corpo.perfil).toUpperCase();
    this.ativo = corpo.ativo ?? true;
  }

  /** Monta a entidade (obj = new Profissional()). A senha é tratada à parte (hash). */
  paraEntidade() {
    return new Profissional({ id: this.id, nome: this.nome, login: this.login, perfil: this.perfil, ativo: this.ativo });
  }

  /**
   * RN-01: campos obrigatórios e formato. Na edição a senha é opcional (RN-03).
   * Retorna a lista de erros por campo (vazia quando está tudo certo).
   */
  validaCampos({ edicao = false } = {}) {
    const erros = [];
    if (!this.nome) erros.push(Mensagem.campo('nome', 'MSGE-02'));
    else if (this.nome.length > 100) erros.push({ campo: 'nome', codigo: 'MSGE-01', texto: 'Use no máximo 100 caracteres.' });

    if (!this.login) erros.push(Mensagem.campo('login', 'MSGE-02'));
    else if (!LOGIN_VALIDO.test(this.login)) erros.push(Mensagem.campo('login', 'MSGE-07'));

    const senhaInformada = this.senha.length > 0;
    if (!edicao && !senhaInformada) erros.push(Mensagem.campo('senha', 'MSGE-02'));
    else if (senhaInformada && (this.senha.length < 8 || this.senha.length > 64)) {
      erros.push(Mensagem.campo('senha', 'MSGE-06'));
    }

    if (!this.perfil) erros.push(Mensagem.campo('perfil', 'MSGE-02b'));
    else if (!ehPerfilValido(this.perfil)) {
      erros.push({ campo: 'perfil', codigo: 'MSGE-02', texto: 'Escolha Gerente, Entregador ou Atendente.' });
    }
    return erros;
  }

  /** Converte a entidade para o formato enviado à tela (nunca inclui a senha). */
  static deEntidade(obj) {
    return {
      id: obj.id,
      nome: obj.nome,
      login: obj.login,
      perfil: obj.perfil,
      ativo: obj.ativo,
      status: obj.ativo ? 'Ativo' : 'Inativo',
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}

module.exports = ProfissionalDTO;
