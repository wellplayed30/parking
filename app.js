import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔧 ВАШ КОНФИГ FIREBASE
const firebaseConfig = {
  apiKey: "ВАШ_API_KEY",
  authDomain: "ВАШ_PROJECT.firebaseapp.com",
  projectId: "ВАШ_PROJECT_ID",
  storageBucket: "ВАШ_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// === DOM ===
const loginScreen = document.getElementById('login-screen');
const mainScreen  = document.getElementById('main-screen');
const loginForm   = document.getElementById('login-form');
const googleBtn   = document.getElementById('google-btn');
const logoutBtn   = document.getElementById('logout-btn');
const errorEl     = document.getElementById('login-error');
const userInfo    = document.getElementById('user-info');
const userRoleEl  = document.getElementById('user-role');

const parkingTop  = document.getElementById('parking-top');
const parkingLeft = document.getElementById('parking-left');

const modal       = document.getElementById('modal');
const closeModal  = document.getElementById('close-modal');
const spotNumber  = document.getElementById('spot-number');
const spotStatus  = document.getElementById('spot-status');
const spotInfo    = document.getElementById('spot-info');
const adminControls = document.getElementById('admin-controls');
const apartInput  = document.getElementById('apart-number');
const carInput    = document.getElementById('car-number');
const dateInput   = document.getElementById('booking-datetime');
const statusSel   = document.getElementById('status-select');
const saveBtn     = document.getElementById('save-btn');

let currentUser = null;
let currentRole = 'viewer';
let currentSpotId = null;
let spotsData = {};

// === Список мест: левый ряд 1-34, верхний ряд 36-41 ===
const LEFT_SPOTS = Array.from({length: 34}, (_, i) => i + 1);
const TOP_SPOTS  = [36, 37, 38, 39, 40, 41];

// === Авторизация ===
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = '⚠️ Заполните все поля';
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const messages = {
      'auth/invalid-email': '❌ Неверный формат email',
      'auth/user-not-found': '❌ Пользователь не найден',
      'auth/wrong-password': '❌ Неверный пароль',
      'auth/invalid-credential': '❌ Неверный email или пароль',
      'auth/too-many-requests': '⏳ Слишком много попыток',
      'auth/network-request-failed': '🌐 Нет подключения',
      'auth/unauthorized-domain': '🚫 Домен не разрешён'
    };
    errorEl.textContent = messages[error.code] || `Ошибка: ${error.message}`;
  }
});

googleBtn.addEventListener('click', async () => {
  errorEl.textContent = '';
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    errorEl.textContent = `Ошибка: ${error.message}`;
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// === Состояние авторизации ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const roleDoc = await getDoc(doc(db, 'roles', user.email));
    currentRole = roleDoc.exists() ? roleDoc.data().role : 'viewer';

    userInfo.textContent = user.email;
    userRoleEl.textContent = currentRole === 'admin' ? '👑 Админ' : '👁 Просмотр';
    userRoleEl.style.background = currentRole === 'admin' ? '#27ae60' : '#7f8c8d';

    loginScreen.style.display = 'none';
    mainScreen.style.display = 'block';

    renderParking();
    subscribeToSpots();
  } else {
    currentUser = null;
    loginScreen.style.display = 'block';
    mainScreen.style.display = 'none';
  }
});

// === Отрисовка парковки ===
function renderParking() {
  parkingTop.innerHTML = '';
  parkingLeft.innerHTML = '';

  TOP_SPOTS.forEach(num => parkingTop.appendChild(createSpot(num)));
  LEFT_SPOTS.forEach(num => parkingLeft.appendChild(createSpot(num)));
}

function createSpot(num) {
  const div = document.createElement('div');
  div.className = 'spot';
  div.dataset.id = num;
  div.textContent = num;
  div.addEventListener('click', () => openModal(num));
  return div;
}

// === Подписка на изменения ===
function subscribeToSpots() {
  onSnapshot(collection(db, 'spots'), (snapshot) => {
    snapshot.forEach(docSnap => {
      spotsData[docSnap.id] = docSnap.data();
    });
    updateSpotsView();
  });
}

function updateSpotsView() {
  document.querySelectorAll('.spot').forEach(el => {
    const id = el.dataset.id;
    const data = spotsData[id];
    el.classList.remove('reserved', 'expired', 'occupied');
    if (data && data.status && data.status !== 'free') {
      el.classList.add(data.status);
    }
  });
}

// === Модальное окно ===
function openModal(id) {
  currentSpotId = String(id);
  const data = spotsData[currentSpotId] || { status: 'free' };

  spotNumber.textContent = id;

  const statusNames = {
    free: '🟢 Свободно',
    reserved: '🔵 Забронировано',
    expired: '🟡 Бронь истекла',
    occupied: '🔴 Занято'
  };
  spotStatus.textContent = statusNames[data.status] || '🟢 Свободно';

  // Информация для всех пользователей
  let info = '';
  if (data.apart)    info += `🏢 № апарта: <b>${data.apart}</b><br>`;
  if (data.car)      info += `🚗 Гос. номер: <b>${data.car}</b><br>`;
  if (data.datetime) info += `📅 Дата/время брони: <b>${formatDate(data.datetime)}</b><br>`;
  spotInfo.innerHTML = info || '<i>Нет данных</i>';

  // Только админ может редактировать
  if (currentRole === 'admin') {
    adminControls.style.display = 'flex';
    apartInput.value  = data.apart || '';
    carInput.value    = data.car || '';
    dateInput.value   = data.datetime || '';
    statusSel.value   = data.status || 'free';
  } else {
    adminControls.style.display = 'none';
  }

  modal.classList.remove('modal-hidden');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

closeModal.addEventListener('click', () => modal.classList.add('modal-hidden'));
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('modal-hidden');
});

// === Сохранение ===
saveBtn.addEventListener('click', async () => {
  if (currentRole !== 'admin') return;

  const data = {
    apart: apartInput.value.trim(),
    car: carInput.value.trim().toUpperCase(),
    datetime: dateInput.value,
    status: statusSel.value,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser.email
  };

  try {
    await setDoc(doc(db, 'spots', currentSpotId), data);
    modal.classList.add('modal-hidden');
  } catch (error) {
    alert('Ошибка сохранения: ' + error.message);
  }
});
