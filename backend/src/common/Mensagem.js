// Mensagens do sistema (Seção "Mensagens do Sistema" da documentação v5).
// Toda resposta da API é uma Mensagem: { codigo, texto, dados?, erros? }.

const TEXTOS = {
  // Sucesso
  'MSGS-01': 'Profissional cadastrado.',
  'MSGS-02': 'Dados do profissional atualizados.',
  'MSGS-03': 'Profissional inativado.',
  'MSGS-04': 'Profissional reativado.',
  'MSGS-05': 'Beneficiário cadastrado.',
  'MSGS-06': 'Dados do beneficiário atualizados.',
  'MSGS-07': 'Beneficiário inativado.',
  'MSGS-08': 'Situação de risco cadastrada.',
  'MSGS-09': 'Situação de risco atualizada.',
  'MSGS-10': 'Situação de risco inativada.',
  'MSGS-11': 'Situação de risco reativada.',
  'MSGS-12': 'Tipo de benefício cadastrado.',
  'MSGS-13': 'Tipo de benefício atualizado.',
  'MSGS-14': 'Tipo de benefício inativado.',
  'MSGS-15': 'Tipo de benefício reativado.',
  // Erro
  'MSGE-01': 'Alguns campos precisam de ajuste antes de salvar.',
  'MSGE-02': 'Preencha este campo.',
  'MSGE-02b': 'Escolha uma opção.',
  'MSGE-03': 'CPF inválido. Confira os 11 números.',
  'MSGE-04': 'Este CPF já está cadastrado. Busque o beneficiário na lista para ver ou atualizar os dados.',
  'MSGE-05': 'Já existe um profissional com este login. Escolha outro.',
  'MSGE-06': 'A senha precisa ter pelo menos 8 caracteres.',
  'MSGE-07': 'Use letras sem acento, números, ponto ou hífen (mínimo 3).',
  'MSGE-08': 'Informe o DDD e o número completo.',
  'MSGE-09': 'Informe um número inteiro entre 2 e 24.',
  // MSGE-10 tem um texto para cada cadastro (ver SituacaoRiscoService e TipoBeneficioService)
  'MSGE-14': 'Não foi possível salvar agora. Verifique sua conexão e tente novamente.',
  // Autenticação (aprovadas em 27/11/2026)
  'MSGE-15': 'Login ou senha inválidos.',
  'MSGE-16': 'Sua sessão expirou. Entre novamente.',
  'MSGE-17': 'Você não tem permissão para acessar esta função.',
  // Interna (sem número na documentação)
  NAO_ENCONTRADO: 'Registro não encontrado.',
};

class Mensagem {
  constructor({ codigo, texto, status = 200, dados, erros }) {
    this.codigo = codigo;
    this.texto = texto ?? TEXTOS[codigo];
    this.status = status; // código HTTP usado pelo Controller
    this.dados = dados;
    this.erros = erros;
  }

  static sucesso(codigo, dados, status = 200) {
    return new Mensagem({ codigo, status, dados });
  }

  static erro(codigo, status = 400, erros) {
    return new Mensagem({ codigo, status, erros });
  }

  /** Erro de um campo do formulário (ex.: { campo: 'login', codigo: 'MSGE-07' }). */
  static campo(campo, codigo) {
    return { campo, codigo: codigo === 'MSGE-02b' ? 'MSGE-02' : codigo, texto: TEXTOS[codigo] };
  }

  get ehErro() {
    return this.status >= 400;
  }

  toJSON() {
    const corpo = this.codigo ? { codigo: this.codigo, texto: this.texto } : {};
    if (this.dados !== undefined) corpo.dados = this.dados;
    if (this.erros !== undefined) corpo.erros = this.erros;
    return corpo;
  }
}

module.exports = { Mensagem, TEXTOS };
