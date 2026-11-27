// Controller (RF-03): recebe a requisição HTTP (JSON), chama o Service
// e devolve a Mensagem para a tela com o status HTTP adequado.
const SituacaoRiscoService = require('../services/SituacaoRiscoService');
const SituacaoRiscoDTO = require('../dtos/SituacaoRiscoDTO');
const { responder, idDaRota } = require('./util');

class SituacaoRiscoController {
  constructor(service = new SituacaoRiscoService()) {
    this.service = service;
  }

  // POST /api/situacoes-risco
  incluir = async (req, res) => {
    responder(res, await this.service.incluir(new SituacaoRiscoDTO(req.body)));
  };

  // PUT /api/situacoes-risco/:id
  alterar = async (req, res) => {
    responder(res, await this.service.alterar(idDaRota(req), new SituacaoRiscoDTO(req.body)));
  };

  // GET /api/situacoes-risco?busca=&status=todos|ativos|inativos
  listar = async (req, res) => {
    const { busca = '', status = 'todos' } = req.query;
    responder(res, await this.service.listar({ busca: String(busca).trim(), status: String(status) }));
  };

  // GET /api/situacoes-risco/:id
  buscarPorId = async (req, res) => {
    responder(res, await this.service.buscarPorId(idDaRota(req)));
  };

  // PATCH /api/situacoes-risco/:id/inativar
  inativar = async (req, res) => {
    responder(res, await this.service.alterarStatus(idDaRota(req), false));
  };

  // PATCH /api/situacoes-risco/:id/reativar
  reativar = async (req, res) => {
    responder(res, await this.service.alterarStatus(idDaRota(req), true));
  };
}

module.exports = SituacaoRiscoController;
