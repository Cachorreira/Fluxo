// Controller do Profissional: recebe a requisição HTTP (JSON), chama o Service
// e devolve a Mensagem para a tela com o status HTTP adequado.
const ProfissionalService = require('../services/ProfissionalService');
const ProfissionalDTO = require('../dtos/ProfissionalDTO');
const { responder, idDaRota } = require('./util');

class ProfissionalController {
  constructor(service = new ProfissionalService()) {
    this.service = service;
  }

  // POST /api/profissionais
  incluir = async (req, res) => {
    responder(res, await this.service.incluir(new ProfissionalDTO(req.body)));
  };

  // PUT /api/profissionais/:id
  alterar = async (req, res) => {
    responder(res, await this.service.alterar(idDaRota(req), new ProfissionalDTO(req.body)));
  };

  // GET /api/profissionais?busca=&status=todos|ativos|inativos
  listar = async (req, res) => {
    const { busca = '', status = 'todos' } = req.query;
    responder(res, await this.service.listar({ busca: String(busca).trim(), status: String(status) }));
  };

  // GET /api/profissionais/:id
  buscarPorId = async (req, res) => {
    responder(res, await this.service.buscarPorId(idDaRota(req)));
  };

  // PATCH /api/profissionais/:id/inativar
  inativar = async (req, res) => {
    responder(res, await this.service.inativar(idDaRota(req)));
  };

  // PATCH /api/profissionais/:id/reativar
  reativar = async (req, res) => {
    responder(res, await this.service.reativar(idDaRota(req)));
  };
}

module.exports = ProfissionalController;
