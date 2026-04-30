// === Конфигурация парковочных мест ===

// Места для электрозарядки (фиолетовые)
const ELECTRIC_SPOTS = [59, 65];

// Места для инвалидов (белые со знаком ♿)
const DISABLED_SPOTS = [61, 62, 63, 71, 72, 73, 74, 75];

// Генерация мест 1–91
function generateSpots() {
  const spots = [];
  for (let i = 1; i <= 91; i++) {
    let type = 'regular';
    if (ELECTRIC_SPOTS.includes(i)) type = 'electric';
    else if (DISABLED_SPOTS.includes(i)) type = 'disabled';

    spots.push({
      number: i,
      type: type,
      status: 'free',
      apartNumber: '',
      carNumber: '',
      bookingDateTime: ''
    });
  }
  return spots;
}

// === Отрисовка схемы ===
function renderParking(spots) {
  const topRow = document.getElementById('parking-top');   // места 35–91 (верхний ряд)
  const leftRow = document.getElementById('parking-left'); // места 1–34 (левый ряд)

  topRow.innerHTML = '';
  leftRow.innerHTML = '';

  spots.forEach(spot => {
    const cell = createSpotCell(spot);
    if (spot.number <= 34) {
      leftRow.appendChild(cell);
    } else {
      topRow.appendChild(cell);
    }
  });
}

function createSpotCell(spot) {
  const div = document.createElement('div');
  div.className = `spot spot-${spot.type} status-${spot.status}`;
  div.dataset.number = spot.number;

  // Иконка типа места
  let icon = '';
  if (spot.type === 'electric') icon = '<span class="spot-icon">⚡</span>';
  if (spot.type === 'disabled') icon = '<span class="spot-icon">♿</span>';

  div.innerHTML = `
    ${icon}
    <span class="spot-number">${spot.number}</span>
  `;

  div.addEventListener('click', () => openModal(spot));
  return div;
}

// === Модалка ===
const modal = document.getElementById('spot-modal');
let currentSpot = null;

function openModal(spot) {
  // Не открывать, если пользователь не авторизован
  if (!isAuthenticated()) return;

  currentSpot = spot;
  document.getElementById('modal-spot-number').textContent = spot.number;
  document.getElementById('modal-status').textContent = getStatusLabel(spot.status);
  document.getElementById('modal-apart').value     = spot.apartNumber || '';
  document.getElementById('modal-car').value       = spot.carNumber   || '';
  document.getElementById('modal-datetime').value  = spot.bookingDateTime || '';

  modal.classList.remove('hidden');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentSpot = null;
}

// Закрытие по клику на overlay, крестик, "Отмена"
modal.addEventListener('click', (e) => {
  if (e.target.dataset.close === 'true') closeModal();
});

// Закрытие по Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

// Сохранение
document.getElementById('modal-save').addEventListener('click', () => {
  if (!currentSpot) return;
  currentSpot.apartNumber     = document.getElementById('modal-apart').value.trim();
  currentSpot.carNumber       = document.getElementById('modal-car').value.trim();
  currentSpot.bookingDateTime = document.getElementById('modal-datetime').value;
  saveSpots();
  renderParking(getSpots());
  closeModal();
});

// === Контроль страниц ===
function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('parking-page').classList.add('hidden');
  closeModal(); // на всякий случай гасим модалку
}

function showParkingPage() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('parking-page').classList.remove('hidden');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  closeModal(); // гарантируем закрытое состояние
  if (isAuthenticated()) {
    showParkingPage();
    renderParking(getSpots());
  } else {
    showAuthPage();
  }
});
