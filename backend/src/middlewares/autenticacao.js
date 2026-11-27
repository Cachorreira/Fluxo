// Middlewares de segurança (RNF-08):
//   autenticado        -> exige token válido de um profissional ativo
//   exigePerfil(minimo) -> exige o perfil mínimo (Atendente < Entregador < Gerente)
const AuthService = require('../services/AuthService');
const { Mensagem } = require('../common/Mensagem');
const { temAcesso } = require('../common/perfis');

const authService = new AuthService();

async function autenticado(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  const usuario = tipo === 'Bearer' && token ? await authService.verificaToken(token) : null;
  if (!usuario) {
    const msg = Mensagem.erro('MSGE-16', 401);
    return res.status(msg.status).json(msg.toJSON());
  }
  req.usuario = usuario;
  return next();
}

function exigePerfil(perfilMinimo) {
  return (req, res, next) => {
    if (!req.usuario || !temAcesso(req.usuario.perfil, perfilMinimo)) {
      const msg = Mensagem.erro('MSGE-17', 403);
      return res.status(msg.status).json(msg.toJSON());
    }
    return next();
  };
}

module.exports = { autenticado, exigePerfil };
