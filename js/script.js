// js/script.js
// DarkEpoch - v2025.10.31
// Arquivo consolidado: login (master/admin/usuários), listas, backups automáticos e logs.

// ================== CONFIGURAÇÃO ==================
const ADMIN_HASH = "29d6b22b61cb1d96b72a6d34cd51f5292b1f4a66ea00944f72702dc067ad4817"; // D3v1L2Br
const ADMIN_MASTER_HASH = "f4b8f0e1e6d3d8fcb5f7a7cbe9c63c59c0f50a6a4d02c2eea0d69a2233da2f61"; // cp1115bupnf

const firebaseConfig = {
  apiKey: "AIzaSyB5IT8QbzljkYD3DW1VxaHNRhokANIpKj4",
  authDomain: "mu-epoch.firebaseapp.com",
  projectId: "mu-epoch",
  storageBucket: "mu-epoch.firebasestorage.app",
  messagingSenderId: "995547087811",
  appId: "1:995547087811:web:9a4581071b931f9364f376",
  measurementId: "G-NM65WWHE91"
};

// Coleções usadas
const COL_LISTAS = "listas_epoch";
const COL_SENHAS = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS = "logs_actions";

let db = null;

// ================== NOMES INICIAIS ==================
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ================== UTILITÁRIAS ==================
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function logConsole(message, style = "") {
  if (style) console.log(`%c${message}`, style);
  else console.log(message);
}

function glowOk() {
  const card = document.getElementById('loginCard');
  if (card) {
    card.classList.add('glow-ok');
    setTimeout(() => card.classList.remove('glow-ok'), 1200);
  }
}

async function ensureFirebase() {
  if (typeof firebase === "undefined") {
    throw new Error("Firebase SDK não carregado. Verifique se os scripts do Firebase estão inclusos nas páginas.");
  }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if (!db) db = firebase.firestore();
  return db;
}

// ================== LOGIN ==================
async function loginAdmin() {
  const input = (document.getElementById("adminPassword")?.value || "").trim();
  const statusEl = document.getElementById("loginStatus");
  if (!statusEl) throw new Error("Elemento #loginStatus não encontrado no HTML.");

  let hash;
  try {
    hash = await sha256(input);
  } catch (e) {
    console.error("Erro calculando hash:", e);
    statusEl.textContent = "⚠️ Erro interno.";
    return;
  }

  // Inicializa Firebase antes de qualquer acesso à coleção de senhas
  try {
    await ensureFirebase();
  } catch (e) {
    console.error("Erro ao iniciar Firebase:", e);
    statusEl.textContent = "⚠️ Erro de conexão Firebase.";
    return;
  }

  // 1) MASTER (sempre primeiro)
  if (hash === ADMIN_MASTER_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isMaster", "true");
    statusEl.textContent = "🦇 Acesso MASTER concedido!";
    logConsole("🦇 DarkEpoch | Modo MASTER Ativado", "color: #00ffcc; font-weight: bold; font-size: 13px;");
    glowOk();
    await registrarLog("MASTER", "Login MASTER efetuado");
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  // 2) ADMIN padrão
  if (hash === ADMIN_HASH) {
    localStorage.setItem("isAdmin", "true");
    localStorage.removeItem("isMaster");
    statusEl.textContent = "✅ Acesso de administrador autorizado.";
    logConsole("⚔️ DarkEpoch | Acesso Admin comum liberado", "color: #ffff66; font-weight: bold;");
    glowOk();
    await registrarLog("ADMIN", "Login ADMIN padrão efetuado");
    setTimeout(() => window.location.href = "menu.html", 800);
    return;
  }

  // 3) Senhas adicionais no Firestore
  try {
    const snap = await db.collection(COL_SENHAS).get();
    let acesso = false;
    snap.forEach(doc => {
      const d = doc.data();
      if (d && d.hash === hash) {
        acesso = true;
        localStorage.setItem("isAdmin", "true");
        localStorage.removeItem("isMaster");
        localStorage.setItem("senhaUser", d.nome || "Usuário");
        statusEl.textContent = `✅ Acesso liberado: ${d.nome || "Usuário"}`;
        glowOk();
        registrarLog(d.nome || "Usuario", "Login por senha custom");
        setTimeout(() => window.location.href = "menu.html", 800);
      }
    });
    if (!acesso) {
      statusEl.textContent = "❌ Senha incorreta ou não cadastrada.";
    }
  } catch (e) {
    console.error("Erro ao verificar senhas adicionais:", e);
    statusEl.textContent = "⚠️ Erro ao verificar senhas no servidor.";
  }
}

// ================== CONTROLE DE ACESSO ==================
function requireAdminOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("Acesso restrito — faça login.");
    window.location.href = "../index.html";
  }
}

