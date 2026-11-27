// Ponto de entrada: carrega o .env e sobe a API.
require('dotenv').config({ quiet: true });
const app = require('./app');

const PORTA = Number(process.env.PORTA || 3000);

if (!process.env.JWT_SEGREDO || process.env.JWT_SEGREDO.startsWith('troque')) {
  console.warn('AVISO: defina um JWT_SEGREDO próprio no arquivo .env antes de usar o sistema de verdade.');
}

app.listen(PORTA, () => {
  console.log(`API do Fluxo rodando em http://localhost:${PORTA}/api`);
});
