// Service de autenticação (Autenticar-se, RNF-08). Segue o diagrama SD-03.
const jwt = require('jsonwebtoken');
const ProfissionalRepository = require('../repositories/ProfissionalRepository');
const { Mensagem } = require('../common/Mensagem');

const SEGREDO = () => process.env.JWT_SEGREDO || 'troque-este-segredo-no-arquivo-env';
const VALIDADE = () => process.env.JWT_VALIDADE || '8h'; // um expediente

class AuthService {
  constructor(repository = new ProfissionalRepository()) {
    this.repository = repository;
  }

  async autenticar(dto) {
    const errosCampos = dto.validaCampos();
    if (errosCampos.length) return Mensagem.erro('MSGE-01', 400, errosCampos);

    const obj = await this.repository.buscarPorLogin(dto.login);
    const valido = obj ? await obj.autenticar(dto.senha) : false;
    if (!valido) return this.trataMensagem();

    const token = this.geraToken(obj);
    return Mensagem.sucesso(null, { token, profissional: { id: obj.id, nome: obj.nome, login: obj.login, perfil: obj.perfil } });
  }

  /** O token guarda só o necessário para o middleware: id, nome e perfil. */
  geraToken(obj) {
    return jwt.sign({ id: obj.id, nome: obj.nome, perfil: obj.perfil }, SEGREDO(), { expiresIn: VALIDADE() });
  }

  /** Confere o token e se o profissional continua ativo (RN-05). Retorna o usuário ou null. */
  async verificaToken(token) {
    try {
      const dados = jwt.verify(token, SEGREDO());
      const obj = await this.repository.buscarPorId(dados.id);
      if (!obj || !obj.ativo) return null;
      return { id: obj.id, nome: obj.nome, perfil: obj.perfil };
    } catch {
      return null;
    }
  }

  /**
   * Não informa se o erro foi no login, na senha ou se o profissional está
   * inativo, para não dar pistas a quem tenta adivinhar acessos.
   */
  trataMensagem() {
    return Mensagem.erro('MSGE-15', 401);
  }
}

module.exports = AuthService;
