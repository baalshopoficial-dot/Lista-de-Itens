// ================ DARK EPOCH SYSTEM v2025.11 ================

// Hashes (MASTER e ADMIN)
const ADMIN_HASH = "18b68013caff50520c9706a2b96b2370f8fe3cc5be15db5dca5324bf48d52a77"; // D3v1L2Br
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf

// Coleções Firestore
const COL_LISTAS = "listas_epoch";
const COL_SENHAS = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS = "logs_actions";

let db = null;

// ================== Utilitárias ==================
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function logConsole(msg, style=""){ style?console.log(`%c${msg}`,style):console.log(msg); }
async function ensureFirebase(){
  if (typeof firebase === "undefined") throw new Error("Firebase SDK não carregado.");
  if (!firebase.apps.length) throw new Error("Firebase não inicializado nesta página.");
  if (!db) db = firebase.firestore();
  return db;
}

// ================== Login ==================
async function loginAdmin() {
  const senha = (document.getElementById("adminPassword")?.value || "").trim();
  const statusEl = document.getElementById("loginStatus");
  if (!statusEl) return;
  if (!senha){ statusEl.textContent = "⚠️ Digite sua senha."; return; }

  const hash = await sha256(senha);
  await ensureFirebase();

  // Master
  if (hash === ADMIN_MASTER_HASH){
    localStorage.setItem("isAdmin","true");
    localStorage.setItem("isMaster","true");
    statusEl.textContent = "🦇 Acesso MASTER concedido!";
    await registrarLog("MASTER","Login master");
    setTimeout(()=>location.href="menu.html",800);
    return;
  }

  // Admin padrão
  if (hash === ADMIN_HASH){
    localStorage.setItem("isAdmin","true");
    localStorage.removeItem("isMaster");
    statusEl.textContent = "✅ Acesso ADMIN autorizado.";
    await registrarLog("ADMIN","Login admin hash");
    setTimeout(()=>location.href="menu.html",800);
    return;
  }

  // Senhas adicionais no Firestore
  const snap = await db.collection(COL_SENHAS).get();
  let ok = false;
  snap.forEach(doc=>{
    const d = doc.data();
    if (d.hash === hash){
      ok = true;
      localStorage.setItem("isAdmin","true");
      localStorage.removeItem("isMaster");
      localStorage.setItem("usuario", d.nome || "Usuario");
    }
  });
  if (ok){
    statusEl.textContent = "✅ Acesso autorizado.";
    await registrarLog(localStorage.getItem("usuario")||"USU","Login custom");
    setTimeout(()=>location.href="menu.html",800);
  }else{
    statusEl.textContent = "❌ Senha incorreta.";
  }
}

// ================== Guardas ==================
function requireAdminOrRedirect(){
  if (localStorage.getItem("isAdmin") !== "true"){
    alert("Acesso restrito — faça login.");
    location.href="../index.html";
  }
}
function requireMasterOrRedirect(){
  if (localStorage.getItem("isAdmin") !== "true"){
    alert("Acesso restrito — faça login.");
    location.href="../index.html";
    return;
  }
  if (localStorage.getItem("isMaster") !== "true"){
    alert("Apenas MASTER.");
    location.href="../menu.html";
  }
}

// ================== Logs ==================
async function registrarLog(usuario, acao){
  try{
    await ensureFirebase();
    await db.collection(COL_LOGS).add({ data:new Date().toISOString(), usuario, acao });
  }catch(e){ console.warn("log fail:", e); }
}

// ================== Nomes padrão ==================
const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

