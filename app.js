// === Конфигурация ===
const ELECTRIC_SPOTS = [59, 65];
const DISABLED_SPOTS = [60, 61, 62, 63, 71, 72, 73, 74, 75];

const STATUS_LABELS = {
  free:     'Свободно',
  reserved: 'Забронировано',
  expired:  'Бронь истекла',
  occupied: 'Занято'
};

const TYPE_LABELS = {
  regular:  'Обычное',
  electric: '⚡ Электрозарядка',
  disabled: '♿ Для инвалидов'
};

// === Состояние ===
let spots = loadSpots();
let activeSpotNumber = null;

// === Хранилище ===
function loadSpots() {
  const saved = localStorage.getItem('parking_spots');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return generateSpots();
}

function saveSpots() {
  localStorage.setItem('parking_spots', JSON.stringify(spots));
}

function generateSpots() {
  const arr = [];
  for (let i = 1; i <= 91; i++) {
    let type = 'regular';
    if (ELECTRIC_SPOTS.includes(i)) type = 'electric';
    else if (DISABLED_SPOTS.includes(i)) type = 'disabled';

    arr.push({
      number: i,
      type,
      status: 'free',
      apartNumber: '',
      carNumber: '',
      bookingDateTime: ''
    });
  }
  return arr;
}

// === Отрисовка схемы ===
function renderParking() {
  const topRow  = document.getElementById('parking-top');
  const leftRow = document.getElementById('parking-left');

  topRow.innerHTML  = '';
  leftRow.innerHTML = '';

  spots.forEach(spot => {
    const cell = createSpotCell(spot);
    if (spot.number <= 34) leftRow.appendChild(cell);
    else                   topRow.appendChild(cell);
  });
}

function createSpotCell(spot) {
  const div = document.createElement('div');
  div.className = `spot spot-${spot.type} status-${spot.status}`;
  div.dataset.number = spot.number;
  if (spot.number === activeSpotNumber) div.classList.add('active');

  let icon = '';
  if (spot.type === 'electric') icon = '<span class="spot-icon">⚡</span>';
  if (spot.type === 'disabled') icon = '<span class="spot-icon">♿</span>';

  div.innerHTML = `${icon}<span class="spot-number">${spot.number}</span>`;
  div.addEventListener('click', () => openSpotForm(spot.number));
  return div;
}

// === Раскрывающаяся форма ===
function openSpotForm(number) {
  activeSpotNumber = number;
  const spot = spots.find(s => s.number === number);
  const container = document.getElementById('spot-form-container');

  container.innerHTML = `
    <div class="spot-form">
      <h2>
        Место №${spot.number}
        <button class="close-btn" id="form-close">×</button>
      </h2>

      <div class="info"><b>Тип:</b> ${TYPE_LABELS[spot.type]}</div>
      <div class="info"><b>Текущий статус:</b> ${STATUS_LABELS[spot.status]}</div>

      <label for="f-apart">№ апарта</label>
      <input type="text" id="f-apart" placeholder="Например: 305" value="${spot.apartNumber}">

      <label for="f-car">Гос. номер автомобиля</label>
      <input type="text" id="f-car" placeholder="А123БВ77" value="${spot.carNumber}">

      <label for="f-datetime">Дата и время брони</label>
      <input type="datetime-local" id="f-datetime" value="${spot.bookingDateTime}">

      <label for="f-status">Статус</label>
      <select id="f-status">
        <option value="free"     ${spot.status==='free'?'selected':''}>Свободно</option>
        <option value="reserved" ${spot.status==='reserved'?'selected':''}>Забронировано</option>
        <option value="expired"  ${spot.status==='expired'?'selected':''}>Бронь истекла</option>
        <option value="occupied" ${spot.status==='occupied'?'selected':''}>Занято</option>
      </select>

      <div class="actions">
        <button class="btn btn-save"   id="form-save">Сохранить</button>
        <button class="btn btn-clear"  id="form-clear">Очистить</button>
        <button class="btn btn-cancel" id="form-cancel">Отмена</button>
      </div>
    </div>
  `;

  document.getElementById('form-close').onclick  = closeSpotForm;
  document.getElementById('form-cancel').onclick = closeSpotForm;
  document.getElementById('form-save').onclick   = saveSpotForm;
  document.getElementById('form-clear').onclick  = clearSpotForm;

  renderParking(); // обновить подсветку active

  // Прокрутка к форме
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeSpotForm() {
  activeSpotNumber = null;
  document.getElementById('spot-form-container').innerHTML = '';
  renderParking();
}

function saveSpotForm() {
  const spot = spots.find(s => s.number === activeSpotNumber);
  if (!spot) return;

  spot.apartNumber     = document.getElementById('f-apart').value.trim();
  spot.carNumber       = document.getElementById('f-car').value.trim().toUpperCase();
  spot.bookingDateTime = document.getElementById('f-datetime').value;
  spot.status          = document.getElementById('f-status').value;

  saveSpots();
  closeSpotForm();
}

function clearSpotForm() {
  if (!confirm('Очистить данные места и сделать его свободным?')) return;
  const spot = spots.find(s => s.number === activeSpotNumber);
  if (!spot) return;

  spot.apartNumber = '';
  spot.carNumber = '';
  spot.bookingDateTime = '';
  spot.status = 'free';

  saveSpots();
  closeSpotForm();
}

// === Авто-проверка истёкших броней (раз в минуту) ===
function checkExpiredBookings() {
  const now = new Date();
  let changed = false;
  spots.forEach(s => {
    if (s.status === 'reserved' && s.bookingDateTime) {
      const dt = new Date(s.bookingDateTime);
      if (dt < now) {
        s.status = 'expired';
        changed = true;
      }
    }
  });
  if (changed) {
    saveSpots();
    renderParking();
  }
}

// === Старт ===
renderParking();
checkExpiredBookings();
setInterval(checkExpiredBookings, 60_000);
