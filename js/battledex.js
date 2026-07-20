const dexGrid = document.getElementById('dexGrid');
const dexEmpty = document.getElementById('dexEmpty');

function renderBattledex() {
  const dex = getBattledex().slice().reverse();

  if (dex.length === 0) {
    dexEmpty.hidden = false;
    dexGrid.hidden = true;
    return;
  }

  dexEmpty.hidden = true;
  dexGrid.hidden = false;
  dexGrid.innerHTML = '';

  dex.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'dex-card';

    const img = document.createElement('img');
    img.className = 'dex-card__image';
    img.src = entry.imageDataUrl;
    img.alt = entry.label;

    const label = document.createElement('span');
    label.className = 'dex-card__label';
    label.textContent = entry.label;

    card.appendChild(img);
    card.appendChild(label);
    dexGrid.appendChild(card);
  });
}

renderBattledex();
