// DTO do login (Autenticar-se).
const { Mensagem } = require('../common/Mensagem');

class LoginDTO {
  constructor(corpo = {}) {
    this.login = typeof corpo.login === 'string' ? corpo.login.trim() : '';
    this.senha = typeof corpo.senha === 'string' ? corpo.senha : '';
  }

  validaCampos() {
    const erros = [];
    if (!this.login) erros.push(Mensagem.campo('login', 'MSGE-02'));
    if (!this.senha) erros.push(Mensagem.campo('senha', 'MSGE-02'));
    return erros;
  }
}

module.exports = LoginDTO;
