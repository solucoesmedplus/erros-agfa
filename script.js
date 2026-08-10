"use strict";

const XML_FILE_NAME = "base_erros_equipamentos_agfa_pt_br.xml";
const RESULTS_PER_PAGE = 20;
const THEME_STORAGE_KEY = "agfa-preferred-theme";

const EQUIPMENTS = {
  cr10: {
    title: "CR10-X",
    category: "Digitalizador",
    xmlName: "CR10"
  },
  cr25_35: {
    title: "CR25/35-X",
    category: "Digitalizador",
    xmlName: "CR25_CR35_X"
  },
  cr30: {
    title: "CR30-X",
    category: "Digitalizador",
    xmlName: "CR30"
  },
  cr75_85: {
    title: "CR75/85-X",
    category: "Digitalizador",
    xmlName: "CR75_CR85_X"
  },
  dxm: {
    title: "DX-M",
    category: "Digitalizador",
    xmlName: "DX_M"
  },
  drystar5302: {
    title: "Drystar 5302",
    category: "Impressora",
    // A base consolidada recebida identifica esta família como DRYSTAR_5300.
    xmlName: "DRYSTAR_5300"
  },
  drystar5503: {
    title: "Drystar 5503",
    category: "Impressora",
    xmlName: "DRYSTAR_5503"
  },
  drystarAxys: {
    title: "Drystar Axys",
    category: "Impressora",
    xmlName: "DRYSTAR_AXYS"
  }
};

const FIELD_LABELS = {
  codigo_erro: "Código do erro",
  identificador: "Identificador",
  prioridade: "Prioridade",
  descricao: "Descrição",
  descricao_detalhada: "Descrição detalhada",
  id_servico: "ID de serviço",
  codigo_servico: "Código de serviço",
  mensagem_servico: "Mensagem de serviço",
  tipo: "Tipo",
  contexto: "Contexto",
  acao: "Ação",
  significado: "Significado",
  causa: "Causa",
  motivo: "Motivo",
  razao: "Razão",
  solucao: "Solução",
  cura: "Solução",
  modulo: "Módulo",
  peca: "Peça",
  parte: "Peça / parte",
  observacao: "Observação",
  causa_1: "Causa 1",
  solucao_1: "Solução 1",
  causa_2: "Causa 2",
  solucao_2: "Solução 2"
};

const XML_FIELD_ORIGINAL_NAMES = {
  codigo_erro: "ErrorCode",
  identificador: "Identifier",
  prioridade: "Priority",
  descricao: "Description",
  descricao_detalhada: "ExtendedDescription",
  id_servico: "ServID",
  codigo_servico: "ServCode",
  mensagem_servico: "ServiceMessage",
  causa: "reason",
  significado: "meaning",
  solucao: "cure",
  tipo: "type",
  contexto: "context",
  acao: "action",
  peca: "part",
  causa_1: "reason1",
  solucao_1: "cure1",
  causa_2: "reason2",
  solucao_2: "cure2"
};

const EQUIPMENT_FORM_FIELDS = {
  cr10: ["codigo_erro", "identificador", "prioridade", "descricao", "descricao_detalhada", "id_servico", "codigo_servico", "mensagem_servico"],
  cr25_35: ["codigo_erro", "identificador", "causa", "significado", "solucao"],
  cr30: ["codigo_erro", "identificador", "descricao", "descricao_detalhada"],
  cr75_85: ["codigo_erro", "identificador", "causa", "significado", "solucao"],
  dxm: ["codigo_erro", "identificador", "prioridade", "descricao", "descricao_detalhada"],
  drystar5302: ["codigo_erro", "identificador", "tipo", "contexto", "acao", "causa_1", "solucao_1", "causa_2", "solucao_2", "peca"],
  drystar5503: ["codigo_erro", "identificador", "tipo", "significado", "causa", "solucao", "peca"],
  drystarAxys: ["codigo_erro", "identificador", "tipo", "contexto", "acao", "causa", "solucao_1"]
};

const MULTILINE_FIELDS = new Set([
  "descricao", "descricao_detalhada", "mensagem_servico", "causa", "significado", "solucao",
  "contexto", "acao", "causa_1", "solucao_1", "causa_2", "solucao_2", "peca", "observacao"
]);

