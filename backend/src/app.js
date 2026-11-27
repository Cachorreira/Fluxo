// Montagem da aplicação Express (sem abrir porta, para poder ser testada).
const express = require('express');
const cors = require('cors');
const rotas = require('./routes');
const { Mensagem } = require('./common/Mensagem');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGEM || true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/saude', (req, res) => res.json({ status: 'ok' }));
app.use('/api', rotas);

// Rota inexistente
app.use('/api', (req, res) => {
  const msg = Mensagem.erro('NAO_ENCONTRADO', 404);
  res.status(404).json(msg.toJSON());
});

// Erro inesperado (banco fora do ar, JSON malformado...): registra e devolve MSGE-14 (E4 dos casos de uso).
// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    const msg = Mensagem.erro('MSGE-01', 400);
    return res.status(400).json(msg.toJSON());
  }
  // Corrida rara: dois cadastros com o mesmo login ao mesmo tempo (índice único do banco)
  if (erro.code === '23505' && String(erro.constraint).includes('login')) {
    const msg = Mensagem.erro('MSGE-05', 409);
    return res.status(409).json(msg.toJSON());
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, erro);
  const msg = Mensagem.erro('MSGE-14', 500);
  return res.status(500).json(msg.toJSON());
});

module.exports = app;
