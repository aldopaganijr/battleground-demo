const BATTLEDEX_STORAGE_KEY = 'battledex';
const BATTLEDEX_MAX_ENTRIES = 20;

function getBattledex() {
  try {
    const raw = localStorage.getItem(BATTLEDEX_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToBattledex({ label, imageDataUrl }) {
  const dex = getBattledex();
  dex.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    imageDataUrl,
    savedAt: Date.now(),
  });
  while (dex.length > BATTLEDEX_MAX_ENTRIES) {
    dex.shift();
  }
  localStorage.setItem(BATTLEDEX_STORAGE_KEY, JSON.stringify(dex));
  return dex;
}