const state = {
  xmlDocument: null,
  xmlLoadPromise: null,
  selectedEquipmentKey: null,
  records: [],
  filteredRecords: [],
  currentPage: 1,
  searchTimer: null,
  toastTimer: null
};

const elements = {};

window.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  initializeTheme();
  bindEvents();
  document.body.classList.add("is-locked");
  loadXmlDatabase();
}

function cacheElements() {
  const ids = [
    "sidebar", "sidebarOverlay", "openSidebarBtn", "closeSidebarBtn", "homeBtn",
    "welcomeChooseBtn", "welcomeView", "queryView", "equipmentCategory",
    "equipmentTitle", "equipmentSubtitle", "equipmentTotal", "mobileEquipmentName",
    "searchInput", "clearSearchBtn", "resultSummary", "resultsList", "emptyState",
    "loadingState", "pagination", "previousPageBtn", "nextPageBtn", "pageIndicator",
    "introModal", "startBtn", "databaseStatusText", "statusDot", "xmlErrorModal",
    "xmlErrorMessage", "selectXmlBtn", "retryXmlBtn", "changeXmlBtn", "xmlFileInput",
    "newErrorBtn", "exportXmlBtn", "newErrorModal", "newErrorForm", "newErrorEquipment",
    "newErrorFields", "closeNewErrorBtn", "cancelNewErrorBtn", "saveNewErrorBtn", "toast"
  ];

  ids.forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".accordion-trigger").forEach((button) => {
    button.addEventListener("click", () => toggleAccordion(button));
  });

  document.querySelectorAll(".equipment-link").forEach((button) => {
    button.addEventListener("click", () => selectEquipment(button.dataset.equipment));
  });

  elements.openSidebarBtn.addEventListener("click", openSidebar);
  elements.closeSidebarBtn.addEventListener("click", closeSidebar);
  elements.sidebarOverlay.addEventListener("click", closeSidebar);
  elements.welcomeChooseBtn.addEventListener("click", handleChooseEquipment);
  elements.homeBtn.addEventListener("click", showHome);
  elements.startBtn.addEventListener("click", closeIntroModal);
  elements.newErrorBtn.addEventListener("click", openNewErrorModal);
  elements.exportXmlBtn.addEventListener("click", exportCurrentXml);
  elements.closeNewErrorBtn.addEventListener("click", closeNewErrorModal);
  elements.cancelNewErrorBtn.addEventListener("click", closeNewErrorModal);
  elements.newErrorModal.querySelector("[data-close-new-error]").addEventListener("click", closeNewErrorModal);
  elements.newErrorEquipment.addEventListener("change", renderNewErrorFields);
  elements.newErrorForm.addEventListener("submit", handleNewErrorSubmit);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });

  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.searchInput.value) {
      clearSearch();
    }
  });
  elements.clearSearchBtn.addEventListener("click", clearSearch);

  elements.previousPageBtn.addEventListener("click", () => changePage(-1));
  elements.nextPageBtn.addEventListener("click", () => changePage(1));

  elements.resultsList.addEventListener("click", handleResultsClick);

  elements.selectXmlBtn.addEventListener("click", () => elements.xmlFileInput.click());
  elements.changeXmlBtn.addEventListener("click", () => elements.xmlFileInput.click());
  elements.retryXmlBtn.addEventListener("click", retryXmlLoad);
  elements.xmlFileInput.addEventListener("change", handleLocalXmlSelection);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (!elements.newErrorModal.hidden) {
      closeNewErrorModal();
      return;
    }

    if (elements.sidebar.classList.contains("is-open")) {
      closeSidebar();
    }
  });
}

function openNewErrorModal() {
  if (!state.xmlDocument) {
    showToast("Carregue a base XML antes de cadastrar um novo erro.");
    return;
  }

  const equipmentKey = state.selectedEquipmentKey || "cr10";
  elements.newErrorEquipment.value = equipmentKey;
  elements.newErrorForm.reset();
  elements.newErrorEquipment.value = equipmentKey;
  renderNewErrorFields();
  elements.newErrorModal.hidden = false;
  document.body.classList.add("is-locked");

  requestAnimationFrame(() => {
    elements.newErrorFields.querySelector("input, textarea")?.focus();
  });
}

