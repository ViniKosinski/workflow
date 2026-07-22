# Workflow

Workflow é uma plataforma web para gerenciamento de processos e workflows empresariais.

## Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- App Router
- ESLint

## Como executar

Instale as dependências:

```bash
npm install
```

Execute o ambiente de desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Scripts

- `npm run dev`: inicia o servidor local.
- `npm run build`: gera a build de produção.
- `npm run start`: executa a build de produção.
- `npm run lint`: executa o ESLint.
- `npm run type-check`: valida os tipos TypeScript.
- `npm test`: executa todos os testes; com `TEST_DATABASE_URL`, aplica as migrations e inclui as integrações.
- `npm run test:integration`: aplica as migrations e executa apenas os testes de integração.

## Estrutura

```text
src/
  app/
    # Rotas, layouts globais e arquivos do App Router.
    globals.css
    layout.tsx
    page.tsx
  modules/
    dashboard/
      presentation/
        pages/
    workflows/
      domain/
      application/
      infrastructure/
      presentation/
  shared/
    components/
      layout/
      ui/
```

## Arquitetura

O projeto segue uma organização modular para manter responsabilidades separadas:

- `src/app`: camada de roteamento do Next.js. Deve permanecer fina e delegar a composição para módulos.
- `src/modules`: funcionalidades de negócio organizadas por domínio.
- `domain`: tipos, entidades e contratos centrais da funcionalidade.
- `application`: casos de uso e orquestração de regras.
- `infrastructure`: integrações externas, dados mockados, APIs e persistência.
- `presentation`: componentes e páginas específicas do módulo.
- `src/shared`: componentes e utilitários reutilizáveis por múltiplos módulos.

Quando uma funcionalidade exigir mudanças relevantes nessa estrutura, a arquitetura deve ser reavaliada antes da implementação.

## Diretrizes de desenvolvimento

- Priorize simplicidade, legibilidade e manutenção.
- Utilize uma arquitetura modular e escalável.
- Evite duplicação de código.
- Siga princípios SOLID quando eles ajudarem a reduzir acoplamento e melhorar clareza.
- Separe claramente interface, regras de negócio, serviços e acesso a dados.
- Não implemente soluções complexas sem necessidade.
- Antes de criar código novo, reutilize componentes e padrões existentes sempre que possível.
- Mantenha baixo acoplamento e alta coesão entre os módulos.
- Preserve compatibilidade com o código existente.
- Faça commits pequenos e descritivos.

Antes de implementar uma nova funcionalidade:

1. Analise a arquitetura atual.
2. Verifique se a funcionalidade se encaixa na estrutura existente.
3. Caso seja necessária uma mudança arquitetural significativa, apresente uma proposta antes de implementar.

Ao corrigir bugs, identifique a causa raiz primeiro, explique resumidamente o problema e implemente uma solução definitiva, evitando efeitos colaterais.

Antes de concluir uma tarefa, valide TypeScript, ESLint e build:

```bash
npm run type-check
npm run lint
npm run build
```

## Autenticação e dados legados

As migrations da Sprint 4 associam workflows anteriores à autenticação ao usuário desabilitado `legacy-workflow-owner`. Depois de criar o usuário real que receberá esses dados, execute:

```bash
npm run workflows:reassign-legacy -- usuario@example.com
```

Para executar as suítes de integração de autenticação e ownership, configure `TEST_DATABASE_URL` com um PostgreSQL exclusivo de testes e rode `npm run test:integration`. O preparo aplica automaticamente todas as migrations antes dos testes e recusa bancos cujo nome não contenha `test`. Nunca use um banco de produção para esses testes.
