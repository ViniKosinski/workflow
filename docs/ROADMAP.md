# Roadmap

## Base consolidada

- Autenticação e sessões seguras.
- Organizações, memberships, papéis e autorização.
- Motor de workflows com transições, ramificações e histórico.
- Tarefas colaborativas.
- Optimistic locking e persistência transacional.
- Definições, revisões imutáveis e execuções independentes.
- Formulários dinâmicos, snapshots e valores por execução.

## Próximo épico: experiência empresarial de execução

Objetivo: permitir que um usuário encontre uma tarefa, abra sua execução,
preencha os dados necessários, escolha um resultado e deixe o motor encaminhar
o processo à próxima etapa.

Escopo inicial:

- fila "Minhas tarefas";
- tarefas da organização;
- busca, filtros e paginação básica;
- detalhes da tarefa e da execução;
- formulário da execução;
- início e conclusão da tarefa;
- seleção de resultado e observação;
- encaminhamento automático;
- histórico compreensível;
- estados vazios, erros e conflitos de concorrência claros.
- construtor visual didático para desenhar o caminho principal do fluxo.

Critério de aceite principal: executar integralmente um processo piloto de
solicitação e aprovação de compra sem acesso direto à API ou ao banco.

### Entrega inicial implementada

- fila com busca, filtro por status, ordenação e paginação;
- distinção visual entre tarefas pendentes e iniciadas;
- início explícito da tarefa pela interface;
- contexto da organização, workflow e responsável;
- formulário dinâmico integrado à execução da tarefa;
- resultado e observação na mesma experiência;
- persistência atômica do formulário, conclusão e encaminhamento;
- histórico da tarefa e tratamento de conflitos e erros.
- visão gerencial das tarefas da organização para owners e admins;
- busca, filtro por status, paginação e detalhe gerencial somente leitura;
- acompanhamento de responsável, workflow, estado e histórico com isolamento organizacional.

O processo piloto de solicitação e aprovação de compra está coberto ponta a
ponta no Chromium, incluindo criação e publicação da definição, formulário,
execução por solicitante e aprovador e acompanhamento gerencial. Permanece para
a evolução do épico ampliar os cenários de rejeição e conflitos no E2E.

## Fases posteriores

1. Equipes, departamentos e atribuições mais granulares. Fundação implementada com cadastro de setores, gestores, membros, isolamento organizacional e administração por owners/admins; permanece atribuir etapas e filas às equipes.
2. Dashboard operacional e métricas básicas. Entrega implementada com contadores, distribuição por status e workflow, tarefas há mais tempo sem atualização, filtros de 7/30/90 dias, volume diário e tempos médios de execução e etapa.
3. Prazos e políticas de SLA. Primeira entrega implementada com prazo por etapa versionada, vencimento por tarefa ativa e sinalização nas filas e detalhes.
4. Notificações internas e transactional outbox.
5. E-mail, webhooks e integrações.
6. Etapas automáticas executadas por workers.
7. Regras condicionais baseadas nos dados da execução.
8. Auditoria administrativa e relatórios avançados.
9. Templates reutilizáveis de processos.

## Preparação para produção

Antes da primeira implantação pública:

- pipeline de CI e ambiente de staging;
- configuração segura de segredos e sessões;
- estratégia de migrations, backup e restauração;
- logs estruturados, monitoramento e alertas;
- testes end-to-end dos caminhos críticos;
- paginação e limites operacionais;
- revisão de segurança e isolamento multi-tenant.
