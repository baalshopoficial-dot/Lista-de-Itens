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
// ====== LOGIN ATUALIZADO ======
async function loginAdmin() {
  const input = document.getElementById("adminPassword").value.trim();
  const hash = await sha256(input);
  const status = document.getElementById("loginStatus");

  // Inicializa Firebase
  await ensureFirebase();

  // 1️⃣ Verifica a senha master (fixa)
  const MASTER_HASH = "f4b8f0e1e6d3d8fcb5f7a7cbe9c63c59c0f50a6a4d02c2eea0d69a2233da2f61"; // hash da cp1115bupnf
  if (hash === MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    status.textContent = "🦇 Acesso MASTER autorizado!";
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  // 2️⃣ Verifica a senha padrão (admin)
  if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    status.textContent = "✅ Acesso permitido!";
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  // 3️⃣ Verifica senhas adicionais no Firestore
  try {
    const ref = db.collection("senhas_epoch");
    const snapshot = await ref.get();
    let acessoLiberado = false;
    snapshot.forEach(doc => {
      const dados = doc.data();
      if (dados.hash === hash) {
        acessoLiberado = true;
        localStorage.setItem("isAdmin", "true");
        status.textContent = `✅ Acesso liberado para ${dados.nome || "usuário"}`;
        setTimeout(() => window.location.href = "menu.html", 800);
      }
    });

    if (!acessoLiberado) {
      status.textContent = "❌ Senha incorreta ou não cadastrada.";
    }
  } catch (err) {
    console.error("Erro ao verificar senhas no Firestore:", err);
    status.textContent = "⚠️ Erro ao verificar senha no servidor.";
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

  // Verifica cada célula da tabela
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector('input');
      if (!chk.checked) colunasCheias[i - 1] = false;
    }
  });

  // 🔹 Limpa automaticamente as colunas que estiverem 100% marcadas
  colunasCheias.forEach((preenchida, i) => {
    if (preenchida) {
      linhas.forEach(row => {
        const chk = row.cells[i + 1].querySelector('input');
        chk.checked = false;
      });
      console.log(`🧹 Coluna ${i + 1} limpa automaticamente (todas estavam marcadas).`);
    }
  });

  // 🔹 Se a última coluna for totalmente preenchida → cria nova coluna
  if (colunasCheias[colCount - 1]) {
    const novaCol = colCount + 1;
    const th = document.createElement('th');
    th.textContent = novaCol;
    theadRow.appendChild(th);

    linhas.forEach(row => {
      const td = document.createElement('td');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.addEventListener('change', () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });

    console.log(`🆕 Nova coluna criada (${novaCol}) após preencher completamente a anterior.`);
  }

  // 🔹 Salva o estado atualizado no Firestore
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


