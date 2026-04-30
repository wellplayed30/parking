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
