// === ИМПОРТЫ FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, deleteDoc, onSnapshot,
  collection, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === КОНФИГ FIREBASE — ВСТАВЬТЕ СВОЙ ===
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

// === КОНФИГ ПАРКОВКИ ===
// Левый вертикальный ряд: 1-34
const LEFT_SPOTS = Array.from({length: 34}, (_, i) => i + 1);
// Верхний ряд: 36-41
const TOP_SPOTS = [36, 37, 38, 39, 40, 41];
// Особые места (выделены розовым на схеме)
const SPECIAL_SPOTS = [17, 25];

// === СОСТОЯНИЕ ===
let currentUser = null;
let currentRole = "viewer"; // editor / viewer
let parkingData = {}; // { "1": {guest: "...", until: "..."}, ... }
let selectedSpot = null;

// === ЭЛЕМЕНТЫ ===
const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const loginError = document.getElementById("login-error");

// === АВТОРИЗАЦИЯ ===
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    loginError.textContent = "Ошибка: " + e.message;
  }
};

document.getElementById("google-btn").onclick = async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    loginError.textContent = "Ошибка: " + e.message;
  }
};

document.getElementById("logout-btn").onclick = () => signOut(auth);

// При смене состояния авторизации
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Проверяем роль в коллекции users
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      currentRole = userDoc.data().role || "viewer";
    } else {
      // Первый вход — создаём как viewer
      await setDoc(doc(db, "users", user.uid), {
        email: user.email, role: "viewer"
      });
      currentRole = "viewer";
    }

    loginScreen.style.display = "none";
    mainScreen.style.display = "block";
    document.getElementById("user-info").textContent = user.email;
    const roleEl = document.getElementById("user-role");
    roleEl.textContent = currentRole === "editor" ? "✏️ Редактор" : "👁 Просмотр";
    roleEl.className = currentRole;

    renderParking();
    subscribeToParking();
  } else {
    currentUser = null;
    loginScreen.style.display = "block";
    mainScreen.style.display = "none";
  }
});

// === ОТРИСОВКА ПАРКОВКИ ===
function renderParking() {
  // Верхний ряд (36-41)
  const topEl = document.getElementById("top-spots");
  topEl.innerHTML = "";
  TOP_SPOTS.forEach(num => topEl.appendChild(createSpot(num)));

  // Левый ряд (1-34) — flex-direction: column-reverse, поэтому добавляем по порядку
  const leftEl = document.getElementById("left-spots");
  leftEl.innerHTML = "";
  LEFT_SPOTS.forEach(num => leftEl.appendChild(createSpot(num)));
}

function createSpot(num) {
  const div = document.createElement("div");
  div.className = "spot";
  div.dataset.num = num;
  div.textContent = num;
  if (SPECIAL_SPOTS.includes(num)) div.classList.add("special");
  div.onclick = () => openModal(num);
  return div;
}

// === ОБНОВЛЕНИЕ СТАТУСОВ ===
function updateSpotStatuses() {
  document.querySelectorAll(".spot").forEach(el => {
    const num = el.dataset.num;
    const data = parkingData[num];

    el.classList.remove("busy", "expired");
    el.removeAttribute("data-guest");

    if (data && data.guest) {
      const now = new Date();
      const until = data.until ? new Date(data.until) : null;
      
      if (until && until < now) {
        el.classList.add("expired");
      } else {
        el.classList.add("busy");
      }
      
      let label = data.guest;
      if (until) {
        label += ` (до ${until.toLocaleString("ru-RU", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"})})`;
      }
      el.dataset.guest = label;
    }
  });
}

// === ПОДПИСКА НА ИЗМЕНЕНИЯ ===
function subscribeToParking() {
  onSnapshot(collection(db, "parking"), (snap) => {
    parkingData = {};
    snap.forEach(d => parkingData[d.id] = d.data());
    updateSpotStatuses();
  });
}

// Каждую минуту перепроверяем "истёкшие" брони
setInterval(updateSpotStatuses, 60 * 1000);

// === МОДАЛЬНОЕ ОКНО ===
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const guestInput = document.getElementById("guest-input");
const untilInput = document.getElementById("until-input");
const saveBtn = document.getElementById("save-btn");
const clearBtn = document.getElementById("clear-btn");
const closeBtn = document.getElementById("close-btn");

function openModal(num) {
  selectedSpot = num;
  modalTitle.textContent = `Место №${num}`;

  const data = parkingData[num] || {};
  guestInput.value = data.guest || "";
  // datetime-local требует формат YYYY-MM-DDTHH:mm
  if (data.until) {
    const d = new Date(data.until);
    // приводим к локальному времени без секунд
    const pad = n => String(n).padStart(2, "0");
    untilInput.value =
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    untilInput.value = "";
  }

  // Права доступа
  const isEditor = currentRole === "editor";
  guestInput.disabled = !isEditor;
  untilInput.disabled = !isEditor;
  saveBtn.style.display = isEditor ? "inline-block" : "none";
  clearBtn.style.display = isEditor && data.guest ? "inline-block" : "none";

  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
  selectedSpot = null;
}

closeBtn.onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };

// === СОХРАНЕНИЕ ===
saveBtn.onclick = async () => {
  if (!selectedSpot) return;
  if (currentRole !== "editor") {
    alert("У вас нет прав на редактирование");
    return;
  }

  const guest = guestInput.value.trim();
  if (!guest) {
    alert("Введите имя гостя или номер комнаты");
    return;
  }

  const untilVal = untilInput.value;
  const payload = {
    guest,
    until: untilVal ? new Date(untilVal).toISOString() : null,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser.email
  };

  try {
    await setDoc(doc(db, "parking", String(selectedSpot)), payload);
    closeModal();
  } catch (e) {
    alert("Ошибка сохранения: " + e.message);
  }
};

// === ОЧИСТКА ===
clearBtn.onclick = async () => {
  if (!selectedSpot) return;
  if (currentRole !== "editor") return;
  if (!confirm(`Освободить место №${selectedSpot}?`)) return;

  try {
    await deleteDoc(doc(db, "parking", String(selectedSpot)));
    closeModal();
  } catch (e) {
    alert("Ошибка: " + e.message);
  }
};

// Закрытие по Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") closeModal();
});
