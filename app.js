import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔑 ВСТАВЬТЕ СЮДА СВОЙ КОНФИГ ИЗ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyClZAZqezdYTrR0k7aA-QWoJrL_6Ex04-I",
  authDomain: "albahotel-38d36.firebaseapp.com",
  projectId: "albahotel-38d36",
  storageBucket: "albahotel-38d36.firebasestorage.app",
  messagingSenderId: "98903143411",
  appId: "1:98903143411:web:f085c67febb25ecf325886",
  measurementId: "G-QM40D0T1H0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TOTAL_SPOTS = 41;
let currentUser = null;
let currentRole = "viewer";
let spotsData = {};
let editingSpot = null;

// === АВТОРИЗАЦИЯ ===
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const pw = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    document.getElementById("login-error").textContent = "Ошибка входа: " + e.message;
  }
};

document.getElementById("google-btn").onclick = async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    document.getElementById("login-error").textContent = "Ошибка: " + e.message;
  }
};

document.getElementById("logout-btn").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Получаем роль из коллекции "users"
    const userDoc = await getDoc(doc(db, "users", user.email));
    currentRole = userDoc.exists() ? userDoc.data().role : "viewer";
    
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-screen").style.display = "block";
    document.getElementById("user-info").textContent = user.email;
    document.getElementById("user-role").textContent = 
      currentRole === "editor" ? "✏️ Редактор" : "👁 Просмотр";
    
    initParkingGrid();
    subscribeToSpots();
  } else {
    document.getElementById("login-screen").style.display = "block";
    document.getElementById("main-screen").style.display = "none";
  }
});

// === СЕТКА ПАРКОВКИ ===
function initParkingGrid() {
  const grid = document.getElementById("parking-grid");
  grid.innerHTML = "";
  for (let i = 1; i <= TOTAL_SPOTS; i++) {
    const div = document.createElement("div");
    div.className = "spot free";
    div.id = "spot-" + i;
    div.innerHTML = `<div class="spot-num">${i}</div><div class="spot-info"></div>`;
    div.onclick = () => openModal(i);
    grid.appendChild(div);
  }
}

// === ПОДПИСКА НА ИЗМЕНЕНИЯ ===
function subscribeToSpots() {
  onSnapshot(collection(db, "spots"), (snap) => {
    spotsData = {};
    snap.forEach(d => spotsData[d.id] = d.data());
    renderAllSpots();
  });
}

function renderAllSpots() {
  for (let i = 1; i <= TOTAL_SPOTS; i++) {
    renderSpot(i);
  }
}

function renderSpot(num) {
  const el = document.getElementById("spot-" + num);
  const data = spotsData[num];
  const info = el.querySelector(".spot-info");
  
  if (!data || !data.guest) {
    el.className = "spot free";
    info.textContent = "Свободно";
    return;
  }
  
  const until = data.until ? new Date(data.until) : null;
  const now = new Date();
  
  if (until && until < now) {
    el.className = "spot expired";
  } else {
    el.className = "spot busy";
  }
  
  let text = data.guest;
  if (until) {
    text += "<br>до " + until.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  info.innerHTML = text;
}

// Обновляем цвета каждую минуту (на случай истечения брони)
setInterval(renderAllSpots, 60000);

// === МОДАЛКА ===
function openModal(num) {
  if (currentRole !== "editor") {
    const d = spotsData[num];
    if (d && d.guest) {
      alert(`Место №${num}\nГость: ${d.guest}\n${d.until ? "До: " + new Date(d.until).toLocaleString("ru-RU") : ""}`);
    } else {
      alert(`Место №${num} — свободно`);
    }
    return;
  }
  
  editingSpot = num;
  document.getElementById("modal-spot-num").textContent = num;
  const data = spotsData[num] || {};
  document.getElementById("modal-guest").value = data.guest || "";
  document.getElementById("modal-until").value = data.until ? data.until.slice(0, 16) : "";
  document.getElementById("modal").style.display = "flex";
}

document.getElementById("modal-cancel").onclick = () => {
  document.getElementById("modal").style.display = "none";
};

document.getElementById("modal-save").onclick = async () => {
  const guest = document.getElementById("modal-guest").value.trim();
  const until = document.getElementById("modal-until").value;
  if (!guest) { alert("Укажите гостя"); return; }
  
  await setDoc(doc(db, "spots", String(editingSpot)), {
    guest,
    until: until ? new Date(until).toISOString() : null,
    updatedBy: currentUser.email,
    updatedAt: new Date().toISOString()
  });
  
  document.getElementById("modal").style.display = "none";
};

document.getElementById("modal-free").onclick = async () => {
  await setDoc(doc(db, "spots", String(editingSpot)), {
    guest: "",
    until: null,
    updatedBy: currentUser.email,
    updatedAt: new Date().toISOString()
  });
  document.getElementById("modal").style.display = "none";
};
