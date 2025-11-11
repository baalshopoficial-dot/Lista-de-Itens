// ==========================
// 🔒 Dark Epoch Security Edition
// v2025.11 - Sessão segura + Firebase fixo
// ==========================

// --- Inicialização Firebase global ---
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
  console.log("🔥 Firebase inicializado globalmente.");
}

const db = firebase.firestore();

// --- Bloqueio de acesso direto / expiração de sessão ---
(function protegerAcesso() {
  const caminho = window.location.pathname.toLowerCase();
  const pagina = caminho.split("/").pop();
  const paginasPublicas = ["index.html", "consulta.html", "consulta_geral.html"];

  if (!paginasPublicas.includes(pagina)) {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
    const expirado = Date.now() - loginTime > 3600000; // 1 hora

    if (!isAdmin || expirado) {
      console.warn("🚫 Acesso não autorizado ou sessão expirada.");
      alert("⚠️ Sessão expirada ou acesso restrito. Faça login novamente.");
      localStorage.clear();
      window.location.href = "/Lista-de-Itens/index.html";
      return;
    }
  }
})();

// ================== CONFIGURAÇÃO ==================
const ADMIN_HASH = "18b68013caff50520c9706a2b96b2370f8fe3cc5be15db5dca5324bf48d52a77"; // D3v1L2Br
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf

const COL_LISTAS = "listas_epoch";
const COL_SENHAS = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS = "logs_actions";

let NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ================== UTILITÁRIAS ==================
async function sha256(msg) {
  const buf = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function logConsole(msg, style = "color:#00ffd5") {
  console.log(`%c${msg}`, style);
}

function glowOk() {
  const el = document.getElementById("loginCard");
  if (!el) return;
  el.classList.add("glow-ok");
  setTimeout(() => el.classList.remove("glow-ok"), 1000);
}

async function registrarLog(usuario, acao) {
  try {
    await db.collection(COL_LOGS).add({
      usuario: usuario || "sistema",
      acao: acao || "",
      data: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Falha ao registrar log:", e);
  }
}

// ================== LOGIN ==================
async function loginAdmin() {
  const senha = (document.getElementById("adminPassword")?.value || "").trim();
  const status = document.getElementById("loginStatus");
  if (!senha) {
    status.textContent = "Digite a senha.";
    return;
  }

  const hash = await sha256(senha);

  if (hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    localStorage.setItem("loginTime", Date.now());
    status.textContent = "🦇 Acesso MASTER concedido!";
    glowOk();
    await registrarLog("MASTER", "Login master efetuado");
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    localStorage.setItem("loginTime", Date.now());
    status.textContent = "✅ Acesso ADMIN concedido!";
    glowOk();
    await registrarLog("ADMIN", "Login admin padrão efetuado");
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  try {
    const snap = await db.collection(COL_SENHAS).get();
    let valid = false;
    snap.forEach(doc => {
      if (doc.data().hash === hash) valid = true;
    });
    if (valid) {
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("loginTime", Date.now());
      status.textContent = "✅ Acesso permitido.";
      glowOk();
      setTimeout(() => window.location.href = "menu.html", 800);
    } else {
      status.textContent = "❌ Senha incorreta.";
    }
  } catch (e) {
    console.error(e);
    status.textContent = "⚠️ Erro ao verificar senha.";
  }
}

// ================== CONTROLE DE LISTAS ==================
async function carregarLista(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  const snap = await ref.get();

  let dados = [];
  if (snap.exists && Array.isArray(snap.data().nomes)) {
    dados = snap.data().nomes;
  } else {
    dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false, false, false] }));
    await ref.set({ nomes: dados });
  }

  const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : 3)));
  theadRow.innerHTML = "<th>Nome</th>" + Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join("");
  tbody.innerHTML = "";

  dados.forEach(item => {
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    tdNome.textContent = item.nome;
    tr.appendChild(tdNome);
    const cols = item.cols || [false, false, false];
    cols.forEach((c, i) => {
      const td = document.createElement("td");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!c;
      chk.addEventListener("change", () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function salvarLista(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];
  const dados = linhas.map(row => {
    const nome = row.cells[0].textContent;
    const cols = [];
    for (let i = 1; i <= colCount; i++) cols.push(row.cells[i].querySelector("input").checked);
    return { nome, cols, data: new Date().toISOString() };
  });

  await db.collection(COL_LISTAS).doc(nomeLista).set({ nomes: dados });
  logConsole(`💾 Lista ${nomeLista} salva (${dados.length} nomes).`);
}

// ================== LIMPEZA ==================
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector("input");
      if (!chk.checked) colunasCheias[i - 1] = false;
    }
  });

  colunasCheias.forEach((ok, i) => {
    if (ok) {
      linhas.forEach(row => row.cells[i + 1].querySelector("input").checked = false);
      logConsole(`🧹 Coluna ${i + 1} limpa automaticamente.`);
    }
  });

  if (colunasCheias[colCount - 1]) {
    const th = document.createElement("th");
    th.textContent = colCount + 1;
    theadRow.appendChild(th);
    linhas.forEach(row => {
      const td = document.createElement("td");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.addEventListener("change", () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });
    logConsole("🆕 Nova coluna criada automaticamente.");
  }

  await salvarLista(nomeLista);
}

window.loginAdmin = loginAdmin;
window.carregarLista = carregarLista;
window.salvarLista = salvarLista;
window.verificarLimpeza = verificarLimpeza;
