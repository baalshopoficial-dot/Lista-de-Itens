// DarkEpoch v2025.11-FIX4

// --- GARANTE FIREBASE EM TODAS AS PÁGINAS ---
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyB5IT8QbzljkYD3DW1VxaHNRhokANIpKj4",
    authDomain: "mu-epoch.firebaseapp.com",
    projectId: "mu-epoch",
    storageBucket: "mu-epoch.firebasestorage.app",
    messagingSenderId: "995547087811",
    appId: "1:995547087811:web:9a4581071b931f9364f376",
    measurementId: "G-NM65WWHE91"
  });
}

const ADMIN_HASH = "18b68013caff50520c9706a2b96b2370f8fe3cc5be15db5dca5324bf48d52a77"; // D3v1L2Br
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf

const firebaseConfig = {
  apiKey: "AIzaSyB5IT8QbzljkYD3DW1VxaHNRhokANIpKj4",
  authDomain: "mu-epoch.firebaseapp.com",
  projectId: "mu-epoch",
  storageBucket: "mu-epoch.firebasestorage.app",
  messagingSenderId: "995547087811",
  appId: "1:995547087811:web:9a4581071b931f9364f376",
  measurementId: "G-NM65WWHE91"
};

const COL_LISTAS  = "listas_epoch";
const COL_SENHAS  = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS    = "logs_actions";

let db = null;

const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function logConsole(msg, style = "") {
  if (style) console.log("%c" + msg, style);
  else console.log(msg);
}

function glowOk() {
  const card = document.getElementById("loginCard");
  if (!card) return;
  card.classList.add("glow-ok");
  setTimeout(() => card.classList.remove("glow-ok"), 800);
}

async function ensureFirebase() {
  if (typeof firebase === "undefined") {
    throw new Error("Firebase SDK não carregado.");
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  if (!db) {
    db = firebase.firestore();
  }
  return db;
}

// ============ LOGIN HÍBRIDO ============
async function loginAdmin() {
  const statusEl = document.getElementById("loginStatus");
  const passEl   = document.getElementById("adminPassword");
  const emailEl  = document.getElementById("adminEmail");

  if (!passEl || !statusEl) return;

  const senha = (passEl.value || "").trim();
  const emailVisivel = emailEl && emailEl.style.display !== "none" && emailEl.value.includes("@");
  const email = emailVisivel ? emailEl.value.trim() : "";

  if (!senha && !email) {
    statusEl.textContent = "⚠️ Informe a senha (ou e-mail + senha).";
    return;
  }

  try {
    await ensureFirebase();
  } catch (e) {
    console.error(e);
    statusEl.textContent = "❌ Erro ao inicializar Firebase.";
    return;
  }

  statusEl.textContent = "⏳ Verificando...";
  const hash = await sha256(senha);

  // MASTER (hash)
  if (!email && hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    statusEl.textContent = "🦇 Acesso MASTER concedido.";
    glowOk();
    await registrarLog("MASTER", "Login MASTER (hash)");
    setTimeout(() => location.href = "menu.html", 700);
    return;
  }

  // ADMIN padrão (hash)
  if (!email && hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    statusEl.textContent = "✅ Acesso ADMIN concedido.";
    glowOk();
    await registrarLog("ADMIN", "Login ADMIN (hash)");
    setTimeout(() => location.href = "menu.html", 700);
    return;
  }

  // Senhas extras (coleção senhas_epoch)
  if (!email) {
    try {
      const snap = await db.collection(COL_SENHAS).get();
      let ok = false;
      snap.forEach(doc => {
        const d = doc.data();
        if (d && d.hash === hash) {
          ok = true;
          localStorage.setItem("isAdmin", "true");
          localStorage.removeItem("isMaster");
          localStorage.setItem("usuario", d.nome || "User");
        }
      });
      if (ok) {
        statusEl.textContent = "✅ Acesso autorizado.";
        glowOk();
        await registrarLog(localStorage.getItem("usuario") || "USER", "Login senha custom");
        setTimeout(() => location.href = "menu.html", 700);
      } else {
        statusEl.textContent = "❌ Senha inválida.";
      }
      return;
    } catch (e) {
      console.error(e);
      statusEl.textContent = "❌ Erro ao validar senha.";
      return;
    }
  }

  // Login via Firebase Auth (se e-mail visível)
  if (email) {
    if (!firebase.auth) {
      statusEl.textContent = "❌ Firebase Auth não carregado.";
      return;
    }
    try {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
      const user = cred.user;
      let role = "admin";
      try {
        const doc = await db.collection("admin_users").doc(user.email).get();
        if (doc.exists && doc.data().role) role = doc.data().role;
      } catch {}
      localStorage.setItem("isAdmin", "true");
      if (role === "master") localStorage.setItem("isMaster", "true");
      else localStorage.removeItem("isMaster");
      statusEl.textContent = `✅ Acesso ${role.toUpperCase()} via Firebase.`;
      glowOk();
      await registrarLog(role.toUpperCase(), "Login Firebase: " + email);
      setTimeout(() => location.href = "menu.html", 700);
    } catch (e) {
      console.error(e);
      if (e.code === "auth/user-not-found") statusEl.textContent = "❌ Usuário não encontrado.";
      else if (e.code === "auth/wrong-password") statusEl.textContent = "❌ Senha incorreta.";
      else statusEl.textContent = "❌ Erro: " + e.message;
    }
  }
}

// ============ GUARDAS ============
function requireAdminOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("Acesso restrito — faça login.");
    location.href = "../index.html";
  }
}

function requireMasterOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("Acesso restrito — faça login.");
    location.href = "../index.html";
    return;
  }
  if (localStorage.getItem("isMaster") !== "true") {
    alert("Apenas MASTER pode acessar essa área.");
    location.href = "../menu.html";
  }
}

// ============ LOGS ============
async function registrarLog(usuario, acao) {
  try {
    await ensureFirebase();
    await db.collection(COL_LOGS).add({
      data: new Date().toISOString(),
      usuario: usuario || "sistema",
      acao: acao || ""
    });
  } catch (e) {
    console.warn("Falha log:", e);
  }
}

// ============ LISTAS ============
function legacyToCols(item) {
  if (!item) return [false, false, false];
  if (Array.isArray(item.cols)) return item.cols;
  const arr = [];
  for (let i = 1; i <= 3; i++) arr.push(!!item["col" + i]);
  return arr;
}

function ensureColsLength(cols, len) {
  const out = cols.slice();
  while (out.length < len) out.push(false);
  return out;
}

async function carregarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) {
    console.warn("Tabela não encontrada.");
    return;
  }

  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  const snap = await ref.get();

  if (!snap.exists) {
    tbody.innerHTML = `<tr><td colspan="4">Lista '${nomeLista}' não encontrada.</td></tr>`;
    return;
  }

  const dados = Array.isArray(snap.data().nomes) ? snap.data().nomes : [];
  if (!dados.length) {
    tbody.innerHTML = `<tr><td colspan="4">Nenhum nome em '${nomeLista}'.</td></tr>`;
    return;
  }

  const colCount = Math.max(3, ...dados.map(x => legacyToCols(x).length));
  theadRow.innerHTML =
    "<th>Nome</th>" +
    Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join("");

  tbody.innerHTML = "";
  dados.forEach(item => {
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    tdNome.className = "nome";
    tdNome.textContent = item.nome;
    tr.appendChild(tdNome);
    const cols = ensureColsLength(legacyToCols(item), colCount);
    cols.forEach(v => {
      const td = document.createElement("td");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!v;
      chk.addEventListener("change", () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function salvarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];
  const dados = linhas.map(row => {
    const nome = row.cells[0].textContent;
    const cols = [];
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector("input");
      cols.push(!!(chk && chk.checked));
    }
    return { nome, cols, data: new Date().toISOString() };
  });
  await db.collection(COL_LISTAS).doc(nomeLista).set({ nomes: dados });
  await registrarLog("ADMIN", `Salvar lista ${nomeLista} (${dados.length})`);
}

async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];
  if (!linhas.length) return;

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector("input");
      if (!chk || !chk.checked) colunasCheias[i - 1] = false;
    }
  });

  colunasCheias.forEach((full, idx) => {
    if (full) {
      linhas.forEach(row => {
        const chk = row.cells[idx + 1].querySelector("input");
        if (chk) chk.checked = false;
      });
      registrarLog("SYSTEM", `Coluna ${idx + 1} limpa em ${nomeLista}`);
    }
  });

  if (colunasCheias[colCount - 1]) {
    const nova = colCount + 1;
    const th = document.createElement("th");
    th.textContent = String(nova);
    theadRow.appendChild(th);
    linhas.forEach(row => {
      const td = document.createElement("td");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.addEventListener("change", () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });
    registrarLog("SYSTEM", `Nova coluna ${nova} criada em ${nomeLista}`);
  }

  await salvarLista(nomeLista);
}