function closeNewErrorModal() {
  elements.newErrorModal.hidden = true;

  if (elements.introModal.hidden && elements.xmlErrorModal.hidden && !elements.sidebar.classList.contains("is-open")) {
    document.body.classList.remove("is-locked");
  }
}

function renderNewErrorFields() {
  const equipmentKey = elements.newErrorEquipment.value;
  const fieldNames = EQUIPMENT_FORM_FIELDS[equipmentKey] || [];

  elements.newErrorFields.innerHTML = fieldNames.map((fieldName) => {
    const label = FIELD_LABELS[fieldName] || humanizeFieldName(fieldName);
    const isRequired = fieldName === "codigo_erro" || fieldName === "identificador";
    const isMono = fieldName === "codigo_erro" || fieldName === "identificador" || fieldName === "id_servico" || fieldName === "codigo_servico";
    const fieldClass = MULTILINE_FIELDS.has(fieldName) ? "form-field form-field--full" : "form-field";
    const inputClass = isMono ? "form-control is-mono" : "form-control";
    const requiredAttribute = isRequired ? " required" : "";
    const requiredMark = isRequired ? ' <span aria-hidden="true">*</span>' : "";

    if (MULTILINE_FIELDS.has(fieldName)) {
      return `
        <div class="${fieldClass}">
          <label for="new-${fieldName}">${escapeHtml(label)}${requiredMark}</label>
          <textarea class="${inputClass}" id="new-${fieldName}" name="${fieldName}" rows="4"${requiredAttribute} placeholder="Digite ${escapeAttribute(label.toLowerCase())}"></textarea>
        </div>`;
    }

    return `
      <div class="${fieldClass}">
        <label for="new-${fieldName}">${escapeHtml(label)}${requiredMark}</label>
        <input class="${inputClass}" id="new-${fieldName}" name="${fieldName}" type="text" autocomplete="off" spellcheck="false"${requiredAttribute} placeholder="Digite ${escapeAttribute(label.toLowerCase())}">
      </div>`;
  }).join("");
}

async function handleNewErrorSubmit(event) {
  event.preventDefault();

  if (!state.xmlDocument) {
    showToast("A base XML não está carregada.");
    return;
  }

  if (!elements.newErrorForm.reportValidity()) return;

  const equipmentKey = elements.newErrorEquipment.value;
  const equipment = EQUIPMENTS[equipmentKey];
  const fieldNames = EQUIPMENT_FORM_FIELDS[equipmentKey] || [];
  const formData = new FormData(elements.newErrorForm);
  const values = Object.fromEntries(fieldNames.map((name) => [name, cleanText(formData.get(name) || "")]));
  const code = values.codigo_erro;
  const identifier = values.identificador;

  if (!equipment || !code || !identifier) {
    showToast("Informe o equipamento, o código e o identificador.");
    return;
  }

  const equipmentNode = findEquipmentNode(equipment.xmlName);
  if (!equipmentNode) {
    showToast(`O equipamento ${equipment.title} não foi encontrado no XML.`);
    return;
  }

  const duplicate = Array.from(equipmentNode.querySelectorAll(":scope > erros > erro")).find((errorNode) => {
    return cleanText(errorNode.getAttribute("codigo")) === code || cleanText(errorNode.getAttribute("identificador")) === identifier;
  });

  if (duplicate) {
    showToast("Já existe um erro com esse código ou identificador neste equipamento.");
    return;
  }

  elements.saveNewErrorBtn.disabled = true;

  try {
    appendManualError(equipmentNode, equipmentKey, values);
    closeNewErrorModal();
    await selectEquipment(equipmentKey, { preserveMenu: true });
    elements.searchInput.value = code;
    elements.clearSearchBtn.hidden = false;
    applySearch(code);
    downloadUpdatedXml();
    showToast(`Erro ${code} adicionado. O XML atualizado foi gerado.`);
  } catch (error) {
    console.error("Falha ao cadastrar novo erro:", error);
    showToast("Não foi possível cadastrar o erro. Revise os dados e tente novamente.");
  } finally {
    elements.saveNewErrorBtn.disabled = false;
  }
}

