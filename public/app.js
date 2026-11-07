// ---------------------------------------------------------------------------
// Apoio ao Estudante - front-end
// Fala com o back-end local (server/) via fetch(). Nenhum dado sensivel de
// aluno mora neste arquivo: tudo vem do servidor, que ja aplica o controle
// de acesso por papel (professora x coordenacao).
// ---------------------------------------------------------------------------

const state = {
  user: null,
  classes: [],
  teachers: [],
  bnccGoals: [],
  needs: [],
  tags: { strengthTags: [], cautionTags: [] },
  lastActivities: [],
  currentAssignment: null,
  observationStudentId: null,
  observationNeedId: null,
  editingClassId: null,
  editingTeacherId: null,
  editingStudentId: null,
  passwordTeacherId: null,
  sessionActive: false,
  aiStatus: null
};

// ---- helpers de API --------------------------------------------------------

async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (response.status === 401 && state.sessionActive) {
    // A sessao caiu no meio do uso (servidor reiniciou, expirou etc.) - antes
    // a pessoa so via a tela de login de novo, sem entender o motivo.
    state.sessionActive = false;
    showToast("Sua sessão expirou. Faça login novamente.", true);
    setTimeout(() => window.location.reload(), 1600);
    throw new Error("Sessão expirada.");
  }

  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new Error((data && data.error) || `Erro inesperado (HTTP ${response.status}).`);
  }
  return data;
}

// Busca por nome ignora acentuacao (ex: "joao" encontra "João") - sem isso a
// busca falhava silenciosamente para qualquer nome acentuado.
function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function showToast(message, isError = false) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

async function withButtonBusy(button, label, fn) {
  const original = button.textContent;
  button.disabled = true;
  if (label) button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// Substitui o confirm() nativo do navegador (que destoava do visual do
// sistema) por um dialogo com a mesma identidade do resto do app.
function confirmDialog({ title = "Tem certeza?", message = "", confirmLabel = "Confirmar", danger = true } = {}) {
  const dialog = el("confirmDialog");
  el("confirmTitle").textContent = title;
  el("confirmMessage").textContent = message;
  const submit = el("confirmSubmit");
  submit.textContent = confirmLabel;
  submit.classList.toggle("danger-action", danger);
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "default"),
      { once: true }
    );
  });
}

// ---- elementos --------------------------------------------------------------

const el = (id) => document.getElementById(id);

const loginScreen = el("loginScreen");
const appShell = el("appShell");
const loginForm = el("loginForm");
const loginEmail = el("loginEmail");
const loginPassword = el("loginPassword");
const loginError = el("loginError");
const loginSubmit = el("loginSubmit");
const logoutButton = el("logoutButton");
const currentUserRole = el("currentUserRole");
const currentUserName = el("currentUserName");
const adminNavItem = el("adminNavItem");
const mobileNavToggle = el("mobileNavToggle");
const sidebar = el("sidebar");

const classSelect = el("classSelect");
const studentSelect = el("studentSelect");
const themeInput = el("themeInput");
const bnccSelect = el("bnccSelect");
const bnccDescription = el("bnccDescription");
const studentSummary = el("studentSummary");
const studentSummaryEmpty = el("studentSummaryEmpty");
const activitiesGrid = el("activitiesGrid");
const activitiesEmpty = el("activitiesEmpty");
const sharedObjective = el("sharedObjective");
const activitiesSourceLine = el("activitiesSourceLine");
const generateActivitiesButton = el("generateActivitiesButton");
const assignmentPanel = el("assignmentPanel");
const studentsGrid = el("studentsGrid");
const needsGrid = el("needsGrid");
const teacherNameHeading = el("teacherName");
const teacherStats = el("teacherStats");

const observationDialog = el("observationDialog");
const observationForm = el("observationForm");
const observationTitle = el("observationTitle");
const studentObservationInput = el("studentObservation");
const addNeedButton = el("addNeedButton");
const aiStatusLine = el("aiStatusLine");
const aiSettingsForm = el("aiSettingsForm");
const aiSettingsStatusLine = el("aiSettingsStatusLine");
const aiProviderInput = el("aiProviderInput");
const aiOllamaFields = el("aiOllamaFields");
const aiOllamaBaseUrlInput = el("aiOllamaBaseUrlInput");
const aiOllamaModelInput = el("aiOllamaModelInput");
const aiOllamaModelList = el("aiOllamaModelList");
const aiRefreshModelsButton = el("aiRefreshModelsButton");
const aiModelListStatus = el("aiModelListStatus");
const aiModelChoices = el("aiModelChoices");
const aiOpenaiFields = el("aiOpenaiFields");
const aiOpenaiKeyInput = el("aiOpenaiKeyInput");
const aiOpenaiModelInput = el("aiOpenaiModelInput");
const aiOpenaiClearKeyInput = el("aiOpenaiClearKeyInput");
const aiOpenaiKeyStatus = el("aiOpenaiKeyStatus");
const needObservationDialog = el("needObservationDialog");
const needObservationForm = el("needObservationForm");
const needObservationTitle = el("needObservationTitle");
const needObservationText = el("needObservationText");
const newNeedDialog = el("newNeedDialog");
const newNeedForm = el("newNeedForm");
const newNeedName = el("newNeedName");
const newNeedObservation = el("newNeedObservation");

// ---- boot -------------------------------------------------------------------

async function boot() {
  bindStaticEvents();
  try {
    const { user } = await api("GET", "/api/auth/me");
    await onLogin(user);
  } catch (error) {
    // ninguém logado ainda - fica na tela de login
  }
}

