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