function findEquipmentNode(xmlEquipmentName) {
  return Array.from(state.xmlDocument.querySelectorAll("equipamentos > equipamento"))
    .find((node) => node.getAttribute("nome") === xmlEquipmentName) || null;
}

function appendManualError(equipmentNode, equipmentKey, values) {
  const errorsNode = equipmentNode.querySelector(":scope > erros");
  if (!errorsNode) throw new Error("Nó de erros não encontrado.");

  const existingErrors = Array.from(errorsNode.querySelectorAll(":scope > erro"));
  const nextIndex = existingErrors.reduce((max, node) => Math.max(max, Number(node.getAttribute("indice")) || 0), 0) + 1;
  const errorNode = state.xmlDocument.createElement("erro");
  errorNode.setAttribute("indice", String(nextIndex));
  errorNode.setAttribute("codigo", values.codigo_erro);
  errorNode.setAttribute("identificador", values.identificador);
  errorNode.setAttribute("linha_origem", "cadastro_manual");

  const fieldsNode = state.xmlDocument.createElement("campos");
  const fieldNames = EQUIPMENT_FORM_FIELDS[equipmentKey] || [];

  fieldNames.forEach((fieldName) => {
    const value = values[fieldName] || "";
    const fieldNode = state.xmlDocument.createElement("campo");
    fieldNode.setAttribute("nome", fieldName);
    fieldNode.setAttribute("nome_original", XML_FIELD_ORIGINAL_NAMES[fieldName] || fieldName);

    const originalNode = state.xmlDocument.createElement("original");
    originalNode.setAttribute("idioma", "en");
    if (fieldName === "codigo_erro" || fieldName === "identificador" || fieldName === "id_servico" || fieldName === "codigo_servico") {
      originalNode.textContent = value;
    }

    const translatedNode = state.xmlDocument.createElement("traducao");
    translatedNode.setAttribute("idioma", "pt-BR");
    translatedNode.setAttribute("metodo", fieldName === "codigo_erro" || fieldName === "identificador" ? "valor_tecnico_preservado" : "cadastro_manual");
    translatedNode.textContent = value;

    fieldNode.append(originalNode, translatedNode);
    fieldsNode.appendChild(fieldNode);
  });

  errorNode.appendChild(fieldsNode);

  const trailingWhitespace = Array.from(errorsNode.childNodes).findLast?.((node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim());
  if (trailingWhitespace) {
    errorsNode.insertBefore(state.xmlDocument.createTextNode("\n        "), trailingWhitespace);
    errorsNode.insertBefore(errorNode, trailingWhitespace);
  } else {
    errorsNode.appendChild(state.xmlDocument.createTextNode("\n        "));
    errorsNode.appendChild(errorNode);
    errorsNode.appendChild(state.xmlDocument.createTextNode("\n      "));
  }

  const equipmentTotal = existingErrors.length + 1;
  equipmentNode.setAttribute("total_erros", String(equipmentTotal));

  const equipmentName = equipmentNode.getAttribute("nome");
  const summaryItem = Array.from(state.xmlDocument.querySelectorAll("resumo_equipamentos > item"))
    .find((item) => item.getAttribute("nome") === equipmentName);
  summaryItem?.setAttribute("total_erros", String(equipmentTotal));

  const root = state.xmlDocument.documentElement;
  const totalErrors = countXmlErrors(state.xmlDocument);
  root.setAttribute("total_erros", String(totalErrors));
  root.setAttribute("data_geracao", getLocalIsoDate());

  const totalEquipments = Number(root.getAttribute("total_equipamentos")) || state.xmlDocument.querySelectorAll("equipamento").length;
  setDatabaseStatus("ready", `${formatNumber(totalErrors)} erros • ${totalEquipments} equipamentos`);
}

function getLocalIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function exportCurrentXml() {
  if (!state.xmlDocument) {
    showToast("Carregue a base XML antes de salvar.");
    return;
  }

  downloadUpdatedXml();
  showToast("XML atualizado gerado para download.");
}

function downloadUpdatedXml() {
  const serializer = new XMLSerializer();
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>\n${serializer.serializeToString(state.xmlDocument.documentElement)}`;
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = XML_FILE_NAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function initializeTheme() {
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn("Não foi possível ler a preferência de tema:", error);
  }

  const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initialTheme = ["light", "dark"].includes(savedTheme)
    ? savedTheme
    : (systemPrefersDark ? "dark" : "light");

  applyTheme(initialTheme, false);
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme(nextTheme, true);
  showToast(nextTheme === "dark" ? "Tema escuro ativado." : "Tema claro ativado.");
}

function applyTheme(theme, persistPreference = true) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const isDark = normalizedTheme === "dark";
  const nextAction = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  document.documentElement.dataset.theme = normalizedTheme;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  themeColorMeta?.setAttribute("content", isDark ? "#07161d" : "#0f3343");

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", nextAction);
    button.setAttribute("title", nextAction);

    const label = button.querySelector(".theme-toggle__label");
    if (label) {
      label.textContent = isDark ? "Tema claro" : "Tema escuro";
    }
  });

  if (!persistPreference) return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch (error) {
    console.warn("Não foi possível salvar a preferência de tema:", error);
  }
}

function toggleAccordion(button) {
  const panelId = button.getAttribute("aria-controls");
  const panel = document.getElementById(panelId);
  const willOpen = button.getAttribute("aria-expanded") !== "true";

  button.setAttribute("aria-expanded", String(willOpen));
  panel.classList.toggle("is-open", willOpen);
}

function handleChooseEquipment() {
  if (window.matchMedia("(max-width: 900px)").matches) {
    openSidebar();
    return;
  }

  const firstEquipment = document.querySelector(".equipment-link");
  firstEquipment?.focus();
  showToast("Escolha um equipamento no menu lateral.");
}

function openSidebar() {
  elements.sidebar.classList.add("is-open");
  elements.sidebarOverlay.classList.add("is-visible");
  elements.sidebarOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-locked");
}

function closeSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.sidebarOverlay.classList.remove("is-visible");
  elements.sidebarOverlay.setAttribute("aria-hidden", "true");

  if (elements.introModal.hidden && elements.xmlErrorModal.hidden && elements.newErrorModal.hidden) {
    document.body.classList.remove("is-locked");
  }
}

function closeIntroModal() {
  elements.introModal.hidden = true;
  document.body.classList.remove("is-locked");
  elements.homeBtn.focus({ preventScroll: true });
}

async function loadXmlDatabase() {
  setDatabaseStatus("loading", "Carregando base de erros...");

  state.xmlLoadPromise = fetch(XML_FILE_NAME, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Arquivo não encontrado (HTTP ${response.status}).`);
      }
      return response.text();
    })
    .then((xmlText) => parseAndStoreXml(xmlText, XML_FILE_NAME))
    .catch((error) => {
      handleXmlLoadError(error);
      throw error;
    });

  try {
    await state.xmlLoadPromise;
  } catch {
    // A interface de seleção manual já é exibida em handleXmlLoadError().
  }
}

