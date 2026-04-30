// ============= КОНФИГ =============
const SPOTS_COUNT = 20;
const STORAGE_KEY = 'parking_spots_v1';
const AUTH_KEY    = 'parking_auth_v1';

// ============= ДАННЫЕ =============
function loadSpots() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  // Первичная инициализация
  const spots = [];
  for (let i = 1; i <= SPOTS_COUNT; i++) {
    spots.push({
      number: i,
      status: 'free',     // free | busy | booked
      apart: '',
      car: '',
      datetime: ''
    });
  }
  return spots;
}

function saveSpots(spots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

let spots = loadSpots();

// ============= АВТОРИЗАЦИЯ =============
function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

function setAuthenticated(value) {
  if (value) localStorage.setItem(AUTH_KEY, 'true');
  else localStorage.removeItem(AUTH_KEY);
}

const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authForm   = document.getElementById('auth-form');
const authError  = document.getElementById('auth-error');

function showAuth() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMain() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  renderSpots();
}

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-password').value.trim();

  // Простая проверка (демо)
  if (email && pass.length >= 4) {
    setAuthenticated(true);
    authError.textContent = '';
    showMain();
  } else {
    authError.textContent = 'Введите корректный email и пароль (мин. 4 символа)';
  }
});

document.getElementById('google-login').addEventListener('click', () => {
  // Демо-вход через Google
  setAuthenticated(true);
  showMain();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  setAuthenticated(false);
  showAuth();
});

// ============= РЕНДЕР МЕСТ =============
const grid = document.getElementById('parking-grid');

function statusLabel(s) {
  return { free: 'Свободно', busy: 'Занято', booked: 'Бронь' }[s] || '—';
}

function renderSpots() {
  grid.innerHTML = '';
  spots.forEach((spot, idx) => {
    const card = document.createElement('div');
    card.className = `spot-card status-${spot.status}`;
    card.dataset.idx = idx;

    card.innerHTML = `
      <div class="spot-header">
        <span class="spot-number">Место №${spot.number}</span>
        <span class="spot-status ${spot.status}">${statusLabel(spot.status)}</span>
      </div>
      <div class="spot-info">
        <div><b>Апарт:</b> ${spot.apart || '—'}</div>
        <div><b>Авто:</b> ${spot.car || '—'}</div>
        <div><b>Дата:</b> ${spot.datetime ? formatDate(spot.datetime) : '—'}</div>
      </div>

      <div class="spot-edit">
        <label>Статус
          <select class="f-status">
            <option value="free">Свободно</option>
            <option value="busy">Занято</option>
            <option value="booked">Бронь</option>
          </select>
        </label>
        <label>№ апарта
          <input type="text" class="f-apart" placeholder="Например, 305">
        </label>
        <label>№ авто
          <input type="text" class="f-car" placeholder="А123ВС777">
        </label>
        <label>Дата и время
          <input type="datetime-local" class="f-datetime">
        </label>
        <div class="edit-actions">
          <button type="button" class="btn-save">Сохранить</button>
          <button type="button" class="btn-cancel">Отмена</button>
        </div>
      </div>
    `;

    // Заполнить значения
    card.querySelector('.f-status').value   = spot.status;
    card.querySelector('.f-apart').value    = spot.apart;
    card.querySelector('.f-car').value      = spot.car;
    card.querySelector('.f-datetime').value = spot.datetime;

    // Открытие/закрытие формы по клику на карточку (но не по полям)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.spot-edit')) return; // клики внутри формы не сворачивают
      // Закрываем все остальные
      document.querySelectorAll('.spot-card.is-editing').forEach(c => {
        if (c !== card) c.classList.remove('is-editing');
      });
      card.classList.toggle('is-editing');
    });

    // Сохранить
    card.querySelector('.btn-save').addEventListener('click', (e) => {
      e.stopPropagation();
      spot.status   = card.querySelector('.f-status').value;
      spot.apart    = card.querySelector('.f-apart').value.trim();
      spot.car      = card.querySelector('.f-car').value.trim();
      spot.datetime = card.querySelector('.f-datetime').value;
      saveSpots(spots);
      renderSpots();
    });

    // Отмена
    card.querySelector('.btn-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.remove('is-editing');
    });

    grid.appendChild(card);
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============= СТАРТ =============
if (isAuthenticated()) {
  showMain();
} else {
  showAuth();
}
