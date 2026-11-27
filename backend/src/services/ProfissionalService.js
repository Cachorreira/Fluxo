// Service do Profissional (RF-01 / UC-01): regras de negócio RN-01 a RN-06.
// Segue o diagrama de sequência SD-01/SD-02:
//   paraEntidade -> validaCampos -> validaEntity -> validaExiste -> salvar(obj) -> message
const ProfissionalRepository = require('../repositories/ProfissionalRepository');
const ProfissionalDTO = require('../dtos/ProfissionalDTO');
const { Mensagem } = require('../common/Mensagem');
const { ehPerfilValido } = require('../common/perfis');

class ProfissionalService {
  constructor(repository = new ProfissionalRepository()) {
    this.repository = repository;
  }

  /** UC-01, fluxo principal: Cadastrar Profissional. */
  async incluir(dto) {
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos({ edicao: false });
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.login)) {
      return this.trataMensagem([{ campo: 'login', codigo: 'MSGE-05' }]);
    }

    await obj.definirSenha(dto.senha);
    const salvo = await this.repository.salvar(obj);
    return Mensagem.sucesso('MSGS-01', ProfissionalDTO.deEntidade(salvo), 201);
  }

  /** UC-01, A2: Editar Profissional. A senha só muda se uma nova for informada (RN-03). */
  async alterar(id, dto) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) return Mensagem.erro('NAO_ENCONTRADO', 404);

    dto.id = id;
    const obj = dto.paraEntidade();
    obj.ativo = atual.ativo;

    const errosCampos = dto.validaCampos({ edicao: true });
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.login, id)) {
      return this.trataMensagem([{ campo: 'login', codigo: 'MSGE-05' }]);
    }

    if (dto.senha) await obj.definirSenha(dto.senha);
    const salvo = await this.repository.atualizar(obj);
    return Mensagem.sucesso('MSGS-02', ProfissionalDTO.deEntidade(salvo));
  }

  /** UC-01, A1: Consultar Profissionais. */
  async listar(filtro) {
    const lista = await this.repository.listar(filtro);
    return Mensagem.sucesso(null, lista.map(ProfissionalDTO.deEntidade));
  }

  async buscarPorId(id) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    return Mensagem.sucesso(null, ProfissionalDTO.deEntidade(obj));
  }

  /** UC-01, A3: Inativar (RN-05). */
  async inativar(id) {
    return this.alterarStatus(id, false, 'MSGS-03');
  }

  /** UC-01, A3: Reativar (RN-05). */
  async reativar(id) {
    return this.alterarStatus(id, true, 'MSGS-04');
  }

  async alterarStatus(id, ativo, codigoSucesso) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    if (ativo) obj.reativar(); else obj.inativar();
    const salvo = await this.repository.alterarStatus(obj.id, obj.ativo);
    return Mensagem.sucesso(codigoSucesso, ProfissionalDTO.deEntidade(salvo));
  }

  /** Regras da entidade que não são só de formulário (RN-04: exatamente um perfil válido). */
  validaEntity(obj) {
    const erros = [];
    if (!ehPerfilValido(obj.perfil)) erros.push({ campo: 'perfil', codigo: 'MSGE-02' });
    return erros;
  }

  /**
   * Junta os erros encontrados em uma única resposta para a tela:
   * MSGE-01 no topo e a mensagem de cada campo (SD-02). Login repetido devolve
   * MSGE-05 com status 409 (conflito).
   */
  trataMensagem(erros) {
    const lista = erros.map((e) => (e.texto ? e : Mensagem.campo(e.campo, e.codigo)));
    if (lista.length === 1 && lista[0].codigo === 'MSGE-05') {
      return Mensagem.erro('MSGE-05', 409, lista);
    }
    return Mensagem.erro('MSGE-01', 400, lista);
  }
}

module.exports = ProfissionalService;
