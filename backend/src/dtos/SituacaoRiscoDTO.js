// DTO da Situação de Risco: dados da tela (JSON) <-> entidade, com a validação do formulário (RN-12 e RN-14).
const { SituacaoRisco, CONCESSOES, MESES_MIN, MESES_MAX } = require('../entities/SituacaoRisco');
const { Mensagem } = require('../common/Mensagem');

function texto(valor) {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

/** Aceita "Único", "unico", "Recorrente"... e devolve UNICO / RECORRENTE (ou o texto como veio). */
function normalizaConcessao(valor) {
  return texto(valor).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

class SituacaoRiscoDTO {
  constructor(corpo = {}) {
    this.id = corpo.id ?? null;
    this.nome = texto(corpo.nome);
    this.descricao = texto(corpo.descricao) || null;
    this.concessao = normalizaConcessao(corpo.concessao);
    this.qtdMesesInformado = corpo.qtdMeses;
  }

  /** RN-14: quando Único, a quantidade de meses é ignorada (fica sem valor). */
  get qtdMeses() {
    if (this.concessao !== CONCESSOES.RECORRENTE) return null;
    const v = this.qtdMesesInformado;
    if (v === undefined || v === null || v === '') return null;
    return Number(v);
  }

  paraEntidade() {
    return new SituacaoRisco({
      id: this.id, nome: this.nome, descricao: this.descricao, concessao: this.concessao, qtdMeses: this.qtdMeses,
    });
  }

  /** RN-12 e RN-14. */
  validaCampos() {
    const erros = [];
    if (!this.nome) erros.push(Mensagem.campo('nome', 'MSGE-02'));
    else if (this.nome.length > 80) erros.push({ campo: 'nome', codigo: 'MSGE-01', texto: 'Use no máximo 80 caracteres.' });
    if (this.descricao && this.descricao.length > 255) {
      erros.push({ campo: 'descricao', codigo: 'MSGE-01', texto: 'Use no máximo 255 caracteres.' });
    }
    if (!this.concessao) erros.push(Mensagem.campo('concessao', 'MSGE-02b'));
    else if (!Object.values(CONCESSOES).includes(this.concessao)) {
      erros.push({ campo: 'concessao', codigo: 'MSGE-02', texto: 'Escolha Único ou Recorrente.' });
    } else if (this.concessao === CONCESSOES.RECORRENTE) {
      const m = this.qtdMeses;
      if (m === null) erros.push(Mensagem.campo('qtdMeses', 'MSGE-02'));
      else if (!Number.isInteger(m) || m < MESES_MIN || m > MESES_MAX) erros.push(Mensagem.campo('qtdMeses', 'MSGE-09'));
    }
    return erros;
  }

  static deEntidade(obj) {
    return {
      id: obj.id,
      nome: obj.nome,
      descricao: obj.descricao,
      concessao: obj.concessao,
      concessaoTexto: obj.ehRecorrente() ? `Recorrente (${obj.qtdMeses} meses)` : 'Único',
      qtdMeses: obj.qtdMeses,
      ativo: obj.ativo,
      status: obj.ativo ? 'Ativo' : 'Inativo',
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }
}

module.exports = SituacaoRiscoDTO;