// ============ ADD / REMOVE ============
async function cadastrarNomeGlobal(novoNome) {
  if (!novoNome || !novoNome.trim()) return;
  const nome = novoNome.trim();
  await ensureFirebase();
  const listas = ["coc", "alma", "bau", "chama", "pena"];

  for (const nl of listas) {
    const ref = db.collection(COL_LISTAS).doc(nl);
    const snap = await ref.get();
    let dados = snap.exists ? (snap.data().nomes || []) : [];
    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : 3)), 3);
    if (!dados.some(x => (x.nome || "").toLowerCase() === nome.toLowerCase())) {
      dados.push({ nome, cols: Array(colCount).fill(false), data: new Date().toISOString() });
      await ref.set({ nomes: dados });
    }
  }
  await registrarLog("ADMIN", `Adicionar nome global: ${nome}`);
}

async function adicionarNome() {
  const campo = document.getElementById("novoNome");
  if (!campo) return;
  const nome = campo.value.trim();
  if (!nome) return alert("Digite um nome.");
  await cadastrarNomeGlobal(nome);
  campo.value = "";
  const st = document.getElementById("status");
  if (st) st.textContent = `✅ "${nome}" adicionado em todas as listas.`;
}

async function excluirNomeEmListas(nome, listas) {
  if (!nome) return;
  const alvo = nome.trim().toLowerCase();
  await ensureFirebase();
  const tasks = listas.map(async nl => {
    const ref = db.collection(COL_LISTAS).doc(nl);
    const snap = await ref.get();
    if (!snap.exists) return;
    const dados = (snap.data().nomes || []).filter(
      x => (x.nome || "").toLowerCase() !== alvo
    );
    await ref.set({ nomes: dados });
  });
  await Promise.all(tasks);
  await registrarLog("ADMIN", `Remover "${nome}" de: ${listas.join(",")}`);
}

async function removerNome() {
  const nome = (document.getElementById("nomeRemover")?.value || "").trim();
  if (!nome) return alert("Digite o nome.");
  const listas = [...document.querySelectorAll(".listaChk:checked")].map(c => c.value);
  if (!listas.length) return alert("Selecione pelo menos uma lista.");
  await excluirNomeEmListas(nome, listas);
  const st = document.getElementById("statusRemover");
  if (st) st.textContent = `✅ "${nome}" removido de: ${listas.join(", ")}`;
  document.getElementById("nomeRemover").value = "";
}

