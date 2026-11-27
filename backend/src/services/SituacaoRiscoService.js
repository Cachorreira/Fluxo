// Service da Situação de Risco (RF-03 / UC-03): regras RN-12 a RN-16.
// Segue os diagramas de sequência SD-10 a SD-13.
const SituacaoRiscoRepository = require('../repositories/SituacaoRiscoRepository');
const SituacaoRiscoDTO = require('../dtos/SituacaoRiscoDTO');
const { MESES_MIN, MESES_MAX } = require('../entities/SituacaoRisco');
const { Mensagem } = require('../common/Mensagem');

const NOME_REPETIDO = { campo: 'nome', codigo: 'MSGE-10', texto: 'Já existe uma situação de risco com este nome.' };

class SituacaoRiscoService {
  constructor(repository = new SituacaoRiscoRepository()) {
    this.repository = repository;
  }

  /** UC-03, fluxo principal: Cadastrar Situação de Risco (SD-10). */
  async incluir(dto) {
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.nome)) return this.trataMensagem([NOME_REPETIDO]);

    const salvo = await this.repository.salvar(obj);
    return Mensagem.sucesso('MSGS-08', SituacaoRiscoDTO.deEntidade(salvo), 201);
  }

  /** UC-03: Editar Situação de Risco (SD-12). */
  async alterar(id, dto) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) return Mensagem.erro('NAO_ENCONTRADO', 404);

    dto.id = id;
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    const errosEntidade = this.validaEntity(obj);
    if (errosEntidade.length) return this.trataMensagem(errosEntidade);

    if (await this.repository.validaExiste(obj.nome, id)) return this.trataMensagem([NOME_REPETIDO]);

    const salvo = await this.repository.atualizar(obj);
    return Mensagem.sucesso('MSGS-09', SituacaoRiscoDTO.deEntidade(salvo));
  }

  /** UC-03: Consultar Situações de Risco (SD-11). */
  async listar(filtro) {
    const lista = await this.repository.listar(filtro);
    return Mensagem.sucesso(null, lista.map(SituacaoRiscoDTO.deEntidade));
  }

  async buscarPorId(id) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    return Mensagem.sucesso(null, SituacaoRiscoDTO.deEntidade(obj));
  }

  /** UC-03: Inativar ou Reativar (SD-13, RN-15). */
  async alterarStatus(id, ativo) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    if (ativo) obj.reativar(); else obj.inativar();
    const salvo = await this.repository.alterarStatus(obj.id, obj.ativo);
    return Mensagem.sucesso(ativo ? 'MSGS-11' : 'MSGS-10', SituacaoRiscoDTO.deEntidade(salvo));
  }

  /** RN-14: Recorrente tem de 2 a 24 meses; Único fica sem meses. */
  validaEntity(obj) {
    const erros = [];
    if (obj.ehRecorrente() && !(obj.qtdMeses >= MESES_MIN && obj.qtdMeses <= MESES_MAX)) {
      erros.push({ campo: 'qtdMeses', codigo: 'MSGE-09' });
    }
    if (!obj.ehRecorrente() && obj.qtdMeses !== null) erros.push({ campo: 'qtdMeses', codigo: 'MSGE-09' });
    return erros;
  }

  /** MSGE-01 com a mensagem de cada campo; nome repetido devolve MSGE-10 com status 409. */
  trataMensagem(erros) {
    const lista = erros.map((e) => (e.texto ? e : Mensagem.campo(e.campo, e.codigo)));
    if (lista.length === 1 && lista[0].codigo === 'MSGE-10') {
      return new Mensagem({ codigo: 'MSGE-10', texto: NOME_REPETIDO.texto, status: 409, erros: lista });
    }
    return Mensagem.erro('MSGE-01', 400, lista);
  }
}

module.exports = SituacaoRiscoService;
