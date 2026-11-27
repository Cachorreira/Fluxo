// DTO do Beneficiário: transporta os dados entre a tela (JSON) e o backend.
// Remove a máscara de CPF e telefone, monta a entidade e valida os campos (RN-07).
const Beneficiario = require('../entities/Beneficiario');
const { Mensagem } = require('../common/Mensagem');

function texto(valor) {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

function soDigitos(valor) {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor).replace(/\D/g, '') : '';
}

// Limites das colunas da tabela "beneficiario"
const LIMITES = { nome: 100, endereco: 150, bairro: 60 };

class BeneficiarioDTO {
  constructor(corpo = {}) {
    this.id = corpo.id ?? null;
    this.nome = texto(corpo.nome);
    this.cpf = soDigitos(corpo.cpf);
    this.telefone = soDigitos(corpo.telefone);
    this.endereco = texto(corpo.endereco);
    this.bairro = texto(corpo.bairro);
  }

  /** Monta a entidade (obj = new Beneficiario()). */
  paraEntidade() {
    return new Beneficiario({
      id: this.id, nome: this.nome, cpf: this.cpf, telefone: this.telefone,
      endereco: this.endereco, bairro: this.bairro,
    });
  }

  /** RN-07: campos obrigatórios e formato. Retorna a lista de erros por campo. */
  validaCampos() {
    const erros = [];
    for (const campo of ['nome', 'cpf', 'telefone', 'endereco', 'bairro']) {
      if (!this[campo]) erros.push(Mensagem.campo(campo, 'MSGE-02'));
    }
    for (const [campo, max] of Object.entries(LIMITES)) {
      if (this[campo].length > max) {
        erros.push({ campo, codigo: 'MSGE-01', texto: `Use no máximo ${max} caracteres.` });
      }
    }
    if (this.cpf && this.cpf.length !== 11) erros.push(Mensagem.campo('cpf', 'MSGE-03'));
    if (this.telefone && (this.telefone.length < 10 || this.telefone.length > 11)) {
      erros.push(Mensagem.campo('telefone', 'MSGE-08'));
    }
    return erros;
  }

  /** Converte a entidade para o formato da tela, já com as máscaras. */
  static deEntidade(obj) {
    return {
      id: obj.id,
      nome: obj.nome,
      cpf: BeneficiarioDTO.mascaraCpf(obj.cpf),
      telefone: BeneficiarioDTO.mascaraTelefone(obj.telefone),
      endereco: obj.endereco,
      bairro: obj.bairro,
      ativo: obj.ativo,
      status: obj.ativo ? 'Ativo' : 'Inativo',
      criadoEm: obj.criadoEm,
      atualizadoEm: obj.atualizadoEm,
    };
  }

  static mascaraCpf(cpf) {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  static mascaraTelefone(tel) {
    return tel.length === 11
      ? tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      : tel.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
}

module.exports = BeneficiarioDTO;
