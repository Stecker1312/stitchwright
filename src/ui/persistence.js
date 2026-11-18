/**
 * Local persistence and file helpers.
 *
 * Charts live in IndexedDB, settings in localStorage. There is no server and
 * no sync. Export and import use ordinary files, so the user stays in control
 * of where their data goes.
 */

const DB_NAME = "stitchwright";
const DB_VERSION = 1;
const STORE = "charts";
const SETTINGS_KEY = "stitchwright.settings.v1";
const CUSTOM_GROUPS_KEY = "stitchwright.customGroups.v1";

const DEFAULT_SETTINGS = {
  language: "de",
  theme: "system",
  units: "metric",
  autosave: true,
  density: "comfortable"
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Cannot open database"));
  });
  return dbPromise;
}

function transaction(mode, callback) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try {
      result = callback(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("Database transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("Database transaction aborted"));
  }));
}

/** Save a chart snapshot. The chart id is the key. */
export async function saveChart(chart) {
  const wrapper = {
    id: chart.id,
    title: chart.title,
    width: chart.width,
    height: chart.height,
    savedAt: new Date().toISOString(),
    chart
  };
  await transaction("readwrite", (store) => store.put(wrapper));
  return wrapper;
}

/** Load one chart by id. */
export async function loadChart(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result?.chart || null);
    request.onerror = () => reject(request.error || new Error("Cannot load chart"));
  });
}

/** List saved charts, newest first. */
export async function listCharts() {
  const db = await openDatabase();
  const wrappers = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Cannot list charts"));
  });
  return wrappers
    .map((wrapper) => ({
      id: wrapper.id,
      title: wrapper.title,
      width: wrapper.width,
      height: wrapper.height,
      savedAt: wrapper.savedAt
    }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export async function deleteChart(id) {
  await transaction("readwrite", (store) => store.delete(id));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private mode. The app still works; the
    // setting just will not survive a reload.
  }
}

/** Load the user's reusable custom groups. */
export function loadCustomGroups() {
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((group) => group
        && typeof group.label === "string"
        && group.label.length > 0
        && group.label.length <= 24
        && Number.isInteger(group.span)
        && group.span >= 1
        && group.span <= 12)
      .map((group) => ({ label: group.label, span: group.span }));
  } catch {
    return [];
  }
}

export function saveCustomGroups(groups) {
  try {
    localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // The current session still works; only persistence is lost.
  }
}

/** A short, readable id for a new chart. */
export function makeChartId(title = "chart") {
  const slug = String(title || "chart")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "chart";
  return `${slug}-${Date.now().toString(36)}`;
}

/** Trigger a browser download for a blob. */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(filename, text, mime = "application/json") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

/**
 * Save text with the File System Access API when available, otherwise fall
 * back to a download. The fallback is important: Firefox and Safari do not
 * support the picker.
 */
export async function saveTextFile(filename, text, mime = "application/json") {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: mime === "image/svg+xml" ? "SVG" : "JSON",
          accept: { [mime]: [`.${filename.split(".").pop()}`] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([text], { type: mime }));
      await writable.close();
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      // Fall through to a download if the picker failed for another reason.
    }
  }
  downloadText(filename, text, mime);
  return true;
}

/** Open a JSON file with a hidden file input. */
export function pickJsonFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.strickschrift,application/json";
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files?.[0] || null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Cannot read file"));
    reader.readAsText(file);
  });
}

/** Format a timestamp for the recent-charts list. */
export function formatDate(value, locale = "de") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}
