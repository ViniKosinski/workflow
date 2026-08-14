# Visão do produto Workflow

## Objetivo

Construir uma plataforma empresarial na qual organizações possam modelar,
publicar, executar, acompanhar e auditar processos envolvendo pessoas e,
posteriormente, sistemas externos.

O produto não é apenas um gerenciador de tarefas. Uma definição representa
como um processo funciona; uma revisão publicada preserva uma versão imutável
desse modelo; e cada execução possui estado, dados, tarefas, decisões e
histórico independentes.

## Experiência desejada

Uma organização deve conseguir:

1. criar um processo;
2. definir etapas, transições, responsáveis e formulários;
3. publicar uma revisão;
4. iniciar múltiplas execuções independentes;
5. distribuir tarefas aos participantes;
6. coletar dados e resultados em cada etapa;
7. encaminhar a execução pelo motor de decisões;
8. consultar responsáveis, decisões, tempos e histórico.

## Pilares

- **Processos:** definições, revisões, etapas, transições, formulários e regras.
- **Execução:** runs, tarefas, dados, decisões, concorrência e histórico.
- **Colaboração:** organizações, usuários, papéis, equipes e responsabilidades.
- **Gestão:** filas, indicadores, SLAs, auditoria e relatórios.
- **Automação:** eventos, notificações, webhooks, workers e integrações.

## Princípios arquiteturais

- Regras e invariantes permanecem no domínio.
- Casos de uso e autorização pertencem à aplicação.
- Prisma, PostgreSQL e integrações pertencem à infraestrutura.
- HTTP e React não decidem regras do workflow.
- Revisões publicadas são imutáveis.
- Execuções são persistidas e controladas independentemente.
- Toda operação respeita isolamento organizacional, atomicidade e concorrência.
- Evoluções futuras não justificam complexidade prematura no núcleo atual.

## Limites atuais

Ainda não fazem parte do núcleo consolidado: SLAs, notificações externas,
etapas automáticas, regras condicionais baseadas em dados, designer BPMN,
analytics avançado, marketplace e aplicações móveis.
