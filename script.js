
const ADMIN_HASH = "43ff7c9877b03130544a7db8506a019571a1b34d4b5879d85c1583f8bf94dfaa";
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

function glowOk(){ const card=document.getElementById('loginCard'); if(card){ card.classList.add('glow-ok'); setTimeout(()=>card.classList.remove('glow-ok'), 1400);} }

async function sha256(message){
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function loginAdmin(){
  const input = document.getElementById('adminPassword').value||'';
  const hash = await sha256(input);
  const status = document.getElementById('loginStatus');
  if(hash===ADMIN_HASH){
    localStorage.setItem('isAdmin','true');
    status.textContent='✅ Acesso permitido!';
    glowOk();
    await ensureFirebase();
    setTimeout(()=>window.location.href='menu.html',800);
  } else {
    status.textContent='❌ Senha incorreta!';
  }
}

async function ensureFirebase(){
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if(!db) db=firebase.firestore();
  return db;
}

const NOMES_INICIAIS=[
  "HodgeNelly","ValdezDevin","CrxZzyBR","Hellow","Cilla","Felps",
  "Sarada","TannerJosea","FuraBuxo","YatesMucel","PHARAOH","MalignaRT",
  "AnuBis","LuchadorDeLuz","WileyKayla","MathisPell","Espadakon",
  "Sylvannas","Numb","Solus","Chele","apollyon","lady","caramelo","glenmore"
];

async function carregarLista(nomeLista){
  await ensureFirebase();
  const tbody=document.getElementById('listaCocBody'); if(!tbody) return;
  tbody.innerHTML='';

  const ref=db.collection('listas_epoch').doc(nomeLista);
  const snap=await ref.get();
  let dados=[];
  if(snap.exists && Array.isArray(snap.data().nomes) && snap.data().nomes.length>0){
    dados=snap.data().nomes;
  } else {
    dados=NOMES_INICIAIS.map(n=>({nome:n,col1:false,col2:false,col3:false,data:new Date().toISOString()}));
    await ref.set({nomes:dados});
  }

  dados.forEach(item=>{
    const tr=document.createElement('tr');
    const tdNome=document.createElement('td'); tdNome.textContent=item.nome; tr.appendChild(tdNome);
    for(let i=1;i<=3;i++){
      const td=document.createElement('td');
      const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=!!item['col'+i];
      chk.addEventListener('change',()=>verificarLimpeza(nomeLista));
      td.appendChild(chk); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

async function salvarLista(nomeLista){
  await ensureFirebase();
  const tbody=document.getElementById('listaCocBody');
  const linhas=[...tbody.querySelectorAll('tr')];
  const dados=linhas.map(row=>({ 
    nome: row.cells[0].textContent,
    col1: row.cells[1].querySelector('input').checked,
    col2: row.cells[2].querySelector('input').checked,
    col3: row.cells[3].querySelector('input').checked,
    data: new Date().toISOString()
  }));
  await db.collection('listas_epoch').doc(nomeLista).set({nomes:dados});
  alert('💾 Lista salva com sucesso!');
}

async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const linhas = [...tbody.querySelectorAll("tr")];
  let colunasCheias = [true, true, true];

  // ⚙️ Removei a parte que excluía as linhas:
  // linhas.forEach(row => {
  //   const checks = [...row.querySelectorAll("input")];
  //   if (checks.every(c => c.checked)) row.remove();
  // });

  // Verifica se cada coluna está 100% preenchida
  linhas.forEach(row => {
    const checks = [...row.querySelectorAll("input")];
    checks.forEach((c, i) => { if (!c.checked) colunasCheias[i] = false; });
  });

  // Se todas as linhas de uma coluna estiverem marcadas, limpa só aquela coluna
  colunasCheias.forEach((full, i) => {
    if (full) {
      linhas.forEach(row => {
        const chk = row.cells[i + 1]?.querySelector("input");
        if (chk) chk.checked = false;
      });
    }
  });

  await salvarLista(nomeLista);
}
async function verificarLimpeza(nomeLista) {
  const tbody = document.getElementById("listaCocBody");
  const linhas = [...tbody.querySelectorAll("tr")];
  let colunasCheias = [true, true, true];

  // ⚙️ Removei a parte que excluía as linhas:
  // linhas.forEach(row => {
  //   const checks = [...row.querySelectorAll("input")];
  //   if (checks.every(c => c.checked)) row.remove();
  // });

  // Verifica se cada coluna está 100% preenchida
  linhas.forEach(row => {
    const checks = [...row.querySelectorAll("input")];
    checks.forEach((c, i) => { if (!c.checked) colunasCheias[i] = false; });
  });

  // Se todas as linhas de uma coluna estiverem marcadas, limpa só aquela coluna
  colunasCheias.forEach((full, i) => {
    if (full) {
      linhas.forEach(row => {
        const chk = row.cells[i + 1]?.querySelector("input");
        if (chk) chk.checked = false;
      });
    }
  });

  await salvarLista(nomeLista);
}

async function cadastrarNomeGlobal(novoNome){
  await ensureFirebase();
  const listas=['coc','alma','bau','chama','pena'];
  for(const nomeLista of listas){
    const ref=db.collection('listas_epoch').doc(nomeLista);
    const snap=await ref.get();
    let dados=snap.exists?(snap.data().nomes||[]):[];
    const existe=dados.some(x=>x.nome.toLowerCase()===novoNome.toLowerCase());
    if(!existe){
      dados.push({nome:novoNome,col1:false,col2:false,col3:false,data:new Date().toISOString()});
      await ref.set({nomes:dados});
    }
  }
}

async function excluirNomeGlobal(nome){
  await ensureFirebase();
  const listas=['coc','alma','bau','chama','pena'];
  for(const nomeLista of listas){
    const ref=db.collection('listas_epoch').doc(nomeLista);
    const snap=await ref.get();
    if(snap.exists){
      const dados=(snap.data().nomes||[]).filter(x=>x.nome.toLowerCase()!==nome.toLowerCase());
      await ref.set({nomes:dados});
    }
  }
}

async function obterTodosNomesBase(){
  await ensureFirebase();
  const ref=db.collection('listas_epoch').doc('coc');
  const snap=await ref.get();
  if(snap.exists) return (snap.data().nomes||[]).map(x=>x.nome);
  const dados=NOMES_INICIAIS.map(n=>({nome:n,col1:false,col2:false,col3:false,data:new Date().toISOString()}));
  await ref.set({nomes:dados});
  return dados.map(x=>x.nome);
}
