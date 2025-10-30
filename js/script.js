// js/script.js
// DarkEpoch - login via hash da master + Firebase helper
// Não contém a senha em texto puro — só o hash SHA-256 da master.

// ---------- CONFIG FIREBASE (usei a config que você forneceu) ----------
const firebaseConfig = {
  apiKey: "AIzaSyB5IT8QbzljkYD3DW1VxaHNRhokANIpKj4",
  authDomain: "mu-epoch.firebaseapp.com",
  projectId: "mu-epoch",
  storageBucket: "mu-epoch.firebasestorage.app",
  messagingSenderId: "995547087811",
  appId: "1:995547087811:web:9a4581071b931f9364f376",
  measurementId: "G-NM65WWHE91"
};

// ---------- MASTER HASH (SHA-256 da senha master "cp1115bupnf") ----------
const ADMIN_MASTER_HASH = "500a3ec61db2d71d839cb84e3ebdc5932a3753fc657011ecf7a58cd4251c836a";

// ---------- Variáveis globais ----------
let db = null;
let firebaseInitialized = false;

// ---------- Inicializa Firebase (idempotente) ----------
function ensureFirebase() {
  if (firebaseInitialized) return;
  if (!window.firebase) {
    console.error("Firebase SDK não carregado. Verifique os <script> do Firebase no HTML.");
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseInitialized = true;
    console.log("Firebase iniciado.");
  } catch (err) {
    // se já inicializado, ignora
    if (err && err.message && err.message.indexOf('already exists') !== -1) {
      firebaseInitialized = true;
      db = firebase.firestore();
    } else {
      console.error("Erro ao inicializar Firebase:", err);
    }
  }
}

// ---------- SHA-256 helper (Web Crypto) ----------
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Função de login (comparação por hash) ----------
async function loginAdmin() {
  const statusEl = document.getElementById("loginStatus");
  try {
    const input = (document.getElementById("adminPassword").value || '').trim();
    if (!input) {
      if (statusEl) statusEl.innerText = "⚠️ Informe a senha.";
      return;
    }

    // calcula hash do input
    const inputHash = await sha256(input);

    // inicializa firebase (opcional; algumas operações precisam)
    ensureFirebase();

    // verifica master (hash)
    if (inputHash === ADMIN_MASTER_HASH) {
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("isMaster", "true");
      if (statusEl) statusEl.innerText = "✅ Acesso MASTER concedido. Redirecionando...";
      // pequeno delay para UX
      setTimeout(() => { window.location.href = "menu.html"; }, 700);
      return;
    }

    // se não é master, tenta verificar hashes na coleção admin_senhas (se existir)
    if (firebaseInitialized && db) {
      try {
        const snap = await db.collection("admin_senhas").where("senha_hash", "==", inputHash).get();
        if (!snap.empty) {
          localStorage.setItem("isAdmin", "true");
          localStorage.removeItem("isMaster");
          if (statusEl) statusEl.innerText = "✅ Acesso concedido. Redirecionando...";
          setTimeout(() => { window.location.href = "menu.html"; }, 700);
          return;
        }
      } catch (err) {
        console.warn("Aviso: erro ao consultar admin_senhas (pode estar vazio ou sem permissão):", err);
        // continua para mostrar senha inválida
      }
    }

    // se chegou aqui -> senha inválida
    if (statusEl) statusEl.innerText = "❌ Senha incorreta.";
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("isMaster");
  } catch (err) {
    console.error("Erro no login:", err);
    if (statusEl) statusEl.innerText = "❌ Erro no processo de login.";
  }
}

// ---------- Helper para proteger páginas (chamar ao carregar páginas admin) ----------
function requireAdminOrRedirect() {
  if (localStorage.getItem("isAdmin") !== "true") {
    alert("Acesso restrito — faça login.");
    window.location.href = "index.html";
  }
}

// ---------- Ajuda de debug: mostra status do login atual ----------
function quemSouEu() {
  return {
    isAdmin: localStorage.getItem("isAdmin") === "true",
    isMaster: localStorage.getItem("isMaster") === "true"
  };
}

// ---------- Auto-init opcional (se o SDK já foi carregado no HTML) ----------
document.addEventListener("DOMContentLoaded", () => {
  // tenta inicializar Firebase sem quebrar se scripts SDK ainda não foram carregados
  try { ensureFirebase(); } catch (e) { /* ignore */ }

  // (opcional) se quiser mostrar banner ou status na tela de login, você pode verificar quemSouEu()
});
