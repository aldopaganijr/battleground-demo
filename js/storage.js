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
  // ponytail: count cap doesn't bound bytes (base64 images vary in size), so
  // quota can still be exceeded — evict oldest until it fits or give up.
  while (dex.length > 0) {
    try {
      localStorage.setItem(BATTLEDEX_STORAGE_KEY, JSON.stringify(dex));
      return dex;
    } catch (err) {
      if (err.name !== 'QuotaExceededError' || dex.length === 1) throw err;
      dex.shift();
    }
  }
  throw new Error('Image too large to save.');
}

const LAST_FIGHT_STORAGE_KEY = 'battleground_lastFight';

function saveLastFight({ fighterA, fighterB, imageA, imageB, verdict }) {
  sessionStorage.setItem(
    LAST_FIGHT_STORAGE_KEY,
    JSON.stringify({ fighterA, fighterB, imageA, imageB, verdict, savedA: false, savedB: false })
  );
}

function getLastFight() {
  try {
    const raw = sessionStorage.getItem(LAST_FIGHT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function markLastFightSaved(side) {
  const fight = getLastFight();
  if (!fight) return;
  if (side === 'A') fight.savedA = true;
  else fight.savedB = true;
  sessionStorage.setItem(LAST_FIGHT_STORAGE_KEY, JSON.stringify(fight));
}
