-- =====================================================================
-- Sistema Fluxo - Criação física do modelo de dados (PostgreSQL 14+)
-- Benefícios eventuais da Promoção Social - Goianésia/GO
-- Execução: psql -U postgres -d fluxo -f 01_criacao.sql
-- =====================================================================
-- Convenções:
--   * nomes de tabelas e colunas em snake_case, no singular;
--   * PK "id" (identity); FK "id_<tabela>";
--   * nada é excluído: os registros são inativados (ativo = false)
--     ou cancelados (aquisicao.status = 'CANCELADA') - RN-05, RN-10, RN-15, RN-19, RN-36;
--   * os domínios (perfil, setor, situação...) usam CHECK com os
--     mesmos valores das enumerações do diagrama de classes.
-- =====================================================================

BEGIN;

-- Extensão usada para comparar nomes sem acento (RN-13 e RN-18)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() não é IMMUTABLE; este invólucro permite usá-la em índices únicos
CREATE OR REPLACE FUNCTION f_normaliza(texto text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, trim(texto))) $$;

-- ---------------------------------------------------------------------
-- RF-01 Manter Profissionais
-- ---------------------------------------------------------------------
CREATE TABLE profissional (
    id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(100) NOT NULL,
    login           varchar(30)  NOT NULL,
    senha_hash      varchar(100) NOT NULL,                       -- bcrypt (RN-03 / RNF-10)
    perfil          varchar(10)  NOT NULL DEFAULT 'ENTREGADOR',
    ativo           boolean      NOT NULL DEFAULT true,          -- RN-05
    criado_em       timestamptz  NOT NULL DEFAULT now(),
    atualizado_em   timestamptz,
    CONSTRAINT ck_profissional_perfil CHECK (perfil IN ('ATENDENTE', 'ENTREGADOR', 'GERENTE')),  -- RN-04
    CONSTRAINT ck_profissional_login  CHECK (login ~ '^[A-Za-z0-9._-]{3,30}$')                     -- MSGE-07
);
-- RN-02: login único (sem diferenciar maiúsculas)
CREATE UNIQUE INDEX uq_profissional_login ON profissional (lower(login));

-- ---------------------------------------------------------------------
-- RF-02 Manter Beneficiários
-- ---------------------------------------------------------------------
CREATE TABLE beneficiario (
    id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(100) NOT NULL,
    cpf             char(11)     NOT NULL,                       -- só dígitos; a máscara fica na tela
    telefone        varchar(11)  NOT NULL,                       -- DDD + número, só dígitos
    endereco        varchar(150) NOT NULL,
    bairro          varchar(60)  NOT NULL,
    ativo           boolean      NOT NULL DEFAULT true,          -- RN-10
    criado_em       timestamptz  NOT NULL DEFAULT now(),
    atualizado_em   timestamptz,
    CONSTRAINT uq_beneficiario_cpf      UNIQUE (cpf),            -- RN-09
    CONSTRAINT ck_beneficiario_cpf      CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_beneficiario_telefone CHECK (telefone ~ '^[0-9]{10,11}$')   -- MSGE-08
);
CREATE INDEX ix_beneficiario_nome   ON beneficiario (f_normaliza(nome));
CREATE INDEX ix_beneficiario_bairro ON beneficiario (f_normaliza(bairro));

-- ---------------------------------------------------------------------
-- RF-03 Manter Situações de Risco
-- ---------------------------------------------------------------------
CREATE TABLE situacao_risco (
    id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(80)  NOT NULL,
    descricao       varchar(255),
    concessao       varchar(10)  NOT NULL DEFAULT 'UNICO',
    qtd_meses       smallint,
    ativo           boolean      NOT NULL DEFAULT true,          -- RN-15
    criado_em       timestamptz  NOT NULL DEFAULT now(),
    atualizado_em   timestamptz,
    CONSTRAINT ck_situacao_concessao CHECK (concessao IN ('UNICO', 'RECORRENTE')),   -- RN-12
    -- RN-14: Recorrente exige 2 a 24 meses; Único fica sem valor
    CONSTRAINT ck_situacao_meses CHECK (
        (concessao = 'UNICO'      AND qtd_meses IS NULL) OR
        (concessao = 'RECORRENTE' AND qtd_meses BETWEEN 2 AND 24))
);
CREATE UNIQUE INDEX uq_situacao_risco_nome ON situacao_risco (f_normaliza(nome));   -- RN-13

-- ---------------------------------------------------------------------
-- RF-04 Manter Tipos de Benefício
-- ---------------------------------------------------------------------
CREATE TABLE tipo_beneficio (
    id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(80)  NOT NULL,
    descricao       varchar(255),
    ativo           boolean      NOT NULL DEFAULT true,          -- RN-19
    criado_em       timestamptz  NOT NULL DEFAULT now(),
    atualizado_em   timestamptz
);
CREATE UNIQUE INDEX uq_tipo_beneficio_nome ON tipo_beneficio (f_normaliza(nome));   -- RN-18

