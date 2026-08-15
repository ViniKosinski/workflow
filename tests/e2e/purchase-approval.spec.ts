import { expect, test, type Page } from "@playwright/test";

const password = "CompraTeste123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  const loginResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Entrar" }).click();
  expect((await loginResponse).ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Minha fila" })).toBeVisible();
  const organizationResponse = page.waitForResponse((response) => response.url().endsWith("/api/organizations/active") && response.request().method() === "POST");
  await page.getByLabel("Organização ativa").selectOption({ label: "Compras Piloto" });
  const selectedOrganization = await organizationResponse;
  if (!selectedOrganization.ok()) throw new Error(`Falha ao selecionar organização: ${selectedOrganization.status()} ${await selectedOrganization.text()}`);
  await expect(page.getByLabel("Organização ativa")).toHaveValue("purchase-pilot");
}

test("executa integralmente uma solicitação e aprovação de compra pela interface", async ({ browser }) => {
  const requesterContext = await browser.newContext();
  const requester = await requesterContext.newPage();
  await login(requester, "solicitante@compras.test");

  await requester.goto("/workflow-definitions");
  await requester.getByLabel("Nome", { exact: true }).fill("Solicitação e aprovação de compra");
  await requester.getByLabel("Etapas, separadas por vírgula").fill("Solicitar compra, Aprovar compra");
  await requester.getByRole("button", { name: "Criar rascunho" }).click();
  await requester.getByRole("link", { name: "Solicitação e aprovação de compra" }).click();

  const requestStep = requester.getByRole("group", { name: "Etapa 1" });
  const approvalStep = requester.getByRole("group", { name: "Etapa 2" });
  await requestStep.locator("select").nth(1).selectOption("editor");
  await approvalStep.locator("select").nth(1).selectOption("admin");
  await requestStep.getByLabel("Transição").fill("Enviar para aprovação");
  await requestStep.getByLabel("Resultado").fill("submitted");
  await approvalStep.getByLabel("Transição").fill("Aprovar");
  await approvalStep.getByLabel("Resultado").fill("approved");
  await approvalStep.getByRole("button", { name: "Adicionar transição" }).click();
  const approvalTransitions = approvalStep.locator("div.grid");
  const rejected = approvalTransitions.nth(1);
  await rejected.getByLabel("Transição").fill("Rejeitar");
  await rejected.getByLabel("Resultado").fill("rejected");
  await rejected.getByLabel("Encerrar workflow").check();

  const formEditor = requester.getByRole("heading", { name: "Formulário" }).locator("xpath=ancestor::section[1]");
  for (const field of [
    { key: "item", label: "Item solicitado", type: "text" },
    { key: "amount", label: "Valor estimado", type: "currency" },
    { key: "justification", label: "Justificativa", type: "textarea" },
  ]) {
    await formEditor.getByLabel("Chave").fill(field.key);
    await formEditor.getByLabel("Rótulo", { exact: true }).fill(field.label);
    await formEditor.getByLabel("Tipo").selectOption(field.type);
    await formEditor.getByLabel("Obrigatório").check();
    await formEditor.getByRole("button", { name: "Adicionar campo" }).click();
    await expect(formEditor.getByText(field.label, { exact: false })).toBeVisible();
  }
  await requester.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(requester.getByText("Rascunho salvo.")).toBeVisible();
  await requester.getByRole("button", { name: "Publicar" }).click();
  await expect(requester.getByRole("button", { name: "Iniciar execução" })).toBeVisible();
  await requester.getByRole("button", { name: "Iniciar execução" }).click();

  await requester.goto("/tasks");
  await requester.getByRole("link", { name: /Solicitar compra/ }).click();
  await requester.getByRole("button", { name: "Iniciar tarefa" }).click();
  await requester.getByLabel(/Item solicitado/).fill("Notebook para equipe financeira");
  await requester.getByLabel(/Valor estimado/).fill("7500,00");
  await requester.getByLabel(/Justificativa/).fill("Substituição de equipamento obsoleto");
  await requester.locator("label").filter({ hasText: "Enviar para aprovação" }).click();
  await requester.getByLabel("Observação (opcional)").fill("Solicitação validada pelo solicitante.");
  await requester.getByRole("button", { name: "Salvar e concluir tarefa" }).click();
  await expect(requester).toHaveURL(/\/tasks$/);
  await requesterContext.close();

  const approverContext = await browser.newContext();
  const approver = await approverContext.newPage();
  await login(approver, "aprovador@compras.test");
  await approver.goto("/tasks");
  await approver.getByRole("link", { name: /Aprovar compra/ }).click();
  await approver.getByRole("button", { name: "Iniciar tarefa" }).click();
  await approver.locator("label").filter({ hasText: "Aprovar" }).click();
  await approver.getByLabel("Observação (opcional)").fill("Compra aprovada dentro do orçamento.");
  await approver.getByRole("button", { name: "Salvar e concluir tarefa" }).click();
  await expect(approver).toHaveURL(/\/tasks$/);
  await approverContext.close();

  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await login(manager, "gestor@compras.test");
  await manager.goto("/tasks/organization");
  await manager.getByLabel("Status").selectOption("completed");
  await expect(manager.getByRole("link", { name: "Aprovar compra" })).toBeVisible();
  await manager.getByRole("link", { name: "Aprovar compra" }).click();
  await expect(manager.getByText("Visualização gerencial somente leitura.", { exact: false })).toBeVisible();
  await expect(manager.getByText("Compra aprovada dentro do orçamento.", { exact: false })).toBeVisible();
  await managerContext.close();
});
