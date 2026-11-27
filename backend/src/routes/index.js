// Rotas da API. Cada requisito ganha seu bloco, com o perfil mínimo da
// tabela "Níveis de acesso por perfil" da documentação.
const { Router } = require('express');
const { autenticado, exigePerfil } = require('../middlewares/autenticacao');
const { PERFIS } = require('../common/perfis');
const AuthController = require('../controllers/AuthController');
const ProfissionalController = require('../controllers/ProfissionalController');
const BeneficiarioController = require('../controllers/BeneficiarioController');
const SituacaoRiscoController = require('../controllers/SituacaoRiscoController');
const TipoBeneficioController = require('../controllers/TipoBeneficioController');

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

// ---- RF-02 Manter Beneficiários ----
// Consulta: qualquer perfil autenticado (RN-11). Incluir, alterar e inativar: só o Gerente.
const beneficiario = new BeneficiarioController();
const qualquerPerfil = [autenticado, exigePerfil(PERFIS.ATENDENTE)];
rotas.get('/beneficiarios', qualquerPerfil, beneficiario.listar);
rotas.get('/beneficiarios/:id', qualquerPerfil, beneficiario.buscarPorId);
rotas.post('/beneficiarios', gerente, beneficiario.incluir);
rotas.put('/beneficiarios/:id', gerente, beneficiario.alterar);
rotas.patch('/beneficiarios/:id/inativar', gerente, beneficiario.inativar);

// ---- RF-03 Situações de Risco e RF-04 Tipos de Benefício ----
// Consulta: qualquer perfil (a triagem precisa das listas). Demais ações: só o Gerente (RN-16).
const cadastros = [
  ['situacoes-risco', new SituacaoRiscoController()],
  ['tipos-beneficio', new TipoBeneficioController()],
];
for (const [recurso, ctrl] of cadastros) {
  rotas.get(`/${recurso}`, qualquerPerfil, ctrl.listar);
  rotas.get(`/${recurso}/:id`, qualquerPerfil, ctrl.buscarPorId);
  rotas.post(`/${recurso}`, gerente, ctrl.incluir);
  rotas.put(`/${recurso}/:id`, gerente, ctrl.alterar);
  rotas.patch(`/${recurso}/:id/inativar`, gerente, ctrl.inativar);
  rotas.patch(`/${recurso}/:id/reativar`, gerente, ctrl.reativar);
}

// ---- Próximos: RF-05 a RF-08 seguem o mesmo padrão ----

module.exports = rotas;