function requireMasterOrRedirect() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isMaster = localStorage.getItem("isMaster") === "true";
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

// ================== LOGS ==================
async function registrarLog(usuario, acao) {
  try {
    await ensureFirebase();
    await db.collection(COL_LOGS).add({
      data: new Date().toISOString(),
      usuario: usuario || "sistema",
      acao: acao || ""
    });
  } catch (e) {
    console.warn("Falha ao registrar log:", e);
  }
}

// ================== FUNÇÕES DE LISTAS ==================
function legacyToCols(item) {
  if (!item) return [false, false, false];
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
  try {
    await ensureFirebase();
  } catch (e) {
    console.error("Erro ao iniciar Firebase:", e);
    return;
  }

  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) {
    console.warn("Elementos #listaCocBody ou #theadRow não encontrados na página.");
    return;
  }

  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  const snap = await ref.get();
  let dados = [];
  if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length > 0) {
    dados = snap.data().nomes;
  } else {
    dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false, false, false], data: new Date().toISOString() }));
    await ref.set({ nomes: dados });
  }

  const colCount = Math.max(3, ...dados.map(x => legacyToCols(x).length));
  theadRow.innerHTML = '<th>Nome</th>' + Array.from({ length: colCount }, (_, i) => `<th>${i + 1}</th>`).join('');
  tbody.innerHTML = '';

  dados.forEach(item => {
    const cols = ensureColsLength(legacyToCols(item), colCount);
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td'); tdNome.textContent = item.nome; tdNome.className = 'nome'; tr.appendChild(tdNome);
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
  try {
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
    logConsole(`💾 Lista salva: ${nomeLista} (${dados.length} itens)`, "color:#00ffcc");
  } catch (e) {
    console.error("Erro ao salvar lista:", e);
  }
}

// ================== LIMPEZA E EXPANSÃO ==================
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  if (linhas.length === 0) return;

  // Detecta colunas totalmente marcadas
  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row => {
    for (let i = 1; i <= colCount; i++) {
      const chk = row.cells[i].querySelector('input');
      if (!chk.checked) colunasCheias[i - 1] = false;
    }
  });

  // Limpa as colunas que estiverem 100% marcadas (não remove nomes)
  colunasCheias.forEach((preenchida, idx) => {
    if (preenchida) {
      linhas.forEach(row => {
        const chk = row.cells[idx + 1].querySelector('input');
        if (chk) chk.checked = false;
      });
      logConsole(`🧹 Coluna ${idx + 1} limpa automaticamente (todas marcadas).`, "color:#ffaa00");
      registrarLog("SYSTEM", `Coluna ${idx+1} limpa automaticamente em ${nomeLista}`);
    }
  });

  // Se a última coluna estava cheia -> cria nova coluna à direita
  if (colunasCheias[colCount - 1]) {
    const novaCol = colCount + 1;
    const th = document.createElement('th'); th.textContent = String(novaCol); theadRow.appendChild(th);
    linhas.forEach(row => {
      const td = document.createElement('td');
      const chk = document.createElement('input'); chk.type = 'checkbox';
      chk.addEventListener('change', () => verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });
    logConsole(`🆕 Nova coluna criada: ${novaCol}`, "color:#00ffcc");
    await registrarLog("SYSTEM", `Nova coluna ${novaCol} criada em ${nomeLista}`);
  }

  // Salva o estado atualizado
  await salvarLista(nomeLista);
}

// ================== CADASTRO GLOBAL (adicionar via UI) ==================
async function cadastrarNomeGlobal(novoNome) {
  if (!novoNome || !novoNome.trim()) return;
  const nomeTrim = novoNome.trim();
  await ensureFirebase();
  const listas = ['coc','alma','bau','chama','pena'];

  for (const nomeLista of listas) {
    const ref = db.collection(COL_LISTAS).doc(nomeLista);
    const snap = await ref.get();
    let dados = snap.exists ? (snap.data().nomes || []) : [];
    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : 3)));
    const existe = dados.some(x => x.nome.toLowerCase() === nomeTrim.toLowerCase());
    if (!existe) {
      const novo = { nome: nomeTrim, cols: Array(colCount).fill(false), data: new Date().toISOString() };
      dados.push(novo);
      await ref.set({ nomes: dados });
    }
  }

  await registrarLog("Admin", `Adicionado nome ${nomeTrim} em todas as listas`);
  logConsole(`➕ Nome "${nomeTrim}" adicionado em todas as listas`, "color:#66ffcc");
}