function parseAndStoreXml(xmlText, sourceName) {
  const parser = new DOMParser();
  const xmlDocument = parser.parseFromString(xmlText, "application/xml");
  const parserError = xmlDocument.querySelector("parsererror");

  if (parserError) {
    throw new Error("O arquivo selecionado não possui uma estrutura XML válida.");
  }

  const root = xmlDocument.documentElement;
  if (!root || root.nodeName !== "base_erros_agfa") {
    throw new Error("O XML não corresponde à base de erros AGFA esperada.");
  }

  state.xmlDocument = xmlDocument;
  state.records = [];
  state.filteredRecords = [];

  const totalErrors = Number(root.getAttribute("total_erros")) || countXmlErrors(xmlDocument);
  const totalEquipments = Number(root.getAttribute("total_equipamentos")) || xmlDocument.querySelectorAll("equipamento").length;

  setDatabaseStatus(
    "ready",
    `${formatNumber(totalErrors)} erros • ${totalEquipments} equipamentos`
  );

  closeXmlErrorModal();

  if (state.selectedEquipmentKey) {
    selectEquipment(state.selectedEquipmentKey, { preserveMenu: true });
  }

  showToast(`Base carregada: ${sourceName}`);
  return xmlDocument;
}

function countXmlErrors(xmlDocument) {
  return xmlDocument.querySelectorAll("equipamento > erros > erro").length;
}

