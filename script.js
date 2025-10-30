// ====== Auth ======
// Senha comum: D3v1L2Br
const ADMIN_HASH = "29d6b22b61cb1d96b72a6d34cd51f5292b1f4a66ea00944f72702dc067ad4817";
// Senha master: cp1115bupnf (hash SHA-256)
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a";

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

// ====== Funções utilitárias ======
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function glowOk() {
  const card = document.getElementById("loginCard");
  if (card) {
    card.classList.add("glow-ok");
    setTimeout(() => card.classList.remove("glow-ok"), 1200);
  }
}

async function ensureFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
  return db;
}

// ====== Login ======
async function loginAdmin() {
  const input = document.getElementById("adminPassword").value || "";
  const hash = await sha256(input);
  const status = document.getElementById("loginStatus");

  await ensureFirebase();

  // Acesso Master
  if (hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    status.textContent = "✅ Acesso MASTER concedido!";
    glowOk();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
    return;
  }

  // Acesso comum
  if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    status.textContent = "✅ Acesso permitido!";
    glowOk();
    setTimeout(() => { window.location.href = "menu.html"; }, 900);
  } else {
    status.textContent = "❌ Senha incorreta!";
  }
}

// ====== Dados ======
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

function legacyToCols(item) {
  if (Array.isArray(item.cols)) return item.cols;
  const arr = []; for (let i=1;i<=3;i++) arr.push(!!item["col"+i]);
  return arr;
}
function ensureColsLength(cols, len) {
  const out = cols.slice(); while (out.length < len) out.push(false); return out;
}

// ====== Render / Load ======
async function carregarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const ref = db.collection("listas_epoch").doc(nomeLista);
  const snap = await ref.get();
  let dados = [];
  if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length > 0) {
    dados = snap.data().nomes;
  } else {
    dados = NOMES_INICIAIS.map(n => ({ nome:n, cols:[false,false,false], data:new Date().toISOString() }));
    await ref.set({ nomes: dados });
  }

  let colCount = Math.max(3, ...dados.map(x => legacyToCols(x).length));
  theadRow.innerHTML = "<th>Nome</th>" + Array.from({ length: colCount }, (_,i)=>`<th>${i+1}</th>`).join("");
  tbody.innerHTML="";

  dados.forEach(item => {
    const cols = ensureColsLength(legacyToCols(item), colCount);
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td"); tdNome.textContent = item.nome; tr.appendChild(tdNome);
    cols.forEach((value,i) => {
      const td = document.createElement("td");
      const chk = document.createElement("input"); chk.type="checkbox"; chk.checked = !!value;
      chk.addEventListener("change", () => verificarLimpeza(nomeLista));
      td.appendChild(chk); tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ====== Save ======
async function salvarLista(nomeLista) {
  await ensureFirebase();
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];
  const dados = linhas.map(row => {
    const nome = row.cells[0].textContent;
    const cols = []; for (let i=1;i<=colCount;i++) cols.push(row.cells[i].querySelector("input").checked);
    return { nome, cols, data: new Date().toISOString() };
  });
  await db.collection("listas_epoch").doc(nomeLista).set({ nomes: dados });
  console.log("💾 Lista salva:", nomeLista, dados.length, "itens, cols=", colCount);
}

// ====== Limpeza e expansão dinâmica ======
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll("tr")];
  if (linhas.length === 0) return;

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i=1;i<=colCount;i++) if (!row.cells[i].querySelector("input").checked) colunasCheias[i-1] = false;
  });

  for (let i=0;i<colCount-1;i++) if (colunasCheias[i]) linhas.forEach(row => { row.cells[i+1].querySelector("input").checked = false; });

  if (colunasCheias[colCount-1]) {
    const th = document.createElement("th"); th.textContent = String(colCount+1); theadRow.appendChild(th);
    linhas.forEach(row => { const td=document.createElement("td"); const chk=document.createElement("input"); chk.type="checkbox"; chk.addEventListener("change",()=>verificarLimpeza(nomeLista)); td.appendChild(chk); row.appendChild(td); });
    console.log("🆕 Nova coluna criada:", colCount+1);
  }

  await salvarLista(nomeLista);
}

// ====== Cadastro ======
async function cadastrarNomeGlobal(novoNome) {
  await ensureFirebase();
  const listas=["coc","alma","bau","chama","pena"];
  for (const nomeLista of listas) {
    const ref = db.collection("listas_epoch").doc(nomeLista);
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

// ====== Exclusão ======
async function excluirNomeEmListas(nome, listas) {
  await ensureFirebase();
  const tasks = listas.map(async (nomeLista) => {
    const ref = db.collection("listas_epoch").doc(nomeLista);
    const snap = await ref.get();
    if (snap.exists) {
      const dados = (snap.data().nomes || []).filter(x => x.nome.toLowerCase() !== nome.toLowerCase());
      await ref.set({ nomes: dados });
      console.log(`🗑️ ${nome} removido de ${nomeLista}`);
    }
  });
  await Promise.all(tasks);
  console.log(`✅ ${nome} removido de: ${listas.join(", ")}`);
}

async function excluirNomeGlobal(nome) {
  return excluirNomeEmListas(nome, ["coc","alma","bau","chama","pena"]);
}

// ====== Consulta (renderização e realtime) ======
function montarHeaderConsulta(thead, colCount) {
  thead.innerHTML = "<tr><th>Nome</th>" +
    Array.from({length: colCount}, (_, i) => `<th>${i+1}</th>`).join("") +
  "</tr>";
}

function montarCorpoConsulta(tbody, dados, colCount) {
  tbody.innerHTML = "";
  dados.forEach(item => {
    const cols = (Array.isArray(item.cols) ? item.cols.slice() : legacyToCols(item));
    while (cols.length < colCount) cols.push(false);
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    tdNome.className = "nome";
    tdNome.textContent = item.nome;
    tr.appendChild(tdNome);
    cols.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v ? "✅" : "⛔";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function escutarListaConsulta(nomeLista, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;
  const ref = db.collection("listas_epoch").doc(nomeLista);
  ref.onSnapshot(async (snap) => {
    let dados = [];
    if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length > 0) {
      dados = snap.data().nomes;
    } else {
      dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false, false, false], data: new Date().toISOString() }));
      await ref.set({ nomes: dados });
      return;
    }
    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : legacyToCols(x).length)));
    montarHeaderConsulta(thead, colCount);
    montarCorpoConsulta(tbody, dados, colCount);
  }, (err) => {
    console.error(`[consulta] erro ao assinar ${nomeLista}:`, err);
  });
}
