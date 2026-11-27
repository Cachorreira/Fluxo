# Fluxo – Backend (API REST)

API do sistema Fluxo, que substitui a planilha de benefícios eventuais da Promoção Social de Goianésia.
Stack (RNF-01): **Node.js + Express**, **PostgreSQL**, **bcrypt** para as senhas e **JWT** para a sessão.

## Como rodar

Pré-requisitos: Node.js 20 ou mais novo e PostgreSQL 14 ou mais novo.

```bash
npm install
cp .env.example .env          # ajuste usuário/senha do banco e o JWT_SEGREDO
# no psql:  CREATE DATABASE fluxo;
npm run db:criar              # cria as tabelas (database/01_criacao.sql)
npm run seed                  # cria o primeiro Gerente (login "gerente", senha do .env)
npm run dev                   # sobe em http://localhost:3000/api e reinicia ao salvar
```

Testes (usam um banco separado, que é **apagado e recriado** a cada execução):

```bash
# no psql:  CREATE DATABASE fluxo_teste;
npm test
```

## Arquitetura em camadas (padrão da disciplina)

O código segue o diagrama de sequência ensinado em aula (caso "Incluir Marca"). Para o RF-01:

```
Tela (frontend) ⇄ HTTP/JSON ⇄ Controller → Service → DTO → Entity → Repository → PostgreSQL
```

| Camada | Pasta | O que faz | Exemplo |
|---|---|---|---|
| Controller | `src/controllers` | Recebe a requisição, monta o DTO, chama o Service e devolve a resposta com o status HTTP. Não tem regra de negócio. | `ProfissionalController.incluir` |
| Service | `src/services` | Regras de negócio (RN-xx), na ordem do diagrama: `paraEntidade` → `validaCampos` → `validaEntity` → `repository.validaExiste` → `salvar` → mensagem. Erros passam por `trataMensagem()`. | `ProfissionalService.incluir` |
| DTO | `src/dtos` | Dados que vêm da tela. Converte para a entidade (`paraEntidade`), valida obrigatórios e formatos (`validaCampos`) e converte a entidade de volta para a tela, sem a senha (`deEntidade`). | `ProfissionalDTO` |
| Entity | `src/entities` | O objeto do domínio, com o comportamento dele (hash da senha, autenticar, inativar). | `Profissional` |
| Repository | `src/repositories` | Único lugar com SQL. `validaExiste`, `salvar` (INSERT + COMMIT), `atualizar`, `listar`... | `ProfissionalRepository` |

Apoio:
- `src/common/Mensagem.js`: catálogo das mensagens da documentação (MSGS, MSGE). Toda resposta é `{ codigo, texto, dados?, erros? }`.
- `src/common/perfis.js`: hierarquia dos perfis (Atendente < Entregador < Gerente).
- `src/middlewares/autenticacao.js`: `autenticado` (token válido de profissional ativo) e `exigePerfil(perfilMinimo)`.
- `src/routes/index.js`: todas as rotas, com o perfil mínimo de cada uma.

Os diagramas estão na pasta `diagramas/` do projeto: classes (domínio e projeto do RF-01), modelo de dados, casos de uso e sequência (SD-01 a SD-03).

## Endpoints prontos

