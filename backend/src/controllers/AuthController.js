// Controller de autenticação (tela de login).
const AuthService = require('../services/AuthService');
const LoginDTO = require('../dtos/LoginDTO');
const { Mensagem } = require('../common/Mensagem');
const { responder } = require('./util');

class AuthController {
  constructor(service = new AuthService()) {
    this.service = service;
  }

  // POST /api/auth/login  { login, senha }
  login = async (req, res) => {
    responder(res, await this.service.autenticar(new LoginDTO(req.body)));
  };

  // GET /api/auth/eu  -> dados do usuário logado (a tela usa para montar o menu)
  eu = async (req, res) => {
    responder(res, Mensagem.sucesso(null, req.usuario));
  };
}

module.exports = AuthController;
