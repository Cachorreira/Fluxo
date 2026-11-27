// Perfis de acesso (RN-04). Cada perfil herda o acesso do anterior:
// ATENDENTE < ENTREGADOR < GERENTE (diagrama de casos de uso).
const PERFIS = Object.freeze({ ATENDENTE: 'ATENDENTE', ENTREGADOR: 'ENTREGADOR', GERENTE: 'GERENTE' });

const NIVEL = Object.freeze({ ATENDENTE: 1, ENTREGADOR: 2, GERENTE: 3 });

/** true se o perfil do usuário alcança o perfil mínimo exigido. */
function temAcesso(perfilUsuario, perfilMinimo) {
  return (NIVEL[perfilUsuario] || 0) >= NIVEL[perfilMinimo];
}

function ehPerfilValido(perfil) {
  return Object.prototype.hasOwnProperty.call(NIVEL, perfil);
}

module.exports = { PERFIS, NIVEL, temAcesso, ehPerfilValido };