// ================== Listas (carregar/salvar) ==================
async function carregarLista(nomeLista){
  await ensureFirebase();
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  const snap = await ref.get();
  if (!snap.exists){ console.warn(`⚠️ Lista ${nomeLista} não encontrada.`); return; }

  const dados = snap.data().nomes || [];
  if (dados.length === 0){ console.warn(`⚠️ Lista ${nomeLista} vazia.`); return; }

  const colCount = Math.max(3, ...dados.map(x => Array.isArray(x.cols)? x.cols.length: 3));
  theadRow.innerHTML = '<th>Nome</th>'+Array.from({length:colCount},(_,i)=>`<th>${i+1}</th>`).join('');
  tbody.innerHTML = '';

  dados.forEach(item=>{
    const cols = Array.isArray(item.cols)? item.cols : [false,false,false];
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td'); tdNome.textContent=item.nome; tdNome.className='nome'; tr.appendChild(tdNome);
    cols.forEach(v=>{
      const td = document.createElement('td');
      const chk = document.createElement('input'); chk.type='checkbox'; chk.checked=!!v;
      chk.addEventListener('change', ()=>verificarLimpeza(nomeLista));
      td.appendChild(chk); tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  console.log(`✅ ${nomeLista} carregada (${dados.length} itens)`);
}

async function salvarLista(nomeLista){
  await ensureFirebase();
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  const dados = linhas.map(row=>{
    const nome = row.cells[0].textContent;
    const cols = [];
    for(let i=1;i<=colCount;i++) cols.push(!!row.cells[i].querySelector('input').checked);
    return { nome, cols, data:new Date().toISOString() };
  });
  await db.collection(COL_LISTAS).doc(nomeLista).set({nomes:dados});
  await registrarLog("ADMIN", `Salvar lista ${nomeLista} (${dados.length})`);
}

// ================== Limpeza e expansão ==================
async function verificarLimpeza(nomeLista){
  const tbody = document.getElementById('listaCocBody');
  const theadRow = document.getElementById('theadRow');
  if (!tbody || !theadRow) return;

  const colCount = theadRow.cells.length - 1;
  const linhas = [...tbody.querySelectorAll('tr')];
  if (!linhas.length) return;

  // coluna cheia => limpa
  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row=>{
    for(let i=1;i<=colCount;i++){
      if (!row.cells[i].querySelector('input').checked) colunasCheias[i-1] = false;
    }
  });

  colunasCheias.forEach((full, idx)=>{
    if(full){
      linhas.forEach(row=>{
        const chk=row.cells[idx+1].querySelector('input');
        if (chk) chk.checked=false;
      });
      registrarLog("SYSTEM", `Coluna ${idx+1} limpa em ${nomeLista}`);
    }
  });

  // Se última estava cheia, cria nova
  if (colunasCheias[colCount-1]){
    const nova = colCount+1;
    const th = document.createElement('th'); th.textContent = String(nova); theadRow.appendChild(th);
    linhas.forEach(row=>{
      const td=document.createElement('td');
      const chk=document.createElement('input'); chk.type='checkbox';
      chk.addEventListener('change', ()=>verificarLimpeza(nomeLista));
      td.appendChild(chk);
      row.appendChild(td);
    });
    registrarLog("SYSTEM", `Nova coluna ${nova} criada em ${nomeLista}`);
  }

  await salvarLista(nomeLista);
}

// ================== Admin: adicionar / remover ==================
async function cadastrarNomeGlobal(novoNome){
  if (!novoNome || !novoNome.trim()) return;
  await ensureFirebase();
  const nome = novoNome.trim();
  const listas = ['coc','alma','bau','chama','pena'];

  for (const nl of listas){
    const ref = db.collection(COL_LISTAS).doc(nl);
    const snap = await ref.get();
    let dados = snap.exists ? (snap.data().nomes || []) : [];
    const colCount = Math.max(3, ...dados.map(x => Array.isArray(x.cols)? x.cols.length : 3));
    const exists = dados.some(x => (x.nome||"").toLowerCase() === nome.toLowerCase());
    if (!exists){
      dados.push({ nome, cols:Array(colCount).fill(false), data:new Date().toISOString() });
      await ref.set({nomes:dados});
    }
  }
  await registrarLog(localStorage.getItem("usuario")||"ADMIN", `Adicionar nome "${nome}" (global)`);
}

async function adicionarNome(){
  const el = document.getElementById('novoNome');
  if (!el) return alert("Campo não encontrado.");
  const nome = el.value.trim();
  if (!nome) return alert("Digite um nome.");
  await cadastrarNomeGlobal(nome);
  el.value = "";
  const st = document.getElementById('status'); if (st) st.textContent = `✅ "${nome}" adicionado.`;
}

async function excluirNomeEmListas(nome, listas){
  await ensureFirebase();
  const alvo = nome.trim();
  const tasks = listas.map(async (nl)=>{
    const ref = db.collection(COL_LISTAS).doc(nl);
    const snap = await ref.get();
    if (!snap.exists) return;
    const dados = (snap.data().nomes || []).filter(x => (x.nome||"").toLowerCase() !== alvo.toLowerCase());
    await ref.set({nomes:dados});
  });
  await Promise.all(tasks);
  await registrarLog(localStorage.getItem("usuario")||"ADMIN", `Remover "${alvo}" de: ${listas.join(',')}`);
}

async function removerNome(){
  const nome = (document.getElementById('nomeRemover')?.value || "").trim();
  if (!nome) return alert("Digite o nome.");
  const listas = [...document.querySelectorAll('.listaChk:checked')].map(c=>c.value);
  if (!listas.length) return alert("Selecione pelo menos uma lista.");
  await excluirNomeEmListas(nome, listas);
  const st = document.getElementById('statusRemover'); if (st) st.textContent = `✅ "${nome}" removido de: ${listas.join(', ')}`;
  document.getElementById('nomeRemover').value = "";
}

// ================== Gerenciar Senhas ==================
async function carregarSenhas(){
  await ensureFirebase();
  const tbody = document.querySelector('#tabelaSenhas tbody'); if (!tbody) return;
  tbody.innerHTML="";
  const snap = await db.collection(COL_SENHAS).get();
  snap.forEach(doc=>{
    const s=doc.data();
    if (!s) return;
    if (s.hash === ADMIN_MASTER_HASH) return; // nunca lista master
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${s.nome}</td><td>${(s.hash||'').slice(0,16)}...</td>
      <td><button onclick="excluirSenha('${doc.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}

async function criarSenha(nome, senha){
  await ensureFirebase();
  const hash = await sha256(senha);
  const id = nome.toLowerCase().replace(/\s+/g,'_');
  await db.collection(COL_SENHAS).doc(id).set({nome, hash, criado_em:new Date().toISOString()});
  await registrarLog("MASTER", `Criar senha ${nome}`);
}
async function criarSenhaUI(){
  const n = (document.getElementById('nomeSenha')?.value || "").trim();
  const s = (document.getElementById('novaSenha')?.value || "").trim();
  if (!n || !s) return alert("Preencha nome e senha.");
  await criarSenha(n, s);
  document.getElementById('nomeSenha').value="";
  document.getElementById('novaSenha').value="";
  const st=document.getElementById('statusSenha'); if (st) st.textContent=`✅ Senha criada para ${n}`;
  carregarSenhas();
}
async function excluirSenha(id){
  if (!confirm("Excluir esta senha?")) return;
  await ensureFirebase();
  await db.collection(COL_SENHAS).doc(id).delete();
  await registrarLog("MASTER", `Excluir senha ${id}`);
  carregarSenhas();
}

// ================== Consulta (realtime) ==================
function montarHeaderConsulta(thead, colCount){
  thead.innerHTML = `<tr><th>Nome</th>${Array.from({length:colCount},(_,i)=>`<th>${i+1}</th>`).join('')}</tr>`;
}
function montarCorpoConsulta(tbody, dados, colCount){
  tbody.innerHTML="";
  dados.forEach(item=>{
    const cols = Array.isArray(item.cols)? item.cols.slice() : [false,false,false];
    while (cols.length<colCount) cols.push(false);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="nome">${item.nome}</td>` + cols.map(v=>`<td>${v?'✅':'⛔'}</td>`).join('');
    tbody.appendChild(tr);
  });
}
function escutarListaConsulta(nomeLista, theadId, tbodyId){
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;
  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  ref.onSnapshot(async (snap)=>{
    if (!snap.exists){ console.warn("lista ausente",nomeLista); return; }
    const dados = snap.data().nomes || [];
    const colCount = Math.max(3, ...dados.map(x=>Array.isArray(x.cols)?x.cols.length:3));
    montarHeaderConsulta(thead, colCount);
    montarCorpoConsulta(tbody, dados, colCount);
  }, err=>console.error("[consulta]",err));
}

// ================== Backups automáticos ==================
async function executarBackupAutomatizado(){
  try{
    await ensureFirebase();
    const now = new Date(); const h=now.getHours(), m=now.getMinutes();
    const janela = (h===13 && m>=30 && m<35) || (h===21 && m>=30 && m<35);
    if (!janela) return;

    const listas=['coc','alma','bau','chama','pena'];
    const conteudo={}; let total=0;
    for (const l of listas){
      const doc = await db.collection(COL_LISTAS).doc(l).get();
      conteudo[l] = doc.exists ? (doc.data().nomes || []) : [];
      total += conteudo[l].length;
    }
    await db.collection(COL_BACKUPS).add({data:new Date().toISOString(),totalNomes:total,conteudo,tipo:"automático"});
    await registrarLog("SYSTEM","Backup automático concluído");
  }catch(e){
    console.error("backup auto:",e);
    await registrarLog("ERRO","Falha backup automático");
  }
}
setInterval(()=>{ try{ executarBackupAutomatizado(); }catch(e){} }, 300000);

// ================== Exports globais ==================
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

logConsole("🦇 script.js carregado — DarkEpoch v2025.11", "color:#00ffcc;font-weight:bold;");
