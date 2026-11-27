// DTO do Tipo de Benefício: dados da tela (JSON) <-> entidade, com a validação do formulário (RN-17).
const TipoBeneficio = require('../entities/TipoBeneficio');
const { Mensagem } = require('../common/Mensagem');

function texto(valor) {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

class TipoBeneficioDTO {
  constructor(corpo = {}) {
    this.id = corpo.id ?? null;
    this.nome = texto(corpo.nome);
    this.descricao = texto(corpo.descricao) || null;
  }

  paraEntidade() {
    return new TipoBeneficio({ id: this.id, nome: this.nome, descricao: this.descricao });
  }

  /** RN-17: o nome é obrigatório. */
  validaCampos() {
    const erros = [];
    if (!this.nome) erros.push(Mensagem.campo('nome', 'MSGE-02'));
    else if (this.nome.length > 80) erros.push({ campo: 'nome', codigo: 'MSGE-01', texto: 'Use no máximo 80 caracteres.' });
    if (this.descricao && this.descricao.length > 255) {
      erros.push({ campo: 'descricao', codigo: 'MSGE-01', texto: 'Use no máximo 255 caracteres.' });
    }
    return erros;
  }

  static deEntidade(obj) {
    return {
      id: obj.id,
      nome: obj.nome,
      descricao: obj.descricao,
      ativo: obj.ativo,
      status: obj.ativo ? 'Ativo' : 'Inativo',
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}

module.exports = TipoBeneficioDTO;