| Método e rota | Perfil mínimo | Resposta de sucesso | Erros |
|---|---|---|---|
| `POST /api/auth/login` `{login, senha}` | aberta | 200 `{dados:{token, profissional}}` | 400 MSGE-01, 401 MSGE-15 |
| `GET /api/auth/eu` | qualquer perfil | 200 dados do usuário logado | 401 MSGE-16 |
| `GET /api/profissionais?busca=&status=todos\|ativos\|inativos` | Gerente | 200 lista | 401, 403 MSGE-17 |
| `GET /api/profissionais/:id` | Gerente | 200 | 404 |
| `POST /api/profissionais` `{nome, login, senha, perfil}` | Gerente | 201 MSGS-01 | 400 MSGE-01 (+ MSGE-02/06/07 por campo), 409 MSGE-05 |
| `PUT /api/profissionais/:id` (senha opcional) | Gerente | 200 MSGS-02 | 400, 404, 409 MSGE-05 |
| `PATCH /api/profissionais/:id/inativar` | Gerente | 200 MSGS-03 | 404 |
| `PATCH /api/profissionais/:id/reativar` | Gerente | 200 MSGS-04 | 404 |
| `GET /api/beneficiarios?busca=&status=todos\|ativos\|inativos` (busca por nome, CPF ou bairro) | Atendente (todos os perfis) | 200 lista | 401 |
| `GET /api/beneficiarios/:id` | Atendente (todos os perfis) | 200 | 404 |
| `POST /api/beneficiarios` `{nome, cpf, telefone, endereco, bairro}` | Gerente | 201 MSGS-05 | 400 MSGE-01 (+ MSGE-02/03/08 por campo), 409 MSGE-04 |
| `PUT /api/beneficiarios/:id` | Gerente | 200 MSGS-06 | 400, 404, 409 MSGE-04 |
| `PATCH /api/beneficiarios/:id/inativar` | Gerente | 200 MSGS-07 | 404 |
| `GET /api/situacoes-risco?busca=&status=` e `GET /api/situacoes-risco/:id` | todos os perfis | 200 | 401, 404 |
| `POST` / `PUT /api/situacoes-risco[/:id]` `{nome, descricao?, concessao: UNICO\|RECORRENTE, qtdMeses}` | Gerente | 201 MSGS-08 / 200 MSGS-09 | 400 MSGE-01 (+ MSGE-02/09), 409 MSGE-10 |
| `PATCH /api/situacoes-risco/:id/inativar` e `/reativar` | Gerente | 200 MSGS-10 / MSGS-11 | 404 |
| `GET /api/tipos-beneficio?busca=&status=` e `GET /api/tipos-beneficio/:id` | todos os perfis | 200 | 401, 404 |
| `POST` / `PUT /api/tipos-beneficio[/:id]` `{nome, descricao?}` | Gerente | 201 MSGS-12 / 200 MSGS-13 | 400 MSGE-01 (+ MSGE-02), 409 MSGE-10 |
| `PATCH /api/tipos-beneficio/:id/inativar` e `/reativar` | Gerente | 200 MSGS-14 / MSGS-15 | 404 |

As rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`. Falha inesperada (banco fora do ar) devolve 500 com MSGE-14.

## Como implementar o próximo requisito

O RF-02 (Beneficiários) já segue estes passos e serve de modelo, junto com o RF-01:

1. `src/entities/Beneficiario.js` – a entidade, com `deLinha()` e o comportamento (ex.: `inativar()`).
2. `src/dtos/BeneficiarioDTO.js` – `paraEntidade()`, `validaCampos()` (RN-07, CPF com dígitos verificadores – RN-08) e `deEntidade()`.
3. `src/repositories/BeneficiarioRepository.js` – `validaExiste(cpf, idIgnorar)` (RN-09), `salvar`, `atualizar`, `listar`, `alterarStatus`.
4. `src/services/BeneficiarioService.js` – mesma ordem do `ProfissionalService`, com as mensagens MSGS-05 a 07 e MSGE-03, 04 e 08 (adicione os textos em `Mensagem.js`).
5. `src/controllers/BeneficiarioController.js` – igual ao de profissionais.
6. Rotas em `src/routes/index.js` com o perfil da tabela de níveis de acesso: consultar = `ATENDENTE`; incluir, alterar e inativar = `GERENTE`.
7. Um arquivo de teste em `tests/`.

## Decisões e pendências

- MSGE-15, MSGE-16 e MSGE-17 (autenticação) foram aprovadas e estão na documentação.
- CPF e telefone são gravados só com os dígitos; a API aceita com ou sem máscara e devolve com máscara. O RF-02 não prevê reativar beneficiário.
- Situação de risco "Único" ignora a quantidade de meses (fica nula); "Recorrente" exige de 2 a 24 (RN-14). A concessão aceita "Único", "unico" ou "UNICO".
- O login não diferencia maiúsculas (`Sirlene` e `sirlene` são o mesmo login).
- O token vale 8 horas (um expediente). Inativar um profissional derruba o acesso dele na hora, mesmo com token válido (RN-05).
- Senhas e dados de teste são fictícios (RNF-09 / LGPD).