async function onLogin(user) {
  state.user = user;
  state.sessionActive = true;
  document.body.classList.remove("login-mode");
  document.body.classList.add("app-mode");
  loginScreen.setAttribute("hidden", "");
  appShell.removeAttribute("hidden");

  currentUserRole.textContent = user.role === "admin" ? "Coordenação" : "Professora";
  currentUserName.textContent = user.name;
  adminNavItem.hidden = user.role !== "admin";
  teacherNameHeading.textContent = user.name;
  addNeedButton.hidden = user.role !== "admin";
  // Coordenação só consulta as sugestões de atividade, como apoio/supervisão
  // - selecionar uma atividade de verdade (o que cria um registro "em
  // andamento" para o aluno) é responsabilidade da professora dele. O botão
  // muda de rótulo para deixar isso claro; renderActivities() omite o botão
  // "Selecionar" quando o usuário é admin.
  generateActivitiesButton.textContent = user.role === "admin" ? "Consultar atividades" : "Gerar 3 atividades";
  activitiesEmpty.textContent =
    user.role === "admin"
      ? "Consulte atividades para um aluno para ver as sugestões aqui."
      : "Gere atividades para um aluno para ver as sugestões aqui.";

  setupIntroStrip();

  try {
    await loadReferenceData();
    populateClassSelect();
    await handleClassChange();
    await renderStudentsView();
    await loadAiStatus();
    await renderNeedsView();
    if (user.role === "admin") {
      renderAdminClasses();
      renderAdminTeachers();
      await renderAdminStudents();
    } else {
      await renderTeacherStats();
    }
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadReferenceData() {
  const [classesRes, teachersRes, goalsRes, needsRes, tagsRes] = await Promise.all([
    api("GET", "/api/classes"),
    api("GET", "/api/teachers"),
    api("GET", "/api/bncc-goals"),
    api("GET", "/api/needs"),
    api("GET", "/api/tags")
  ]);
  state.classes = classesRes.classes;
  state.teachers = teachersRes.teachers;
  state.bnccGoals = goalsRes.goals;
  state.needs = needsRes.needs;
  state.tags = tagsRes;
}

function logout() {
  api("POST", "/api/auth/logout").finally(() => {
    window.location.reload();
  });
}

// ---- dicas iniciais (faixa 01/02/03) -----------------------------------------

function setupIntroStrip() {
  const introStrip = el("introStrip");
  const introRestore = el("introRestore");
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("ae_intro_dismissed") === "1";
  } catch (error) {
    dismissed = false;
  }
  introStrip.hidden = dismissed;
  introRestore.hidden = !dismissed;

  el("introDismiss").addEventListener("click", () => {
    introStrip.hidden = true;
    introRestore.hidden = false;
    try {
      localStorage.setItem("ae_intro_dismissed", "1");
    } catch (error) {
      /* ambiente sem localStorage disponível - tudo bem, só não persiste */
    }
  });

  introRestore.addEventListener("click", () => {
    introStrip.hidden = false;
    introRestore.hidden = true;
    try {
      localStorage.removeItem("ae_intro_dismissed");
    } catch (error) {
      /* idem */
    }
  });
}

// ---- navegação ----------------------------------------------------------

function bindStaticEvents() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    try {
      await withButtonBusy(loginSubmit, "Entrando...", async () => {
        const { user } = await api("POST", "/api/auth/login", {
          email: loginEmail.value.trim(),
          password: loginPassword.value
        });
        await onLogin(user);
      });
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  logoutButton.addEventListener("click", logout);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.view);
      sidebar.classList.remove("open");
    });
  });

  mobileNavToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  classSelect.addEventListener("change", () => handleClassChange());
  studentSelect.addEventListener("change", () => handleStudentChange());
  bnccSelect.addEventListener("change", () => updateBnccDescription());

  el("plannerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const usingAi = state.aiStatus && state.aiStatus.configured;
    const isAdmin = state.user && state.user.role === "admin";
    const originalLabel = generateActivitiesButton.textContent;
    generateActivitiesButton.disabled = true;
    const verb = isAdmin ? "Consultando" : "Gerando";
    generateActivitiesButton.textContent = usingAi ? `${verb} com IA... (pode levar alguns minutos)` : `${verb}...`;
    try {
      await loadActivities({ highlight: true });
    } finally {
      generateActivitiesButton.disabled = false;
      generateActivitiesButton.textContent = originalLabel;
    }
  });

  observationForm.addEventListener("submit", () => saveObservation());
  needObservationForm.addEventListener("submit", () => saveNeedObservation());
  newNeedForm.addEventListener("submit", () => saveNewNeed());

  addNeedButton.addEventListener("click", () => {
    newNeedName.value = "";
    newNeedObservation.value = "";
    newNeedDialog.showModal();
  });

  el("cancelAssignment").addEventListener("click", () => cancelAssignment());
  assignmentPanel.querySelectorAll("[data-resolve]").forEach((button) => {
    button.addEventListener("click", () => resolveAssignment(button.dataset.resolve));
  });

  el("studentsSearch").addEventListener("input", () => renderStudentsView());
  el("studentsClassFilter").addEventListener("change", () => renderStudentsView());

  bindAdminEvents();
}

function showView(viewId) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
}

// ---- atendimento rápido ----------------------------------------------------

function teacherRecordForCurrentUser() {
  if (!state.user || state.user.role !== "teacher") return null;
  return state.teachers.find((teacher) => teacher.id === state.user.teacherId) || null;
}

function visibleClasses() {
  if (state.user && state.user.role === "admin") return state.classes;
  const teacher = teacherRecordForCurrentUser();
  if (!teacher) return state.classes;
  return state.classes.filter((klass) => (teacher.classIds || []).includes(klass.id));
}

function populateClassSelect() {
  const classes = visibleClasses();
  classSelect.innerHTML = classes.map((klass) => `<option value="${klass.id}">${klass.name}</option>`).join("");
  el("studentsClassFilter").innerHTML =
    `<option value="">Todas as turmas</option>` + classes.map((klass) => `<option value="${klass.id}">${klass.name}</option>`).join("");
  const adminFilter = el("adminStudentsClassFilter");
  if (adminFilter) {
    adminFilter.innerHTML =
      `<option value="">Todas as turmas</option>` + state.classes.map((klass) => `<option value="${klass.id}">${klass.name}</option>`).join("");
  }
}

function getSelectedClass() {
  return state.classes.find((klass) => klass.id === classSelect.value) || visibleClasses()[0];
}

async function handleClassChange() {
  populateBnccSelect();
  await populateStudentSelect();
  await handleStudentChange();
}

// BNCC agrupado por campo de experiência (antes era uma lista corrida de
// códigos, sem indicar a que campo cada um pertence).
function populateBnccSelect() {
  const classInfo = getSelectedClass();
  if (!classInfo) {
    bnccSelect.innerHTML = "";
    bnccDescription.textContent = "";
    return;
  }
  const goals = state.bnccGoals.filter((goal) => goal.level === classInfo.level);
  const byField = new Map();
  goals.forEach((goal) => {
    if (!byField.has(goal.field)) byField.set(goal.field, []);
    byField.get(goal.field).push(goal);
  });
  bnccSelect.innerHTML = Array.from(byField.entries())
    .map(
      ([field, items]) => `
    <optgroup label="${field}">
      ${items.map((goal) => `<option value="${goal.code}">${goal.code}</option>`).join("")}
    </optgroup>
  `
    )
    .join("");
  updateBnccDescription();
}

function updateBnccDescription() {
  const goal = state.bnccGoals.find((item) => item.code === bnccSelect.value);
  bnccDescription.textContent = goal ? `${goal.field} — ${goal.text}` : "";
}

