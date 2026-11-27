// Service do Beneficiário (RF-02 / UC-02): regras de negócio RN-07 a RN-11.
// Segue os diagramas de sequência SD-06 a SD-09:
//   paraEntidade -> validaCampos -> validaEntity -> validaExiste -> salvar(obj) -> message
const BeneficiarioRepository = require('../repositories/BeneficiarioRepository');
const BeneficiarioDTO = require('../dtos/BeneficiarioDTO');
const { Mensagem } = require('../common/Mensagem');

class BeneficiarioService {
  constructor(repository = new BeneficiarioRepository()) {
    this.repository = repository;
  }

  /** UC-02, fluxo principal: Cadastrar Beneficiário (SD-06). */
  async incluir(dto) {
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.cpf)) {
      return this.trataMensagem([{ campo: 'cpf', codigo: 'MSGE-04' }]);
    }

    const salvo = await this.repository.salvar(obj);
    return Mensagem.sucesso('MSGS-05', BeneficiarioDTO.deEntidade(salvo), 201);
  }

  /** UC-02, A2: Editar Beneficiário (SD-08). O CPF repetido desconsidera o próprio registro (RN-09). */
  async alterar(id, dto) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) return Mensagem.erro('NAO_ENCONTRADO', 404);

    dto.id = id;
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.cpf, id)) {
      return this.trataMensagem([{ campo: 'cpf', codigo: 'MSGE-04' }]);
    }

    const salvo = await this.repository.atualizar(obj);
    return Mensagem.sucesso('MSGS-06', BeneficiarioDTO.deEntidade(salvo));
  }

  /** UC-02, A1: Consultar Beneficiários (SD-07). Todos os perfis autenticados (RN-11). */
  async listar(filtro) {
    const lista = await this.repository.listar(filtro);
    return Mensagem.sucesso(null, lista.map(BeneficiarioDTO.deEntidade));
  }

  async buscarPorId(id) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    return Mensagem.sucesso(null, BeneficiarioDTO.deEntidade(obj));
  }

  /** UC-02, A3: Inativar Beneficiário (SD-09, RN-10). */
  async inativar(id) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    obj.inativar();
    const salvo = await this.repository.inativar(obj.id);
    return Mensagem.sucesso('MSGS-07', BeneficiarioDTO.deEntidade(salvo));
  }

  /** RN-08: CPF válido pelos dígitos verificadores. */
  validaEntity(obj) {
    const erros = [];
    if (!obj.cpfValido()) erros.push({ campo: 'cpf', codigo: 'MSGE-03' });
    return erros;
  }

  /**
   * Junta os erros em uma única resposta para a tela: MSGE-01 no topo e a
   * mensagem de cada campo. CPF já cadastrado devolve MSGE-04 com status 409.
   */
  trataMensagem(erros) {
    const lista = erros.map((e) => (e.texto ? e : Mensagem.campo(e.campo, e.codigo)));
    if (lista.length === 1 && lista[0].codigo === 'MSGE-04') {
      return Mensagem.erro('MSGE-04', 409, lista);
    }
    return Mensagem.erro('MSGE-01', 400, lista);
  }
}

module.exports = BeneficiarioService;