function handleXmlLoadError(error) {
  console.error("Falha ao carregar a base XML:", error);
  setDatabaseStatus("error", "Base XML não carregada");

  const protocolHint = window.location.protocol === "file:"
    ? " O navegador bloqueia o carregamento automático quando o index.html é aberto diretamente. Use o Live Server ou selecione o XML manualmente."
    : " Confirme se o XML está na mesma pasta de index.html.";

  elements.xmlErrorMessage.textContent = `${error.message}${protocolHint}`;
  elements.xmlErrorModal.hidden = false;
  document.body.classList.add("is-locked");
}

function retryXmlLoad() {
  closeXmlErrorModal();
  loadXmlDatabase();
}

async function handleLocalXmlSelection(event) {
  const [file] = event.target.files;
  event.target.value = "";

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".xml")) {
    showToast("Selecione um arquivo com extensão .xml.");
    return;
  }

  try {
    setDatabaseStatus("loading", "Lendo arquivo XML selecionado...");
    const xmlText = await file.text();
    parseAndStoreXml(xmlText, file.name);
  } catch (error) {
    handleXmlLoadError(error);
  }
}

function closeXmlErrorModal() {
  elements.xmlErrorModal.hidden = true;

  if (elements.introModal.hidden && elements.newErrorModal.hidden && !elements.sidebar.classList.contains("is-open")) {
    document.body.classList.remove("is-locked");
  }
}

function setDatabaseStatus(status, text) {
  elements.databaseStatusText.textContent = text;
  elements.statusDot.className = `status-dot is-${status}`;
}

async function selectEquipment(equipmentKey, options = {}) {
  const equipment = EQUIPMENTS[equipmentKey];
  if (!equipment) return;

  state.selectedEquipmentKey = equipmentKey;
  updateActiveNavigation(equipmentKey);
  showQueryView(equipment);

  if (!options.preserveMenu) {
    closeSidebar();
  }

  elements.loadingState.hidden = false;
  elements.resultsList.innerHTML = "";
  elements.emptyState.hidden = true;
  elements.pagination.hidden = true;
  elements.resultsList.setAttribute("aria-busy", "true");

  try {
    if (!state.xmlDocument) {
      if (!state.xmlLoadPromise) {
        await loadXmlDatabase();
      } else {
        await state.xmlLoadPromise;
      }
    }

    // Libera o índice do equipamento anterior para reduzir o uso de memória em celulares.
    state.records = buildEquipmentRecords(equipment.xmlName);
    state.filteredRecords = state.records;
    state.currentPage = 1;

    elements.equipmentTotal.textContent = formatNumber(state.records.length);
    elements.searchInput.value = "";
    elements.clearSearchBtn.hidden = true;

    renderCurrentPage();
  } catch (error) {
    console.error(error);
    elements.resultSummary.textContent = "A base XML precisa ser carregada para realizar a consulta.";
  } finally {
    elements.loadingState.hidden = true;
    elements.resultsList.setAttribute("aria-busy", "false");
  }
}

function showQueryView(equipment) {
  elements.welcomeView.hidden = true;
  elements.queryView.hidden = false;
  elements.homeBtn.classList.remove("is-active");
  elements.equipmentCategory.textContent = equipment.category;
  elements.equipmentTitle.textContent = equipment.title;
  elements.equipmentSubtitle.textContent = `Consulte códigos e orientações técnicas do ${equipment.title}.`;
  elements.mobileEquipmentName.textContent = equipment.title;
  document.title = `${equipment.title} | Sistema de Erros AGFA`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  state.selectedEquipmentKey = null;
  state.records = [];
  state.filteredRecords = [];
  state.currentPage = 1;

  elements.queryView.hidden = true;
  elements.welcomeView.hidden = false;
  elements.mobileEquipmentName.textContent = "Selecione um equipamento";
  elements.homeBtn.classList.add("is-active");
  document.querySelectorAll(".equipment-link").forEach((button) => button.classList.remove("is-active"));
  document.title = "Sistema de Erros AGFA | Med Plus";
  closeSidebar();
}