async function populateStudentSelect() {
  const classInfo = getSelectedClass();
  if (!classInfo) {
    studentSelect.innerHTML = "";
    return;
  }
  const { students } = await api("GET", "/api/students");
  state.studentsInClass = students.filter((student) => student.classId === classInfo.id);
  // Nenhum aluno pré-selecionado: a professora escolhe de propósito antes de
  // ver qualquer dado pedagógico ou atividade (ver handleStudentChange).
  studentSelect.innerHTML =
    `<option value="">Selecione um aluno...</option>` +
    state.studentsInClass
      .map((student) => `<option value="${student.id}">${student.shortName} - ${student.age} anos - ${student.disability}</option>`)
      .join("");
}

async function handleStudentChange() {
  if (!studentSelect.value) {
    studentSummary.innerHTML = "";
    studentSummaryEmpty.hidden = false;
    activitiesGrid.innerHTML = "";
    sharedObjective.hidden = true;
    assignmentPanel.hidden = true;
    activitiesEmpty.hidden = true;
    return;
  }
  studentSummaryEmpty.hidden = true;
  await renderStudentSummary();
  await checkOpenAssignment();
}

async function renderStudentSummary() {
  const studentId = studentSelect.value;
  if (!studentId) return;
  const { student, classInfo, need, observation, history } = await api("GET", `/api/students/${studentId}/summary`);

  studentSummary.innerHTML = `
    <div class="student-card-head">
      <div class="avatar">${initials(student.shortName)}</div>
      <div>
        <h2>${student.shortName}</h2>
        <p>${student.age} anos · ${classInfo.name} · ${student.disability}</p>
      </div>
    </div>
    <ul class="summary-list">
      <li>${student.profile}</li>
      <li>Base da deficiência: ${need.summary}</li>
      <li>Funciona bem: ${student.strengths.join(", ") || "nenhum ponto forte cadastrado."}</li>
      <li>Cuidados: ${student.cautions.join(", ") || "nenhum cuidado cadastrado."}</li>
      <li>Observação da professora: ${observation || "nenhuma observação registrada."}</li>
    </ul>
    <button class="secondary-action full-action" type="button" data-observation-student="${student.id}">Adicionar observação do aluno</button>
    <div class="history-list">
      <h3>Últimos registros</h3>
      ${
        history.length
          ? history.map((item) => `<div class="history-item"><strong>${item.result}</strong>${item.theme} · ${item.activityTitle}<br>${item.notes || "Sem observações adicionais."}</div>`).join("")
          : `<div class="history-item">Ainda não há feedback registrado para este aluno.</div>`
      }
    </div>
  `;

  studentSummary.querySelector("[data-observation-student]").addEventListener("click", (e) => {
    openObservation(e.currentTarget.dataset.observationStudent, observation);
  });
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .replace(".", "");
}

// ---- atividade selecionada (estado real, não só visual) ---------------------

async function checkOpenAssignment() {
  const studentId = studentSelect.value;
  const { assignments } = await api("GET", `/api/assignments?studentId=${encodeURIComponent(studentId)}&status=selecionada`);
  if (assignments.length) {
    // Atividade em andamento é um estado real que já existia antes de abrir
    // esta tela - mostrar automaticamente não é "gerar sem pedir", é só
    // exibir o que já estava em curso.
    state.currentAssignment = assignments[0];
    renderAssignmentPanel();
  } else {
    // Não gera atividades sozinho ao trocar de aluno - só limpa a área,
    // esperando o clique explícito em "Gerar/Consultar atividades".
    state.currentAssignment = null;
    assignmentPanel.hidden = true;
    clearActivitiesArea();
  }
}

function clearActivitiesArea() {
  activitiesGrid.innerHTML = "";
  activitiesEmpty.hidden = false;
  sharedObjective.hidden = true;
  if (activitiesSourceLine) activitiesSourceLine.hidden = true;
}

function renderAssignmentPanel() {
  const assignment = state.currentAssignment;
  if (!assignment) {
    assignmentPanel.hidden = true;
    return;
  }
  activitiesGrid.innerHTML = "";
  activitiesEmpty.hidden = true;
  sharedObjective.hidden = true;
  el("suggestionsTitle").textContent = "Atividade em andamento";
  el("suggestionsSubtitle").textContent = "Selecione o resultado quando a atividade for aplicada.";
  el("assignmentType").textContent = assignment.activity.type;
  el("assignmentTitle").textContent = assignment.activity.title;
  const resourceBox = el("assignmentResource");
  resourceBox.textContent = assignment.activity.resource;
  resourceBox.className = `resource-box ${assignment.activity.resourceClass || ""}`;
  el("assignmentMethod").textContent = assignment.activity.method;
  el("assignmentAdaptation").textContent = assignment.activity.adaptation;
  el("assignmentNotes").value = "";
  assignmentPanel.hidden = false;
}

