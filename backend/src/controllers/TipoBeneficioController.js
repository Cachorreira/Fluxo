// Controller (RF-04): recebe a requisição HTTP (JSON), chama o Service
// e devolve a Mensagem para a tela com o status HTTP adequado.
const TipoBeneficioService = require('../services/TipoBeneficioService');
const TipoBeneficioDTO = require('../dtos/TipoBeneficioDTO');
const { responder, idDaRota } = require('./util');

class TipoBeneficioController {
  constructor(service = new TipoBeneficioService()) {
    this.service = service;
  }

  // POST /api/tipos-beneficio
  incluir = async (req, res) => {
    responder(res, await this.service.incluir(new TipoBeneficioDTO(req.body)));
  };

  // PUT /api/tipos-beneficio/:id
  alterar = async (req, res) => {
    responder(res, await this.service.alterar(idDaRota(req), new TipoBeneficioDTO(req.body)));
  };

  // GET /api/tipos-beneficio?busca=&status=todos|ativos|inativos
  listar = async (req, res) => {
    const { busca = '', status = 'todos' } = req.query;
    responder(res, await this.service.listar({ busca: String(busca).trim(), status: String(status) }));
  };

  // GET /api/tipos-beneficio/:id
  buscarPorId = async (req, res) => {
    responder(res, await this.service.buscarPorId(idDaRota(req)));
  };

  // PATCH /api/tipos-beneficio/:id/inativar
  inativar = async (req, res) => {
    responder(res, await this.service.alterarStatus(idDaRota(req), false));
  };

  // PATCH /api/tipos-beneficio/:id/reativar
  reativar = async (req, res) => {
    responder(res, await this.service.alterarStatus(idDaRota(req), true));
  };
}

module.exports = TipoBeneficioController;