function updateActiveNavigation(equipmentKey) {
  document.querySelectorAll(".equipment-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.equipment === equipmentKey);
  });
}

function buildEquipmentRecords(xmlEquipmentName) {
  const equipmentNodes = Array.from(state.xmlDocument.querySelectorAll("equipamentos > equipamento"));
  const equipmentNode = equipmentNodes.find((node) => node.getAttribute("nome") === xmlEquipmentName);

  if (!equipmentNode) {
    throw new Error(`O equipamento ${xmlEquipmentName} não foi encontrado na base XML.`);
  }

  return Array.from(equipmentNode.querySelectorAll(":scope > erros > erro")).map((errorNode, index) => {
    const fields = Array.from(errorNode.querySelectorAll(":scope > campos > campo")).map((fieldNode) => {
      const name = fieldNode.getAttribute("nome") || "campo";
      const originalName = fieldNode.getAttribute("nome_original") || "";
      const translated = cleanText(fieldNode.querySelector(":scope > traducao")?.textContent || "");
      const original = cleanText(fieldNode.querySelector(":scope > original")?.textContent || "");

      return {
        name,
        originalName,
        translated: translated || original,
        original
      };
    });

    const fieldMap = Object.fromEntries(fields.map((field) => [field.name, field.translated]));
    const code = cleanText(errorNode.getAttribute("codigo") || fieldMap.codigo_erro || fieldMap.contexto || "Sem código");
    const identifier = cleanText(errorNode.getAttribute("identificador") || fieldMap.identificador || "");
    const priority = cleanText(fieldMap.prioridade || fieldMap.tipo || "");
    const description = cleanText(
      fieldMap.descricao ||
      fieldMap.significado ||
      fieldMap.mensagem_servico ||
      fieldMap.descricao_detalhada ||
      identifier ||
      "Registro técnico"
    );
    const detailedDescription = cleanText(
      fieldMap.descricao_detalhada ||
      fieldMap.mensagem_servico ||
      fieldMap.causa ||
      fieldMap.razao ||
      fieldMap.motivo ||
      ""
    );

    const searchableText = normalizeSearchText([
      code,
      identifier,
      priority,
      ...fields.flatMap((field) => [field.translated, field.original, field.originalName])
    ].join(" "));

    return {
      index,
      code,
      identifier,
      priority,
      description,
      detailedDescription,
      fields,
      searchableText
    };
  });
}

function handleSearchInput(event) {
  const query = event.target.value;
  elements.clearSearchBtn.hidden = !query;

  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(() => applySearch(query), 220);
}

function applySearch(rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!terms.length) {
    state.filteredRecords = state.records;
  } else {
    state.filteredRecords = state.records
      .filter((record) => terms.every((term) => record.searchableText.includes(term)))
      .sort((a, b) => searchRank(a, normalizedQuery) - searchRank(b, normalizedQuery) || a.index - b.index);
  }

  state.currentPage = 1;
  renderCurrentPage();
}

function searchRank(record, normalizedQuery) {
  const normalizedCode = normalizeSearchText(record.code);
  const normalizedIdentifier = normalizeSearchText(record.identifier);

  if (normalizedCode === normalizedQuery) return 0;
  if (normalizedIdentifier === normalizedQuery) return 1;
  if (normalizedCode.startsWith(normalizedQuery)) return 2;
  if (normalizedIdentifier.startsWith(normalizedQuery)) return 3;
  return 4;
}

function clearSearch() {
  elements.searchInput.value = "";
  elements.clearSearchBtn.hidden = true;
  applySearch("");
  elements.searchInput.focus();
}

