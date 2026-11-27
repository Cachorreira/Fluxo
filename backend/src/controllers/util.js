// Funções de apoio usadas por todos os Controllers.

/** Envia a Mensagem do Service com o status HTTP que ela carrega. */
function responder(res, mensagem) {
  res.status(mensagem.status).json(mensagem.toJSON());
}

/** Lê o :id da rota como número inteiro (ou 0, que não existe no banco). */
function idDaRota(req) {
  const id = Number.parseInt(req.params.id, 10);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

module.exports = { responder, idDaRota };
