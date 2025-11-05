// ==========================================================
// DARK EPOCH SYSTEM v2025.11
// ==========================================================

// ================== CONFIGURAÇÃO ==================
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

// Nome das coleções
const COL_LISTAS = "listas_epoch";
const COL_SENHAS = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS = "logs_actions";

let db = null;

// ================== NOMES PADRÃO ==================
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ================== FUNÇÕES BÁSICAS ==================
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function logConsole(msg, style = "") {
  if (style) console.log(`%c${msg}`, style);
  else console.log(msg);
}

async function ensureFirebase() {
  if (typeof firebase === "undefined") throw new Error("Firebase SDK não carregado.");
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
  return db;
}

// ================== LOGIN ==================
async function loginAdmin() {
  const senha = (document.getElementById("adminPassword")?.value || "").trim();
  const statusEl = document.getElementById("loginStatus");
  if (!statusEl) return;
  if (!senha) {
    statusEl.textContent = "⚠️ Digite sua senha.";
    return;
  }

  const hash = await sha256(senha);
  await ensureFirebase();

  // MASTER
  if (hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    statusEl.textContent = "🦇 Acesso MASTER concedido!";
    logConsole("MASTER LOGIN OK", "color:#00ffcc");
    setTimeout(() => (window.location.href = "menu.html"), 800);
    return;
  }

  // ADMIN
  if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    statusEl.textContent = "✅ Acesso ADMIN autorizado.";
    logConsole("ADMIN LOGIN OK", "color:#ffff99");
    setTimeout(() => (window.location.href = "menu.html"), 800);
    return;
  }

  // SENHAS CUSTOM
  const snap = await db.collection(COL_SENHAS).get();
  let acesso = false;
  snap.forEach(doc => {
    const d = doc.data();
    if (d.hash === hash) {
      acesso = true;
      localStorage.setItem("isAdmin", "true");
      localStorage.removeItem("isMaster");
      localStorage.setItem("usuario", d.nome);
      statusEl.textContent = `✅ Acesso liberado: ${d.nome}`;
      setTimeout(() => (window.location.href = "menu.html"), 800);
    }
  });
  if (!acesso) statusEl.textContent = "❌ Senha incorreta.";
}

// ================== CONTROLE DE ACESSO ==================
function requireAdminOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("⚠️ Acesso restrito — faça login novamente.");
    window.location.href = "../index.html";
  }
}

function requireMasterOrRedirect() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isMaster = localStorage.getItem("isMaster") === "true";
  if (!isAdmin) {
    alert("⚠️ Faça login novamente.");
    window.location.href = "../index.html";
  } else if (!isMaster) {
    alert("⚠️ Acesso permitido apenas ao MASTER.");
    window.location.href = "../menu.html";
  }
}

// ================== LOGS ==================
async function registrarLog(usuario, acao) {
  try {
    await ensureFirebase();
    await db.collection(COL_LOGS).add({
      data: new Date().toISOString(),
      usuario: usuario || "Sistema",
      acao: acao || ""
    });
  } catch (e) {
    console.warn("Falha ao registrar log:", e);
  }
}

// ================== LISTAS ==================
async function carregarLista(nomeLista) {
  try {
    await ensureFirebase();
    const tbody = document.getElementById('listaCocBody');
    const theadRow = document.getElementById('theadRow');
    if (!tbody || !theadRow) return;

    const ref = db.collection(COL_LISTAS).doc(nomeLista);
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn(`⚠️ Lista ${nomeLista} não encontrada no Firestore.`);
      return;
    }

    const dados = snap.data().nomes || [];
    if (dados.length === 0) {
      console.warn(`⚠️ Lista ${nomeLista} vazia.`);
      return;
    }

    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : 3)));
    theadRow.innerHTML = '<th>Nome</th>' + Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join('');
    tbody.innerHTML = '';

    dados.forEach(item => {
      const cols = item.cols || [false, false, false];
      const tr = document.createElement('tr');
      const tdNome = document.createElement('td');
      tdNome.textContent = item.nome;
      tdNome.className = 'nome';
      tr.appendChild(tdNome);

      cols.forEach(value => {
        const td = document.createElement('td');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = !!value;
        chk.addEventListener('change', () => verificarLimpeza(nomeLista));
        td.appendChild(chk);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    console.log(`✅ Lista ${nomeLista} carregada (${dados.length} registros).`);
  } catch (e) {
    console.error("Erro ao carregar lista:", e);
  }
}

async function salvarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  const dados = linhas.map(row => {
    const nome = row.cells[0].textContent;
    const cols = [];
    for (let i = 1; i <= colCount; i++) cols.push(!!row.cells[i].querySelector('input').checked);
    return { nome, cols, data: new Date().toISOString() };
  });

  await db.collection(COL_LISTAS).doc(nomeLista).set({ nomes: dados });
  await registrarLog("Admin", `Lista ${nomeLista.toUpperCase()} salva (${dados.length} itens)`);
}

// ================== LIMPEZA AUTOMÁTICA ==================
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector('input');
      if (!chk.checked) colunasCheias[i - 1] = false;
    }
  });

  colunasCheias.forEach((preenchida, idx) => {
    if (preenchida) {
      linhas.forEach(row => {
        const chk = row.cells[idx + 1].querySelector('input');
        if (chk) chk.checked = false;
      });
      registrarLog("Sistema", `Coluna ${idx + 1} limpa em ${nomeLista}`);
    }
  });

  await salvarLista(nomeLista);
}

// ================== EXPORT GLOBAL ==================
window.loginAdmin = loginAdmin;
window.requireAdminOrRedirect = requireAdminOrRedirect;
window.requireMasterOrRedirect = requireMasterOrRedirect;
window.carregarLista = carregarLista;
window.salvarLista = salvarLista;
window.verificarLimpeza = verificarLimpeza;

logConsole("🦇 script.js carregado — DarkEpoch v2025.11", "color:#00ffcc; font-weight:bold;");