function renderCurrentPage() {
  const totalRecords = state.filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / RESULTS_PER_PAGE));

  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }

  const start = (state.currentPage - 1) * RESULTS_PER_PAGE;
  const end = Math.min(start + RESULTS_PER_PAGE, totalRecords);
  const pageRecords = state.filteredRecords.slice(start, end);

  elements.resultsList.innerHTML = pageRecords.map(createErrorCardHtml).join("");
  elements.emptyState.hidden = totalRecords > 0;

  if (totalRecords === 0) {
    elements.resultSummary.textContent = "Nenhum registro corresponde à pesquisa.";
  } else if (elements.searchInput.value.trim()) {
    elements.resultSummary.textContent = `${formatNumber(totalRecords)} resultado(s) encontrado(s). Exibindo ${formatNumber(start + 1)}–${formatNumber(end)}.`;
  } else {
    elements.resultSummary.textContent = `${formatNumber(totalRecords)} registros disponíveis. Exibindo ${formatNumber(start + 1)}–${formatNumber(end)}.`;
  }

  elements.pagination.hidden = totalRecords <= RESULTS_PER_PAGE;
  elements.pageIndicator.textContent = `Página ${state.currentPage} de ${totalPages}`;
  elements.previousPageBtn.disabled = state.currentPage <= 1;
  elements.nextPageBtn.disabled = state.currentPage >= totalPages;
}

function createErrorCardHtml(record) {
  const priorityClass = getPriorityClass(record.priority);
  const visibleFields = record.fields.filter((field) => {
    return field.translated && !["codigo_erro", "identificador", "prioridade", "descricao"].includes(field.name);
  });

  const detailRows = visibleFields.length
    ? visibleFields.map(createDetailRowHtml).join("")
    : `<div class="detail-row"><dt>Informações</dt><dd>Não há detalhes adicionais neste registro.</dd></div>`;

  return `
    <article class="error-card" data-code="${escapeAttribute(record.code)}">
      <div class="error-card__top">
        <div class="error-card__identity">
          <div class="error-card__code-line">
            <span class="error-code">${escapeHtml(record.code)}</span>
            ${record.priority ? `<span class="error-badge ${priorityClass}">${escapeHtml(record.priority)}</span>` : ""}
          </div>
          ${record.identifier ? `<div class="error-identifier">${escapeHtml(record.identifier)}</div>` : ""}
        </div>
        <button class="copy-button" type="button" data-copy-code="${escapeAttribute(record.code)}" aria-label="Copiar código ${escapeAttribute(record.code)}" title="Copiar código">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
      <div class="error-card__summary">
        <h2>${escapeHtml(record.description)}</h2>
        ${record.detailedDescription && record.detailedDescription !== record.description
          ? `<p>${escapeHtml(truncateText(record.detailedDescription, 420))}</p>`
          : ""}
      </div>
      <details class="error-details">
        <summary>Ver informações completas</summary>
        <dl class="error-details__content">
          ${detailRows}
        </dl>
      </details>
    </article>
  `;
}

function createDetailRowHtml(field) {
  const label = FIELD_LABELS[field.name] || field.originalName || humanizeFieldName(field.name);
  const showOriginal = field.original && normalizeSearchText(field.original) !== normalizeSearchText(field.translated);

  return `
    <div class="detail-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>
        ${escapeHtml(field.translated)}
        ${showOriginal
          ? `<div class="original-text"><strong>Original em inglês</strong>${escapeHtml(field.original)}</div>`
          : ""}
      </dd>
    </div>
  `;
}

function getPriorityClass(priority) {
  const normalized = normalizeSearchText(priority);
  if (/erro|error|defect|defeito|fatal|falha/.test(normalized)) return "is-danger";
  if (/aviso|warning|accidental|atencao/.test(normalized)) return "is-warning";
  return "is-info";
}

function handleResultsClick(event) {
  const copyButton = event.target.closest("[data-copy-code]");
  if (!copyButton) return;

  copyText(copyButton.dataset.copyCode);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Código ${text} copiado.`);
  } catch {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = text;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    document.execCommand("copy");
    temporaryInput.remove();
    showToast(`Código ${text} copiado.`);
  }
}

function changePage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / RESULTS_PER_PAGE));
  const nextPage = state.currentPage + direction;

  if (nextPage < 1 || nextPage > totalPages) return;

  state.currentPage = nextPage;
  renderCurrentPage();

  const queryHeader = document.querySelector(".query-header");
  queryHeader?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;

  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9_./:+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function humanizeFieldName(value) {
  return String(value || "Campo")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