// ============ SENHAS EXTRAS ============
async function carregarSenhas() {
  await ensureFirebase();
  const tbody = document.querySelector("#tabelaSenhas tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const snap = await db.collection(COL_SENHAS).get();
  snap.forEach(doc => {
    const s = doc.data();
    if (!s || s.hash === ADMIN_MASTER_HASH) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.nome}</td>
      <td>${(s.hash || "").slice(0, 16)}...</td>
      <td><button onclick="excluirSenha('${doc.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}

async function criarSenha(nome, senha) {
  if (!nome || !senha) throw new Error("Nome e senha obrigatórios.");
  await ensureFirebase();
  const hash = await sha256(senha);
  const id = nome.toLowerCase().replace(/\s+/g, "_");
  await db.collection(COL_SENHAS).doc(id).set({
    nome,
    hash,
    criado_em: new Date().toISOString()
  });
  await registrarLog("MASTER", `Senha criada para ${nome}`);
}

async function criarSenhaUI() {
  const nome = (document.getElementById("nomeSenha")?.value || "").trim();
  const senha = (document.getElementById("novaSenha")?.value || "").trim();
  if (!nome || !senha) return alert("Preencha todos os campos.");
  await criarSenha(nome, senha);
  document.getElementById("nomeSenha").value = "";
  document.getElementById("novaSenha").value = "";
  const st = document.getElementById("statusSenha");
  if (st) st.textContent = `✅ Senha criada para ${nome}`;
  carregarSenhas();
}

async function excluirSenha(id) {
  if (!confirm("Excluir esta senha?")) return;
  await ensureFirebase();
  await db.collection(COL_SENHAS).doc(id).delete();
  await registrarLog("MASTER", `Senha ${id} excluída`);
  carregarSenhas();
}

// ============ CONSULTA GERAL ============
function montarHeaderConsulta(thead, colCount) {
  thead.innerHTML =
    "<tr><th>Nome</th>" +
    Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join("") +
    "</tr>";
}

function montarCorpoConsulta(tbody, dados, colCount) {
  tbody.innerHTML = "";
  dados.forEach(item => {
    const cols = ensureColsLength(legacyToCols(item), colCount);
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td class="nome">${item.nome}</td>` +
      cols.map(v => `<td>${v ? "✅" : "⛔"}</td>`).join("");
    tbody.appendChild(tr);
  });
}

function escutarListaConsulta(nomeLista, theadId, tbodyId) {
  ensureFirebase().then(() => {
    const thead = document.getElementById(theadId);
    const tbody = document.getElementById(tbodyId);
    if (!thead || !tbody) return;
    const ref = db.collection(COL_LISTAS).doc(nomeLista);
    ref.onSnapshot(snap => {
      if (!snap.exists) return;
      const dados = snap.data().nomes || [];
      const colCount = Math.max(3, ...dados.map(x => legacyToCols(x).length));
      montarHeaderConsulta(thead, colCount);
      montarCorpoConsulta(tbody, dados, colCount);
    });
  });
}

// ============ BACKUP AUTO ============
async function executarBackupAutomatizado() {
  try {
    await ensureFirebase();
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const janela =
      (h === 13 && m >= 30 && m < 35) ||
      (h === 21 && m >= 30 && m < 35);
    if (!janela) return;
    const listas = ["coc", "alma", "bau", "chama", "pena"];
    const conteudo = {};
    let total = 0;
    for (const l of listas) {
      const s = await db.collection(COL_LISTAS).doc(l).get();
      conteudo[l] = s.exists ? s.data().nomes || [] : [];
      total += conteudo[l].length;
    }
    await db.collection(COL_BACKUPS).add({
      data: new Date().toISOString(),
      totalNomes: total,
      conteudo,
      tipo: "automático"
    });
    await registrarLog("SYSTEM", `Backup automático (${total})`);
  } catch (e) {
    console.error("backup auto:", e);
    await registrarLog("ERRO", "Falha backup automático");
  }
}
setInterval(() => {
  try { executarBackupAutomatizado(); } catch {}
}, 300000);

// ============ EXPORT ============
window.loginAdmin = loginAdmin;
window.requireAdminOrRedirect = requireAdminOrRedirect;
window.requireMasterOrRedirect = requireMasterOrRedirect;
window.carregarLista = carregarLista;
window.salvarLista = salvarLista;
window.verificarLimpeza = verificarLimpeza;
window.cadastrarNomeGlobal = cadastrarNomeGlobal;
window.adicionarNome = adicionarNome;
window.excluirNomeEmListas = excluirNomeEmListas;
window.removerNome = removerNome;
window.carregarSenhas = carregarSenhas;
window.criarSenhaUI = criarSenhaUI;
window.excluirSenha = excluirSenha;
window.escutarListaConsulta = escutarListaConsulta;
window.executarBackupAutomatizado = executarBackupAutomatizado;

logConsole("🦇 DarkEpoch script.js v2025.11-FIX4 carregado", "color:#00ffd5;font-weight:bold;");
