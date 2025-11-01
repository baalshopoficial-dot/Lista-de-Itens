// ====== 🔐 AUTH CONFIG ======
const ADMIN_HASH = "29d6b22b61cb1d96b72a6d34cd51f5292b1f4a66ea00944f72702dc067ad4817"; // D3v1L2Br
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf

// ====== ☁️ FIREBASE CONFIG ======
const firebaseConfig = {
  apiKey: "AIzaSyB5IT8QbzljkYD3DW1VxaHNRhokANIpKj4",
  authDomain: "mu-epoch.firebaseapp.com",
  projectId: "mu-epoch",
  storageBucket: "mu-epoch.firebasestorage.app",
  messagingSenderId: "995547087811",
  appId: "1:995547087811:web:9a4581071b931f9364f376",
  measurementId: "G-NM65WWHE91"
};

let db = null;

// ====== 🧮 NOMES INICIAIS ======
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ====== ⚙️ UTILITÁRIAS ======
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
  return db;
}

function glowOk() {
  const card = document.getElementById('loginCard');
  if (card) {
    card.classList.add('glow-ok');
    setTimeout(() => card.classList.remove('glow-ok'), 1200);
  }
}

// ====== 🔑 LOGIN ======
async function loginAdmin() {
  const input = document.getElementById("adminPassword").value || '';
  const hash = await sha256(input);
  const status = document.getElementById("loginStatus");
  await ensureFirebase();

  if (hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    status.textContent = "✅ Acesso MASTER concedido!";
    console.log("%c🦇 DarkEpoch | Modo MASTER Ativado", "color: #00ffcc; font-weight: bold; font-size: 16px;");
    glowOk();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
  } else if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    status.textContent = "✅ Acesso permitido!";
    console.log("%c⚔️ DarkEpoch | Acesso Admin comum liberado", "color: #ffff66; font-weight: bold; font-size: 14px;");
    glowOk();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
  } else {
    status.textContent = "❌ Senha incorreta!";
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("isMaster");
  }
}

// ====== 🚫 PROTEÇÃO DE PÁGINAS ======
function requireAdminOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("Acesso restrito — faça login.");
    window.location.href = "../index.html";
  }
}

function requireMasterOrRedirect() {
  const isMaster = localStorage.getItem("isMaster") === "true";
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!isAdmin) {
    alert("Acesso restrito — faça login.");
    window.location.href = "../index.html";
    return;
  }
  if (!isMaster) {
    alert("Acesso permitido apenas para a MASTER.");
    window.location.href = "../menu.html";
    return;
  }
}

// ====== 🧾 LOG GLOBAL ======
async function registrarLog(usuario, acao) {
  try {
    const db = await ensureFirebase();
    await db.collection("logs_actions").add({
      data: new Date().toISOString(),
      usuario,
      acao
    });
  } catch (e) {
    console.warn("⚠️ Falha ao registrar log:", e);
  }
}

// ====== 📜 LISTAS ======
function legacyToCols(item) {
  if (Array.isArray(item.cols)) return item.cols;
  const arr = [];
  for (let i = 1; i <= 3; i++) arr.push(!!item['col' + i]);
  return arr;
}

function ensureColsLength(cols, len) {
  const out = cols.slice();
  while (out.length < len) out.push(false);
  return out;
}

async function carregarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const ref = db.collection('listas_epoch').doc(nomeLista);
  const snap = await ref.get();
  let dados = [];
  if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length > 0) {
    dados = snap.data().nomes;
  } else {
    dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false, false, false], data: new Date().toISOString() }));
    await ref.set({ nomes: dados });
  }

  let colCount = Math.max(3, ...dados.map(x => legacyToCols(x).length));
  theadRow.innerHTML = '<th>Nome</th>' + Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join('');
  tbody.innerHTML = '';

  dados.forEach(item => {
    const cols = ensureColsLength(legacyToCols(item), colCount);
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td'); tdNome.textContent = item.nome; tr.appendChild(tdNome);
    cols.forEach((value, i) => {
      const td = document.createElement('td');
      const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!value;
      chk.addEventListener('change', () => verificarLimpeza(nomeLista));
      td.appendChild(chk); tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function salvarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  const dados = linhas.map(row => {
    const nome = row.cells[0].textContent;
    const cols = [];
    for (let i = 1; i <= colCount; i++) cols.push(row.cells[i].querySelector('input').checked);
    return { nome, cols, data: new Date().toISOString() };
  });

  await db.collection('listas_epoch').doc(nomeLista).set({ nomes: dados });
  await registrarLog("Admin", `Lista ${nomeLista.toUpperCase()} salva (${dados.length} itens)`);
  console.log('💾 Lista salva:', nomeLista, dados.length);
}

// ====== 🔄 LIMPEZA E EXPANSÃO ======
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  if (linhas.length === 0) return;

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++)
      if (!row.cells[i].querySelector('input').checked) colunasCheias[i - 1] = false;
  });

  if (colunasCheias[colCount - 1]) {
    const th = document.createElement('th');
    th.textContent = String(colCount + 1);
    theadRow.appendChild(th);
    linhas.forEach(row => {
      const td = document.createElement('td');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.addEventListener('change', () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });
    console.log('🆕 Nova coluna criada:', colCount + 1);
  }

  await salvarLista(nomeLista);
}

// ====== 🕒 BACKUP AUTOMÁTICO ======
async function executarBackupAutomatizado() {
  try {
    const db = await ensureFirebase();
    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();

    const deveExecutar =
      (hora === 13 && minuto >= 30 && minuto < 35) ||
      (hora === 21 && minuto >= 30 && minuto < 35);

    if (!deveExecutar) return;

    const refBackup = db.collection("backups_listas");
    const colecoes = ["coc", "alma", "bau", "chama", "pena"];
    const backup = {};
    let total = 0;

    for (const nome of colecoes) {
      const doc = await db.collection("listas_epoch").doc(nome).get();
      backup[nome] = doc.exists ? doc.data().nomes : [];
      total += backup[nome].length;
    }

    await refBackup.add({
      data: new Date().toISOString(),
      totalNomes: total,
      conteudo: backup,
      tipo: "automático"
    });

    await registrarLog("MASTER_AUTOMÁTICO", `Backup automático executado (${total} registros)`);
    console.log("%c💾 Backup automático concluído!", "color:#00ffcc");
  } catch (e) {
    console.error("⚠️ Erro no backup automático:", e);
    await registrarLog("ERRO", `Falha no backup automático: ${e.message}`);
  }
}

setInterval(executarBackupAutomatizado, 300000); // a cada 5 minutos
