// Controller do Beneficiário: recebe a requisição HTTP (JSON), chama o Service
// e devolve a Mensagem para a tela com o status HTTP adequado.
const BeneficiarioService = require('../services/BeneficiarioService');
const BeneficiarioDTO = require('../dtos/BeneficiarioDTO');
const { responder, idDaRota } = require('./util');

class BeneficiarioController {
  constructor(service = new BeneficiarioService()) {
    this.service = service;
  }

  // POST /api/beneficiarios
  incluir = async (req, res) => {
    responder(res, await this.service.incluir(new BeneficiarioDTO(req.body)));
  };

  // PUT /api/beneficiarios/:id
  alterar = async (req, res) => {
    responder(res, await this.service.alterar(idDaRota(req), new BeneficiarioDTO(req.body)));
  };

  // GET /api/beneficiarios?busca=&status=todos|ativos|inativos
  listar = async (req, res) => {
    const { busca = '', status = 'todos' } = req.query;
    responder(res, await this.service.listar({ busca: String(busca).trim(), status: String(status) }));
  };

  // GET /api/beneficiarios/:id
  buscarPorId = async (req, res) => {
    responder(res, await this.service.buscarPorId(idDaRota(req)));
  };

  // PATCH /api/beneficiarios/:id/inativar
  inativar = async (req, res) => {
    responder(res, await this.service.inativar(idDaRota(req)));
  };
}

module.exports = BeneficiarioController;
