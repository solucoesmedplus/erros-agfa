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
  observacao: "Observação"
};

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
    "toast"
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

    if (elements.sidebar.classList.contains("is-open")) {
      closeSidebar();
    }
  });
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

  if (elements.introModal.hidden && elements.xmlErrorModal.hidden) {
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

  if (elements.introModal.hidden && !elements.sidebar.classList.contains("is-open")) {
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