-- ---------------------------------------------------------------------
-- RF-05 Registrar Triagem / RF-06 Gerenciar Entrega
-- Uma linha por mês atendido. Situação recorrente de N meses gera N linhas
-- (parcela 1..N); as parcelas 2..N apontam para a 1ª em id_solicitacao_origem (RN-25).
-- ---------------------------------------------------------------------
CREATE TABLE solicitacao (
    id                       integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_beneficiario          integer     NOT NULL REFERENCES beneficiario (id),
    id_tipo_beneficio        integer     NOT NULL REFERENCES tipo_beneficio (id),
    id_situacao_risco        integer     NOT NULL REFERENCES situacao_risco (id),
    id_profissional_triagem  integer     NOT NULL REFERENCES profissional (id),   -- RN-26
    id_profissional_entrega  integer              REFERENCES profissional (id),   -- RN-28
    id_solicitacao_origem    integer              REFERENCES solicitacao (id),
    setor                    varchar(16) NOT NULL,
    situacao                 varchar(10) NOT NULL DEFAULT 'PENDENTE',
    data_solicitacao         date        NOT NULL,
    mes_referencia           date        NOT NULL,                                -- RN-23 (sempre dia 1)
    parcela                  smallint    NOT NULL DEFAULT 1,
    total_parcelas           smallint    NOT NULL DEFAULT 1,
    alerta_duplicidade       boolean     NOT NULL DEFAULT false,                  -- RN-24 (alerta, não bloqueia)
    data_hora_triagem        timestamptz NOT NULL DEFAULT now(),                  -- RN-26
    data_hora_entrega        timestamptz,                                         -- RN-28
    CONSTRAINT ck_solicitacao_setor    CHECK (setor IN ('CRAS', 'CREAS', 'PROMOCAO_SOCIAL')),
    -- RN-27
    CONSTRAINT ck_solicitacao_situacao CHECK (
        situacao IN ('PENDENTE', 'EM_TRIAGEM', 'APROVADO', 'ENTREGUE')),
    CONSTRAINT ck_solicitacao_mes      CHECK (extract(day FROM mes_referencia) = 1),
    CONSTRAINT ck_solicitacao_parcela  CHECK (
        parcela BETWEEN 1 AND total_parcelas AND total_parcelas BETWEEN 1 AND 24),
    CONSTRAINT ck_solicitacao_entrega  CHECK (
        (situacao = 'ENTREGUE' AND id_profissional_entrega IS NOT NULL
                               AND data_hora_entrega IS NOT NULL) OR
        (situacao <> 'ENTREGUE'))
);
-- verificação de duplicidade (RN-24/RN-25) e lista do mês
CREATE INDEX ix_solicitacao_duplicidade
    ON solicitacao (id_beneficiario, id_tipo_beneficio, mes_referencia);
CREATE INDEX ix_solicitacao_mes         ON solicitacao (mes_referencia, situacao);

-- RNF-11 / RN-29: toda mudança de situação fica registrada
CREATE TABLE historico_situacao (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitacao     integer     NOT NULL REFERENCES solicitacao (id),
    id_profissional    integer     NOT NULL REFERENCES profissional (id),
    situacao_anterior  varchar(10),                                  -- nulo no registro da triagem
    situacao_nova      varchar(10) NOT NULL,
    data_hora          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_historico_anterior CHECK (
        situacao_anterior IN ('PENDENTE', 'EM_TRIAGEM', 'APROVADO', 'ENTREGUE')),
    CONSTRAINT ck_historico_nova     CHECK (
        situacao_nova IN ('PENDENTE', 'EM_TRIAGEM', 'APROVADO', 'ENTREGUE'))
);
CREATE INDEX ix_historico_solicitacao ON historico_situacao (id_solicitacao);

-- ---------------------------------------------------------------------
-- RF-08 Manter Aquisições e Acompanhar Recursos (somente Gerente)
-- ---------------------------------------------------------------------
CREATE TABLE aquisicao (
    id                   integer       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_beneficio    integer       NOT NULL REFERENCES tipo_beneficio (id),
    data_compra          date          NOT NULL,                  -- não pode ser futura (validado no Service, RN-34)
    fonte                varchar(18)   NOT NULL,
    identificacao_fonte  varchar(60),
    quantidade           integer       NOT NULL,
    valor_total          numeric(12,2) NOT NULL,
    status               varchar(9)    NOT NULL DEFAULT 'ATIVA',
    motivo_cancelamento  varchar(255),
    id_criado_por        integer       NOT NULL REFERENCES profissional (id),   -- RN-36
    criado_em            timestamptz   NOT NULL DEFAULT now(),
    id_atualizado_por    integer                REFERENCES profissional (id),
    atualizado_em        timestamptz,
    id_cancelado_por     integer                REFERENCES profissional (id),
    cancelado_em         timestamptz,
    CONSTRAINT ck_aquisicao_fonte      CHECK (
        fonte IN ('MUNICIPAL', 'ESTADUAL', 'FEDERAL', 'EMENDA_PARLAMENTAR', 'OUTRA')),
    CONSTRAINT ck_aquisicao_quantidade CHECK (quantidade > 0),    -- RN-34 / MSGE-11
    CONSTRAINT ck_aquisicao_valor      CHECK (valor_total > 0),   -- RN-34 / MSGE-11
    CONSTRAINT ck_aquisicao_status     CHECK (status IN ('ATIVA', 'CANCELADA')),
    CONSTRAINT ck_aquisicao_cancelamento CHECK (                   -- RN-36 / MSGE-13
        (status = 'ATIVA') OR
        (status = 'CANCELADA' AND motivo_cancelamento IS NOT NULL
                              AND length(trim(motivo_cancelamento)) > 0
                              AND id_cancelado_por IS NOT NULL AND cancelado_em IS NOT NULL))
);
CREATE INDEX ix_aquisicao_tipo_data ON aquisicao (id_tipo_beneficio, data_compra);

COMMIT;