// Wrapper usado pela UI de admin (adicionar.html)
async function adicionarNome() {
  const campo = document.getElementById('novoNome');
  if (!campo) return alert("Elemento #novoNome não encontrado.");
  const nome = campo.value.trim();
  if (!nome) return alert("Digite um nome!");
  await cadastrarNomeGlobal(nome);
  campo.value = "";
  const status = document.getElementById('status');
  if (status) status.textContent = `✅ Nome "${nome}" adicionado com sucesso!`;
}

// ================== EXCLUSÃO ==================
async function excluirNomeEmListas(nome, listas) {
  if (!nome) return;
  await ensureFirebase();
  const tarefas = listas.map(async (nl) => {
    const ref = db.collection(COL_LISTAS).doc(nl);
    const snap = await ref.get();
    if (!snap.exists) return;
    const dados = (snap.data().nomes || []).filter(x => x.nome.toLowerCase() !== nome.toLowerCase());
    await ref.set({ nomes: dados });
    logConsole(`🗑️ ${nome} removido de ${nl}`, "color:#ff6666");
  });
  await Promise.all(tarefas);
  await registrarLog("Admin", `Removido ${nome} de: ${listas.join(', ')}`);
}

// Wrapper para UI remover.html
async function removerNome() {
  const nome = (document.getElementById('nomeRemover')?.value || "").trim();
  if (!nome) return alert('Digite o nome que deseja remover.');
  const checks = [...document.querySelectorAll('.listaChk:checked')].map(c => c.value);
  if (checks.length === 0) return alert('Selecione pelo menos uma lista.');
  await excluirNomeEmListas(nome, checks);
  document.getElementById('nomeRemover').value = "";
  const status = document.getElementById('statusRemover');
  if (status) status.textContent = `✅ Nome "${nome}" removido das listas: ${checks.join(', ')}`;
}

// Exclusão global (todas as listas)
async function excluirNomeGlobal(nome) {
  return excluirNomeEmListas(nome, ['coc','alma','bau','chama','pena']);
}

