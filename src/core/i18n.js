/**
 * Tiny i18n layer.
 *
 * Locale files are flat JSON maps. Flat keys are easy to diff, easy to
 * translate and easy to test for parity. There is no build step and no
 * runtime dependency.
 *
 * The app always loads the active locale and English. Missing keys fall back
 * to English, then to the key itself, so a partial translation never breaks
 * the UI.
 */

export const LANGUAGE_META = {
  de: { label: "Deutsch", status: "reviewed" },
  en: { label: "English", status: "reviewed" }
};

export const DEFAULT_LANGUAGE = "de";
export const FALLBACK_LANGUAGE = "en";

const cache = new Map();

/** URL of a locale file, relative to this module. */
export function localeUrl(lang) {
  return new URL(`../locales/${lang}.json`, import.meta.url);
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
      document.documentElement.lang = nextLang;
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

/** Load the active locale and the two curated locales, then return a translator. */
export async function createBrowserI18n(lang = DEFAULT_LANGUAGE) {
  const [de, en] = await Promise.all([
    loadLocale("de"),
    loadLocale(FALLBACK_LANGUAGE)
  ]);
  return createI18n({
    lang,
    messages: { de, en, [lang]: lang === "de" ? de : en }
  });
}
