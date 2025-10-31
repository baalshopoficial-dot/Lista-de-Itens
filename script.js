// ====== Hash das senhas ======
const ADMIN_HASH = "29d6b22b61cb1d96b72a6d34cd51f5292b1f4a66ea00944f72702dc067ad4817"; // D3v1L2Br
const MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf



// ====== Firebase config ======
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

// ====== Utilitários ======
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function glowOk() {
  const card = document.getElementById('loginCard');
  if (card) {
    card.classList.add('glow-ok');
    setTimeout(() => card.classList.remove('glow-ok'), 1200);
  }
}

async function ensureFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
  return db;
}

// ====== Login ======
async function loginAdmin() {
  const input = document.getElementById("adminPassword").value || '';
  const hash = await sha256(input);
  const status = document.getElementById("loginStatus");

  if (hash === MASTER_HASH) {
    localStorage.setItem("isMaster", "true");
    localStorage.setItem("isAdmin", "true");
    status.textContent = "✅ Acesso MASTER concedido.";
    glowOk();
    await ensureFirebase();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
  } 
  else if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    status.textContent = "✅ Acesso ADMIN permitido.";
    glowOk();
    await ensureFirebase();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
  } 
  else {
    status.textContent = "❌ Senha incorreta!";
  }
}

// ====== Controle de Acesso ======
function requireAdminOrRedirect() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isMaster = localStorage.getItem("isMaster") === "true";
  if (!isAdmin && !isMaster) {
    alert("Acesso restrito — faça login novamente.");
    window.location.href = "index.html";
  }
}

function requireMasterOrRedirect() {
  const isMaster = localStorage.getItem("isMaster") === "true";
  if (!isMaster) {
    alert("Acesso restrito — apenas o administrador master pode abrir esta página.");
    window.location.href = "../menu.html";
  }
}

// ====== Nomes padrão ======
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ====== Funções auxiliares ======
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

// ====== Carregar Lista ======
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
    const tdNome = document.createElement('td');
    tdNome.textContent = item.nome;
    tr.appendChild(tdNome);

    cols.forEach((value, i) => {
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
}

// ====== Salvar Lista ======
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
}

// ====== Verificação e expansão dinâmica ======
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  if (linhas.length === 0) return;

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      if (!row.cells[i].querySelector('input').checked) colunasCheias[i - 1] = false;
    }
  });

  // Se uma coluna inteira estiver marcada, limpa ela
  colunasCheias.forEach((colFull, i) => {
    if (colFull) linhas.forEach(row => row.cells[i + 1].querySelector('input').checked = false);
  });

  // Se a última coluna for totalmente marcada, cria uma nova
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
  }

  await salvarLista(nomeLista);
}


