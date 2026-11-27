// Service do Tipo de Benefício (RF-04 / UC-04): regras RN-17 a RN-19.
// Segue os diagramas de sequência SD-14 a SD-17.
const TipoBeneficioRepository = require('../repositories/TipoBeneficioRepository');
const TipoBeneficioDTO = require('../dtos/TipoBeneficioDTO');
const { Mensagem } = require('../common/Mensagem');

const NOME_REPETIDO = { campo: 'nome', codigo: 'MSGE-10', texto: 'Já existe um tipo de benefício com este nome.' };

class TipoBeneficioService {
  constructor(repository = new TipoBeneficioRepository()) {
    this.repository = repository;
  }

  /** UC-04, fluxo principal: Cadastrar Tipo de Benefício (SD-14). */
  async incluir(dto) {
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    if (await this.repository.validaExiste(obj.nome)) return this.trataMensagem([NOME_REPETIDO]);

    const salvo = await this.repository.salvar(obj);
    return Mensagem.sucesso('MSGS-12', TipoBeneficioDTO.deEntidade(salvo), 201);
  }

  /** UC-04: Editar Tipo de Benefício (SD-16). */
  async alterar(id, dto) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) return Mensagem.erro('NAO_ENCONTRADO', 404);

    dto.id = id;
    const obj = dto.paraEntidade();

    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return this.trataMensagem(errosCampos);

    if (await this.repository.validaExiste(obj.nome, id)) return this.trataMensagem([NOME_REPETIDO]);

    const salvo = await this.repository.atualizar(obj);
    return Mensagem.sucesso('MSGS-13', TipoBeneficioDTO.deEntidade(salvo));
  }

  /** UC-04: Consultar Tipos de Benefício (SD-15). */
  async listar(filtro) {
    const lista = await this.repository.listar(filtro);
    return Mensagem.sucesso(null, lista.map(TipoBeneficioDTO.deEntidade));
  }

  async buscarPorId(id) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    return Mensagem.sucesso(null, TipoBeneficioDTO.deEntidade(obj));
  }

  /** UC-04: Inativar ou Reativar (SD-17, RN-19). */
  async alterarStatus(id, ativo) {
    const obj = await this.repository.buscarPorId(id);
    if (!obj) return Mensagem.erro('NAO_ENCONTRADO', 404);
    if (ativo) obj.reativar(); else obj.inativar();
    const salvo = await this.repository.alterarStatus(obj.id, obj.ativo);
    return Mensagem.sucesso(ativo ? 'MSGS-15' : 'MSGS-14', TipoBeneficioDTO.deEntidade(salvo));
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

module.exports = TipoBeneficioService;