// ================== CARREGAR / GERENCIAR SENHAS (admin) ==================
async function carregarSenhas() {
  await ensureFirebase();
  const tbody = document.querySelector('#tabelaSenhas tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const snapshot = await db.collection(COL_SENHAS).get();
  snapshot.forEach(doc => {
    const s = doc.data();
    // Não mostrar a master (hash fixa) se por acaso estiver
    if (!s) return;
    if (s.hash === ADMIN_MASTER_HASH) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.nome}</td><td>${s.hash.substring(0,16)}...</td><td><button onclick="excluirSenha('${doc.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}

async function criarSenha(nome, senha) {
  if (!nome || !senha) throw new Error("Nome e senha são obrigatórios.");
  await ensureFirebase();
  const hash = await sha256(senha);
  const id = nome.toLowerCase().replace(/\s+/g, "_");
  await db.collection(COL_SENHAS).doc(id).set({ nome, hash, criado_em: new Date().toISOString() });
  await registrarLog("MASTER", `Senha criada para ${nome}`);
}

async function criarSenhaUI() {
  const nome = (document.getElementById('nomeSenha')?.value || "").trim();
  const senha = (document.getElementById('novaSenha')?.value || "").trim();
  if (!nome || !senha) return alert("Preencha todos os campos.");
  await criarSenha(nome, senha);
  document.getElementById('nomeSenha').value = '';
  document.getElementById('novaSenha').value = '';
  const status = document.getElementById('statusSenha');
  if (status) status.textContent = `✅ Senha criada para ${nome}`;
  carregarSenhas();
}

async function excluirSenha(id) {
  if (!confirm("Deseja excluir esta senha?")) return;
  await ensureFirebase();
  await db.collection(COL_SENHAS).doc(id).delete();
  await registrarLog("MASTER", `Senha ${id} excluída`);
  carregarSenhas();
}

// ================== CONSULTA EM TEMPO REAL ==================
function montarHeaderConsulta(thead, colCount) {
  thead.innerHTML = '<tr><th>Nome</th>' + Array.from({length: colCount}, (_, i) => `<th>${i+1}</th>`).join('') + '</tr>';
}

function montarCorpoConsulta(tbody, dados, colCount) {
  tbody.innerHTML = '';
  dados.forEach(item => {
    const cols = (Array.isArray(item.cols) ? item.cols.slice() : legacyToCols(item));
    while (cols.length < colCount) cols.push(false);
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td'); tdNome.className = 'nome'; tdNome.textContent = item.nome; tr.appendChild(tdNome);
    cols.forEach(v => {
      const td = document.createElement('td'); td.textContent = v ? '✅' : '⛔'; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function escutarListaConsulta(nomeLista, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;
  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  ref.onSnapshot(async (snap) => {
    let dados = [];
    if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length > 0) {
      dados = snap.data().nomes;
    } else {
      // cria padrão e sai (o snapshot seguinte trará os dados)
      dados = NOMES_INICIAIS.map(n => ({ nome: n, cols: [false,false,false], data: new Date().toISOString() }));
      await ref.set({ nomes: dados });
      return;
    }
    const colCount = Math.max(3, ...dados.map(x => (Array.isArray(x.cols) ? x.cols.length : legacyToCols(x).length)));
    montarHeaderConsulta(thead, colCount);
    montarCorpoConsulta(tbody, dados, colCount);
  }, (err) => {
    console.error(`[consulta] erro em ${nomeLista}:`, err);
  });
}

// ================== BACKUPS AUTOMÁTICOS ==================
async function executarBackupAutomatizado() {
  try {
    await ensureFirebase();
    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();

    // Janela para executar (13:30-13:34) ou (21:30-21:34)
    const deveExecutar = (hora === 13 && minuto >= 30 && minuto < 35) || (hora === 21 && minuto >= 30 && minuto < 35);
    if (!deveExecutar) return;

    logConsole(`🕒 Iniciando backup automático: ${agora.toLocaleString()}`, "color:#00ffcc");
    const colecoes = ['coc','alma','bau','chama','pena'];
    const conteudo = {};
    let total = 0;
    for (const nome of colecoes) {
      const snap = await db.collection(COL_LISTAS).doc(nome).get();
      conteudo[nome] = snap.exists ? snap.data().nomes : [];
      total += conteudo[nome].length;
    }

    await db.collection(COL_BACKUPS).add({
      data: new Date().toISOString(),
      totalNomes: total,
      conteudo,
      tipo: "automático"
    });

    await registrarLog("MASTER_AUTOMÁTICO", `Backup automático executado (${total} registros)`);
    logConsole("💾 Backup automático concluído!", "color:#00ffcc");
  } catch (e) {
    console.error("Erro no backup automático:", e);
    await registrarLog("ERRO", `Falha no backup automático: ${e.message || e}`);
  }
}

// Roda verificação a cada 5 minutos
setInterval(() => {
  try { executarBackupAutomatizado(); } catch (e) { console.error(e); }
}, 300000);

// ================== UTILIDADES ADICIONAIS ==================
async function obterTodosNomesBase() {
  await ensureFirebase();
  const ref = db.collection(COL_LISTAS).doc('coc');
  const snap = await ref.get();
  if (snap.exists) return (snap.data().nomes || []).map(x => x.nome);
  const dados = NOMES_INICIAIS.map(n => ({ nome:n, cols:[false,false,false], data:new Date().toISOString() }));
  await ref.set({ nomes: dados });
  return dados.map(x => x.nome);
}

// ================== EXPORTAR AS FUNÇÕES GLOBAIS (para uso direto em HTML) ==================
window.loginAdmin = loginAdmin;
window.requireAdminOrRedirect = requireAdminOrRedirect;
window.requireMasterOrRedirect = requireMasterOrRedirect;
window.carregarLista = carregarLista;
window.salvarLista = salvarLista;
window.cadastrarNomeGlobal = cadastrarNomeGlobal;
window.adicionarNome = adicionarNome;
window.excluirNomeGlobal = excluirNomeGlobal;
window.removerNome = removerNome;
window.carregarSenhas = carregarSenhas;
window.criarSenhaUI = criarSenhaUI;
window.excluirSenha = excluirSenha;
window.escutarListaConsulta = escutarListaConsulta;
window.executarBackupAutomatizado = executarBackupAutomatizado;
window.verificarLimpeza = verificarLimpeza;

logConsole("🦇 script.js carregado — DarkEpoch v2025.10.31", "color:#00ffcc; font-weight:bold;");
