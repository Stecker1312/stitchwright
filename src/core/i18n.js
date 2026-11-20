/**
 * Tiny i18n layer.
 *
 * Locale files are flat JSON maps. Flat keys are easy to diff, easy to
 * translate and easy to test for parity. There is no build step and no
 * runtime dependency.
 *
 * `languages.json` is the registry. Adding a language means adding one entry
 * and one locale file; no application code has to change. Missing keys fall
 * back to English, then to the key itself, so a partial translation never
 * breaks the UI.
 */

export const LANGUAGE_META = {
  en: { label: "English", status: "reviewed" },
  de: { label: "Deutsch", status: "reviewed" }
};

/**
 * English is the language the app presents itself in. German is a full
 * translation and can be chosen in the settings. The internal code stays
 * "en"; pages and documents use the British variant "en-GB".
 */
export const DEFAULT_LANGUAGE = "en";
export const HTML_LANGUAGE = { en: "en-GB", de: "de" };
export const FALLBACK_LANGUAGE = "en";

const cache = new Map();

/** URL of a locale file, relative to this module. */
export function localeUrl(lang) {
  return new URL(`../locales/${lang}.json`, import.meta.url);
}

/** URL of the language registry. */
function registryUrl() {
  return new URL("../locales/languages.json", import.meta.url);
}

/** Load one locale. Browser-only; tests pass data directly. */
export async function loadLocale(lang) {
  if (cache.has(lang)) return cache.get(lang);
  const response = await fetch(localeUrl(lang), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Cannot load locale ${lang}`);
  const data = await response.json();
  cache.set(lang, data);
  return data;
}

/**
 * Load the language registry and merge it into LANGUAGE_META. A missing or
 * broken registry leaves the built-in English/German metadata in place.
 */
export async function loadLanguageRegistry() {
  if (typeof fetch !== "function") return LANGUAGE_META;
  try {
    const response = await fetch(registryUrl(), { cache: "no-cache" });
    if (!response.ok) return LANGUAGE_META;
    const data = await response.json();
    for (const [code, meta] of Object.entries(data)) {
      if (!meta || typeof meta.label !== "string") continue;
      LANGUAGE_META[code] = {
        label: meta.label,
        status: typeof meta.status === "string" ? meta.status : "machine"
      };
    }
  } catch {
    // Offline or first load before the registry is cached: keep working.
  }
  return LANGUAGE_META;
}

function interpolate(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ));
}

/**
 * Create a translator.
 *
 * @param {object} options
 * @param {string} options.lang initial language
 * @param {Record<string, Record<string,string>>} [options.messages] preloaded messages
 * @param {string} [options.fallbackLang]
 */
export function createI18n({ lang = DEFAULT_LANGUAGE, messages = null, fallbackLang = FALLBACK_LANGUAGE } = {}) {
  let currentLang = lang;
  let current = messages?.[lang] || {};
  let fallback = messages?.[fallbackLang] || {};
  const listeners = new Set();

  function t(key, vars) {
    const value = current[key] ?? fallback[key] ?? key;
    return interpolate(value, vars);
  }

  function apply(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", t(element.dataset.i18nTitle));
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    root.querySelectorAll("[data-i18n-value]").forEach((element) => {
      element.value = t(element.dataset.i18nValue);
    });
  }

  async function setLanguage(nextLang) {
    if (nextLang === currentLang) return;
    if (messages) {
      if (!messages[nextLang]) messages[nextLang] = await loadLocale(nextLang);
      if (!messages[fallbackLang]) messages[fallbackLang] = await loadLocale(fallbackLang);
      current = messages[nextLang] || {};
      fallback = messages[fallbackLang] || {};
    } else {
      [current, fallback] = await Promise.all([
        loadLocale(nextLang),
        loadLocale(fallbackLang)
      ]);
    }
    currentLang = nextLang;
    if (typeof document !== "undefined") {
      document.documentElement.lang = HTML_LANGUAGE[nextLang] || nextLang;
      apply(document);
    }
    listeners.forEach((listener) => listener(nextLang));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function status() {
    return LANGUAGE_META[currentLang]?.status || "machine";
  }

  return {
    t,
    apply,
    setLanguage,
    subscribe,
    status,
    get language() { return currentLang; },
    get languages() { return Object.keys(LANGUAGE_META); }
  };
}

/** Load every language in the registry, then return a translator. */
export async function createBrowserI18n(lang = DEFAULT_LANGUAGE) {
  const registry = await loadLanguageRegistry();
  const codes = new Set([...Object.keys(registry), FALLBACK_LANGUAGE, "de", lang]);
  const messages = {};
  await Promise.all([...codes].map(async (code) => {
    try {
      messages[code] = await loadLocale(code);
    } catch {
      // A missing translation is a data problem, not a startup failure.
    }
  }));
  const initial = messages[lang] ? lang : (messages[DEFAULT_LANGUAGE] ? DEFAULT_LANGUAGE : lang);
  return createI18n({ lang: initial, messages });
}
