// ====== Auth (senha: devilsbr) ======
const ADMIN_HASH = "43ff7c9877b03130544a7db8506a019571a1b34d4b5879d85c1583f8bf94dfaa";

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

// ====== Util ======
function glowOk() {
  const card = document.getElementById('loginCard');
  if (card) {
    card.classList.add('glow-ok');
    setTimeout(() => card.classList.remove('glow-ok'), 1400);
  }
}

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

// ====== Login ======
async function loginAdmin() {
  const input = document.getElementById('adminPassword').value || '';
  const hash = await sha256(input);
  const status = document.getElementById('loginStatus');
  if (hash === ADMIN_HASH) {
    localStorage.setItem('isAdmin', 'true');
    status.textContent = '✅ Acesso permitido!';
    glowOk();
    await ensureFirebase();
    setTimeout(() => window.location.href = 'menu.html', 800);
  } else {
    status.textContent = '❌ Senha incorreta!';
  }
}

// ====== Dados ======
const NOMES_INICIAIS = [
  "HodgeNelly", "ValdezDevin", "CrxZzyBR", "Hellow", "Cilla", "Felps",
  "Sarada", "TannerJosea", "FuraBuxo", "YatesMucel", "PHARAOH", "MalignaRT",
  "AnuBis", "LuchadorDeLuz", "WileyKayla", "MathisPell", "Espadakon",
  "Sylvannas", "Numb", "Solus", "Chele", "apollyon", "lady", "caramelo", "glenmore"
];

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

// ====== Render / Load ======
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

// ====== Save ======
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
  console.log('💾 Lista salva:', nomeLista, dados.length, 'itens, cols=', colCount);
}

// ====== Limpeza e expansão dinâmica ======
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

  for (let i = 0; i < colCount - 1; i++) {
    if (colunasCheias[i]) {
      linhas.forEach(row => { row.cells[i + 1].querySelector('input').checked = false; });
    }
  }

  if (colunasCheias[colCount - 1]) {
    const th = document.createElement('th');
    th.textContent = String(colCount + 1);
    theadRow.appendChild(th);
    linhas.forEach(row => {
      const td = document.createElement('td');
      const chk = document.createElement('input'); chk.type = 'checkbox';
      chk.addEventListener('change', () => verificarLimpeza(nomeLista));
      td.appendChild(chk); row.appendChild(td);
    });
    console.log('🆕 Nova coluna criada:', colCount + 1);
  }

  await salvarLista(nomeLista);
}

// ====== Cadastro / Exclusão ======
async function cadastrarNomeGlobal(novoNome) {
  await ensureFirebase();
  const listas = ['coc', 'alma', 'bau', 'chama', 'pena'];
  for (const nomeLista of listas) {
    const ref = db.collection('listas_epoch').doc(nomeLista);
    const snap = await ref.get();
    let dados = snap.exists ? (snap.data().nomes || []) : [];
    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : 3)));
    const existe = dados.some(x => x.nome.toLowerCase() === novoNome.toLowerCase());
    if (!existe) {
      const cols = Array(colCount).fill(false);
      dados.push({ nome: novoNome, cols, data: new Date().toISOString() });
      await ref.set({ nomes: dados });
    }
  }
}

async function excluirNomeGlobal(nome) {
  await ensureFirebase();
  const listas = ['coc', 'alma', 'bau', 'chama', 'pena'];

  // Executa todas as exclusões em paralelo
  const promises = listas.map(async (nomeLista) => {
    const ref = db.collection('listas_epoch').doc(nomeLista);
    const snap = await ref.get();
    if (snap.exists) {
      const dados = (snap.data().nomes || []).filter(x => x.nome.toLowerCase() !== nome.toLowerCase());
      await ref.set({ nomes: dados });
      console.log(`🗑️ ${nome} removido de ${nomeLista}`);
    }
  });

  await Promise.all(promises);
  console.log(`✅ ${nome} removido de todas as listas`);
}

async function obterTodosNomesBase() {
  await ensureFirebase();
  const ref = db.collection('listas_epoch').doc('coc');
  const snap = await ref.get();
  if (snap.exists) return (snap.data().nomes || []).map(x => x.nome);
  const dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false, false, false], data: new Date().toISOString() }));
  await ref.set({ nomes: dados });
  return dados.map(x => x.nome);
}