async function resolveAssignment(result) {
  if (!state.currentAssignment) return;
  try {
    await api("PUT", `/api/assignments/${state.currentAssignment.id}/resolve`, {
      result,
      notes: el("assignmentNotes").value.trim()
    });
    showToast("Resultado registrado.");
    state.currentAssignment = null;
    el("suggestionsTitle").textContent = "Atividades adaptadas";
    el("suggestionsSubtitle").textContent = "As opções variam entre expressão, investigação, movimento, linguagem, construção e recursos digitais.";
    await renderStudentSummary();
    await renderStudentsView();
    await checkOpenAssignment();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function cancelAssignment() {
  if (!state.currentAssignment) return;
  const confirmed = await confirmDialog({
    title: "Cancelar seleção",
    message: "A atividade volta a ficar disponível para escolher outra, sem registrar nenhum resultado.",
    confirmLabel: "Cancelar seleção",
    danger: false
  });
  if (!confirmed) return;
  try {
    await api("DELETE", `/api/assignments/${state.currentAssignment.id}`);
    state.currentAssignment = null;
    el("suggestionsTitle").textContent = "Atividades adaptadas";
    el("suggestionsSubtitle").textContent = "As opções variam entre expressão, investigação, movimento, linguagem, construção e recursos digitais.";
    await checkOpenAssignment();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadActivities({ highlight }) {
  if (state.currentAssignment) return; // já existe uma atividade em andamento - o painel dela é quem manda na tela
  const studentId = studentSelect.value;
  const goalCode = bnccSelect.value;
  if (!studentId || !goalCode) {
    activitiesGrid.innerHTML = "";
    activitiesEmpty.hidden = false;
    sharedObjective.hidden = true;
    if (activitiesSourceLine) activitiesSourceLine.hidden = true;
    return;
  }
  try {
    const { activities, source, fallbackReason, aiLabel } = await api(
      "GET",
      `/api/activities?studentId=${encodeURIComponent(studentId)}&goalCode=${encodeURIComponent(goalCode)}&theme=${encodeURIComponent(themeInput.value)}`
    );
    state.lastActivities = activities;
    renderActivities(activities, highlight);
    renderActivitiesSourceLine(source, fallbackReason, aiLabel);
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderActivitiesSourceLine(source, fallbackReason, aiLabel) {
  if (!activitiesSourceLine) return;
  if (source === "ia") {
    activitiesSourceLine.hidden = false;
    activitiesSourceLine.textContent = `Atividades geradas por IA (${aiLabel}).`;
  } else if (source === "regras-fallback") {
    activitiesSourceLine.hidden = false;
    activitiesSourceLine.textContent = `IA indisponível no momento (${fallbackReason}) — usando o motor de regras.`;
  } else {
    activitiesSourceLine.hidden = true;
    activitiesSourceLine.textContent = "";
  }
}

function renderActivities(activities, highlight) {
  activitiesEmpty.hidden = activities.length > 0;
  if (activities.length) {
    sharedObjective.hidden = false;
    sharedObjective.textContent = `Objetivo BNCC: ${activities[0].objective}`;
  } else {
    sharedObjective.hidden = true;
  }

  activitiesGrid.innerHTML = activities
    .map(
      (activity) => `
    <article class="activity-card ${highlight ? "" : "locked"}" data-tone="${activity.tone}">
      <span class="activity-type">${activity.type}</span>
      <h3>${activity.title}</h3>
      ${activity.previouslyFailed ? `<p class="warning activity-warning">⚠️ ${activity.previouslyFailedNote}</p>` : ""}
      <div class="resource-box ${activity.resourceClass}">${activity.resource}</div>
      <p><strong>Como aplicar:</strong> ${activity.method}</p>
      <details class="activity-more">
        <summary>Ver adaptação e detalhes</summary>
        <p><strong>Adaptação:</strong> ${activity.adaptation}</p>
        <div class="meta-row">
          <span>${activity.time}</span>
          <span>${activity.supportLevel}</span>
          <span>${getSelectedClass()?.level || ""}</span>
          <span>${activity.resourceClass === "digital" ? "Recurso aprovado" : "Material flexível"}</span>
        </div>
      </details>
      ${
        state.user && state.user.role === "admin"
          ? ""
          : `<button class="primary-action full-action" type="button" data-select-activity="${activity.id}">Selecionar esta atividade</button>`
      }
    </article>
  `
    )
    .join("");

  activitiesGrid.querySelectorAll("[data-select-activity]").forEach((button) => {
    button.addEventListener("click", () => selectActivity(button.dataset.selectActivity));
  });
}

async function selectActivity(activityId) {
  const activity = state.lastActivities.find((item) => item.id === activityId);
  if (!activity) return;
  try {
    const { assignment } = await api("POST", "/api/assignments", { studentId: studentSelect.value, activity });
    state.currentAssignment = assignment;
    renderAssignmentPanel();
    showToast("Atividade selecionada.");
  } catch (error) {
    showToast(error.message, true);
  }
}

function openObservation(studentId, currentValue) {
  state.observationStudentId = studentId;
  const student = state.studentsInClass?.find((s) => s.id === studentId);
  observationTitle.textContent = student ? `Registrar percepção sobre ${student.shortName}` : "Registrar percepção";
  studentObservationInput.value = currentValue || "";
  observationDialog.showModal();
}

async function saveObservation() {
  if (!state.observationStudentId) return;
  try {
    await api("POST", `/api/students/${state.observationStudentId}/observation`, {
      text: studentObservationInput.value.trim()
    });
    showToast("Observação salva.");
    await renderStudentSummary();
    await renderStudentsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

// ---- alunos (visão pedagógica) ---------------------------------------------

function groupByClass(students) {
  const classesById = Object.fromEntries(state.classes.map((k) => [k.id, k]));
  const groups = new Map();
  students.forEach((student) => {
    const classInfo = classesById[student.classId];
    const key = classInfo ? classInfo.id : "sem-turma";
    if (!groups.has(key)) groups.set(key, { classInfo, students: [] });
    groups.get(key).students.push(student);
  });
  return Array.from(groups.values());
}

async function renderStudentsView() {
  try {
    const { students } = await api("GET", "/api/students");
    const search = normalizeSearch(el("studentsSearch").value);
    const classFilter = el("studentsClassFilter").value;
    const filtered = students
      .filter((student) => !classFilter || student.classId === classFilter)
      .filter((student) => !search || normalizeSearch(student.shortName).includes(search));

    const groups = groupByClass(filtered);
    if (!groups.length) {
      studentsGrid.innerHTML = `<p class="muted">Nenhum aluno encontrado.</p>`;
      return;
    }

    studentsGrid.innerHTML = groups
      .map(
        (group) => `
      <section class="class-group">
        <h3 class="class-group-title">${group.classInfo ? group.classInfo.name : "Sem turma"}</h3>
        <div class="students-grid">
          ${group.students
            .map(
              (student) => `
            <article class="mini-card">
              <div class="student-card-head">
                <div class="avatar">${initials(student.shortName)}</div>
                <div>
                  <h3>${student.shortName}</h3>
                  <p>${student.age} anos</p>
                </div>
              </div>
              <div class="meta-row"><span>${student.disability}</span><span>${student.feedbackCount} feedbacks</span></div>
              <p>${student.profile}</p>
              <p><strong>Observação:</strong> ${student.observation || "nenhuma percepção registrada."}</p>
              <p><strong>Cuidados:</strong> ${student.cautions.join(", ") || "nenhum cadastrado."}</p>
              <button class="secondary-action" type="button" data-observation-student="${student.id}" data-observation-current="${(student.observation || "").replace(/"/g, "&quot;")}">Registrar percepção</button>
            </article>
          `
            )
            .join("")}
        </div>
      </section>
    `
      )
      .join("");

    studentsGrid.querySelectorAll("[data-observation-student]").forEach((button) => {
      button.addEventListener("click", () => openObservation(button.dataset.observationStudent, button.dataset.observationCurrent));
    });
  } catch (error) {
    showToast(error.message, true);
  }
}

// ---- perfil da professora -----------------------------------------------------

async function renderTeacherStats() {
  const teacher = teacherRecordForCurrentUser();
  if (!teacher) {
    teacherStats.innerHTML = "";
    return;
  }
  const classes = visibleClasses();
  const { students } = await api("GET", "/api/students");
  const { feedbacks } = await api("GET", `/api/feedbacks?teacherId=${encodeURIComponent(teacher.id)}`);

  teacherStats.innerHTML = `
    <div class="stat-tile"><strong>${classes.length}</strong><span>turma${classes.length === 1 ? "" : "s"}</span></div>
    <div class="stat-tile"><strong>${students.length}</strong><span>aluno${students.length === 1 ? "" : "s"}</span></div>
    <div class="stat-tile"><strong>${feedbacks.length}</strong><span>feedback${feedbacks.length === 1 ? "" : "s"} registrado${feedbacks.length === 1 ? "" : "s"}</span></div>
  `;
}

// ---- base de necessidades ---------------------------------------------------

async function renderNeedsView() {
  try {
    const { needs } = await api("GET", "/api/needs");
    state.needs = needs;
    needsGrid.innerHTML = needs
      .map(
        (need) => `
      <article class="need-card">
        <div class="need-header">
          <span class="activity-type">${need.source}</span>
          ${need.draft ? `<span class="draft-badge">Rascunho</span>` : ""}
          <div class="need-actions">
            <button class="secondary-action small-action" type="button" data-consult-need="${need.id}">Consultar IA</button>
            <button class="secondary-action small-action" type="button" data-observe-need="${need.id}">Observação</button>
            ${
              need.custom && state.user.role === "admin"
                ? `<button class="secondary-action small-action" type="button" data-delete-need="${need.id}">Remover</button>`
                : ""
            }
          </div>
        </div>
        <h3>${need.name}</h3>
        <p>${need.summary}</p>
        <div class="teacher-note">
          <strong>Percepção da professora</strong>
          <p>${need.observation || "Nenhuma observação registrada para esta deficiência."}</p>
        </div>
        <div>
          <strong>Estratégias</strong>
          <p>${need.strategies.join(", ") || "ainda não preenchido."}</p>
        </div>
        <div>
          <strong>Cuidados</strong>
          <p>${need.barriers.join(", ") || "ainda não preenchido."}</p>
        </div>
        <div>
          <strong>Atividades favoráveis</strong>
          <p>${need.activityMatches.join(", ") || "ainda não preenchido."}</p>
        </div>
      </article>
    `
      )
      .join("");

    needsGrid.querySelectorAll("[data-consult-need]").forEach((button) => {
      button.addEventListener("click", () => consultAiForNeed(button.dataset.consultNeed));
    });
    needsGrid.querySelectorAll("[data-observe-need]").forEach((button) => {
      button.addEventListener("click", () => openNeedObservation(button.dataset.observeNeed));
    });
    needsGrid.querySelectorAll("[data-delete-need]").forEach((button) => {
      button.addEventListener("click", () => deleteNeed(button.dataset.deleteNeed));
    });
  } catch (error) {
    showToast(error.message, true);
  }
}

function openNeedObservation(needId) {
  const need = state.needs.find((item) => item.id === needId);
  state.observationNeedId = needId;
  needObservationTitle.textContent = need ? `Percepção sobre ${need.name}` : "Registrar percepção";
  needObservationText.value = (need && need.observation) || "";
  needObservationDialog.showModal();
}

async function saveNeedObservation() {
  if (!state.observationNeedId) return;
  try {
    await api("PUT", `/api/needs/${state.observationNeedId}/observation`, { text: needObservationText.value.trim() });
    showToast("Percepção salva.");
    await renderNeedsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function saveNewNeed() {
  const name = newNeedName.value.trim();
  if (!name) return;
  try {
    await api("POST", "/api/needs", { name, observation: newNeedObservation.value.trim() });
    showToast("Deficiência adicionada à base como rascunho.");
    await renderNeedsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteNeed(needId) {
  const confirmed = await confirmDialog({
    title: "Remover deficiência",
    message: "Remover este registro da base de necessidades? Isso não afeta alunos já cadastrados com outra deficiência.",
    confirmLabel: "Remover"
  });
  if (!confirmed) return;
  try {
    await api("DELETE", `/api/needs/${needId}`);
    showToast("Registro removido.");
    await renderNeedsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function consultAiForNeed(needId) {
  const need = state.needs.find((item) => item.id === needId);
  if (!need) return;

  if (!state.aiStatus || !state.aiStatus.configured) {
    showToast(
      "Nenhuma IA configurada neste sistema. Peça para quem cuida do computador definir AI_PROVIDER=ollama (com o Ollama aberto) ou AI_PROVIDER=openai + OPENAI_API_KEY no arquivo .env, e reiniciar o servidor.",
      true
    );
    return;
  }

  const hasContent = need.barriers.length || need.strategies.length || need.resources.length;
  if (hasContent) {
    const confirmed = await confirmDialog({
      title: "Substituir conteúdo por sugestão da IA?",
      message: `"${need.name}" já tem barreiras, estratégias ou recursos preenchidos. Consultar a IA agora vai substituir esse conteúdo pela sugestão gerada. Continuar?`,
      confirmLabel: "Consultar e substituir",
      danger: true
    });
    if (!confirmed) return;
  }

  showToast(`Consultando ${state.aiStatus.label || "IA"}... isso pode levar alguns segundos.`);
  try {
    await api("POST", `/api/needs/${needId}/consult-ai`);
    showToast("Sugestão da IA aplicada.");
    await renderNeedsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadAiStatus() {
  try {
    state.aiStatus = await api("GET", "/api/ai/status");
  } catch (error) {
    state.aiStatus = { configured: false, provider: null, label: null };
  }
  if (aiStatusLine) {
    aiStatusLine.textContent = state.aiStatus.configured
      ? `IA configurada: ${state.aiStatus.label}.`
      : "IA não configurada nesta instalação (peça para a coordenação ativar em Coordenação > IA).";
  }
}

// ---- coordenação: turmas ----------------------------------------------------

function bindAdminEvents() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".admin-subview").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      el(`adminTab-${tab.dataset.adminTab}`).classList.add("active");
      if (tab.dataset.adminTab === "history") renderHistory();
      if (tab.dataset.adminTab === "ai") renderAiSettings();
    });
  });

  el("addClassButton").addEventListener("click", () => openClassDialog());
  el("classForm").addEventListener("submit", () => saveClass());

  el("addTeacherButton").addEventListener("click", () => openTeacherDialog());
  el("teacherForm").addEventListener("submit", () => saveTeacher());
  el("teacherPasswordForm").addEventListener("submit", () => saveTeacherPassword());

  el("addStudentButton").addEventListener("click", () => openStudentDialog());
  el("studentForm").addEventListener("submit", () => saveStudent());

  el("adminStudentsSearch").addEventListener("input", () => renderAdminStudents());
  el("adminStudentsClassFilter").addEventListener("change", () => renderAdminStudents());

  aiProviderInput.addEventListener("change", () => {
    updateAiProviderFieldsVisibility();
    if (aiProviderInput.value === "ollama") loadOllamaModelOptions();
  });
  aiRefreshModelsButton.addEventListener("click", () => loadOllamaModelOptions());
  aiModelChoices.addEventListener("click", (event) => {
    const button = event.target.closest("[data-model]");
    if (!button) return;
    aiOllamaModelInput.value = button.dataset.model;
  });
  aiSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAiSettings();
  });
}

function updateAiProviderFieldsVisibility() {
  const provider = aiProviderInput.value;
  aiOllamaFields.hidden = provider !== "ollama";
  aiOpenaiFields.hidden = provider !== "openai";
}

// Consulta o proprio Ollama (via o backend, que repassa a chamada) para
// descobrir quais modelos ja estao baixados nesta maquina, e mostra eles
// como botoes clicaveis (clicar preenche o campo Modelo na hora). Tambem
// preenche a <datalist> do campo como reforco, mas os botoes sao o jeito
// principal de escolher - o autocompletar nativo do navegador so sugere
// opcoes que comecem com o texto ja digitado no campo, entao se o campo
// ja tiver algo escrito (ex: "llama3.2", valor padrao antes de trocar) os
// outros modelos ficam escondidos da sugestao nativa, o que confundia.
async function loadOllamaModelOptions() {
  const baseUrl = aiOllamaBaseUrlInput.value.trim();
  aiModelListStatus.textContent = "Consultando modelos instalados...";
  aiModelChoices.hidden = true;
  aiModelChoices.innerHTML = "";
  aiRefreshModelsButton.disabled = true;
  try {
    const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : "";
    const result = await api("GET", `/api/ai/ollama-models${query}`);
    const models = result.models || [];
    aiOllamaModelList.innerHTML = models.map((name) => `<option value="${name}"></option>`).join("");
    if (result.error) {
      aiModelListStatus.textContent = result.error;
    } else if (models.length) {
      aiModelListStatus.textContent = `${models.length} modelo(s) encontrado(s) nesta máquina — clique em um abaixo para usá-lo:`;
      aiModelChoices.innerHTML = models
        .map((name) => `<button type="button" class="model-chip" data-model="${name}">${name}</button>`)
        .join("");
      aiModelChoices.hidden = false;
    } else {
      aiModelListStatus.textContent = "Nenhum modelo baixado ainda nesta máquina (use \"ollama pull qwen2.5:7b\" em um terminal).";
    }
  } catch (error) {
    aiModelListStatus.textContent = error.message;
  } finally {
    aiRefreshModelsButton.disabled = false;
  }
}

async function renderAiSettings() {
  try {
    const settings = await api("GET", "/api/ai/settings");
    aiProviderInput.value = settings.provider || "";
    aiOllamaBaseUrlInput.value = settings.ollamaBaseUrl || "";
    aiOllamaModelInput.value = settings.ollamaModel || "";
    aiOpenaiModelInput.value = settings.openaiModel || "";
    aiOpenaiKeyInput.value = "";
    aiOpenaiClearKeyInput.checked = false;
    aiOpenaiKeyStatus.textContent = settings.openaiKeySet
      ? "Já existe uma chave salva (não é exibida por segurança). Deixe o campo em branco para mantê-la."
      : "Nenhuma chave salva ainda.";
    updateAiProviderFieldsVisibility();
    aiSettingsStatusLine.textContent = settings.configured
      ? `IA ativa agora: ${settings.effectiveLabel}.`
      : "Nenhuma IA ativa no momento — as telas usam apenas o motor de regras.";
    aiModelListStatus.textContent = "";
    aiOllamaModelList.innerHTML = "";
    aiModelChoices.hidden = true;
    aiModelChoices.innerHTML = "";
    if (aiProviderInput.value === "ollama") loadOllamaModelOptions();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function saveAiSettings() {
  const provider = aiProviderInput.value;
  const payload = { provider };
  if (provider === "ollama") {
    payload.ollamaBaseUrl = aiOllamaBaseUrlInput.value.trim();
    payload.ollamaModel = aiOllamaModelInput.value.trim();
  }
  if (provider === "openai") {
    payload.openaiApiKey = aiOpenaiKeyInput.value.trim();
    payload.openaiModel = aiOpenaiModelInput.value.trim();
    payload.clearOpenaiKey = aiOpenaiClearKeyInput.checked;
  }
  const submitButton = el("aiSettingsSubmit");
  const originalLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";
  try {
    await api("PUT", "/api/ai/settings", payload);
    showToast("Configuração de IA salva.");
    await renderAiSettings();
    await loadAiStatus();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

function renderAdminClasses() {
  const table = el("classesTable");
  table.innerHTML = state.classes
    .map(
      (klass) => `
    <div class="table-row">
      <div><strong>${klass.name}</strong><span class="muted"> · ${klass.level}</span></div>
      <div class="row-actions">
        <button class="secondary-action small-action" type="button" data-edit-class="${klass.id}">Editar</button>
        <button class="secondary-action small-action" type="button" data-delete-class="${klass.id}">Excluir</button>
      </div>
    </div>
  `
    )
    .join("") || `<p class="muted">Nenhuma turma cadastrada ainda.</p>`;

  table.querySelectorAll("[data-edit-class]").forEach((button) => {
    button.addEventListener("click", () => openClassDialog(button.dataset.editClass));
  });
  table.querySelectorAll("[data-delete-class]").forEach((button) => {
    button.addEventListener("click", () => deleteClass(button.dataset.deleteClass));
  });
}

function openClassDialog(classId) {
  state.editingClassId = classId || null;
  const klass = classId ? state.classes.find((item) => item.id === classId) : null;
  el("classDialogEyebrow").textContent = klass ? "Editar turma" : "Nova turma";
  el("classDialogTitle").textContent = klass ? "Editar turma" : "Cadastrar turma";
  el("classDialogSubmit").textContent = klass ? "Salvar alterações" : "Salvar turma";
  el("classNameInput").value = klass ? klass.name : "";
  el("classLevelInput").value = klass ? klass.level : "Jardim";
  el("classDialog").showModal();
}

async function saveClass() {
  const payload = { name: el("classNameInput").value.trim(), level: el("classLevelInput").value };
  if (!payload.name) return;
  try {
    if (state.editingClassId) {
      await api("PUT", `/api/classes/${state.editingClassId}`, payload);
    } else {
      await api("POST", "/api/classes", payload);
    }
    showToast("Turma salva.");
    await loadReferenceData();
    populateClassSelect();
    await handleClassChange();
    renderAdminClasses();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteClass(classId) {
  const confirmed = await confirmDialog({ title: "Excluir turma", message: "Excluir esta turma? Isso não pode ser desfeito." });
  if (!confirmed) return;
  try {
    await api("DELETE", `/api/classes/${classId}`);
    showToast("Turma excluída.");
    await loadReferenceData();
    populateClassSelect();
    await handleClassChange();
    renderAdminClasses();
  } catch (error) {
    showToast(error.message, true);
  }
}

// ---- coordenação: professoras -----------------------------------------------

function renderAdminTeachers() {
  const table = el("teachersTable");
  const classesById = Object.fromEntries(state.classes.map((k) => [k.id, k]));
  table.innerHTML = state.teachers
    .map((teacher) => {
      const classNames = (teacher.classIds || []).map((id) => classesById[id]?.name).filter(Boolean).join(", ") || "Nenhuma turma";
      return `
      <div class="table-row">
        <div><strong>${teacher.name}</strong><span class="muted"> · ${classNames}</span></div>
        <div class="row-actions">
          <button class="secondary-action small-action" type="button" data-edit-teacher="${teacher.id}">Editar</button>
          <button class="secondary-action small-action" type="button" data-password-teacher="${teacher.id}">Redefinir senha</button>
          <button class="secondary-action small-action" type="button" data-delete-teacher="${teacher.id}">Excluir</button>
        </div>
      </div>
    `;
    })
    .join("") || `<p class="muted">Nenhuma professora cadastrada ainda.</p>`;

  table.querySelectorAll("[data-edit-teacher]").forEach((button) => {
    button.addEventListener("click", () => openTeacherDialog(button.dataset.editTeacher));
  });
  table.querySelectorAll("[data-password-teacher]").forEach((button) => {
    button.addEventListener("click", () => openTeacherPasswordDialog(button.dataset.passwordTeacher));
  });
  table.querySelectorAll("[data-delete-teacher]").forEach((button) => {
    button.addEventListener("click", () => deleteTeacher(button.dataset.deleteTeacher));
  });
}

function renderTeacherClassCheckboxes(selectedIds) {
  const container = el("teacherClassesCheckboxes");
  container.innerHTML = state.classes
    .map(
      (klass) => `
    <label class="checkbox-option">
      <input type="checkbox" value="${klass.id}" ${selectedIds.includes(klass.id) ? "checked" : ""} />
      ${klass.name}
    </label>
  `
    )
    .join("");
}

function openTeacherDialog(teacherId) {
  state.editingTeacherId = teacherId || null;
  const teacher = teacherId ? state.teachers.find((item) => item.id === teacherId) : null;
  el("teacherDialogEyebrow").textContent = teacher ? "Editar professora" : "Nova professora";
  el("teacherDialogTitle").textContent = teacher ? "Editar professora" : "Cadastrar professora";
  el("teacherDialogSubmit").textContent = teacher ? "Salvar alterações" : "Salvar professora";
  el("teacherNameInput").value = teacher ? teacher.name : "";
  el("teacherEmailInput").value = teacher ? teacher.email || "" : "";
  el("teacherPasswordInput").value = "";
  el("teacherPasswordFieldWrap").hidden = Boolean(teacher);
  el("teacherPasswordInput").required = !teacher;
  el("teacherDialogHint").textContent = teacher
    ? "Para trocar a senha de acesso, use o botão \"Redefinir senha\" na lista."
    : "";
  renderTeacherClassCheckboxes(teacher ? teacher.classIds || [] : []);
  el("teacherDialog").showModal();
}

function warnOrphanClasses(orphanClasses) {
  if (orphanClasses && orphanClasses.length) {
    showToast(`Atenção: a turma "${orphanClasses.join('", "')}" ficou sem nenhuma professora vinculada.`, true);
  }
}

async function saveTeacher() {
  const classIds = Array.from(el("teacherClassesCheckboxes").querySelectorAll("input:checked")).map((input) => input.value);
  const name = el("teacherNameInput").value.trim();
  const email = el("teacherEmailInput").value.trim();
  if (!name || !email) {
    showToast("Informe nome e e-mail.", true);
    return;
  }
  try {
    if (state.editingTeacherId) {
      const { orphanClasses } = await api("PUT", `/api/teachers/${state.editingTeacherId}`, { name, email, classIds });
      warnOrphanClasses(orphanClasses);
    } else {
      const password = el("teacherPasswordInput").value;
      if (!password) {
        showToast("Informe a senha inicial da nova professora.", true);
        return;
      }
      await api("POST", "/api/teachers", { name, email, password, classIds });
    }
    showToast("Professora salva.");
    await loadReferenceData();
    populateClassSelect();
    await handleClassChange();
    renderAdminTeachers();
  } catch (error) {
    showToast(error.message, true);
  }
}

function openTeacherPasswordDialog(teacherId) {
  state.passwordTeacherId = teacherId;
  const teacher = state.teachers.find((item) => item.id === teacherId);
  el("teacherPasswordTitle").textContent = teacher ? `Nova senha para ${teacher.name}` : "Nova senha de acesso";
  el("teacherNewPasswordInput").value = "";
  el("teacherPasswordDialog").showModal();
}

async function saveTeacherPassword() {
  const password = el("teacherNewPasswordInput").value;
  if (!password || password.length < 4) {
    showToast("A senha deve ter pelo menos 4 caracteres.", true);
    return;
  }
  try {
    await api("PUT", `/api/teachers/${state.passwordTeacherId}/password`, { password });
    showToast("Senha atualizada.");
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteTeacher(teacherId) {
  const confirmed = await confirmDialog({
    title: "Excluir professora",
    message: "Excluir esta professora? O login dela também será removido."
  });
  if (!confirmed) return;
  try {
    const { orphanClasses } = await api("DELETE", `/api/teachers/${teacherId}`);
    showToast("Professora excluída.");
    warnOrphanClasses(orphanClasses);
    await loadReferenceData();
    renderAdminTeachers();
  } catch (error) {
    showToast(error.message, true);
  }
}

// ---- coordenação: alunos -----------------------------------------------------

async function renderAdminStudents() {
  try {
    const { students } = await api("GET", "/api/students");
    const search = normalizeSearch(el("adminStudentsSearch").value);
    const classFilter = el("adminStudentsClassFilter").value;
    const filtered = students
      .filter((student) => !classFilter || student.classId === classFilter)
      .filter((student) => !search || normalizeSearch(student.fullName).includes(search));

    const groups = groupByClass(filtered);
    const grid = el("adminGrid");
    if (!groups.length) {
      grid.innerHTML = `<p class="muted">Nenhum aluno encontrado.</p>`;
      return;
    }

    grid.innerHTML = groups
      .map(
        (group) => `
      <section class="class-group">
        <h3 class="class-group-title">${group.classInfo ? group.classInfo.name : "Sem turma"}</h3>
        <div class="admin-grid">
          ${group.students
            .map(
              (student) => `
            <article class="admin-card">
              <h3>${student.fullName}</h3>
              <p>${student.age} anos · ${student.disability}</p>
              <div class="admin-private">
                <span class="private-label">🔒 Somente coordenação</span>
                <p><strong>Nascimento:</strong> ${student.birthDate}</p>
                <p><strong>Responsável:</strong> ${student.guardian}</p>
                <p><strong>Contato:</strong> ${student.phone}</p>
                <p><strong>Documentos:</strong> ${student.documentsNote || "nenhum registrado."}</p>
              </div>
              <div class="row-actions">
                <button class="secondary-action small-action" type="button" data-edit-student="${student.id}">Editar</button>
                <button class="secondary-action small-action" type="button" data-delete-student="${student.id}">Excluir</button>
              </div>
            </article>
          `
            )
            .join("")}
        </div>
      </section>
    `
      )
      .join("");

    grid.querySelectorAll("[data-edit-student]").forEach((button) => {
      button.addEventListener("click", () => openStudentDialog(button.dataset.editStudent, students));
    });
    grid.querySelectorAll("[data-delete-student]").forEach((button) => {
      button.addEventListener("click", () => deleteStudent(button.dataset.deleteStudent));
    });
  } catch (error) {
    showToast(error.message, true);
  }
}

function populateStudentClassOptions() {
  el("studentClassInput").innerHTML = state.classes.map((klass) => `<option value="${klass.id}">${klass.name}</option>`).join("");
}

function populateStudentNeedOptions(selectedId) {
  el("studentNeedInput").innerHTML =
    `<option value="">Selecione...</option>` +
    state.needs.map((need) => `<option value="${need.id}" ${need.id === selectedId ? "selected" : ""}>${need.name}</option>`).join("");
}

function renderCheckboxGroup(containerId, tags, selected) {
  el(containerId).innerHTML = tags
    .map(
      (tag) => `
    <label class="checkbox-option">
      <input type="checkbox" value="${tag}" ${selected.includes(tag) ? "checked" : ""} />
      ${tag}
    </label>
  `
    )
    .join("");
}

function readCheckboxGroup(containerId) {
  return Array.from(el(containerId).querySelectorAll("input:checked")).map((input) => input.value);
}

function openStudentDialog(studentId, studentsCache) {
  state.editingStudentId = studentId || null;
  populateStudentClassOptions();
  const student = studentId ? (studentsCache || []).find((item) => item.id === studentId) : null;

  el("studentDialogEyebrow").textContent = student ? "Editar aluno" : "Novo aluno";
  el("studentDialogTitle").textContent = student ? "Editar aluno" : "Cadastrar aluno";
  el("studentDialogSubmit").textContent = student ? "Salvar alterações" : "Salvar aluno";

  el("studentFullNameInput").value = student ? student.fullName : "";
  el("studentShortNameInput").value = student ? student.shortName : "";
  el("studentAgeInput").value = student ? student.age : "";
  el("studentClassInput").value = student ? student.classId : state.classes[0]?.id || "";
  populateStudentNeedOptions(student ? student.needId : null);
  el("studentProfileInput").value = student ? student.profile : "";
  renderCheckboxGroup("studentStrengthsCheckboxes", state.tags.strengthTags, student ? student.strengths : []);
  renderCheckboxGroup("studentCautionsCheckboxes", state.tags.cautionTags, student ? student.cautions : []);
  el("studentBirthDateInput").value = student ? student.birthDate : "";
  el("studentGuardianInput").value = student ? student.guardian : "";
  el("studentPhoneInput").value = student ? student.phone : "";
  el("studentDocumentsInput").value = student ? student.documentsNote : "";

  el("studentDialog").showModal();
}

async function saveStudent() {
  const needId = el("studentNeedInput").value || null;
  const needOption = needId ? state.needs.find((item) => item.id === needId) : null;
  const payload = {
    fullName: el("studentFullNameInput").value.trim(),
    shortName: el("studentShortNameInput").value.trim(),
    age: Number(el("studentAgeInput").value),
    classId: el("studentClassInput").value,
    needId,
    disability: needOption ? needOption.name : "Não informado",
    profile: el("studentProfileInput").value.trim(),
    strengths: readCheckboxGroup("studentStrengthsCheckboxes"),
    cautions: readCheckboxGroup("studentCautionsCheckboxes"),
    birthDate: el("studentBirthDateInput").value.trim(),
    guardian: el("studentGuardianInput").value.trim(),
    phone: el("studentPhoneInput").value.trim(),
    documentsNote: el("studentDocumentsInput").value.trim()
  };

  if (!needId) {
    showToast("Selecione a deficiência/necessidade do aluno.", true);
    return;
  }

  try {
    if (state.editingStudentId) {
      await api("PUT", `/api/students/${state.editingStudentId}`, payload);
    } else {
      await api("POST", "/api/students", payload);
    }
    showToast("Aluno salvo.");
    await renderAdminStudents();
    await handleClassChange();
    await renderStudentsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteStudent(studentId) {
  const confirmed = await confirmDialog({
    title: "Excluir aluno",
    message: "Excluir este aluno? Feedbacks e observações associados também serão removidos."
  });
  if (!confirmed) return;
  try {
    await api("DELETE", `/api/students/${studentId}`);
    showToast("Aluno excluído.");
    await renderAdminStudents();
    await handleClassChange();
    await renderStudentsView();
  } catch (error) {
    showToast(error.message, true);
  }
}

// ---- coordenação: histórico de alterações -----------------------------------

async function renderHistory() {
  try {
    const { entries } = await api("GET", "/api/audit");
    const table = el("historyTable");
    if (!entries.length) {
      table.innerHTML = `<p class="muted">Nenhuma ação registrada ainda.</p>`;
      return;
    }
    table.innerHTML = entries
      .map((entry) => {
        const when = new Date(entry.at).toLocaleString("pt-BR");
        return `
        <div class="table-row">
          <div>
            <strong>${entry.actorName || "Sistema"}</strong>
            <span class="muted"> ${entry.action} ${entry.entity}${entry.details ? ` · ${entry.details}` : ""}</span>
          </div>
          <div class="muted">${when}</div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    showToast(error.message, true);
  }
}

boot();
