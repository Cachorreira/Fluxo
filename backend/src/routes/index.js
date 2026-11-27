// Rotas da API. Cada requisito ganha seu bloco, com o perfil mínimo da
// tabela "Níveis de acesso por perfil" da documentação.
const { Router } = require('express');
const { autenticado, exigePerfil } = require('../middlewares/autenticacao');
const { PERFIS } = require('../common/perfis');
const AuthController = require('../controllers/AuthController');
const ProfissionalController = require('../controllers/ProfissionalController');

const rotas = Router();

// ---- Autenticar-se (aberta) ----
const auth = new AuthController();
rotas.post('/auth/login', auth.login);
rotas.get('/auth/eu', autenticado, auth.eu);

// ---- RF-01 Manter Profissionais (somente Gerente, RN-06) ----
const profissional = new ProfissionalController();
const gerente = [autenticado, exigePerfil(PERFIS.GERENTE)];
rotas.get('/profissionais', gerente, profissional.listar);
rotas.get('/profissionais/:id', gerente, profissional.buscarPorId);
rotas.post('/profissionais', gerente, profissional.incluir);
rotas.put('/profissionais/:id', gerente, profissional.alterar);
rotas.patch('/profissionais/:id/inativar', gerente, profissional.inativar);
rotas.patch('/profissionais/:id/reativar', gerente, profissional.reativar);

// ---- Próximos: RF-02 a RF-08 seguem o mesmo padrão ----

module.exports = rotas;
