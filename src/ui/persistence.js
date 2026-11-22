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
const CUSTOM_GROUPS_KEY = "stitchwright.customGroups.v2";
const LEGACY_CUSTOM_GROUPS_KEY = "stitchwright.customGroups.v1";
const CUSTOM_CABLES_KEY = "stitchwright.customCables.v1";

const DEFAULT_SETTINGS = {
  language: "en",
  theme: "system",
  units: "metric",
  autosave: true,
  density: "comfortable",
  guideColor: "#1a1a1a"
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  const promise = new Promise((resolve, reject) => {
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
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        if (dbPromise === promise) dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error("Cannot open database"));
    request.onblocked = () => reject(new Error("The local database is blocked by another tab"));
  });
  dbPromise = promise;
  promise.catch(() => {
    if (dbPromise === promise) dbPromise = null;
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
  await transaction("readwrite", (store) => {
    const request = store.get(chart.id);
    request.onsuccess = () => {
      const existing = request.result;
      if (existing) {
        const sameContent = JSON.stringify(existing.chart) === JSON.stringify(chart);
        wrapper.previous = sameContent
          ? (existing.previous || null)
          : { savedAt: existing.savedAt, chart: existing.chart };
      }
      store.put(wrapper);
    };
  });
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

/** Load the previous complete snapshot of a chart, if one exists. */
export async function loadPreviousChart(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result?.previous?.chart || null);
    request.onerror = () => reject(request.error || new Error("Cannot load previous chart"));
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

function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  try {
    const raw = readLocal(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  return writeLocal(SETTINGS_KEY, JSON.stringify(settings));
}

function normalizeCustomGroup(group) {
  if (!group || typeof group !== "object") return null;
  const label = typeof group.label === "string" ? group.label.trim().slice(0, 24) : "";
  const span = Number(group.span);
  if (!label || !Number.isInteger(span) || span < 1 || span > 12) return null;
  const legend = typeof group.legend === "string" ? group.legend.slice(0, 160) : "";
  return { label, span, legend };
}

/** Load the user's reusable custom groups, including legend notes. */
export function loadCustomGroups() {
  try {
    const raw = readLocal(CUSTOM_GROUPS_KEY) || readLocal(LEGACY_CUSTOM_GROUPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const groups = Array.isArray(data) ? data : data?.groups;
    if (!Array.isArray(groups)) return [];
    const normalized = groups.map(normalizeCustomGroup).filter(Boolean);
    // Migrate the old lossy array format once, without dropping notes.
    if (!readLocal(CUSTOM_GROUPS_KEY) && normalized.length) saveCustomGroups(normalized);
    return normalized;
  } catch {
    return [];
  }
}

export function saveCustomGroups(groups) {
  const normalized = groups.map(normalizeCustomGroup).filter(Boolean);
  return writeLocal(CUSTOM_GROUPS_KEY, JSON.stringify({ version: 2, groups: normalized }));
}

/**
 * Load the raw custom-cable list. Validation lives in custom-cables.js so the
 * same rules apply when a chart is opened and when the library is read.
 */
export function loadCustomCables() {
  try {
    const raw = readLocal(CUSTOM_CABLES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const cables = Array.isArray(data) ? data : data?.cables;
    return Array.isArray(cables) ? cables : [];
  } catch {
    return [];
  }
}

export function saveCustomCables(cables) {
  return writeLocal(CUSTOM_CABLES_KEY, JSON.stringify({ version: 1, cables }));
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
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8)
    || Math.random().toString(36).slice(2, 10);
  return `${slug}-${Date.now().toString(36)}-${suffix}`;
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
    let settled = false;
    const finish = (file) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      input.remove();
      resolve(file);
    };
    const onFocus = () => {
      // Older browsers do not fire `cancel`; a focus without a file means the
      // picker was dismissed. The short delay lets `change` win the race.
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 300);
    };
    input.addEventListener("change", () => finish(input.files?.[0] || null));
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", onFocus, { once: true });
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
export function formatDate(value, locale = "en") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}
