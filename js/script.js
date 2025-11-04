// ================== CONFIG ==================
const ADMIN_HASH = "18b68013caff50520c9706a2b96b2370f8fe3cc5be15db5dca5324bf48d52a77"; // D3v1L2Br
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a"; // cp1115bupnf

const COL_LISTAS = "listas_epoch";
const COL_SENHAS = "senhas_epoch";
const COL_BACKUPS = "backups_listas";
const COL_LOGS = "logs_actions";

const NOMES_INICIAIS = [
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

let db = null;

// ================== UTILS ==================
async function sha256(message){
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}
async function ensureFirebase(){
  if (typeof firebase === "undefined") throw new Error("Firebase SDK não carregado.");
  if (!firebase.apps.length) throw new Error("Firebase App não inicializado nesta página.");
  if (!db) db = firebase.firestore();
  return db;
}
function logConsole(msg, style=""){ style?console.log(`%c${msg}`,style):console.log(msg); }

// ================== LOGIN (apenas senha) ==================
async function loginAdmin(){
  const input = (document.getElementById("adminPassword")?.value || "").trim();
  const statusEl = document.getElementById("loginStatus");
  try{ await ensureFirebase(); }catch(e){ alert("⚠️ Firebase não inicializado na página."); return; }
  if (!statusEl) { alert("Elemento #loginStatus ausente."); return; }
  if (!input) { statusEl.textContent = "⚠️ Digite a senha."; return; }

  const hash = await sha256(input);

  // MASTER
  if (hash === ADMIN_MASTER_HASH){
    localStorage.setItem("isAdmin","true");
    localStorage.setItem("isMaster","true");
    statusEl.textContent = "🦇 Acesso MASTER concedido!";
    await registrarLog("MASTER","Login MASTER (hash local)");
    setTimeout(()=>location.href="menu.html", 600);
    return;
  }
  // ADMIN padrão
  if (hash === ADMIN_HASH){
    localStorage.setItem("isAdmin","true");
    localStorage.removeItem("isMaster");
    statusEl.textContent = "✅ Acesso ADMIN concedido!";
    await registrarLog("ADMIN","Login ADMIN (hash local)");
    setTimeout(()=>location.href="menu.html", 600);
    return;
  }
  // Senhas extras no Firestore
  try{
    const snap = await db.collection(COL_SENHAS).get();
    let ok = false;
    snap.forEach(doc=>{
      const d = doc.data();
      if (d && d.hash === hash) ok = true;
    });
    if (ok){
      localStorage.setItem("isAdmin","true");
      localStorage.removeItem("isMaster");
      statusEl.textContent = "✅ Acesso liberado!";
      await registrarLog("ADMIN","Login por senha do Firestore");
      setTimeout(()=>location.href="menu.html", 600);
    } else {
      statusEl.textContent = "❌ Senha incorreta.";
    }
  }catch(e){
    console.error(e);
    statusEl.textContent = "⚠️ Erro ao verificar senha no servidor.";
  }
}
function requireAdminOrRedirect(){
  if (localStorage.getItem("isAdmin") !== "true"){
    alert("Acesso restrito — faça login.");
    location.href = "../index.html";
  }
}
function requireMasterOrRedirect(){
  const isAdmin = localStorage.getItem("isAdmin")==="true";
  const isMaster = localStorage.getItem("isMaster")==="true";
  if (!isAdmin) return location.href="../index.html";
  if (!isMaster){ alert("Apenas MASTER."); location.href="../menu.html"; }
}

// ================== LOGS ==================
async function registrarLog(usuario, acao){
  try{ await ensureFirebase(); await db.collection(COL_LOGS).add({
    data:new Date().toISOString(), usuario:usuario||"sistema", acao:acao||""
  }); }catch(e){ console.warn("log fail:", e); }
}

// ================== LISTAS ==================
function legacyToCols(item){
  if (!item) return [false,false,false];
  if (Array.isArray(item.cols)) return item.cols;
  const a=[]; for(let i=1;i<=3;i++) a.push(!!item['col'+i]); return a;
}
function ensureColsLength(cols, len){ const out=cols.slice(); while(out.length<len) out.push(false); return out; }

async function carregarLista(nomeLista){
  await ensureFirebase();
  const tbody = document.getElementById("listaCocBody");
  const theadRow = document.getElementById("theadRow");
  if (!tbody || !theadRow) return;

  const ref = db.collection(COL_LISTAS).doc(nomeLista);
  const snap = await ref.get();
  let dados=[];
  if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length>0){
    dados = snap.data().nomes;
  } else {
    dados = NOMES_INICIAIS.map(n=>({nome:n, cols:[false,false,false], data:new Date().toISOString()}));
    await ref.set({nomes:dados});
  }

  const colCount = Math.max(3, ...dados.map(x=>legacyToCols(x).length));
  theadRow.innerHTML = '<th>Nome</th>' + Array.from({length: colCount}, (_,i)=>`<th>${i+1}</th>`).join('');
  tbody.innerHTML = '';

  dados.forEach(item=>{
    const cols = ensureColsLength(legacyToCols(item), colCount);
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td"); tdNome.textContent = item.nome; tdNome.className = "nome"; tr.appendChild(tdNome);
    cols.forEach((v,i)=>{
      const td=document.createElement("td");
      const chk=document.createElement("input"); chk.type="checkbox"; chk.checked=!!v;
      chk.addEventListener("change",()=>verificarLimpeza(nomeLista));
      td.appendChild(chk); tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
async function salvarLista(nomeLista){
  await ensureFirebase();
  const tbody=document.getElementById("listaCocBody");
  const theadRow=document.getElementById("theadRow");
  if (!tbody||!theadRow) return;
  const colCount = theadRow.cells.length-1;
  const linhas=[...tbody.querySelectorAll("tr")];
  const dados = linhas.map(row=>{
    const nome=row.cells[0].textContent;
    const cols=[]; for(let i=1;i<=colCount;i++) cols.push(!!row.cells[i].querySelector("input").checked);
    return {nome, cols, data:new Date().toISOString()};
  });
  await db.collection(COL_LISTAS).doc(nomeLista).set({nomes:dados});
  await registrarLog("ADMIN",`Lista ${nomeLista.toUpperCase()} salva (${dados.length} itens)`);
}
async function verificarLimpeza(nomeLista){
  const tbody=document.getElementById("listaCocBody");
  const theadRow=document.getElementById("theadRow");
  if (!tbody||!theadRow) return;
  const colCount=theadRow.cells.length-1;
  const linhas=[...tbody.querySelectorAll("tr")];
  if (!linhas.length) return;

  let colunasCheias = Array(colCount).fill(true);
  linhas.forEach(row=>{
    for(let i=1;i<=colCount;i++){
      const chk=row.cells[i].querySelector("input");
      if (!chk.checked) colunasCheias[i-1]=false;
    }
  });

  // limpa colunas completas (sem remover nomes)
  colunasCheias.forEach((full,idx)=>{
    if (full){
      linhas.forEach(row=>{
        const chk=row.cells[idx+1].querySelector("input");
        if (chk) chk.checked=false;
      });
      registrarLog("SYSTEM",`Coluna ${idx+1} limpa (${nomeLista})`);
    }
  });

  // se última coluna estava cheia -> cria nova coluna
  if (colunasCheias[colCount-1]){
    const nova = colCount+1;
    const th=document.createElement("th"); th.textContent=String(nova); theadRow.appendChild(th);
    linhas.forEach(row=>{
      const td=document.createElement("td");
      const chk=document.createElement("input"); chk.type="checkbox";
      chk.addEventListener("change",()=>verificarLimpeza(nomeLista));
      td.appendChild(chk); row.appendChild(td);
    });
    registrarLog("SYSTEM",`Nova coluna ${nova} criada (${nomeLista})`);
  }

  await salvarLista(nomeLista);
}

// ===== add/remove nomes (global) =====
async function cadastrarNomeGlobal(novoNome){
  if (!novoNome||!novoNome.trim()) return;
  await ensureFirebase();
  const nome=novoNome.trim();
  const listas=['coc','alma','bau','chama','pena'];
  for (const L of listas){
    const ref=db.collection(COL_LISTAS).doc(L);
    const snap=await ref.get();
    let dados=snap.exists?(snap.data().nomes||[]):[];
    const colCount=Math.max(3, ...dados.map(x=>Array.isArray(x.cols)?x.cols.length:3));
    if (!dados.some(x=>x.nome.toLowerCase()===nome.toLowerCase())){
      dados.push({nome, cols:Array(colCount).fill(false), data:new Date().toISOString()});
      await ref.set({nomes:dados});
    }
  }
  await registrarLog("ADMIN",`Adicionado nome ${nome} em todas as listas`);
}
async function excluirNomeEmListas(nome, listas){
  if (!nome) return;
  await ensureFirebase();
  await Promise.all(listas.map(async L=>{
    const ref=db.collection(COL_LISTAS).doc(L);
    const snap=await ref.get(); if (!snap.exists) return;
    const dados=(snap.data().nomes||[]).filter(x=>x.nome.toLowerCase()!==nome.toLowerCase());
    await ref.set({nomes:dados});
  }));
  await registrarLog("ADMIN",`Removido ${nome} de: ${listas.join(", ")}`);
}
async function excluirNomeGlobal(nome){
  return excluirNomeEmListas(nome, ['coc','alma','bau','chama','pena']);
}

// ===== senhas (master only via UI) =====
async function carregarSenhas(){
  await ensureFirebase();
  const tbody=document.querySelector('#tabelaSenhas tbody');
  if (!tbody) return;
  tbody.innerHTML='';
  const snap=await db.collection(COL_SENHAS).get();
  snap.forEach(doc=>{
    const s=doc.data(); if (!s) return;
    if (s.hash===ADMIN_MASTER_HASH) return; // nunca lista a master
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${s.nome}</td><td>${s.hash.substring(0,16)}...</td>
      <td><button class="btn" onclick="excluirSenha('${doc.id}')">🗑️</button></td>`;
    tbody.appendChild(tr);
  });
}
async function criarSenha(nome, senha){
  if (!nome||!senha) throw new Error("Nome e senha obrigatórios.");
  await ensureFirebase();
  const hash=await sha256(senha);
  const id=nome.toLowerCase().replace(/\s+/g,"_");
  await db.collection(COL_SENHAS).doc(id).set({nome, hash, criado_em:new Date().toISOString()});
  await registrarLog("MASTER",`Senha criada para ${nome}`);
}
async function criarSenhaUI(){
  const nome=(document.getElementById('nomeSenha')?.value||"").trim();
  const senha=(document.getElementById('novaSenha')?.value||"").trim();
  if (!nome||!senha) return alert("Preencha todos os campos.");
  await criarSenha(nome, senha);
  document.getElementById('nomeSenha').value='';
  document.getElementById('novaSenha').value='';
  const st=document.getElementById('statusSenha'); if (st) st.textContent=`✅ Senha criada para ${nome}`;
  carregarSenhas();
}
async function excluirSenha(id){
  if (!confirm("Excluir esta senha?")) return;
  await ensureFirebase();
  await db.collection(COL_SENHAS).doc(id).delete();
  await registrarLog("MASTER",`Senha ${id} excluída`);
  carregarSenhas();
}

// ===== consulta em tempo real =====
function montarHeaderConsulta(thead, colCount){
  thead.innerHTML='<tr><th>Nome</th>'+Array.from({length:colCount},(_,i)=>`<th>${i+1}</th>`).join('')+'</tr>';
}
function montarCorpoConsulta(tbody,dados,colCount){
  tbody.innerHTML='';
  dados.forEach(item=>{
    const cols=Array.isArray(item.cols)?item.cols.slice():legacyToCols(item);
    while (cols.length<colCount) cols.push(false);
    const tr=document.createElement('tr');
    const tdNome=document.createElement('td'); tdNome.className='nome'; tdNome.textContent=item.nome; tr.appendChild(tdNome);
    cols.forEach(v=>{ const td=document.createElement('td'); td.textContent=v?'✅':'⛔'; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
}
function escutarListaConsulta(nomeLista, theadId, tbodyId){
  const thead=document.getElementById(theadId);
  const tbody=document.getElementById(tbodyId);
  if (!thead||!tbody) return;
  const ref=db.collection(COL_LISTAS).doc(nomeLista);
  ref.onSnapshot(async snap=>{
    let dados=[];
    if (snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length>0){
      dados=snap.data().nomes;
    } else {
      dados=NOMES_INICIAIS.map(n=>({nome:n, cols:[false,false,false], data:new Date().toISOString()}));
      await ref.set({nomes:dados}); return;
    }
    const colCount=Math.max(3, ...dados.map(x=>Array.isArray(x.cols)?x.cols.length:legacyToCols(x).length));
    montarHeaderConsulta(thead,colCount);
    montarCorpoConsulta(tbody,dados,colCount);
  }, err=>console.error(`[consulta] ${nomeLista}:`,err));
}

// ===== backups automáticos (13:30 e 21:30) =====
async function executarBackupAutomatizado(){
  try{
    await ensureFirebase();
    const now=new Date(), h=now.getHours(), m=now.getMinutes();
    const janela = (h===13 && m>=30 && m<35) || (h===21 && m>=30 && m<35);
    if (!janela) return;
    const nomesDocs=['coc','alma','bau','chama','pena'];
    const conteudo={}; let total=0;
    for (const n of nomesDocs){
      const snap=await db.collection(COL_LISTAS).doc(n).get();
      conteudo[n]=snap.exists ? (snap.data().nomes||[]) : [];
      total += conteudo[n].length;
    }
    await db.collection(COL_BACKUPS).add({data:new Date().toISOString(), totalNomes:total, conteudo, tipo:"automático"});
    await registrarLog("SYSTEM","Backup automático executado ("+total+" registros)");
  }catch(e){
    console.error("Backup falhou:",e);
    await registrarLog("ERRO","Falha no backup: "+(e.message||e));
  }
}
setInterval(()=>{ try{executarBackupAutomatizado();}catch(e){} }, 300000);

// ===== exports globais =====
window.loginAdmin=loginAdmin;
window.requireAdminOrRedirect=requireAdminOrRedirect;
window.requireMasterOrRedirect=requireMasterOrRedirect;
window.carregarLista=carregarLista;
window.salvarLista=salvarLista;
window.verificarLimpeza=verificarLimpeza;
window.cadastrarNomeGlobal=cadastrarNomeGlobal;
window.excluirNomeGlobal=excluirNomeGlobal;
window.excluirNomeEmListas=excluirNomeEmListas;
window.carregarSenhas=carregarSenhas;
window.criarSenhaUI=criarSenhaUI;
window.excluirSenha=excluirSenha;
window.escutarListaConsulta=escutarListaConsulta;
window.executarBackupAutomatizado=executarBackupAutomatizado;

console.log("🦇 script.js carregado — DarkEpoch (senha-only) v2025.11");
